-- 아트잡스 2단계: 역할별 회원(예술가 · 기관), 프로필, 기관 직접 공고, 저장·지원, 알림 조건, 메신저.
-- 바로쌤의 users(role) → teacher_profiles / school_accounts, applications, bookmarks, alert_conditions,
-- conversations, messages, notifications 구조를 예술가/기관 역할로 옮겼다.
--
-- 원칙
--   1) 연락처(전화·이메일)는 어디에도 공개 칸을 두지 않는다. 기관 ↔ 예술가 연락은 messages 로만.
--   2) 사용자 위치는 본인 프로필(region·lat·lng)에만 두고, RLS 로 본인만 좌표를 읽는다.
--   3) 공고는 두 출처: crawled_postings(크롤러) 와 org_postings(기관 직접 등록). 화면은 둘을 합쳐 보여준다.
--      저장·지원은 (posting_source, posting_id) 쌍으로 어느 쪽 공고든 가리킨다.
-- 코드표(field·genre·role·board·employment_type)는 src/types/job.ts 와 같아야 한다.

-- ───────────────────────── 회원 ─────────────────────────
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null check (role in ('artist', 'organization')),
  display_name  text not null,
  status        text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 예술가(구직자) 프로필. 연락처 칸 없음 — 메신저로만 연결한다.
create table if not exists artist_profiles (
  user_id           uuid primary key references profiles(id) on delete cascade,
  field             text,                       -- art | music | dance | gugak | theater
  genres            text[] not null default '{}',
  roles             text[] not null default '{}',   -- performer | creator | education | planning | stage_tech | assistant
  employment_types  text[] not null default '{}',
  region            text,                       -- 시·도
  address_hint      text,                       -- 시·군·구 정도까지만 (공개)
  lat               double precision,           -- 본인만 읽는다 (RLS)
  lng               double precision,
  max_distance_km   integer not null default 30,
  career_years      integer,
  education         text,
  bio               text,
  career            text,                       -- 주요 경력·수상·전시·공연
  portfolio_url     text,
  photo_url         text,
  availability      text not null default 'open' check (availability in ('open', 'closed')),
  is_public         boolean not null default false,   -- 인재정보에 노출
  allow_messages    boolean not null default true,
  profile_completed boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 기관(구인자) 프로필. 담당자 연락처 칸 없음 — 지원·문의는 메신저.
create table if not exists org_profiles (
  user_id      uuid primary key references profiles(id) on delete cascade,
  org_name     text not null,
  org_type     text check (org_type in ('museum','gallery','theater','troupe','orchestra','foundation','school','academy','company','other')),
  field        text,
  region       text,
  address      text,
  lat          double precision,
  lng          double precision,
  website      text,
  intro        text,
  logo_url     text,
  is_verified  boolean not null default false,   -- 관리자가 사업자·기관 확인 후
  profile_completed boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists user_settings (
  user_id                  uuid primary key references profiles(id) on delete cascade,
  message_notification     boolean not null default true,
  new_posting_notification boolean not null default true,
  application_notification boolean not null default true,
  email_notification       boolean not null default true,
  updated_at               timestamptz not null default now()
);

-- 가입 시 profiles + 역할 프로필 + 설정을 자동 생성. 가입 폼이 넘긴 metadata(role, display_name, org_name)를 쓴다.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', 'artist');
  v_name text := coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1));
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

