"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionResult } from "@/lib/actions/auth";
import { sendMessage } from "@/lib/actions/messages";

export default function MessageForm({ conversationId }: { conversationId: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(sendMessage, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="flex items-end gap-2">
      <input type="hidden" name="conversation_id" value={conversationId} />
      <textarea
        name="body"
        rows={2}
        required
        maxLength={4000}
        placeholder="메시지를 입력하세요"
        className="min-h-[44px] flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            ref.current?.requestSubmit();
          }
        }}
      />
      <button type="submit" disabled={pending} className="h-11 rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white disabled:opacity-60">보내기</button>
      {state && !state.ok && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
