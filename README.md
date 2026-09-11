# 아트잡스 (artjobs)

순수예술 다섯 분야(미술·음악·무용·국악·연극)의 채용공고와 오디션·공모를 한곳에 모으는 서비스.
바로쌤(barossam)의 구조를 기준으로 만들었고, 바로쌤의 두 원칙 — **내 집 근처 공고부터**, **연락처 비공개·메신저 소통** — 을 그대로 잇는다.
범위·분류·메뉴 설계는 `docs/SITEMAP.md` 참조.

## 구조

- `docs/SITEMAP.md` — 서비스 범위(아트잡스 vs 모던아트잡), 분야·장르·직무 코드표, 사이트맵, 단계 계획
- `src/app` — 화면 (홈 `/`, 채용공고 `/jobs`, 오디션·공모 `/auditions`, 상세 `/jobs/[id]` `/auditions/[id]`, 소개 `/about`)
  - 회원: 가입 `/signup` · 로그인 `/login` · 마이페이지 `/me/*` · 인재정보 `/talents` · 메신저 `/messages` · 알림 `/notifications` · 공고 등록 `/post`
  - Supabase 환경변수가 없으면 회원 페이지는 `/account-unavailable` 안내로 대체된다 (`src/proxy.ts`)
- `src/lib/actions/*.ts` — 서버 액션 (가입·로그인, 프로필, 저장·지원·공고 등록, 알림 조건, 메시지, 심사 `hiring.ts`)
- **심사 작업대(3단계)** — 구인 과정을 아트잡스 안에서 끝낸다. 상세는 아래 "심사 작업대" 절
  - `src/lib/hiring.ts` 자격 판정(소유자·관리자·구성원·심사위원)과 작업대 데이터 조회, CSV 생성
  - `src/lib/embed.ts` 포트폴리오 링크를 화면 안에 띄울 수 있는지(유튜브·비메오·사운드클라우드·이미지) 판정
  - `src/components/hiring/ReviewWorkbench.tsx` 작업대 화면, `ReviewerPanel.tsx` 심사위원 초청, `TeamPanel.tsx` 구성원, `RetentionForm.tsx` 보관 기간
  - 화면: `/me/postings/[id]/review` 작업대 · `/me/postings/[id]/review/export` CSV · `/me/team` 구성원 · `/me/reviews` 심사 참여(초청받은 사람용) · `/invite/[token]` 초대 수락
- `src/lib/auth.ts` — 현재 로그인 사용자·역할 프로필 조회. `src/lib/supabase/` — 서버/브라우저 클라이언트
- `src/lib/location.ts` — 내 동네 우선 정렬(같은 시·도 → 인접권·전국 → 그 밖)과 거리 계산. 위치는 쿠키 `artjobs_loc` 에만 저장
- `src/components/NearMeBar.tsx` — 내 동네 설정 바(시·도 선택 / 현재 위치로 / 해제)
- `src/lib/postings.ts` — 공고 조회 계층. 지금은 `src/data/sample-postings.ts` 샘플을 읽는다.
  Supabase 연결 시 이 파일만 바꾸면 화면은 그대로.
- `src/types/job.ts` — 공고 표준 필드와 코드표: 분야(field)·장르(genre)·직무(role)·게시판(board)·고용형태 (크롤러 `common.py` 와 동일해야 함)
- `scripts/crawler` — 파이썬 크롤러 (바로쌤 이식)
  - `sources.py` **수집 대상 사이트 대장(단일 기준, 81곳)** — 여기만 고친다
  - `export_sources.py` 대장 → `docs/sources.md`(사람용 표) + `supabase/seed/crawl_sources.sql`(DB 시드) 생성
  - `common.py` 공용 흐름(가동 스위치 → 수집 → 적재 → 상세 → 요약)
  - `crawl_template.py` 새 소스 붙일 때 복사해 쓰는 템플릿
  - `robots_check.py` 수집 전 robots.txt 판정 + 목록 페이지 실측 (대장 전체를 한 번에)
  - `collection_status.py` / `collection_status_html.py` 판정 결과 → 수집 가능 여부 문서(md / html)
  - `robots_to_sql.py` 판정 결과 → `supabase/seed/robots_status.sql` (DB 의 robots_status 갱신. 운영자 화면 크롤 소스 스위치는 clean·agreed 만 켜진다)