-- ───────────────────────── 기관 직접 공고 ─────────────────────────
-- crawled_postings 와 같은 표준 칸. 화면(src/lib/postings.ts)이 두 테이블을 합친다.
create table if not exists org_postings (
  id               uuid primary key default gen_random_uuid(),
  org_user_id      uuid not null references profiles(id) on delete cascade,
  board            text not null default 'job' check (board in ('job', 'audition', 'event')),
  field            text,
  genre            text,
  role             text,
  title            text not null,
  organization     text not null,               -- org_profiles.org_name 사본
  employment_type  text,
  employment_raw   text,
  region           text,
  address          text,
  lat              double precision,
  lng              double precision,
  salary           text,
  recruit_count    text,
  apply_start      date,
  apply_end        date,
  work_start       date,
  work_end         date,
  apply_method     text not null default 'messenger', -- messenger | external
  apply_url        text,                              -- external 일 때 기관 접수 페이지
  required_docs    text,
  description      text,
  status           text not null default 'open' check (status in ('draft', 'open', 'closed')),
  view_count       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index if not exists idx_op_open on org_postings(status, apply_end) where deleted_at is null;
create index if not exists idx_op_org on org_postings(org_user_id);
create index if not exists idx_op_field on org_postings(field);
create index if not exists idx_op_region on org_postings(region);

-- ───────────────────────── 저장 · 지원 ─────────────────────────
create table if not exists bookmarks (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  posting_source text not null check (posting_source in ('crawled', 'org', 'sample')),
  posting_id     text not null,
  created_at     timestamptz not null default now(),
  unique (user_id, posting_source, posting_id)
);

create table if not exists applications (
  id                uuid primary key default gen_random_uuid(),
  artist_user_id    uuid not null references profiles(id) on delete cascade,
  posting_source    text not null check (posting_source in ('crawled', 'org', 'sample')),
  posting_id        text not null,
  org_user_id       uuid references profiles(id) on delete set null,  -- org 공고일 때만
  posting_title     text not null,               -- 공고가 지워져도 이력이 남게 사본
  message           text,                        -- 지원 메시지(자기소개)
  status            text not null default 'submitted'
                    check (status in ('submitted', 'viewed', 'accepted', 'rejected', 'withdrawn')),
  status_changed_at timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  unique (artist_user_id, posting_source, posting_id)
);
create index if not exists idx_app_org on applications(org_user_id, created_at desc);

-- ───────────────────────── 알림 ─────────────────────────
-- 새 공고 알림 조건. 비어 있는 배열은 "전체".
create table if not exists alert_conditions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  name             text not null default '내 알림',
  boards           text[] not null default '{job,audition}',
  fields           text[] not null default '{}',
  genres           text[] not null default '{}',
  roles            text[] not null default '{}',
  employment_types text[] not null default '{}',
  regions          text[] not null default '{}',
  near_me          boolean not null default true,     -- 프로필 위치 기준 max_distance_km 안
  channels         text[] not null default '{in_app,email}',
  frequency        text not null default 'daily' check (frequency in ('instant', 'daily', 'weekly')),
  is_active        boolean not null default true,
  last_matched_at  timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  kind        text not null,   -- message | application | application_status | new_posting | system
  title       text not null,
  body        text,
  link_url    text,
  related_id  uuid,
  is_read     boolean not null default false,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_notif_user on notifications(user_id, is_read, created_at desc);

-- ───────────────────────── 메신저 ─────────────────────────
-- 예술가 1명 ↔ 기관 1곳당 대화방 하나. 공고 문맥은 참고용.
create table if not exists conversations (
  id              uuid primary key default gen_random_uuid(),
  artist_user_id  uuid not null references profiles(id) on delete cascade,
  org_user_id     uuid not null references profiles(id) on delete cascade,
  posting_source  text,
  posting_id      text,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  unique (artist_user_id, org_user_id)
);

create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_user_id  uuid not null references profiles(id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 4000),
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);
create index if not exists idx_msg_conv on messages(conversation_id, created_at);

create table if not exists user_blocks (
  id              uuid primary key default gen_random_uuid(),
  blocker_user_id uuid not null references profiles(id) on delete cascade,
  blocked_user_id uuid not null references profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique (blocker_user_id, blocked_user_id)
);

create table if not exists user_reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references profiles(id) on delete cascade,
  reported_user_id uuid not null references profiles(id) on delete cascade,
  context_type     text,   -- message | posting | profile
  context_id       text,
  category         text not null,
  detail           text,
  status           text not null default 'open' check (status in ('open', 'reviewed', 'closed')),
  created_at       timestamptz not null default now()
);

-- 메시지가 오면 대화방 갱신 + 상대에게 알림
create or replace function on_message_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_conv conversations%rowtype;
  v_recipient uuid;
  v_sender_name text;
