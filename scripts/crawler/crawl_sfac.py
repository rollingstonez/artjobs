# -*- coding: utf-8 -*-
"""
서울문화재단 채용공고 크롤러 — https://www.sfac.or.kr/opensquare/notice/recruit_list.do

사이트 구조(2026-09 실측, GitHub Actions fetch-sample 로 확인):
  - 목록 화면은 껍데기만 오고 실제 목록은  POST /site/SFAC_KOR/ex/bbs/ListSfac.do  (cbIdx=964, pageIndex=N) 로 온다.
    ul.board-list--wrap > li > a[onclick="doView('964','<bcIdx>', ...)"]  · 제목 dl.subject dd p · 작성일 dl.date dd (마감일 없음)
  - 상세도 마찬가지로  POST /site/SFAC_KOR/ex/bbs/ViewSfac.do  (cbIdx, bcIdx). article.board-view 안에
    .board-view--title h4 · .item-post-info.date dd · .board-view--file a.link--file(첨부) · .board-view--body(본문, HWP 편집기 데이터 포함, 1MB 안팎)
  - 사람이 보는 주소: /opensquare/notice/recruit_list.do?cbIdx=964&bcIdx=<bcIdx>&type=   (source_url 로 쓴다)
  - robots.txt: allow / (검색·flexer 만 금지) → 깨끗한 허용.

게시판에는 채용 '공고' 외에 합격자 발표·면접 안내·결과 발표도 섞여 있다. 제목으로 공고만 고른다.
목록에 마감일이 없으므로 최근 RECENT_DAYS 안에 올라온 글만 상세를 열어 접수 기간을 읽고, 마감 지난 것은 뺀다.

실행: 저장소 최상위에서
  python scripts/crawler/crawl_sfac.py            # 수집 + Supabase 적재 (.env.local 필요, crawl_sources.sfac.is_active=true 여야 함)
  python scripts/crawler/crawl_sfac.py --dry-run  # DB 없이 수집 결과만 출력 (파서 확인용)
"""
import json
import re
import sys
import time
from datetime import date, timedelta

import requests
from bs4 import BeautifulSoup

from common import (
    PAGE_SLEEP, EMAIL_RE, PHONE_RE, USER_AGENT,
    classify_all, parse_date, today_str, run_crawler,
)
from http_retry import _retry

SOURCE_CODE = "sfac"
SOURCE_NAME = "서울문화재단"
REGION = "서울"
BASE = "https://www.sfac.or.kr"
LIST_API = f"{BASE}/site/SFAC_KOR/ex/bbs/ListSfac.do"
VIEW_API = f"{BASE}/site/SFAC_KOR/ex/bbs/ViewSfac.do"
BOARD_PATH = "/opensquare/notice/recruit_list.do"
CB_IDX = "964"
DETAIL_URL = f"{BASE}{BOARD_PATH}?cbIdx={CB_IDX}&bcIdx={{key}}&type="
MAX_PAGES = 10
RECENT_DAYS = 90            # 이보다 오래된 글은 상세를 열지 않는다(마감됐다고 본다)
PARSER_READY = True

# 제목으로 '공고'만 고른다. 결과·안내 글은 뺀다.
_SKIP_WORDS = ("합격자", "발표", "면접심사 안내", "면접 안내", "일정 안내", "결과", "정정", "변경 예정", "취소")
_KEEP_WORDS = ("공고", "모집", "채용", "공개모집", "공개채용")

_VIEW_RE = re.compile(r"doView\('(\d+)'\s*,\s*'(\d+)'")
# "접수기간 : 2026. 8. 1.(월) 09:00 ~ 2026. 8. 14.(금) 18:00" 류. 앞 낱말은 접수/모집/신청/원서.
_PERIOD_RE = re.compile(
    r"(?:접수|모집|신청|원서)\s*(?:기간|일정|기한)?[^0-9]{0,20}"
    r"(\d{4}\s*[.\-/년]\s*\d{1,2}\s*[.\-/월]\s*\d{1,2})[^~\-–0-9]{0,12}[~\-–]\s*"
    r"(\d{4}\s*[.\-/년]\s*\d{1,2}\s*[.\-/월]\s*\d{1,2}|\d{1,2}\s*[.\-/월]\s*\d{1,2})"
)


def _post_html(url, data, sleep=0):
    if sleep:
        time.sleep(sleep)
    r = _retry(requests.post, url, data=data,
               headers={"User-Agent": USER_AGENT, "X-Requested-With": "XMLHttpRequest"}, timeout=30)
    r.raise_for_status()
    r.encoding = "utf-8"
    return r.text


def _is_posting_title(title):
    if any(w in title for w in _SKIP_WORDS):
        return False
    return any(w in title for w in _KEEP_WORDS)


def parse_list(html):
    """목록 HTML → [{key, title, posted}] (공고 제목만, 날짜 필터 없음)."""
    soup = BeautifulSoup(html, "html.parser")
    rows = []
    for li in soup.select("ul.board-list--wrap > li"):
        a = li.select_one("a[onclick*='doView']")
        if not a:
            continue
        m = _VIEW_RE.search(a.get("onclick") or "")
        if not m:
            continue
        title_el = li.select_one("dl.subject dd") or li.select_one("dl.item--col.subject dd")
        date_el = li.select_one("dl.date dd") or li.select_one("dl.item--col.date dd")
        title = " ".join((title_el.get_text(" ", strip=True) if title_el else "").split())
        posted = parse_date(date_el.get_text(" ", strip=True) if date_el else "")
        if not title:
            continue
        rows.append({"key": m.group(2), "title": title, "posted": posted})
    return rows


