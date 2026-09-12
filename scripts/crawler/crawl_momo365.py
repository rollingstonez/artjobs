# -*- coding: utf-8 -*-
"""
모모365(문화사업지원플랫폼) 크롤러 — https://www.momo365.net

전국 문화재단·공공기관의 공모지원사업·공모전을 한곳에 모은 민간 통합 플랫폼.
지원사업(공모사업)과 공모전 두 게시판을 수집해 오디션·공모 게시판(board=audition)에 올린다.

⚠️ 모모365에는 순수예술 외(지역축제 운영·생활문화·마켓·강좌·용역 등)도 많아, 아트모아·아트누리와
   같은 방식으로 '예술 분야가 잡히는 공고'만 남기고 나머지는 버린다(억지 분류 금지).
⚠️ 채용정보 게시판(/Community.do?cd=job&ViewType=Job_list)은 컨트롤러가 달라 구조가 다르다 →
   별도 실측 후 추가한다(이 파서는 /Support 두 게시판만 담당).

사이트 구조(2026-09 실측, fetch-sample):
  - 목록 GET /Support?cd={support|contest}&ViewType=list&iPageNum=N&StartNum=(N-1)*10&lstNum=10
      한 페이지 10건. 표의 각 행 tr[id^="tr_"] :
        td[2] p.qx_bid_info_content_s a[href*="seq="]  공고명 + 상세 링크
        td[3] p  주관(문화재단명) · td[4] 지역 · td[6] 시작일 · td[7] 마감일(YYYY-MM-DD)
      페이지 이동은 setStartNum(num) → #frmSearch 에 iPageNum·StartNum 넣고 GET 제출.
  - 상세 GET /Support?cd={cd}&ViewType=detail&seq=N
      table#new_style_table : th '관련링크' → a.goToLinkBtn[href] (원문 공고처 URL),
      '첨부파일' → ul#view_files li, 제목은 th#table_title("[기관명] 제목").
  - robots.txt: User-agent:* Allow:/ (깨끗한 허용).

실행: python scripts/crawler/crawl_momo365.py [--dry-run]
"""
import json
import re
import sys

from bs4 import BeautifulSoup

from common import (
    PAGE_SLEEP,
    classify_all, fetch_html, parse_date, today_str, run_crawler,
)

SOURCE_CODE = "momo365"
SOURCE_NAME = "모모365"
BASE = "https://www.momo365.net"
LIST_URL = f"{BASE}/Support"
DETAIL_URL = f"{BASE}/Support?cd={{cd}}&ViewType=detail&seq={{seq}}"
BOARDS = ("support", "contest")   # 공모사업 · 공모전 (둘 다 /Support 컨트롤러)
PER_PAGE = 10
MAX_PAGES = 6                     # 게시판당 최대 60건(최신순) — 모집중만 남으면 더 줄어든다
PARSER_READY = True

_SEQ_RE = re.compile(r"seq=(\d+)")
_DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")
_ORG_RE = re.compile(r"^\[([^\]]{1,30})\]\s*")   # 상세 제목 "[밀양문화재단] ..." 접두사

# 예술인이 응모하는 공고가 아닌 것(운영·용역·행사 참가·강좌 등)은 뺀다.
_SKIP_WORDS = (
    "수강생", "교육생", "체험단", "서포터즈", "자원봉사", "봉사자", "참가자 모집", "참여자 모집",
    "동호회", "강좌", "아카데미", "플리마켓", "마켓 참가", "부스", "셀러", "판매자", "먹거리",
    "용역", "물품", "구매", "입찰", "대관", "공실", "운영대행", "위탁운영", "관리용역",
    "설문", "후원", "기부", "보조금 정산", "간담회", "설명회", "포럼", "세미나", "심포지엄",
    "합격자", "선정 결과", "결과 발표", "정정", "취소", "재공고 안내",
)
# 남길 신호: 예술인 대상 모집·공모임을 알리는 말
_KEEP_WORDS = (
    "작가", "예술인", "예술가", "아티스트", "입주", "레지던시", "공모", "모집", "선발",
    "참여 작가", "참여작가", "청년작가", "신진", "창작", "전시", "개인전", "단체전",
    "콩쿠르", "콩쿨", "경연", "오디션", "단원", "연주자", "무용수", "공연",
)


def _is_target(title, field):
    """예술 분야가 잡히고(field != None), 스킵 단어가 없고, 킵 단어가 있으면 대상."""
    if any(w in title for w in _SKIP_WORDS):
        return False
    if not field:                       # 순수예술 분야가 안 잡히면 버린다
        return False
    return any(w in title for w in _KEEP_WORDS)


