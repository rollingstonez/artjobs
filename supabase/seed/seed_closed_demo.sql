-- 현황판 "마감 N건" 시작용 시드 — 마감된(지난) 공고 2건을 실 DB 에 넣는다.
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 [Run] 한 번이면 된다.
-- 여러 번 실행해도 중복되지 않는다(on conflict do nothing).
--
-- 원리: status='open'(공개 읽기 허용) + apply_end 를 과거 날짜로 둔다.
--   → isLivingPosting 이 "마감"으로 판정 → countArchived 가 세고, 목록 "지난 공고"에 뜬다.
-- 실제 크롤링으로 마감 공고가 쌓이면 이 2건 위에 실제 숫자가 더해진다.
-- 나중에 지우려면 맨 아래 정리(cleanup) 두 줄의 주석을 풀어 실행한다.

-- 1) 시드 전용 출처 하나를 보장한다(외래키 때문에 먼저 있어야 한다).
insert into crawl_sources (code, name, base_url, list_path, robots_status, is_active, note)
values ('seed_demo', '아트잡스 시드', 'https://artjobs.kr', null, 'agreed', false,
        '현황판 마감 카운트 시작용 시드(실제 수집 출처 아님)')
on conflict (code) do nothing;

-- 2) 마감된 공고 2건.
insert into crawled_postings
  (source_code, source_name, source_key, source_url, title, organization,
   board, field, genre, role, employment_type, employment_raw, region,
   apply_start, apply_end, status, created_at)
values
  ('seed_demo', '아트잡스 시드', 'seed-closed-001', 'https://artjobs.kr',
   '2026 상반기 학예연구사(회화 담당) 채용', '가상도립미술관',
   'job', 'art', 'art_painting', 'planning', 'contract', '계약직', '부산',
   current_date - 40, current_date - 12, 'open', now() - interval '40 days'),
  ('seed_demo', '아트잡스 시드', 'seed-closed-002', 'https://artjobs.kr',
   '2026 신진작가 미디어아트 공모전', '가상문화재단',
   'audition', 'art', 'art_media', 'performer', 'open_call', '공모', '서울',
   current_date - 50, current_date - 20, 'open', now() - interval '50 days')
on conflict (source_code, source_key) do nothing;

-- 확인용: 마감 2건이 들어갔는지.
select title, organization, apply_end, status from crawled_postings where source_code = 'seed_demo';

-- ── 정리(나중에 시드를 지울 때만 아래 두 줄의 주석을 풀어 실행) ──
-- delete from crawled_postings where source_code = 'seed_demo';
-- delete from crawl_sources    where code = 'seed_demo';
