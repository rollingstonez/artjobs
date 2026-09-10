// 공고 상세 — /jobs/[id] 와 /auditions/[id] 가 함께 쓴다.
import Link from "next/link";
import { fmtDate, getDeadline, periodText } from "@/lib/format";
import {
  boardLabel,
  employmentLabel,
  fieldLabel,
  genreLabel,
  roleLabel,
  type Posting,
} from "@/types/job";

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[96px_1fr] gap-3 py-2.5 text-sm md:grid-cols-[120px_1fr]">
      <dt className="text-stone-500">{label}</dt>
      <dd className="whitespace-pre-line text-stone-800">{value}</dd>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-700">
      {children}
    </span>
  );
}

export default function PostingDetail({ p }: { p: Posting }) {
  const deadline = getDeadline(p.applyEnd);
  const backHref = p.board === "audition" ? "/auditions" : "/jobs";
  const field = fieldLabel(p.field);
  const genre = genreLabel(p.genre);
  const role = roleLabel(p.role);
  const classification = [field, genre, role].filter(Boolean).join(" · ") || null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 md:px-6">
      <div className="py-6">
        <Link href={backHref} className="text-sm text-stone-500 hover:text-stone-900">
          ← {boardLabel(p.board)} 목록
        </Link>
      </div>

      <article className="rounded-2xl border border-stone-200 bg-white p-5 md:p-8">
        <div className="flex flex-wrap items-center gap-1.5">
          {p.region && (
            <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[11px] font-bold text-white">
              {p.region}
            </span>
          )}
          {field && <Chip>{genre ? `${field} · ${genre}` : field}</Chip>}
          {role && <Chip>{role}</Chip>}
          {employmentLabel(p.employmentType) && <Chip>{employmentLabel(p.employmentType)}</Chip>}
          {deadline.kind !== "none" && (
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                deadline.kind === "soon" ? "bg-red-50 text-red-600" : "bg-stone-100 text-stone-500"
              }`}
            >
              {deadline.label}
            </span>
          )}
        </div>

        <p className="mt-4 text-sm font-semibold text-stone-500">{p.organization}</p>
        <h1 className="mt-1 text-xl font-extrabold leading-snug md:text-2xl">{p.title}</h1>

        <dl className="mt-6 divide-y divide-stone-100 border-y border-stone-100">
          <Row label="분야·직무" value={classification} />
          <Row label="원문 분야" value={p.categoryRaw} />
          <Row label="고용형태" value={p.employmentRaw ?? employmentLabel(p.employmentType)} />
          <Row label="모집인원" value={p.recruitCount} />
          <Row label="급여·지원금" value={p.salary} />
          <Row label="근무기간" value={periodText(p.workStart, p.workEnd)} />
          <Row label="근무지" value={p.address} />
          <Row label="접수기간" value={periodText(p.applyStart, p.applyEnd)} />
          <Row label="접수방법" value={p.applyMethod} />
          <Row label="지원 이메일" value={p.applyEmail} />
          <Row label="연락처" value={p.applyContact} />
          <Row label="제출서류" value={p.requiredDocs} />
        </dl>

        {p.description && (
          <section className="mt-6">
            <h2 className="text-sm font-bold text-stone-700">공고 내용</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-stone-800">
              {p.description}
            </p>
          </section>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-5">
          <p className="text-xs text-stone-500">
            출처: {p.sourceName} · 수집일 {fmtDate(p.createdAt)}
          </p>
          <a
            href={p.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-700"
          >
            원문 보기 ↗
          </a>
        </div>
      </article>
    </main>
  );
}
