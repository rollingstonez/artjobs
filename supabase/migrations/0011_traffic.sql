-- 아트잡스 방문·유입 통계 — 바로쌤의 visit_logs / referral_channels / 가입 귀속(signup_source)을 옮겼다.
--   1) visit_logs: 방문 1회(브라우저 세션당 1행). IP 는 저장하지 않는다. 봇은 is_bot=true 로 저장하고 통계에서 뺀다.
--   2) referral_channels / referral_visits: 카톡방·밴드·카페 등에 나눠 줄 단축링크 /r/{code} 와 그 클릭 기록.
--   3) profiles.signup_source / signup_device_type / signup_attribution: 가입한 사람이 처음 어디서 왔는지(first-touch).
--      이메일 가입은 가입 폼이 metadata 로 넘기고(handle_new_user), 소셜 가입은 콜백이 set_signup_attribution() 으로 넣는다.
--   4) 아트잡스 Next 앱은 service role 을 쓰지 않으므로, 쓰기는 전부 security definer 함수(track_visit 등)로 한다.
--      RLS 는 "운영자만 읽기". 비로그인 방문자도 함수는 부를 수 있다.
--   5) admin_traffic(p_days): 운영자 화면이 한 번에 받는 집계 JSON(일별·시간대·유입원·기기·랜딩·가입 귀속·채널).
--
-- 실행: Supabase SQL Editor 에서 이 파일 전체를 Run. 여러 번 실행해도 안전.

-- ───────────────────────── 1. 방문 기록 ─────────────────────────
create table if not exists visit_logs (
  id             uuid primary key default gen_random_uuid(),
  visited_at     timestamptz not null default now(),
  source         text,            -- naver | google | kakao | instagram | facebook | direct | internal | other | *_ad (유료)
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  utm_content    text,            -- /r/{code} 로 들어왔으면 그 code
  referrer       text,
  landing_path   text,
  device_type    text,            -- mobile | tablet | pc
  browser        text,            -- KakaoTalk | Instagram | Chrome | Safari | ...
  os             text,
  is_bot         boolean not null default false,
  session_key    text,            -- 탭 세션 표식(개인정보 아님)
  visitor_key    text,            -- 브라우저 표식(localStorage) — 신규/재방문 판정용
  is_new_visitor boolean,         -- true 신규 · false 재방문 · null 구분불가
  created_at     timestamptz not null default now()
);
create index if not exists idx_visit_time on visit_logs(visited_at desc);
create index if not exists idx_visit_visitor on visit_logs(visitor_key, visited_at desc);
create index if not exists idx_visit_session on visit_logs(session_key);

alter table visit_logs enable row level security;
drop policy if exists "admin visits read" on visit_logs;
create policy "admin visits read" on visit_logs for select to authenticated using (is_admin());

-- 방문 1건 기록. 같은 세션은 한 번만. 신규/재방문은 visitor_key 의 이전 기록 유무로 판정.
create or replace function track_visit(
  p_session_key text, p_visitor_key text, p_source text, p_utm_source text, p_utm_medium text, p_utm_campaign text, p_utm_content text,
  p_referrer text, p_landing_path text, p_device_type text, p_browser text, p_os text, p_is_bot boolean)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_new boolean;
begin
  if p_session_key is null or length(p_session_key) < 8 then return false; end if;
  if exists (select 1 from visit_logs where session_key = left(p_session_key, 80) limit 1) then return false; end if;
  if p_visitor_key is null or p_visitor_key = '' then
    v_new := null;
  else
    v_new := not exists (select 1 from visit_logs where visitor_key = left(p_visitor_key, 80) limit 1);
  end if;
  insert into visit_logs (source, utm_source, utm_medium, utm_campaign, utm_content, referrer, landing_path,
                          device_type, browser, os, is_bot, session_key, visitor_key, is_new_visitor)
  values (left(coalesce(p_source, 'direct'), 60), left(p_utm_source, 120), left(p_utm_medium, 120), left(p_utm_campaign, 200), left(p_utm_content, 200),
          left(p_referrer, 500), left(coalesce(p_landing_path, '/'), 500), left(coalesce(p_device_type, 'pc'), 20), left(coalesce(p_browser, 'Other'), 40),
          left(coalesce(p_os, 'Other'), 40), coalesce(p_is_bot, false), left(p_session_key, 80), nullif(left(p_visitor_key, 80), ''), v_new);
  return true;