begin
  select * into v_conv from conversations where id = new.conversation_id;
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  v_recipient := case when new.sender_user_id = v_conv.artist_user_id then v_conv.org_user_id else v_conv.artist_user_id end;
  select display_name into v_sender_name from profiles where id = new.sender_user_id;
  insert into notifications (user_id, kind, title, body, link_url, related_id)
    values (v_recipient, 'message', coalesce(v_sender_name, '상대') || '님의 새 메시지',
            left(new.body, 80), '/messages/' || new.conversation_id, new.conversation_id);
  return new;
end $$;

drop trigger if exists trg_message_insert on messages;
create trigger trg_message_insert after insert on messages for each row execute function on_message_insert();

-- 지원이 들어오면 기관에 알림
create or replace function on_application_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if new.org_user_id is not null then
    select display_name into v_name from profiles where id = new.artist_user_id;
    insert into notifications (user_id, kind, title, body, link_url, related_id)
      values (new.org_user_id, 'application', coalesce(v_name, '예술가') || '님이 지원했습니다',
              new.posting_title, '/me/postings', new.id);
  end if;
  return new;
end $$;

drop trigger if exists trg_application_insert on applications;
create trigger trg_application_insert after insert on applications for each row execute function on_application_insert();

-- 지원 상태가 바뀌면 예술가에게 알림
create or replace function on_application_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status in ('viewed', 'accepted', 'rejected') then
    insert into notifications (user_id, kind, title, body, link_url, related_id)
      values (new.artist_user_id, 'application_status',
              case new.status when 'viewed' then '기관이 지원서를 확인했습니다'
                              when 'accepted' then '지원이 수락되었습니다'
                              else '지원 결과가 나왔습니다' end,
              new.posting_title, '/me/applications', new.id);
  end if;
  return new;
end $$;

drop trigger if exists trg_application_status on applications;
create trigger trg_application_status after update on applications for each row execute function on_application_status();

-- 차단 관계 확인. user_blocks 는 본인 행만 보이므로(RLS) 정책 안에서는 이 함수로 양쪽을 다 본다.
create or replace function is_blocked_pair(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_blocks
    where (blocker_user_id = a and blocked_user_id = b) or (blocker_user_id = b and blocked_user_id = a)
  )
$$;
revoke all on function is_blocked_pair(uuid, uuid) from public;
grant execute on function is_blocked_pair(uuid, uuid) to authenticated;

-- ───────────────────────── RLS ─────────────────────────
alter table profiles          enable row level security;
alter table artist_profiles   enable row level security;
alter table org_profiles      enable row level security;
alter table user_settings     enable row level security;
alter table org_postings      enable row level security;
alter table bookmarks         enable row level security;
alter table applications      enable row level security;
alter table alert_conditions  enable row level security;
alter table notifications     enable row level security;
alter table conversations     enable row level security;
alter table messages          enable row level security;
alter table user_blocks       enable row level security;
alter table user_reports      enable row level security;

-- profiles: 로그인 사용자는 서로의 표시 이름·역할을 볼 수 있다(개인정보 없음). 수정은 본인만.
create policy "profiles read (authenticated)" on profiles for select to authenticated using (true);
create policy "profiles update own" on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- artist_profiles: 본인 전체, 다른 로그인 사용자는 공개 프로필만. 좌표(lat·lng)는 뷰로 가린다.
create policy "artist read own" on artist_profiles for select to authenticated using (user_id = auth.uid());
create policy "artist read public" on artist_profiles for select to authenticated using (is_public = true);
create policy "artist update own" on artist_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 인재정보 목록이 읽는 공개 뷰. 좌표는 빼고 시·군·구까지만.
create or replace view talents_public with (security_invoker = true) as
  select a.user_id, p.display_name, a.field, a.genres, a.roles, a.employment_types, a.region, a.address_hint,
         a.career_years, a.education, a.bio, a.career, a.portfolio_url, a.photo_url, a.availability,
         a.allow_messages, a.updated_at
  from artist_profiles a join profiles p on p.id = a.user_id
  where a.is_public = true and a.profile_completed = true and p.status = 'active';

