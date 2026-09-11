"use client";
// 공고별 지원서 보관 기간. 마감(또는 접수 종료) 뒤 이 기간이 지나면 지원자 개인정보(스냅샷·메시지)를 지운다.
import { useState, useTransition } from "react";
import { setRetentionDays } from "@/lib/actions/hiring";

const OPTIONS = [
  { days: 30, label: "30일" },
  { days: 90, label: "90일" },
  { days: 180, label: "180일 (기본)" },
  { days: 365, label: "1년" },
  { days: 1095, label: "3년" },
];

export default function RetentionForm({ postingId, days }: { postingId: string; days: number }) {
  const [value, setValue] = useState(days);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <details className="rounded-xl border border-stone-200 bg-white">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-bold">
        지원서 보관 기간 <span className="font-normal text-stone-400">마감 후 {days}일</span>
      </summary>
      <div className="space-y-2 border-t border-stone-100 px-4 py-3 text-sm">
        <p className="text-xs text-stone-600">
          채용이 끝나면 지원서를 계속 들고 있을 이유가 없습니다. 공고 마감(또는 접수 종료일) 뒤 이 기간이 지나면 지원자의 프로필 사본과 지원 메시지를 지우고, 점수·단계·통계만 남깁니다.
          채용절차법·개인정보보호법상 채용 서류 보관·파기 의무를 아트잡스가 대신 챙깁니다.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select value={value} onChange={(e) => setValue(Number(e.target.value))} className="h-9 rounded-lg border border-stone-300 bg-white px-2 text-sm">
            {OPTIONS.map((o) => (
              <option key={o.days} value={o.days}>{o.label}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending || value === days}
            onClick={() => start(async () => { const r = await setRetentionDays(postingId, value); setMsg(r.ok ? "저장했습니다." : r.error); })}
            className="h-9 rounded-lg bg-stone-900 px-4 text-xs font-semibold text-white disabled:opacity-40"
          >
            저장
          </button>
          {msg && <span className="text-xs text-stone-500">{msg}</span>}
        </div>
      </div>
    </details>
  );
}
