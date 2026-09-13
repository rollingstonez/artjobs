# -*- coding: utf-8 -*-
"""
서울문화재단 크롤러 — 게시판 두 개를 함께 읽는다.

  1) 채용공고   https://www.sfac.or.kr/opensquare/notice/recruit_list.do      (cbIdx=964)
  2) 공모 소식  https://www.sfac.or.kr/business/artsupport/notice_gather.do   (cbIdx=992)
     └ 재단의 공모·지원사업·참여자 모집이 모이는 게시판. 사이트 메뉴 '신청·참여 > 공모 소식'과 같은 글이다.
       카테고리 칸이 있어 '공고'(cateTypeCd=25)만 골라 받는다. '결과'(26)는 받지 않는다.

사이트 구조(2026-09 실측, GitHub Actions fetch-sample 로 확인):
  - 두 게시판 모두 화면은 껍데기만 오고 실제 목록은  POST /site/SFAC_KOR/ex/bbs/ListSfac.do  (cbIdx, pageIndex=N) 로 온다.
    ul.board-list--wrap > li > a[onclick="doView('<cbIdx>','<bcIdx>','<게시판 주소>')"] · 제목 dl.subject dd p · 작성일 dl.date dd (마감일 없음)
  - 상세도 마찬가지로  POST /site/SFAC_KOR/ex/bbs/ViewSfac.do  (cbIdx, bcIdx). article.board-view 안에
    .board-view--title h4 · .item-post-info.date dd · .board-view--file a.link--file(첨부) · .board-view--body(본문, HWP 편집기 데이터 포함, 1MB 안팎)
  - 사람이 보는 주소: <게시판 주소>?cbIdx=<cbIdx>&bcIdx=<bcIdx>&type=   (source_url 로 쓴다)
  - robots.txt: allow / (검색·flexer 만 금지) → 깨끗한 허용.

두 게시판 모두 '공고' 외에 합격자 발표·결과 발표·안내가 섞여 있다. 제목으로 공고만 고른다.
목록에 마감일이 없으므로 최근 RECENT_DAYS 안에 올라온 글만 상세를 열어 접수 기간을 읽고, 마감 지난 것은 뺀다.
source_key 는 게시판마다 접두사를 붙여 섞이지 않게 한다(채용은 접두사 없음 — 이미 수집해 둔 글의 키를 그대로 지키려고).

아직 안 보는 것(허용 확인이 먼저다):
  - 지원사업 공모 /participation/participation/artspace_project.do
  - 입주작가 공모 /participation/participation/artspace_movein.do
    두 화면은 카드에 접수 기간이 없고, 카드를 누르면 scas.kr(서울예술인지원센터) 상세로 넘어간다.
    scas.kr 은 robots.txt 자리에 차단 안내 페이지가 와서 수집 허용 여부를 확인하지 못했다 — 확인 전에는 요청하지 않는다.
    다행히 이 두 화면의 공모는 대부분 '공모 소식' 게시판에도 함께 올라오므로 아래 2번 게시판으로 들어온다.

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
    classify_all, parse_date, today_str, run_crawler, parse_period_text, normalize_period_text,
)
from http_retry import _retry

SOURCE_CODE = "sfac"
SOURCE_NAME = "서울문화재단"
REGION = "서울"
BASE = "https://www.sfac.or.kr"
LIST_API = f"{BASE}/site/SFAC_KOR/ex/bbs/ListSfac.do"
VIEW_API = f"{BASE}/site/SFAC_KOR/ex/bbs/ViewSfac.do"

# 읽을 게시판. prefix 는 source_key 앞에 붙여 게시판끼리 번호가 겹치지 않게 한다.
#   (채용공고는 이미 수집해 둔 글이 있어 접두사 없이 둔다 — 키가 바뀌면 같은 글이 새 글로 또 들어온다)
BOARDS = (
    {"code": "recruit", "label": "채용공고", "cb": "964", "cate": "",
     "path": "/opensquare/notice/recruit_list.do", "prefix": "", "board": None},
    {"code": "gather", "label": "공모 소식", "cb": "992", "cate": "25",
     "path": "/business/artsupport/notice_gather.do", "prefix": "g", "board": "audition"},
)
MAX_PAGES = 10
RECENT_DAYS = 90            # 이보다 오래된 글은 상세를 열지 않는다(마감됐다고 본다)
PARSER_READY = True

# 제목으로 '공고'만 고른다. 결과·안내 글은 뺀다.
_SKIP_WORDS = ("합격자", "발표", "면접심사 안내", "면접 안내", "일정 안내", "결과", "정정", "변경 예정", "취소")
_KEEP_WORDS = ("공고", "모집", "채용", "공개모집", "공개채용", "공모", "지원사업", "선정", "접수")

_VIEW_RE = re.compile(r"doView\('(\d+)'\s*,\s*'(\d+)'")
# 접수 기간 판독은 common.parse_period_text (표기 실측·정규식은 그쪽 주석 참고).


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
    """목록 HTML → [{key, title, posted}] (공고 제목만, 날짜 필터 없음). key 는 게시판 안의 글 번호(bcIdx)."""
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


def _normalize(text):
    return normalize_period_text(text)


def _period_from_text(text, posted_year=None):
    """본문 텍스트에서 접수 기간 — 공용 common.parse_period_text 를 쓴다(표기 실측은 common 주석 참고)."""
    return parse_period_text(text)


def parse_detail(html, posted=None):
    """상세 HTML → 상세 필드 dict(접수기간·본문·연락처·첨부)."""
    soup = BeautifulSoup(html, "html.parser")
    art = soup.select_one("article.board-view") or soup
    body = art.select_one(".board-view--body")
    for t in (body or art).find_all(["img", "script", "style"]):
        t.decompose()
    # HWP 편집기 JSON 주석은 get_text 에 안 들어오지만, 혹시 남은 주석은 제거
    text = " ".join((body or art).get_text(" ", strip=True).split()) if body else ""
    # 편집기가 글자마다 span 을 끼워 "접 수 기 간" 처럼 벌어지는 경우가 있어, 기간 판독은 붙여 쓴 텍스트로 한다.
    tight = re.sub(r"\s+", " ", (body or art).get_text("", strip=True)) if body else ""
    attachments = [" ".join(a.get_text(" ", strip=True).split()) for a in art.select(".board-view--file a.link--file")]
    apply_start, apply_end = _period_from_text(tight, (posted or "")[:4])
    if not apply_end:
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


def _form(bd, **extra):
    """ListSfac/ViewSfac 이 요구하는 폼 값. 게시판마다 cbIdx 와 주소만 다르다."""
    data = {
        "cbIdx": bd["cb"], "searchKey": "", "tgtTypeCd": "", "cateTypeCd": bd["cate"],
        "viewUrl": bd["path"], "listUrl": bd["path"], "registUrl": "", "type": "",
    }
    data.update(extra)
    return data


def detail_url(bd, key):
    return f"{BASE}{bd['path']}?cbIdx={bd['cb']}&bcIdx={key}&type="


def fetch_detail_fields(bd, key, posted=None):
    return parse_detail(_post_html(VIEW_API, _form(bd, bcIdx=key)), posted)


def collect_board(bd, today, cutoff):
    """게시판 하나를 돌며 모집중 공고 행을 만든다."""
    candidates, seen = [], set()
    for page in range(1, MAX_PAGES + 1):
        html = _post_html(LIST_API, _form(bd, pageIndex=str(page)), sleep=PAGE_SLEEP if page > 1 else 0)
        items = parse_list(html)
        if not items:
            print(f"[1] {bd['label']} {page}페이지: 글 없음 → 종료")
            break
        old = [it for it in items if it["posted"] and it["posted"] < cutoff]
        fresh = [it for it in items if it["key"] not in seen and not (it["posted"] and it["posted"] < cutoff)]
        seen.update(it["key"] for it in fresh)
        kept = [it for it in fresh if _is_posting_title(it["title"])]
        candidates.extend(kept)
        print(f"[1] {bd['label']} {page}페이지: 글 {len(items)}건 중 최근 {len(fresh)}건, 공고 제목 {len(kept)}건 (누적 {len(candidates)})")
        if old and len(old) == len(items):
            print(f"[1] {bd['label']} {page}페이지: 전부 {RECENT_DAYS}일 이전 글 → 순회 종료")
            break

    rows = []
    for i, it in enumerate(candidates):
        detail = fetch_detail_fields(bd, it["key"], it["posted"])
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
            "source_key": f"{bd['prefix']}{it['key']}",
            "source_url": detail_url(bd, it["key"]),
        }
        # 공모 게시판 글은 제목에 '공모'가 없어도 채용이 아니다 — 오디션·공모 게시판으로 보낸다.
        if bd["board"]:
            row["board"] = bd["board"]
            row["employment_type"] = row.get("employment_type") or "open_call"
        for k in ("description", "apply_email", "apply_contact"):
            if detail.get(k):
                row[k] = detail[k]
        rows.append(row)
        print(f"[1]   {it['posted']} · 접수 {detail.get('apply_start')}~{apply_end} · {it['title'][:50]}")
    return rows


def collect_rows():
    today = today_str()
    cutoff = (date.today() - timedelta(days=RECENT_DAYS)).strftime("%Y-%m-%d")
    rows = []
    for bd in BOARDS:
        rows.extend(collect_board(bd, today, cutoff))
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
