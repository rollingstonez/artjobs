-- 인증 기관 뱃지 + 운영자 활동 로그.
--   1) org_postings.org_verified — 공고 목록에서 조인 없이 "인증 기관" 표시를 하려고 기관의 is_verified 를 공고에 복사해 둔다.
--      새 공고는 등록 시점 값을 받고, 기관 인증이 바뀌면 그 기관의 공고 전체를 갱신한다(트리거).
--   2) admin_logs — 운영자가 무엇을 언제 했는지(인증·정지·공고 내리기·크롤 소스 스위치). 되돌릴 때 근거가 된다.

-- ───────────────────────── 인증 기관 뱃지 ─────────────────────────
alter table org_postings add column if not exists org_verified boolean not null default false;

create or replace function set_posting_org_verified() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select coalesce(is_verified, false) into new.org_verified from org_profiles where user_id = new.org_user_id;
  new.org_verified := coalesce(new.org_verified, false);
  return new;
end $$;
drop trigger if exists trg_posting_org_verified on org_postings;
create trigger trg_posting_org_verified before insert on org_postings for each row execute function set_posting_org_verified();

create or replace function sync_org_verified_to_postings() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_verified is distinct from old.is_verified then
    update org_postings set org_verified = new.is_verified where org_user_id = new.user_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_sync_org_verified on org_profiles;
create trigger trg_sync_org_verified after update on org_profiles for each row execute function sync_org_verified_to_postings();

-- 이미 있는 공고 채우기
update org_postings p set org_verified = coalesce(o.is_verified, false)
  from org_profiles o where o.user_id = p.org_user_id and p.org_verified is distinct from coalesce(o.is_verified, false);

-- ───────────────────────── 운영자 활동 로그 ─────────────────────────
create table if not exists admin_logs (
  id             uuid primary key default gen_random_uuid(),
  admin_user_id  uuid not null references profiles(id) on delete cascade,
  action         text not null,        -- org_verify | org_unverify | user_suspend | user_restore | admin_grant | admin_revoke |
                                       -- report_status | posting_close | posting_delete | source_on | source_off
  target_type    text,                 -- user | org | report | posting | source
  target_id      text,
  detail         jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists idx_admin_logs_time on admin_logs(created_at desc);

alter table admin_logs enable row level security;
create policy "admin logs read" on admin_logs for select to authenticated using (is_admin());
create policy "admin logs insert" on admin_logs for insert to authenticated with check (is_admin() and admin_user_id = auth.uid());
