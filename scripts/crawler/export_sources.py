# -*- coding: utf-8 -*-
"""
sources.py 대장 → 사람이 읽는 표(docs/sources.md) + DB 시드(supabase/seed/crawl_sources.sql) 생성.

실행(저장소 최상위):  python scripts/crawler/export_sources.py
sources.py 를 고친 뒤에는 반드시 다시 돌려 두 파일을 맞춘다. 손으로 고치지 말 것.
"""
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sources import EXCLUDED, SITES, is_private  # noqa: E402

# 민간·협의대기 소스 note 앞에 붙는 표시(운영자 화면·시드 공통). 이 문구로 배지를 띄운다.
PRIVATE_MARK = "민간·협의대기 — 서면 협의 전까지 수집하지 않음. "

CATEGORY_LABEL = {
    "all": "시각예술 전반", "painting": "회화", "sculpture_installation": "조각·설치", "media_art": "미디어아트",
    "print_drawing": "판화·드로잉", "craft": "공예", "photography": "사진", "curation": "전시기획·큐레이션",
    "art_management": "아트매니지먼트", "art_education": "예술교육", "residency_open_call": "레지던시·공모",
}
TIER_TITLE = {
    1: "통합 플랫폼 — 여러 기관 공고가 한 곳에 모이는 사이트",
    2: "중앙 공공기관",
    3: "광역 미술관·문화재단",
    4: "레지던시·비엔날레·사립미술관·전문분야",
    5: "공모전 포털·공공 채용 API",
}


def md_escape(t):
    return (t or "").replace("|", "\\|")


def write_md(path):
    out = io.StringIO()
    out.write("# 아트잡스 수집 대상 사이트 대장\n\n")
    out.write("`scripts/crawler/sources.py` 에서 자동 생성됨 — 이 파일을 직접 고치지 말고 sources.py 를 고친 뒤 "
              "`python scripts/crawler/export_sources.py` 를 실행한다.\n\n")
    n_path = sum(1 for s in SITES if s["list_path"])
    out.write(f"- 사이트 **{len(SITES)}곳** (목록 경로 확정 {n_path}곳 / 실측 필요 {len(SITES) - n_path}곳)\n")
    out.write("- **우선순위** 1 = 먼저 붙일 것(공고량 많고 예술 특화) · 2 = 다음 · 3 = 나중\n")
    out.write("- **확인** ✅ = 검색으로 목록 URL 확인 · 🔍 = 기관은 확실하나 목록 경로는 브라우저로 실측 필요\n")
    out.write("- **robots 판정**은 GitHub Actions `robots-check` 워크플로를 수동 실행하면 `robots_result.csv` 로 받는다. "
              "'깨끗한 허용' 또는 서면 협의가 있어야 `crawl_sources.is_active` 를 켠다.\n\n")

    out.write("## 분야별 커버리지\n\n")
    generic = [s["name"] for s in SITES if "all" in s["categories"]]
    out.write(f"'시각예술 전반'으로 표시한 {len(generic)}곳은 모든 분야에 해당하므로 아래 분야별 목록에서는 빼고, 그 분야를 콕 집어 다루는 사이트만 적었다.\n\n")
    cov = {}
    for s in SITES:
        for c in s["categories"]:
            if c != "all":
                cov.setdefault(c, []).append(s["name"])
    for code, label in CATEGORY_LABEL.items():
        if code == "all":
            out.write(f"- **{label}** ({len(generic)}곳): {', '.join(generic)}\n")
            continue
        names = cov.get(code, [])
        out.write(f"- **{label}** (전용 {len(names)}곳 + 전반 {len(generic)}곳): {', '.join(names) or '전용 사이트 없음 — 전반 사이트에서 키워드로 분류'}\n")
    out.write("\n")

    for tier in sorted(TIER_TITLE):
        rows = [s for s in SITES if s["tier"] == tier]
        if not rows:
            continue
        out.write(f"## {tier}. {TIER_TITLE[tier]} ({len(rows)}곳)\n\n")
        out.write("| 우선 | 확인 | 코드 | 이름 | 종류 | 분야 | 지역 | 수집 URL | 비고 |\n")
        out.write("|---|---|---|---|---|---|---|---|---|\n")
        for s in sorted(rows, key=lambda x: (x["priority"], x["code"])):
            url = s["base_url"] + (s["list_path"] or "")
            url_md = f"[{md_escape(s['base_url'].split('//')[1])}]({url})" if s["list_path"] else f"[{md_escape(s['base_url'].split('//')[1])}]({s['base_url']}) *(경로 실측)*"
            cats = "·".join(CATEGORY_LABEL[c] for c in s["categories"])
            note_md = (PRIVATE_MARK if is_private(s["code"]) else "") + s["note"]
            out.write(f"| {s['priority']} | {'✅' if s['verified'] else '🔍'} | `{s['code']}` | {md_escape(s['name'])} | {s['kind']} | {cats} | {s['region']} | {url_md} | {md_escape(note_md)} |\n")
        out.write("\n")

    out.write("## 제외한 사이트\n\n")
    for name, why in EXCLUDED:
        out.write(f"- **{name}** — {why}\n")
    out.write("\n## 새 사이트를 붙이는 순서\n\n")
    out.write("1. `sources.py` 에 항목 추가(list_path 는 브라우저에서 실제 목록 페이지 주소를 복사).\n")
    out.write("2. `python scripts/crawler/export_sources.py` 로 이 문서와 SQL 시드를 갱신.\n")
    out.write("3. GitHub Actions `robots-check` 실행 → `robots_result.csv` 에서 판정 확인.\n")
    out.write("4. 판정이 '깨끗한 허용'(또는 서면 협의 완료)이면 Supabase `crawl_sources` 에서 해당 code 의 `robots_status`·`is_active` 갱신.\n")
    out.write("5. `crawl_template.py` 를 복사해 `crawl_<code>.py` 작성 → 실제 HTML 로 선택자 확인 → `PARSER_READY=True`.\n")
    out.write("6. `.github/workflows/crawl.yml` 에 실행 단계 추가.\n")
    io.open(path, "w", encoding="utf-8").write(out.getvalue())


