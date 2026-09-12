# -*- coding: utf-8 -*-
"""
아트잡스 크롤러 공용 모듈 — 바로쌤 크롤러(crawl_seoul.py 등)에서 지역마다 반복되던
뼈대를 한 곳으로 모았다. 개별 소스 크롤러는 "목록 파싱 + 상세 파싱"만 쓰고
나머지(환경 로드·가동 스위치·적재·요약)는 여기의 run_crawler()에 맡긴다.

공통 원칙(바로쌤 계승):
  - 허용된 소스만. crawl_sources 테이블의 is_active 스위치가 꺼져 있으면 스스로 중단한다.
  - 모집중 공고만. 마감 지난 공고는 적재하지 않는다(집계만).
  - 페이지 사이 예의 간격(PAGE_SLEEP). UA에 신분(서비스명·연락처)을 밝힌다.
  - 같은 공고 재발견: 삭제 없이 갱신 + last_seen_at. 신규만 INSERT.
  - 상세 전용 필드는 목록 행에 넣지 않는다(매일 갱신이 상세분을 null로 덮지 않게).
  - 원문 불변: 사이트 원문(category_raw·employment_raw)은 그대로 보존하고
    표준 코드(field·genre·role·board·employment_type)는 별도 칸에 넣는다.

.env.local (저장소 최상위) 필요 키:
  NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
"""
import json
import os
import re
import sys
import time
from datetime import datetime, timezone

import requests

from http_retry import _retry

CONTACT_EMAIL = "support@artjobs.kr"  # 실제 운영 주소로 교체할 것
USER_AGENT = (
    "ArtjobsBot/0.1 (+https://artjobs.kr; "
    f"job-posting aggregator for fine-art professionals; contact: {CONTACT_EMAIL})"
)
PAGE_SLEEP = 2  # 페이지 사이 예의 간격(초). 소스별 협의가 있으면 그쪽을 따른다 — 줄이지 말 것.

# ── 표준 코드표 (src/types/job.ts 와 반드시 같아야 한다) ──
# 분류 네 축: field(분야) · genre(장르, 앞에 분야 코드) · role(직무, 공통) · board(게시판)
FIELD_CODES = {"art", "music", "dance", "gugak", "theater"}
GENRE_CODES = {
    "art_painting", "art_sculpture", "art_print", "art_photo", "art_media", "art_craft", "art_calligraphy",
    "music_voice", "music_piano", "music_strings", "music_winds", "music_percussion", "music_composition",
    "dance_ballet", "dance_contemporary", "dance_korean",
    "gugak_voice", "gugak_strings", "gugak_winds", "gugak_percussion", "gugak_composition", "gugak_yeonhui",
    "theater_play", "theater_musical", "theater_opera", "theater_children", "theater_changgeuk",
}
ROLE_CODES = {"performer", "creator", "education", "planning", "stage_tech", "assistant"}
BOARD_CODES = {"job", "audition", "event"}
EMPLOYMENT_CODES = {"full_time", "contract", "freelance", "intern", "open_call"}

