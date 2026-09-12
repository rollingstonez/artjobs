import Link from "next/link";
import { Badge, Chip, ChipDivider, ChipRow, Empty, ErrorNote, Flash, PageHeader, Stat, btn } from "@/components/admin/ui";
import { FEEDBACK_CATEGORY, FEEDBACK_STATUS, feedbackCategory, maskName } from "@/lib/admin/labels";
import { nameMap, sp } from "@/lib/admin/queries";
import { deleteFeedback, updateFeedback } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Row = {
  id: string; user_id: string | null; name: string; category: string; content: string; is_public: boolean; status: string;
  admin_reply: string | null; admin_reply_at: string | null; admin_reply_by: string | null; admin_memo: string | null; created_at: string;
};

export default async function AdminFeedbackPage({ searchParams }: PageProps<"/admin/feedback">) {
  await requireAdmin("/admin/feedback");
  const s = await searchParams;
  const show = ["all", "reviewed", "done", "hidden", "replied"].includes(sp(s.show)) ? sp(s.show) : "new";
  const category = FEEDBACK_CATEGORY.some((c) => c.code === sp(s.category)) ? sp(s.category) : "";
  const q = sp(s.q);
  const focus = sp(s.focus);
  const supabase = (await createClient())!;

  let query = supabase.from("feedback").select("*").order("created_at", { ascending: false }).limit(300);
  if (show === "hidden") query = query.eq("is_public", false);
  else if (show === "replied") query = query.not("admin_reply", "is", null);
  else if (show !== "all") query = query.eq("status", show);
  if (category) query = query.eq("category", category);
  if (q) query = query.or(`content.ilike.%${q}%,name.ilike.%${q}%`);
  const [{ data, error }, ...counts] = await Promise.all([
    query,
    ...["new", "reviewed", "done"].map((st) => supabase.from("feedback").select("id", { count: "exact", head: true }).eq("status", st)),
    supabase.from("feedback").select("id", { count: "exact", head: true }).eq("is_public", false),
  ]);
  const rows = (data ?? []) as Row[];
  const missing = Boolean(error && /does not exist|could not find|schema cache/i.test(error.message));
  const names = await nameMap(supabase, rows.flatMap((r) => [r.user_id, r.admin_reply_by]));
  const href = (patch: Record<string, string>) => {
    const usp = new URLSearchParams({ show, ...(category ? { category } : {}), ...(q ? { q } : {}), ...patch });
    for (const [k, v] of Object.entries(patch)) if (!v) usp.delete(k);
    return `/admin/feedback?${usp.toString()}`;
  };
  const self = href({});

  return (
    <div className="space-y-4">
      <PageHeader
        title="의견"
        count={rows.length}
        description={<>/feedback 에 남은 의견입니다. 문의하기와 달리 <b>모두에게 공개되는 게시판</b>이라, 답글도 공개로 붙습니다. 회원이 남긴 의견에 답글을 달면 그 회원에게 알림이 갑니다. 광고·욕설은 <b>숨김</b>으로 목록에서 뺄 수 있습니다(작성자 본인에게는 보입니다).</>}
        actions={
          <form className="flex gap-1">
            <input type="hidden" name="show" value={show} />
            {category && <input type="hidden" name="category" value={category} />}
            <input name="q" defaultValue={q} placeholder="내용·이름" className="h-8 w-40 rounded-lg border border-stone-300 px-2 text-xs" />
            <button className="h-8 rounded-lg bg-stone-900 px-3 text-xs font-semibold text-white">검색</button>
          </form>
        }
      />
      <Flash ok={sp(s.ok) || null} err={sp(s.err) || null} />
      {error && <ErrorNote message={error.message} missing={missing} />}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {["new", "reviewed", "done"].map((st, i) => (
          <Stat key={st} title={FEEDBACK_STATUS[st].label} value={counts[i].count ?? 0} href={href({ show: st })} warn={st === "new"} />
        ))}
        <Stat title="숨김" value={counts[3].count ?? 0} href={href({ show: "hidden" })} />
      </div>

      <ChipRow>
        <Chip href={href({ show: "new" })} active={show === "new"} tone="warn">새 의견</Chip>
        <Chip href={href({ show: "reviewed" })} active={show === "reviewed"}>확인함</Chip>
        <Chip href={href({ show: "done" })} active={show === "done"}>처리 완료</Chip>
        <Chip href={href({ show: "replied" })} active={show === "replied"}>답글 단 것</Chip>
        <Chip href={href({ show: "hidden" })} active={show === "hidden"}>숨김</Chip>
        <Chip href={href({ show: "all" })} active={show === "all"}>전체</Chip>
        <ChipDivider />
        <Chip href={href({ category: "" })} active={!category}>종류 전체</Chip>
        {FEEDBACK_CATEGORY.map((c) => <Chip key={c.code} href={href({ category: c.code })} active={category === c.code}>{c.emoji} {c.label}</Chip>)}
      </ChipRow>

      {!error && rows.length === 0 ? (
        <Empty icon="💡">{show === "new" ? "새 의견이 없습니다." : "해당하는 의견이 없습니다."}</Empty>
      ) : (
        <ul className="space-y-2">
          {rows.map((f) => {
            const cat = feedbackCategory(f.category);
            const st = FEEDBACK_STATUS[f.status] ?? FEEDBACK_STATUS.new;
            const member = f.user_id ? names.get(f.user_id) : null;
            return (
              <li key={f.id} className={`rounded-2xl border bg-white ${f.status === "new" ? "border-amber-200" : "border-stone-200"} ${!f.is_public ? "opacity-70" : ""}`}>
                <details open={focus === f.id || (show === "new" && rows.length <= 3)}>
                  <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-3 text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.tone}`}>{st.label}</span>
                    <Badge>{cat.emoji} {cat.label}</Badge>
                    {!f.is_public && <Badge tone="amber">숨김</Badge>}
                    {f.admin_reply && <Badge tone="green">답글 있음</Badge>}
                    <span className="min-w-0 flex-1 truncate">{f.content}</span>
                    <span className="shrink-0 text-xs text-stone-400">{timeAgo(f.created_at)}</span>
                  </summary>
                  <div className="space-y-3 border-t border-stone-100 px-4 py-3 text-sm">
                    <p className="whitespace-pre-wrap rounded-xl bg-stone-50 p-3 text-stone-800">{f.content}</p>
                    <p className="text-xs text-stone-500">
                      작성자 <b>{f.name}</b> (목록 표시 {maskName(f.name)})
                      {member ? <> · 회원 <Link href={`/admin/users/${f.user_id}`} className="font-semibold underline underline-offset-2">{member.display_name}</Link> ({member.role === "organization" ? "기관" : "예술가"})</> : " · 비회원"}
                      {" · "}{fmtDateTime(f.created_at)}
                    </p>
                    {f.admin_reply && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-xs font-bold text-emerald-800">현재 답글 · {f.admin_reply_at ? fmtDateTime(f.admin_reply_at) : ""}{f.admin_reply_by ? ` · ${names.get(f.admin_reply_by)?.display_name ?? ""}` : ""}</p>
                        <p className="mt-1 whitespace-pre-wrap text-stone-800">{f.admin_reply}</p>
                      </div>
                    )}
                    <form action={updateFeedback.bind(null, f.id)} className="space-y-2 rounded-xl border border-stone-200 p-3">
                      <input type="hidden" name="return_to" value={`${self}&focus=${f.id}`} />
                      <label className="block">
                        <span className="text-xs font-bold text-stone-700">운영팀 답글 (게시판에 공개로 붙습니다{member ? " · 회원 알림도 갑니다" : ""})</span>
                        <textarea name="admin_reply" rows={3} maxLength={1000} defaultValue={f.admin_reply ?? ""} placeholder="의견 감사합니다. 말씀하신 내용은 …" className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold text-stone-700">내부 메모(운영자만)</span>
                        <input name="admin_memo" maxLength={500} defaultValue={f.admin_memo ?? ""} className="mt-1 h-9 w-full rounded-lg border border-stone-300 px-2 text-xs" />
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-stone-500">상태:</span>
                        {["new", "reviewed", "done"].map((k) => (
                          <label key={k} className="flex cursor-pointer items-center gap-1 rounded-lg border border-stone-300 px-2 py-1 text-xs has-[:checked]:border-stone-900 has-[:checked]:bg-stone-900 has-[:checked]:text-white">
                            <input type="radio" name="status" value={k} defaultChecked={f.status === k} className="sr-only" />{FEEDBACK_STATUS[k].label}
                          </label>
                        ))}
                        <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-stone-300 px-2 py-1 text-xs has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50 has-[:checked]:text-amber-800">
                          <input type="checkbox" name="hide" defaultChecked={!f.is_public} className="h-3.5 w-3.5" /> 게시판에서 숨기기
                        </label>
                        <button className={`${btn.primary} ml-auto`}>저장</button>
                      </div>
                    </form>
                    <form action={deleteFeedback.bind(null, f.id)}>
                      <button className={btn.danger}>완전 삭제</button>
                      <span className="ml-2 text-[11px] text-stone-400">되돌릴 수 없습니다. 보통은 삭제 대신 숨기기를 쓰세요.</span>
                    </form>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
