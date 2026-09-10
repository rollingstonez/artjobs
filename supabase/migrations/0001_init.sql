-- 아트잡스 초기 스키마 — 바로쌤 crawl_sources / crawled_postings 구조 이식(예술 분야용).
-- ⚠️ 아직 적용 전. Supabase 프로젝트가 준비되면 SQL Editor 또는 CLI 로 실행한다.

-- 수집 소스 대장 — 허가 상태와 가동 스위치. 크롤러는 is_active=false 면 스스로 중단한다.
create table if not exists crawl_sources (
  code           text primary key,              -- 예: arko, sema
  name           text not null,                 -- 예: 한국문화예술위원회
  base_url       text not null,
  list_path      text,                          -- 실제 수집 목록 경로 (robots 판정 기준)
  robots_status  text not null default 'unchecked', -- clean | gray | blocked | agreed | unchecked
  is_active      boolean not null default false,
  note           text,
  created_at     timestamptz not null default now()
);

-- 수집 공고 — 원문 불변(…_raw) + 표준 코드(category, employment_type) 분리.
create table if not exists crawled_postings (
  id               uuid primary key default gen_random_uuid(),
  source_code      text not null references crawl_sources(code),
  source_name      text not null,
  source_key       text not null,               -- 사이트 공고번호
  source_url       text not null,               -- 원문 링크(출처 표기 의무)
  title            text not null,
  organization     text,
  category         text,                        -- src/types/job.ts CATEGORIES.code
  category_raw     text,
  employment_type  text,                        -- src/types/job.ts EMPLOYMENT_TYPES.code
  employment_raw   text,
  region           text,                        -- 시·도
  address          text,
  salary           text,
  recruit_count    text,
  apply_start      date,
  apply_end        date,
  work_start       date,
  work_end         date,
  apply_method     text,
  apply_email      text,
  apply_contact    text,
  required_docs    text,
  description      text,
  status           text not null default 'open', -- open | closed
  last_seen_at     timestamptz,
  created_at       timestamptz not null default now(),
  unique (source_code, source_key)
);

create index if not exists idx_cp_category   on crawled_postings(category);
create index if not exists idx_cp_region     on crawled_postings(region);
create index if not exists idx_cp_apply_end  on crawled_postings(apply_end);
create index if not exists idx_cp_created    on crawled_postings(created_at desc);

-- 공개 읽기: 화면은 anon 키로 모집중 공고만 읽는다. 쓰기는 service_role(크롤러)만.
alter table crawl_sources    enable row level security;
alter table crawled_postings enable row level security;

create policy "public read open postings" on crawled_postings
  for select using (status = 'open');
