-- 아트잡스 3단계: 구인 과정을 아트잡스 안에서 끝내기 — 심사 작업대.
--   1) 포트폴리오 여러 개(영상·이미지·음원·링크·문서)  → artist_portfolio_items
--   2) 기관 구성원(직원)과 공고별 심사위원(외부 초빙)   → org_members, posting_reviewers (이메일 초청 + 초대 링크)
--   3) 심사 기록: 심사자별 점수·메모, 심사위원끼리는 서로 안 보임 → application_reviews
--   4) 선발 단계: 접수 → 확인 → 서류통과 → 오디션·면접 → 최종선발/불합격   (applications.status 확장)
--   5) 자료 보관: 지원 시점 프로필 스냅샷(profile_snapshot) + 공고별 보관 기간(retention_days) + 파기 함수
--
-- 권한 원칙
--   기관 계정(org_user_id) = 소유자. org_members 의 admin 은 구성원·심사위원 관리와 공고 수정까지, member 는 지원자 열람·상태 변경까지.
--   posting_reviewers 는 그 공고 하나만: 지원자 열람 + 자기 점수·메모. 상태 변경 불가, 남의 점수 못 봄.
--   초청받는 사람은 어떤 역할이든(예술가 계정도) 될 수 있다.

-- ───────────────────────── 포트폴리오 ─────────────────────────
create table if not exists artist_portfolio_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  kind        text not null default 'link' check (kind in ('video', 'image', 'audio', 'link', 'document')),
  title       text,
  url         text not null check (url ~* '^https?://'),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_portfolio_user on artist_portfolio_items(user_id, sort_order);

-- ───────────────────────── 기관 구성원 · 공고별 심사위원 ─────────────────────────
create table if not exists org_members (
  id              uuid primary key default gen_random_uuid(),
  org_user_id     uuid not null references profiles(id) on delete cascade,   -- 기관 계정
  member_user_id  uuid references profiles(id) on delete cascade,            -- 수락하면 채워짐
  email           text not null,
  role            text not null default 'member' check (role in ('admin', 'member')),
  status          text not null default 'pending' check (status in ('pending', 'active')),
  token           text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  accepted_at     timestamptz
);
create unique index if not exists uq_org_member_user on org_members(org_user_id, member_user_id) where member_user_id is not null;
create unique index if not exists uq_org_member_email on org_members(org_user_id, lower(email));

create table if not exists posting_reviewers (
  id           uuid primary key default gen_random_uuid(),
  posting_id   uuid not null references org_postings(id) on delete cascade,
  user_id      uuid references profiles(id) on delete cascade,
  email        text not null,
  status       text not null default 'pending' check (status in ('pending', 'active')),
  token        text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz
);
create unique index if not exists uq_reviewer_user on posting_reviewers(posting_id, user_id) where user_id is not null;
create unique index if not exists uq_reviewer_email on posting_reviewers(posting_id, lower(email));

-- ───────────────────────── 지원서 확장 ─────────────────────────
alter table applications drop constraint if exists applications_status_check;
alter table applications add constraint applications_status_check
  check (status in ('submitted', 'viewed', 'shortlisted', 'interview', 'accepted', 'rejected', 'withdrawn'));
alter table applications add column if not exists profile_snapshot jsonb;   -- 지원 시점의 프로필·포트폴리오 사본
alter table applications add column if not exists purged_at timestamptz;    -- 보관 기간 지나 개인정보를 지운 시각
create index if not exists idx_app_posting on applications(posting_source, posting_id, created_at);

alter table org_postings add column if not exists retention_days integer not null default 180
  check (retention_days between 30 and 1095);

-- 심사 기록. 심사자 1명 × 지원서 1건 = 1행.
create table if not exists application_reviews (
  id               uuid primary key default gen_random_uuid(),
  application_id   uuid not null references applications(id) on delete cascade,
  reviewer_user_id uuid not null references profiles(id) on delete cascade,
  score            integer check (score between 0 and 100),
  memo             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (application_id, reviewer_user_id)
);
create index if not exists idx_review_app on application_reviews(application_id);

-- ───────────────────────── 권한 판정 함수 ─────────────────────────
create or replace function is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() = p_org
      or exists (select 1 from org_members where org_user_id = p_org and member_user_id = auth.uid() and status = 'active')
$$;

