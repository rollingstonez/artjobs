-- 의견 올리기(/feedback) — 바로쌤 feedback 게시판을 아트잡스에 맞게 옮겼다.
--   · 문의하기(contact_messages)가 "1:1로 답을 받는 곳"이라면, 의견은 "여러 사람이 함께 보는 곳"이다.
--     서비스에 바라는 점·불편한 점을 짧게 남기고, 운영팀 답글이 공개로 붙는다.
--   · 연락처는 받지 않는다(아트잡스 원칙). 비로그인도 이름 한 줄로 남길 수 있고, 회원이면 계정 이름을 쓴다.
--   · 목록에서 이름은 화면에서 가려 보여 준다(김O석). DB 에는 적어 준 이름 그대로 둔다.
--   · 운영자는 답글·상태·숨김·삭제를 할 수 있고, 회원 의견에 답글이 달리면 그 회원에게 알림이 간다.
--
-- 실행: Supabase SQL Editor 에서 이 파일 전체를 Run. 여러 번 실행해도 안전.

create table if not exists feedback (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references profiles(id) on delete set null,   -- 로그인 상태로 남겼으면 채워진다
  name           text not null check (char_length(name) between 1 and 20),
  category       text not null default 'idea' check (category in ('idea', 'inconvenience', 'praise', 'bug', 'other')),
  content        text not null check (char_length(content) between 5 and 500),
  is_public      boolean not null default true,                     -- 운영자가 숨기면 false
  status         text not null default 'new' check (status in ('new', 'reviewed', 'done')),
  admin_reply    text,
  admin_reply_at timestamptz,
  admin_reply_by uuid references profiles(id) on delete set null,
  admin_memo     text,                                              -- 운영자끼리 보는 메모
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_feedback_public on feedback(is_public, created_at desc);
create index if not exists idx_feedback_status on feedback(status, created_at desc);
create index if not exists idx_feedback_user on feedback(user_id);

drop trigger if exists trg_touch_feedback on feedback;
create trigger trg_touch_feedback before update on feedback for each row execute function touch_updated_at();

alter table feedback enable row level security;

-- 누구나(비로그인 포함) 공개된 의견을 본다.
drop policy if exists "feedback public read" on feedback;
create policy "feedback public read" on feedback for select using (is_public = true);
-- 본인이 남긴 의견은 숨겨져도 본다.
drop policy if exists "feedback own read" on feedback;
create policy "feedback own read" on feedback for select to authenticated using (user_id = auth.uid());
-- 누구나 남길 수 있다. 남의 이름으로(user_id 를 남의 것으로) 넣는 것만 막는다.
drop policy if exists "feedback insert anyone" on feedback;
create policy "feedback insert anyone" on feedback for insert
  with check (user_id is null or user_id = auth.uid());
-- 운영자: 전체 열람·수정·삭제.
drop policy if exists "feedback admin read" on feedback;
create policy "feedback admin read" on feedback for select to authenticated using (is_admin());
drop policy if exists "feedback admin update" on feedback;
create policy "feedback admin update" on feedback for update to authenticated using (is_admin()) with check (is_admin());
drop policy if exists "feedback admin delete" on feedback;
create policy "feedback admin delete" on feedback for delete to authenticated using (is_admin());

-- 도배 방지: 한 회원이 하루에 5건까지(로그인한 경우). 비로그인 글은 운영자가 숨기거나 지운다.
create or replace function limit_feedback() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  if new.user_id is not null then
    select count(*) into v_n from feedback
      where user_id = new.user_id and created_at > now() - interval '1 day';
    if v_n >= 5 then
      raise exception '오늘 남길 수 있는 의견은 5건까지입니다. 내일 다시 남겨 주세요.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_limit_feedback on feedback;
create trigger trg_limit_feedback before insert on feedback for each row execute function limit_feedback();

-- 운영팀 답글이 달리면(회원 의견일 때) 알림.
create or replace function on_feedback_replied() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is not null and new.admin_reply is not null and new.admin_reply is distinct from old.admin_reply then
    insert into notifications (user_id, kind, title, body, link_url, related_id)
      values (new.user_id, 'system', '남겨 주신 의견에 답글이 달렸습니다', left(new.content, 80), '/feedback', new.id);
  end if;
  return new;
end $$;
drop trigger if exists trg_feedback_replied on feedback;
create trigger trg_feedback_replied after update on feedback for each row execute function on_feedback_replied();
