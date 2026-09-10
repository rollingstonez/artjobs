# -*- coding: utf-8 -*-
"""
robots 판정 결과(robots_result.json) + 사이트 대장(sources.py) → "지금 수집할 수 있는 곳 / 아닌 곳" 문서.

실행:  python scripts/crawler/collection_status.py robots_result.json docs/collection-status.md

판정 묶음(위에서부터 우선 적용):
  A 지금 수집 가능        robots 허용 + 목록 주소 확정 + 목록 페이지 200 + 링크 20개 이상(자바스크립트 껍데기가 아님)
  B 수집 가능(협의 권장)   A 와 같지만 민간 운영 사이트 → 운영자에게 한 번 알리고 시작(바로쌤 원칙)
  C 목록 주소만 채우면 됨   robots 허용인데 목록 주소를 아직 실측하지 못했거나 추정 주소가 404
  D 페이지 확인 필요       robots 는 허용이나 목록 페이지가 안 열리거나(403/500/타임아웃) 링크가 거의 없음(자바스크립트 렌더링·차단 의심)
  E 회색지대 → 협의/공공데이터  검색봇을 콕 집어 막음 = 자동수집 거부 의도. 수집하지 않고 공식 경로로
  F 차단 → 공공데이터 요청     User-agent:* 차단. 수집하지 않는다. 공공기관이면 공공데이터포털 제공 신청
  G 접속 실패 → 재확인        robots.txt 응답 없음/거부(403). GitHub 서버가 해외라 국내 전용 사이트는 여기 떨어진다 → 국내 PC 에서 재판정
"""
import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sources import SITES, by_code  # noqa: E402

PUBLIC_SUFFIXES = (".go.kr", ".or.kr", ".kr/")
MIN_LINKS = 20

# 공공데이터포털(data.go.kr)에 이미 있는 대체 API — 요청 대신 바로 신청하면 되는 것들.
KNOWN_OPEN_DATA = {
    "gojobs": "인사혁신처_공공취업정보 조회 (data.go.kr/data/15000485) 활용신청",
    "alio_api": "재정경제부_공공기관 채용정보 조회서비스 (data.go.kr/data/15125273) 활용신청",
    "work24_api": "고용노동부_워크넷 채용정보 API (data.go.kr 에서 '워크넷 채용정보' 검색) 활용신청",
    "mmca": "문화체육관광부 소속기관 → data.go.kr '제공신청' (국립현대미술관 채용·레지던시 공모)",
    "artnuri": "한국문화예술위원회 운영 → data.go.kr '제공신청' 또는 아트누리 담당자에게 공모 데이터 개방 요청",
    "artmore": "예술경영지원센터 운영 → data.go.kr '제공신청' 또는 아트모아 담당자에게 채용 데이터 개방 요청(공공 플랫폼)",
    "gokams_job": "예술경영지원센터 → data.go.kr '제공신청'",
    "arte": "한국문화예술교육진흥원 → data.go.kr '제공신청'",
    "kcdf": "한국공예·디자인문화진흥원 → data.go.kr '제공신청'",
    "acc": "국립아시아문화전당 → data.go.kr '제공신청'",
    "sema": "서울시립미술관 → 서울열린데이터광장(data.seoul.go.kr) '데이터 제공 신청'",
    "craftmuseum": "서울공예박물관 → 서울열린데이터광장 '데이터 제공 신청'",
    "seoul_culture": "서울문화포털 → 서울열린데이터광장 '데이터 제공 신청'",
    "sfac": "서울문화재단 → 서울열린데이터광장 '데이터 제공 신청'",
    "mcst_job": "문화체육관광부 → data.go.kr '제공신청'",
    "arko": "한국문화예술위원회 → data.go.kr '제공신청'",
    "kawf": "한국예술인복지재단 → data.go.kr '제공신청'",
    "museum_go": "국립중앙박물관 → data.go.kr '제공신청'",
}


def is_public(site):
    base = site["base_url"].rstrip("/") + "/"
    return any(x in base for x in (".go.kr/", ".or.kr/")) or site["fetch"] == "api"


def needs_agreement(site):
    return (not is_public(site)) or ("협의" in (site.get("note") or ""))