# 키워드 → 장르. 반드시 "긴 키워드 먼저" — 먼저 걸린 쪽이 이긴다. 장르가 잡히면 분야는 자동.
_GENRE_KEYWORDS = [
    # 국악 (음악보다 먼저 — "가야금 현악"처럼 겹칠 때 국악이 이겨야 한다)
    ("판소리", "gugak_voice"), ("민요", "gugak_voice"), ("정가", "gugak_voice"), ("가야금병창", "gugak_voice"), ("소리꾼", "gugak_voice"),
    ("가야금", "gugak_strings"), ("거문고", "gugak_strings"), ("해금", "gugak_strings"), ("아쟁", "gugak_strings"),
    ("대금", "gugak_winds"), ("피리", "gugak_winds"), ("소금", "gugak_winds"), ("태평소", "gugak_winds"), ("단소", "gugak_winds"),
    ("사물놀이", "gugak_percussion"), ("장구", "gugak_percussion"), ("장고", "gugak_percussion"), ("모듬북", "gugak_percussion"),
    ("풍물", "gugak_yeonhui"), ("탈춤", "gugak_yeonhui"), ("연희", "gugak_yeonhui"), ("줄타기", "gugak_yeonhui"),
    ("국악작곡", "gugak_composition"), ("국악 작곡", "gugak_composition"),
    ("창극", "theater_changgeuk"),
    ("한국무용", "dance_korean"), ("전통무용", "dance_korean"), ("한국 무용", "dance_korean"),
    # 무용
    ("발레", "dance_ballet"),
    ("현대무용", "dance_contemporary"), ("컨템포러리", "dance_contemporary"),
    # 연극
    ("뮤지컬", "theater_musical"),
    ("오페라", "theater_opera"),
    ("아동극", "theater_children"), ("인형극", "theater_children"), ("어린이극", "theater_children"),
    ("연극", "theater_play"), ("극단", "theater_play"), ("희곡", "theater_play"),
    # 음악
    ("성악", "music_voice"), ("소프라노", "music_voice"), ("테너", "music_voice"), ("바리톤", "music_voice"), ("합창", "music_voice"),
    ("피아노", "music_piano"), ("오르간", "music_piano"), ("반주", "music_piano"),
    ("바이올린", "music_strings"), ("비올라", "music_strings"), ("첼로", "music_strings"), ("콘트라베이스", "music_strings"), ("현악", "music_strings"), ("하프", "music_strings"),
    ("플루트", "music_winds"), ("오보에", "music_winds"), ("클라리넷", "music_winds"), ("바순", "music_winds"),
    ("호른", "music_winds"), ("트럼펫", "music_winds"), ("트롬본", "music_winds"), ("튜바", "music_winds"), ("관악", "music_winds"),
    ("팀파니", "music_percussion"), ("타악", "music_percussion"), ("퍼커션", "music_percussion"),
    ("작곡", "music_composition"), ("지휘", "music_composition"),
    # 미술
    ("미디어아트", "art_media"), ("뉴미디어", "art_media"), ("영상설치", "art_media"),
    ("판화", "art_print"), ("드로잉", "art_print"),
    ("조각", "art_sculpture"), ("조소", "art_sculpture"), ("설치", "art_sculpture"),
    ("공예", "art_craft"), ("도자", "art_craft"), ("금속공예", "art_craft"), ("섬유", "art_craft"),
    ("서예", "art_calligraphy"), ("전각", "art_calligraphy"), ("캘리그라피", "art_calligraphy"),
    ("사진", "art_photo"),
    ("회화", "art_painting"), ("서양화", "art_painting"), ("한국화", "art_painting"), ("동양화", "art_painting"),
]

# 장르는 못 잡아도 분야만이라도 잡는 키워드.
_FIELD_KEYWORDS = [
    ("국악", "gugak"), ("전통예술", "gugak"),
    ("무용", "dance"), ("댄서", "dance"),
    ("교향악", "music"), ("오케스트라", "music"), ("음악", "music"), ("연주", "music"), ("콘서트", "music"),
    ("미술", "art"), ("갤러리", "art"), ("뮤지엄", "art"), ("뮤지움", "art"), ("전시", "art"), ("시각예술", "art"), ("작가", "art"),
    ("공연", "theater"), ("배우", "theater"), ("연기", "theater"),
]

