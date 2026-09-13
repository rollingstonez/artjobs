// 소셜 로그인 제공자(카카오 · 구글 · 애플).
// 버튼은 항상 세 개 다 보여주고, Supabase Authentication > Providers 에서 아직 안 켠 것은 "준비 중" 으로 표시한다.
// 켜져 있는지는 Supabase 의 공개 설정(/auth/v1/settings)을 서버에서 읽어 판단하므로,
// 대시보드에서 제공자를 켜면 코드 수정 없이 버튼이 살아난다. 설정 방법은 docs/SOCIAL_LOGIN.md.
//
// 읽기에 실패하면(네트워크 등) 환경변수 NEXT_PUBLIC_AUTH_PROVIDERS(예: google,kakao)에 적힌 것을 켜진 것으로 본다.

export const SOCIAL_PROVIDERS = [
  { code: "kakao", label: "카카오로 계속하기", shortLabel: "카카오" },
  { code: "google", label: "Google로 계속하기", shortLabel: "구글" },
  { code: "apple", label: "Apple로 계속하기", shortLabel: "애플" },
] as const;

export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number]["code"];

/** 화면에 넘기는 형태: 어떤 제공자가 실제로 켜져 있는지. */
export type SocialProviderStatus = Record<SocialProvider, boolean>;

function fromEnv(): SocialProviderStatus {
  const enabled = (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return { kakao: enabled.includes("kakao"), google: enabled.includes("google"), apple: enabled.includes("apple") };
}

/** 서버 컴포넌트에서 부른다. Supabase 가 켜 둔 제공자를 5분 단위로 캐시해서 돌려준다. */
export async function getSocialProviderStatus(): Promise<SocialProviderStatus> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return fromEnv();
  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      next: { revalidate: 300 },
    });
    if (!res.ok) return fromEnv();
    const json = (await res.json()) as { external?: Record<string, boolean> };
    const ext = json.external ?? {};
    const env = fromEnv();
    return {
      kakao: Boolean(ext.kakao) || env.kakao,
      google: Boolean(ext.google) || env.google,
      apple: Boolean(ext.apple) || env.apple,
    };
  } catch {
    return fromEnv();
  }
}