def parse_list(html, cd):
    """목록 HTML → [{seq, title, org, region, apply_start, apply_end, cd}] (대상만)."""
    today = today_str()
    soup = BeautifulSoup(html, "html.parser")
    items = []
    for tr in soup.select("tr[id^='tr_']"):
        a = tr.select_one("p.qx_bid_info_content_s a[href], a[href*='seq=']")
        if not a:
            continue
        m = _SEQ_RE.search(a.get("href") or "")
        seq = m.group(1) if m else (tr.get("id") or "").replace("tr_", "")
        if not seq:
            continue
        title = " ".join(a.get_text(" ", strip=True).split())
        tds = tr.find_all("td", recursive=False)
        cells = [" ".join(td.get_text(" ", strip=True).split()) for td in tds]
        dates = [c for c in cells if _DATE_RE.fullmatch(c)]
        apply_start = parse_date(dates[0]) if dates else None
        apply_end = parse_date(dates[-1]) if dates else None
        if apply_end and apply_end < today:      # 마감 지난 공고는 버린다(모집중만)
            continue
        # 주관(문화재단): 공고명 셀 다음, 날짜/지역이 아닌 첫 셀
        org = None
        region = None
        for c in cells[3:]:
            if _DATE_RE.fullmatch(c) or not c:
                continue
            if len(c) <= 4 and c in ("전국", "서울", "부산", "대구", "인천", "광주", "대전", "울산",
                                     "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"):
                region = region or c
                continue
            if org is None:
                org = c
        items.append({
            "seq": seq, "title": title, "org": org, "region": region,
            "apply_start": apply_start, "apply_end": apply_end, "cd": cd,
        })
    return items


def row_from_item(it):
    """목록 항목 → 공고 dict. 대상이 아니면 None."""
    cls = classify_all(it["title"])
    if not _is_target(it["title"], cls.get("field")):
        return None
    cls["board"] = "audition"                    # 공모사업·공모전 → 오디션·공모 게시판
    if not cls.get("employment_type"):
        cls["employment_type"] = "open_call"
    return {
        "title": it["title"],
        "organization": it["org"],
        "region": it["region"],
        "category_raw": None,
        "employment_raw": None,
        **cls,
        "apply_start": it["apply_start"],
        "apply_end": it["apply_end"],
        "source_key": f"{it['cd']}_{it['seq']}",   # 게시판 구분 포함(공모사업·공모전 seq 충돌 방지)
        "source_url": DETAIL_URL.format(cd=it["cd"], seq=it["seq"]),
    }


def collect_rows():
    rows, seen, stats = [], set(), {"skip": 0}
    for cd in BOARDS:
        for page in range(1, MAX_PAGES + 1):
            html = fetch_html(LIST_URL, params={
                "cd": cd, "ViewType": "list",
                "iPageNum": str(page), "StartNum": str((page - 1) * PER_PAGE), "lstNum": str(PER_PAGE),
            }, sleep=PAGE_SLEEP if page > 1 else 0)
            items = parse_list(html, cd)
            fresh = [it for it in items if f"{it['cd']}_{it['seq']}" not in seen]
            seen.update(f"{it['cd']}_{it['seq']}" for it in fresh)
            kept = 0
            for it in fresh:
                row = row_from_item(it)
                if row:
                    rows.append(row)
                    kept += 1
                else:
                    stats["skip"] += 1
            print(f"[1] {cd} {page}페이지: 글 {len(fresh)}건 · 대상 {kept}건 (누적 {len(rows)})")
            if len(items) < PER_PAGE:
                break
    print(f"[1] 제외(순수예술 아님·비대상): {stats['skip']}건")
    return rows


def parse_detail(html):
    soup = BeautifulSoup(html, "html.parser")
    fields = {}
    link = soup.select_one("a.goToLinkBtn[href^='http']")
    if link:
        fields["apply_method"] = f"원문 공고처: {link.get('href')}"
    files = [" ".join(li.get_text(" ", strip=True).split()) for li in soup.select("ul#view_files li")]
    files = [f for f in files if f]
    parts = []
    if files:
        parts.append("첨부: " + " / ".join(files[:8]))
    if link:
        parts.append(f"원문 공고처: {link.get('href')}")
    if parts:
        fields["description"] = " · ".join(parts)[:4000]
    return fields


def fetch_detail(source_key):
    cd, seq = source_key.split("_", 1)
    html = fetch_html(DETAIL_URL.format(cd=cd, seq=seq))
    return parse_detail(html)


if __name__ == "__main__":
    if not PARSER_READY:
        raise SystemExit(f"[중단] {SOURCE_CODE} 파서 미완성(PARSER_READY=False)")
    if "--dry-run" in sys.argv:
        import time
        rows = collect_rows()
        print(f"\n[dry-run] {len(rows)}건 (DB 적재 안 함) — 상세 1건 표본:")
        if rows:
            time.sleep(PAGE_SLEEP)
            print(json.dumps(fetch_detail(rows[0]["source_key"]), ensure_ascii=False)[:800])
        for r in rows:
            print(json.dumps(r, ensure_ascii=False))
        raise SystemExit(0)
    run_crawler(source_code=SOURCE_CODE, source_name=SOURCE_NAME, collect_rows=collect_rows,
                fetch_detail=fetch_detail, detail_empty_field="description", max_detail=60)