# 키워드 → 직무. 무대·기술과 기획·행정은 분야를 가리지 않는다.
_ROLE_KEYWORDS = [
    ("행정스태프", "planning"), ("행정 스태프", "planning"), ("사무보조", "assistant"),
    ("무대감독", "stage_tech"), ("무대미술", "stage_tech"), ("무대디자인", "stage_tech"), ("조명", "stage_tech"), ("음향", "stage_tech"),
    ("의상", "stage_tech"), ("분장", "stage_tech"), ("소품", "stage_tech"), ("테크니션", "stage_tech"), ("전시설치", "stage_tech"), ("스태프", "stage_tech"), ("스탭", "stage_tech"),
    ("어시스턴트", "assistant"), ("인턴", "assistant"), ("보조", "assistant"), ("아르바이트", "assistant"),
    ("학예", "planning"), ("큐레이터", "planning"), ("전시기획", "planning"), ("공연기획", "planning"), ("기획", "planning"),
    ("홍보", "planning"), ("마케팅", "planning"), ("행정", "planning"), ("사무", "planning"), ("매니저", "planning"),
    ("강사", "education"), ("레슨", "education"), ("교사", "education"), ("교육", "education"), ("에듀케이터", "education"),
    ("안무", "creator"), ("연출", "creator"), ("극작", "creator"), ("작곡", "creator"),
    ("단원", "performer"), ("오디션", "performer"), ("입주작가", "performer"), ("배우", "performer"), ("연주자", "performer"), ("무용수", "performer"),
]

# 키워드 → 게시판. 안 걸리면 채용공고(job).
_BOARD_KEYWORDS = [
    ("오디션", "audition"), ("단원 모집", "audition"), ("단원모집", "audition"), ("단원 공개모집", "audition"),
    ("콩쿠르", "audition"), ("콩쿨", "audition"), ("공모", "audition"), ("레지던시", "audition"), ("입주작가", "audition"), ("지원사업", "audition"),
]
_EMPLOYMENT_KEYWORDS = [
    ("정규직", "full_time"), ("상임단원", "full_time"),
    ("인턴", "intern"),
    ("프리랜서", "freelance"), ("프로젝트 단위", "freelance"), ("객원", "freelance"), ("출연 계약", "freelance"),
    ("공모", "open_call"), ("지원사업", "open_call"),
    ("계약직", "contract"), ("기간제", "contract"), ("위촉", "contract"), ("임기제", "contract"), ("시간강사", "contract"),
]


def _first_match(keywords, *texts):
    text = " ".join(t for t in texts if t)
    for kw, code in keywords:
        if kw in text:
            return code
    return None


def classify_genre(*texts):
    """제목·분야 원문 → 장르 코드. 근거 없으면 None(억지로 붙이지 않는다)."""
    return _first_match(_GENRE_KEYWORDS, *texts)


def classify_field(*texts, genre=None):
    """장르가 있으면 그 앞부분(분야)을, 없으면 분야 키워드로. 그래도 없으면 None."""
    if genre and genre in GENRE_CODES:
        return genre.split("_", 1)[0]
    return _first_match(_FIELD_KEYWORDS, *texts)


def classify_role(*texts):
    return _first_match(_ROLE_KEYWORDS, *texts)


def classify_board(*texts):
    return _first_match(_BOARD_KEYWORDS, *texts) or "job"


def classify_employment(*texts):
    return _first_match(_EMPLOYMENT_KEYWORDS, *texts)


def classify_all(*texts):
    """한 번에 field·genre·role·board·employment_type 을 dict 로. 개별 크롤러에서 row.update(...) 로 쓴다."""
    genre = classify_genre(*texts)
    return {
        "genre": genre,
        "field": classify_field(*texts, genre=genre),
        "role": classify_role(*texts),
        "board": classify_board(*texts),
        "employment_type": classify_employment(*texts),
    }


# ── .env.local ──
def load_env(path=".env.local"):
    env = {}
    if not os.path.exists(path):
        sys.exit(f"[중단] {path} 없음 — 저장소 최상위(artjobs)에서 실행하세요")
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


# 본문 HTML 등에서 딸려 오는 제어문자(널 문자 \x00 등)는 Postgres text 에 저장할 수 없어
# INSERT/PATCH 를 400 으로 만든다(배치 전체가 실패). 탭·개행만 남기고 걷어낸다.
_CTRL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def _scrub(v):
    if isinstance(v, str):
        return _CTRL_RE.sub("", v)
    if isinstance(v, dict):
        return {k: _scrub(x) for k, x in v.items()}
    if isinstance(v, list):
        return [_scrub(x) for x in v]
    return v


