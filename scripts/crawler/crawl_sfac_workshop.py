# -*- coding: utf-8 -*-
"""
서울문화재단(SFAC) 예술가 워크숍·교육 크롤러.

수집 대상: 예술가·시민 대상 창작 워크숍, 교육, 프로그램 모집 공고.
게시판 위치: seoularts.or.kr > 지원사업 또는 교육·프로그램 목록 — 실측 후 LIST_URL 확정.

⚠️ 붙이기 전 체크리스트
  1. robots_check.py 로 '깨끗한 허용' 판정 확인.
  2. 브라우저에서 LIST_URL 을 열어 HTML 구조를 저장(diag)하고 parse_list 선택자를 맞춘다.
  3. PARSER_READY = True 로 바꾼 뒤 --dry-run 으로 결과를 확인한다.
  4. crawl_sources 에 is_active=true 를 켠다.

실행: 저장소 최상위에서  python scripts/crawler/crawl_sfac_workshop.py [--dry-run]
"""
import re
import sys

from bs4 import BeautifulSoup

from common import (
    PAGE_SLEEP, EMAIL_RE, PHONE_RE,
    dry_run_report, fetch_html, parse_date, parse_period, parse_period_text,
    run_crawler, today_str,
)

SOURCE_CODE = "sfac_workshop"
SOURCE_NAME = "서울문화재단 워크숍·교육"
REGION = "서울"
# ⚠️ 아래 URL 은 추정값. 브라우저에서 실제 목록 페이지를 열어 확인 후 수정.
LIST_URL = "https://www.seoularts.or.kr/opensquare/notice/edu_list.do"
DETAIL_BASE = "https://www.seoularts.or.kr"
PAGE_PARAM = "pageIndex"
MAX_PAGES = 20
PARSER_READY = False  # 실측 완료 후 True 로


def parse_list(html):
    """목록 HTML → 모집중 공고 dict 목록.

    ⚠️ 아래 선택자는 일반 게시판 구조로 추정. 실제 HTML 저장(diag) 후 교체.
    """
    today = today_str()
    soup = BeautifulSoup(html, "html.parser")
    rows = []

    for tr in soup.select("table.board_list tbody tr, table tbody tr"):
        link = tr.select_one("a[href]")
        if not link:
            continue
        href = link.get("href", "")
        m = re.search(r"[?&](?:idx|no|seq|bbsId|nttId)=(\d+)|/(\d+)(?:/|$)", href)
        if not m:
            continue
        key = m.group(1) or m.group(2)
        title = " ".join(link.get_text(" ", strip=True).split())
        if not title:
            continue

        # 날짜 칸에서 접수 기간 추출
        cells = [td.get_text(" ", strip=True) for td in tr.select("td")]
        period = next((c for c in cells if "~" in c), "")
        apply_start, apply_end = parse_period(period)
        if apply_end and apply_end < today:
            continue

        detail_url = DETAIL_BASE + href if href.startswith("/") else href
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
            "apply_start": apply_start,
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
            print(f"[1] {page}페이지: 새 모집중 공고 없음 → 순회 종료")
            break
        seen.update(r["source_key"] for r in rows)
        all_rows.extend(rows)
        print(f"[1] {page}페이지: {len(rows)}건 (누적 {len(all_rows)})")
    return all_rows


def fetch_detail(key):
    """상세에서 교육 기간·접수 기간·설명·이메일을 보충한다."""
    # ⚠️ 실제 상세 URL 패턴 확인 후 수정.
    detail_url = f"{LIST_URL.replace('list', 'view')}?nttId={key}"
    try:
        html = fetch_html(detail_url)
    except Exception:
        return {}

    soup = BeautifulSoup(html, "html.parser")
    body = soup.select_one(".view_content, .board_view, .cont_wrap, .view_wrap") or soup
    text = " ".join(body.get_text(" ", strip=True).split())

    fields = {}
    if text:
        fields["description"] = text[:4000]

    apply_start, apply_end = parse_period_text(text)
    if apply_start:
        fields["apply_start"] = apply_start
    if apply_end:
        fields["apply_end"] = apply_end

    # 교육·프로그램 기간(work_start/work_end)
    m_work = re.search(
        r"(?:교육|프로그램|워크숍|강좌)\s*기간\s*[:：]?\s*(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})\s*[~–]\s*(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})",
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
