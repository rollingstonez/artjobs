"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES, EMPLOYMENT_TYPES, REGIONS } from "@/types/job";

const selectClass =
  "h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-800 focus:border-stone-900 focus:outline-none";

export default function JobsFilter() {
  const router = useRouter();
  const params = useSearchParams();

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`/jobs?${next.toString()}`);
  };

  const hasAny = ["category", "employmentType", "region", "q"].some((k) => params.get(k));

  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const q = (new FormData(e.currentTarget).get("q") as string) ?? "";
        set("q", q.trim());
      }}
    >
      <select
        aria-label="분야"
        className={selectClass}
        value={params.get("category") ?? ""}
        onChange={(e) => set("category", e.target.value)}
      >
        <option value="">분야 전체</option>
        {CATEGORIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </select>

      <select
        aria-label="고용형태"
        className={selectClass}
        value={params.get("employmentType") ?? ""}
        onChange={(e) => set("employmentType", e.target.value)}
      >
        <option value="">고용형태 전체</option>
        {EMPLOYMENT_TYPES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </select>

      <select
        aria-label="지역"
        className={selectClass}
        value={params.get("region") ?? ""}
        onChange={(e) => set("region", e.target.value)}
      >
        <option value="">지역 전체</option>
        {REGIONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <div className="flex min-w-[200px] flex-1 gap-2">
        <input
          name="q"
          type="search"
          placeholder="기관명·공고명 검색"
          defaultValue={params.get("q") ?? ""}
          className="h-10 min-w-0 flex-1 rounded-lg border border-stone-300 px-3 text-sm focus:border-stone-900 focus:outline-none"
        />
        <button
          type="submit"
          className="h-10 shrink-0 rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white"
        >
          검색
        </button>
      </div>

      {hasAny && (
        <button
          type="button"
          onClick={() => router.replace("/jobs")}
          className="h-10 rounded-lg px-3 text-sm text-stone-500 underline-offset-2 hover:underline"
        >
          초기화
        </button>
      )}
    </form>
  );
}
