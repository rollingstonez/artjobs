// 유입 경로·기기 판정 — 순수 함수(서버·클라이언트 공용). 바로쌤 lib/trafficSource.ts + lib/parseUserAgent.ts 이식.
//   - app/api/track/visit/route.ts: 방문 기록 저장 시 서버에서 판정(진실원)
//   - components/VisitTracker.tsx: 가입 귀속용 first-touch 를 클라에서도 같은 규칙으로 판정
//   통계 목적의 대략적 분류라 애매한 값은 other / pc 로 떨어뜨린다.

const UTM_ALIASES: Record<string, string> = {
  facebook: "facebook", fb: "facebook", google: "google", naver: "naver", instagram: "instagram", ig: "instagram",
  kakao: "kakao", kakaotalk: "kakao", band: "band", cafe: "cafe", youtube: "youtube", threads: "threads", twitter: "x", x: "x",
  naver_ad: "naver_ad", "naver-ad": "naver_ad", naverad: "naver_ad",
  google_ad: "google_ad", "google-ad": "google_ad", googlead: "google_ad",
  instagram_ad: "instagram_ad", "instagram-ad": "instagram_ad", instagramad: "instagram_ad",
  facebook_ad: "facebook_ad", "facebook-ad": "facebook_ad", facebookad: "facebook_ad",
};

const PAID_MEDIUMS = new Set(["cpc", "ppc", "paid", "ad", "ads", "paid-social", "paidsocial", "display", "banner", "cpm", "sa"]);
const AD_CHANNELS = new Set(["naver", "google", "instagram", "facebook"]);
const SELF_HOSTS = ["artjobs.kr", "artjobs.vercel.app", "localhost"];

export function isPaidMedium(utmMedium: string | null | undefined): boolean {
  const m = (utmMedium || "").trim().toLowerCase();
  return m ? PAID_MEDIUMS.has(m) : false;
}

export function normalizeUtmSource(utmSource: string): string {
  const key = utmSource.trim().toLowerCase();
  if (!key) return "";
  return UTM_ALIASES[key] || key.replace(/[^a-z0-9_]/g, "").slice(0, 40) || "other";
}

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith("." + domain);
}

export function sourceFromReferrer(referrer: string): string {
  const ref = (referrer || "").trim();
  if (!ref) return "";
  let host = "";
  try {
    host = new URL(ref).hostname.toLowerCase();
  } catch {
    return "other";
  }
  if (!host) return "other";
  if (hostMatches(host, "facebook.com") || hostMatches(host, "fb.com")) return "facebook";
  if (/(^|\.)google\.(com|co\.[a-z]{2}|[a-z]{2,3})$/.test(host)) return "google";
  if (hostMatches(host, "naver.com") || hostMatches(host, "naver.me")) return "naver";
  if (hostMatches(host, "instagram.com")) return "instagram";
  if (hostMatches(host, "kakao.com") || hostMatches(host, "kakao.co") || hostMatches(host, "pf.kakao.com")) return "kakao";
  if (hostMatches(host, "band.us")) return "band";
  if (hostMatches(host, "daum.net")) return "daum";
  if (hostMatches(host, "youtube.com") || hostMatches(host, "youtu.be")) return "youtube";
  if (hostMatches(host, "threads.net") || hostMatches(host, "threads.com")) return "threads";
  if (hostMatches(host, "t.co") || hostMatches(host, "x.com") || hostMatches(host, "twitter.com")) return "x";
  if (SELF_HOSTS.some((d) => hostMatches(host, d))) return "internal";
  return "other";
}

/** 최종 source: utm_source → referrer 도메인 → direct. 유료 광고(utm_medium=cpc 등)는 "{source}_ad" 로 세분. */
export function resolveTrafficSource(utmSource: string | null | undefined, referrer: string | null | undefined, utmMedium?: string | null): string {
  const fromUtm = normalizeUtmSource(utmSource || "");
  if (fromUtm) {
    if (AD_CHANNELS.has(fromUtm) && isPaidMedium(utmMedium)) return `${fromUtm}_ad`;
    return fromUtm;
  }
  const fromReferrer = sourceFromReferrer(referrer || "");
  if (fromReferrer) return fromReferrer;
  return "direct";
}

export const SOURCE_LABEL: Record<string, string> = {
  naver: "네이버", naver_ad: "네이버 광고", google: "구글", google_ad: "구글 광고", kakao: "카카오(카톡·채널)", band: "네이버 밴드", cafe: "카페",
  instagram: "인스타그램", instagram_ad: "인스타 광고", facebook: "페이스북", facebook_ad: "페이스북 광고", youtube: "유튜브", threads: "스레드", x: "X(트위터)",
  daum: "다음", direct: "직접 방문(주소 입력·북마크·앱)", internal: "내부 이동", other: "기타 사이트", unknown: "알 수 없음",
};

