# 아트잡스 (artjobs)

순수예술 분야(회화·조각·미디어아트·큐레이션·예술교육 등) 채용공고·공모를 한곳에 모으는 서비스.
바로쌤(barossam)의 구조를 기준으로 만들었다.

## 구조

- `src/app` — 화면 (홈 `/`, 목록 `/jobs`, 상세 `/jobs/[id]`, 소개 `/about`)
- `src/lib/postings.ts` — 공고 조회 계층. 지금은 `src/data/sample-postings.ts` 샘플을 읽는다.
  Supabase 연결 시 이 파일만 바꾸면 화면은 그대로.
- `src/types/job.ts` — 공고 표준 필드·분야/고용형태 코드표 (크롤러 `common.py` 와 동일해야 함)
- `scripts/crawler` — 파이썬 크롤러 (바로쌤 이식)
  - `sources.py` **수집 대상 사이트 대장(단일 기준, 81곳)** — 여기만 고친다
  - `export_sources.py` 대장 → `docs/sources.md`(사람용 표) + `supabase/seed/crawl_sources.sql`(DB 시드) 생성
  - `common.py` 공용 흐름(가동 스위치 → 수집 → 적재 → 상세 → 요약)
  - `crawl_template.py` 새 소스 붙일 때 복사해 쓰는 템플릿
  - `robots_check.py` 수집 전 robots.txt 판정 + 목록 페이지 실측 (대장 전체를 한 번에)
  - `collection_status.py` / `collection_status_html.py` 판정 결과 → 수집 가능 여부 문서(md / html)
- `docs/sources.md` — 사이트 대장을 표로 정리한 문서(자동 생성)
- `docs/collection-status.md` / `.html` — **지금 수집할 수 있는 곳·아닌 곳 판정표**(자동 생성). 공공데이터 요청·협의 목록 포함
- `docs/robots_result.json` — 마지막 robots 판정 원본. 워크플로 결과로 갈아끼운다
- `supabase/migrations/0001_init.sql` — DB 스키마 (아직 미적용)
- `supabase/seed/crawl_sources.sql` — `crawl_sources` 초기 데이터(전부 is_active=false, 자동 생성)
- `.github/workflows/crawl.yml` — 크롤 자동 실행 (지금은 수동 실행만)
- `.github/workflows/robots-check.yml` — 대장 전체 robots 판정을 GitHub에서 클릭으로 실행, CSV 로 받음

## 실행

```bash
npm install
npm run dev
```

크롤러: `.env.example` 을 `.env.local` 로 복사해 채운 뒤 저장소 최상위에서

```bash
pip install -r scripts/crawler/requirements.txt
python scripts/crawler/sources.py            # 대장 검사(중복 코드·집계)
python scripts/crawler/export_sources.py     # 문서·SQL 시드 재생성
python scripts/crawler/robots_check.py       # 대장 전체 robots 판정 → robots_result.csv
python scripts/crawler/robots_check.py <base_url> <목록경로>   # 단건
```

## 새 사이트를 붙이는 순서

1. `scripts/crawler/sources.py` 에 항목 추가 (목록 URL 은 브라우저 주소창에서 복사)
2. `python scripts/crawler/export_sources.py`
3. GitHub → Actions → **robots-check** → Run workflow → 결과 CSV 확인
4. '깨끗한 허용' 또는 서면 협의 완료 → Supabase `crawl_sources` 에서 `robots_status`·`is_active` 갱신
5. `crawl_template.py` 복사 → `crawl_<code>.py` → 실제 HTML 로 선택자 확인 → `PARSER_READY=True`
6. `.github/workflows/crawl.yml` 에 실행 단계 추가
