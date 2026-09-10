"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/actions/auth";
import { reportUser } from "@/lib/actions/messages";

export default function ReportForm({ reportedUserId, contextId }: { reportedUserId: string; contextId: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(reportUser, null);
  if (state?.ok) return <p className="text-emerald-700">신고가 접수되었습니다.</p>;
  return (
    <form action={action} className="space-y-1.5">
      <input type="hidden" name="reported_user_id" value={reportedUserId} />
      <input type="hidden" name="context_type" value="message" />
      <input type="hidden" name="context_id" value={contextId} />
      <select name="category" className="h-8 w-full rounded-lg border border-stone-300 px-2 text-xs" defaultValue="">
        <option value="" disabled>신고 사유</option>
        <option value="scam">금전 요구·사기 의심</option>
        <option value="harassment">욕설·성희롱</option>
        <option value="spam">광고·스팸</option>
        <option value="other">기타</option>
      </select>
      <input name="detail" placeholder="자세한 내용(선택)" className="h-8 w-full rounded-lg border border-stone-300 px-2 text-xs" />
      <button disabled={pending} className="w-full rounded-lg bg-stone-900 px-2 py-1.5 text-white">신고하기</button>
      {state && !state.ok && <p className="text-red-600">{state.error}</p>}
    </form>
  );
}
