# -*- coding: utf-8 -*-
"""
나라일터(인사혁신처) 일반채용 모집공고 크롤러 — https://www.gojobs.go.kr/apmList.do?menuNo=401

왜 붙이나:
  중앙부처·지방자치단체·시도교육청의 학예연구사(직)·전시기획·공연장 운영·문화예술과 공고가
  여기로 모인다. 공공 문화기관 채용을 한 곳에서 볼 수 있는 가장 큰 창구이고, 임기제·기간제·
  공무직 물량이 많아 아트잡스가 지금 모으는 기관별 게시판과 겹치지 않는 공고가 많다.
  다만 공직 전체 공고가 하루 100건 넘게 올라오므로 **예술 분야만 골라서** 가져온다.

robots.txt 판정 (docs/robots_result.json, 2026-09-10 실측):
  robots_http 200 · verdict "깨끗한 허용" · reason "우리 경로를 막는 규칙 없음"
  목록 페이지도 HTTP 200 (185,023바이트 · 링크 96개) 으로 응답했다.
  → supabase/seed/robots_status.sql 에서 gojobs = 'clean'. 운영자 화면에서 켤 수 있는 상태.

실측으로 확인한 것 (2026-09-13, --probe 를 GitHub Actions 에서 돌려 확인)
  · 목록 표 머리글: 번호 | 공고명 | 기관명 | 공고게시일 | 접수마감일 | 조회
    표는 CSS 클래스가 아니라 **머리글 이름**으로 찾는다 — 화면이 손봐도 덜 깨진다.
    마감일이 목록에 있어 **상세를 열지 않아도 모집중 여부를 가릴 수 있다**(sema·seoul_culture
    처럼 첨부(hwp) 안을 못 읽어 마감일을 모르는 문제가 여기서는 없다).
    지역 칸은 없다 → 기관명에서 시·도를 읽어 낸다(_region_of).
    기본 정렬이 '최근 게시일 순' 이라 게시일이 기준일보다 오래된 쪽이 나오면 순회를 멈춘다.
  · 페이지 넘김: GET ?pageIndex=2 로 2페이지가 나온다(폼은 POST 지만 GET 도 받는다).
  · 상세 링크: 목록 <a> 가 href="javascript:fn_apmView('020', '303444')" 다.
    두 인자가 상세 주소의 searchInsttsecode·empmnsn 이고,
    apmView.do?menuNo=401&searchInsttsecode=020&empmnsn=303444 를 열면
    139,565바이트 안에 목록의 그 제목이 그대로 들어 있다.
  · robots.txt 에는 User-agent Googlebot 항목만 있고 Disallow 는 /search/search.do 하나뿐이다
    — 우리 경로를 막는 규칙이 없다.
  · 안전장치는 남겨 둔다: 페이지 파라미터가 안 먹으면(2페이지 첫 글이 1페이지와 같으면)
    중복을 쌓지 않고 경고를 찍고 멈추고, 상세 주소를 못 만든 행은 넣지 않는다.

⚠️ 접속이 반반이다 — 아래 '접속' 절 참고. 파서 문제가 아니라 나가는 IP 문제다.

다시 확인하고 싶을 때 (GitHub Actions 로 클릭 실행, 로컬 설치 불필요)
  Actions → daily-crawl → Run workflow → source: gojobs, dry_run: true
  로그 [probe] 절에 표 머리글·첫 행·페이지 넘김·상세 주소가 아직 맞는지 찍힌다.
  사이트가 바뀌어 ❌ 가 뜨면 그때 이 파일의 상수를 고친다.

실행: python scripts/crawler/crawl_gojobs.py [--probe | --dry-run]
"""
import json
import re
import sys
import time
from datetime import date, timedelta
from urllib.parse import parse_qs, urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from common import (
    PAGE_SLEEP, EMAIL_RE, PHONE_RE, USER_AGENT,
    classify_all, parse_date, parse_period_text, run_crawler, today_str,
)
from http_retry import _retry

