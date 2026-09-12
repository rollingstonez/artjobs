-- 아트잡스 운영자 센터 확장 — 바로쌤 어드민 수준으로.
--   0007·0008 의 "인증·정지·신고·소스 스위치" 만 있던 어드민에 아래를 더한다.
--   1) 운영자 읽기 정책: 저장·알림 조건·알림·설정·차단·포트폴리오·심사 기록·대화방(메타). 메시지 본문은 여전히 안 읽는다.
--   2) 수집 공고 개별 숨기기: crawled_postings.hidden_at (README "아직 없는 것" 해소).
--   3) 운영자 → 회원 알림 보내기: notifications 에 kind='admin' 으로 넣는다(발신함 /admin/sent).
--   4) 고객 문의 contact_messages (/support 공개 폼, /admin/support 처리).
--   5) 공지사항 site_notices (/notices 공개, /admin/notices 관리).
--   6) 회원 운영 메모 admin_user_notes (회원 상세에서만 보임).
--   7) 통계·목록 함수(security definer): 회원 검색·상세(auth 정보), 대화 메타, 일별 추이, 7일 활동, 소스별 수집 현황.
--
-- 실행: Supabase SQL Editor 에 이 파일 전체를 붙여 넣고 Run. 여러 번 실행해도 안전(if not exists / or replace / drop if exists).

-- ───────────────────────── 1. 운영자 읽기 정책 ─────────────────────────
drop policy if exists "admin bookmarks read" on bookmarks;
create policy "admin bookmarks read" on bookmarks for select to authenticated using (is_admin());
drop policy if exists "admin alerts read" on alert_conditions;
create policy "admin alerts read" on alert_conditions for select to authenticated using (is_admin());
drop policy if exists "admin notifications read" on notifications;
create policy "admin notifications read" on notifications for select to authenticated using (is_admin());
drop policy if exists "admin settings read" on user_settings;
create policy "admin settings read" on user_settings for select to authenticated using (is_admin());
drop policy if exists "admin blocks read" on user_blocks;
create policy "admin blocks read" on user_blocks for select to authenticated using (is_admin());
drop policy if exists "admin portfolio read" on artist_portfolio_items;
create policy "admin portfolio read" on artist_portfolio_items for select to authenticated using (is_admin());
drop policy if exists "admin reviews read" on application_reviews;
create policy "admin reviews read" on application_reviews for select to authenticated using (is_admin());
drop policy if exists "admin conversations read" on conversations;
create policy "admin conversations read" on conversations for select to authenticated using (is_admin());
-- (메시지 본문 messages 에는 운영자 정책을 두지 않는다. 대화 현황은 아래 admin_conversation_list() 가 건수만 돌려준다.)

-- 운영자가 회원 프로필(예술가·기관)을 상세에서 읽는다. 0007 에 artist read 는 있고 org 는 누구나 읽는다. 여기서는 갱신 정책만 보강.
drop policy if exists "admin artist update" on artist_profiles;
create policy "admin artist update" on artist_profiles for update to authenticated using (is_admin()) with check (is_admin());

-- ───────────────────────── 2. 수집 공고 개별 숨기기 ─────────────────────────
alter table crawled_postings add column if not exists hidden_at timestamptz;
alter table crawled_postings add column if not exists hidden_reason text;
-- 공개 읽기 정책을 "숨기지 않은 모집중" 으로 바꾼다.
drop policy if exists "public read open postings" on crawled_postings;
create policy "public read open postings" on crawled_postings for select using (status = 'open' and hidden_at is null);

-- ───────────────────────── 3. 운영자 → 회원 알림 ─────────────────────────
drop policy if exists "admin notifications insert" on notifications;
create policy "admin notifications insert" on notifications for insert to authenticated with check (is_admin());
-- notifications.kind 에 'admin' 을 쓴다(체크 제약 없음). related_id 는 admin_logs 와 연결하지 않고 detail 에 남긴다.

