# 소셜 로그인 설정 (카카오 · 구글 · 애플)

코드는 이미 들어 있다. 각 제공자 콘솔에 앱을 등록하고 Supabase 에 키를 넣은 뒤,
`.env.local` 의 `NEXT_PUBLIC_AUTH_PROVIDERS` 에 켠 제공자를 적으면 버튼이 나타난다.

동작 흐름: 버튼 → 제공자 로그인 → Supabase → `/auth/callback` → (첫 가입이면) 가입 화면에서 고른 역할로 맞춤 → 프로필 작성 화면.
DB 쪽은 `supabase/migrations/0005_social_login.sql` 을 SQL Editor 에서 먼저 실행해 둔다.

## 0. 공통: Supabase Redirect URL

Supabase 대시보드 > Authentication > URL Configuration

- Site URL: 개발 중엔 `http://localhost:3000`, 배포 후엔 `https://artjobs.kr`
- Redirect URLs 에 추가: `http://localhost:3000/auth/callback`, `https://artjobs.kr/auth/callback`

## 1. 구글 (무료, 10분)

1. https://console.cloud.google.com → 프로젝트 새로 만들기 (이름 artjobs)
2. 왼쪽 메뉴 "API 및 서비스" > "OAuth 동의 화면" → 외부(External) → 앱 이름·이메일만 채우고 저장
3. "사용자 인증 정보" > "사용자 인증 정보 만들기" > "OAuth 클라이언트 ID" → 유형: 웹 애플리케이션
4. "승인된 리디렉션 URI" 에 Supabase 가 알려주는 콜백 주소를 넣는다.
   Supabase > Authentication > Providers > Google 을 열면 "Callback URL (for OAuth)" 가 보인다.
   모양: `https://zaxfwqeyzuipbuwlozdm.supabase.co/auth/v1/callback`
5. 만들어진 클라이언트 ID·클라이언트 보안 비밀번호를 Supabase Google 설정에 붙여넣고 Enable → Save

## 2. 카카오 (무료, 이메일 동의항목 때문에 비즈 앱 전환 필요)

1. https://developers.kakao.com → 내 애플리케이션 > 애플리케이션 추가 (앱 이름 아트잡스)
2. 앱 설정 > 플랫폼 > Web 플랫폼 등록: `http://localhost:3000`, `https://artjobs.kr`
3. 제품 설정 > 카카오 로그인 → 활성화 ON
   Redirect URI 등록: Supabase Providers > Kakao 에 보이는 Callback URL (구글과 같은 모양)
4. 제품 설정 > 카카오 로그인 > 동의항목
   - 닉네임: 필수 동의
   - 카카오계정(이메일): 필수 동의 ← Supabase 가 이메일을 요구한다.
     이 항목은 "비즈 앱" 에서만 열린다. 앱 설정 > 비즈니스 > "개인 개발자 비즈 앱 전환" 으로 전환하면 된다 (사업자번호 없이 가능).
5. 앱 설정 > 앱 키 > REST API 키 → Supabase Kakao 의 Client ID 에 붙여넣기
   제품 설정 > 카카오 로그인 > 보안 > Client Secret 생성 → 코드 복사, 상태 "사용함" → Supabase 의 Client Secret 에 붙여넣기
6. Supabase 에서 Enable → Save

## 3. 애플 (Apple Developer Program 연 99달러 필요)

웹에서 Apple 로그인을 쓰려면 유료 개발자 계정과 도메인 소유 확인이 필요하다. iOS 앱을 낼 계획이 잡히면 그때 켠다.

1. https://developer.apple.com → Certificates, Identifiers & Profiles
2. Identifiers > App ID 만들기 (Sign in with Apple 체크)
3. Identifiers > Services ID 만들기 → Sign in with Apple 설정 → 도메인 `artjobs.kr`, Return URL 은 Supabase Callback URL
4. Keys > 키 만들기 (Sign in with Apple) → .p8 파일 다운로드
5. Supabase Providers > Apple 에 Services ID 와, .p8 로 만든 Secret Key 를 넣는다 (Supabase 문서의 생성 도구 사용).
   이 Secret Key 는 6개월마다 만료되므로 갱신 일정을 잡아 둔다.

## 4. 앱에서 켜기

`.env.local`

```
NEXT_PUBLIC_AUTH_PROVIDERS=google,kakao
```

개발 서버(`npm run dev`)를 껐다 켜면 가입·로그인 화면에 버튼이 보인다.
배포(Vercel 등)에도 같은 환경변수를 넣는다.

## 확인

1. 가입 화면에서 역할을 고르고 약관 두 개에 동의 → 소셜 버튼이 활성화된다
2. 버튼 → 제공자 로그인 → `/me/profile?welcome=1` 로 돌아온다
3. Supabase > Authentication > Users 에 계정, Table Editor > profiles 에 고른 역할(artist / organization)로 한 줄 생긴다

## 자주 나는 오류

- `redirect_uri_mismatch` (구글) / `KOE006` (카카오): 제공자 콘솔에 등록한 Redirect URI 가 Supabase Callback URL 과 글자 하나까지 같은지 확인
- 로그인 후 `/login?error=oauth` 로 돌아옴: Supabase Redirect URLs 에 `/auth/callback` 주소가 없거나, 0005 마이그레이션을 아직 안 돌렸을 때
- 카카오 "이메일을 가져올 수 없음": 동의항목에서 카카오계정(이메일)이 필수 동의가 아닐 때 (비즈 앱 전환 필요)
