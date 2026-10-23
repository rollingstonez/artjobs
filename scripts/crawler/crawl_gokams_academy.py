# -*- coding: utf-8 -*-
"""
예술경영지원센터(GOKAMS) 아카데미·연수 크롤러.

수집 대상: 공지사항 게시판에서 is_learning() 로 필터한 수강생·참여자 모집 공고.
게시판: gokams.or.kr/01_news/notice_list.aspx
상세:   gokams.or.kr/01_news/notice_view.aspx?Idx=XXXX

실행: 저장소 최상위에서  python scripts/crawler/crawl_gokams_academy.py [--dry-run]
"""
import re
import sys

from bs4 import BeautifulSoup

from common import (
    PAGE_SLEEP, EMAIL_RE, PHONE_RE,
    dry_run_report, fetch_html, is_learning, parse_date, parse_period_text,
    run_crawler, today_str,
)

SOURCE_CODE = "gokams_academy"
SOURCE_NAME = "예술경영지원센터 아카데미·연수"
REGION = "전국·온라인"
LIST_URL = "https://www.gokams.or.kr/01_news/notice_list.aspx"
DETAIL_BASE = "https://www.gokams.or.kr"
DETAIL_URL = "https://www.gokams.or.kr/01_news/notice_view.aspx"
PAGE_PARAM = "page"
MAX_PAGES = 20
PARSER_READY = True


# 제목에서 "(~10.2.(금) 16:00)" 또는 "(~9.20(일)까지)" 패턴으로 마감일 추출
_TITLE_END_RE = re.compile(r"[~～]\s*(\d{1,2})[./](\d{1,2})")


def _apply_end_from_title(title: str) -> str | None:
    """제목 안 '~M.D' 패턴에서 마감일 YYYY-MM-DD 를 추출한다."""
    m = _TITLE_END_RE.search(title)
    if not m:
        return None
    import datetime
    today = datetime.date.today()
    month, day = int(m.group(1)), int(m.group(2))
    year = today.year
    try:
        d = datetime.date(year, month, day)
        if d < today - datetime.timedelta(days=30):
            d = datetime.date(year + 1, month, day)
        return d.isoformat()
    except ValueError:
        return None


def parse_list(html):
    """목록 HTML → 배움 공고 dict 목록 (is_learning 필터 적용)."""
    today = today_str()
    soup = BeautifulSoup(html, "html.parser")
    rows = []

    # GOKAMS 공지사항 테이블 — thead/tbody 구조, 여러 클래스명 시도
    for tr in soup.select("table tbody tr"):
        link = tr.select_one("td a[href]")
        if not link:
            continue
        href = link.get("href", "")
        # Idx=숫자 (대소문자 무관)
        m = re.search(r"[Ii]dx=(\d+)", href)
        if not m:
            continue
        key = m.group(1)
        title = " ".join(link.get_text(" ", strip=True).split())
        if not title:
            continue

        # 공지사항이라 채용·공모도 섞임 — 배움 관련만 통과
        if not is_learning(title):
            continue

        apply_end = _apply_end_from_title(title)
        if apply_end and apply_end < today:
            continue

        detail_url = f"{DETAIL_URL}?Idx={key}"
        rows.append({
            "title": title,
            "organization": SOURCE_NAME,
            "region": REGION,
            "board": "learning",
            "field": None,
            "genre": None,
            "role": "education",
            "employment_type": None,
            "space_kind": None,
            "category_raw": None,
            "employment_raw": None,
            "apply_start": None,
            "apply_end": apply_end,
            "source_key": key,
            "source_url": detail_url,
        })
    return rows


def collect_rows():
    all_rows, seen = [], set()
    for page in range(1, MAX_PAGES + 1):
        html = fetch_html(LIST_URL, params={PAGE_PARAM: str(page)}, sleep=PAGE_SLEEP if page > 1 else 0)
        rows = [r for r in parse_list(html) if r["source_key"] not in seen]
        if not rows:
            print(f"[1] {page}페이지: 새 배움 공고 없음 → 순회 종료")
            break
        seen.update(r["source_key"] for r in rows)
        all_rows.extend(rows)
        print(f"[1] {page}페이지: {len(rows)}건 (누적 {len(all_rows)})")
    return all_rows


def fetch_detail(key):
    """상세에서 접수 기간·교육 기간·설명·이메일을 보충한다."""
    detail_url = f"{DETAIL_URL}?Idx={key}"
    try:
        html = fetch_html(detail_url)
    except Exception:
        return {}

    soup = BeautifulSoup(html, "html.parser")
    body = soup.select_one(".view_content, .board_view, .cont_wrap, #content") or soup
    text = " ".join(body.get_text(" ", strip=True).split())

    fields = {}
    if text:
        fields["description"] = text[:4000]

    apply_start, apply_end = parse_period_text(text)
    if apply_start:
        fields["apply_start"] = apply_start
    if apply_end:
        fields["apply_end"] = apply_end

    m_work = re.search(
        r"(?:교육|수강|연수|프로그램)\s*기간\s*[:：]?\s*(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})\s*[~–]\s*(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})",
        text,
    )
    if m_work:
        fields["work_start"] = parse_date(m_work.group(1))
        fields["work_end"] = parse_date(m_work.group(2))

    em = EMAIL_RE.search(text)
    if em:
        fields["apply_email"] = em.group(0)
    ph = PHONE_RE.search(text)
    if ph:
        fields["apply_contact"] = ph.group(0)

    return fields


if __name__ == "__main__":
    if not PARSER_READY:
        raise SystemExit(
            f"[중단] {SOURCE_CODE} 파서 미완성(PARSER_READY=False)\n"
            "  브라우저에서 LIST_URL 을 열고 HTML 구조를 확인한 뒤 parse_list 선택자를 맞추세요."
        )
    if "--dry-run" in sys.argv:
        dry_run_report(collect_rows(), source_name=SOURCE_NAME)
        raise SystemExit(0)
    run_crawler(
        source_code=SOURCE_CODE,
        source_name=SOURCE_NAME,
        collect_rows=collect_rows,
        fetch_detail=fetch_detail,
    )