-- org_profiles: 누구나(비로그인 포함) 기관 소개를 볼 수 있다. 수정은 본인.
create policy "org read all" on org_profiles for select using (true);
create policy "org update own" on org_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "settings own" on user_settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- org_postings: 모집중 공고는 누구나. 작성·수정·삭제는 기관 본인.
create policy "org_postings public read" on org_postings for select using (status = 'open' and deleted_at is null);
create policy "org_postings owner read" on org_postings for select to authenticated using (org_user_id = auth.uid());
create policy "org_postings owner insert" on org_postings for insert to authenticated
  with check (org_user_id = auth.uid() and exists (select 1 from profiles where id = auth.uid() and role = 'organization'));
create policy "org_postings owner update" on org_postings for update to authenticated using (org_user_id = auth.uid()) with check (org_user_id = auth.uid());
create policy "org_postings owner delete" on org_postings for delete to authenticated using (org_user_id = auth.uid());

create policy "bookmarks own" on bookmarks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- applications: 예술가 본인은 전체, 기관은 자기 공고에 온 지원만(상태 변경 가능).
create policy "applications artist" on applications for select to authenticated using (artist_user_id = auth.uid());
create policy "applications artist insert" on applications for insert to authenticated
  with check (artist_user_id = auth.uid() and exists (select 1 from profiles where id = auth.uid() and role = 'artist'));
create policy "applications artist withdraw" on applications for update to authenticated
  using (artist_user_id = auth.uid()) with check (artist_user_id = auth.uid());
create policy "applications org read" on applications for select to authenticated using (org_user_id = auth.uid());
create policy "applications org status" on applications for update to authenticated
  using (org_user_id = auth.uid()) with check (org_user_id = auth.uid());

create policy "alerts own" on alert_conditions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications own read" on notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications own update" on notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- conversations: 참여자만. 시작은 어느 쪽이든 가능하되 차단 관계면 불가.
create policy "conv participants" on conversations for select to authenticated
  using (artist_user_id = auth.uid() or org_user_id = auth.uid());
create policy "conv create" on conversations for insert to authenticated
  with check (
    (artist_user_id = auth.uid() or org_user_id = auth.uid())
    and exists (select 1 from profiles where id = artist_user_id and role = 'artist')
    and exists (select 1 from profiles where id = org_user_id and role = 'organization')
    and not is_blocked_pair(artist_user_id, org_user_id)
  );

create policy "messages participants" on messages for select to authenticated
  using (exists (select 1 from conversations c where c.id = conversation_id
                 and (c.artist_user_id = auth.uid() or c.org_user_id = auth.uid())));
create policy "messages send" on messages for insert to authenticated
  with check (
    sender_user_id = auth.uid()
    and exists (select 1 from conversations c where c.id = conversation_id
                and (c.artist_user_id = auth.uid() or c.org_user_id = auth.uid())
                and not is_blocked_pair(c.artist_user_id, c.org_user_id))
  );
create policy "messages mark read" on messages for update to authenticated
  using (exists (select 1 from conversations c where c.id = conversation_id
                 and (c.artist_user_id = auth.uid() or c.org_user_id = auth.uid())));

create policy "blocks own" on user_blocks for all to authenticated using (blocker_user_id = auth.uid()) with check (blocker_user_id = auth.uid());
create policy "reports own" on user_reports for insert to authenticated with check (reporter_user_id = auth.uid());
create policy "reports read own" on user_reports for select to authenticated using (reporter_user_id = auth.uid());

-- updated_at 자동 갱신
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
do $$
declare t text;
begin
  foreach t in array array['profiles','artist_profiles','org_profiles','user_settings','org_postings','alert_conditions']
  loop
    execute format('drop trigger if exists trg_touch_%s on %s', t, t);
    execute format('create trigger trg_touch_%s before update on %s for each row execute function touch_updated_at()', t, t);
  end loop;
end $$;