SOURCE_CODE = "gojobs"
SOURCE_NAME = "나라일터(인사혁신처)"
BASE = "https://www.gojobs.go.kr"
LIST_URL = f"{BASE}/apmList.do"
LIST_PARAMS = {"menuNo": "401", "mngrMenuYn": "N", "selMenuNo": "400"}

PAGE_PARAM = "pageIndex"   # 2026-09-13 probe 실측: GET ?pageIndex=2 로 2페이지가 나온다
MAX_PAGES = 60             # 한 페이지 10건 → 600건. 하루 100건 남짓이니 매일 돌리기에 충분히 넉넉하다.
RECENT_DAYS = 21           # 게시일이 이보다 오래된 쪽이 나오면 순회 종료
PARSER_READY = True        # 2026-09-13 probe 로 표 구조·페이지 넘김·상세 주소를 모두 실측 확인

# ── 접속 ──────────────────────────────────────────────────────
# ⚠️ 나라일터는 GitHub 러너에서 접속이 반반이다. 2026-09-13 일곱 번 실측:
#   러너 326·328·329 → 3~6초 만에 HTTP 200 (185KB)
#   러너 325·330·331 → 무엇을 해도 ConnectTimeout (requests 4회 + curl_cffi 90초까지 전부)
# 러너가 바뀌면 되고 안 바뀌면 계속 안 된다 → 시간이 아니라 **나가는 IP** 로 갈린다.
# .go.kr 이 해외 IP 대역 일부를 막아 둔 것으로 보인다(README 의 국립현대미술관과 같은 증상).
#
# 그래서 한 실행 안에서 오래 매달리지 않는다 — 같은 IP 로 다시 걸어봐야 결과가 같다.
# 짧게 두 번만 시도하고(약 1분), 그래도 안 되면 그 회차는 포기한다.
# crawl.yml 에서 이 단계는 continue-on-error 라 다른 소스 수집은 그대로 끝난다.
# 매일 돌리면 러너가 바뀌므로 되는 날 들어온다. 안정적으로 받으려면 공공데이터포털
# '인사혁신처_공공취업정보 조회'(data.go.kr/data/15000485) 활용신청이 답이다 — 주소가
# apis.data.go.kr 로 달라 이 IP 문제를 비껴간다.
CONNECT_TIMEOUT = 25
READ_TIMEOUT = 45
FETCH_TRIES = 2
FETCH_WAIT = 5
CURL_TIMEOUT = 25


def _fetch(url, *, params=None, sleep=0):
    """UA 를 밝힌 GET. requests → (실패하면) curl_cffi 순서로 시도한다."""
    if sleep:
        time.sleep(sleep)
    headers = {"User-Agent": USER_AGENT}
    try:
        r = _retry(requests.get, url, _tries=FETCH_TRIES, _wait=FETCH_WAIT,
                   headers=headers, params=params, timeout=(CONNECT_TIMEOUT, READ_TIMEOUT))
        r.raise_for_status()
        r.encoding = r.apparent_encoding or "utf-8"
        return r.text
    except Exception as e:
        print(f"[네트워크] requests 실패({type(e).__name__}) → curl_cffi(크롬 흉내)로 다시 시도", flush=True)
    from curl_cffi import requests as curl_requests
    r = curl_requests.get(url, params=params, headers=headers,
                          impersonate="chrome", timeout=CURL_TIMEOUT)
    r.raise_for_status()
    print("[네트워크] curl_cffi 로 받았다.", flush=True)
    return r.text


# 목록 머리글 이름 → 우리가 쓸 칸 이름. 표기가 조금 달라도 걸리도록 부분일치로 찾는다.
_COLUMNS = {
    "title": ("공고명", "제목"),
    "organization": ("기관명", "기관", "부처"),
    "posted": ("게시일", "공고일", "등록일"),
    "deadline": ("마감일", "접수마감", "마감"),
}

