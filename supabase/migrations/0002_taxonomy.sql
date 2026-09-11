-- 아트잡스 분류 체계 확장 — 미술 한 분야(category)에서 5개 분야(field·genre·role)와
-- 게시판 종류(board)로. 코드표는 src/types/job.ts, 설계 배경은 docs/SITEMAP.md.
-- 0001 을 아직 적용하지 않았다면 0001 → 0002 순서로 이어서 실행한다.

alter table crawled_postings
  add column if not exists board  text not null default 'job',  -- job | audition | event
  add column if not exists family text not null default 'fine', -- fine(아트잡스) | modern(모던아트잡스)
  add column if not exists field  text,                         -- art | music | dance | gugak | theater
  add column if not exists genre  text,                         -- 예: music_strings (앞에 field 코드)
  add column if not exists role   text;                         -- performer | creator | education | planning | stage_tech | assistant

-- 기존 category(미술 전용 코드) → 새 축으로 옮긴다. 이미 값이 있으면 건드리지 않는다.
update crawled_postings set field = 'art'
  where field is null and category is not null;

update crawled_postings set genre = case category
    when 'painting'               then 'art_painting'
    when 'sculpture_installation' then 'art_sculpture'
    when 'media_art'              then 'art_media'
    when 'print_drawing'          then 'art_print'
    when 'craft'                  then 'art_craft'
    when 'photography'            then 'art_photo'
    else genre end
  where genre is null;

update crawled_postings set role = case category
    when 'curation'       then 'planning'
    when 'art_management' then 'planning'
    when 'art_education'  then 'education'
    else role end
  where role is null;

update crawled_postings set board = 'audition'
  where category = 'residency_open_call' or employment_type = 'open_call';

-- category 컬럼은 크롤러가 더 이상 쓰지 않는다. 한 사이클 지켜본 뒤 아래 줄로 지운다.
-- alter table crawled_postings drop column category;

create index if not exists idx_cp_board on crawled_postings(board);
create index if not exists idx_cp_field on crawled_postings(field);
create index if not exists idx_cp_genre on crawled_postings(genre);
create index if not exists idx_cp_role  on crawled_postings(role);
