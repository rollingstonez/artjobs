-- 소셜 로그인(카카오·구글·애플) 대응.
--   1) 가입 트리거: 소셜 제공자가 넘기는 이름(full_name·name·nickname)도 표시 이름으로 쓴다.
--      카카오는 이메일 동의를 안 하면 email 이 비어 올 수 있으므로 이름이 하나도 없으면 '회원' 으로.
--   2) choose_signup_role(): 소셜로 처음 가입한 직후, 가입 화면에서 고른 역할(예술가/기관)로 바꾼다.
--      소셜 가입은 metadata 를 못 넘기므로 트리거는 일단 artist 로 만들고, 콜백에서 이 함수를 부른다.
--      가입 10분 안에만 허용 → 나중에 링크를 다시 눌러도 역할이 뒤바뀌지 않는다.

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
begin
  if v_role not in ('artist', 'organization') then v_role := 'artist'; end if;
  insert into profiles (id, role, display_name) values (new.id, v_role, v_name);
  insert into user_settings (user_id) values (new.id);
  if v_role = 'artist' then
    insert into artist_profiles (user_id) values (new.id);
  else
    insert into org_profiles (user_id, org_name)
      values (new.id, coalesce(nullif(new.raw_user_meta_data->>'org_name', ''), v_name));
  end if;
  return new;
end $$;

-- 반환값: 'switched'(역할 바꿈) | 'kept'(이미 그 역할) | 'ignored'(가입 10분 지남 → 무시)
create or replace function choose_signup_role(p_role text, p_org_name text default null)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_profile profiles%rowtype;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if p_role not in ('artist', 'organization') then raise exception 'bad role'; end if;

  select * into v_profile from profiles where id = v_uid;
  if not found then raise exception 'no profile'; end if;
  if v_profile.role = p_role then return 'kept'; end if;
  if v_profile.created_at < now() - interval '10 minutes' then return 'ignored'; end if;

  if p_role = 'organization' then
    delete from artist_profiles where user_id = v_uid;
    insert into org_profiles (user_id, org_name)
      values (v_uid, coalesce(nullif(p_org_name, ''), v_profile.display_name))
      on conflict (user_id) do nothing;
  else
    delete from org_profiles where user_id = v_uid;
    insert into artist_profiles (user_id) values (v_uid) on conflict (user_id) do nothing;
  end if;
  update profiles set role = p_role where id = v_uid;
  return 'switched';
end $$;

revoke all on function choose_signup_role(text, text) from public;
grant execute on function choose_signup_role(text, text) to authenticated;