def bucket(site, r):
    v = r["verdict"]
    if v == "확인필요":
        return "G"
    if v == "차단":
        return "F"
    if v == "회색지대":
        return "E"
    # 깨끗한 허용
    if not r["path_known"] or r["list_http"] == 404:
        return "C"  # 주소를 아직 모르거나(미정) 추정한 주소가 틀림(404) → 브라우저로 목록 주소 확인
    if r["list_http"] != 200 or r["list_links"] < MIN_LINKS:
        return "D"
    return "B" if needs_agreement(site) else "A"


BUCKET_TITLE = {
    "A": "A. 지금 바로 수집 가능",
    "B": "B. 수집 가능 — 민간 운영이라 시작 전 운영자에게 한 번 알리기(협의 권장)",
    "C": "C. robots 는 허용 — 목록 주소만 브라우저로 확인해 채우면 됨(미정이거나 추정 주소가 404)",
    "D": "D. robots 는 허용 — 목록 페이지가 안 열리거나 자바스크립트로만 그려짐(사람이 확인 필요)",
    "E": "E. 회색지대 — 자동수집 거부 의도. 수집하지 않고 협의 또는 공공데이터 요청",
    "F": "F. 차단 — 수집하지 않는다. 공공기관이면 공공데이터 요청",
    "G": "G. 접속 실패 — GitHub(해외) 서버에서 응답 없음/거부. 국내 PC 에서 재판정",
}
BUCKET_ACTION = {
    "A": "crawl_<code>.py 작성 → Supabase crawl_sources 에서 robots_status='clean', is_active=true",
    "B": "운영자 메일로 수집 안내(출처 표기·원문 링크·게시 즉시 반영) 후 A 와 동일",
    "C": "브라우저에서 목록 페이지 주소 복사 → sources.py list_path 채우기 → robots-check 재실행",
    "D": "브라우저로 열어 보기: 페이지가 뜨면 자바스크립트 렌더링(→ curl_cffi/API 경로 확인), 안 뜨면 차단(→ F 처럼 처리)",
    "E": "공공기관: 공공데이터 요청 / 민간: 서면 협의. 답 오기 전까지 is_active=false 유지",
    "F": "공공기관: 공공데이터 요청 / 민간: 서면 협의. robots_status='blocked'",
    "G": "국내 PC 에서 `python scripts/crawler/robots_check.py <주소> <목록경로>` 로 재판정(해외 IP 차단 사이트가 많음). 국내에서도 실패하면 주소 자체를 다시 확인",
}


def md(t):
    return (t or "").replace("|", "\\|")