# ── 예술 분야 고르기 ──────────────────────────────────────────────
# 나라일터는 공직 전체 공고가 올라온다. 아트잡스 범위(미술·음악·무용·국악·연극)에 닿는 것만 남긴다.
_ART_WORDS = (
    # 미술·박물관·학예
    "학예", "큐레이터", "큐레이션", "전시", "미술관", "박물관", "갤러리", "미술", "조형",
    "공예", "도자", "서예", "판화", "조각", "회화", "미디어아트", "사진",
    "문화재", "문화유산", "유물", "보존처리", "기록화",
    # 공연·극장
    "공연", "공연장", "극장", "무대", "연극", "뮤지컬", "오페라", "극단", "아트홀",
    # 음악·국악
    "음악", "관현악", "교향악", "오케스트라", "합창", "성악", "연주", "악기", "피아노", "반주",
    "국악", "판소리", "가야금", "거문고", "해금", "대금", "전통예술", "풍물", "농악",
    # 무용
    "무용", "발레", "안무", "무용단",
    # 공통
    "문화예술", "예술", "아트", "문예회관", "문화재단", "예술의전당",
    "단원", "예술감독", "지휘자", "작가", "레지던시", "창작",
    "조명", "음향", "무대기술", "무대감독", "무대미술",
)
# '전시(展示)' 와 '전시(戰時)' 를 가른다. 공직 공고에는 전시대비·충무계획 같은 비상대비 업무가 많다.
_WAR_WORDS = ("전시대비", "전시 대비", "전시작전", "전시·사변", "전시 사변", "전시사변",
              "비상대비", "충무계획", "충무훈련", "동원훈련", "민방위")
# 공고가 아닌 글(결과·일정 안내)은 뺀다. 재공고·연장은 지원할 수 있으므로 남긴다.
_SKIP_WORDS = ("합격자", "최종합격", "합격 발표", "면접시험 계획", "면접시험일", "시험장소",
               "결과 발표", "선정 결과", "채용 취소", "공고 취소", "접수 취소")
# 원문 그대로 보존할 고용형태 표기(employment_raw). classify_employment 가 코드로도 바꿔 준다.
_EMPLOYMENT_WORDS = ("임기제", "기간제", "공무직", "시간선택제", "전문경력관", "청원경찰",
                     "무기계약", "계약직", "위촉", "정규직")

# ── 기관명 → 시·도 (목록에 지역 칸이 없어 기관명에서 읽는다) ──────────
# 시·도 이름이 먼저다. '경기도 광주시' 와 '광주광역시' 가 겹치므로 시·도를 먼저 맞춘다.
_SIDO_TOKENS = (
    ("서울", "서울"), ("부산", "부산"), ("대구", "대구"), ("인천", "인천"),
    ("광주광역", "광주"), ("대전", "대전"), ("울산", "울산"), ("세종", "세종"),
    ("경기", "경기"), ("강원", "강원"),
    ("충청북도", "충북"), ("충북", "충북"), ("충청남도", "충남"), ("충남", "충남"),
    ("전라북도", "전북"), ("전북", "전북"), ("전라남도", "전남"), ("전남", "전남"),
    ("경상북도", "경북"), ("경북", "경북"), ("경상남도", "경남"), ("경남", "경남"),
    ("제주", "제주"), ("광주", "광주"),
)
# 시·군 이름 → 시·도. 두 시·도에 같은 이름이 있는 곳(고성·광주)은 일부러 넣지 않는다 — 틀리느니 빈칸이 낫다.
_CITY_SIDO = {
    "경기": ("수원", "성남", "고양", "용인", "부천", "안산", "안양", "남양주", "화성", "평택", "의정부",
             "시흥", "파주", "김포", "광명", "군포", "이천", "양주", "오산", "구리", "안성", "포천",
             "의왕", "하남", "여주", "동두천", "과천", "가평", "연천", "양평"),
    "강원": ("춘천", "원주", "강릉", "동해", "태백", "속초", "삼척", "홍천", "횡성", "영월", "평창",
             "정선", "철원", "화천", "양구", "인제", "양양"),
    "충북": ("청주", "충주", "제천", "보은", "옥천", "영동", "증평", "진천", "괴산", "음성", "단양"),
    "충남": ("천안", "공주", "보령", "아산", "서산", "논산", "계룡", "당진", "금산", "부여", "서천",
             "청양", "홍성", "예산", "태안"),
    "전북": ("전주", "군산", "익산", "정읍", "남원", "김제", "완주", "진안", "무주", "장수", "임실",
             "순창", "고창", "부안"),
    "전남": ("목포", "여수", "순천", "나주", "광양", "담양", "곡성", "구례", "고흥", "보성", "화순",
             "장흥", "강진", "해남", "영암", "무안", "함평", "영광", "장성", "완도", "진도", "신안"),
    "경북": ("포항", "경주", "김천", "안동", "구미", "영주", "영천", "상주", "문경", "경산", "의성",
             "청송", "영양", "영덕", "청도", "고령", "성주", "칠곡", "예천", "봉화", "울진", "울릉"),
    "경남": ("창원", "진주", "통영", "사천", "김해", "밀양", "거제", "양산", "의령", "함안", "창녕",
             "남해", "하동", "산청", "함양", "거창", "합천"),
    "제주": ("서귀포",),
}

