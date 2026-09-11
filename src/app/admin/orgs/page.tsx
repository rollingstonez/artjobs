import Link from "next/link";
import { setOrgVerified } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { orgTypeLabel } from "@/types/account";
import { fieldLabel } from "@/types/job";

type Row = {
  user_id: string; org_name: string; org_type: string | null; field: string | null; region: string | null; address: string | null;
  website: string | null; intro: string | null; is_verified: boolean; profile_completed: boolean; created_at: string;
};

export default async function AdminOrgsPage({ searchParams }: PageProps<"/admin/orgs">) {
  await requireAdmin("/admin/orgs");
  const sp = await searchParams;
  const show = sp.show === "all" ? "all" : "pending";
  const supabase = (await createClient())!;
  let q = supabase.from("org_profiles").select("*").order("created_at", { ascending: false }).limit(300);
  if (show === "pending") q = q.eq("is_verified", false);
  const { data } = await q;
  const rows = (data ?? []) as Row[];
  const ids = rows.map((r) => r.user_id);
  const [{ data: profiles }, { data: postings }] = await Promise.all([
    ids.length ? supabase.from("profiles").select("id, display_name, status").in("id", ids) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("org_postings").select("org_user_id").in("org_user_id", ids).is("deleted_at", null) : Promise.resolve({ data: [] }),
  ]);
  const statusOf = (id: string) => (profiles ?? []).find((p) => p.id === id)?.status ?? "active";
  const postingCount = (id: string) => (postings ?? []).filter((p) => p.org_user_id === id).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">기관 인증 <span className="text-stone-400">{rows.length}</span></h2>
        <div className="flex gap-1 text-xs">
          <Link href="/admin/orgs" className={`rounded-lg px-3 py-1.5 font-semibold ${show === "pending" ? "bg-stone-900 text-white" : "border border-stone-300"}`}>인증 대기</Link>
          <Link href="/admin/orgs?show=all" className={`rounded-lg px-3 py-1.5 font-semibold ${show === "all" ? "bg-stone-900 text-white" : "border border-stone-300"}`}>전체</Link>
        </div>
      </div>
      <p className="text-xs text-stone-500">
        기관명·주소·홈페이지를 보고 실제 기관인지 확인한 뒤 인증하세요. 인증하면 기관에 알림이 가고 공고에 인증 표시가 붙습니다. 공고 등록 자체는 인증 전에도 가능합니다.
      </p>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">{show === "pending" ? "인증 대기 중인 기관이 없습니다." : "가입한 기관이 없습니다."}</p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
          {rows.map((o) => (
            <li key={o.user_id} className="space-y-1 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold">{o.org_name}</span>
                {o.is_verified && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">인증됨</span>}
                {statusOf(o.user_id) !== "active" && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">정지</span>}
                {!o.profile_completed && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-500">기관 정보 미완성</span>}
                <span className="ml-auto text-xs text-stone-400">{fmtDate(o.created_at)} 가입 · 공고 {postingCount(o.user_id)}</span>
              </div>
              <p className="text-xs text-stone-600">
                {[orgTypeLabel(o.org_type), fieldLabel(o.field), o.region, o.address].filter(Boolean).join(" · ") || "기관 정보 없음"}
                {o.website && <> · <a href={o.website} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{o.website}</a></>}
              </p>
              {o.intro && <p className="line-clamp-2 text-xs text-stone-500">{o.intro}</p>}
              <div className="flex gap-2 pt-1 text-xs">
                {o.is_verified ? (
                  <form action={setOrgVerified.bind(null, o.user_id, false)}><button className="rounded-lg border border-stone-300 px-3 py-1.5">인증 취소</button></form>
                ) : (
                  <form action={setOrgVerified.bind(null, o.user_id, true)}><button className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white">인증</button></form>
                )}
                <Link href={`/admin/users?q=${encodeURIComponent(o.org_name)}`} className="rounded-lg border border-stone-300 px-3 py-1.5">회원 정보</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