-- ───────────────────────── 4. 고객 문의 ─────────────────────────
create table if not exists contact_messages (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id) on delete set null,   -- 로그인한 사람이면 채워진다
  name         text not null,
  email        text not null,
  category     text not null default 'other' check (category in ('account', 'posting', 'report', 'partnership', 'bug', 'other')),
  subject      text not null check (char_length(subject) between 2 and 120),
  body         text not null check (char_length(body) between 5 and 4000),
  status       text not null default 'new' check (status in ('new', 'in_progress', 'replied', 'closed')),
  admin_reply  text,                                              -- 운영자가 적은 답변(회원이면 /support 에서 보인다)
  replied_by   uuid references profiles(id) on delete set null,
  replied_at   timestamptz,
  admin_memo   text,                                              -- 운영자끼리 보는 메모
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_contact_status on contact_messages(status, created_at desc);
create index if not exists idx_contact_user on contact_messages(user_id);
drop trigger if exists trg_touch_contact_messages on contact_messages;
create trigger trg_touch_contact_messages before update on contact_messages for each row execute function touch_updated_at();

alter table contact_messages enable row level security;
drop policy if exists "contact insert anyone" on contact_messages;
create policy "contact insert anyone" on contact_messages for insert
  with check (user_id is null or user_id = auth.uid());
drop policy if exists "contact read own" on contact_messages;
create policy "contact read own" on contact_messages for select to authenticated using (user_id = auth.uid());
drop policy if exists "contact admin read" on contact_messages;
create policy "contact admin read" on contact_messages for select to authenticated using (is_admin());
drop policy if exists "contact admin update" on contact_messages;
create policy "contact admin update" on contact_messages for update to authenticated using (is_admin()) with check (is_admin());

-- 답변이 달리면(회원 문의일 때) 알림
create or replace function on_contact_replied() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is not null and new.admin_reply is not null and new.admin_reply is distinct from old.admin_reply then
    insert into notifications (user_id, kind, title, body, link_url, related_id)
      values (new.user_id, 'system', '문의에 답변이 달렸습니다', left(new.subject, 80), '/support', new.id);
  end if;
  return new;
end $$;
drop trigger if exists trg_contact_replied on contact_messages;
create trigger trg_contact_replied after update on contact_messages for each row execute function on_contact_replied();

