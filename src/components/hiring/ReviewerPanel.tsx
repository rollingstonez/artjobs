"use client";
// 공고별 심사위원 명단 + 이메일 초청 + 초대 링크 복사. 관리자만 초청·해제할 수 있다.
import { useActionState, useState } from "react";
import type { ActionResult } from "@/lib/actions/auth";
import { inviteReviewer, removeReviewer } from "@/lib/actions/hiring";
import type { ReviewerInfo } from "@/lib/hiring";
import { Notice, inputClass } from "@/components/forms/ui";

export default function ReviewerPanel({ postingId, reviewers, isAdmin, myId, origin }: { postingId: string; reviewers: ReviewerInfo[]; isAdmin: boolean; myId: string; origin: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(inviteReviewer, null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${origin}/invite/${token}`);
      setCopied(token);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      window.prompt("초대 링크를 복사하세요", `${origin}/invite/${token}`);
    }
  };

  return (
    <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)} className="rounded-xl border border-stone-200 bg-white">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-bold">
        심사위원 <span className="font-normal text-stone-400">{reviewers.filter((r) => r.status === "active").length}명 참여 · {reviewers.filter((r) => r.status === "pending").length}명 대기</span>
      </summary>
      <div className="space-y-3 border-t border-stone-100 px-4 py-3">
        {reviewers.length === 0 ? (
          <p className="text-sm text-stone-500">아직 초청한 심사위원이 없습니다. 외부 전문가를 이메일로 초청하면 이 공고의 지원자만 보고 점수·메모를 남길 수 있습니다.</p>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {reviewers.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-semibold">{r.display_name ?? r.email}</span>
                  {r.display_name && <span className="ml-1 text-xs text-stone-400">{r.email}</span>}
                  {r.user_id === myId && <span className="ml-1 text-xs text-stone-400">(나)</span>}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {r.status === "active" ? "참여 중" : "수락 대기"}
                </span>
                {isAdmin && r.status === "pending" && (
                  <button type="button" onClick={() => copy(r.token)} className="text-xs underline-offset-2 hover:underline">
                    {copied === r.token ? "복사됨 ✓" : "초대 링크 복사"}
                  </button>
                )}
                {(isAdmin || r.user_id === myId) && (
                  <form action={removeReviewer.bind(null, postingId, r.id)}>
                    <button className="text-xs text-red-600 underline-offset-2 hover:underline">{r.user_id === myId && !isAdmin ? "사퇴" : "해제"}</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        {isAdmin && (
          <form action={action} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="posting_id" value={postingId} />
            <label className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-stone-700">심사위원 이메일</span>
              <input name="email" type="email" required placeholder="name@example.com" className={inputClass} />
            </label>
            <button type="submit" disabled={pending} className="h-11 rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white disabled:opacity-60">
              {pending ? "초청 중…" : "초청"}
            </button>
            <p className="w-full text-xs text-stone-500">
              이미 아트잡스 회원이면 알림으로 바로 전달되고, 아니면 초대 링크를 복사해 직접 보내주세요. 초청받은 사람은 어떤 회원(예술가 계정 포함)이어도 됩니다.
            </p>
            {state && !state.ok && <Notice kind="error">{state.error}</Notice>}
            {state?.ok && <Notice kind="success">초청했습니다. 아래 명단에서 초대 링크를 복사할 수 있습니다.</Notice>}
          </form>
        )}
      </div>
    </details>
  );
}
