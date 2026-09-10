# 아트잡스 (artjobs)

순수예술 다섯 분야(미술·음악·무용·국악·연극)의 채용공고와 오디션·공모를 한곳에 모으는 서비스.
바로쌤(barossam)의 구조를 기준으로 만들었고, 바로쌤의 두 원칙 — **내 집 근처 공고부터**, **연락처 비공개·메신저 소통** — 을 그대로 잇는다.
범위·분류·메뉴 설계는 `docs/SITEMAP.md` 참조.

## 구조

- `docs/SITEMAP.md` — 서비스 범위(아트잡스 vs 모던아트잡), 분야·장르·직무 코드표, 사이트맵, 단계 계획
- `src/app` — 화면 (홈 `/`, 채용공고 `/jobs`, 오디션·공모 `/auditions`, 상세 `/jobs/[id]` `/auditions/[id]`, 소개 `/about`)
- `src/lib/location.ts` — 내 동네 우선 정렬(같은 시·도 → 인접권·전국 → 그 밖)과 거리 계산. 위치는 쿠키 `artjobs_loc` 에만 저장
- `src/components/NearMeBar.tsx` — 내 동네 설정 바(시·도 선택 / 현재 위치로 / 해제)
- `src/lib/postings.ts` — 공고 조회 계층. 지금은 `src/data/sample-postings.ts` 샘플을 읽는다.
  Supabase 연결 시 이 파일만 바꾸면 화면은 그대로.
- `src/types/job.ts` — 공고 표준 필드와 코드표: 분야(field)·장르(genre)·직무(role)·게시판(board)·고용형태 (크롤러 `common.py` 와 동일해야 함)
- `scripts/crawler` — 파이썬 크롤러 (바로쌤 이식)
  - `common.py` 공용 흐름(가동 스위치 → 수집 → 적재 → 상세 → 요약)
  - `crawl_template.py` 새 소스 붙일 때 복사해 쓰는 템플릿
  - `robots_check.py` 수집 전 robots.txt 판정
- `supabase/migrations/` — DB 스키마 (아직 미적용). `0001_init.sql` 기본 테이블, `0002_taxonomy.sql` 분류 확장, `0003_location.sql` 근무지 좌표 칸
- `.github/workflows/crawl.yml` — 크롤 자동 실행 (지금은 수동 실행만)

## 실행

```bash
npm install
npm run dev
```

크롤러: `.env.example` 을 `.env.local` 로 복사해 채운 뒤 저장소 최상위에서

```bash
pip install -r scripts/crawler/requirements.txt
python scripts/crawler/robots_check.py <base_url> <목록경로>
```
