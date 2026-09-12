import Link from "next/link";
import { Badge, Chip, ChipDivider, ChipRow, Empty, ErrorNote, Flash, PageHeader, Stat, btn } from "@/components/admin/ui";
import { CONTACT_CATEGORY, CONTACT_STATUS, contactCategoryLabel } from "@/lib/admin/labels";
import { nameMap, sp } from "@/lib/admin/queries";
import { updateContact } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Row = {
  id: string; user_id: string | null; name: string; email: string; category: string; subject: string; body: string; status: string;
  admin_reply: string | null; replied_by: string | null; replied_at: string | null; admin_memo: string | null; created_at: string;
};

export default async function AdminSupportPage({ searchParams }: PageProps<"/admin/support">) {
  await requireAdmin("/admin/support");
  const s = await searchParams;
  const show = ["all", "in_progress", "replied", "closed", "open"].includes(sp(s.show)) ? sp(s.show) : "new";
  const category = CONTACT_CATEGORY.some((c) => c.code === sp(s.category)) ? sp(s.category) : "";
  const q = sp(s.q);
  const focus = sp(s.focus);
  const supabase = (await createClient())!;
  let query = supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(300);
  if (show === "open") query = query.in("status", ["new", "in_progress"]);
  else if (show !== "all") query = query.eq("status", show);
  if (category) query = query.eq("category", category);
  if (q) query = query.or(`subject.ilike.%${q}%,body.ilike.%${q}%,name.ilike.%${q}%,email.ilike.%${q}%`);
  const [{ data, error }, ...counts] = await Promise.all([
    query,
    ...["new", "in_progress", "replied", "closed"].map((st) => supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", st)),
  ]);
  const rows = (data ?? []) as Row[];
  const names = await nameMap(supabase, rows.flatMap((r) => [r.user_id, r.replied_by]));
  const href = (patch: Record<string, string>) => {
    const usp = new URLSearchParams({ show, ...(category ? { category } : {}), ...(q ? { q } : {}), ...patch });
    for (const [k, v] of Object.entries(patch)) if (!v) usp.delete(k);
    return `/admin/support?${usp.toString()}`;
  };
  const self = href({});

  return (
    <div className="space-y-4">
      <PageHeader
        title="고객 문의"
        count={rows.length}
        description={<>/support 로 들어온 문의입니다. <b>답변</b>을 적어 저장하면 회원 문의는 회원의 알림에 뜨고 /support 에서 답변을 볼 수 있습니다. 비회원 문의는 적어 준 이메일로 직접 답장해야 합니다(“메일로 답장” 버튼). 답변을 적으면 상태가 자동으로 <b>답변 완료</b>가 됩니다.</>}
        actions={
          <form className="flex gap-1">
            <input type="hidden" name="show" value={show} />
            {category && <input type="hidden" name="category" value={category} />}
            <input name="q" defaultValue={q} placeholder="제목·내용·이름·이메일" className="h-8 w-44 rounded-lg border border-stone-300 px-2 text-xs" />
            <button className="h-8 rounded-lg bg-stone-900 px-3 text-xs font-semibold text-white">검색</button>
          </form>
        }
      />
      <Flash ok={sp(s.ok) || null} err={sp(s.err) || null} />
      {error && <ErrorNote message={error.message} missing />}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {["new", "in_progress", "replied", "closed"].map((st, i) => (
          <Stat key={st} title={CONTACT_STATUS[st].label} value={counts[i].count ?? 0} href={href({ show: st })} warn={st === "new"} />
        ))}
      </div>
      <ChipRow>
        <Chip href={href({ show: "new" })} active={show === "new"} tone="warn">새 문의</Chip>
        <Chip href={href({ show: "in_progress" })} active={show === "in_progress"}>처리 중</Chip>
        <Chip href={href({ show: "open" })} active={show === "open"}>미완료 전체</Chip>
        <Chip href={href({ show: "replied" })} active={show === "replied"}>답변 완료</Chip>
        <Chip href={href({ show: "closed" })} active={show === "closed"}>종결</Chip>
        <Chip href={href({ show: "all" })} active={show === "all"}>전체</Chip>
        <ChipDivider />
        <Chip href={href({ category: "" })} active={!category}>유형 전체</Chip>
        {CONTACT_CATEGORY.map((c) => <Chip key={c.code} href={href({ category: c.code })} active={category === c.code}>{c.label}</Chip>)}
      </ChipRow>
      {!error && rows.length === 0 ? (
        <Empty icon="📮">{show === "new" ? "새 문의가 없습니다." : "해당하는 문의가 없습니다."}</Empty>
      ) : (
        <ul className="space-y-2">
          {rows.map((m) => {
            const st = CONTACT_STATUS[m.status] ?? CONTACT_STATUS.new;
            const member = m.user_id ? names.get(m.user_id) : null;
            return (
              <li key={m.id} className={`rounded-2xl border bg-white ${m.status === "new" ? "border-amber-200" : "border-stone-200"}`}>
                <details open={focus === m.id || (show === "new" && rows.length <= 3)}>
                  <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-3 text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.tone}`}>{st.label}</span>
                    <Badge>{contactCategoryLabel(m.category)}</Badge>
                    <span className="font-bold">{m.subject}</span>
                    <span className="text-xs text-stone-500">{m.name} · {m.email}{member ? "" : " · 비회원"}</span>
                    <span className="ml-auto text-xs text-stone-400">{fmtDateTime(m.created_at)} ({timeAgo(m.created_at)})</span>
                  </summary>
                  <div className="space-y-3 border-t border-stone-100 px-4 py-3 text-sm">
                    <div className="whitespace-pre-wrap rounded-xl bg-stone-50 p-3 text-stone-800">{m.body}</div>
                    <p className="text-xs text-stone-500">
                      보낸 사람: <b>{m.name}</b> · <a href={`mailto:${m.email}?subject=${encodeURIComponent(`[아트잡스] Re: ${m.subject}`)}`} className="underline underline-offset-2">{m.email}</a>
                      {member && <> · 회원 <Link href={`/admin/users/${m.user_id}`} className="font-semibold underline underline-offset-2">{member.display_name}</Link> ({member.role === "organization" ? "기관" : "예술가"})</>}
                    </p>
                    {m.admin_reply && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-xs font-bold text-emerald-800">보낸 답변 · {m.replied_at ? fmtDateTime(m.replied_at) : ""}{m.replied_by ? ` · ${names.get(m.replied_by)?.display_name ?? ""}` : ""}</p>
                        <p className="mt-1 whitespace-pre-wrap text-stone-800">{m.admin_reply}</p>
                      </div>
                    )}
                    <form action={updateContact.bind(null, m.id)} className="space-y-2 rounded-xl border border-stone-200 p-3">
                      <input type="hidden" name="return_to" value={`${self}&focus=${m.id}`} />
                      <label className="block">
                        <span className="text-xs font-bold text-stone-700">답변 {member ? "(회원 알림 + /support 에 표시)" : "(비회원 — 저장 후 아래 ‘메일로 답장’ 으로 직접 보내세요)"}</span>
                        <textarea name="admin_reply" rows={4} maxLength={4000} defaultValue={m.admin_reply ?? ""} placeholder="안녕하세요, 아트잡스 운영팀입니다. …" className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold text-stone-700">내부 메모(운영자만)</span>
                        <input name="admin_memo" maxLength={1000} defaultValue={m.admin_memo ?? ""} className="mt-1 h-9 w-full rounded-lg border border-stone-300 px-2 text-xs" />
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-stone-500">상태:</span>
                        {["new", "in_progress", "replied", "closed"].map((k) => (
                          <label key={k} className="flex cursor-pointer items-center gap-1 rounded-lg border border-stone-300 px-2 py-1 text-xs has-[:checked]:border-stone-900 has-[:checked]:bg-stone-900 has-[:checked]:text-white">
                            <input type="radio" name="status" value={k} defaultChecked={m.status === k} className="sr-only" />{CONTACT_STATUS[k].label}
                          </label>
                        ))}
                        <button className={`${btn.primary} ml-auto`}>저장</button>
                        <a href={`mailto:${m.email}?subject=${encodeURIComponent(`[아트잡스] Re: ${m.subject}`)}&body=${encodeURIComponent(m.admin_reply ?? "")}`} className={btn.secondary}>메일로 답장 ↗</a>
                      </div>
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
