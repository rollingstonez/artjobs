# -*- coding: utf-8 -*-
"""
서울문화포털 채용공고 크롤러 — https://culture.seoul.go.kr/culture/bbs/B0000002/list.do?menuNo=200052

서울시 문화기관(세종문화회관·용산/송파문화재단·서울도서관·서울상상나라 등)의 채용을 모은 게시판.

사이트 구조(2026-09 실측, fetch-sample):
  - 목록: 표의 각 행 td.tit > a[href*="view.do?nttId=N"]  제목. 제목 앞에 "[기관명]" 접두사.
          목록에는 날짜가 없다(작성자는 항상 '관리자').
  - 상세: view.do?nttId=N 본문에 "등록일 YYYY-MM-DD", "첨부파일 <파일명>.hwpx [123,456byte] ...".
          접수기간·마감일은 첨부(hwpx) 안이라 화면에서 알 수 없다(apply_end 없음, sema 와 동일).
  - robots.txt: 허용.

목록에 날짜가 없어 상세에서 등록일을 읽는다. 제목 접두사로 기관명을, 첨부 파일명을 공고 내용으로.
실행: python scripts/crawler/crawl_seoul_culture.py [--dry-run]
"""
import json
import re
import sys
import time

from bs4 import BeautifulSoup

from common import (
    PAGE_SLEEP, EMAIL_RE, PHONE_RE,
    classify_all, fetch_html, parse_date, run_crawler,
)

SOURCE_CODE = "seoul_culture"
SOURCE_NAME = "서울문화포털"
REGION = "서울"
BASE = "https://culture.seoul.go.kr"
LIST_URL = f"{BASE}/culture/bbs/B0000002/list.do"
DETAIL_URL = f"{BASE}/culture/bbs/B0000002/view.do?nttId={{key}}&menuNo=200052"
MENU_NO = "200052"
MAX_PAGES = 2
PARSER_READY = True

_KEY_RE = re.compile(r"nttId=(\d+)")
_ORG_RE = re.compile(r"^\[([^\]]{1,30})\]\s*")          # "[용산문화재단] ..." → 기관명
_REGDT_RE = re.compile(r"등록일\s*(\d{4}-\d{2}-\d{2})")
_FILE_RE = re.compile(r"([^\]]+?\.(?:hwpx?|pdf|zip|docx?|xlsx?|png|jpg))\s*\[[\d,]+\s*byte\]")
# 채용 공고만: 합격자 발표·면접 일정 등은 뺀다.
_SKIP_WORDS = ("합격자", "발표", "면접 일정", "면접일정", "결과", "정정", "취소", "재공고 안내")
_KEEP_WORDS = ("채용", "모집", "공개경쟁", "공개채용", "임기제", "단원", "강사")


def _is_posting_title(title):
    if any(w in title for w in _SKIP_WORDS):
        return False
    return any(w in title for w in _KEEP_WORDS)


def parse_list(html):
    """목록 HTML → [{key, title, organization}]."""
    soup = BeautifulSoup(html, "html.parser")
    items = []
    for a in soup.select("td.tit a[href*='view.do']"):
        m = _KEY_RE.search(a.get("href") or "")
        if not m:
            continue
        raw = " ".join(a.get_text(" ", strip=True).split())
        om = _ORG_RE.match(raw)
        org = om.group(1).strip() if om else None
        title = _ORG_RE.sub("", raw).strip() if om else raw
        items.append({"key": m.group(1), "title": title, "organization": org, "raw": raw})
    return items


def collect_rows():
    rows, seen = [], set()
    for page in range(1, MAX_PAGES + 1):
        html = fetch_html(LIST_URL, params={"menuNo": MENU_NO, "pageIndex": str(page)},
                          sleep=PAGE_SLEEP if page > 1 else 0)
        items = parse_list(html)
        if not items:
            print(f"[1] {page}페이지: 글 없음 → 종료")
            break
        fresh = [it for it in items if it["key"] not in seen]
        seen.update(it["key"] for it in fresh)
        kept = [it for it in fresh if _is_posting_title(it["raw"])]
        print(f"[1] {page}페이지: 글 {len(fresh)}건 · 채용 공고 {len(kept)}건")
        for it in kept:
            rows.append({
                "title": it["title"],
                "organization": it["organization"],
                "region": REGION,
                "category_raw": "서울 문화기관 채용",
                "employment_raw": None,
                **classify_all(it["title"], it["organization"] or ""),
                "apply_start": None,
                "apply_end": None,   # 접수기간은 첨부(hwpx) 안 → 알 수 없음
                "source_key": it["key"],
                "source_url": DETAIL_URL.format(key=it["key"]),
            })
    return rows


def fetch_detail(key):
    """상세: 등록일 → 접수 시작(참고용), 첨부 파일명 → 공고 내용, 담당 이메일·전화."""
    html = fetch_html(DETAIL_URL.format(key=key))
    soup = BeautifulSoup(html, "html.parser")
    for t in soup.find_all(["script", "style", "img", "header", "footer", "nav"]):
        t.decompose()
    text = " ".join(soup.get_text(" ", strip=True).split())
    fields = {}
    rm = _REGDT_RE.search(text)
    if rm:
        fields["apply_start"] = parse_date(rm.group(1))
    # "첨부파일" 뒤부터 잘라야 라벨을 파일명으로 오인하지 않는다. 이름은 "]" 를 넘지 않는다.
    after = text.split("첨부파일", 1)[1] if "첨부파일" in text else ""
    files = [m.group(1).strip() for m in _FILE_RE.finditer(after)]
    if files:
        fields["description"] = "첨부: " + " / ".join(dict.fromkeys(files))[:3800]
    em = EMAIL_RE.search(text)
    if em:
        fields["apply_email"] = em.group(0)
    ph = PHONE_RE.search(text)
    if ph and ph.group(0) not in ("02-120", "02-2133-2538"):   # 포털 대표번호 제외
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
            print(json.dumps(fetch_detail(rows[0]["source_key"]), ensure_ascii=False)[:500])
        for r in rows:
            print(json.dumps(r, ensure_ascii=False))
        raise SystemExit(0)
    run_crawler(source_code=SOURCE_CODE, source_name=SOURCE_NAME, collect_rows=collect_rows, fetch_detail=fetch_detail)