def _raise_for_status(r):
    """4xx·5xx 면 응답 본문(PostgREST 오류 상세)까지 담아 예외를 올린다 — 왜 거부됐는지 로그에 남게."""
    if not r.ok:
        body = (r.text or "")[:1000]
        raise requests.HTTPError(f"{r.status_code} {r.reason} for {r.url}\n  본문: {body}", response=r)


# ── Supabase REST(PostgREST) ──
class Supabase:
    def __init__(self, env):
        self.url = next((v for k, v in env.items() if "SUPABASE_URL" in k), None)
        key = next((v for k, v in env.items() if "SERVICE_ROLE" in k), None)
        if not self.url or not key:
            sys.exit("[중단] .env.local에서 SUPABASE_URL/SERVICE_ROLE 키를 못 찾음")
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def get(self, path, params=None):
        r = _retry(requests.get, f"{self.url}/rest/v1/{path}", headers=self.headers, params=params, timeout=20)
        r.raise_for_status()
        return r.json()

    def get_all(self, path, params):
        """PostgREST 기본 상한(1000행)을 넘겨 전부 가져온다."""
        out, page = [], 0
        while True:
            chunk = self.get(path, {**params, "limit": "1000", "offset": str(page * 1000)})
            out.extend(chunk)
            if len(chunk) < 1000:
                break
            page += 1
        return out

    def insert_returning_ids(self, path, rows, on_conflict):
        r = _retry(
            requests.post, f"{self.url}/rest/v1/{path}",
            headers={**self.headers, "Prefer": "return=representation,resolution=ignore-duplicates"},
            params={"select": "id", "on_conflict": on_conflict},
            data=json.dumps(_scrub(rows)), timeout=30,
        )
        _raise_for_status(r)
        return [row["id"] for row in r.json()]

    def patch(self, path, params, data):
        r = _retry(
            requests.patch, f"{self.url}/rest/v1/{path}",
            headers={**self.headers, "Prefer": "return=minimal"},
            params=params, data=json.dumps(_scrub(data)), timeout=20,
        )
        _raise_for_status(r)


# ── 파싱 도구 ──
_DATE_RE = re.compile(r"(\d{4})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})")
PHONE_RE = re.compile(r"0\d{1,2}-\d{3,4}-\d{4}")
EMAIL_RE = re.compile(r"[\w.-]+@[\w.-]+\.\w+")


def parse_date(text):
    m = _DATE_RE.search(text or "")
    if not m:
        return None
    y, mo, d = (int(g) for g in m.groups())
    try:
        # 불가능한 날짜(예: 본문에서 잘못 집힌 2026-19-99)는 date 컬럼 적재 시 Postgres 400 을
        # 유발하므로 지어내지 말고 버린다.
        return datetime(y, mo, d).strftime("%Y-%m-%d")
    except ValueError:
        return None


def parse_period(text):
    if not text or "~" not in text:
        return None, None
    left, right = text.split("~", 1)
    return parse_date(left), parse_date(right)


# ── 본문 텍스트에서 접수 기간 찾기 (sfac 에서 실측한 표기들을 모두 받는다) ──
# "접수기간 : 2026. 8. 1.(월) 09:00 ~ 2026. 8. 14.(금) 18:00", "접수기간: ‘26.08.31.(월) ~ ’26.09.07.(월) 16:00",
# "2026.8.13.(목) 10:00∼2026.8.20.(목) 17:00", "2026-09-09 ~ 2026-09-27", "2026년 09월 08일 ~ 2026년 09월 19일", "26. 8. 11.(화) 9:00 ~ 8. 13.(목)"
_P_DATE = r"(\d{4}\s*[.\-/년]\s*\d{1,2}\s*[.\-/월]\s*\d{1,2})일?"
_P_DATE_OR_MD = r"(\d{4}\s*[.\-/년]\s*\d{1,2}\s*[.\-/월]\s*\d{1,2}|\d{1,2}\s*[.\-/월]\s*\d{1,2})일?"
_P_TAIL = r"\.?\s*(?:\([^)]{1,4}\))?\s*(?:\d{1,2}\s*:\s*\d{2})?\s*(?:부터|까지)?\s*"
_P_RANGE = _P_DATE + _P_TAIL + r"~\s*" + _P_DATE_OR_MD
PERIOD_RE = re.compile(r"접수\s*(?:기간|일정|기한)\s*[:：]?\s*" + _P_RANGE)                       # 1순위: 접수기간
PERIOD_RE2 = re.compile(r"(?:모집|신청|원서\s*접수|접수)\s*(?:기간|일정|기한)?\s*[:：]?\s*" + _P_RANGE)  # 2순위: 모집/신청 기간
PAIR_RE = re.compile(_P_RANGE)                                                                      # 3순위: 첫 '날짜 ~ 날짜'


