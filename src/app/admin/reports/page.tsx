import Link from "next/link";
import { Badge, Chip, ChipDivider, ChipRow, Empty, PageHeader, Stat, UserLink, btn } from "@/components/admin/ui";
import { REPORT_CONTEXT_LABEL } from "@/lib/admin/labels";
import { nameMap, sp } from "@/lib/admin/queries";
import { setReportStatus, setUserStatus } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { REPORT_STATUS, type UserReport } from "@/types/account";

export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  await requireAdmin("/admin/reports");
  const s = await searchParams;
  const show = ["all", "reviewed", "closed"].includes(sp(s.show)) ? sp(s.show) : "open";
  const category = sp(s.category);
  const supabase = (await createClient())!;
  let q = supabase.from("user_reports").select("*").order("created_at", { ascending: false }).limit(300);
  if (show !== "all") q = q.eq("status", show);
  if (category) q = q.eq("category", category);
  const [{ data }, openCount, reviewedCount, closedCount, { data: cats }] = await Promise.all([
    q,
    supabase.from("user_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("user_reports").select("id", { count: "exact", head: true }).eq("status", "reviewed"),
    supabase.from("user_reports").select("id", { count: "exact", head: true }).eq("status", "closed"),
    supabase.from("user_reports").select("category").limit(1000),
  ]);
  const rows = (data ?? []) as UserReport[];
  const categories = [...new Set((cats ?? []).map((c) => c.category))].sort();
  const people = await nameMap(supabase, rows.flatMap((r) => [r.reporter_user_id, r.reported_user_id]));
  // 같은 사람이 여러 번 신고당했으면 강조(반복 신고).
  const { data: allAgainst } = await supabase.from("user_reports").select("reported_user_id").limit(2000);
  const againstCount = (id: string) => (allAgainst ?? []).filter((r) => r.reported_user_id === id).length;
  const href = (patch: Record<string, string>) => {
    const usp = new URLSearchParams({ show, ...(category ? { category } : {}), ...patch });
    for (const [k, v] of Object.entries(patch)) if (!v) usp.delete(k);
    return `/admin/reports?${usp.toString()}`;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="신고 처리"
        count={rows.length}
        description="메시지 본문은 운영자도 읽지 않으므로, 신고자가 적은 내용과 신고 대상의 프로필·공고·구직 글로 판단합니다. 흐름: 미처리 → 확인함(검토 시작) → 종결. 같은 사람이 여러 번 신고당하면 빨간 표시가 붙습니다."
      />
      <div className="grid grid-cols-3 gap-2">
        <Stat title="미처리" value={openCount.count ?? 0} href={href({ show: "open" })} warn />
        <Stat title="확인함" value={reviewedCount.count ?? 0} href={href({ show: "reviewed" })} />
        <Stat title="종결" value={closedCount.count ?? 0} href={href({ show: "closed" })} />
      </div>
      <ChipRow>
        <Chip href={href({ show: "open" })} active={show === "open"} tone="warn">미처리</Chip>
        <Chip href={href({ show: "reviewed" })} active={show === "reviewed"}>확인함</Chip>
        <Chip href={href({ show: "closed" })} active={show === "closed"}>종결</Chip>
        <Chip href={href({ show: "all" })} active={show === "all"}>전체</Chip>
        {categories.length > 0 && <ChipDivider />}
        {categories.length > 0 && <Chip href={href({ category: "" })} active={!category}>유형 전체</Chip>}
        {categories.map((c) => <Chip key={c} href={href({ category: c })} active={category === c}>{c}</Chip>)}
      </ChipRow>
      {rows.length === 0 ? (
        <Empty icon="🚨">{show === "open" ? "미처리 신고가 없습니다." : "해당하는 신고가 없습니다."}</Empty>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const reported = people.get(r.reported_user_id);
            const reporter = people.get(r.reporter_user_id);
            const repeat = againstCount(r.reported_user_id);
            return (
              <li key={r.id} className={`rounded-2xl border bg-white p-4 text-sm ${r.status === "open" ? "border-amber-200" : "border-stone-200"}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="red">{r.category}</Badge>
                  <span className="text-xs text-stone-500">{REPORT_CONTEXT_LABEL[r.context_type ?? ""] ?? r.context_type ?? "기타"} · {fmtDateTime(r.created_at)} ({timeAgo(r.created_at)})</span>
                  <Badge className="ml-auto" tone={r.status === "open" ? "amber" : r.status === "reviewed" ? "sky" : "stone"}>{REPORT_STATUS[r.status]}</Badge>
                </div>
                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-stone-500">신고 대상</span>
                  <UserLink id={r.reported_user_id} name={reported?.display_name} role={reported?.role} status={reported?.status} />
                  {repeat > 1 && <Badge tone="red" title="이 회원이 신고당한 횟수">피신고 {repeat}회</Badge>}
                  <span className="text-stone-300">|</span>
                  <span className="text-stone-500">신고자</span>
                  <UserLink id={r.reporter_user_id} name={reporter?.display_name} role={reporter?.role} small />
                </p>
                {r.detail && <p className="mt-2 whitespace-pre-line rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-700">{r.detail}</p>}
                {r.context_type === "posting" && r.context_id && <p className="mt-1 text-xs"><Link href={`/jobs/${r.context_id}`} className="underline underline-offset-2">신고된 공고 보기</Link></p>}
                {r.context_type === "seeking" && r.context_id && <p className="mt-1 text-xs"><Link href={`/seeking/${r.context_id}`} className="underline underline-offset-2">신고된 구직 글 보기</Link></p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.status === "open" && <form action={setReportStatus.bind(null, r.id, "reviewed")}><button className={btn.secondary}>검토 시작(확인함)</button></form>}
                  {r.status !== "closed" && <form action={setReportStatus.bind(null, r.id, "closed")}><button className={btn.primary}>종결</button></form>}
                  {r.status === "closed" && <form action={setReportStatus.bind(null, r.id, "open")}><button className={btn.secondary}>다시 열기</button></form>}
                  {reported && reported.status === "active" ? (
                    <form action={setUserStatus.bind(null, r.reported_user_id, "suspended")}><button className={btn.dangerSolid}>신고 대상 계정 정지</button></form>
                  ) : reported && reported.status === "suspended" ? (
                    <form action={setUserStatus.bind(null, r.reported_user_id, "active")}><button className={btn.success}>정지 해제</button></form>
                  ) : null}
                  <Link href={`/admin/users/${r.reported_user_id}`} className={btn.secondary}>신고 대상 상세</Link>
                  {reported?.role === "artist" && <Link href={`/talents/${r.reported_user_id}`} className={btn.secondary}>프로필 보기</Link>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
