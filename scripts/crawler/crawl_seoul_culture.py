# -*- coding: utf-8 -*-
"""
서울문화포털 크롤러 — 게시판 두 개를 함께 읽는다.

  1) 채용공고  https://culture.seoul.go.kr/culture/bbs/B0000002/list.do?menuNo=200052
  2) 공모소식  https://culture.seoul.go.kr/culture/bbs/B0000014/list.do?menuNo=200118

서울시 문화기관(세종문화회관·용산/송파/성북/종로문화재단·서울디자인재단·서울도서관 등)의
채용과 공모를 모아 두는 게시판. 제목 앞 "[기관명]" 으로 어느 기관 공고인지 알 수 있다.

사이트 구조(2026-09 실측, fetch-sample):
  - 목록: 표의 각 행 td.tit > a[href*="view.do?nttId=N"] 제목, 작성자는 항상 '관리자'.
          공모소식은 같은 행의 td.hit 에 작성일(2026-07-16)이 있고, 채용공고 목록에는 날짜가 없다.
  - 상세: view.do?nttId=N&menuNo=... 본문에 "등록일 YYYY-MM-DD", "첨부파일 <파일명>.hwpx [123,456byte] ...",
          그 아래 공고 본문 텍스트. 접수 기간은 본문에 적힌 경우에만 알 수 있고(라벨이 있을 때만 읽는다),
          대개는 첨부(hwpx) 안에 있어 마감일을 모른다(apply_end 없음, sema 와 같은 처지).
  - robots.txt: 허용.

source_key 는 게시판마다 접두사를 붙여 섞이지 않게 한다(채용은 이미 수집해 둔 글의 키를 지키려고 접두사 없음).
실행: python scripts/crawler/crawl_seoul_culture.py [--dry-run]
"""
import json
import re
import sys
import time
from datetime import date, timedelta

from bs4 import BeautifulSoup

from common import (
    PAGE_SLEEP, EMAIL_RE, PHONE_RE,
    classify_all, fetch_html, parse_date, parse_period_text, run_crawler,
)

SOURCE_CODE = "seoul_culture"
SOURCE_NAME = "서울문화포털"
REGION = "서울"
BASE = "https://culture.seoul.go.kr"

# 읽을 게시판. prefix 는 source_key 앞에 붙여 게시판끼리 글 번호가 겹치지 않게 한다.
BOARDS = (
    {"code": "recruit", "label": "채용공고", "bbs": "B0000002", "menu": "200052", "prefix": "",
     "board": None, "category": "서울 문화기관 채용",
     "keep": ("채용", "모집", "공개경쟁", "공개채용", "임기제", "단원", "강사")},
    {"code": "gather", "label": "공모소식", "bbs": "B0000014", "menu": "200118", "prefix": "c",
     "board": "audition", "category": "서울 문화기관 공모",
     "keep": ("공모", "모집", "접수", "신청", "참가", "참여", "지원사업", "선정")},
)
MAX_PAGES = 2
RECENT_DAYS = 120       # 목록에 날짜가 있는 게시판(공모소식)에서 이보다 오래된 글은 가져오지 않는다
PARSER_READY = True

_KEY_RE = re.compile(r"nttId=(\d+)")
_ORG_RE = re.compile(r"^\[([^\]]{1,30})\]\s*")          # "[용산문화재단] ..." → 기관명
_REGDT_RE = re.compile(r"등록일\s*(\d{4}-\d{2}-\d{2})")
_FILE_RE = re.compile(r"([^\]]+?\.(?:hwpx?|pdf|zip|docx?|xlsx?|png|jpg))\s*\[[\d,]+\s*byte\]")
# 공고만: 합격자 발표·면접 일정·선정 결과 등은 뺀다.
_SKIP_WORDS = ("합격자", "발표", "면접 일정", "면접일정", "결과", "정정", "취소", "재공고 안내")
# 공모소식에는 예술인과 상관없는 장사·납품 공모도 섞인다(푸드트럭 영업자, 입점 업체, 참여 서점 등).
# 아트잡스는 예술인이 지원할 수 있는 것만 모으므로 이런 낱말이 든 글은 거른다.
_SKIP_BUSINESS = ("푸드트럭", "영업자", "입점", "임대", "위탁", "참가업체", "참여 업체", "업체 모집",
                  "서점", "출판사", "숙박", "스테이", "매점", "용역", "납품", "구매", "견적", "제안서 접수")


