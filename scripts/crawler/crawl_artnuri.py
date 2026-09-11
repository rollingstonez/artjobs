# -*- coding: utf-8 -*-
"""
아트누리(예술지원사업 통합 안내, 한국문화예술위원회) 크롤러 — https://artnuri.or.kr/crawler/info/search.do

120여 개 문화재단·공공기관의 지원사업·공모·참여 예술인 모집을 한곳에 모아 둔 사이트. 우리는 그중
'예술인이 지원(응모)하는 공고'만 가져와 오디션·공모 게시판(board=audition)에 올린다.

사이트 구조(2026-09 실측, fetch-sample):
  - 목록 GET /crawler/info/search.do?pageIndex=N&recordCountPerPage=50&sc_isDo=I&sc_orderBy=regDt&pageSetting=1
      sc_isDo: I 진행중 / T 예정 / U 미정 / E 마감.  sc_genre 문학·시각예술·연극·뮤지컬·무용·음악·전통예술·다원예술·문화일반·기타
      ul.card > li :  span.state-st2 "진행중" · a.title[onclick="goView('<docid>', '<주관기관>', '<seNo>')"] 제목
                      ul.txt li > strong(주관기관|지원대상|마감일) + em 값 · span.view 조회수 · ul.hashtag li a "#시각예술"
  - 상세 GET /crawler/info/view.do?docid=..&source=<주관기관>&seNo=..  (goView 가 폼 f 를 GET 제출)
      ul.info-txt li > strong(주관기관|지원대상|지역|신청기간|사업유형|온라인신청|분야|첨부파일) …  ul.view-list li 값
      div.supt-inqu ul.list2 li "문의처: …" "연락처: 02-…"
  - robots.txt 없음(404) → 막는 규칙 자체가 없음(robots_check: 깨끗한 허용).

실행: python scripts/crawler/crawl_artnuri.py [--dry-run]
"""
import json
import re
import sys
from urllib.parse import quote

from bs4 import BeautifulSoup

from common import (
    PAGE_SLEEP, EMAIL_RE, PHONE_RE,
    classify_all, fetch_html, parse_date, parse_period, today_str, run_crawler,
)

SOURCE_CODE = "artnuri"
SOURCE_NAME = "아트누리"
BASE = "https://artnuri.or.kr"
LIST_URL = f"{BASE}/crawler/info/search.do"
VIEW_URL = f"{BASE}/crawler/info/view.do"
PER_PAGE = 50
MAX_PAGES = 4             # 진행중 공고만 최신순 → 최대 200건
PARSER_READY = True

_GOVIEW_RE = re.compile(r"goView\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*\)")
# 예술인이 응모하는 공고가 아닌 것(관객·수강생·서포터즈·갤러리 부스 등)은 뺀다.
_SKIP_WORDS = ("서포터즈", "셀러", "수강생", "참여자 모집", "커뮤니티", "관람객", "관객", "시민 참여", "자원봉사", "체험단", "강좌", "아카데미", "교육생",
               "청중평가", "기자단", "참가 갤러리", "설문", "후원", "기부", "구독", "관람 신청", "입장권", "티켓", "이벤트 참여",
               "합격자", "결과 발표", "선정 결과", "취소")
_KEEP_WORDS = ("모집", "공모", "채용", "오디션", "지원사업", "공고", "신청", "레지던시", "입주", "작가", "예술인", "예술가",
               "아티스트", "단원", "참여", "선발", "콩쿠르", "콩쿨", "경연", "쇼케이스")
# 아트누리 장르 태그 → 분야 코드
_TAG_FIELD = {"시각예술": "art", "음악": "music", "무용": "dance", "연극": "theater", "뮤지컬": "theater", "전통예술": "gugak"}
_META = {}                # docid → (주관기관, seNo) — 상세 주소를 만들 때 쓴다


def _is_target_title(title):
    if any(w in title for w in _SKIP_WORDS):
        return False
    return any(w in title for w in _KEEP_WORDS)


def view_url(docid, org, se_no):
    return f"{VIEW_URL}?docid={quote(docid)}&source={quote(org or '')}&seNo={quote(se_no or '001')}"


def parse_list(html):
    """목록 HTML → [{docid, org, se_no, title, state, target, apply_end, tags, views}]."""
    soup = BeautifulSoup(html, "html.parser")
    items = []
    for li in soup.select("ul.card > li"):
        a = li.select_one("a.title[onclick]")
        if not a:
            continue
        m = _GOVIEW_RE.search(a.get("onclick") or "")
        if not m:
            continue
        docid, org, se_no = m.groups()
        state_el = li.select_one("span.state-st2")
        fields = {}
        for row in li.select("ul.txt > li"):
            k = row.select_one("strong")
            v = row.select_one("em")
            if k and v:
                fields[k.get_text(strip=True)] = " ".join(v.get_text(" ", strip=True).split())
        tags = [t.get_text(strip=True).lstrip("#") for t in li.select("ul.hashtag li a")]
        views = li.select_one("span.view")
        items.append({
            "docid": docid, "org": org.strip(), "se_no": se_no,
            "title": " ".join(a.get_text(" ", strip=True).split()),
            "state": state_el.get_text(strip=True) if state_el else "",
            "target": fields.get("지원대상"),
            "apply_end": parse_date(fields.get("마감일") or ""),
            "tags": tags, "views": views.get_text(strip=True) if views else None,
        })
    return items