def normalize_period_text(text):
    """두 자리 연도(‘26.08.31.)→2026.08.31. · 물결표 변형(∼ ～ 〜)→~ · 공백 정리."""
    t = re.sub(r"[‘’'′`]\s*(\d{2})\s*\.\s*(\d{1,2})\s*\.", r"20\1.\2.", text or "")
    # 따옴표 없는 두 자리 연도 "26. 8. 11." (앞에 숫자·점이 없고 20년대일 때만)
    t = re.sub(r"(?<![\d.])(2\d)\s*\.\s*(\d{1,2})\s*\.\s*(\d{1,2})\s*\.", r"20\1.\2.\3.", t)
    t = re.sub(r"[∼～〜]", "~", t)
    return re.sub(r"\s+", " ", t)


def parse_period_text(text, head=3000):
    """본문에서 (접수 시작, 접수 끝). 접수기간 → 모집/신청 기간 → 본문 앞 head 자 안의 첫 '날짜 ~ 날짜'.
    끝 날짜에 연도가 없으면 시작 연도를 쓴다. 못 찾으면 (None, None) — 지어내지 않는다."""
    t = normalize_period_text(text)
    m = PERIOD_RE.search(t) or PERIOD_RE2.search(t) or PAIR_RE.search(t[:head])
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


def today_str():
    return datetime.now().strftime("%Y-%m-%d")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def fetch_html(url, *, params=None, sleep=0, session=None):
    """UA를 밝힌 GET. sleep>0 이면 요청 전에 그만큼 쉰다."""
    if sleep:
        time.sleep(sleep)
    get = session.get if session else requests.get
    r = _retry(get, url, headers={"User-Agent": USER_AGENT}, params=params, timeout=20)
    r.raise_for_status()
    r.encoding = r.apparent_encoding or "utf-8"
    return r.text