- `docs/SOCIAL_LOGIN.md` — 카카오·구글·애플 로그인 켜는 순서 (제공자 콘솔 + Supabase + `.env.local`)
- `docs/sources.md` — 사이트 대장을 표로 정리한 문서(자동 생성)
- `docs/collection-status.md` / `.html` — **지금 수집할 수 있는 곳·아닌 곳 판정표**(자동 생성). 공공데이터 요청·협의 목록 포함
- `docs/robots_result.json` — 마지막 robots 판정 원본. 워크플로 결과로 갈아끼운다
- `supabase/migrations/` — DB 스키마. Supabase 프로젝트 `artjobs`(barohaus 조직, 서울 리전)에 0001~0009 적용 완료. 새 마이그레이션은 SQL Editor에서 순서대로 실행한다. `0001_init.sql` 기본 테이블, `0002_taxonomy.sql` 분류 확장, `0003_location.sql` 근무지 좌표 칸, `0004_accounts.sql` 회원·프로필·공고 등록·지원·알림·메신저 (RLS 포함), `0005_social_login.sql` 소셜 로그인(카카오·구글·애플) 가입 트리거·역할 선택 함수, `0006_hiring.sql` 심사 작업대(포트폴리오 여러 개·구성원·심사위원·심사 기록·선발 단계·스냅샷·보관 기간), `0007_admin.sql` 운영자(관리자 판정 함수·RLS·정지 계정 차단·플래그 보호 트리거), `0008_verified_badge_logs.sql` 인증 기관 뱃지(org_postings.org_verified 동기화)·운영자 활동 로그(admin_logs), `0009_seeking.sql` 구직 게시판(seeking_posts: 예술가가 올리는 공개 구직 글, 3개 제한·60일 만료)
- `supabase/seed/crawl_sources.sql` — `crawl_sources` 초기 데이터(전부 is_active=false, 자동 생성)
- `.github/workflows/crawl.yml` — 크롤 자동 실행. **평일 21:11 KST** 스케줄 + 수동 실행(`dry_run=true` 면 DB 없이 수집 결과만 로그에). 소스별 단계 한 줄씩. 운영자 화면에서 켠 소스만 실제 적재
  - 첫 수집기 `scripts/crawler/crawl_sfac.py` 서울문화재단 채용공고(AJAX 목록·상세 POST, 공고 제목만 선별, 최근 90일 글의 상세에서 접수 기간 판독 → 마감 제외)
  - 필요한 GitHub Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Settings → Secrets and variables → Actions). 없으면 실제 적재 단계가 "[중단] .env.local…" 로 멈춘다
- `.github/workflows/fetch-sample.yml` — **사이트 구조 확인용**. 주소(여러 개 가능)·모드(html/scripts/raw/text/grep)·POST 데이터를 넣고 Run workflow → 로그에 정리된 HTML/스크립트/텍스트가 찍힌다. 파서 만들 때 선택자를 눈으로 확인하는 도구(`scripts/crawler/fetch_sample.py`)
- `.github/workflows/robots-check.yml` — 대장 전체 robots 판정을 GitHub에서 클릭으로 실행, CSV 로 받음

## Supabase 연결

1. Supabase 프로젝트를 만들고 SQL Editor 에서 `supabase/migrations/0001` → `0006` 순서로 실행
2. Authentication → Providers → Email 을 켠다 (개발 중에는 "Confirm email" 을 끄면 가입 직후 바로 로그인된다)
3. 프로젝트 URL 과 anon(publishable) key 를 `.env.local` 과 배포 환경변수에 넣는다

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
3. GitHub → Actions → **robots-check** → Run workflow → 결과 CSV 확인 → `python scripts/crawler/robots_to_sql.py` → 생성된 SQL 을 SQL Editor 에서 실행
4. '깨끗한 허용' 또는 서면 협의 완료 → Supabase `crawl_sources` 에서 `robots_status`·`is_active` 갱신
5. `crawl_template.py` 복사 → `crawl_<code>.py` → **fetch-sample 워크플로**로 실제 HTML 확인(목록이 비어 있으면 scripts 모드로 AJAX 주소를 찾아 post_data 로 다시) → 선택자 작성 → `PARSER_READY=True` → daily-crawl 을 `dry_run=true` 로 돌려 결과 확인
6. `.github/workflows/crawl.yml` 에 실행 단계 추가 → 운영자 화면 `/admin/sources` 에서 그 소스를 켠다 → 다음 스케줄부터 자동 수집

## 심사 작업대 (0006)

바로쌤은 경력·전공·거리 같은 숫자로 선생님 순위를 매기지만, 예술 분야는 공연 영상 한 편이 경력 10년보다 결정적이다.
그래서 아트잡스는 "자동 순위" 대신 **검토 행위 자체(보기 → 메모 → 점수)가 한 화면에서 끊기지 않게** 만든다.

