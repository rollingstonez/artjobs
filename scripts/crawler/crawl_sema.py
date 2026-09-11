# -*- coding: utf-8 -*-
"""
서울시립미술관(SeMA) 채용시험 게시판 크롤러 — https://sema.seoul.go.kr/kr/bbs/611389/getBbsList

사이트 구조(2026-09 실측, fetch-sample):
  - 목록은 서버가 그려준다. div.c-table-row 안에
      a[name=detailBtn][data-bbs-no=글번호][data-bbs-pageno=..]  제목
      마지막 div  "2026-08-28"  작성일
  - 상세: GET /kr/bbs/611389/getBbsDetail?bbsNo=<글번호>  — 제목·날짜·담당자·이메일·전화·첨부만 있고 본문은 첨부(hwpx).
    그래서 접수 기간은 알 수 없다(apply_end 없음). 화면은 작성일 기준으로 최근 공고만 보여준다.
  - 페이지: GET getBbsList?currentPage=N (폼 scFrm)
  - robots.txt: 기본 Disallow / 이지만 Allow: /kr/bbs → 게시판은 허용.

게시판에 합격자 발표·면접 계획 공고도 섞여 있어 제목으로 '채용 공고'만 고른다.
실행: python scripts/crawler/crawl_sema.py [--dry-run]
"""
import json
import sys
import time
from datetime import date, timedelta

from bs4 import BeautifulSoup

from common import (
    PAGE_SLEEP, EMAIL_RE, PHONE_RE,
    classify_all, fetch_html, parse_date, run_crawler,
)

SOURCE_CODE = "sema"
SOURCE_NAME = "서울시립미술관"
REGION = "서울"
BASE = "https://sema.seoul.go.kr"
BBS = "611389"
LIST_URL = f"{BASE}/kr/bbs/{BBS}/getBbsList"
DETAIL_URL = f"{BASE}/kr/bbs/{BBS}/getBbsDetail?bbsNo={{key}}"
MAX_PAGES = 5
RECENT_DAYS = 45          # 마감일을 알 수 없으므로 작성 45일 안의 공고만 모집중으로 본다
PARSER_READY = True

_SKIP_WORDS = ("합격자", "발표", "면접시험 계획", "면접 계획", "일정 안내", "결과", "정정", "취소", "연장 공고")
_KEEP_WORDS = ("채용 공고", "채용공고", "모집 공고", "모집공고", "공개모집", "공개채용", "채용")


def _is_posting_title(title):
    if any(w in title for w in _SKIP_WORDS):
        return False
    return any(w in title for w in _KEEP_WORDS)


def parse_list(html):
    """목록 HTML → [{key, title, posted}]."""
    soup = BeautifulSoup(html, "html.parser")
    items = []
    for row in soup.select("div.c-table-row"):
        a = row.select_one("a[name=detailBtn][data-bbs-no]")
        if not a:
            continue
        key = str(a.get("data-bbs-no"))
        title = " ".join(a.get_text(" ", strip=True).split())
        cells = [d.get_text(" ", strip=True) for d in row.select(":scope > div")]
        posted = next((parse_date(c) for c in reversed(cells) if parse_date(c)), None)
        if title:
            items.append({"key": key, "title": title, "posted": posted})
    return items


def collect_rows():
    cutoff = (date.today() - timedelta(days=RECENT_DAYS)).strftime("%Y-%m-%d")
    rows, seen = [], set()
    for page in range(1, MAX_PAGES + 1):
        html = fetch_html(LIST_URL, params={"currentPage": str(page), "bbsManaNo": BBS}, sleep=PAGE_SLEEP if page > 1 else 0)
        items = parse_list(html)
        if not items:
            print(f"[1] {page}페이지: 글 없음 → 종료")
            break
        fresh = [it for it in items if it["key"] not in seen]
        seen.update(it["key"] for it in fresh)
        recent = [it for it in fresh if not it["posted"] or it["posted"] >= cutoff]
        kept = [it for it in recent if _is_posting_title(it["title"])]
        print(f"[1] {page}페이지: 글 {len(fresh)}건 · 최근 {len(recent)}건 · 채용 공고 {len(kept)}건")
        for it in kept:
            rows.append({
                "title": it["title"],
                "organization": SOURCE_NAME,
                "region": REGION,
                "category_raw": "미술관",
                "employment_raw": None,
                **classify_all("미술관 학예", it["title"]),
                "apply_start": it["posted"],
                "apply_end": None,
                "source_key": it["key"],
                "source_url": DETAIL_URL.format(key=it["key"]),
            })
            print(f"[1]   {it['posted']} · {it['title'][:60]}")
        if not fresh or len(recent) < len(fresh):
            print(f"[1] {RECENT_DAYS}일 이전 글이 나타남 → 순회 종료")
            break
    return rows


def fetch_detail(key):
    """상세: 담당자 이메일·전화·첨부 목록. 본문은 첨부라 description 은 첨부 파일명으로 채운다."""
    html = fetch_html(DETAIL_URL.format(key=key))
    soup = BeautifulSoup(html, "html.parser")
    for t in soup.find_all(["script", "style", "img", "header", "footer", "nav"]):
        t.decompose()
    text = " ".join(soup.get_text(" ", strip=True).split())
    fields = {}
    files = [a.get_text(" ", strip=True) for a in soup.select("a[href*='download'], a[href*='Download'], a[href*='file']")]
    files = [f for f in files if f and "." in f][:10]
    if files:
        fields["description"] = "첨부: " + " / ".join(files)[:3800]
    em = EMAIL_RE.search(text)
    if em:
        fields["apply_email"] = em.group(0)
    ph = PHONE_RE.search(text)
    if ph:
        fields["apply_contact"] = ph.group(0)
    return fields


if __name__ == "__main__":
    if not PARSER_READY:
        raise SystemExit(f"[중단] {SOURCE_CODE} 파서 미완성(PARSER_READY=False)")
    if "--dry-run" in sys.argv:
        rows = collect_rows()
        print(f"\n[dry-run] {len(rows)}건 (DB 적재 안 함) — 상세 1건 표본:")
        if rows:
            time.sleep(PAGE_SLEEP)
            print(json.dumps(fetch_detail(rows[0]["source_key"]), ensure_ascii=False)[:600])
        for r in rows:
            print(json.dumps(r, ensure_ascii=False))
        raise SystemExit(0)
    run_crawler(source_code=SOURCE_CODE, source_name=SOURCE_NAME, collect_rows=collect_rows, fetch_detail=fetch_detail)
