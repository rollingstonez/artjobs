"use client";
// 기관 구성원 명단 + 이메일 초청 + 권한 변경 + 초대 링크 복사.
import { useActionState, useState } from "react";
import type { ActionResult } from "@/lib/actions/auth";
import { inviteMember, removeMember, setMemberRole } from "@/lib/actions/hiring";
import { Notice, inputClass } from "@/components/forms/ui";
import { ORG_MEMBER_ROLES, type OrgMember } from "@/types/account";

export default function TeamPanel({ members, names, myId }: { members: OrgMember[]; names: Record<string, string>; myId: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(inviteMember, null);
  const [copied, setCopied] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const copy = async (token: string) => {
    const link = `${origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(token);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      window.prompt("초대 링크를 복사하세요", link);
    }
  };

  return (
    <div className="space-y-4">
      {members.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">아직 초청한 구성원이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white text-sm">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold">{m.member_user_id ? (names[m.member_user_id] ?? m.email) : m.email}</span>
                {m.member_user_id && names[m.member_user_id] && <span className="ml-1 text-xs text-stone-400">{m.email}</span>}
                {m.member_user_id === myId && <span className="ml-1 text-xs text-stone-400">(나)</span>}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {m.status === "active" ? "참여 중" : "수락 대기"}
              </span>
              <select
                defaultValue={m.role}
                onChange={(e) => setMemberRole(m.id, e.target.value === "admin" ? "admin" : "member")}
                className="h-8 rounded-lg border border-stone-300 bg-white px-2 text-xs"
                title={ORG_MEMBER_ROLES.find((r) => r.code === m.role)?.note}
              >
                {ORG_MEMBER_ROLES.map((r) => (
                  <option key={r.code} value={r.code}>{r.label}</option>
                ))}
              </select>
              {m.status === "pending" && (
                <button type="button" onClick={() => copy(m.token)} className="text-xs underline-offset-2 hover:underline">
                  {copied === m.token ? "복사됨 ✓" : "초대 링크 복사"}
                </button>
              )}
              <form action={removeMember.bind(null, m.id)}>
                <button className="text-xs text-red-600 underline-offset-2 hover:underline">해제</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="space-y-2 rounded-xl border border-stone-200 bg-white p-4">
        <h3 className="text-sm font-bold">구성원 초청</h3>
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1">
            <span className="text-xs font-semibold text-stone-700">이메일</span>
            <input name="email" type="email" required placeholder="name@example.com" className={inputClass} />
          </label>
          <label>
            <span className="text-xs font-semibold text-stone-700">권한</span>
            <select name="role" defaultValue="member" className={inputClass}>
              {ORG_MEMBER_ROLES.map((r) => (
                <option key={r.code} value={r.code}>{r.label} — {r.note}</option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={pending} className="h-11 rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white disabled:opacity-60">
            {pending ? "초청 중…" : "초청"}
          </button>
        </div>
        <p className="text-xs text-stone-500">
          이미 아트잡스 회원이면 알림으로 바로 전달됩니다. 아니면 초대 링크를 복사해 직접 보내주세요. 초청받은 사람은 그 이메일로 로그인해 수락해야 합니다.
        </p>
        {state && !state.ok && <Notice kind="error">{state.error}</Notice>}
        {state?.ok && <Notice kind="success">초청했습니다.</Notice>}
      </form>
    </div>
  );
}
