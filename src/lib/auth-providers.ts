// 소셜 로그인 제공자. 어떤 버튼을 보여줄지는 환경변수 NEXT_PUBLIC_AUTH_PROVIDERS 로 정한다.
// 예: NEXT_PUBLIC_AUTH_PROVIDERS=google,kakao   (Supabase Authentication > Providers 에서 켠 것만 적는다)
// 비어 있으면 소셜 버튼을 아예 보여주지 않는다. 설정 방법은 docs/SOCIAL_LOGIN.md.

export const SOCIAL_PROVIDERS = [
  { code: "kakao", label: "카카오로 계속하기", className: "bg-[#FEE500] text-[#191919] hover:bg-[#f5dc00]" },
  { code: "google", label: "Google로 계속하기", className: "border border-stone-300 bg-white text-stone-800 hover:border-stone-500" },
  { code: "apple", label: "Apple로 계속하기", className: "bg-black text-white hover:bg-stone-800" },
] as const;

export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number]["code"];

const enabled = (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const ENABLED_SOCIAL_PROVIDERS = SOCIAL_PROVIDERS.filter((p) => enabled.includes(p.code));