# 목록 <a> 는 href="javascript:fn_apmView('020', '303444')" 꼴이고, 그 두 인자가 상세 주소의
# searchInsttsecode·empmnsn 이다 — 2026-09-13 probe 가 후보를 실제로 열어 확인했다
# (apmView.do?menuNo=401&searchInsttsecode=020&empmnsn=303444 → 139,565바이트, 목록의 제목 있음).
# source_key 는 두 인자를 이어 붙인다 — 키만 있으면 상세 주소를 다시 만들 수 있어야
# 나중에 상세를 채우는 백필도 동작한다.
_APMVIEW_RE = re.compile(r"fn_apmView\s*\(\s*'([^']*)'\s*,\s*'([^']*)'\s*\)")
DETAIL_URL = BASE + "/apmView.do?menuNo=401&searchInsttsecode={instt}&empmnsn={sn}"


def _detail_url_of(key):
    """source_key('020-303444') → 상세 주소. 형식이 다르면 None."""
    if not key or "-" not in str(key):
        return None
    instt, sn = str(key).split("-", 1)
    return DETAIL_URL.format(instt=instt, sn=sn)

# 상세 주소는 목록에서 읽어 둔다(kcdf 와 같은 방식) — 상세 단계에서 source_key 만 받기 때문.
_DETAIL_BY_KEY = {}
# 목록에서 이미 마감일을 받은 공고번호. 상세가 본문에서 읽은 날짜로 이 값을 덮지 않게 막는다.
_DEADLINE_KNOWN = set()

# source_key 로 쓰면 안 되는 파라미터(메뉴·페이지 번호). 이걸 걸러야 공고번호만 남는다.
_KEY_PARAM_SKIP = {"menuno", "selmenuno", "uppermenuno", "mngrmenuyn", "pageindex", "pageno",
                   "page", "currentpage", "pageunit", "pagesize", "rowcount", "wd", "tab"}
_KEY_PARAM_HINTS = ("empmnsn", "bbssn", "apmsn", "seq", "sn", "idx", "no", "id")


def _clean(s):
    return " ".join((s or "").split())


def _region_of(organization, title=""):
    """시·도를 읽는다. 근거가 없으면 None — 틀리느니 빈칸이 낫다.

    시·도 이름은 기관명 → (없으면) 제목 순서로 찾고,
    시·군 이름은 **기관명에서만** 찾는다. 제목에는 '장애인제한'(→'인제') 처럼
    시·군 이름을 품은 낱말이 섞여 들어와 엉뚱한 지역이 붙는다(2026-09-13 실측)."""
    org = organization or ""
    for source in (org, title or ""):
        for token, sido in _SIDO_TOKENS:
            if token in source:
                return sido
    for sido, cities in _CITY_SIDO.items():
        if any(c in org for c in cities):
            return sido
    return None


# 기관명에서만 보는 낱말 — '그 기관이 예술기관인가'. 제목용 낱말을 기관명에 그대로 쓰면
# '이태원참사진상규명…위원회' 의 '참사진상' → '사진' 처럼 엉뚱하게 걸린다(2026-09-13 실측).
_ART_ORG_WORDS = (
    "미술관", "박물관", "갤러리", "아트센터", "예술의전당", "문화예술회관", "예술회관", "문예회관",
    "문화회관", "문화의전당", "공연장", "국악원", "문화재단", "문화예술재단", "문화관광재단",
    "예술단", "교향악단", "국악단", "무용단", "합창단", "극단", "오페라단", "문화원",
    "문화예술", "예술대학", "예술고등학교", "문화재청", "국가유산청",
)


