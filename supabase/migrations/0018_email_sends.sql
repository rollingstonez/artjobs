-- 메일 발송 기록 — 가입 환영 메일과 가입 후 안내 메일(드립)을 한 사람에게 종류별로 한 번만 보내려고 둔다.
--   kind: welcome | a1_profile_tips | a3_alert | a7_progress | a14_noticed | a21_seeking | o1_verify | o3_first_posting | o7_talent
--   result: sent(보냄) | skipped(조건이 안 맞아 건너뜀 — 이미 프로필 완성 등) | failed(발송 실패. 환영 메일만 남긴다)
--   드립은 GitHub Actions(.github/workflows/email-drip.yml)가 service role 로 쓴다.
--   환영 메일은 가입 직후 본인 세션으로 'welcome' 행 하나만 넣을 수 있다(중복 발송 막는 자리 잡기).
--
-- 실행: Supabase SQL Editor 에서 이 파일 전체를 Run. 여러 번 실행해도 안전.

create table if not exists email_sends (
  user_id  uuid not null references profiles(id) on delete cascade,
  kind     text not null,
  result   text not null default 'sent' check (result in ('sent', 'skipped', 'failed')),
  detail   text,
  sent_at  timestamptz not null default now(),
  primary key (user_id, kind)
);
create index if not exists idx_email_sends_time on email_sends(sent_at desc);

alter table email_sends enable row level security;
drop policy if exists "email sends admin read" on email_sends;
create policy "email sends admin read" on email_sends for select to authenticated using (is_admin() or user_id = auth.uid());
drop policy if exists "email sends welcome claim" on email_sends;
create policy "email sends welcome claim" on email_sends for insert to authenticated
  with check (user_id = auth.uid() and kind = 'welcome');
drop policy if exists "email sends welcome result" on email_sends;
create policy "email sends welcome result" on email_sends for update to authenticated
  using (user_id = auth.uid() and kind = 'welcome') with check (user_id = auth.uid() and kind = 'welcome');
