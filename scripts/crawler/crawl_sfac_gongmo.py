# -*- coding: utf-8 -*-
"""
서울문화재단 지원사업 공모 크롤러 — https://www.sfac.or.kr/participation/participation/artspace_project.do

서울문화재단의 '지원사업 공모'(서울예술상·서울 커넥트 스테이지·서울희곡상 등 예술인이 응모하는 공모).
채용공고(crawl_sfac.py)와 같은 기관이라 **같은 source_code "sfac"** 로 넣는다(운영자 화면에서 서울문화재단을
켜 두면 채용·공모가 함께 수집된다 — 새 소스 등록 불필요). 공모 키는 채용 키(bcIdx)와 겹치지 않게 "g" 접두사.

사이트 구조(2026-09 실측, fetch-sample):
  - 목록은 폼(ProjectVO) 기반이지만 GET 하면 1페이지가 HTML 로 그려져 온다. 카드는 두 종류가 섞여 있다.
      · 일반 공모 항목: a[href="javascript:doUserView('306')"] > div.frame_g > span.state + p.tit  (상세는 POST 전용)
      · 프로그램 카드(서울예술상·커넥트 스테이지 등): a[onclick="goPage('/전용페이지')"] > div.frame_g > span.state + p.tit
    그래서 div.frame_g 카드를 직접 순회하고, 상위 <a> 의 doUserView/goPage 로 링크를 만든다.
  - 접수 상태가 카드에 있으므로(span.state) '접수중'만 담는다. 마감일은 상세(POST/전용페이지) 안이라 목록만으론 모름 → 비워 둔다.
  - robots.txt: allow /, 우리 경로 막지 않음(flexer·search 만 금지).

실행: python scripts/crawler/crawl_sfac_gongmo.py [--dry-run]
"""
import json
import re
import sys

from bs4 import BeautifulSoup

from common import classify_all, fetch_html, run_crawler

SOURCE_CODE = "sfac"                 # 채용(crawl_sfac.py)과 같은 기관 → 같은 소스로 합친다
SOURCE_NAME = "서울문화재단"
REGION = "서울"
BASE = "https://www.sfac.or.kr"
LIST_URL = f"{BASE}/participation/participation/artspace_project.do"
PARSER_READY = True

_PRJ_RE = re.compile(r"doUserView\('(\d+)'\)")
_GOPAGE_RE = re.compile(r"goPage(?:Blank)?\('([^']+)'\)")
# 예술인 응모가 아닌 것(수강생·기업 대상·결과 등)은 뺀다. 지원사업 공모는 대체로 예술인 대상이라 가볍게만.
_SKIP_WORDS = (
    "수강생", "교육생", "공급기업", "참여기업", "입찰", "용역", "결과 발표", "선정 결과", "합격자", "설명회", "간담회",
)


def _is_target(title):
    return title and not any(w in title for w in _SKIP_WORDS)


def _link_for(card):
    """카드를 감싼 <a> 의 doUserView/goPage 로 (source_key, source_url) 을 만든다."""
    a = card.find_parent("a")
    blob = f"{a.get('href','')} {a.get('onclick','') or ''}" if a else ""
    m = _PRJ_RE.search(blob)
    if m:
        return f"g{m.group(1)}", LIST_URL           # 상세 POST 전용 → 목록 페이지로 링크
    g = _GOPAGE_RE.search(blob)
    if g:
        path = g.group(1)
        url = path if path.startswith("http") else BASE + path
        key = "p" + re.sub(r"\W+", "", path)[-40:]  # 전용 페이지 경로로 고유 키
        return key, url
    return None, None


def parse_list(html):
    """목록 HTML → 접수중 공모 dict 목록. div.frame_g 카드를 직접 순회한다."""
    soup = BeautifulSoup(html, "html.parser")
    rows, skipped, seen = [], 0, set()
    for card in soup.select("div.frame_g"):
        state_el = card.select_one("span.state")
        state = state_el.get_text(strip=True) if state_el else ""
        tit_el = card.select_one("p.tit")
        title = " ".join(tit_el.get_text(" ", strip=True).split()) if tit_el else ""
        if state != "접수중" or not _is_target(title):
            skipped += 1
            continue
        key, url = _link_for(card)
        if not key or key in seen:
            skipped += 1
            continue
        seen.add(key)
        cls = classify_all(title)
        cls["board"] = "audition"
        if not cls.get("employment_type"):
            cls["employment_type"] = "open_call"
        rows.append({
            "title": title,
            "organization": SOURCE_NAME,
            "region": REGION,
            "category_raw": "지원사업 공모",
            "employment_raw": None,
            **cls,
            "apply_start": None,
            "apply_end": None,          # 마감일은 상세 안 → 목록만으론 모름. 접수중 상태로 판단.
            "source_key": key,
            "source_url": url,
        })
    return rows, skipped


def collect_rows():
    html = fetch_html(LIST_URL)
    rows, skipped = parse_list(html)
    print(f"[1] 지원사업 공모: 접수중 {len(rows)}건 / 제외(진행전·마감·비대상) {skipped}건")
    return rows


if __name__ == "__main__":
    if not PARSER_READY:
        raise SystemExit(f"[중단] {SOURCE_CODE} 공모 파서 미완성(PARSER_READY=False)")
    if "--dry-run" in sys.argv:
        rows = collect_rows()
        print(f"\n[dry-run] {len(rows)}건 (DB 적재 안 함)")
        for r in rows:
            print(json.dumps(r, ensure_ascii=False))
        raise SystemExit(0)
    run_crawler(source_code=SOURCE_CODE, source_name=SOURCE_NAME, collect_rows=collect_rows, fetch_detail=None)