export function sourceLabel(key: string): string {
  return SOURCE_LABEL[key] ?? key;
}

export type DeviceType = "mobile" | "tablet" | "pc";
export interface ParsedUserAgent {
  deviceType: DeviceType;
  browser: "KakaoTalk" | "Instagram" | "Facebook" | "NaverApp" | "Chrome" | "Safari" | "Edge" | "Samsung" | "Firefox" | "Whale" | "Other";
  os: "Android" | "iOS" | "Windows" | "Mac" | "Other";
  isBot: boolean;
}

const BOT_PATTERN = /bot|crawler|crawling|spider|headless|slurp|scrape|facebookexternalhit|lighthouse|preview|monitor|python-requests|curl\/|wget/i;

export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  const s = (ua || "").trim();
  if (!s) return { deviceType: "pc", browser: "Other", os: "Other", isBot: false };
  const isBot = BOT_PATTERN.test(s);
  let os: ParsedUserAgent["os"] = "Other";
  if (/iPhone|iPad|iPod/i.test(s)) os = "iOS";
  else if (/Android/i.test(s)) os = "Android";
  else if (/Windows/i.test(s)) os = "Windows";
  else if (/Macintosh|Mac OS X/i.test(s)) os = "Mac";
  let deviceType: DeviceType = "pc";
  if (/iPad|Tablet/i.test(s) || (/Android/i.test(s) && !/Mobile/i.test(s))) deviceType = "tablet";
  else if (/Mobile|iPhone|iPod/i.test(s)) deviceType = "mobile";
  let browser: ParsedUserAgent["browser"] = "Other";
  if (/KAKAOTALK/i.test(s)) browser = "KakaoTalk";
  else if (/Instagram/i.test(s)) browser = "Instagram";
  else if (/FBAN|FBAV|FB_IAB/i.test(s)) browser = "Facebook";
  else if (/NAVER\(inapp/i.test(s)) browser = "NaverApp";
  else if (/Whale\//i.test(s)) browser = "Whale";
  else if (/Edg(e|A|iOS)?\//i.test(s)) browser = "Edge";
  else if (/SamsungBrowser/i.test(s)) browser = "Samsung";
  else if (/Firefox|FxiOS/i.test(s)) browser = "Firefox";
  else if (/Chrome|CriOS/i.test(s)) browser = "Chrome";
  else if (/Safari/i.test(s)) browser = "Safari";
  return { deviceType, browser, os, isBot };
}

export const DEVICE_LABEL: Record<string, string> = { mobile: "모바일", tablet: "태블릿", pc: "PC", unknown: "알 수 없음" };
export const BROWSER_LABEL: Record<string, string> = { KakaoTalk: "카카오톡(인앱)", Instagram: "인스타그램(인앱)", Facebook: "페이스북(인앱)", NaverApp: "네이버 앱(인앱)", Whale: "웨일", Samsung: "삼성 인터넷" };

/** first-touch 귀속 쿠키 이름. VisitTracker 가 굽고, 가입 액션·소셜 콜백이 읽는다. */
export const ATTRIBUTION_COOKIE = "aj_attr";

export interface Attribution {
  source: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  referrer: string | null;
  landing_path: string;
  at: string;
}

/** 쿠키 값(JSON 을 URL 인코딩한 것) → Attribution. 깨졌으면 null. */
export function parseAttributionCookie(raw: string | undefined | null): Attribution | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(decodeURIComponent(raw));
    if (!obj || typeof obj !== "object" || typeof obj.source !== "string") return null;
    return {
      source: String(obj.source).slice(0, 60),
      utm_source: obj.utm_source ? String(obj.utm_source).slice(0, 120) : null,
      utm_medium: obj.utm_medium ? String(obj.utm_medium).slice(0, 120) : null,
      utm_campaign: obj.utm_campaign ? String(obj.utm_campaign).slice(0, 200) : null,
      utm_content: obj.utm_content ? String(obj.utm_content).slice(0, 200) : null,
      referrer: obj.referrer ? String(obj.referrer).slice(0, 500) : null,
      landing_path: obj.landing_path ? String(obj.landing_path).slice(0, 500) : "/",
      at: obj.at ? String(obj.at).slice(0, 40) : "",
    };
  } catch {
    return null;
  }
}
