import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import ReviewWorkbench from "@/components/hiring/ReviewWorkbench";
import ReviewerPanel from "@/components/hiring/ReviewerPanel";
import RetentionForm from "@/components/hiring/RetentionForm";
import { requireUser } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { loadWorkbench } from "@/lib/hiring";
import { APPLICATION_STAGES } from "@/types/account";
import { boardLabel } from "@/types/job";

export const metadata: Metadata = { title: "심사 작업대 | 아트잡스" };
export const dynamic = "force-dynamic";

const ROLE_LABEL = { owner: "기관 소유자", admin: "기관 관리자", member: "기관 구성원", reviewer: "심사위원" } as const;

export default async function ReviewPage({ params }: PageProps<"/me/postings/[id]/review">) {
  const { id } = await params;
  await requireUser(`/me/postings/${id}/review`);
  const wb = await loadWorkbench(id);
  if (!wb) notFound();
  const { access, applicants, reviewers, teamNames } = wb;
  const { posting, me } = access;

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "artjobs.kr";
  const origin = `${proto}://${host}`;

  const counts = APPLICATION_STAGES.map((s) => ({ ...s, n: applicants.filter((a) => a.status === s.code).length }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-stone-500">
            <Link href={access.isTeam && access.role === "owner" ? "/me/postings" : "/me/reviews"} className="hover:underline">← {access.role === "owner" ? "내 공고" : "심사 참여"}</Link>
            {" · "}{posting.organization} · {boardLabel(posting.board)} · {posting.apply_end ? `~${fmtDate(posting.apply_end)}` : "상시"} · 나는 <b>{ROLE_LABEL[access.role]}</b>
          </p>
          <h2 className="text-lg font-bold">
            <Link href={`/${posting.board === "audition" ? "auditions" : "jobs"}/org:${posting.id}`} className="hover:underline">{posting.title}</Link>
            <span className="ml-2 text-stone-400">지원자 {applicants.length}</span>
          </h2>
          <p className="mt-1 flex flex-wrap gap-1 text-[11px]">
            {counts.filter((c) => c.n > 0).map((c) => (
              <span key={c.code} className={`rounded-full px-2 py-0.5 font-semibold ${c.tone}`}>{c.label} {c.n}</span>
            ))}
          </p>
        </div>
        <a href={`/me/postings/${id}/review/export`} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold hover:border-stone-500">
          엑셀(CSV) 다운로드
        </a>
      </div>

      {!access.isTeam && (
        <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
          심사위원으로 참여 중입니다. 지원자를 보고 점수·메모를 남기면 기관이 종합합니다. 다른 심사위원의 점수는 보이지 않고, 선발 결정은 기관이 합니다.
        </p>
      )}

      <ReviewerPanel postingId={id} reviewers={reviewers} isAdmin={access.isAdmin} myId={me.id} origin={origin} />

      <ReviewWorkbench postingId={id} myId={me.id} isTeam={access.isTeam} applicants={applicants} teamNames={teamNames} />

      {access.isAdmin && <RetentionForm postingId={id} days={posting.retention_days} />}
    </div>
  );
}
