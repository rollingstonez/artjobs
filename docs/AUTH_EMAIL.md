# 이메일 가입 확인 · 비밀번호 찾기 설정 (Supabase)

코드는 두 경우 모두 처리한다.

- **이메일 확인 꺼짐**: 가입 즉시 로그인되어 프로필 작성 화면으로 간다.
- **이메일 확인 켜짐**: 가입 후 `/signup/sent`(메일함 안내)로 가고, 메일의 링크를 누르면 로그인되어 프로필 작성 화면으로 간다.
  확인을 안 한 계정으로 로그인하면 같은 안내 화면으로 보내고 "다시 보내기" 를 줄 수 있다.

비밀번호 찾기: `/forgot-password` → 메일 → `/reset-password`(새 비밀번호) → 마이페이지.
로그인 상태에서 바꾸기: `/me/settings` 의 "비밀번호 변경".

## 1. 이메일 확인을 켤지 정하기

Supabase 대시보드 → **Authentication → Sign In / Providers → Email** → `Confirm email`

- 끄면 가입이 가장 간단하다(전화번호도 안 받는 아트잡스 방향과 맞다). 오타 주소로 가입해도 막을 수 없다는 단점.
- 켜면 주소가 진짜인 사람만 회원이 된다. 대신 아래 2번 템플릿 수정을 꼭 해 둔다.

## 2. 이메일 템플릿 바꾸기 (켜든 끄든 비밀번호 찾기를 위해 필요)

Supabase 기본 템플릿의 링크는 "메일을 연 브라우저" 가 "가입한 브라우저" 와 같아야만 동작한다(PKCE).
휴대폰 메일 앱에서 열면 실패해서 `링크가 만료되었습니다` 가 뜬다. 아래처럼 바꾸면 어디서 열어도 된다.

Supabase 대시보드 → **Authentication → Emails (Email Templates)**

### Confirm signup (가입 확인)

```html
<h2>아트잡스 가입을 확인해 주세요</h2>
<p>아래 버튼을 누르면 가입이 완료되고 프로필 작성 화면으로 이동합니다.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">가입 확인하기</a></p>
<p style="color:#888;font-size:12px">본인이 가입한 적이 없다면 이 메일은 무시하셔도 됩니다.</p>
```

### Reset password (비밀번호 재설정)

```html
<h2>아트잡스 비밀번호 재설정</h2>
<p>아래 버튼을 누르고 새 비밀번호를 정해 주세요. 링크는 한 번만 쓸 수 있습니다.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">새 비밀번호 정하기</a></p>
<p style="color:#888;font-size:12px">요청한 적이 없다면 이 메일은 무시하셔도 됩니다. 비밀번호는 바뀌지 않습니다.</p>
```

### Change email address (이메일 변경) — 나중에 이메일 변경 기능을 붙일 때

```html
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change">이메일 변경 확인</a></p>
```

제목(Subject)도 한국어로 바꿔 둔다. 예: `[아트잡스] 가입을 확인해 주세요`, `[아트잡스] 비밀번호 재설정`.

## 3. URL 설정 확인

**Authentication → URL Configuration**

- Site URL: `https://artjobs.kr` (템플릿의 `{{ .SiteURL }}` 이 이 값을 쓴다)
- Redirect URLs: `https://artjobs.kr/auth/callback`, `http://localhost:3000/auth/callback`

## 4. 발신 메일 (중요)

Supabase 기본 발송은 **시간당 몇 통** 수준의 개발용이라 실제 회원에게는 부족하고 스팸함에 잘 들어간다.
오픈 전에 **Authentication → SMTP Settings** 에서 Resend·Brevo 같은 발송 서비스를 붙이고
보내는 사람을 `아트잡스 <noreply@artjobs.kr>` 로 맞춘다. (도메인 인증 필요)

## 확인

1. `/signup` 에서 이메일로 가입 → (확인 켜짐이면) `/signup/sent` → 메일 링크 → `/me/profile?welcome=1`
2. `/login` → "비밀번호를 잊으셨나요?" → 메일 → `/reset-password` → 새 비밀번호 → `/me`
3. 휴대폰 메일 앱에서 링크를 눌러도 되는지 한 번 확인 (2번 템플릿을 적용했으면 된다)
