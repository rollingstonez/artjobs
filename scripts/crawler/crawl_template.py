# -*- coding: utf-8 -*-
"""
아트잡스 크롤러 템플릿 — 새 소스를 붙일 때 이 파일을 복사해 crawl_<코드>.py 로 만든다.

붙이기 전 체크리스트(바로쌤 원칙):
  1. robots_check.py 로 '깨끗한 허용' 판정을 받았거나 기관과 서면 협의가 있다.
  2. crawl_sources 테이블에 (code, name, base_url, robots_status) 행을 넣고 is_active=true.
  3. 구직자 개인정보가 담긴 게시판(인력풀·이력서)은 절대 대상이 아니다.
  4. 목록 선택자는 실제 HTML을 저장해(diag) 눈으로 확인한 뒤 적는다 — 추측 금지.

실행: 저장소 최상위에서  python scripts/crawler/crawl_template.py
"""
import re

from bs4 import BeautifulSoup

from common import (
    PAGE_SLEEP, EMAIL_RE, PHONE_RE,
    classify_all, fetch_html, parse_period, today_str, run_crawler,
)

SOURCE_CODE = "template"          # crawl_sources.code
SOURCE_NAME = "샘플 기관"          # 화면에 보이는 출처명
REGION = "서울"                    # 기관 소재지 시·도. 공고마다 다르면 목록에서 뽑는다.
LIST_URL = "https://example.org/recruit/list.do"
DETAIL_URL = "https://example.org/recruit/view.do?id={key}"
PAGE_PARAM = "page"
MAX_PAGES = 50
PARSER_READY = False               # 파서를 실측으로 완성하면 True — 이중 안전장치


def parse_list(html):
    """목록 HTML → 모집중 공고 dict 목록. ⚠️ 아래 선택자는 예시다 — 실제 사이트 구조로 교체."""
    today = today_str()
    soup = BeautifulSoup(html, "html.parser")
    rows = []
    for tr in soup.select("table tbody tr"):
        link = tr.select_one("a[href*='id=']")
        if not link:
            continue
        m = re.search(r"id=(\d+)", link.get("href") or "")
        if not m:
            continue
        key = m.group(1)
        title = " ".join(link.get_text(" ", strip=True).split())
        cells = [td.get_text(" ", strip=True) for td in tr.select("td")]
        period = next((c for c in cells if "~" in c), "")
        apply_start, apply_end = parse_period(period)
        if apply_end and apply_end < today:
            continue

        category_raw = None  # 사이트가 분야·직무를 따로 표기하면 여기에 원문 그대로
        rows.append({
            "title": title,
            "organization": SOURCE_NAME,
            "region": REGION,
            "category_raw": category_raw,
            "employment_raw": None,
            # field·genre·role·board·employment_type 을 제목·원문 키워드로 채운다
            **classify_all(category_raw, title),
            "apply_start": apply_start,
            "apply_end": apply_end,
            "source_key": key,
            "source_url": DETAIL_URL.format(key=key),
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
    """상세 전용 필드만 돌려준다(목록 행을 덮지 않는다). 없는 값은 지어내지 않는다."""
    html = fetch_html(DETAIL_URL.format(key=key))
    soup = BeautifulSoup(html, "html.parser")
    body = soup.select_one(".view-content") or soup
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
    run_crawler(
        source_code=SOURCE_CODE,
        source_name=SOURCE_NAME,
        collect_rows=collect_rows,
        fetch_detail=fetch_detail,
    )