def _is_art(title, organization):
    org = organization or ""
    if any(w in title or w in org for w in _SKIP_WORDS):
        return False
    hit_title = [w for w in _ART_WORDS if w in title]
    hit_org = [w for w in _ART_ORG_WORDS if w in org]
    if not hit_title and not hit_org:
        return False
    # '전시' 만 걸렸는데 비상대비 업무면 제외한다(展示 가 아니라 戰時).
    if any(w in title for w in _WAR_WORDS) and not hit_org:
        if not [w for w in hit_title if w != "전시"]:
            return False
    return True


# ── 분류 보정 ─────────────────────────────────────────────────
# 공용 classify_all(common.py) 은 예술기관 게시판을 기준으로 만든 키워드표라, 공직 공고 제목에는
# 두 군데가 안 맞는다. 공용 표를 건드리면 다른 소스 분류까지 바뀌므로 여기서만 바로잡는다.
#   1) '학예연구사'·'박물관'·'유물' 만 있고 '미술'·'전시' 가 없으면 분야가 안 잡힌다 → 미술(art)로 본다.
#   2) '국악관현악단 지휘자' 처럼 국악 공고인데 '지휘'·'관현악' 이 먼저 걸려 음악(music)이 된다 → 국악(gugak)으로 고친다.
_MUSEUM_WORDS = ("학예", "박물관", "미술관", "유물", "보존처리", "문화재", "문화유산", "큐레이터", "전시")
_GUGAK_WORDS = ("국악", "전통예술", "판소리", "농악", "풍물", "사물놀이", "가야금", "거문고", "해금", "대금", "아쟁")


def _classify(title, organization):
    text = f"{title} {organization or ''}"
    cls = classify_all(title, organization or "")
    if any(w in text for w in _GUGAK_WORDS) and cls.get("field") == "music":
        # 악기 이름이 직접 있었다면 classify_genre 가 이미 gugak_* 를 골랐을 것이다(국악 키워드가 앞에 있다).
        # 여기까지 왔다는 건 '관현악'의 '현악' 처럼 근거가 약한 낱말이 걸린 것이므로 장르는 비운다.
        cls["genre"] = None
        cls["field"] = "gugak"
    if not cls.get("field") and any(w in text for w in _MUSEUM_WORDS):
        cls["field"] = "art"
    return cls


def _employment_raw(title):
    return next((w for w in _EMPLOYMENT_WORDS if w in title), None)


def _key_from_href(href):
    """상세 주소의 질의문자열에서 공고번호를 고른다. 메뉴·페이지 번호는 거른다."""
    nums = {}
    for k, v in parse_qs(urlparse(href).query).items():
        if k.lower() in _KEY_PARAM_SKIP:
            continue
        val = (v[0] if v else "").strip()
        if val.isdigit() and val != "0":
            nums[k.lower()] = val
    if not nums:
        return None
    for hint in _KEY_PARAM_HINTS:
        if hint in nums:
            return nums[hint]
    for hint in _KEY_PARAM_HINTS:
        for k in sorted(nums):
            if hint in k:
                return nums[k]
    return "-".join(f"{k}{nums[k]}" for k in sorted(nums))


def _key_from_onclick(onclick):
    """javascript:fn_view('12345','2') 같은 표기에서 인자를 이어 붙여 안정적인 키를 만든다."""
    args = []
    for quoted in re.findall(r"'([^']*)'|\"([^\"]*)\"", onclick or ""):
        val = (quoted[0] or quoted[1]).strip()
        if val:
            args.append(val)
    return "-".join(args) if args else None


