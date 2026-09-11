-- 아트잡스 운영자(어드민).
--   방식: 별도 역할 없이 profiles.is_admin 플래그. 운영자는 구인자(기관)로 가입한 뒤 관리자로 지정한다.
--   lkseok911@gmail.com 은 가입 즉시 자동으로 관리자가 된다(가입 트리거). 이미 가입돼 있으면 아래 update 가 처리.
--   어드민 화면 /admin: 현황 · 기관 인증 · 신고 처리 · 회원 정지/복구 · 공고 마감/삭제 · 크롤 소스 스위치.
--   정지(status='suspended')된 계정은 로그인은 되지만 메시지·지원·공고 등록이 막힌다(restrictive 정책).

-- ───────────────────────── 판정 함수 ─────────────────────────
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;

create or replace function is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select status = 'active' from profiles where id = auth.uid()), false)
$$;

revoke all on function is_admin(), is_active_user() from public;
grant execute on function is_admin(), is_active_user() to authenticated;

-- ───────────────────────── 가입 트리거: 운영자 이메일이면 관리자 ─────────────────────────
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
begin
  if v_role not in ('artist', 'organization') then v_role := 'artist'; end if;
  insert into profiles (id, role, display_name, is_admin) values (new.id, v_role, v_name, v_admin);
  insert into user_settings (user_id) values (new.id);
  if v_role = 'artist' then
    insert into artist_profiles (user_id) values (new.id);
  else
    insert into org_profiles (user_id, org_name)
      values (new.id, coalesce(nullif(new.raw_user_meta_data->>'org_name', ''), v_name));
  end if;
  return new;
end $$;

-- 이미 가입돼 있으면 지금 관리자로.
update profiles set is_admin = true
  where id in (select id from auth.users where lower(email) = 'lkseok911@gmail.com');

-- ───────────────────────── 회원 목록(이메일 포함) — 관리자 전용 ─────────────────────────
create or replace function admin_list_users(p_role text default null, p_status text default null, p_q text default null, p_limit int default 200)
returns table (id uuid, email text, role text, display_name text, status text, is_admin boolean, created_at timestamptz,
               org_name text, is_verified boolean, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
    select p.id, u.email::text, p.role, p.display_name, p.status, p.is_admin, p.created_at,
           o.org_name, o.is_verified, u.last_sign_in_at
    from profiles p
    join auth.users u on u.id = p.id
    left join org_profiles o on o.user_id = p.id
    where (p_role is null or p.role = p_role)
      and (p_status is null or p.status = p_status)
      and (p_q is null or p_q = '' or p.display_name ilike '%' || p_q || '%' or u.email ilike '%' || p_q || '%' or o.org_name ilike '%' || p_q || '%')
    order by p.created_at desc
    limit greatest(1, least(p_limit, 1000));
end $$;
revoke all on function admin_list_users(text, text, text, int) from public;
grant execute on function admin_list_users(text, text, text, int) to authenticated;

-- ───────────────────────── 기관 인증되면 알림 ─────────────────────────
create or replace function on_org_verified() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_verified = true and coalesce(old.is_verified, false) = false then
    insert into notifications (user_id, kind, title, body, link_url)
      values (new.user_id, 'system', '기관 인증이 완료되었습니다', '이제 공고에 인증 기관 표시가 붙습니다.', '/me');
  end if;
  return new;
end $$;
drop trigger if exists trg_org_verified on org_profiles;
create trigger trg_org_verified after update on org_profiles for each row execute function on_org_verified();

-- ───────────────────────── 관리자 RLS ─────────────────────────
create policy "admin profiles update" on profiles for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin artist read" on artist_profiles for select to authenticated using (is_admin());
create policy "admin org update" on org_profiles for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin org_postings read" on org_postings for select to authenticated using (is_admin());
create policy "admin org_postings update" on org_postings for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin applications read" on applications for select to authenticated using (is_admin());
create policy "admin reports read" on user_reports for select to authenticated using (is_admin());
create policy "admin reports update" on user_reports for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin sources read" on crawl_sources for select to authenticated using (is_admin());
create policy "admin sources update" on crawl_sources for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin crawled read" on crawled_postings for select to authenticated using (is_admin());
create policy "admin crawled update" on crawled_postings for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin members read" on org_members for select to authenticated using (is_admin());
create policy "admin reviewers read" on posting_reviewers for select to authenticated using (is_admin());
-- 메시지 본문은 관리자도 읽지 않는다. 신고 처리는 신고 내용(user_reports.detail)으로 한다.

-- ───────────────────────── 정지 계정 차단 (restrictive: 기존 정책과 AND) ─────────────────────────
create policy "active only: messages" on messages as restrictive for insert to authenticated with check (is_active_user());
create policy "active only: conversations" on conversations as restrictive for insert to authenticated with check (is_active_user());
create policy "active only: applications" on applications as restrictive for insert to authenticated with check (is_active_user());
create policy "active only: org_postings insert" on org_postings as restrictive for insert to authenticated with check (is_active_user());
create policy "active only: reviews" on application_reviews as restrictive for insert to authenticated with check (is_active_user());

-- ───────────────────────── 본인이 관리자·인증 칸을 못 건드리게 ─────────────────────────
-- 0004 의 "본인 수정" 정책은 칸을 가리지 않아, 브라우저에서 자기 is_admin·status·is_verified 를 바꿀 수 있었다. 트리거로 막는다.
create or replace function protect_profile_flags() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if new.is_admin is distinct from old.is_admin then raise exception 'is_admin can only be changed by an admin'; end if;
    if new.status is distinct from old.status then raise exception 'status can only be changed by an admin'; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_protect_profile_flags on profiles;
create trigger trg_protect_profile_flags before update on profiles for each row execute function protect_profile_flags();

create or replace function protect_org_flags() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() and new.is_verified is distinct from old.is_verified then
    raise exception 'is_verified can only be changed by an admin';
  end if;
  return new;
end $$;
drop trigger if exists trg_protect_org_flags on org_profiles;
create trigger trg_protect_org_flags before update on org_profiles for each row execute function protect_org_flags();
