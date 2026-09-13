-- 대관 공고의 공간 종류(space_kind) — exhibition(전시) · performance(공연·연습) · multi(복합).
--
-- 왜: 대관을 열고 보니 공연장 대관이 전부 '연극'으로, KCDF갤러리 대관이 '국악'으로 분류돼
-- 음악·무용 탭에는 대관이 한 건도 없었다. 대관은 "예술가의 장르"가 아니라 "공간의 종류"로 나눠야 한다.
-- 공연장은 음악·무용·국악·연극이 다 쓰고, 다목적홀·생활문화센터는 누구나 쓴다.
-- 어느 분야 탭에 보일지는 화면(src/lib/postings.ts matchesField)이 space_kind 로 정한다:
--   exhibition → 미술 탭 · performance → 음악·무용·국악·연극 탭 · multi(또는 null) → 모든 탭
--
-- 코드표: src/types/job.ts SPACE_KINDS · 크롤러 판정: scripts/crawler/common.py classify_space_kind()
-- 실행: Supabase SQL Editor 에서 이 파일 전체를 Run. 여러 번 실행해도 안전.
-- ⚠️ 크롤러가 space_kind 칸에 쓰기 시작하므로, 새 크롤러 코드를 돌리기 전에 먼저 실행한다.

alter table crawled_postings add column if not exists space_kind text;
alter table org_postings     add column if not exists space_kind text;

alter table org_postings drop constraint if exists org_postings_space_kind_check;
alter table org_postings add constraint org_postings_space_kind_check
  check (space_kind is null or space_kind in ('exhibition', 'performance', 'multi'));

-- 이미 들어온 대관 공고를 제목으로 되분류한다.
-- 정규식의 낱말은 scripts/crawler/common.py 의 _EXHIBITION_WORDS · _PERFORMANCE_WORDS 와 같아야 한다.
update crawled_postings
   set space_kind = case
         when title ~ '(전시|갤러리|미술관|화랑|공예관)' and title ~ '(공연|극장|아트홀|콘서트홀|연습)' then 'multi'
         when title ~ '(전시|갤러리|미술관|화랑|공예관)' then 'exhibition'
         when title ~ '(공연|극장|아트홀|콘서트홀|연습)' then 'performance'
         else 'multi' end
 where board = 'rental';

-- 대관은 분야·장르·직무·고용형태를 쓰지 않는다. 전시 공간만 미술로 남긴다(카드 색·검색 유입용).
update crawled_postings
   set field = case when space_kind = 'exhibition' then 'art' else null end,
       genre = null, role = null, employment_type = null
 where board = 'rental';

-- 기관이 직접 올린 대관 공고가 있다면 복합 공간으로 두고, 기관이 수정 화면에서 고르게 한다.
update org_postings set space_kind = 'multi' where board = 'rental' and space_kind is null;
