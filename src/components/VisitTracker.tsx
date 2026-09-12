"use client";

// 방문 추적 — 화면 출력 없음, 루트 레이아웃에 한 번 끼운다. 바로쌤 components/VisitTracker.tsx 이식.
//   마운트 시 1회:
//   a) sessionStorage 세션 키(탭 단위, 없으면 생성) — 브라우저 세션당 1회만 서버에 보낸다
//   b) localStorage 방문자 표식(없으면 발급) — 서버가 "처음 온 브라우저인가"를 판정한다
//   c) utm 4종 + document.referrer + 첫 경로를 /api/track/visit 로 POST
//   d) 가입 귀속용 first-touch 를 쿠키(aj_attr, 90일)에 "없을 때만" 저장 — 첫 유입 정보 보존.
//      쿠키인 이유: 이메일 가입(서버 액션)과 소셜 가입(콜백 라우트) 둘 다 서버에서 읽어야 해서.
//   규칙: /admin 은 추적하지 않는다(운영자 방문은 통계 오염). 어떤 실패도 조용히 무시.
//   IP 는 어디에도 저장하지 않는다. 표식은 무작위 문자열이라 사람을 특정하지 않는다.
import { useEffect } from "react";
import { ATTRIBUTION_COOKIE, resolveTrafficSource } from "@/lib/traffic";

const SESSION_KEY = "aj_session_key";
const LOGGED_FLAG = "aj_visit_logged";
const VISITOR_KEY = "aj_visitor_key";

function makeKey(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* 폴백 */
  }
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export default function VisitTracker() {
  useEffect(() => {
    try {
      if (window.location.pathname.startsWith("/admin")) return;
      let sessionKey = sessionStorage.getItem(SESSION_KEY);
      if (!sessionKey) {
        sessionKey = makeKey();
        sessionStorage.setItem(SESSION_KEY, sessionKey);
      }
      if (sessionStorage.getItem(LOGGED_FLAG)) return;

      let visitorKey = "";
      try {
        visitorKey = localStorage.getItem(VISITOR_KEY) || "";
        if (!visitorKey) {
          visitorKey = makeKey();
          localStorage.setItem(VISITOR_KEY, visitorKey);
        }
      } catch {
        visitorKey = "";
      }

      const params = new URLSearchParams(window.location.search);
      const utmSource = params.get("utm_source") || "";
      const utmMedium = params.get("utm_medium") || "";
      const utmCampaign = params.get("utm_campaign") || "";
      const utmContent = params.get("utm_content") || "";
      const referrer = document.referrer || "";
      const landingPath = window.location.pathname;

      // d) first-touch 쿠키 — 없을 때만
      try {
        if (!document.cookie.split("; ").some((c) => c.startsWith(`${ATTRIBUTION_COOKIE}=`))) {
          const attr = {
            source: resolveTrafficSource(utmSource, referrer, utmMedium),
            utm_source: utmSource || null,
            utm_medium: utmMedium || null,
            utm_campaign: utmCampaign || null,
            utm_content: utmContent || null,
            referrer: referrer || null,
            landing_path: landingPath,
            at: new Date().toISOString(),
          };
          document.cookie = `${ATTRIBUTION_COOKIE}=${encodeURIComponent(JSON.stringify(attr))}; max-age=${90 * 86400}; path=/; SameSite=Lax`;
        }
      } catch {
        /* 쿠키 실패 — 귀속만 포기 */
      }

      fetch("/api/track/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({ utmSource, utmMedium, utmCampaign, utmContent, referrer, landingPath, sessionKey, visitorKey }),
      })
        .then((res) => {
          if (res.ok) sessionStorage.setItem(LOGGED_FLAG, "1");
        })
        .catch(() => {});
    } catch {
      /* 페이지 동작에 영향 없음 */
    }
  }, []);
  return null;
}
