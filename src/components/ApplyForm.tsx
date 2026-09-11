"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ActionResult } from "@/lib/actions/auth";
import { applyToPosting } from "@/lib/actions/postings";
import { Notice, primaryBtn, textareaClass } from "@/components/forms/ui";

export default function ApplyForm({ postingId, isOrgPosting, sourceUrl, sourceName }: { postingId: string; isOrgPosting: boolean; sourceUrl: string; sourceName: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(applyToPosting, null);
  if (state?.ok) {
    return (
      <Notice kind="success">
        지원했습니다. {isOrgPosting ? "기관에 메시지로 전달되었고, 답장은 " : "지원 기록을 남겼습니다. 결과는 기관 접수처에서 확인하고, 메모는 "}
        <Link href={isOrgPosting ? "/messages" : "/me/applications"} className="font-semibold underline underline-offset-2">{isOrgPosting ? "메시지" : "지원 내역"}</Link>에서 보세요.
      </Notice>
    );
  }
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="posting_id" value={postingId} />
      {!isOrgPosting && (
        <p className="text-xs text-stone-600">
          이 공고는 {sourceName}에서 모은 공고라 실제 접수는{" "}
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">원문 접수처</a>에서 해야 합니다.
          여기에는 지원 기록과 메모만 남습니다.
        </p>
      )}
      <textarea
        name="message"
        rows={5}
        required
        minLength={10}
        className={textareaClass}
        placeholder={isOrgPosting ? "간단한 자기소개와 지원 동기를 적어주세요. 프로필이 함께 전달됩니다." : "지원하면서 기억해 둘 메모 (10자 이상)"}
      />
      {isOrgPosting && (
        <p className="text-xs text-stone-500">
          지원하면 지금 프로필·포트폴리오 링크의 사본이 이 공고의 심사 자료로 기관(담당자·심사위원)에게 전달됩니다. 기관이 정한 보관 기간이 지나면 사본은 삭제됩니다.
        </p>
      )}
      {state && !state.ok && <Notice kind="error">{state.error}</Notice>}
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? "보내는 중…" : isOrgPosting ? "메신저로 지원하기" : "지원 기록 남기기"}
      </button>
    </form>
  );
}
