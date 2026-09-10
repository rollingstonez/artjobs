import Link from "next/link";
import { employmentLabel, fieldLabel, genreLabel, roleLabel, type Posting } from "@/types/job";
import { getDeadline, periodText } from "@/lib/format";

const EMPLOYMENT_CHIP: Record<string, string> = {
  full_time: "bg-blue-50 text-blue-700",
  contract: "bg-violet-50 text-violet-700",
  freelance: "bg-amber-50 text-amber-700",
  intern: "bg-emerald-50 text-emerald-700",
  open_call: "bg-rose-50 text-rose-700",
};

const FIELD_CHIP: Record<string, string> = {
  art: "bg-orange-50 text-orange-700",
  music: "bg-sky-50 text-sky-700",
  dance: "bg-pink-50 text-pink-700",
  gugak: "bg-lime-50 text-lime-700",
  theater: "bg-indigo-50 text-indigo-700",
};

export default function PostingCard({ posting }: { posting: Posting }) {
  const deadline = getDeadline(posting.applyEnd);
  const isExpired = deadline.kind === "expired";
  const period = periodText(posting.workStart, posting.workEnd);
  const employment = employmentLabel(posting.employmentType);
  const field = fieldLabel(posting.field);
  const genre = genreLabel(posting.genre);
  const role = roleLabel(posting.role);
  const href = `${posting.board === "audition" ? "/auditions" : "/jobs"}/${posting.id}`;

  return (
    <Link
      href={href}
      className={`block w-full rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-stone-400 ${
        isExpired ? "opacity-60" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {posting.region && (
          <span className="shrink-0 rounded-full bg-stone-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {posting.region}
          </span>
        )}
        <h2 className="truncate text-[17px] font-bold leading-snug text-stone-900">
          {posting.organization ?? "기관명 미기재"}
        </h2>
        {field && (
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              FIELD_CHIP[posting.field ?? ""] ?? "bg-stone-100 text-stone-700"
            }`}
          >
            {genre ? `${field} · ${genre}` : field}
          </span>
        )}
      </div>

      <p className="mt-1 truncate text-[14.5px] font-medium text-stone-700">{posting.title}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {role && (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
            {role}
          </span>
        )}
        {employment && (
          <span
            className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${
              EMPLOYMENT_CHIP[posting.employmentType ?? ""] ?? "bg-stone-100 text-stone-600"
            }`}
          >
            {employment}
          </span>
        )}
        {period && <span className="truncate text-xs text-stone-500">📅 {period}</span>}
        {posting.salary && (
          <span className="truncate text-xs text-stone-500">💰 {posting.salary}</span>
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs text-stone-500">
          {posting.address ? `📍 ${posting.address}` : ""}
        </span>
        {deadline.kind !== "none" && (
          <span
            className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${
              deadline.kind === "soon" ? "bg-red-50 text-red-600" : "bg-stone-100 text-stone-500"
            }`}
          >
            {deadline.label}
          </span>
        )}
      </div>
    </Link>
  );
}