create or replace function is_org_admin(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() = p_org
      or exists (select 1 from org_members where org_user_id = p_org and member_user_id = auth.uid() and status = 'active' and role = 'admin')
$$;

create or replace function posting_org(p_posting uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select org_user_id from org_postings where id = p_posting
$$;

create or replace function is_posting_reviewer(p_posting uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from posting_reviewers where posting_id = p_posting and user_id = auth.uid() and status = 'active')
$$;

-- 지원자 열람 가능? (기관 소유자·구성원·그 공고 심사위원)
create or replace function can_see_applicants(p_posting uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_org_member(posting_org(p_posting)) or is_posting_reviewer(p_posting)
$$;

-- applications 는 posting_id 가 text 라 안전하게 형변환해서 판정한다.
create or replace function can_see_application(p_source text, p_posting text) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  if p_source <> 'org' then return false; end if;
  return can_see_applicants(p_posting::uuid);
exception when others then
  return false;
end $$;

create or replace function can_manage_application(p_source text, p_posting text) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  if p_source <> 'org' then return false; end if;
  return is_org_member(posting_org(p_posting::uuid));
exception when others then
  return false;
end $$;

do $$ begin
  revoke all on function is_org_member(uuid), is_org_admin(uuid), posting_org(uuid), is_posting_reviewer(uuid),
    can_see_applicants(uuid), can_see_application(text, text), can_manage_application(text, text) from public;
  grant execute on function is_org_member(uuid), is_org_admin(uuid), posting_org(uuid), is_posting_reviewer(uuid),
    can_see_applicants(uuid), can_see_application(text, text), can_manage_application(text, text) to authenticated;
end $$;

-- 이메일로 가입된 회원 찾기(초청할 때 바로 연결해서 앱 알림을 보내려고). 기관 소유자·구성원만 부를 수 있다.
create or replace function resolve_user_by_email(p_email text) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then return null; end if;
  if not exists (select 1 from profiles where id = auth.uid() and role = 'organization')
     and not exists (select 1 from org_members where member_user_id = auth.uid() and status = 'active') then
    return null;
  end if;
  select u.id into v_id from auth.users u where lower(u.email) = lower(trim(p_email)) limit 1;
  return v_id;
end $$;
revoke all on function resolve_user_by_email(text) from public;
grant execute on function resolve_user_by_email(text) to authenticated;

-- 초대 링크 미리보기. 토큰만 알면 어떤 초대인지(기관명·공고 제목·초대 이메일) 보여준다.
create or replace function get_invitation(p_token text)
returns table (kind text, org_name text, posting_title text, email text, status text, role text)
language sql stable security definer set search_path = public as $$
  select 'member'::text, o.org_name, null::text, m.email, m.status, m.role
  from org_members m join org_profiles o on o.user_id = m.org_user_id
  where m.token = p_token
  union all
  select 'reviewer'::text, o.org_name, p.title, r.email, r.status, 'reviewer'::text
  from posting_reviewers r join org_postings p on p.id = r.posting_id join org_profiles o on o.user_id = p.org_user_id
  where r.token = p_token
$$;

-- 초대 수락. 초대 이메일과 로그인 이메일이 다르면 거절(이메일 없는 소셜 계정은 통과).
-- 반환: 'member:<org_user_id>' | 'reviewer:<posting_id>' | 'already' | 'email_mismatch' | 'not_found'
create or replace function accept_invitation(p_token text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  m org_members%rowtype;
  r posting_reviewers%rowtype;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  select email into v_email from auth.users where id = v_uid;

  select * into m from org_members where token = p_token;
  if found then
    if m.status = 'active' then return 'already'; end if;
    if v_email is not null and lower(v_email) <> lower(m.email) then return 'email_mismatch'; end if;
    if exists (select 1 from org_members where org_user_id = m.org_user_id and member_user_id = v_uid) then
      delete from org_members where id = m.id; return 'already';
    end if;
    update org_members set member_user_id = v_uid, status = 'active', accepted_at = now() where id = m.id;
    return 'member:' || m.org_user_id;
  end if;

  select * into r from posting_reviewers where token = p_token;
  if found then
    if r.status = 'active' then return 'already'; end if;
    if v_email is not null and lower(v_email) <> lower(r.email) then return 'email_mismatch'; end if;
    if exists (select 1 from posting_reviewers where posting_id = r.posting_id and user_id = v_uid) then
      delete from posting_reviewers where id = r.id; return 'already';
    end if;
    update posting_reviewers set user_id = v_uid, status = 'active', accepted_at = now() where id = r.id;
    return 'reviewer:' || r.posting_id;
  end if;
  return 'not_found';
end $$;
revoke all on function get_invitation(text), accept_invitation(text) from public;
grant execute on function get_invitation(text), accept_invitation(text) to authenticated;

-- ───────────────────────── 트리거 ─────────────────────────
-- 지원 시점 프로필·포트폴리오 스냅샷. 나중에 프로필을 고쳐도 심사 때 본 자료는 그대로.
create or replace function snapshot_applicant() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_snap jsonb;
begin
  if new.profile_snapshot is null then
    select jsonb_build_object(
      'display_name', p.display_name,
      'field', a.field, 'genres', a.genres, 'roles', a.roles, 'employment_types', a.employment_types,
      'region', a.region, 'address_hint', a.address_hint,
      'career_years', a.career_years, 'education', a.education, 'bio', a.bio, 'career', a.career,
      'portfolio_url', a.portfolio_url, 'photo_url', a.photo_url,
      'portfolio', coalesce((
        select jsonb_agg(jsonb_build_object('kind', i.kind, 'title', i.title, 'url', i.url) order by i.sort_order, i.created_at)
        from artist_portfolio_items i where i.user_id = new.artist_user_id), '[]'::jsonb),
      'captured_at', now()
    ) into v_snap
    from profiles p left join artist_profiles a on a.user_id = p.id
    where p.id = new.artist_user_id;
    new.profile_snapshot := v_snap;
  end if;
  return new;
end $$;
drop trigger if exists trg_snapshot_applicant on applications;
create trigger trg_snapshot_applicant before insert on applications for each row execute function snapshot_applicant();

-- 지원 상태 알림: 단계가 늘어난 만큼 문구도 늘린다.
create or replace function on_application_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status in ('viewed', 'shortlisted', 'interview', 'accepted', 'rejected') then
    insert into notifications (user_id, kind, title, body, link_url, related_id)
      values (new.artist_user_id, 'application_status',
              case new.status when 'viewed' then '기관이 지원서를 확인했습니다'
                              when 'shortlisted' then '서류 심사를 통과했습니다'
                              when 'interview' then '오디션·면접 대상자로 선정되었습니다'
                              when 'accepted' then '최종 선발되었습니다'
                              else '지원 결과가 나왔습니다' end,
              new.posting_title, '/me/applications', new.id);
  end if;
  return new;
end $$;

-- 초청받은 사람이 이미 회원이면 앱 알림.
create or replace function on_member_invite() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_org text;
begin
  if new.member_user_id is not null and new.status = 'pending' then
    select org_name into v_org from org_profiles where user_id = new.org_user_id;
    insert into notifications (user_id, kind, title, body, link_url, related_id)
      values (new.member_user_id, 'invite', coalesce(v_org, '기관') || '의 구성원으로 초청받았습니다',
              '수락하면 그 기관의 공고와 지원자를 함께 볼 수 있습니다.', '/invite/' || new.token, new.id);
  end if;
  return new;
end $$;
drop trigger if exists trg_member_invite on org_members;
create trigger trg_member_invite after insert on org_members for each row execute function on_member_invite();

create or replace function on_reviewer_invite() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_org text; v_title text;
begin
  if new.user_id is not null and new.status = 'pending' then
    select p.title, o.org_name into v_title, v_org
      from org_postings p join org_profiles o on o.user_id = p.org_user_id where p.id = new.posting_id;
    insert into notifications (user_id, kind, title, body, link_url, related_id)
      values (new.user_id, 'invite', coalesce(v_org, '기관') || '의 심사위원으로 초청받았습니다',
              coalesce(v_title, ''), '/invite/' || new.token, new.id);
  end if;
  return new;
end $$;
drop trigger if exists trg_reviewer_invite on posting_reviewers;
create trigger trg_reviewer_invite after insert on posting_reviewers for each row execute function on_reviewer_invite();

drop trigger if exists trg_touch_application_reviews on application_reviews;
create trigger trg_touch_application_reviews before update on application_reviews for each row execute function touch_updated_at();

-- ───────────────────────── 보관 기간 · 파기 ─────────────────────────
-- 공고가 마감(또는 접수 종료)된 뒤 retention_days 가 지난 지원서의 개인정보(스냅샷·지원 메시지)를 지운다.
-- 행과 상태·점수는 남겨 지원자 본인의 지원 내역과 기관의 통계는 유지된다.
create or replace function purge_expired_applications(p_org uuid default null) returns integer
language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  -- 기관을 지정하면 그 기관의 관리자만. 지정하지 않는 전체 정리는 로그인 세션이 아닌 pg_cron(서버) 실행만 허용.
  if p_org is not null and not is_org_admin(p_org) then raise exception 'not allowed'; end if;
  if p_org is null and auth.uid() is not null then raise exception 'not allowed'; end if;
  with due as (
    select a.id from applications a
    join org_postings p on a.posting_source = 'org' and p.id::text = a.posting_id
    where a.purged_at is null
      and (p_org is null or p.org_user_id = p_org)
      and coalesce(
            case when p.status = 'closed' then p.updated_at::date else null end,
            p.apply_end
          ) is not null
      and coalesce(
            case when p.status = 'closed' then p.updated_at::date else null end,
            p.apply_end
          ) + p.retention_days < current_date
  )
  update applications a set profile_snapshot = null, message = null, purged_at = now()
  from due where a.id = due.id;
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke all on function purge_expired_applications(uuid) from public;
grant execute on function purge_expired_applications(uuid) to authenticated;
-- 자동 실행을 원하면 pg_cron 확장을 켠 뒤:  select cron.schedule('purge-applications', '0 3 * * *', $$select purge_expired_applications()$$);

-- ───────────────────────── RLS ─────────────────────────
alter table artist_portfolio_items enable row level security;
alter table org_members            enable row level security;
alter table posting_reviewers      enable row level security;
alter table application_reviews    enable row level security;

-- 포트폴리오: 본인 전체, 공개 프로필이면 로그인 사용자 누구나. 지원서에는 스냅샷으로 남으므로 심사자는 그걸 본다.
create policy "portfolio own" on artist_portfolio_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "portfolio public read" on artist_portfolio_items for select to authenticated
  using (exists (select 1 from artist_profiles a where a.user_id = artist_portfolio_items.user_id and a.is_public = true));

-- 구성원: 같은 기관 사람끼리 목록을 본다. 초청·해제는 admin. 본인은 탈퇴(삭제) 가능.
create policy "members read" on org_members for select to authenticated
  using (is_org_member(org_user_id) or member_user_id = auth.uid());
create policy "members insert" on org_members for insert to authenticated with check (is_org_admin(org_user_id));
create policy "members update" on org_members for update to authenticated using (is_org_admin(org_user_id)) with check (is_org_admin(org_user_id));
create policy "members delete" on org_members for delete to authenticated
  using (is_org_admin(org_user_id) or member_user_id = auth.uid());

-- 심사위원: 지원자를 볼 수 있는 사람은 심사위원 명단도 본다. 초청·해제는 admin. 본인은 사퇴 가능.
create policy "reviewers read" on posting_reviewers for select to authenticated
  using (can_see_applicants(posting_id) or user_id = auth.uid());
create policy "reviewers insert" on posting_reviewers for insert to authenticated with check (is_org_admin(posting_org(posting_id)));
create policy "reviewers delete" on posting_reviewers for delete to authenticated
  using (is_org_admin(posting_org(posting_id)) or user_id = auth.uid());

-- 심사 기록: 자기 것은 전부, 기관 소유자·구성원은 그 기관 공고의 전부. 심사위원끼리는 서로 못 본다.
create policy "reviews read own" on application_reviews for select to authenticated using (reviewer_user_id = auth.uid());
create policy "reviews read org" on application_reviews for select to authenticated
  using (exists (select 1 from applications a where a.id = application_id and can_manage_application(a.posting_source, a.posting_id)));
create policy "reviews write own" on application_reviews for insert to authenticated
  with check (reviewer_user_id = auth.uid()
    and exists (select 1 from applications a where a.id = application_id and can_see_application(a.posting_source, a.posting_id)));
create policy "reviews update own" on application_reviews for update to authenticated
  using (reviewer_user_id = auth.uid()) with check (reviewer_user_id = auth.uid());
create policy "reviews delete own" on application_reviews for delete to authenticated using (reviewer_user_id = auth.uid());

-- 지원서: 구성원·심사위원도 읽고, 상태 변경은 소유자·구성원만.
create policy "applications team read" on applications for select to authenticated
  using (can_see_application(posting_source, posting_id));
create policy "applications team status" on applications for update to authenticated
  using (can_manage_application(posting_source, posting_id)) with check (can_manage_application(posting_source, posting_id));

-- 기관 공고: 구성원·심사위원은 임시저장·마감 공고도 읽는다. 수정은 admin 까지.
create policy "org_postings team read" on org_postings for select to authenticated
  using (is_org_member(org_user_id) or is_posting_reviewer(id));
create policy "org_postings admin update" on org_postings for update to authenticated
  using (is_org_admin(org_user_id)) with check (is_org_admin(org_user_id));

-- 기관 프로필은 이미 누구나 읽을 수 있다(0004). 심사 화면의 기관명 표시는 그걸 쓴다.