end $$;
revoke all on function track_visit(text, text, text, text, text, text, text, text, text, text, text, text, boolean) from public;
grant execute on function track_visit(text, text, text, text, text, text, text, text, text, text, text, text, boolean) to anon, authenticated;

-- ───────────────────────── 2. 채널 단축링크 ─────────────────────────
create table if not exists referral_channels (
  code          text primary key check (code ~ '^[a-z0-9]{2,12}$'),
  name          text not null,                -- 예: 국악과 동문 카톡방
  member_count  integer,                      -- 그 방 인원(수동 입력, 선택)
  utm_source    text not null default 'kakao',
  utm_medium    text not null default 'community',
  utm_campaign  text not null default 'room',
  is_active     boolean not null default true,
  note          text,
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);
create table if not exists referral_visits (
  id          uuid primary key default gen_random_uuid(),
  code        text not null references referral_channels(code) on delete cascade,
  user_agent  text,
  referer     text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_refvisit_code on referral_visits(code, created_at desc);

alter table referral_channels enable row level security;
alter table referral_visits enable row level security;
drop policy if exists "admin channels all" on referral_channels;
create policy "admin channels all" on referral_channels for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists "admin refvisits read" on referral_visits;
create policy "admin refvisits read" on referral_visits for select to authenticated using (is_admin());

-- /r/{code} 가 부른다: 활성 채널이면 클릭을 기록하고 utm 을 돌려준다. 없으면 0행.
create or replace function track_referral_click(p_code text, p_user_agent text, p_referer text)
returns table (code text, utm_source text, utm_medium text, utm_campaign text)
language plpgsql security definer set search_path = public as $$
declare v record;
begin
  select c.code, c.utm_source, c.utm_medium, c.utm_campaign into v
    from referral_channels c where c.code = lower(coalesce(p_code, '')) and c.is_active = true;
  if not found then return; end if;
  insert into referral_visits (code, user_agent, referer) values (v.code, left(p_user_agent, 500), left(p_referer, 500));
  return query select v.code, v.utm_source, v.utm_medium, v.utm_campaign;
end $$;
revoke all on function track_referral_click(text, text, text) from public;
grant execute on function track_referral_click(text, text, text) to anon, authenticated;

-- ───────────────────────── 3. 가입 귀속 ─────────────────────────
alter table profiles add column if not exists signup_source text;
alter table profiles add column if not exists signup_device_type text;
alter table profiles add column if not exists signup_attribution jsonb;

-- 가입 트리거(0007 판)에 귀속 칸을 더한다. 이메일 가입 폼이 metadata 로 넘긴다.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', 'artist');
  v_name text := coalesce(
    nullif(new.raw_user_meta_data->>'display_name', ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'nickname', ''),
    nullif(new.raw_user_meta_data->>'preferred_username', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    '회원'
  );
  v_admin boolean := lower(coalesce(new.email, '')) in ('lkseok911@gmail.com');
  v_attr jsonb := case when jsonb_typeof(new.raw_user_meta_data->'signup_attribution') = 'object' then new.raw_user_meta_data->'signup_attribution' else null end;
begin
  if v_role not in ('artist', 'organization') then v_role := 'artist'; end if;
  insert into profiles (id, role, display_name, is_admin, signup_source, signup_device_type, signup_attribution)
    values (new.id, v_role, v_name, v_admin,
            nullif(left(new.raw_user_meta_data->>'signup_source', 60), ''),
            nullif(left(new.raw_user_meta_data->>'signup_device_type', 20), ''),
            v_attr);
  insert into user_settings (user_id) values (new.id);
  if v_role = 'artist' then
    insert into artist_profiles (user_id) values (new.id);
  else
    insert into org_profiles (user_id, org_name)
      values (new.id, coalesce(nullif(new.raw_user_meta_data->>'org_name', ''), v_name));
  end if;
  return new;
end $$;

-- 소셜 가입 콜백이 부른다: 가입 10분 안 + 아직 비어 있을 때만 채운다(덮어쓰기 없음).
create or replace function set_signup_attribution(p_source text, p_device text, p_attr jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  if auth.uid() is null then return false; end if;
  update profiles set signup_source = nullif(left(p_source, 60), ''), signup_device_type = nullif(left(p_device, 20), ''),
                      signup_attribution = case when jsonb_typeof(p_attr) = 'object' then p_attr else null end
    where id = auth.uid() and signup_source is null and created_at > now() - interval '10 minutes';
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;
revoke all on function set_signup_attribution(text, text, jsonb) from public;
grant execute on function set_signup_attribution(text, text, jsonb) to authenticated;

-- ───────────────────────── 4. 운영자 집계 ─────────────────────────
-- 최근 p_days 일(KST, 오늘 포함)의 방문·유입 통계를 JSON 하나로. 봇 제외.
create or replace function admin_traffic(p_days int default 7) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_days int := greatest(1, least(coalesce(p_days, 7), 366));
  v_from date := (now() at time zone 'Asia/Seoul')::date - v_days + 1;
  v_since timestamptz := (v_from::timestamp) at time zone 'Asia/Seoul';
  v_out jsonb;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  with v as (
    select *, (visited_at at time zone 'Asia/Seoul') as kst from visit_logs where is_bot = false and visited_at >= v_since
  ),
  days as (select d::date as day from generate_series(v_from, (now() at time zone 'Asia/Seoul')::date, interval '1 day') d),
  su as (
    select p.*, (p.created_at at time zone 'Asia/Seoul')::date as kday from profiles p where p.status <> 'deleted'
  )
  select jsonb_build_object(
    'days', v_days,
    'since', v_from,
    'total_visits', (select count(*) from v),
    'unique_visitors', (select count(distinct visitor_key) from v where visitor_key is not null),
    'new_visits', (select count(*) from v where is_new_visitor = true),
    'returning_visits', (select count(*) from v where is_new_visitor = false),
    'unknown_visits', (select count(*) from v where is_new_visitor is null),
    'first_visit_at', (select min(visited_at) from visit_logs),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object(
                 'day', d.day,
                 'visits', (select count(*) from v where v.kst::date = d.day),
                 'new_visits', (select count(*) from v where v.kst::date = d.day and v.is_new_visitor = true),
                 'returning_visits', (select count(*) from v where v.kst::date = d.day and v.is_new_visitor = false),
                 'signups', (select count(*) from su where su.kday = d.day)
               ) order by d.day), '[]'::jsonb) from days d),
    'hourly', (select coalesce(jsonb_agg(jsonb_build_object('day', x.day, 'hour', x.hour, 'visits', x.n)), '[]'::jsonb)
               from (select kst::date as day, extract(hour from kst)::int as hour, count(*) as n from v group by 1, 2) x),
    'hours', (select coalesce(jsonb_agg(coalesce(h.n, 0) order by hh.h), '[]'::jsonb)
              from generate_series(0, 23) hh(h)
              left join (select extract(hour from kst)::int as hour, count(*) as n from v group by 1) h on h.hour = hh.h),
    'sources', (select coalesce(jsonb_agg(jsonb_build_object('key', x.k, 'cnt', x.n) order by x.n desc), '[]'::jsonb)
                from (select coalesce(source, 'direct') as k, count(*) as n from v group by 1) x),
    'devices', (select coalesce(jsonb_agg(jsonb_build_object('key', x.k, 'cnt', x.n) order by x.n desc), '[]'::jsonb)
                from (select coalesce(device_type, 'pc') as k, count(*) as n from v group by 1) x),
    'browsers', (select coalesce(jsonb_agg(jsonb_build_object('key', x.k, 'cnt', x.n) order by x.n desc), '[]'::jsonb)
                 from (select coalesce(browser, 'Other') as k, count(*) as n from v group by 1 order by 2 desc limit 8) x),
    'os', (select coalesce(jsonb_agg(jsonb_build_object('key', x.k, 'cnt', x.n) order by x.n desc), '[]'::jsonb)
           from (select coalesce(os, 'Other') as k, count(*) as n from v group by 1) x),
    'landing', (select coalesce(jsonb_agg(jsonb_build_object('key', x.k, 'cnt', x.n) order by x.n desc), '[]'::jsonb)
                from (select coalesce(landing_path, '/') as k, count(*) as n from v group by 1 order by 2 desc limit 10) x),
    'referrers', (select coalesce(jsonb_agg(jsonb_build_object('key', x.k, 'cnt', x.n) order by x.n desc), '[]'::jsonb)
                  from (select substring(referrer from '^[a-z]+://([^/]+)') as k, count(*) as n from v where referrer is not null and referrer <> '' group by 1 order by 2 desc limit 10) x),
    'signup_period', (select coalesce(jsonb_agg(jsonb_build_object('key', x.k, 'cnt', x.n) order by x.n desc), '[]'::jsonb)
                      from (select coalesce(signup_source, 'unknown') as k, count(*) as n from su where kday >= v_from group by 1) x),
    'signup_all', (select coalesce(jsonb_agg(jsonb_build_object('key', x.k, 'cnt', x.n) order by x.n desc), '[]'::jsonb)
                   from (select coalesce(signup_source, 'unknown') as k, count(*) as n from su group by 1) x),
    'signup_device', (select coalesce(jsonb_agg(jsonb_build_object('source', x.s, 'device', x.d, 'cnt', x.n)), '[]'::jsonb)
                      from (select coalesce(signup_source, 'unknown') as s, coalesce(signup_device_type, 'unknown') as d, count(*) as n from su group by 1, 2) x),
    'channels', (select coalesce(jsonb_agg(jsonb_build_object(
                    'code', c.code, 'name', c.name, 'member_count', c.member_count, 'utm_source', c.utm_source, 'utm_medium', c.utm_medium,
                    'utm_campaign', c.utm_campaign, 'is_active', c.is_active, 'note', c.note, 'created_at', c.created_at,
                    'period_clicks', (select count(*) from referral_visits r where r.code = c.code and r.created_at >= v_since),
                    'total_clicks', (select count(*) from referral_visits r where r.code = c.code),
                    'period_visits', (select count(*) from v where v.utm_content = c.code),
                    'signups', (select count(*) from su where su.signup_attribution->>'utm_content' = c.code)
                  ) order by c.is_active desc, c.created_at), '[]'::jsonb) from referral_channels c),
    'ads', (select coalesce(jsonb_agg(jsonb_build_object('key', a.src,
                    'visits', (select count(*) from v where v.source = a.src),
                    'signups', (select count(*) from su where su.kday >= v_from and su.signup_source = a.src))), '[]'::jsonb)
            from (values ('naver_ad'), ('google_ad'), ('instagram_ad'), ('facebook_ad')) a(src))
  ) into v_out;
  return v_out;
