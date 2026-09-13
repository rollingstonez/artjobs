-- 대관 게시판(board = 'rental') — 갤러리 전시실·연습실·공연장을 기간을 정해 신청받고
-- 심사해서 내주는 대관 공모·대관 지원사업. 마감일이 있고 기관이 올리고 예술인이 신청한다는 점에서
-- 채용공고·오디션과 구조가 같아 새 테이블을 만들지 않고 board 값 하나만 더한다.
-- 상시 유료 대여(요금표·빈 날짜)는 공고가 아니라 재고 정보라 여기에 넣지 않는다.
--
-- 코드표: src/types/job.ts BOARDS · 크롤러 분류기: scripts/crawler/common.py
-- 실행: Supabase SQL Editor 에서 이 파일 전체를 Run. 여러 번 실행해도 안전.

-- ───────────────────────── 1. 기관 직접 공고 ─────────────────────────
-- 0004 에서 board 를 ('job','audition','event') 로 묶어 둬서 'rental' 을 넣으면 거부된다. 제약을 갈아끼운다.
alter table org_postings drop constraint if exists org_postings_board_check;
alter table org_postings
  add constraint org_postings_board_check
  check (board in ('job', 'audition', 'rental', 'event'));

-- crawled_postings.board 는 0002 에서 제약 없이 text 로 두었다 → 손댈 것이 없다.

-- ───────────────────────── 2. 새 공고 알림 ─────────────────────────
-- 새로 만드는 알림 조건은 대관도 기본으로 포함한다(이미 있는 조건은 사용자가 고른 값이므로 건드리지 않는다).
alter table alert_conditions alter column boards set default '{job,audition,rental}';

-- 기존 사용자에게도 대관 알림을 켜 주려면 아래 한 줄을 직접 실행한다.
-- "그때는 대관 게시판이 없어서 두 개만 고른 것" 이라고 볼 때만 쓴다(사용자가 고른 값을 덮어쓴다).
-- update alert_conditions set boards = '{job,audition,rental}' where boards = '{job,audition}';

-- ───────────────────────── 3. 이미 모은 공고 되분류 ─────────────────────────
-- 지금까지 대관 공고는 크롤러 단계에서 버려지거나(아트누리·모모365) 오디션·공모로 섞여 들어왔다.
-- 이미 DB 에 들어와 있는 것들을 대관 게시판으로 옮긴다.
-- 판정 기준은 scripts/crawler/common.py 의 is_rental() 과 같아야 한다 — 한쪽을 고치면 다른 쪽도 고친다.
with rental_match as (
  select id
    from crawled_postings
   where (
           title like '%대관%'
        or title like '%전시공간 지원%' or title like '%전시장 지원%' or title like '%전시실 지원%'
        or title like '%연습실 지원%'   or title like '%연습공간 지원%'
        or title like '%공간 대여%'
         )
     -- 대관 담당 직원 채용, 요금 인상·휴관 안내, 레지던시는 대관이 아니다.
     and title not like '%채용%'      and title not like '%담당자%'   and title not like '%직원%'
     and title not like '%기간제%'    and title not like '%임기제%'   and title not like '%위촉%'
     and title not like '%인턴%'      and title not like '%아르바이트%'
     and title not like '%대관료 인상%' and title not like '%대관료 조정%'
     and title not like '%이용료 인상%' and title not like '%요금 인상%'
     and title not like '%휴관%'      and title not like '%운영 중단%' and title not like '%중단 안내%'
     and title not like '%레지던시%'  and title not like '%입주작가%'
)
update crawled_postings p
   set board = 'rental',
       -- 대관은 고용이 아니다. 공모로 들어오며 붙었던 고용형태를 비운다.
       employment_type = null
  from rental_match m
 where p.id = m.id
   and p.board <> 'rental';

create index if not exists idx_cp_board_status on crawled_postings(board, status);
