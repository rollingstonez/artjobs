-- 내 집 근처 공고 우선 — 근무지 좌표 칸.
-- 1단계에서는 region(시·도)만으로 가까운 순서를 정하고, 좌표는 비워 둔다.
-- 2단계에서 address 를 지오코딩해 채우면 화면이 자동으로 실제 거리(km)를 쓴다 (src/lib/location.ts).
-- 사용자의 위치는 DB에 저장하지 않는다. 브라우저 쿠키(artjobs_loc)에만 둔다.

alter table crawled_postings
  add column if not exists lat double precision,
  add column if not exists lng double precision;

create index if not exists idx_cp_region_created on crawled_postings(region, created_at desc);