def _link_of(cell):
    """목록 칸의 <a> → (공고번호, 상세 주소). 주소를 못 만들면 (키, None)."""
    a = cell.find("a") if cell else None
    if not a:
        return None, None
    href = (a.get("href") or "").strip()
    onclick = (a.get("onclick") or "") + " " + (href if href.lower().startswith("javascript") else "")
    if href and not href.lower().startswith(("javascript", "#")):
        url = urljoin(LIST_URL, href)
        return _key_from_href(url) or _key_from_onclick(onclick), url
    m = _APMVIEW_RE.search(href) or _APMVIEW_RE.search(onclick)
    if m:
        key = f"{m.group(1)}-{m.group(2)}"
        return key, _detail_url_of(key)
    key = _key_from_onclick(onclick)
    return key, _detail_url_of(key)


def _header_map(table):
    """표 머리글 → {우리 칸 이름: 칸 번호}. '공고명' 이 없으면 우리 표가 아니다."""
    head = table.select("thead th") or table.select("thead td")
    if not head:
        first = table.find("tr")
        head = first.find_all(["th", "td"]) if first else []
    labels = [_clean(h.get_text(" ")) for h in head]
    if not labels:
        return None, labels
    mapping = {}
    for name, words in _COLUMNS.items():
        for i, label in enumerate(labels):
            if any(w in label for w in words):
                mapping.setdefault(name, i)
                break
    return (mapping if "title" in mapping else None), labels


def _pick_table(soup):
    """공고 목록 표를 머리글로 찾는다(클래스 이름에 기대지 않는다)."""
    for table in soup.find_all("table"):
        mapping, _ = _header_map(table)
        if mapping and table.find_all("tr"):
            return table, mapping
    return None, None


def _rows_of(soup):
    """probe 전용 — 상세 주소를 못 만들어도 행을 돌려준다(파싱 자체가 되는지 보려고)."""
    table, mapping = _pick_table(soup)
    if not table:
        return []
    body = table.find("tbody") or table
    out = []
    for tr in body.find_all("tr"):
        cells = tr.find_all("td")
        if not cells or len(cells) <= mapping["title"]:
            continue
        cell = cells[mapping["title"]]
        a = cell.find("a")
        href = (a.get("href") or "") if a else ""
        m = _APMVIEW_RE.search(href)
        key, _ = _link_of(cell)
        title = _clean(cell.get_text(" "))
        if title:
            out.append({"key": key, "title": title, "args": m.groups() if m else None})
    return out


def parse_list(html):
    """목록 HTML → [{key, url, title, organization, posted, deadline}]."""
    soup = BeautifulSoup(html, "html.parser")
    table, mapping = _pick_table(soup)
    if not table:
        return []
    body = table.find("tbody") or table
    items, no_url = [], 0
    for tr in body.find_all("tr"):
        cells = tr.find_all("td")
        if not cells or len(cells) <= mapping["title"]:
            continue
        title_cell = cells[mapping["title"]]
        key, url = _link_of(title_cell)
        title = _clean(title_cell.get_text(" "))
        if not title or not key:
            continue
        if not url:
            no_url += 1
            continue

        def cell_text(name):
            i = mapping.get(name)
            return _clean(cells[i].get_text(" ")) if i is not None and i < len(cells) else ""

        items.append({
            "key": str(key),
            "url": url,
            "title": title,
            "organization": cell_text("organization") or None,
            "posted": parse_date(cell_text("posted")),
            "deadline": parse_date(cell_text("deadline")),
        })
    if no_url:
        print(f"[1] ⚠️ 상세 주소를 못 만든 행 {no_url}건 — 목록 <a> 형식이 바뀐 듯하다. "
              f"--probe 로 확인하세요(출처 링크 없는 공고는 넣지 않는다).")
    return items