def _board_of(source_key):
    """source_key 접두사로 어느 게시판 글인지 되짚는다(상세 수집 단계에서 쓴다)."""
    for bd in BOARDS:
        if bd["prefix"] and source_key.startswith(bd["prefix"]):
            return bd, source_key[len(bd["prefix"]):]
    return BOARDS[0], source_key


def list_url(bd):
    return f"{BASE}/culture/bbs/{bd['bbs']}/list.do"


def detail_url(bd, key):
    return f"{BASE}/culture/bbs/{bd['bbs']}/view.do?nttId={key}&menuNo={bd['menu']}"


def _is_posting_title(title, bd):
    if any(w in title for w in _SKIP_WORDS):
        return False
    if bd["board"] and any(w in title for w in _SKIP_BUSINESS):   # 공모소식에서만 장사·납품 공모 제외
        return False
    return any(w in title for w in bd["keep"])


def parse_list(html):
    """목록 HTML → [{key, title, organization, raw, posted}] (posted 는 있는 게시판에서만)."""
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
        tr = a.find_parent("tr")
        date_td = tr.select_one("td.hit") if tr else None      # 클래스 이름은 hit 이지만 실제로는 작성일
        posted = parse_date(date_td.get_text(" ", strip=True)) if date_td else None
        items.append({"key": m.group(1), "title": title, "organization": org, "raw": raw, "posted": posted})
    return items


def collect_board(bd, cutoff):
    rows, seen = [], set()
    for page in range(1, MAX_PAGES + 1):
        html = fetch_html(list_url(bd), params={"menuNo": bd["menu"], "pageIndex": str(page)},
                          sleep=PAGE_SLEEP if page > 1 else 0)
        items = parse_list(html)
        if not items:
            print(f"[1] {bd['label']} {page}페이지: 글 없음 → 종료")
            break
        fresh = [it for it in items if it["key"] not in seen]
        seen.update(it["key"] for it in fresh)
        recent = [it for it in fresh if not (it["posted"] and it["posted"] < cutoff)]
        kept = [it for it in recent if _is_posting_title(it["raw"], bd)]
        print(f"[1] {bd['label']} {page}페이지: 글 {len(fresh)}건 중 최근 {len(recent)}건 · 공고 {len(kept)}건")
        for it in kept:
            row = {
                "title": it["title"],
                "organization": it["organization"],
                "region": REGION,
                "category_raw": bd["category"],
                "employment_raw": None,
                **classify_all(it["title"], it["organization"] or ""),
                "apply_start": None,
                "apply_end": None,   # 접수기간은 대개 첨부(hwpx) 안 → 상세에서 본문에 적혀 있을 때만 채운다
                "source_key": f"{bd['prefix']}{it['key']}",
                "source_url": detail_url(bd, it["key"]),
            }
            # 공모소식 글은 제목에 '공모'가 없어도 채용이 아니다 — 오디션·공모 게시판으로 보낸다.
            if bd["board"]:
                row["board"] = bd["board"]
                row["employment_type"] = row.get("employment_type") or "open_call"
            rows.append(row)
        if len(recent) < len(fresh):
            print(f"[1] {bd['label']} {page}페이지: {RECENT_DAYS}일 이전 글이 나옴 → 순회 종료")
            break
    return rows


def collect_rows():
    cutoff = (date.today() - timedelta(days=RECENT_DAYS)).strftime("%Y-%m-%d")
    rows = []
    for bd in BOARDS:
        rows.extend(collect_board(bd, cutoff))
    return rows


def fetch_detail(source_key):
    """상세: 등록일 → 접수 시작(참고용), 본문에 적힌 접수 기간, 첨부 파일명, 담당 이메일·전화."""
    bd, key = _board_of(source_key)
    html = fetch_html(detail_url(bd, key))
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
    # 접수 기간은 본문에 '접수기간/신청기간' 라벨이 있을 때만 읽는다(메뉴·행사 날짜를 잘못 집지 않으려고).
    body = after.split("이전글", 1)[0] if after else text
    start, end = parse_period_text(body, labeled_only=True)
    if end:
        fields["apply_start"] = start or fields.get("apply_start")
        fields["apply_end"] = end
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