- **작업대** `/me/postings/[id]/review` — 왼쪽 지원자 목록, 오른쪽 상세. 포트폴리오 링크는 유튜브·비메오·사운드클라우드·이미지면 화면 안에서 바로 재생, 아니면 새 탭. 어느 쪽이든 오른쪽의 점수(0~100)·메모 패널은 그대로 남는다. 입력이 멈추면 자동 저장되고 목록이 점수순으로 다시 정렬된다. CSV(엑셀) 다운로드.
- **누가 보나** — 기관 계정(소유자) + `/me/team` 에서 이메일로 초청한 **구성원**(admin: 초청·공고 수정·선발, member: 열람·심사·단계 변경) + 작업대에서 공고별로 초청한 **심사위원**(그 공고만, 자기 점수·메모만). 초청받는 사람은 예술가 계정이어도 된다. 이미 회원이면 알림으로, 아니면 초대 링크(`/invite/<token>`)를 복사해 전달한다. 수락은 초대받은 이메일로 로그인한 계정만.
- **블라인드 합산** — 심사위원끼리는 서로 점수를 못 보고(RLS), 기관 쪽만 전원 점수와 평균을 본다.
- **선발 단계** — 접수 → 확인 → 서류 통과 → 오디션·면접 → 최종 선발 / 불합격. 바꾸면 지원자에게 알림.
- **자료 보관** — 지원하는 순간 프로필·포트폴리오가 `applications.profile_snapshot` 에 복사된다(트리거). 나중에 프로필을 고쳐도 심사 자료는 그대로. 공고별 `retention_days`(기본 마감 후 180일)가 지나면 `purge_expired_applications()` 가 스냅샷·지원 메시지를 지우고 점수·단계만 남긴다. `/me/team` 의 "지금 정리" 버튼 또는 pg_cron 으로 자동화(마이그레이션 파일 안 주석 참고).
- **포트폴리오** — 예술가 프로필에서 링크를 종류별(영상·이미지·음원·문서·링크)로 여러 개 등록(`artist_portfolio_items`). 인재정보 상세에도 표시.
- 아직 없는 것: 초대 이메일 자동 발송(지금은 앱 알림 + 링크 복사), 구성원의 메신저 대리 발신(대화방은 기관 계정에만 묶여 있다), 사진·나이 열 켜고 끄기(블라인드 채용용).

## 구직 게시판 (0009)

- 인재정보(`/talents`)가 "기관이 프로필을 검색"하는 곳이라면, 구직(`/seeking`)은 **예술가가 "이런 일을 찾습니다" 하고 직접 올리는 공개 글**이다. 예술가는 누가 자기를 필요로 할지 몰라 여기저기 공지를 올리는데, 그 자리를 아트잡스 안에 만든 것.
- 로그인 없이 누구나 목록·상세를 본다(예술가가 공개를 선택한 글이라서). 이름(활동명)·경력 연수·글 내용만 보이고 프로필 상세·포트폴리오는 로그인한 기관만. 연락은 메신저로만.
- 한 사람 3개까지, 60일 만료(연장 가능). 예술가 마이페이지 `/me/seeking`, 운영자 `/admin/seeking`에서 내리기.
- 크롤러는 구직·인력풀 게시판을 절대 수집하지 않는다(개인정보). 구직 글은 회원이 직접 올리는 것만.

## 운영자 (0007)

- **지정 방식**: 별도 역할 없이 `profiles.is_admin` 플래그. 운영자는 **구인자(기관)로 가입**한다. `lkseok911@gmail.com` 은 가입 트리거가 자동으로 관리자로 만든다(내니잡·바로쌤과 같은 방식). 다른 운영자는 `/admin/users` 에서 "운영자 지정".
- **화면** `/admin` (마이페이지 왼쪽 메뉴의 🛠 운영자): 현황 · 기관 인증(`/admin/orgs`) · 신고 처리(`/admin/reports`) · 회원 검색·정지·운영자 지정(`/admin/users`, 이메일은 `admin_list_users()` 함수로만) · 기관 공고 마감·내리기(`/admin/postings`) · 크롤 소스 스위치(`/admin/sources`, robots 허용·협의 완료만 켜짐).
- **정지 계정**: 로그인은 되지만 회원 페이지는 `/suspended` 안내로 가고, DB 의 restrictive 정책이 메시지·대화·지원·공고·심사 쓰기를 막는다. 공고 보기는 계속 된다.
- **보안**: 0004 의 "본인 수정" 정책은 칸을 안 가려서 자기 `is_admin`·`status`·`is_verified` 를 바꿀 수 있었다. 0007 의 트리거(`protect_profile_flags`·`protect_org_flags`)가 관리자가 아니면 막는다. 메시지 본문은 운영자도 읽지 않는다.
- **인증 기관 뱃지** (0008): 기관이 인증되면 그 기관 공고 전체의 `org_verified` 가 트리거로 갱신되고, 카드·상세에 "✓ 인증" 이 붙는다. **활동 로그** `/admin/logs`: 인증·정지·운영자 지정·신고 처리·공고 마감·소스 스위치가 `admin_logs` 에 남는다.
- 아직 없는 것: 크롤 공고 개별 숨기기.

## 배포

- Vercel 프로젝트 `artjobs` → https://artjobs.kr (Production 브랜치: `main`). `main` 에 푸시하면 자동 배포된다.
- 환경변수는 Vercel > Settings > Environment Variables 에 넣는다 (`.env.example` 의 네 항목). `NEXT_PUBLIC_*` 은 Config 타입.
- Supabase Authentication > URL Configuration 의 Site URL 은 `https://artjobs.kr`, Redirect URLs 에 `https://artjobs.kr/auth/callback`.
