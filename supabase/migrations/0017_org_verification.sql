-- 기관 인증 서류 — 기관이 사업자등록증·고유번호증 등을 올리고, 운영자가 그걸 보고 인증하거나 보완을 요청한다.
--   1) org_verifications: 기관당 1행. 서류 종류·등록번호·파일 경로·심사 상태·운영자 메모.
--      org_profiles 는 누구나 읽을 수 있으므로(공고에 기관 정보 표시) 등록번호·서류는 따로 둔다. 본인과 운영자만 읽는다.
--   2) Storage 버킷 org-docs (비공개): 파일은 {user_id}/{시각}.{확장자} 에 둔다. 본인 폴더에만 올리고, 본인·운영자만 연다.
--      운영자 화면은 5분짜리 서명 링크로 연다.
--   3) 기관이 내거나 다시 내면 상태는 무조건 submitted(확인 대기). approved·needs_more 는 운영자만 바꾼다(트리거).
--   4) 운영자가 보완을 요청하면(needs_more) 기관에 알림이 간다.
--
-- 실행: Supabase SQL Editor 에서 이 파일 전체를 Run. 여러 번 실행해도 안전.

-- ───────────────────────── 1. 서류 제출 기록 ─────────────────────────
create table if not exists org_verifications (
  user_id       uuid primary key references org_profiles(user_id) on delete cascade,
  doc_type      text check (doc_type in ('business', 'unique_no', 'nonprofit', 'other')),
                -- business 사업자등록증 | unique_no 고유번호증 | nonprofit 비영리법인 설립허가증 | other 기타
  reg_number    text,             -- 사업자등록번호·고유번호(숫자 10자리). other 는 비워도 된다.
  doc_path      text,             -- org-docs 버킷 안 경로. 운영자가 서류 없이 보완 요청만 보낸 경우 null.
  doc_name      text,             -- 기관이 올린 원래 파일 이름(표시용)
  status        text not null default 'submitted' check (status in ('submitted', 'needs_more', 'approved')),
  admin_note    text,             -- 보완 요청 사유(기관에게 보인다)
  submitted_at  timestamptz,
  reviewed_at   timestamptz,
  reviewed_by   uuid references profiles(id) on delete set null,
  updated_at    timestamptz not null default now()
);
create index if not exists idx_org_verif_status on org_verifications(status);

alter table org_verifications enable row level security;
drop policy if exists "org verif read own" on org_verifications;
create policy "org verif read own" on org_verifications for select to authenticated using (user_id = auth.uid() or is_admin());
drop policy if exists "org verif insert own" on org_verifications;
create policy "org verif insert own" on org_verifications for insert to authenticated with check (user_id = auth.uid() or is_admin());
drop policy if exists "org verif update own" on org_verifications;
create policy "org verif update own" on org_verifications for update to authenticated
  using (user_id = auth.uid() or is_admin()) with check (user_id = auth.uid() or is_admin());
drop policy if exists "org verif delete own" on org_verifications;
create policy "org verif delete own" on org_verifications for delete to authenticated using (user_id = auth.uid());

-- 기관 본인이 쓰면 심사 칸은 운영자 몫으로 되돌린다.
create or replace function protect_org_verification() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if auth.uid() is not null and not public.is_admin() then
    new.status := 'submitted';
    new.submitted_at := now();
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.admin_note := case when tg_op = 'UPDATE' then old.admin_note else null end;
  end if;
  return new;
end $$;
drop trigger if exists trg_protect_org_verification on org_verifications;
create trigger trg_protect_org_verification before insert or update on org_verifications
  for each row execute function protect_org_verification();

-- 보완 요청이 걸리면 기관에 알림
create or replace function on_org_verification_needs_more() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'needs_more' and (tg_op = 'INSERT' or old.status is distinct from 'needs_more' or old.admin_note is distinct from new.admin_note) then
    insert into notifications (user_id, kind, title, body, link_url)
      values (new.user_id, 'system', '기관 인증 서류 보완 요청',
              coalesce(nullif(new.admin_note, ''), '기관 인증을 위해 서류를 확인해 주세요.'), '/me/profile#verify');
  end if;
  return new;
end $$;
drop trigger if exists trg_org_verification_needs_more on org_verifications;
create trigger trg_org_verification_needs_more after insert or update on org_verifications
  for each row execute function on_org_verification_needs_more();

-- ───────────────────────── 2. 서류 파일 버킷 ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('org-docs', 'org-docs', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "org docs upload own" on storage.objects;
create policy "org docs upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'org-docs' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "org docs read own or admin" on storage.objects;
create policy "org docs read own or admin" on storage.objects for select to authenticated
  using (bucket_id = 'org-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "org docs delete own" on storage.objects;
create policy "org docs delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'org-docs' and (storage.foldername(name))[1] = auth.uid()::text);