def main(json_path, out_path):
    data = json.load(io.open(json_path, encoding="utf-8"))
    rows = {r["code"]: r for r in data["rows"]}
    checked_at = data.get("checked_at", "")[:16].replace("T", " ") + " UTC"

    buckets = {k: [] for k in BUCKET_TITLE}
    for site in SITES:
        r = rows.get(site["code"])
        if not r:
            continue
        buckets[bucket(site, r)].append((site, r))

    out = io.StringIO()
    out.write("# 아트잡스 수집 가능 여부 판정표\n\n")
    out.write(f"- 판정 시각: {checked_at} (GitHub Actions `robots-check`)\n")
    out.write(f"- User-Agent: `{data.get('user_agent', 'ArtjobsBot')}`\n")
    out.write("- 이 문서는 `scripts/crawler/collection_status.py` 가 자동 생성한다. 판정을 다시 하려면 GitHub → Actions → robots-check → Run workflow.\n\n")

    out.write("## 한눈에 보기\n\n| 묶음 | 곳 | 뜻 |\n|---|---|---|\n")
    for k, title in BUCKET_TITLE.items():
        out.write(f"| {k} | {len(buckets[k])} | {title[3:]} |\n")
    a = len(buckets["A"]) + len(buckets["B"])
    out.write(f"\n**지금 수집할 수 있는 곳: {a}곳 (A+B)** · 손보면 되는 곳: {len(buckets['C']) + len(buckets['D'])}곳 (C+D) · "
              f"수집하지 않고 공식 경로로: {len(buckets['E']) + len(buckets['F'])}곳 (E+F) · 재확인: {len(buckets['G'])}곳\n\n")

    for k, title in BUCKET_TITLE.items():
        items = buckets[k]
        out.write(f"## {title} ({len(items)}곳)\n\n")
        out.write(f"**할 일:** {BUCKET_ACTION[k]}\n\n")
        if not items:
            out.write("_해당 없음_\n\n")
            continue
        out.write("| 우선 | 코드 | 이름 | 공공/민간 | 분야 | 지역 | robots | 목록 페이지 | 근거 | 링크 |\n|---|---|---|---|---|---|---|---|---|---|\n")
        for site, r in sorted(items, key=lambda x: (x[0]["priority"], x[0]["code"])):
            lp = "—" if not r["path_known"] else (
                f"HTTP {r['list_http']} / 링크 {r['list_links']}" if r["list_http"] is not None else f"실패({r['list_err']})")
            out.write(f"| {site['priority']} | `{site['code']}` | {md(site['name'])} | {'공공' if is_public(site) else '민간'} | "
                      f"{'·'.join(site['categories'])} | {site['region']} | {r['verdict']} (HTTP {r['robots_http'] if r['robots_http'] is not None else '—'}) | {lp} | "
                      f"{md(r['reason'])} | [열기]({r['url']}) |\n")
        out.write("\n")

    # 공공데이터 요청 목록
    ask = [(s, r) for k in ("E", "F") for s, r in buckets[k] if is_public(s)]
    out.write("## 공공데이터 요청 목록 (차단·회색지대로 확인된 공공기관 = E·F)\n\n")
    out.write("공공데이터포털(data.go.kr) 상단 '제공신청' 또는 각 기관 정보공개 창구에 아래 내용으로 요청한다. "
              "요청 문구 예시: \"귀 기관 홈페이지 채용공고·공모 게시판(제목, 접수기간, 원문 링크)을 오픈API 또는 파일 데이터로 개방 요청드립니다. "
              "예술인 대상 구인·공모 정보를 한곳에 모아 원문 링크와 출처를 표기해 안내하는 비영리 성격의 서비스(아트잡스)에 활용하려 합니다.\"\n\n")
    if ask:
        out.write("| 코드 | 기관 | 현재 판정 | 요청할 데이터 | 이미 있는 대체 API / 신청 경로 |\n|---|---|---|---|---|\n")
        for s, r in ask:
            want = f"{s['kind']} 게시판 (제목·접수기간·원문 URL)"
            out.write(f"| `{s['code']}` | {md(s['name'])} | {r['verdict']} | {want} | {md(KNOWN_OPEN_DATA.get(s['code'], 'data.go.kr 제공신청'))} |\n")
    else:
        out.write("_현재 요청이 필요한 공공기관 없음_\n")
    later = [(s, r) for k in ("D", "G") for s, r in buckets[k] if is_public(s)]
    out.write("\n### 국내에서 재판정한 뒤 요청 여부를 정할 곳 (D·G 중 공공기관)\n\n")
    out.write("GitHub 서버(해외)에서 접속이 안 됐거나 페이지가 안 열린 곳. 국내 PC 에서 다시 판정해 '차단'으로 확인되면 위 목록으로 올린다.\n\n")
    if later:
        out.write("| 코드 | 기관 | 현재 판정 | 근거 |\n|---|---|---|---|\n")
        for s, r in later:
            out.write(f"| `{s['code']}` | {md(s['name'])} | {r['verdict']} | {md(r['reason'])} |\n")
    else:
        out.write("_없음_\n")
    out.write("\n## 민간 사이트 협의 목록 (B·D·E·F 중 민간)\n\n")
    priv = [(s, r) for k in ("B", "D", "E", "F") for s, r in buckets[k] if not is_public(s)]
    if priv:
        out.write("| 코드 | 이름 | 현재 판정 | 연락처·비고 |\n|---|---|---|---|\n")
        for s, r in priv:
            out.write(f"| `{s['code']}` | {md(s['name'])} | {r['verdict']} | {md(s['note'])} |\n")
    else:
        out.write("_없음_\n")

    out.write("\n## 이미 공공데이터 API 가 있는 곳 (요청 없이 활용신청만 하면 됨)\n\n")
    for code in ("gojobs", "alio_api", "work24_api"):
        s = by_code(code)
        if s:
            out.write(f"- `{code}` {s['name']}: {KNOWN_OPEN_DATA[code]}\n")

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    io.open(out_path, "w", encoding="utf-8").write(out.getvalue())
    print(f"생성: {out_path} | " + " ".join(f"{k}={len(v)}" for k, v in buckets.items()))


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "robots_result.json"
    dst = sys.argv[2] if len(sys.argv) > 2 else "docs/collection-status.md"
    main(src, dst)
