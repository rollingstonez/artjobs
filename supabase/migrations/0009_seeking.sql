-- 구직 게시판(seeking_posts): 예술가가 "이런 일을 찾습니다" 하고 직접 올리는 글.
--   인재정보(/talents)는 프로필을 로그인한 기관에게만 보여주지만, 구직 글은 예술가가 스스로 공개하기로 한 글이라
--   로그인 없이도 누구나 목록·상세를 볼 수 있다. 연락은 여전히 아트잡스 메신저로만(연락처 칸 없음).
--   기간이 있는 글이다: expires_at(기본 60일)이 지나면 목록에서 빠지고, 예술가가 "연장"하면 다시 올라온다.
--   이름·경력은 저장 시점에 복사해 둔다(profiles 는 로그인 사용자만 읽을 수 있어, 비로그인 목록에 이름을 보이려면 사본이 필요).

create table if not exists seeking_posts (
  id               uuid primary key default gen_random_uuid(),
  artist_user_id   uuid not null references profiles(id) on delete cascade,
  display_name     text not null,                 -- profiles.display_name 사본
  career_years     integer,                       -- artist_profiles.career_years 사본
  title            text not null check (char_length(title) between 5 and 80),
  field            text,                          -- art | music | dance | gugak | theater
  genres           text[] not null default '{}',
  roles            text[] not null default '{}',
  employment_types text[] not null default '{}',
  region           text,                          -- 활동 가능 시·도
  address_hint     text,
  available_from   date,
  available_until  date,
  body             text not null check (char_length(body) between 20 and 3000),
  status           text not null default 'open' check (status in ('open', 'closed')),
  expires_at       date not null default (current_date + 60),
  view_count       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index if not exists idx_seeking_open on seeking_posts(status, expires_at desc) where deleted_at is null;
create index if not exists idx_seeking_artist on seeking_posts(artist_user_id);
create index if not exists idx_seeking_field on seeking_posts(field);

drop trigger if exists trg_touch_seeking_posts on seeking_posts;
create trigger trg_touch_seeking_posts before update on seeking_posts for each row execute function touch_updated_at();

alter table seeking_posts enable row level security;

-- 누구나(비로그인 포함) 열린 글을 본다.
create policy "seeking public read" on seeking_posts for select
  using (status = 'open' and deleted_at is null and expires_at >= current_date);
-- 본인은 전부(닫힌 글·만료 글 포함).
create policy "seeking own read" on seeking_posts for select to authenticated using (artist_user_id = auth.uid());
create policy "seeking own insert" on seeking_posts for insert to authenticated
  with check (artist_user_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and role = 'artist' and status = 'active'));
create policy "seeking own update" on seeking_posts for update to authenticated
  using (artist_user_id = auth.uid()) with check (artist_user_id = auth.uid());
create policy "seeking own delete" on seeking_posts for delete to authenticated using (artist_user_id = auth.uid());
-- 운영자: 전체 열람·내리기.
create policy "seeking admin read" on seeking_posts for select to authenticated using (is_admin());
create policy "seeking admin update" on seeking_posts for update to authenticated using (is_admin()) with check (is_admin());

-- 한 사람이 열어둘 수 있는 구직 글은 3개까지(도배 방지).
create or replace function limit_seeking_posts() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  select count(*) into v_n from seeking_posts
   where artist_user_id = new.artist_user_id and status = 'open' and deleted_at is null and expires_at >= current_date;
  if v_n >= 3 then raise exception '열어둘 수 있는 구직 글은 3개까지입니다. 기존 글을 닫거나 지운 뒤 올려주세요.'; end if;
  return new;
end $$;
drop trigger if exists trg_limit_seeking on seeking_posts;
create trigger trg_limit_seeking before insert on seeking_posts for each row execute function limit_seeking_posts();

-- 조회수: 비로그인도 올릴 수 있게 함수로.
create or replace function bump_seeking_view(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update seeking_posts set view_count = view_count + 1 where id = p_id and status = 'open' and deleted_at is null
$$;
grant execute on function bump_seeking_view(uuid) to anon, authenticated;
