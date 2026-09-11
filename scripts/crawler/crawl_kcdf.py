# -*- coding: utf-8 -*-
"""
한국공예·디자인문화진흥원(KCDF) 채용공고 크롤러 — https://www.kcdf.or.kr/brd/board/342/L/menu/288

사이트 구조(2026-09 실측, fetch-sample):
  - 서버가 표를 그대로 그려준다. table.board_list tbody tr
      td.num_type  strong.start_date "07-06" + p "2026"   (작성일)
      div.tit a[href*="bbIdx="]                            (제목·상세 링크: /brd/board/342/L/menu/288?brdType=R&thisPage=1&bbIdx=9033)
      td.date2 p.period "2026-07-06 ~ 2026-07-23"          (접수 기간) · em.receipt.end "접수마감" / 진행 중이면 end 없음
  - 페이지: GET ?thisPage=N (폼 boardActionFrm, method GET)
  - robots.txt: User-agent:* 허용, 우리 경로 막지 않음.

실행: python scripts/crawler/crawl_kcdf.py [--dry-run]
"""
import json
import re
import sys

from bs4 import BeautifulSoup

from common import (
    PAGE_SLEEP, EMAIL_RE, PHONE_RE,
    classify_all, fetch_html, parse_period, today_str, run_crawler,
)

SOURCE_CODE = "kcdf"
SOURCE_NAME = "한국공예·디자인문화진흥원"
REGION = "서울"
BASE = "https://www.kcdf.or.kr"
LIST_URL = f"{BASE}/brd/board/342/L/menu/288"
DETAIL_URL = f"{BASE}/brd/board/342/L/menu/288?brdType=R&thisPage=1&bbIdx={{key}}&brdCodeValue="
MAX_PAGES = 5
PARSER_READY = True

_KEY_RE = re.compile(r"bbIdx=(\d+)")


def parse_list(html):
    """목록 HTML → 모집중 공고 dict 목록(접수 기간 지난 건 제외)."""
    today = today_str()
    soup = BeautifulSoup(html, "html.parser")
    rows, expired = [], 0
    for tr in soup.select("table.board_list tbody tr"):
        a = tr.select_one("div.tit a[href*='bbIdx=']")
        if not a:
            continue
        m = _KEY_RE.search(a.get("href") or "")
        if not m:
            continue
        key = m.group(1)
        title = " ".join(a.get_text(" ", strip=True).split())
        period_el = tr.select_one("td.date2 p.period") or tr.select_one("p.period")
        apply_start, apply_end = parse_period(period_el.get_text(" ", strip=True) if period_el else "")
        closed_badge = tr.select_one("em.receipt.end") is not None
        if (apply_end and apply_end < today) or (closed_badge and apply_end):
            expired += 1
            continue
        rows.append({
            "title": title,
            "organization": SOURCE_NAME,
            "region": REGION,
            "category_raw": "공예",
            "employment_raw": None,
            **classify_all("공예", title),
            "apply_start": apply_start,
            "apply_end": apply_end,
            "source_key": key,
            "source_url": DETAIL_URL.format(key=key),
        })
    return rows, expired


def collect_rows():
    all_rows, seen = [], set()
    for page in range(1, MAX_PAGES + 1):
        html = fetch_html(LIST_URL, params={"thisPage": str(page)}, sleep=PAGE_SLEEP if page > 1 else 0)
        rows, expired = parse_list(html)
        fresh = [r for r in rows if r["source_key"] not in seen]
        seen.update(r["source_key"] for r in fresh)
        all_rows.extend(fresh)
        print(f"[1] {page}페이지: 모집중 {len(fresh)}건 / 마감 {expired}건 (누적 {len(all_rows)})")
        if not fresh:
            print("[1] 이 페이지부터는 모집중 공고가 없음 → 순회 종료")
            break
    return all_rows


def fetch_detail(key):
    """상세 본문 텍스트·연락처. 없는 값은 지어내지 않는다."""
    html = fetch_html(DETAIL_URL.format(key=key))
    soup = BeautifulSoup(html, "html.parser")
    body = soup.select_one(".board_view .cont") or soup.select_one(".board_view") or soup.select_one("#contents") or soup
    for t in body.find_all(["script", "style", "img"]):
        t.decompose()
    text = " ".join(body.get_text(" ", strip=True).split())
    fields = {}
    if text:
        fields["description"] = text[:4000]
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
        print(f"\n[dry-run] {len(rows)}건 (DB 적재 안 함)")
        for r in rows:
            print(json.dumps(r, ensure_ascii=False))
        raise SystemExit(0)
    run_crawler(source_code=SOURCE_CODE, source_name=SOURCE_NAME, collect_rows=collect_rows, fetch_detail=fetch_detail)
