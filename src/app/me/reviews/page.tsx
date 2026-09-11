import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "@/components/forms/ui";
import { requireUser } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { loadHiringHub } from "@/lib/hiring";
import { boardLabel } from "@/types/job";

export const metadata: Metadata = { title: "심사 참여 | 아트잡스" };

const STATUS = { open: "모집중", closed: "마감", draft: "임시저장" } as const;

export default async function ReviewsHubPage({ searchParams }: PageProps<"/me/reviews">) {
  const me = await requireUser("/me/reviews");
  const sp = await searchParams;
  const hub = await loadHiringHub(me);
  const empty = hub.memberships.length === 0 && hub.reviewing.length === 0 && hub.pendingInvites.length === 0;

  return (
    <div className="space-y-6">
      {sp.joined && <Notice kind="success">참여했습니다. 아래에서 공고를 골라 심사를 시작하세요.</Notice>}
      <div>
        <h2 className="text-lg font-bold">심사 참여</h2>
        <p className="mt-1 text-sm text-stone-600">다른 기관의 구성원이나 심사위원으로 초청받아 참여 중인 채용입니다.</p>
      </div>

      {hub.pendingInvites.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-bold">수락 대기 중인 초청</h3>
          <ul className="divide-y divide-stone-100 rounded-xl border border-amber-200 bg-amber-50/40">
            {hub.pendingInvites.map((i) => (
              <li key={i.token} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="flex-1">{i.label}</span>
                <Link href={`/invite/${i.token}`} className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white">확인하고 수락</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {empty && (
        <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
          아직 참여 중인 심사가 없습니다. 기관이 이메일로 초청하면 알림과 함께 여기에 나타납니다.
        </p>
      )}

      {hub.memberships.map((m) => (
        <section key={m.org_user_id} className="space-y-2">
          <h3 className="text-sm font-bold">
            {m.org_name} <span className="font-normal text-stone-400">{m.role === "admin" ? "관리자" : "구성원"}</span>
          </h3>
          {m.postings.length === 0 ? (
            <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">이 기관에는 아직 공고가 없습니다.</p>
          ) : (
            <PostingList rows={m.postings} />
          )}
        </section>
      ))}

      {hub.reviewing.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-bold">심사위원으로 참여</h3>
          <PostingList rows={hub.reviewing} />
        </section>
      )}
    </div>
  );
}

function PostingList({ rows }: { rows: { id: string; title: string; organization: string; board: string; status: keyof typeof STATUS; apply_end: string | null }[] }) {
  return (
    <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
      {rows.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{p.title}</p>
            <p className="text-xs text-stone-500">{p.organization} · {boardLabel(p.board)} · {p.apply_end ? `~${fmtDate(p.apply_end)}` : "상시"}</p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.status === "open" ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>{STATUS[p.status]}</span>
          <Link href={`/me/postings/${p.id}/review`} className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white">심사 작업대</Link>
        </li>
      ))}
    </ul>
  );
}
