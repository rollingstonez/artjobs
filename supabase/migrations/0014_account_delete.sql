-- 회원 탈퇴 + 활성 회원 명단.
--   1) delete_my_account(): 회원이 스스로 계정을 지운다. 개인정보처리방침 제8조("탈퇴로 동의 철회")를 실제로 지키는 장치.
--      · 개인정보는 지우고 계정은 'deleted' 로 잠근다(익명화). auth 계정 행 자체는 남는다 —
--        앱이 service role 을 쓰지 않아 auth.users 를 지울 수 없고, 지우면 상대 기관의 지원자 기록·대화까지
--        연쇄로 사라지기 때문이다(개인정보처리방침 제4조: 상대방 기록은 보관 기간을 따른다).
--      · 지우는 것: 프로필 본문(소개·경력·학력·사진·포트폴리오 링크·좌표), 포트폴리오 항목, 저장한 공고,
--        알림 조건, 안 읽은 알림, 구직 글(내림), 내가 올린 공고(마감·내림), 표시 이름(→ '탈퇴한 회원').
--      · 남기는 것: 지원 기록과 대화방(상대방의 기록), 지원서 스냅샷(공고별 보관 기간이 지나면 파기됨).
--   2) admin_active_users(): 최근 N일 안에 로그인한 회원 명단(운영자 전용). 통계의 "활성" 숫자를 눌러 확인한다.
--
-- 실행: Supabase SQL Editor 에서 이 파일 전체를 Run. 여러 번 실행해도 안전.

-- 0007 의 protect_profile_flags 트리거는 본인이 자기 status 를 바꾸는 것을 막는다(정지 우회 방지).
-- 탈퇴는 본인이 하는 일이므로, "본인이 활성 계정을 deleted 로 바꾸는 경우" 하나만 좁게 열어 준다.
-- 그 밖의 상태 변경과 is_admin 변경은 여전히 운영자만 할 수 있다.
create or replace function protect_profile_flags() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.is_admin is distinct from old.is_admin then raise exception 'is_admin can only be changed by an admin'; end if;
    if new.status is distinct from old.status
       and not (new.id = auth.uid() and old.status = 'active' and new.status = 'deleted') then
      raise exception 'status can only be changed by an admin';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_protect_profile_flags on profiles;
create trigger trg_protect_profile_flags before update on profiles for each row execute function protect_profile_flags();

create or replace function delete_my_account() returns boolean
language plpgsql security definer set search_path = public as $$
declare v_id uuid := auth.uid();
begin
  if v_id is null then return false; end if;
  -- 운영자 계정은 여기서 지우지 않는다(권한을 먼저 내려놓아야 한다).
  if coalesce((select is_admin from profiles where id = v_id), false) then
    raise exception '운영자 계정은 탈퇴할 수 없습니다. 다른 운영자에게 권한 해제를 먼저 요청하세요.';
  end if;

  -- 예술가 프로필: 본문·연락 수단이 될 만한 값 전부 비우고 공개 끄기
  update artist_profiles set
    field = null, genres = '{}', roles = '{}', employment_types = '{}',
    region = null, address_hint = null, lat = null, lng = null,
    career_years = null, education = null, bio = null, career = null,
    portfolio_url = null, photo_url = null,
    availability = 'closed', is_public = false, allow_messages = false, profile_completed = false
  where user_id = v_id;
  delete from artist_portfolio_items where user_id = v_id;

  -- 기관 프로필: 기관 정보 비우고 인증 해제
  update org_profiles set
    org_name = '탈퇴한 기관', org_type = null, field = null, region = null, address = null,
    lat = null, lng = null, website = null, intro = null, logo_url = null,
    is_verified = false, profile_completed = false
  where user_id = v_id;

  -- 내가 올린 것 내리기
  update org_postings set status = 'closed', deleted_at = coalesce(deleted_at, now()) where org_user_id = v_id and deleted_at is null;
  update seeking_posts set status = 'closed', deleted_at = coalesce(deleted_at, now()) where artist_user_id = v_id and deleted_at is null;

  -- 내 편의 데이터
  delete from bookmarks where user_id = v_id;
  delete from alert_conditions where user_id = v_id;
  delete from notifications where user_id = v_id;

  -- 계정 잠그기 + 이름 익명화 (프로필 사본이 남는 곳도 함께 바꾼다)
  update seeking_posts set display_name = '탈퇴한 회원' where artist_user_id = v_id;
  update profiles set display_name = '탈퇴한 회원', status = 'deleted' where id = v_id;
  return true;
end $$;
revoke all on function delete_my_account() from public;
grant execute on function delete_my_account() to authenticated;

-- 최근 p_days 일 안에 로그인한 회원 명단(운영자 전용).
create or replace function admin_active_users(p_days int default 7, p_limit int default 300)
returns table (id uuid, display_name text, role text, email text, is_admin boolean, last_sign_in_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
    select p.id, p.display_name, p.role, u.email::text, p.is_admin, u.last_sign_in_at, p.created_at
    from profiles p join auth.users u on u.id = p.id
    where p.status <> 'deleted'
      and u.last_sign_in_at >= now() - make_interval(days => greatest(1, least(p_days, 365)))
    order by u.last_sign_in_at desc
    limit greatest(1, least(p_limit, 1000));
end $$;
revoke all on function admin_active_users(int, int) from public;
grant execute on function admin_active_users(int, int) to authenticated;