def sql_str(v):
    if v is None:
        return "null"
    return "'" + str(v).replace("'", "''") + "'"


def write_sql(path):
    out = io.StringIO()
    out.write("-- crawl_sources 시드 — scripts/crawler/sources.py 에서 자동 생성. 손으로 고치지 말 것.\n")
    out.write("-- 모든 행은 is_active=false, robots_status='unchecked' 로 들어간다. robots 판정·협의 후 개별 갱신한다.\n")
    out.write("-- 이미 있는 code 는 name/base_url/list_path/note 만 갱신하고 robots_status·is_active 는 건드리지 않는다.\n\n")
    out.write("insert into crawl_sources (code, name, base_url, list_path, robots_status, is_active, note) values\n")
    vals = []
    for s in SITES:
        body = (PRIVATE_MARK if is_private(s["code"]) else "") + s["note"]
        note = f"[{s['tier']}단계/{s['kind']}/우선{s['priority']}/{'·'.join(s['categories'])}/{s['region']}] {body}"
        vals.append(f"  ({sql_str(s['code'])}, {sql_str(s['name'])}, {sql_str(s['base_url'])}, {sql_str(s['list_path'])}, 'unchecked', false, {sql_str(note)})")
    out.write(",\n".join(vals))
    out.write("\non conflict (code) do update set\n  name = excluded.name,\n  base_url = excluded.base_url,\n  list_path = excluded.list_path,\n  note = excluded.note;\n")
    io.open(path, "w", encoding="utf-8").write(out.getvalue())


if __name__ == "__main__":
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    md = os.path.join(root, "docs", "sources.md")
    sql = os.path.join(root, "supabase", "seed", "crawl_sources.sql")
    os.makedirs(os.path.dirname(md), exist_ok=True)
    os.makedirs(os.path.dirname(sql), exist_ok=True)
    write_md(md)
    write_sql(sql)
    print(f"생성: {md}\n생성: {sql}\n사이트 {len(SITES)}곳")
