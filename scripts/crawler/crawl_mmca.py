# -*- coding: utf-8 -*-
"""
국립현대미술관(MMCA) 채용 게시판 크롤러 — https://www.mmca.go.kr/pr/employmentList.do

사이트 구조(2026-09 실측, fetch-sample scripts/json 모드):
  - 화면은 비어 있고 AJAX 로 채운다:
      GET /pr/AjaxEmploymentList.do?searchType=&searchCcdId=&searchBdCTp=102&searchText=&pageIndex=N&searchFrom=&searchTo=
      → JSON { emplList:[{bdCId, bdCTitle, bdCContents(본문 HTML), bdCNoticeStDt(게시일), bdCRegDt, bdPlaNm(관), fileCnt}],
               paginationInfo:{totalRecordCount, lastPageNo} }
  - 본문이 목록 JSON 에 통째로 들어 있어 상세 요청이 필요 없다. 접수 기간은 본문에서 읽는다(common.parse_period_text).
  - 상세 화면은 폼 POST(fn_detailVeiw → /pr/employmentDetail.do, bdCId) 라 GET 링크가 없다.
    원문 링크는 목록 페이지로 두고 공고번호를 붙인다(사람이 목록에서 제목으로 찾을 수 있게).
  - robots.txt: 봇 UA 로는 400 을 돌려주지만(robots_check 실측은 '깨끗한 허용'), 목록 API 는 정상 응답.
  - 해외 IP 에서 가끔 접속 시간 초과 → http_retry 가 3회 재시도.

게시판에 합격자 발표·면접 일정 공고가 섞여 있어 제목으로 '채용 공고'만 고른다.
실행: python scripts/crawler/crawl_mmca.py [--dry-run]
"""
import json
import sys
from datetime import date, timedelta

from bs4 import BeautifulSoup

from common import (
    PAGE_SLEEP, EMAIL_RE, PHONE_RE,
    classify_all, fetch_html, parse_date, parse_period_text, today_str, run_crawler,
)

SOURCE_CODE = "mmca"
SOURCE_NAME = "국립현대미술관"
BASE = "https://www.mmca.go.kr"
LIST_API = f"{BASE}/pr/AjaxEmploymentList.do"
LIST_PAGE = f"{BASE}/pr/employmentList.do"
MAX_PAGES = 5
RECENT_DAYS = 60          # 게시 60일 이전 글은 마감됐다고 본다
PARSER_READY = True

_SKIP_WORDS = ("합격자", "발표", "면접전형 일정", "면접 일정", "일정 공고", "결과", "정정", "취소", "연장 공고", "재공고 안내")
_KEEP_WORDS = ("채용 공고", "채용공고", "모집 공고", "모집공고", "공개모집", "공개채용", "채용", "모집")
# 관 이름 → 시·도
_REGION = {"서울": "서울", "덕수궁": "서울", "과천": "경기", "어린이미술관": "경기", "청주": "충북"}


def _is_posting_title(title):
    if any(w in title for w in _SKIP_WORDS):
        return False
    return any(w in title for w in _KEEP_WORDS)


def _text(html):
    soup = BeautifulSoup(html or "", "html.parser")
    for t in soup.find_all(["script", "style", "img"]):
        t.decompose()
    return " ".join(soup.get_text(" ", strip=True).split())


def fetch_page(page):
    raw = fetch_html(LIST_API, params={
        "searchType": "", "searchCcdId": "", "searchBdCTp": "102", "searchText": "",
        "pageIndex": str(page), "searchFrom": "", "searchTo": "",
    }, sleep=PAGE_SLEEP if page > 1 else 0)
    data = json.loads(raw)
    return data.get("emplList") or [], data.get("paginationInfo") or {}


def row_from_item(it, today, cutoff):
    """목록 JSON 한 건 → 공고 dict. 대상이 아니면 (None, 이유)."""
    title = " ".join((it.get("bdCTitle") or "").split())
    posted = parse_date(it.get("bdCNoticeStDt") or it.get("bdCRegDt") or "")
    if posted and posted < cutoff:
        return None, "old"
    if not _is_posting_title(title):
        return None, "skip"
    body = _text(it.get("bdCContents"))
    apply_start, apply_end = parse_period_text(body)
    if apply_end and apply_end < today:
        return None, "expired"
    place = (it.get("bdPlaNm") or "").strip()
    row = {
        "title": title,
        "organization": SOURCE_NAME + (f" {place}" if place and place != "공통" else ""),
        "region": _REGION.get(place, "서울"),
        "category_raw": "미술관",
        "employment_raw": None,
        **classify_all("미술관 학예", title),
        "apply_start": apply_start or posted,
        "apply_end": apply_end,
        "source_key": str(it.get("bdCId")),
        "source_url": f"{LIST_PAGE}#bdCId={it.get('bdCId')}",
    }
    if body:
        row["description"] = body[:4000]
    em = EMAIL_RE.search(body)
    if em:
        row["apply_email"] = em.group(0)
    ph = PHONE_RE.search(body)
    if ph:
        row["apply_contact"] = ph.group(0)
    return row, None


def collect_rows():
    today = today_str()
    cutoff = (date.today() - timedelta(days=RECENT_DAYS)).strftime("%Y-%m-%d")
    rows, seen = [], set()
    for page in range(1, MAX_PAGES + 1):
        items, _ = fetch_page(page)
        if not items:
            print(f"[1] {page}페이지: 글 없음 → 종료")
            break
        n_old = n_kept = 0
        for it in items:
            key = str(it.get("bdCId"))
            if key in seen:
                continue
            seen.add(key)
            row, why = row_from_item(it, today, cutoff)
            if why == "old":
                n_old += 1
            elif row:
                rows.append(row)
                n_kept += 1
                print(f"[1]   {row['apply_start']}~{row['apply_end']} · {row['title'][:60]}")
        print(f"[1] {page}페이지: 글 {len(items)}건 · 채용 공고 {n_kept}건 · {RECENT_DAYS}일 이전 {n_old}건")
        if n_old:
            print(f"[1] {RECENT_DAYS}일 이전 글이 나타남 → 순회 종료")
            break
    return rows


if __name__ == "__main__":
    if not PARSER_READY:
        raise SystemExit(f"[중단] {SOURCE_CODE} 파서 미완성(PARSER_READY=False)")
    if "--dry-run" in sys.argv:
        rows = collect_rows()
        print(f"\n[dry-run] {len(rows)}건 (DB 적재 안 함)")
        for r in rows:
            r = dict(r)
            r["description"] = (r.get("description") or "")[:120]
            print(json.dumps(r, ensure_ascii=False))
        raise SystemExit(0)
    # 본문이 목록에 들어 있어 상세 단계 없음
    run_crawler(source_code=SOURCE_CODE, source_name=SOURCE_NAME, collect_rows=collect_rows, fetch_detail=None)