# ── 공통 실행 흐름 ──
def run_crawler(*, source_code, source_name, collect_rows, fetch_detail=None,
                detail_empty_field="apply_email", max_detail=50):
    """
    source_code    crawl_sources.code (예: "arko"). 가동 스위치·적재 구분에 쓴다.
    source_name    화면에 보일 출처 이름 (source_name 컬럼).
    collect_rows() → 모집중 공고 dict 목록. 각 dict는 crawled_postings 컬럼명을 그대로 쓰되
                     source_code/source_name/status/last_seen_at 은 여기서 채운다.
                     source_key(사이트 공고번호)·source_url·title 은 필수.
    fetch_detail(source_key) → 상세 전용 필드 dict (없으면 {}). None 이면 상세 단계 생략.
    """
    env = load_env()
    sb = Supabase(env)

    # 0) 가동 스위치 — 허가가 반영되지 않았으면 스스로 멈춘다.
    src = sb.get("crawl_sources", {"code": f"eq.{source_code}", "select": "code,is_active,robots_status"})
    if not src or not src[0]["is_active"]:
        # 꺼져 있으면 조용히 끝낸다(exit 0). 운영자 화면 /admin/sources 에서 켜야 수집한다.
        print(f"[건너뜀] crawl_sources 에서 {source_code} 가 꺼져 있음(is_active=false). 운영자 화면에서 켜면 수집합니다.")
        return []
    print(f"[0] 가동 스위치: {source_code} is_active=true (robots: {src[0]['robots_status']})")

    # 1) 수집
    stamp = now_iso()
    rows = collect_rows()
    seen = set()
    all_rows = []
    for x in rows:
        if x["source_key"] in seen:
            continue
        seen.add(x["source_key"])
        x.update({
            "source_code": source_code,
            "source_name": source_name,
            "status": "open",
            "last_seen_at": stamp,
        })
        # 코드표 밖의 값은 null 로. 억지 분류보다 미분류가 낫다.
        for col, codes in (("field", FIELD_CODES), ("genre", GENRE_CODES), ("role", ROLE_CODES),
                           ("employment_type", EMPLOYMENT_CODES)):
            if x.get(col) not in codes:
                x[col] = None
        if x.get("board") not in BOARD_CODES:
            x["board"] = "job"
        if x.get("genre") and not x.get("field"):
            x["field"] = x["genre"].split("_", 1)[0]
        all_rows.append(x)
    print(f"[1] 수집 완료: {len(all_rows)}건")

    # 2) 기존 공고 조회
    existing = sb.get_all("crawled_postings", {"source_code": f"eq.{source_code}", "select": "id,source_key"})
    existing_map = {r["source_key"]: r["id"] for r in existing if r.get("source_key")}
    print(f"[2] DB 기존 공고: {len(existing_map)}건")

    # 3) 적재 — 신규 묶음 INSERT / 기존 개별 갱신 (삭제 없음)
    to_insert = [x for x in all_rows if x["source_key"] not in existing_map]
    to_update = [x for x in all_rows if x["source_key"] in existing_map]
    inserted_ids = []
    for i in range(0, len(to_insert), 100):
        chunk = to_insert[i:i + 100]
        inserted_ids.extend(sb.insert_returning_ids("crawled_postings", chunk, "source_code,source_key"))
    for x in to_update:
        sb.patch("crawled_postings", {"id": f"eq.{existing_map[x['source_key']]}"}, x)
        time.sleep(0.1)
    print(f"[3] 적재 완료: 신규 {len(to_insert)}건 / 갱신 {len(to_update)}건")

    # 3.5) 상세 — 신규 전량 + 백필 상한
    detail_done = 0
    if fetch_detail:
        targets = []
        if inserted_ids:
            targets += sb.get("crawled_postings", {
                "id": f"in.({','.join(inserted_ids)})", "select": "id,source_key",
            })
        backfill = {
            "source_code": f"eq.{source_code}", detail_empty_field: "is.null",
            "select": "id,source_key", "order": "created_at.desc", "limit": str(max_detail),
        }
        if inserted_ids:
            backfill["id"] = f"not.in.({','.join(inserted_ids)})"
        targets += sb.get("crawled_postings", backfill)
        print(f"[3.5] 상세 대상: {len(targets)}건")
        for i, t in enumerate(targets):
            if i > 0:
                time.sleep(PAGE_SLEEP)
            try:
                fields = fetch_detail(t["source_key"])
                if fields:
                    sb.patch("crawled_postings", {"id": f"eq.{t['id']}"}, fields)
                    detail_done += 1
            except Exception as e:
                print(f"[3.5] 상세 실패 source_key={t['source_key']}: {e}")
        print(f"[3.5] 상세 수집 완료: {detail_done}건")

    # 4) 요약
    fields, boards = {}, {}
    for x in all_rows:
        f = x.get("field") or "미분류"
        fields[f] = fields.get(f, 0) + 1
        b = x.get("board") or "job"
        boards[b] = boards.get(b, 0) + 1
    print(f"\n[4] 요약: 수집 {len(all_rows)}건 | 신규 {len(to_insert)}건 | 갱신 {len(to_update)}건 | 상세 {detail_done}건")
    print(f"    분야: {fields} | 게시판: {boards}")
    return inserted_ids
