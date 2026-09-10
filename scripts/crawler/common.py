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
    표준 코드(category·employment_type)는 별도 칸에 넣는다.

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
CATEGORY_CODES = {
    "painting", "sculpture_installation", "media_art", "print_drawing", "craft",
    "photography", "curation", "art_management", "art_education", "residency_open_call",
}
EMPLOYMENT_CODES = {"full_time", "contract", "freelance", "intern", "open_call"}

# 키워드 → 표준 분야. 반드시 "긴 키워드 먼저" — 먼저 걸린 쪽이 이긴다.
_CATEGORY_KEYWORDS = [
    ("미디어아트", "media_art"), ("뉴미디어", "media_art"), ("영상설치", "media_art"),
    ("레지던시", "residency_open_call"), ("입주작가", "residency_open_call"), ("공모", "residency_open_call"),
    ("학예", "curation"), ("큐레이터", "curation"), ("전시기획", "curation"), ("전시 기획", "curation"),
    ("예술교육", "art_education"), ("교육강사", "art_education"), ("에듀케이터", "art_education"),
    ("아트매니지", "art_management"), ("갤러리", "art_management"), ("아트페어", "art_management"),
    ("판화", "print_drawing"), ("드로잉", "print_drawing"),
    ("조각", "sculpture_installation"), ("설치", "sculpture_installation"),
    ("공예", "craft"), ("도자", "craft"), ("금속공예", "craft"), ("섬유", "craft"),
    ("사진", "photography"),
    ("회화", "painting"), ("서양화", "painting"), ("한국화", "painting"), ("동양화", "painting"),
]
_EMPLOYMENT_KEYWORDS = [
    ("정규직", "full_time"),
    ("인턴", "intern"),
    ("프리랜서", "freelance"), ("프로젝트 단위", "freelance"),
    ("공모", "open_call"), ("지원사업", "open_call"),
    ("계약직", "contract"), ("기간제", "contract"), ("위촉", "contract"), ("임기제", "contract"),
]


def classify_category(*texts):
    """제목·분야 원문 → 표준 분야 코드. 근거 없으면 None(억지로 붙이지 않는다)."""
    text = " ".join(t for t in texts if t)
    for kw, code in _CATEGORY_KEYWORDS:
        if kw in text:
            return code
    return None


def classify_employment(*texts):
    text = " ".join(t for t in texts if t)
    for kw, code in _EMPLOYMENT_KEYWORDS:
        if kw in text:
            return code
    return None


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
            data=json.dumps(rows), timeout=30,
        )
        r.raise_for_status()
        return [row["id"] for row in r.json()]

    def patch(self, path, params, data):
        r = _retry(
            requests.patch, f"{self.url}/rest/v1/{path}",
            headers={**self.headers, "Prefer": "return=minimal"},
            params=params, data=json.dumps(data), timeout=20,
        )
        r.raise_for_status()


# ── 파싱 도구 ──
_DATE_RE = re.compile(r"(\d{4})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})")
PHONE_RE = re.compile(r"0\d{1,2}-\d{3,4}-\d{4}")
EMAIL_RE = re.compile(r"[\w.-]+@[\w.-]+\.\w+")


def parse_date(text):
    m = _DATE_RE.search(text or "")
    if not m:
        return None
    y, mo, d = m.groups()
    return f"{y}-{int(mo):02d}-{int(d):02d}"


def parse_period(text):
    if not text or "~" not in text:
        return None, None
    left, right = text.split("~", 1)
    return parse_date(left), parse_date(right)


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
        sys.exit(f"[중단] crawl_sources에서 {source_code} is_active=false (허가 반영 후 재실행)")
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
        if x.get("category") not in CATEGORY_CODES:
            x["category"] = None
        if x.get("employment_type") not in EMPLOYMENT_CODES:
            x["employment_type"] = None
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
    cats = {}
    for x in all_rows:
        c = x.get("category") or "미분류"
        cats[c] = cats.get(c, 0) + 1
    print(f"\n[4] 요약: 수집 {len(all_rows)}건 | 신규 {len(to_insert)}건 | 갱신 {len(to_update)}건 | 상세 {detail_done}건")
    print(f"    분야: {cats}")
    return inserted_ids
