"use client";
// 크롤 소스 켜기/끄기 버튼 — 누르는 동안 "처리 중…" 을 보여 준다(서버 액션 진행 표시).
import { useFormStatus } from "react-dom";

function Button({ active, canEnable }: { active: boolean; canEnable: boolean }) {
  const { pending } = useFormStatus();
  if (active) {
    return (
      <button disabled={pending} className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
        {pending ? "처리 중…" : "가동 중 · 끄기"}
      </button>
    );
  }
  return (
    <button
      disabled={!canEnable || pending}
      title={canEnable ? "" : "robots 허용 또는 협의 완료 후 켤 수 있습니다"}
      className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
    >
      {pending ? "처리 중…" : "켜기"}
    </button>
  );
}

export default function SourceToggle({ action, active, canEnable }: { action: () => Promise<void>; active: boolean; canEnable: boolean }) {
  return (
    <form action={action}>
      <Button active={active} canEnable={canEnable} />
    </form>
  );
}
