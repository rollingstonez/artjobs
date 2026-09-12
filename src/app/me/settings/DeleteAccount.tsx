"use client";

// 회원 탈퇴 — 실수로 눌리지 않게 접어 두고, 확인 문구를 정확히 적어야 버튼이 켜진다.
import { useActionState, useState } from "react";
import { Notice } from "@/components/forms/ui";
import { deleteMyAccount, type ActionResult } from "@/lib/actions/auth";

export default function DeleteAccount({ isAdmin }: { isAdmin: boolean }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(deleteMyAccount, null);
  const [confirm, setConfirm] = useState("");
  const ready = confirm.trim() === "탈퇴합니다";

  return (
    <details className="rounded-xl border border-stone-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold text-stone-700">회원 탈퇴</summary>
      <div className="mt-3 space-y-3 text-sm">
        <div className="rounded-lg bg-stone-50 p-3 text-stone-700">
          <p className="font-semibold text-stone-900">탈퇴하면 이렇게 됩니다</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-stone-600">
            <li>프로필(소개·경력·학력·사진·포트폴리오 링크)과 저장한 공고, 알림 조건이 지워집니다.</li>
            <li>올린 구직 글과 공고는 내려갑니다.</li>
            <li>이미 넣은 지원서와 주고받은 대화는 상대방의 기록이라 남습니다. 지원서에 담긴 개인정보는 공고별 보관 기간(기본 180일)이 지나면 자동으로 지워집니다.</li>
            <li>같은 이메일로는 다시 가입할 수 없습니다. 다시 쓰고 싶으면 문의하기로 알려 주세요.</li>
          </ul>
        </div>
        {isAdmin ? (
          <Notice>운영자 계정은 여기서 탈퇴할 수 없습니다. 다른 운영자에게 권한 해제를 먼저 요청하세요.</Notice>
        ) : (
          <form action={action} className="space-y-2">
            {state && !state.ok && <Notice kind="error">{state.error}</Notice>}
            <label className="block">
              <span className="text-xs font-semibold text-stone-700">계속하려면 아래 칸에 <b>탈퇴합니다</b> 라고 적어 주세요.</span>
              <input
                name="confirm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="탈퇴합니다"
                className="mt-1 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm"
              />
            </label>
            <button
              disabled={!ready || pending}
              className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
            >
              {pending ? "처리 중…" : "탈퇴하기"}
            </button>
          </form>
        )}
      </div>
    </details>
  );
}