def collect_rows():
    today = today_str()
    cutoff = (date.today() - timedelta(days=RECENT_DAYS)).strftime("%Y-%m-%d")
    rows, seen, first_key = [], set(), None
    art_total = expired = 0

    for page in range(1, MAX_PAGES + 1):
        params = dict(LIST_PARAMS, **{PAGE_PARAM: str(page)})
        html = _fetch(LIST_URL, params=params, sleep=PAGE_SLEEP if page > 1 else 0)
        items = parse_list(html)
        if not items:
            print(f"[1] {page}페이지: 쓸 수 있는 행 없음 → 종료 (1페이지였다면 --probe 로 구조 확인)")
            break

        # 페이지 파라미터가 안 먹으면 같은 첫 글이 계속 나온다 → 중복을 쌓지 말고 멈춘다.
        if page == 1:
            first_key = items[0]["key"]
        elif items[0]["key"] == first_key:
            print(f"[1] ⚠️ {page}페이지 첫 글이 1페이지와 같다 → PAGE_PARAM='{PAGE_PARAM}' 이 안 먹는 것 같다. "
                  f"--probe 로 진짜 파라미터 이름을 확인하세요. 1페이지분만 쓰고 종료.")
            break

        fresh = [it for it in items if it["key"] not in seen]
        seen.update(it["key"] for it in fresh)
        recent = [it for it in fresh if not it["posted"] or it["posted"] >= cutoff]
        art = [it for it in recent if _is_art(it["title"], it["organization"])]
        art_total += len(art)
        open_items = []
        for it in art:
            if it["deadline"] and it["deadline"] < today:
                expired += 1
                continue
            open_items.append(it)

        print(f"[1] {page}페이지: 글 {len(fresh)}건 · 최근 {len(recent)}건 · 예술 {len(art)}건 · 모집중 {len(open_items)}건")
        for it in open_items:
            _DETAIL_BY_KEY[it["key"]] = it["url"]
            if it["deadline"]:
                _DEADLINE_KNOWN.add(it["key"])
            raw_emp = _employment_raw(it["title"])
            rows.append({
                "title": it["title"],
                "organization": it["organization"],
                "region": _region_of(it["organization"], it["title"]),
                "category_raw": "공직 채용",
                "employment_raw": raw_emp,
                **_classify(it["title"], it["organization"]),
                "apply_start": it["posted"],
                "apply_end": it["deadline"],
                "source_key": it["key"],
                "source_url": it["url"],
            })
            print(f"[1]   {it['posted']}~{it['deadline']} · {it['organization']} · {it['title'][:60]}")

        if len(recent) < len(fresh):
            print(f"[1] {RECENT_DAYS}일 이전 글이 나타남 → 순회 종료")
            break
    print(f"[1] 예술 분야 {art_total}건 중 마감 {expired}건 제외 → 모집중 {len(rows)}건")
    return rows


def fetch_detail(key):
    """상세 전용 필드(본문·연락처·첨부). 목록에서 이미 받은 마감일은 건드리지 않는다."""
    url = _DETAIL_BY_KEY.get(key) or _detail_url_of(key)
    if not url:
        return {}
    html = _fetch(url)
    soup = BeautifulSoup(html, "html.parser")
    for t in soup.find_all(["script", "style", "header", "footer", "nav"]):
        t.decompose()
    text = _clean(soup.get_text(" "))
    fields = {}
    if text:
        fields["description"] = text[:4000]
    # 목록 마감일이 비어 있을 때만 본문에서 접수 기간을 읽는다(라벨이 있을 때만 — 엉뚱한 날짜 방지).
    if key not in _DEADLINE_KNOWN:
        start, end = parse_period_text(text, labeled_only=True)
        if end:
            fields["apply_end"] = end
            if start:
                fields["apply_start"] = start
    em = EMAIL_RE.search(text)
    if em:
        fields["apply_email"] = em.group(0)
    ph = PHONE_RE.search(text)
    if ph:
        fields["apply_contact"] = ph.group(0)
    return fields


