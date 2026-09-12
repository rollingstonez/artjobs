# -*- coding: utf-8 -*-
"""
아트모아(ArtMore) 예술 일자리 크롤러 — https://www.artmore.kr/sub/recruit/search_list.do

문체부·예술경영지원센터가 운영하는 예술 분야 채용 통합 플랫폼. 미술 분야 필터로 목록을 받는다.

사이트 구조(2026-09 실측, fetch-sample):
  - 목록 GET /sub/recruit/search_list.do?search_cd=JD&search_nm=미술분야&search_val=13-17-28&listSize=50&page=N
      표(table.jobs_sch_tb)의 각 tr:
        td.ta_l > p.jobs_cname                     회사명(기관/기업)
        td.ta_l > a.jobs_title[href=...rec_idx=N]  제목 (앞에 span.jobs_list_state state01=진행중/state02=마감)
                  div.jobs_dtl_box > span.jobs_career 경력 · span.jobs_edu 학력 · span.jobs_wkplace 근무지
        td       p.jobs_salary "월급 0원 ~ 0원" · div.jobs_emptype > span.jobs_regular 고용형태 · span.jobs_wkday 근무일
        td       p.jobs_d-day "D-8/채용시까지/마감" · p.jobs_regi_stt-time "2026-09-07 등록" · p.jobs_regi_end-time "2026-09-17 마감"
  - 상세: /sub/recruit/search_view.do?rec_idx=N (목록에 정보가 충분해 상세는 열지 않는다)
  - robots.txt: 우리 경로(/sub/recruit) 허용. /sub/total/total.do 만 일부 봇 차단.

목록에 제목·회사·근무지·고용형태·마감일이 다 있어 상세를 열지 않는다(정중·빠름). 진행중만 담는다.
실행: python scripts/crawler/crawl_artmore.py [--dry-run]
"""
import json
import re
import sys

from bs4 import BeautifulSoup

from common import (
    PAGE_SLEEP,
    classify_all, fetch_html, parse_date, today_str, run_crawler,
)

SOURCE_CODE = "artmore"
SOURCE_NAME = "아트모아"
BASE = "https://www.artmore.kr"
LIST_URL = f"{BASE}/sub/recruit/search_list.do"
VIEW_URL = f"{BASE}/sub/recruit/search_view.do?rec_idx={{key}}"
LIST_PARAMS = {"search_cd": "JD", "search_nm": "미술분야", "search_val": "13-17-28", "listSize": "50"}
MAX_PAGES = 4
PARSER_READY = True

_KEY_RE = re.compile(r"rec_idx=(\d+)")
_SIDO = ("서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
         "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주")


def _region(wkplace):
    """근무지 문자열 앞부분 → 시·도 코드. 없으면 None."""
    if not wkplace:
        return None
    head = wkplace.split()[0]
    for sido in _SIDO:
        if head.startswith(sido):
            return sido
    return None


def _text(el):
    return " ".join(el.get_text(" ", strip=True).split()) if el else None


def parse_list(html):
    """목록 HTML → [{진행중 공고 dict}]. 마감(state02)·마감 배지는 뺀다."""
    today = today_str()
    soup = BeautifulSoup(html, "html.parser")
    rows, skipped = [], 0
    for a in soup.select("a.jobs_title[href*='rec_idx=']"):
        m = _KEY_RE.search(a.get("href") or "")
        if not m:
            continue
        key = m.group(1)
        tr = a.find_parent("tr")
        if not tr:
            continue
        state = tr.select_one("span.jobs_list_state")
        state_txt = _text(state) or ""
        # 제목은 상태 뱃지 텍스트를 뺀 나머지
        a_copy = BeautifulSoup(str(a), "html.parser")
        for sp in a_copy.select("span.jobs_list_state"):
            sp.extract()
        title = _text(a_copy)
        dday = _text(tr.select_one("p.jobs_d-day")) or ""
        apply_end = None
        end_el = tr.select_one("p.jobs_regi_end-time")
        if end_el:
            apply_end = parse_date(_text(end_el))
        posted = parse_date(_text(tr.select_one("p.jobs_regi_stt-time")))
        # 진행중만: 상태가 '마감'이거나 마감일이 지났으면 제외
        closed = ("마감" in state_txt) or (dday == "마감") or (apply_end and apply_end < today)
        if closed or not title:
            skipped += 1
            continue
        org = _text(tr.select_one("p.jobs_cname"))
        wkplace = _text(tr.select_one("span.jobs_wkplace"))
        career = _text(tr.select_one("span.jobs_career"))
        edu = _text(tr.select_one("span.jobs_edu"))
        emp_raw = _text(tr.select_one("div.jobs_emptype span")) or _text(tr.select_one("span.jobs_regular"))
        salary = _text(tr.select_one("p.jobs_salary"))
        if salary and re.sub(r"[^\d]", "", salary) == "00":  # "월급 0원 ~ 0원" = 미기재
            salary = None
        # 경력 값 자체가 "경력무관/경력 3년/신입" 이라 접두사를 안 붙인다. 학력만 라벨을 붙인다.
        desc_bits = [b for b in (career, f"학력 {edu}" if edu else None) if b]
        rows.append({
            "title": title,
            "organization": org,
            "region": _region(wkplace),
            "address": wkplace,
            "category_raw": "예술 채용",
            "employment_raw": emp_raw,
            "salary": salary,
            **classify_all(title, org or "", emp_raw or ""),
            "apply_start": posted,
            "apply_end": apply_end,
            "description": " · ".join(desc_bits) or None,
            "source_key": key,
            "source_url": VIEW_URL.format(key=key),
        })
    return rows, skipped


def collect_rows():
    all_rows, seen = [], set()
    for page in range(1, MAX_PAGES + 1):
        html = fetch_html(LIST_URL, params={**LIST_PARAMS, "page": str(page)}, sleep=PAGE_SLEEP if page > 1 else 0)
        rows, skipped = parse_list(html)
        fresh = [r for r in rows if r["source_key"] not in seen]
        seen.update(r["source_key"] for r in fresh)
        all_rows.extend(fresh)
        print(f"[1] {page}페이지: 진행중 {len(fresh)}건 / 마감·중복 {skipped}건 (누적 {len(all_rows)})")
        if not fresh:
            print("[1] 이 페이지부터 진행중 공고가 없음 → 순회 종료")
            break
    return all_rows


if __name__ == "__main__":
    if not PARSER_READY:
        raise SystemExit(f"[중단] {SOURCE_CODE} 파서 미완성(PARSER_READY=False)")
    if "--dry-run" in sys.argv:
        rows = collect_rows()
        print(f"\n[dry-run] {len(rows)}건 (DB 적재 안 함)")
        for r in rows:
            print(json.dumps(r, ensure_ascii=False))
        raise SystemExit(0)
    # 목록에 정보가 충분 → 상세 단계 없음
    run_crawler(source_code=SOURCE_CODE, source_name=SOURCE_NAME, collect_rows=collect_rows, fetch_detail=None)
