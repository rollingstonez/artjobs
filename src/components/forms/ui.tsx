// 폼 공통 조각. 회원 화면들이 같은 모양을 쓰게 한다.
import type { ReactNode } from "react";

export const inputClass =
  "h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:border-stone-900 focus:outline-none disabled:bg-stone-100";
export const textareaClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-stone-900 focus:outline-none";
export const primaryBtn =
  "h-11 rounded-lg bg-stone-900 px-5 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-60";
export const secondaryBtn =
  "h-11 rounded-lg border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-800 hover:border-stone-500 disabled:opacity-60";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-stone-800">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

export function CheckGroup({
  name,
  options,
  selected,
  columns = 3,
}: {
  name: string;
  options: readonly { code: string; label: string }[];
  selected: readonly string[];
  columns?: 2 | 3 | 4;
}) {
  const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" }[columns];
  return (
    <div className={`grid grid-cols-2 gap-1.5 ${cols}`}>
      {options.map((o) => (
        <label
          key={o.code}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-sm has-[:checked]:border-stone-900 has-[:checked]:bg-stone-900 has-[:checked]:text-white"
        >
          <input type="checkbox" name={name} value={o.code} defaultChecked={selected.includes(o.code)} className="sr-only" />
          {o.label}
        </label>
      ))}
    </div>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "success" | "error"; children: ReactNode }) {
  const cls =
    kind === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : kind === "error"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-stone-200 bg-stone-100 text-stone-700";
  return <p className={`rounded-lg border px-3 py-2 text-sm ${cls}`}>{children}</p>;
}
