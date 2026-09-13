"use client";
// 카카오·구글·애플 버튼. 누르면 제공자 로그인 화면으로 갔다가 /auth/callback 으로 돌아온다.
// 가입 화면에서는 고른 역할(role)을 콜백까지 들고 가서, 첫 로그인 직후 그 역할로 맞춘다.
// Supabase 에서 아직 안 켠 제공자는 "준비 중" 으로 보여주고, 누르면 안내만 한다(서버 페이지에서 status 를 넘긴다).

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SOCIAL_PROVIDERS, type SocialProvider, type SocialProviderStatus } from "@/lib/auth-providers";
import type { AccountRole } from "@/types/account";

const STYLE: Record<SocialProvider, string> = {
  kakao: "bg-[#FEE500] text-[#191919] hover:bg-[#f5dc00]",
  google: "border border-stone-300 bg-white text-stone-800 hover:border-stone-500",
  apple: "bg-black text-white hover:bg-stone-800",
};

function ProviderIcon({ code }: { code: SocialProvider }) {
  if (code === "kakao") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          fill="#191919"
          d="M12 3C6.48 3 2 6.58 2 11c0 2.82 1.85 5.3 4.64 6.72l-.95 3.53c-.08.3.26.55.52.38l4.2-2.78c.52.06 1.05.1 1.59.1 5.52 0 10-3.58 10-8S17.52 3 12 3z"
        />
      </svg>
    );
  }
  if (code === "google") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.55-5.17 3.55-8.87z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.94-2.91l-3.87-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29A12 12 0 0 0 0 12c0 1.94.46 3.77 1.29 5.38l3.98-3.09z" />
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.37 12.7c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.18-1.73-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.19-1.54 2.68-.39 6.64 1.11 8.81.73 1.06 1.6 2.25 2.75 2.21 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.71.71 2.88.69 1.19-.02 1.94-1.08 2.67-2.14.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.32-.89-2.34-3.57zM14.18 6.22c.6-.74 1.01-1.76.9-2.78-.87.04-1.93.58-2.55 1.31-.56.65-1.05 1.7-.92 2.7.97.08 1.96-.49 2.57-1.23z"
      />
    </svg>
  );
}

export default function SocialLoginButtons({
  status,
  role,
  next,
  disabled,
  disabledHint,
}: {
  status: SocialProviderStatus;
  role?: AccountRole | null;
  next?: string;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function start(provider: SocialProvider) {
    const meta = SOCIAL_PROVIDERS.find((p) => p.code === provider)!;
    if (!status[provider]) {
      setMessage(`${meta.shortLabel} 로그인은 준비 중입니다. 이메일이나 다른 계정으로 이용해 주세요.`);
      return;
    }
    setBusy(provider);
    setMessage(null);
    const params = new URLSearchParams();
    if (role) params.set("role", role);
    if (next) params.set("next", next);
    const redirectTo = `${window.location.origin}/auth/callback${params.size ? `?${params}` : ""}`;
    const { error } = await createClient().auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) {
      setMessage("로그인 화면을 여는 데 실패했습니다. 잠시 후 다시 시도해주세요.");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      {SOCIAL_PROVIDERS.map((p) => {
        const ready = status[p.code];
        return (
          <button
            key={p.code}
            type="button"
            disabled={disabled || busy !== null}
            onClick={() => start(p.code)}
            aria-label={ready ? p.label : `${p.label} (준비 중)`}
            className={`relative flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${STYLE[p.code]} ${ready ? "" : "opacity-70"}`}
          >
            <span className="absolute left-4">
              <ProviderIcon code={p.code} />
            </span>
            {busy === p.code ? "이동 중…" : p.label}
            {!ready && (
              <span className={`absolute right-3 rounded-full px-2 py-0.5 text-[11px] font-medium ${p.code === "apple" ? "bg-white/25" : "bg-black/10"}`}>준비 중</span>
            )}
          </button>
        );
      })}
      {disabled && disabledHint && <p className="text-xs text-stone-500">{disabledHint}</p>}
      {message && <p className="text-sm text-red-600">{message}</p>}
    </div>
  );
}

export function OrDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-stone-400">
      <span className="h-px flex-1 bg-stone-200" />
      {label}
      <span className="h-px flex-1 bg-stone-200" />
    </div>
  );
}
