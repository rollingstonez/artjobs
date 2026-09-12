import Link from "next/link";
import { Chip, ChipDivider, ChipRow, Empty, PageHeader, Stat, Table, Td, Th, ToneBadge, UserLink } from "@/components/admin/ui";
import { daysAgoIso, nameMap, sp } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { APPLICATION_STAGES, APPLICATION_STATUS, stageTone, type Application } from "@/types/account";

export default async function AdminApplicationsPage({ searchParams }: PageProps<"/admin/applications">) {
  await requireAdmin("/admin/applications");
  const s = await searchParams;
  const status = sp(s.status) in APPLICATION_STATUS ? sp(s.status) : "";
  const days = ["7", "30", "90"].includes(sp(s.days)) ? sp(s.days) : "";
  const q = sp(s.q);
  const supabase = (await createClient())!;

  let query = supabase.from("applications").select("*").order("created_at", { ascending: false }).limit(300);
  if (status) query = query.eq("status", status);
  if (days) query = query.gte("created_at", daysAgoIso(parseInt(days, 10)));
  const [{ data }, counts] = await Promise.all([
    query,
    Promise.all(APPLICATION_STAGES.map((st) => supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", st.code))),
  ]);
  let rows = (data ?? []) as Application[];
  const names = await nameMap(supabase, rows.flatMap((a) => [a.artist_user_id, a.org_user_id]));
  if (q) {
    const lq = q.toLowerCase();
    rows = rows.filter((a) => a.posting_title.toLowerCase().includes(lq) || (names.get(a.artist_user_id)?.display_name ?? "").toLowerCase().includes(lq) || (names.get(a.org_user_id ?? "")?.display_name ?? "").toLowerCase().includes(lq));
  }
  const href = (patch: Record<string, string>) => {
    const usp = new URLSearchParams({ ...(status ? { status } : {}), ...(days ? { days } : {}), ...(q ? { q } : {}), ...patch });
    for (const [k, v] of Object.entries(patch)) if (!v) usp.delete(k);
    const qs = usp.toString();
    return `/admin/applications${qs ? `?${qs}` : ""}`;
  };
  const total = counts.reduce((n, c) => n + (c.count ?? 0), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="지원 현황"
        count={rows.length}
        description="아트잡스 안에서 이뤄진 지원(기관 직접 공고 대상)입니다. 선발 단계는 기관이 바꾸며, 운영자는 흐름만 봅니다. 지원 메시지·프로필 스냅샷은 기관과 지원자만 봅니다."
        actions={
          <form className="flex gap-1">
            {status && <input type="hidden" name="status" value={status} />}
            {days && <input type="hidden" name="days" value={days} />}
            <input name="q" defaultValue={q} placeholder="공고 제목·예술가·기관" className="h-8 w-44 rounded-lg border border-stone-300 px-2 text-xs" />
            <button className="h-8 rounded-lg bg-stone-900 px-3 text-xs font-semibold text-white">검색</button>
          </form>
        }
      />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
        <Stat title="전체" value={total} href={href({ status: "" })} />
        {APPLICATION_STAGES.map((st, i) => <Stat key={st.code} title={st.label} value={counts[i].count ?? 0} href={href({ status: st.code })} />)}
      </div>
      <ChipRow>
        <Chip href={href({ status: "" })} active={!status}>전체 단계</Chip>
        {APPLICATION_STAGES.map((st) => <Chip key={st.code} href={href({ status: st.code })} active={status === st.code}>{st.label}</Chip>)}
        <Chip href={href({ status: "withdrawn" })} active={status === "withdrawn"}>지원 취소</Chip>
        <ChipDivider />
        <Chip href={href({ days: "" })} active={!days}>기간 전체</Chip>
        <Chip href={href({ days: "7" })} active={days === "7"}>7일</Chip>
        <Chip href={href({ days: "30" })} active={days === "30"}>30일</Chip>
        <Chip href={href({ days: "90" })} active={days === "90"}>90일</Chip>
      </ChipRow>
      {rows.length === 0 ? (
        <Empty icon="📨">해당하는 지원이 없습니다.</Empty>
      ) : (
        <Table>
          <thead className="bg-stone-50"><tr><Th>단계</Th><Th>공고</Th><Th>지원자</Th><Th>기관</Th><Th>지원</Th><Th>단계 변경</Th><Th>보관</Th></tr></thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((a) => {
              const artist = names.get(a.artist_user_id);
              const org = a.org_user_id ? names.get(a.org_user_id) : undefined;
              return (
                <tr key={a.id} className="hover:bg-stone-50">
                  <Td><ToneBadge tone={stageTone(a.status)}>{APPLICATION_STATUS[a.status]}</ToneBadge></Td>
                  <Td>
                    <Link href={`/jobs/${a.posting_source === "org" ? "org:" : "crawled:"}${a.posting_id}`} className="line-clamp-2 font-semibold hover:underline">{a.posting_title}</Link>
                    <span className="text-[11px] text-stone-400">{a.posting_source === "org" ? "기관 직접 공고" : "수집 공고"}</span>
                  </Td>
                  <Td><UserLink id={a.artist_user_id} name={artist?.display_name} status={artist?.status} /></Td>
                  <Td>{a.org_user_id ? <UserLink id={a.org_user_id} name={org?.display_name} status={org?.status} /> : <span className="text-xs text-stone-400">—</span>}</Td>
                  <Td className="text-xs text-stone-500">{fmtDateTime(a.created_at)}<span className="block text-[11px] text-stone-400">{timeAgo(a.created_at)}</span></Td>
                  <Td className="text-xs text-stone-500">{a.status_changed_at !== a.created_at ? fmtDateTime(a.status_changed_at) : "—"}</Td>
                  <Td className="text-xs">{a.purged_at ? <span className="text-stone-400">파기됨</span> : a.profile_snapshot ? <span className="text-emerald-700">스냅샷</span> : <span className="text-stone-400">없음</span>}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
