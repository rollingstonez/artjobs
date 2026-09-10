# 아트잡스 (artjobs)

순수예술 분야(회화·조각·미디어아트·큐레이션·예술교육 등) 채용공고·공모를 한곳에 모으는 서비스.
바로쌤(barossam)의 구조를 기준으로 만들었다.

## 구조

- `src/app` — 화면 (홈 `/`, 목록 `/jobs`, 상세 `/jobs/[id]`, 소개 `/about`)
- `src/lib/postings.ts` — 공고 조회 계층. 지금은 `src/data/sample-postings.ts` 샘플을 읽는다.
  Supabase 연결 시 이 파일만 바꾸면 화면은 그대로.
- `src/types/job.ts` — 공고 표준 필드·분야/고용형태 코드표 (크롤러 `common.py` 와 동일해야 함)
- `scripts/crawler` — 파이썬 크롤러 (바로쌤 이식)
  - `common.py` 공용 흐름(가동 스위치 → 수집 → 적재 → 상세 → 요약)
  - `crawl_template.py` 새 소스 붙일 때 복사해 쓰는 템플릿
  - `robots_check.py` 수집 전 robots.txt 판정
- `supabase/migrations/0001_init.sql` — DB 스키마 (아직 미적용)
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
