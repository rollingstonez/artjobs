# -*- coding: utf-8 -*-
"""
한국공예·디자인문화진흥원(KCDF) 크롤러 — 채용공고 + 사업공고(공모) 두 게시판.
  - 채용공고: https://www.kcdf.or.kr/brd/board/342/L/menu/288   → board=job
  - 사업공고: https://www.kcdf.or.kr/brd/board/337/L/menu/284   → board=audition(공모)
두 게시판은 같은 CMS라 목록 구조가 동일하다(같은 파서 재사용).

사이트 구조(2026-09 실측, fetch-sample):
  - 서버가 표를 그대로 그려준다. table.board_list tbody tr
      td.num_type  strong.start_date "07-06" + p "2026"   (작성일)
      div.tit a[href*="bbIdx="]                            (제목·상세 링크: ...menu/288?brdType=R&thisPage=1&bbIdx=9033)
      td.date2 p.period "2026-07-06 ~ 2026-07-23"          (접수 기간) · em.receipt.end "접수마감" / 진행 중이면 end 없음
  - 페이지: GET ?thisPage=N (폼 boardActionFrm, method GET)
  - robots.txt: User-agent:* 허용, 우리 경로 막지 않음.

사업공고에는 예술인 공모(작가·지원사업) 외에 수강생·교육생 모집, 공급기업 공모, 입찰 등
예술인 응모가 아닌 것이 섞여 있어 제목으로 걸러낸다.

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
# (게시판번호, 메뉴번호, 원문 분류, 강제 게시판코드) — 사업공고는 공모라 board=audition 으로 고정.
BOARDS = [
    {"board": "342", "menu": "288", "cat": "채용", "force_board": None},
    {"board": "337", "menu": "284", "cat": "공모", "force_board": "audition"},
]
LIST_TMPL = f"{BASE}/brd/board/{{board}}/L/menu/{{menu}}"
DETAIL_TMPL = f"{BASE}/brd/board/{{board}}/L/menu/{{menu}}?brdType=R&thisPage=1&bbIdx={{key}}&brdCodeValue="
MAX_PAGES = 5
PARSER_READY = True

_KEY_RE = re.compile(r"bbIdx=(\d+)")
# 사업공고에서 예술인 응모가 아닌 것(수강생·교육생·기업 대상·입찰·결과)은 뺀다.
_GONGMO_SKIP = (
    "수강생", "교육생", "교육 프로그램", "특강", "아카데미", "워크숍", "워크샵", "세미나", "포럼", "설명회",
    "공급기업", "참여기업", "입점", "유통", "판로", "입찰", "견적", "수의계약", "용역",
    "결과 발표", "선정 결과", "합격자", "최종 선정", "연기", "취소",
)
_DETAIL_BY_KEY = {}   # bbIdx → 상세 URL(게시판마다 메뉴가 달라 저장해 둔다)


def _is_gongmo_target(title):
    return not any(w in title for w in _GONGMO_SKIP)


def parse_list(html, board_cfg):
    """목록 HTML → 모집중 공고 dict 목록(접수 기간 지난 건·비대상 제외)."""
    today = today_str()
    soup = BeautifulSoup(html, "html.parser")
    rows, expired, skipped = [], 0, 0
    for tr in soup.select("table.board_list tbody tr"):
        a = tr.select_one("div.tit a[href*='bbIdx=']")
        if not a:
            continue
        m = _KEY_RE.search(a.get("href") or "")
        if not m:
            continue
        key = m.group(1)
        title = " ".join(a.get_text(" ", strip=True).split())
        # 사업공고(공모)는 예술인 응모가 아닌 것 제외
        if board_cfg["force_board"] == "audition" and not _is_gongmo_target(title):
            skipped += 1
            continue
        period_el = tr.select_one("td.date2 p.period") or tr.select_one("p.period")
        apply_start, apply_end = parse_period(period_el.get_text(" ", strip=True) if period_el else "")
        closed_badge = tr.select_one("em.receipt.end") is not None
        if (apply_end and apply_end < today) or (closed_badge and apply_end):
            expired += 1
            continue
        cls = classify_all("공예", title)
        if board_cfg["force_board"]:
            cls["board"] = board_cfg["force_board"]
        detail = DETAIL_TMPL.format(board=board_cfg["board"], menu=board_cfg["menu"], key=key)
        _DETAIL_BY_KEY[key] = detail
        rows.append({
            "title": title,
            "organization": SOURCE_NAME,
            "region": REGION,
            "category_raw": f"공예 {board_cfg['cat']}",
            "employment_raw": None,
            **cls,
            "apply_start": apply_start,
            "apply_end": apply_end,
            "source_key": key,
            "source_url": detail,
        })
    return rows, expired, skipped


def collect_rows():
    all_rows, seen = [], set()
    for cfg in BOARDS:
        list_url = LIST_TMPL.format(board=cfg["board"], menu=cfg["menu"])
        print(f"[1] === {cfg['cat']} 게시판(board {cfg['board']}) ===")
        for page in range(1, MAX_PAGES + 1):
            html = fetch_html(list_url, params={"thisPage": str(page)}, sleep=PAGE_SLEEP if (page > 1 or all_rows) else 0)
            rows, expired, skipped = parse_list(html, cfg)
            fresh = [r for r in rows if r["source_key"] not in seen]
            seen.update(r["source_key"] for r in fresh)
            all_rows.extend(fresh)
            print(f"[1] {cfg['cat']} {page}페이지: 모집중 {len(fresh)}건 / 마감 {expired}건 / 비대상 {skipped}건 (누적 {len(all_rows)})")
            if not (fresh or expired or skipped):
                print(f"[1] {cfg['cat']}: 이 페이지부터 공고가 없음 → 다음 게시판")
                break
    return all_rows


def fetch_detail(key):
    """상세 본문 텍스트·연락처. 없는 값은 지어내지 않는다."""
    url = _DETAIL_BY_KEY.get(key) or DETAIL_TMPL.format(board="342", menu="288", key=key)
    html = fetch_html(url)
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
