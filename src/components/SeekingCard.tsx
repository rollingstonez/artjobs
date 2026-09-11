import Link from "next/link";
import { fmtDate } from "@/lib/format";
import type { SeekingPost } from "@/types/account";
import { employmentLabel, fieldLabel, genreLabel, roleLabel } from "@/types/job";

const FIELD_CHIP: Record<string, string> = {
  art: "bg-rose-50 text-rose-700",
  music: "bg-indigo-50 text-indigo-700",
  dance: "bg-amber-50 text-amber-700",
  gugak: "bg-emerald-50 text-emerald-700",
  theater: "bg-violet-50 text-violet-700",
};

export function availabilityText(p: { available_from: string | null; available_until: string | null }): string {
  const a = fmtDate(p.available_from), b = fmtDate(p.available_until);
  if (a && b) return `${a} ~ ${b}`;
  if (a) return `${a}부터`;
  if (b) return `${b}까지`;
  return "일정 협의";
}

export default function SeekingCard({ p }: { p: SeekingPost }) {
  return (
    <Link href={`/seeking/${p.id}`} className="block rounded-2xl border border-stone-200 bg-white p-4 hover:border-stone-400">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-stone-900 px-1.5 py-0.5 text-[10px] font-bold text-white">{p.region ?? "전국"}</span>
        {p.field && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${FIELD_CHIP[p.field] ?? "bg-stone-100"}`}>{fieldLabel(p.field)}</span>}
        <span className="ml-auto text-[11px] text-stone-400">{fmtDate(p.created_at)}</span>
      </div>
      <h3 className="mt-2 line-clamp-2 text-[16px] font-bold leading-snug">{p.title}</h3>
      <p className="mt-1 text-xs text-stone-500">
        {p.display_name}{p.career_years != null ? ` · 경력 ${p.career_years}년` : ""} · {availabilityText(p)}
      </p>
      <p className="mt-2 flex flex-wrap gap-1 text-[11px]">
        {p.genres.slice(0, 3).map((g) => <span key={g} className="rounded-full bg-stone-100 px-2 py-0.5">{genreLabel(g)}</span>)}
        {p.roles.slice(0, 3).map((r) => <span key={r} className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">{roleLabel(r)}</span>)}
        {p.employment_types.slice(0, 2).map((e) => <span key={e} className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">{employmentLabel(e)}</span>)}
      </p>
      <p className="mt-2 line-clamp-2 text-sm text-stone-600">{p.body}</p>
    </Link>
  );
}
