"use client";

import { useActionState } from "react";
import { Notice, primaryBtn } from "@/components/forms/ui";
import type { ActionResult } from "@/lib/actions/auth";
import { saveSettings } from "@/lib/actions/profile";

export default function SettingsForm({
  settings,
}: {
  settings: { message_notification: boolean; new_posting_notification: boolean; application_notification: boolean; email_notification: boolean };
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveSettings, null);
  const rows: [keyof typeof settings, string, string][] = [
    ["message_notification", "새 메시지", "상대가 메시지를 보내면 알립니다."],
    ["application_notification", "지원 관련", "지원이 들어오거나 결과가 바뀌면 알립니다."],
    ["new_posting_notification", "새 공고", "알림 조건에 맞는 공고가 올라오면 알립니다."],
    ["email_notification", "이메일로도 받기", "끄면 사이트 안 알림만 남습니다."],
  ];
  return (
    <form action={action} className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      {rows.map(([k, label, note]) => (
        <label key={k} className="flex items-start gap-2 text-sm">
          <input type="checkbox" name={k} defaultChecked={settings[k]} className="mt-0.5" />
          <span>
            <span className="font-semibold">{label}</span>
            <span className="block text-xs text-stone-500">{note}</span>
          </span>
        </label>
      ))}
      {state && !state.ok && <Notice kind="error">{state.error}</Notice>}
      {state?.ok && <Notice kind="success">저장했습니다.</Notice>}
      <button type="submit" disabled={pending} className={primaryBtn}>저장</button>
    </form>
  );
}