def probe():
    """실제 HTML 을 눈으로 확인하는 단계 — 표 머리글·첫 행·링크·페이지 파라미터 후보를 찍는다."""
    html = _fetch(LIST_URL, params=LIST_PARAMS)
    soup = BeautifulSoup(html, "html.parser")
    print(f"[probe] {LIST_URL} {LIST_PARAMS} · {len(html):,}바이트 · 표 {len(soup.find_all('table'))}개")
    for n, table in enumerate(soup.find_all("table"), 1):
        mapping, labels = _header_map(table)
        print(f"[probe] 표{n} 머리글: {labels}")
        print(f"[probe] 표{n} 칸 대응: {mapping}")
        if not mapping:
            continue
        body = table.find("tbody") or table
        for tr in body.find_all("tr")[:3]:
            cells = tr.find_all("td")
            if not cells:
                continue
            print(f"[probe]   행: {[_clean(c.get_text(' '))[:40] for c in cells]}")
            cell = cells[mapping["title"]] if len(cells) > mapping["title"] else None
            a = cell.find("a") if cell else None
            if a:
                key, url = _link_of(cell)
                print(f"[probe]     href={a.get('href')!r} onclick={a.get('onclick')!r}")
                print(f"[probe]     → key={key!r} url={url!r}")
    # 페이지 파라미터 후보: 폼의 hidden 입력과 페이지 링크의 질의문자열 이름들
    names = {i.get("name") for i in soup.find_all("input") if i.get("name")}
    print(f"[probe] 폼 입력 이름: {sorted(n for n in names if n)}")
    for f in soup.find_all("form"):
        print(f"[probe] form name={f.get('name')!r} method={f.get('method')!r} action={f.get('action')!r}")
    srcs = [sc.get("src") for sc in soup.find_all("script", src=True)]
    print(f"[probe] 외부 스크립트: {srcs}")

    # 1) 페이지 넘김이 GET 파라미터로 되는지 — 2페이지 첫 글이 1페이지와 다르면 된 것이다.
    items = parse_list(html) or _rows_of(soup)
    first1 = items[0] if items else None
    html2 = _fetch(LIST_URL, params=dict(LIST_PARAMS, **{PAGE_PARAM: "2"}), sleep=PAGE_SLEEP)
    items2 = _rows_of(BeautifulSoup(html2, "html.parser"))
    first2 = items2[0] if items2 else None
    if first1 and first2:
        same = first1["key"] == first2["key"]
        print(f"[probe] 페이지 넘김({PAGE_PARAM}=2): {'❌ 1페이지와 같음 — GET 으로는 안 넘어간다' if same else '✅ 다른 글이 나온다'}")
        print(f"[probe]   1p: {first1['key']} {first1['title'][:44]}")
        print(f"[probe]   2p: {first2['key']} {first2['title'][:44]}")
    else:
        print("[probe] 페이지 넘김 확인 실패 — 목록을 못 읽었다")

    # 2) 상세 주소가 아직 맞는지 — 실제로 열어 목록의 제목이 들어 있는지 본다.
    if first1 and first1.get("key"):
        url = _detail_url_of(first1["key"])
        try:
            body = _fetch(url, sleep=PAGE_SLEEP)
            hit = first1["title"][:18] in body
            print(f"[probe] 상세 주소 {'✅ 맞다' if hit else '❌ 제목이 없다 — 조립법이 바뀌었다'}: {url}")
            print(f"[probe]   {len(body):,}바이트 · 제목 '{first1['title'][:30]}'")
        except Exception as e:
            print(f"[probe] 상세 주소 확인 실패 {type(e).__name__}: {e}")


if __name__ == "__main__":
    if "--probe" in sys.argv:
        probe()
        raise SystemExit(0)
    if "--dry-run" in sys.argv:
        if not PARSER_READY:
            print(f"[주의] {SOURCE_CODE} PARSER_READY=False — 확인용 실행이므로 계속한다(DB 적재는 막혀 있다).")
        probe()
        rows = collect_rows()
        print(f"\n[dry-run] {len(rows)}건 (DB 적재 안 함)")
        if rows:
            time.sleep(PAGE_SLEEP)
            print("[dry-run] 상세 1건 표본:", json.dumps(fetch_detail(rows[0]["source_key"]), ensure_ascii=False)[:600])
        for r in rows:
            print(json.dumps(r, ensure_ascii=False))
        raise SystemExit(0)
    if not PARSER_READY:
        raise SystemExit(f"[중단] {SOURCE_CODE} 파서 미완성(PARSER_READY=False) — 먼저 --dry-run 으로 확인하세요")
    run_crawler(source_code=SOURCE_CODE, source_name=SOURCE_NAME,
                collect_rows=collect_rows, fetch_detail=fetch_detail)
