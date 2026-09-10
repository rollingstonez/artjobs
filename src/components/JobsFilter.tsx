"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  EMPLOYMENT_TYPES,
  FIELDS,
  GENRES,
  REGIONS,
  ROLES,
  genreCodesForField,
  type FieldCode,
} from "@/types/job";

const selectClass =
  "h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-800 focus:border-stone-900 focus:outline-none";

const FILTER_KEYS = ["field", "genre", "role", "employmentType", "region", "q"];

export default function JobsFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const field = params.get("field") ?? "";
  // 분야를 고르면 그 분야 장르 + 교차 노출 장르(예: 국악 탭의 한국무용·창극)만 보여준다.
  const genreOptions = field
    ? genreCodesForField(field as FieldCode)
        .map((code) => GENRES.find((g) => g.code === code))
        .filter((g): g is (typeof GENRES)[number] => Boolean(g))
    : GENRES;
  const hasAny = FILTER_KEYS.some((k) => params.get(k));

  return (
    <div className="space-y-3">
      {/* 분야 탭 */}
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[{ code: "", label: "전체" }, ...FIELDS].map((f) => {
          const active = field === f.code;
          return (
            <button
              key={f.code || "all"}
              type="button"
              onClick={() => set({ field: f.code, genre: "" })}
              aria-pressed={active}
              className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                active
                  ? "bg-stone-900 text-white"
                  : "border border-stone-200 bg-white text-stone-600 hover:border-stone-400"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const q = (new FormData(e.currentTarget).get("q") as string) ?? "";
          set({ q: q.trim() });
        }}
      >
        <select
          aria-label="장르"
          className={selectClass}
          value={params.get("genre") ?? ""}
          onChange={(e) => set({ genre: e.target.value })}
        >
          <option value="">장르 전체</option>
          {genreOptions.map((g) => (
            <option key={g.code} value={g.code}>
              {field === g.field
                ? g.label
                : `${FIELDS.find((f) => f.code === g.field)?.label} · ${g.label}`}
            </option>
          ))}
        </select>

        <select
          aria-label="직무"
          className={selectClass}
          value={params.get("role") ?? ""}
          onChange={(e) => set({ role: e.target.value })}
        >
          <option value="">직무 전체</option>
          {ROLES.map((r) => (
            <option key={r.code} value={r.code}>
              {r.label}
            </option>
          ))}
        </select>

        <select
          aria-label="고용형태"
          className={selectClass}
          value={params.get("employmentType") ?? ""}
          onChange={(e) => set({ employmentType: e.target.value })}
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
          onChange={(e) => set({ region: e.target.value })}
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
            onClick={() => router.replace(pathname)}
            className="h-10 rounded-lg px-3 text-sm text-stone-500 underline-offset-2 hover:underline"
          >
            초기화
          </button>
        )}
      </form>
    </div>
  );
}