end $$;
revoke all on function admin_traffic(int) from public;
grant execute on function admin_traffic(int) to authenticated;

-- 월별 일자 표(지난 달 기록): 해당 월의 일별 방문·신규·가입.
create or replace function admin_visit_month(p_year int, p_month int)
returns table (day date, visits bigint, new_visits bigint, signups bigint, signup_artist bigint, signup_org bigint)
language plpgsql stable security definer set search_path = public as $$
declare v_from date := make_date(p_year, p_month, 1); v_to date := (make_date(p_year, p_month, 1) + interval '1 month')::date;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
    select d::date,
      (select count(*) from visit_logs x where x.is_bot = false and (x.visited_at at time zone 'Asia/Seoul')::date = d::date),
      (select count(*) from visit_logs x where x.is_bot = false and x.is_new_visitor = true and (x.visited_at at time zone 'Asia/Seoul')::date = d::date),
      (select count(*) from profiles p where (p.created_at at time zone 'Asia/Seoul')::date = d::date),
      (select count(*) from profiles p where p.role = 'artist' and (p.created_at at time zone 'Asia/Seoul')::date = d::date),
      (select count(*) from profiles p where p.role = 'organization' and (p.created_at at time zone 'Asia/Seoul')::date = d::date)
    from generate_series(v_from, least(v_to - 1, (now() at time zone 'Asia/Seoul')::date), interval '1 day') d
    order by 1;
end $$;
revoke all on function admin_visit_month(int, int) from public;
grant execute on function admin_visit_month(int, int) to authenticated;
