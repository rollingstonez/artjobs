# -*- coding: utf-8 -*-
"""
아트모아(ArtMore) 예술 일자리 크롤러 — https://www.artmore.kr/sub/recruit/search_list.do

문체부·예술경영지원센터가 운영하는 예술 분야 채용 통합 플랫폼(공공 소유).
분야 필터 없이 전체 목록(최신·진행중)을 받아, 우리 분류기로 아트잡스 5개 순수예술 분야
(미술·음악·무용·국악·연극)에 해당하는 공고만 남긴다. 영상예술·문학예술·기타예술과
분야가 안 잡히는 비예술 공고(경비·보안 등)는 제외한다.
  ※ 아트모아의 장르 필터는 다단계 AJAX 위젯이라 URL 한 줄로 재현이 어렵다. 그래서 사이트
     필터 대신 우리 분류기(classify_all)로 분야 경계를 정한다 — 추측 없이 안정적으로 동작한다.
  ※ 민간 갤러리·기업의 채용도 (예술 분야면) 그대로 담는다. 제외 대상은 '민간 소유 플랫폼'뿐.

사이트 구조(2026-09 실측, fetch-sample):
  - 목록 GET /sub/recruit/search_list.do?listSize=100&exclude_end_yn=Y&sort_type=1&page=N (분야 무필터·진행중·최신순)
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
    PAGE_SLEEP, FIELD_CODES,
    classify_all, fetch_html, parse_date, today_str, run_crawler,
)

SOURCE_CODE = "artmore"
SOURCE_NAME = "아트모아"
BASE = "https://www.artmore.kr"
LIST_URL = f"{BASE}/sub/recruit/search_list.do"
VIEW_URL = f"{BASE}/sub/recruit/search_view.do?rec_idx={{key}}"
# 분야 무필터·진행중(exclude_end_yn=Y)·최신순(sort_type=1). 분야 경계는 우리 분류기로 정한다.
LIST_PARAMS = {"listSize": "100", "exclude_end_yn": "Y", "sort_type": "1"}
MAX_PAGES = 4  # 100건×4 = 최신 400건을 훑어 5개 분야만 추린다
PARSER_READY = True

_KEY_RE = re.compile(r"rec_idx=(\d+)")
# 근무지 앞부분(정식 명칭·축약형 모두) → 시·도 코드. 긴 것 먼저 검사한다("전북특별자치도"가 "전남"보다 앞).
_SIDO_MAP = [
    ("서울", "서울"), ("부산", "부산"), ("대구", "대구"), ("인천", "인천"), ("광주", "광주"),
    ("대전", "대전"), ("울산", "울산"), ("세종", "세종"),
    ("경기", "경기"), ("강원", "강원"),
    ("충청북도", "충북"), ("충북", "충북"), ("충청남도", "충남"), ("충남", "충남"),
    ("전북특별자치도", "전북"), ("전라북도", "전북"), ("전북", "전북"),
    ("전라남도", "전남"), ("전남", "전남"),
    ("경상북도", "경북"), ("경북", "경북"), ("경상남도", "경남"), ("경남", "경남"),
    ("제주", "제주"),
]


def _region(wkplace):
    """근무지 문자열 앞부분 → 시·도 코드(서울·경기…). 정식 명칭도 받는다. 없으면 None."""
    if not wkplace:
        return None
    head = wkplace.split()[0]
    for prefix, code in _SIDO_MAP:
        if head.startswith(prefix):
            return code
    return None


def _text(el):
    return " ".join(el.get_text(" ", strip=True).split()) if el else None


def parse_list(html):
    """목록 HTML → ([진행중·순수예술 공고 dict], 마감·중복 제외수, 분야밖 제외수).
    마감(state02)·마감 배지는 빼고, 분류기가 5개 순수예술 분야(art/music/dance/gugak/theater)로
    잡지 못한 공고(영상·문학·기타·비예술)도 뺀다."""
    today = today_str()
    soup = BeautifulSoup(html, "html.parser")
    rows, skipped, offfield = [], 0, 0
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
        # 분야 경계: 우리 5개 순수예술 분야로 잡히지 않으면(영상·문학·기타·비예술) 담지 않는다.
        cls = classify_all(title, org or "", emp_raw or "")
        if cls.get("field") not in FIELD_CODES:
            offfield += 1
            continue
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
            **cls,
            "apply_start": posted,
            "apply_end": apply_end,
            "description": " · ".join(desc_bits) or None,
            "source_key": key,
            "source_url": VIEW_URL.format(key=key),
        })
    return rows, skipped, offfield


def collect_rows():
    all_rows, seen = [], set()
    for page in range(1, MAX_PAGES + 1):
        html = fetch_html(LIST_URL, params={**LIST_PARAMS, "page": str(page)}, sleep=PAGE_SLEEP if page > 1 else 0)
        rows, skipped, offfield = parse_list(html)
        fresh = [r for r in rows if r["source_key"] not in seen]
        seen.update(r["source_key"] for r in fresh)
        all_rows.extend(fresh)
        print(f"[1] {page}페이지: 순수예술 {len(fresh)}건 / 분야밖 {offfield}건 / 마감·중복 {skipped}건 (누적 {len(all_rows)})")
        # 목록에 행 자체가 없으면(순수예술+분야밖+마감 모두 0) 마지막 페이지로 보고 종료.
        if not (fresh or offfield or skipped):
            print("[1] 이 페이지에 공고가 없음 → 순회 종료")
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
