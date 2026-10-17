import Link from "next/link";
import { Badge, Chip, ChipRow, Empty, Flash, PageHeader, btn } from "@/components/admin/ui";
import { sp } from "@/lib/admin/queries";
import { requestOrgDocs, setOrgVerified } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { fmtDate, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { fmtRegNumber, orgDocTypeLabel, orgTypeLabel, type OrgVerification } from "@/types/account";
import { fieldLabel } from "@/types/job";

type Row = {
  user_id: string; org_name: string; org_type: string | null; field: string | null; region: string | null; address: string | null;
  website: string | null; intro: string | null; is_verified: boolean; profile_completed: boolean; created_at: string;
};

export default async function AdminOrgsPage({ searchParams }: PageProps<"/admin/orgs">) {
  await requireAdmin("/admin/orgs");
  const s = await searchParams;
  const show = sp(s.show) === "all" ? "all" : sp(s.show) === "verified" ? "verified" : "pending";
  const q = sp(s.q);
  const supabase = (await createClient())!;
  let query = supabase.from("org_profiles").select("*").order("created_at", { ascending: false }).limit(300);
  if (show === "pending") query = query.eq("is_verified", false);
  if (show === "verified") query = query.eq("is_verified", true);
  if (q) query = query.or(`org_name.ilike.%${q}%,address.ilike.%${q}%,website.ilike.%${q}%`);
  const { data } = await query;
  const rows = (data ?? []) as Row[];
  const ids = rows.map((r) => r.user_id);
  const [{ data: profiles }, { data: postings }, { data: apps }, { data: verifs }] = await Promise.all([
    ids.length ? supabase.from("profiles").select("id, display_name, status, created_at").in("id", ids) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("org_postings").select("org_user_id, status").in("org_user_id", ids).is("deleted_at", null) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("applications").select("org_user_id").in("org_user_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("org_verifications").select("*").in("user_id", ids) : Promise.resolve({ data: [] }),
  ]);
  const verif = (id: string) => ((verifs ?? []) as OrgVerification[]).find((v) => v.user_id === id) ?? null;
  // 인증 대기 목록은 서류를 낸 기관을 맨 위로
  if (show === "pending") {
    const rank = (id: string) => ({ submitted: 0, needs_more: 2 } as Record<string, number>)[verif(id)?.status ?? ""] ?? 1;
    rows.sort((a, b) => rank(a.user_id) - rank(b.user_id));
  }
  const prof = (id: string) => (profiles ?? []).find((p) => p.id === id);
  const postingCount = (id: string) => (postings ?? []).filter((p) => p.org_user_id === id).length;
  const openCount = (id: string) => (postings ?? []).filter((p) => p.org_user_id === id && p.status === "open").length;
  const appCount = (id: string) => (apps ?? []).filter((a) => a.org_user_id === id).length;
  const href = (patch: Record<string, string>) => {
    const usp = new URLSearchParams({ show, ...(q ? { q } : {}), ...patch });
    for (const [k, v] of Object.entries(patch)) if (!v) usp.delete(k);
    return `/admin/orgs?${usp.toString()}`;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="기관 인증"
        count={rows.length}
        description="기관이 올린 사업자등록증·고유번호증을 열어 기관명·번호가 맞는지 확인한 뒤 인증하세요. 서류가 없거나 부족하면 '보완 요청'으로 사유를 보내면 기관에 알림이 갑니다. 인증하면 그 기관 공고 전체에 ✓ 인증 표시가 붙습니다. 공고 등록 자체는 인증 전에도 가능합니다."
        actions={
          <form className="flex gap-1">
            <input type="hidden" name="show" value={show} />
            <input name="q" defaultValue={q} placeholder="기관명·주소·홈페이지" className="h-8 w-40 rounded-lg border border-stone-300 px-2 text-xs" />
            <button className="h-8 rounded-lg bg-stone-900 px-3 text-xs font-semibold text-white">검색</button>
          </form>
        }
      />
      <Flash ok={sp(s.ok) || null} err={sp(s.err) || null} />
      <ChipRow>
        <Chip href={href({ show: "pending" })} active={show === "pending"} tone="warn">인증 대기</Chip>
        <Chip href={href({ show: "verified" })} active={show === "verified"}>인증됨</Chip>
        <Chip href={href({ show: "all" })} active={show === "all"}>전체</Chip>
      </ChipRow>
      {rows.length === 0 ? (
        <Empty icon="🏛️">{show === "pending" ? "인증 대기 중인 기관이 없습니다." : "해당하는 기관이 없습니다."}</Empty>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
          {rows.map((o) => {
            const p = prof(o.user_id);
            const v = verif(o.user_id);
            return (
              <li key={o.user_id} className="space-y-1.5 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/users/${o.user_id}`} className="font-bold underline-offset-2 hover:underline">{o.org_name}</Link>
                  {p && p.display_name !== o.org_name && <span className="text-xs text-stone-400">({p.display_name})</span>}
                  {o.is_verified ? <Badge tone="green">✓ 인증됨</Badge> : <Badge tone="amber">인증 대기</Badge>}
                  {p?.status === "suspended" && <Badge tone="red">정지</Badge>}
                  {!o.profile_completed && <Badge tone="orange">기관 정보 미완성</Badge>}
                  {!o.is_verified &&
                    (v?.status === "submitted" ? <Badge tone="sky">서류 제출 · 확인 필요</Badge>
                      : v?.status === "needs_more" ? <Badge tone="red">보완 요청 중</Badge>
                      : !v ? <Badge tone="stone">서류 미제출</Badge> : null)}
                  <span className="ml-auto text-xs text-stone-400">{fmtDate(o.created_at)} 가입 ({timeAgo(o.created_at)}) · 공고 {postingCount(o.user_id)}(모집중 {openCount(o.user_id)}) · 받은 지원 {appCount(o.user_id)}</span>
                </div>
                <p className="text-xs text-stone-600">
                  {[orgTypeLabel(o.org_type), fieldLabel(o.field), o.region, o.address].filter(Boolean).join(" · ") || "기관 정보 없음"}
                  {o.website && <> · <a href={o.website} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{o.website}</a></>}
                </p>
                {o.intro && <p className="line-clamp-2 text-xs text-stone-500">{o.intro}</p>}
                {v?.doc_path && (
                  <p className="rounded-lg bg-stone-50 px-2.5 py-1.5 text-xs text-stone-700">
                    <span className="font-semibold">제출 서류</span> · {[orgDocTypeLabel(v.doc_type), fmtRegNumber(v.reg_number) ?? "번호 없음", v.doc_name].filter(Boolean).join(" · ")}
                    {v.submitted_at && <span className="text-stone-400"> · {fmtDate(v.submitted_at)} 제출 ({timeAgo(v.submitted_at)})</span>}
                  </p>
                )}
                {v?.status === "needs_more" && v.admin_note && (
                  <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                    <span className="font-semibold">보낸 보완 요청</span>{v.reviewed_at && ` (${fmtDate(v.reviewed_at)})`} · {v.admin_note}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {o.is_verified ? (
                    <form action={setOrgVerified.bind(null, o.user_id, false)}><button className={btn.secondary}>인증 취소</button></form>
                  ) : (
                    <form action={setOrgVerified.bind(null, o.user_id, true)}><button className={btn.successSolid}>인증</button></form>
                  )}
                  {v?.doc_path && (
                    <a href={`/admin/orgs/doc/${o.user_id}`} target="_blank" rel="noopener noreferrer" className={btn.primary}>서류 보기 ↗</a>
                  )}
                  {!o.is_verified && (
                    <details className="group">
                      <summary className={`${btn.danger} cursor-pointer list-none`}>보완 요청</summary>
                      <form action={requestOrgDocs.bind(null, o.user_id)} className="mt-2 flex w-[min(28rem,80vw)] flex-col gap-1.5">
                        <textarea
                          name="note"
                          rows={3}
                          required
                          defaultValue={v?.doc_path ? "" : "기관 인증을 위해 사업자등록증 또는 고유번호증을 올려 주세요. (마이페이지 > 기관 정보 > 기관 인증)"}
                          placeholder="예: 서류의 기관명이 가입한 기관명과 다릅니다. 확인 후 다시 올려 주세요."
                          className="rounded-lg border border-stone-300 px-2 py-1.5 text-xs"
                        />
                        <button className={`${btn.dangerSolid} self-start`}>보내기</button>
                      </form>
                    </details>
                  )}
                  <Link href={`/admin/users/${o.user_id}`} className={btn.secondary}>회원 상세</Link>
                  {o.website && <a href={o.website} target="_blank" rel="noopener noreferrer" className={btn.secondary}>홈페이지 ↗</a>}
                  <a href={`https://www.google.com/search?q=${encodeURIComponent(o.org_name)}`} target="_blank" rel="noopener noreferrer" className={btn.secondary}>검색으로 확인 ↗</a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
