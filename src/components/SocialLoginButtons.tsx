"use client";
// 카카오·구글·애플 버튼. 누르면 제공자 로그인 화면으로 갔다가 /auth/callback 으로 돌아온다.
// 가입 화면에서는 고른 역할(role)을 콜백까지 들고 가서, 첫 로그인 직후 그 역할로 맞춘다.

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ENABLED_SOCIAL_PROVIDERS, type SocialProvider } from "@/lib/auth-providers";
import type { AccountRole } from "@/types/account";

export default function SocialLoginButtons({
  role,
  next,
  disabled,
  disabledHint,
}: {
  role?: AccountRole | null;
  next?: string;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (ENABLED_SOCIAL_PROVIDERS.length === 0) return null;

  async function start(provider: SocialProvider) {
    setBusy(provider);
    setError(null);
    const params = new URLSearchParams();
    if (role) params.set("role", role);
    if (next) params.set("next", next);
    const redirectTo = `${window.location.origin}/auth/callback${params.size ? `?${params}` : ""}`;
    const { error } = await createClient().auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) {
      setError("로그인 화면을 여는 데 실패했습니다. 잠시 후 다시 시도해주세요.");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      {ENABLED_SOCIAL_PROVIDERS.map((p) => (
        <button
          key={p.code}
          type="button"
          disabled={disabled || busy !== null}
          onClick={() => start(p.code)}
          className={`h-11 w-full rounded-lg text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${p.className}`}
        >
          {busy === p.code ? "이동 중…" : p.label}
        </button>
      ))}
      {disabled && disabledHint && <p className="text-xs text-stone-500">{disabledHint}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
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