def row_from_item(it, today):
    """목록 항목 → 공고 dict. 대상이 아니면 (None, 이유)."""
    if it["state"] and "진행" not in it["state"]:
        return None, "state"
    if it["apply_end"] and it["apply_end"] < today:
        return None, "expired"
    if not _is_target_title(it["title"]):
        return None, "skip"
    tags = [t for t in it["tags"] if t != it["org"]]          # 첫 태그는 주관기관명
    field = next((_TAG_FIELD[t] for t in tags if t in _TAG_FIELD), None)
    if not field and "문학" in tags:
        return None, "literature"                              # 문학 전용 공모는 아트잡스 분야 밖
    tag_text = " ".join(tags)
    cls = classify_all(tag_text, it["title"])
    if field:
        cls["field"] = field
        if cls.get("genre") and not cls["genre"].startswith(field + "_"):
            cls["genre"] = None
    cls["board"] = "job" if "채용" in it["title"] else "audition"
    if cls["board"] == "audition" and not cls.get("employment_type"):
        cls["employment_type"] = "open_call"
    _META[it["docid"]] = (it["org"], it["se_no"])
    row = {
        "title": it["title"],
        "organization": it["org"] or None,
        "region": None,                                        # 상세에서 채운다
        "category_raw": tag_text or None,
        "employment_raw": it["target"],
        **cls,
        "apply_start": None,
        "apply_end": it["apply_end"],
        "source_key": it["docid"],
        "source_url": view_url(it["docid"], it["org"], it["se_no"]),
    }
    return row, None


def collect_rows():
    today = today_str()
    rows, seen, stats = [], set(), {}
    for page in range(1, MAX_PAGES + 1):
        html = fetch_html(LIST_URL, params={
            "pageIndex": str(page), "recordCountPerPage": str(PER_PAGE), "sc_isDo": "I",
            "sc_orderBy": "regDt", "pageSetting": "1",
        }, sleep=PAGE_SLEEP if page > 1 else 0)
        items = parse_list(html)
        fresh = [it for it in items if it["docid"] not in seen]
        seen.update(it["docid"] for it in fresh)
        kept = 0
        for it in fresh:
            row, why = row_from_item(it, today)
            if row:
                rows.append(row)
                kept += 1
            else:
                stats[why] = stats.get(why, 0) + 1
        print(f"[1] {page}페이지: 글 {len(fresh)}건 · 대상 {kept}건 (누적 {len(rows)}) · 제외 {stats}")
        if len(fresh) < PER_PAGE:
            print("[1] 마지막 페이지 → 순회 종료")
            break
    return rows


def parse_detail(html):
    soup = BeautifulSoup(html, "html.parser")
    info = {}
    for li in soup.select("ul.info-txt > li"):
        k = li.select_one("strong")
        if not k:
            continue
        key = k.get_text(strip=True)
        vals = [v.get_text(" ", strip=True) for v in li.select("ul.view-list li, ul.file-list li")]
        link = li.select_one("a[href^='http']")
        if key == "온라인신청" and link:
            info[key] = link.get("href")
        elif vals:
            info[key] = [" ".join(v.split()) for v in vals if v.strip()]
        else:
            k.extract()
            info[key] = " ".join(li.get_text(" ", strip=True).split())
    contact = " ".join(li.get_text(" ", strip=True) for li in soup.select("div.supt-inqu ul.list2 li"))
    return info, contact


def fetch_detail(key):
    """상세: 신청기간(시작·끝)·지역·사업유형·분야·원문 신청 링크·첨부·문의처."""
    org, se_no = _META.get(key, ("", "001"))
    html = fetch_html(view_url(key, org, se_no))
    info, contact = parse_detail(html)
    fields = {}
    period = info.get("신청기간")
    if isinstance(period, str):
        start, end = parse_period(period)
        if start:
            fields["apply_start"] = start
        if end:
            fields["apply_end"] = end
    region = info.get("지역")
    if isinstance(region, list) and region:
        fields["region"] = region[0] if len(region) == 1 else "전국"
    link = info.get("온라인신청")
    if isinstance(link, str) and link.startswith("http"):
        fields["apply_method"] = f"온라인 신청: {link}"
    parts = []
    for k in ("주관기관", "지원대상", "지역", "신청기간", "사업유형", "분야"):
        v = info.get(k)
        if v:
            parts.append(f"{k}: {', '.join(v) if isinstance(v, list) else v}")
    files = info.get("첨부파일")
    if isinstance(files, list) and files:
        parts.append("첨부: " + " / ".join(f.replace("미리보기 새창", "").replace("미리보기", "").strip() for f in files[:8]))
    if contact:
        parts.append(contact)
    if parts:
        fields["description"] = " · ".join(parts)[:4000]
    em = EMAIL_RE.search(contact)
    if em and "arko.or.kr" not in em.group(0):
        fields["apply_email"] = em.group(0)
    ph = PHONE_RE.search(contact)
    if ph:
        fields["apply_contact"] = ph.group(0)
    return fields


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
    # 상세는 description 이 비어 있는 것부터 채운다(신규는 전량, 나머지는 한 번에 60건).
    run_crawler(source_code=SOURCE_CODE, source_name=SOURCE_NAME, collect_rows=collect_rows,
                fetch_detail=fetch_detail, detail_empty_field="description", max_detail=60)
