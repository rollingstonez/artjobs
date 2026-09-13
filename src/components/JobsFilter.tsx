"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  EMPLOYMENT_TYPES,
  FIELDS,
  GENRES,
  REGIONS,
  ROLES,
  fieldLabel,
  genreCodesForField,
  type BoardCode,
  type FieldCode,
} from "@/types/job";

const selectClass =
  "h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-800 focus:border-stone-900 focus:outline-none";

const FILTER_KEYS = ["field", "genre", "role", "employmentType", "region", "q"];

// 오디션·공모는 채용이 아니라 "모집·공모"라서 직무·고용형태(정규직·계약직 등) 필터가 맞지 않는다.
// 채용공고(job)에서만 두 필터를 보여준다.
export default function JobsFilter({ board = "job" }: { board?: BoardCode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // 필터를 바꾸면 서버가 목록을 다시 만들어 줄 때까지 기다려야 한다. 그동안
  //   (1) 방금 고른 값을 먼저 화면에 반영하고(optimistic)
  //   (2) 목록을 흐리게 해 "불러오는 중"임을 알린다.
  // 이게 없으면 고른 값조차 1~2초 뒤에야 바뀌어서 버튼이 안 먹은 것처럼 보인다.
  const [pending, startTransition] = useTransition();
  // 미리 반영해 둔 값과, 그때의 주소를 함께 들고 있는다. 주소가 바뀌었다는 건
  // 서버가 새 목록을 돌려줬다는 뜻이므로 그때부터는 주소(params)를 정답으로 본다.
  const paramsKey = params.toString();
  const [optimistic, setOptimistic] = useState<{ at: string; patch: Record<string, string> } | null>(null);
  const ahead = optimistic?.at === paramsKey ? optimistic.patch : null;

  const current = (key: string) => ahead?.[key] ?? params.get(key) ?? "";

  const set = (patch: Record<string, string>) => {
    const merged = { ...(ahead ?? {}), ...patch };
    const next = new URLSearchParams(paramsKey);
    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setOptimistic({ at: paramsKey, patch: merged });
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  };

  const reset = () => {
    setOptimistic({ at: paramsKey, patch: Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])) });
    startTransition(() => router.replace(pathname));
  };

  const field = current("field");
  // 분야를 고르면 그 분야 장르 + 교차 노출 장르(예: 국악 탭의 한국무용·창극)만 보여준다.
  const genreOptions = field
    ? genreCodesForField(field as FieldCode)
        .map((code) => GENRES.find((g) => g.code === code))
        .filter((g): g is (typeof GENRES)[number] => Boolean(g))
    : GENRES;
  const hasAny = FILTER_KEYS.some((k) => current(k));

  return (
    <div className="space-y-3" aria-busy={pending}>
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
          value={current("genre")}
          onChange={(e) => set({ genre: e.target.value })}
        >
          {/* 분야를 고르면 "미술 장르 전체"처럼 그 분야로 좁혀졌음을 라벨에도 드러낸다. */}
          <option value="">{field ? `${fieldLabel(field)} 장르 전체` : "장르 전체"}</option>
          {genreOptions.map((g) => (
            <option key={g.code} value={g.code}>
              {field === g.field
                ? g.label
                : `${FIELDS.find((f) => f.code === g.field)?.label} · ${g.label}`}
            </option>
          ))}
        </select>

        {board === "job" && (
          <>
            <select
              aria-label="직무"
              className={selectClass}
              value={current("role")}
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
              value={current("employmentType")}
              onChange={(e) => set({ employmentType: e.target.value })}
            >
              <option value="">고용형태 전체</option>
              {EMPLOYMENT_TYPES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </>
        )}

        <select
          aria-label="지역"
          className={selectClass}
          value={current("region")}
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
            onClick={reset}
            className="h-10 rounded-lg px-3 text-sm text-stone-500 underline-offset-2 hover:underline"
          >
            초기화
          </button>
        )}
      </form>

      {/* 목록이 다시 그려지는 동안 띄우는 안내. 자리를 차지하지 않도록 높이를 고정한다. */}
      <p
        aria-live="polite"
        className={`h-4 text-xs font-semibold text-stone-500 transition-opacity ${
          pending ? "opacity-100" : "opacity-0"
        }`}
      >
        {pending ? "공고를 불러오는 중…" : ""}
      </p>
    </div>
  );
}