def _period_from_text(text, posted_year):
    """본문 텍스트에서 접수 기간. 끝 날짜에 연도가 없으면 시작 날짜 연도를 쓴다."""
    m = _PERIOD_RE.search(text)
    if not m:
        return None, None
    start = parse_date(m.group(1))
    end_raw = m.group(2)
    end = parse_date(end_raw)
    if not end and start:
        mm = re.match(r"(\d{1,2})\s*[.\-/월]\s*(\d{1,2})", end_raw)
        if mm:
            end = f"{start[:4]}-{int(mm.group(1)):02d}-{int(mm.group(2)):02d}"
    return start, end


def parse_detail(html, posted=None):
    """상세 HTML → 상세 필드 dict(접수기간·본문·연락처·첨부)."""
    soup = BeautifulSoup(html, "html.parser")
    art = soup.select_one("article.board-view") or soup
    body = art.select_one(".board-view--body")
    for t in (body or art).find_all(["img", "script", "style"]):
        t.decompose()
    # HWP 편집기 JSON 주석은 get_text 에 안 들어오지만, 혹시 남은 주석은 제거
    text = " ".join((body or art).get_text(" ", strip=True).split()) if body else ""
    attachments = [" ".join(a.get_text(" ", strip=True).split()) for a in art.select(".board-view--file a.link--file")]
    apply_start, apply_end = _period_from_text(text, (posted or "")[:4])
    fields = {"apply_start": apply_start, "apply_end": apply_end}
    if text:
        desc = text[:4000]
        if attachments:
            desc = ("첨부: " + " / ".join(a.split(" [")[0] for a in attachments)[:400] + "\n\n" + desc)[:4000]
        fields["description"] = desc
    em = EMAIL_RE.search(text)
    if em:
        fields["apply_email"] = em.group(0)
    ph = PHONE_RE.search(text)
    if ph:
        fields["apply_contact"] = ph.group(0)
    return fields


def fetch_detail_fields(key, posted=None):
    html = _post_html(VIEW_API, {
        "cbIdx": CB_IDX, "bcIdx": key, "viewUrl": BOARD_PATH, "listUrl": BOARD_PATH, "registUrl": "", "type": "",
    })
    return parse_detail(html, posted)


def collect_rows():
    today = today_str()
    cutoff = (date.today() - timedelta(days=RECENT_DAYS)).strftime("%Y-%m-%d")
    candidates, seen = [], set()
    for page in range(1, MAX_PAGES + 1):
        html = _post_html(LIST_API, {
            "cbIdx": CB_IDX, "pageIndex": str(page), "searchKey": "", "tgtTypeCd": "", "cateTypeCd": "",
            "viewUrl": BOARD_PATH, "listUrl": BOARD_PATH, "registUrl": "", "type": "",
        }, sleep=PAGE_SLEEP if page > 1 else 0)
        items = parse_list(html)
        if not items:
            print(f"[1] {page}페이지: 글 없음 → 종료")
            break
        old = [it for it in items if it["posted"] and it["posted"] < cutoff]
        fresh = [it for it in items if it["key"] not in seen and not (it["posted"] and it["posted"] < cutoff)]
        seen.update(it["key"] for it in fresh)
        kept = [it for it in fresh if _is_posting_title(it["title"])]
        candidates.extend(kept)
        print(f"[1] {page}페이지: 글 {len(items)}건 중 최근 {len(fresh)}건, 공고 제목 {len(kept)}건 (누적 {len(candidates)})")
        if old and len(old) == len(items):
            print(f"[1] {page}페이지: 전부 {RECENT_DAYS}일 이전 글 → 순회 종료")
            break

    rows = []
    for i, it in enumerate(candidates):
        detail = fetch_detail_fields(it["key"], it["posted"]) if True else {}
        if i < len(candidates) - 1:
            time.sleep(PAGE_SLEEP)
        apply_end = detail.get("apply_end")
        if apply_end and apply_end < today:
            print(f"[1]   마감 지남({apply_end}): {it['title'][:40]}")
            continue
        row = {
            "title": it["title"],
            "organization": SOURCE_NAME,
            "region": REGION,
            "category_raw": None,
            "employment_raw": None,
            **classify_all(it["title"]),
            "apply_start": detail.get("apply_start"),
            "apply_end": apply_end,
            "source_key": it["key"],
            "source_url": DETAIL_URL.format(key=it["key"]),
        }
        for k in ("description", "apply_email", "apply_contact"):
            if detail.get(k):
                row[k] = detail[k]
        rows.append(row)
        print(f"[1]   {it['posted']} · 접수 {detail.get('apply_start')}~{apply_end} · {it['title'][:50]}")
    return rows


if __name__ == "__main__":
    if not PARSER_READY:
        raise SystemExit(f"[중단] {SOURCE_CODE} 파서 미완성(PARSER_READY=False)")
    if "--dry-run" in sys.argv:
        rows = collect_rows()
        print(f"\n[dry-run] {len(rows)}건 (DB 적재 안 함)")
        for r in rows:
            slim = {k: v for k, v in r.items() if k != "description"}
            slim["description_head"] = (r.get("description") or "")[:160]
            print(json.dumps(slim, ensure_ascii=False))
        raise SystemExit(0)
    run_crawler(
        source_code=SOURCE_CODE,
        source_name=SOURCE_NAME,
        collect_rows=collect_rows,
        fetch_detail=None,   # 상세는 collect_rows 에서 이미 읽었다(마감 판정에 필요)
    )
