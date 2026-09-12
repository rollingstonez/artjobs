-- 첫 화면 팝업(popups) — 바로쌤의 팝업 관리를 아트잡스에 옮겼다.
--   · 홈(/)에 들어온 방문자에게 안내창을 띄운다. 공지사항이 "찾아와서 읽는 곳"이라면, 팝업은 "먼저 보여 주는 것"이다.
--   · 노출 조건: 공개(is_published) + 기간 안(starts_at·ends_at, 비우면 제한 없음) + 대상(target) 일치.
--   · 대상: all(모두) · guest(비로그인만 — 가입 유도) · artist(예술가 회원) · organization(기관 회원).
--   · 방문자는 "오늘 하루 안 보기"를 누를 수 있고, 그 기록은 브라우저에만 남는다(서버에 저장하지 않음).
--   · 이미지는 외부 주소(image_url)를 넣는다. 아트잡스는 아직 파일 업로드를 쓰지 않는다.
--
-- 실행: Supabase SQL Editor 에서 이 파일 전체를 Run. 여러 번 실행해도 안전.

create table if not exists popups (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 2 and 120),
  body          text,
  image_url     text,
  link_url      text,                                   -- 누르면 갈 주소(내부 경로 권장: /jobs, /notices/...)
  target        text not null default 'all' check (target in ('all', 'guest', 'artist', 'organization')),
  starts_at     timestamptz,
  ends_at       timestamptz,
  display_order integer not null default 0,             -- 여러 개면 작은 숫자가 먼저
  is_published  boolean not null default false,
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_popups_live on popups(is_published, display_order, starts_at, ends_at);

drop trigger if exists trg_touch_popups on popups;
create trigger trg_touch_popups before update on popups for each row execute function touch_updated_at();

alter table popups enable row level security;

-- 누구나(비로그인 포함) 공개된 팝업을 읽는다. 기간·대상 판정은 화면에서 한다.
drop policy if exists "popups public read" on popups;
create policy "popups public read" on popups for select using (is_published = true);
-- 운영자: 전체 열람·작성·수정·삭제.
drop policy if exists "popups admin all" on popups;
create policy "popups admin all" on popups for all to authenticated using (is_admin()) with check (is_admin());