-- ───────────────────────── 5. 공지사항 ─────────────────────────
create table if not exists site_notices (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null default 'notice' check (kind in ('notice', 'update', 'event', 'maintenance')),
  title         text not null check (char_length(title) between 2 and 120),
  body          text not null,
  is_pinned     boolean not null default false,
  is_published  boolean not null default false,
  published_at  timestamptz,
  view_count    integer not null default 0,
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_notices_pub on site_notices(is_published, is_pinned desc, published_at desc);
drop trigger if exists trg_touch_site_notices on site_notices;
create trigger trg_touch_site_notices before update on site_notices for each row execute function touch_updated_at();

alter table site_notices enable row level security;
drop policy if exists "notices public read" on site_notices;
create policy "notices public read" on site_notices for select using (is_published = true);
drop policy if exists "notices admin all" on site_notices;
create policy "notices admin all" on site_notices for all to authenticated using (is_admin()) with check (is_admin());

-- 조회수(공개 페이지에서 호출). 아무나 부를 수 있지만 +1 만 한다.
create or replace function bump_notice_view(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update site_notices set view_count = view_count + 1 where id = p_id and is_published = true
$$;
revoke all on function bump_notice_view(uuid) from public;
grant execute on function bump_notice_view(uuid) to anon, authenticated;

-- ───────────────────────── 6. 회원 운영 메모 ─────────────────────────
create table if not exists admin_user_notes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  admin_user_id  uuid not null references profiles(id) on delete cascade,
  body           text not null check (char_length(body) between 1 and 2000),
  created_at     timestamptz not null default now()
);
create index if not exists idx_admin_notes_user on admin_user_notes(user_id, created_at desc);
alter table admin_user_notes enable row level security;
drop policy if exists "admin notes all" on admin_user_notes;
create policy "admin notes all" on admin_user_notes for all to authenticated using (is_admin()) with check (is_admin() and admin_user_id = auth.uid());

-- ───────────────────────── 7. 운영자 전용 함수 ─────────────────────────
-- 7-1. 회원 검색(0007 admin_list_users 확장판). 인증·프로필 완성·가입 기간·정렬·오프셋.
create or replace function admin_search_users(
  p_role text default null, p_status text default null, p_q text default null,
  p_verified boolean default null, p_completed boolean default null, p_admin boolean default null,
  p_since timestamptz default null, p_sort text default 'newest', p_limit int default 100, p_offset int default 0)
returns table (id uuid, email text, role text, display_name text, status text, is_admin boolean, created_at timestamptz,
               last_sign_in_at timestamptz, org_name text, is_verified boolean, profile_completed boolean,
               region text, field text, career_years int, org_type text, total_count bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
    with base as (
      select p.id, u.email::text as email, p.role, p.display_name, p.status, p.is_admin, p.created_at, u.last_sign_in_at,
             o.org_name, o.is_verified,
             coalesce(a.profile_completed, o.profile_completed, false) as profile_completed,
             coalesce(a.region, o.region) as region, coalesce(a.field, o.field) as field, a.career_years, o.org_type
      from profiles p
      join auth.users u on u.id = p.id
      left join org_profiles o on o.user_id = p.id
      left join artist_profiles a on a.user_id = p.id
      where (p_role is null or p.role = p_role)
        and (p_status is null or p.status = p_status)
        and (p_verified is null or coalesce(o.is_verified, false) = p_verified)
        and (p_completed is null or coalesce(a.profile_completed, o.profile_completed, false) = p_completed)
        and (p_admin is null or p.is_admin = p_admin)
        and (p_since is null or p.created_at >= p_since)
        and (p_q is null or p_q = '' or p.display_name ilike '%' || p_q || '%' or u.email ilike '%' || p_q || '%' or o.org_name ilike '%' || p_q || '%')
    )
    select b.*, count(*) over () as total_count
    from base b
    order by
      case when p_sort = 'oldest' then b.created_at end asc,
      case when p_sort = 'recent_login' then b.last_sign_in_at end desc nulls last,
      case when p_sort = 'name' then b.display_name end asc,
      b.created_at desc
    limit greatest(1, least(p_limit, 500)) offset greatest(0, p_offset);
end $$;
revoke all on function admin_search_users(text, text, text, boolean, boolean, boolean, timestamptz, text, int, int) from public;
grant execute on function admin_search_users(text, text, text, boolean, boolean, boolean, timestamptz, text, int, int) to authenticated;

-- 7-2. 회원 상세의 인증(auth) 정보: 이메일·가입 경로·마지막 로그인·이메일 확인.
create or replace function admin_user_auth(p_user uuid)
returns table (email text, providers text[], created_at timestamptz, last_sign_in_at timestamptz, email_confirmed_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
    select u.email::text,
           coalesce((select array_agg(distinct i.provider::text) from auth.identities i where i.user_id = u.id), '{}'),
           u.created_at, u.last_sign_in_at, u.email_confirmed_at
    from auth.users u where u.id = p_user;
end $$;
revoke all on function admin_user_auth(uuid) from public;
grant execute on function admin_user_auth(uuid) to authenticated;

-- 7-3. 대화 현황(메타만). 본문은 절대 돌려주지 않는다.
create or replace function admin_conversation_list(p_q text default null, p_days int default 30, p_limit int default 200)
returns table (id uuid, artist_user_id uuid, artist_name text, org_user_id uuid, org_name text,
               posting_source text, posting_id text, created_at timestamptz, last_message_at timestamptz,
               message_count bigint, artist_sent bigint, org_sent bigint, unread_count bigint, last_sender uuid)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
    select c.id, c.artist_user_id, pa.display_name, c.org_user_id, po.display_name,
           c.posting_source, c.posting_id, c.created_at, c.last_message_at,
           (select count(*) from messages m where m.conversation_id = c.id),
           (select count(*) from messages m where m.conversation_id = c.id and m.sender_user_id = c.artist_user_id),
           (select count(*) from messages m where m.conversation_id = c.id and m.sender_user_id = c.org_user_id),
           (select count(*) from messages m where m.conversation_id = c.id and m.read_at is null),
           (select m.sender_user_id from messages m where m.conversation_id = c.id order by m.created_at desc limit 1)
    from conversations c
    join profiles pa on pa.id = c.artist_user_id
    join profiles po on po.id = c.org_user_id
    where (p_days is null or coalesce(c.last_message_at, c.created_at) >= now() - make_interval(days => p_days))
      and (p_q is null or p_q = '' or pa.display_name ilike '%' || p_q || '%' or po.display_name ilike '%' || p_q || '%')
    order by coalesce(c.last_message_at, c.created_at) desc
    limit greatest(1, least(p_limit, 1000));
end $$;
revoke all on function admin_conversation_list(text, int, int) from public;
grant execute on function admin_conversation_list(text, int, int) to authenticated;

-- 7-4. 일별 추이(최근 p_days 일). 가입(예술가·기관)·지원·기관 공고·수집 공고·대화방·메시지 건수.
create or replace function admin_daily_counts(p_days int default 14)
returns table (day date, signup_artist bigint, signup_org bigint, applications bigint, org_postings bigint,
               crawled_postings bigint, conversations bigint, messages bigint, seeking_posts bigint, contacts bigint)
language plpgsql stable security definer set search_path = public as $$
declare v_from date := current_date - greatest(1, least(p_days, 366)) + 1;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
    select d::date,
      (select count(*) from profiles p where p.role = 'artist' and (p.created_at at time zone 'Asia/Seoul')::date = d),
      (select count(*) from profiles p where p.role = 'organization' and (p.created_at at time zone 'Asia/Seoul')::date = d),
      (select count(*) from applications a where (a.created_at at time zone 'Asia/Seoul')::date = d),
      (select count(*) from org_postings o where (o.created_at at time zone 'Asia/Seoul')::date = d),
      (select count(*) from crawled_postings c where (c.created_at at time zone 'Asia/Seoul')::date = d),
      (select count(*) from conversations c where (c.created_at at time zone 'Asia/Seoul')::date = d),
      (select count(*) from messages m where (m.created_at at time zone 'Asia/Seoul')::date = d),
      (select count(*) from seeking_posts s where (s.created_at at time zone 'Asia/Seoul')::date = d),
      (select count(*) from contact_messages cm where (cm.created_at at time zone 'Asia/Seoul')::date = d)
    from generate_series(v_from, current_date, interval '1 day') d
    order by 1;
end $$;
revoke all on function admin_daily_counts(int) from public;
grant execute on function admin_daily_counts(int) to authenticated;

-- 7-5. 최근 7일 활동 요약(바로쌤 get_activity_summary_7d 이식).
--   relogin: 7일 전보다 먼저 가입했는데 최근 7일 안에 로그인한 사람 · senders: 메시지 보낸 사람 수 ·
--   two_way: 양쪽 다 보낸 대화방 · active_ratio: 전체 활성 회원 중 최근 7일 로그인 비율(%).
create or replace function admin_activity_7d()
returns table (relogin_count bigint, message_sender_count bigint, two_way_conversation_count bigint, active_ratio numeric,
               new_applications bigint, new_conversations bigint, messages_count bigint, logins bigint)
language plpgsql stable security definer set search_path = public as $$
declare v_since timestamptz := now() - interval '7 days';
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
    select
      (select count(*) from auth.users u join profiles p on p.id = u.id where u.last_sign_in_at >= v_since and p.created_at < v_since),
      (select count(distinct m.sender_user_id) from messages m where m.created_at >= v_since),
      (select count(*) from conversations c
         where exists (select 1 from messages m where m.conversation_id = c.id and m.sender_user_id = c.artist_user_id and m.created_at >= v_since)
           and exists (select 1 from messages m where m.conversation_id = c.id and m.sender_user_id = c.org_user_id and m.created_at >= v_since)),
      (select case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where u.last_sign_in_at >= v_since) / count(*), 1) end
         from auth.users u join profiles p on p.id = u.id where p.status = 'active'),
      (select count(*) from applications a where a.created_at >= v_since),
      (select count(*) from conversations c where c.created_at >= v_since),
      (select count(*) from messages m where m.created_at >= v_since),
      (select count(*) from auth.users u where u.last_sign_in_at >= v_since);
end $$;
revoke all on function admin_activity_7d() from public;
grant execute on function admin_activity_7d() to authenticated;

-- 7-6. 소스별 수집 현황: 총 건수·모집중·숨김·최근 등록·최근 확인.
create or replace function admin_source_stats()
returns table (source_code text, total bigint, open_count bigint, hidden_count bigint, last_created timestamptz, last_seen timestamptz, week_count bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
    select c.source_code, count(*), count(*) filter (where c.status = 'open'), count(*) filter (where c.hidden_at is not null),
           max(c.created_at), max(c.last_seen_at), count(*) filter (where c.created_at >= now() - interval '7 days')
    from crawled_postings c group by c.source_code;
end $$;
revoke all on function admin_source_stats() from public;
grant execute on function admin_source_stats() to authenticated;

-- 7-7. 분포 통계: 분야·지역·게시판·고용형태별 모집중 공고 수(수집+기관), 회원 분야·지역 분포.
create or replace function admin_distribution(p_kind text)
returns table (key text, cnt bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_kind = 'posting_field' then
    return query select coalesce(x.field, '(미분류)'), count(*) from (
      select field from crawled_postings where status = 'open' and hidden_at is null
      union all select field from org_postings where status = 'open' and deleted_at is null) x group by 1 order by 2 desc;
  elsif p_kind = 'posting_region' then
    return query select coalesce(x.region, '(미정)'), count(*) from (
      select region from crawled_postings where status = 'open' and hidden_at is null
      union all select region from org_postings where status = 'open' and deleted_at is null) x group by 1 order by 2 desc;
  elsif p_kind = 'posting_board' then
    return query select coalesce(x.board, 'job'), count(*) from (
      select board from crawled_postings where status = 'open' and hidden_at is null
      union all select board from org_postings where status = 'open' and deleted_at is null) x group by 1 order by 2 desc;
  elsif p_kind = 'posting_employment' then
    return query select coalesce(x.employment_type, '(미정)'), count(*) from (
      select employment_type from crawled_postings where status = 'open' and hidden_at is null
      union all select employment_type from org_postings where status = 'open' and deleted_at is null) x group by 1 order by 2 desc;
  elsif p_kind = 'artist_field' then
    return query select coalesce(a.field, '(미정)'), count(*) from artist_profiles a join profiles p on p.id = a.user_id where p.status <> 'deleted' group by 1 order by 2 desc;
  elsif p_kind = 'artist_region' then
    return query select coalesce(a.region, '(미정)'), count(*) from artist_profiles a join profiles p on p.id = a.user_id where p.status <> 'deleted' group by 1 order by 2 desc;
  elsif p_kind = 'org_type' then
    return query select coalesce(o.org_type, '(미정)'), count(*) from org_profiles o join profiles p on p.id = o.user_id where p.status <> 'deleted' group by 1 order by 2 desc;
  elsif p_kind = 'org_region' then
    return query select coalesce(o.region, '(미정)'), count(*) from org_profiles o join profiles p on p.id = o.user_id where p.status <> 'deleted' group by 1 order by 2 desc;
  elsif p_kind = 'application_status' then
    return query select a.status, count(*) from applications a group by 1 order by 2 desc;
  elsif p_kind = 'notification_kind' then
    return query select n.kind, count(*) from notifications n where n.created_at >= now() - interval '30 days' group by 1 order by 2 desc;
  else
    return;
  end if;
end $$;
revoke all on function admin_distribution(text) from public;
grant execute on function admin_distribution(text) to authenticated;

-- 7-8. 만료 지원서 파기. 0006 의 purge_expired_applications(null) 은 로그인 세션에서 부르면 막히므로(pg_cron 전용),
--   같은 규칙을 운영자용으로 따로 둔다. 마감(또는 접수 종료) 뒤 retention_days 가 지난 지원서의 스냅샷·지원 메시지를 지운다.
create or replace function admin_purge_applications() returns integer
language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  with due as (
    select a.id from applications a
    join org_postings p on a.posting_source = 'org' and p.id::text = a.posting_id
    where a.purged_at is null
      and coalesce(case when p.status = 'closed' then p.updated_at::date else null end, p.apply_end) is not null
      and coalesce(case when p.status = 'closed' then p.updated_at::date else null end, p.apply_end) + p.retention_days < current_date
  )
  update applications a set profile_snapshot = null, message = null, purged_at = now()
  from due where a.id = due.id;
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke all on function admin_purge_applications() from public;
grant execute on function admin_purge_applications() to authenticated;

-- 7-9. 파기 대상 미리 세어 보기(설정 화면에 "지금 파기하면 N건" 표시).
create or replace function admin_purge_due_count() returns integer
language plpgsql stable security definer set search_path = public as $$
declare v_n integer;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  select count(*) into v_n from applications a
    join org_postings p on a.posting_source = 'org' and p.id::text = a.posting_id
    where a.purged_at is null
      and coalesce(case when p.status = 'closed' then p.updated_at::date else null end, p.apply_end) is not null
      and coalesce(case when p.status = 'closed' then p.updated_at::date else null end, p.apply_end) + p.retention_days < current_date;
  return coalesce(v_n, 0);
end $$;
revoke all on function admin_purge_due_count() from public;
grant execute on function admin_purge_due_count() to authenticated;
