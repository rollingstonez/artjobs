import Link from "next/link";
import SourceToggle from "@/components/admin/SourceToggle";
import { Badge, Chip, ChipRow, Empty, ErrorNote, Flash, PageHeader, Stat } from "@/components/admin/ui";
import { PARSER_READY_SOURCES, ROBOTS_LABEL } from "@/lib/admin/labels";
import { safeRpc, sp } from "@/lib/admin/queries";
import { setSourceActive } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Row = { code: string; name: string; base_url: string; list_path: string | null; robots_status: string; is_active: boolean; note: string | null };
type SourceStat = { source_code: string; total: number; open_count: number; hidden_count: number; last_created: string | null; last_seen: string | null; week_count: number };

export default async function AdminSourcesPage({ searchParams }: PageProps<"/admin/sources">) {
  await requireAdmin("/admin/sources");
  const s = await searchParams;
  const err = sp(s.err) || null;
  const okCode = sp(s.ok) || null;
  const show = ["active", "parser", "private", "dup", "blocked", "all"].includes(sp(s.show)) ? sp(s.show) : "all";
  const q = sp(s.q);
  const supabase = (await createClient())!;
  const [{ data }, stats] = await Promise.all([
    supabase.from("crawl_sources").select("*").order("is_active", { ascending: false }).order("name"),
    safeRpc<SourceStat>(supabase, "admin_source_stats"),
  ]);
  const all = (data ?? []) as Row[];
  const statOf = (code: string) => stats.data.find((x) => x.source_code === code);
  const isDup = (r: Row) => (r.note ?? "").includes("아트누리와 공모 중복");
  const isPrivate = (r: Row) => (r.note ?? "").includes("민간·협의대기");
  const hasParser = (r: Row) => PARSER_READY_SOURCES.includes(r.code);
  let rows = all;
  if (show === "active") rows = rows.filter((r) => r.is_active);
  if (show === "parser") rows = rows.filter(hasParser);
  if (show === "private") rows = rows.filter(isPrivate);
  if (show === "dup") rows = rows.filter(isDup);
  if (show === "blocked") rows = rows.filter((r) => r.robots_status === "blocked" || r.robots_status === "gray");
  if (q) rows = rows.filter((r) => `${r.name} ${r.code} ${r.base_url} ${r.note ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const active = all.filter((r) => r.is_active).length;
  const activeNoParser = all.filter((r) => r.is_active && !hasParser(r)).length;
  const totalWeek = stats.data.reduce((n, r) => n + Number(r.week_count), 0);
  const href = (patch: Record<string, string>) => {
    const usp = new URLSearchParams({ show, ...(q ? { q } : {}), ...patch });
    for (const [k, v] of Object.entries(patch)) if (!v) usp.delete(k);
    return `/admin/sources?${usp.toString()}`;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="크롤 소스"
        count={`${active} / ${all.length} 가동`}
        description={
          <>
            <p><b>‘허용’</b>은 “robots.txt 상 긁어가도 된다”는 뜻일 뿐, 켠다고 바로 수집되는 건 아닙니다. 실제로 수집되려면 그 사이트 전용 <b>수집기(파서)</b>가 있어야 하고, 지금은 <b>{PARSER_READY_SOURCES.length}곳</b>만 파서가 완성돼 매일 돕니다(<code>docs/collection-status.md</code>). 파서 없는 소스는 켜도 0건입니다.</p>
            <p className="mt-1"><Badge tone="orange">민간·협의대기</Badge> 사기업·사립기관 등 민간 사업체. 서면 협의(수집 안내) 전까지는 켜지 않습니다. <Badge tone="violet">아트누리 중복</Badge> 공모·지원사업이 아트누리(통합안내)에 이미 다 모이는 지역 문화재단이라 개별 수집에서 빼 둔 곳(꺼진 채 보관). <Badge tone="indigo">파서 있음</Badge> crawl_&lt;code&gt;.py 가 있어 켜면 실제로 수집됩니다.</p>
          </>
        }
        actions={
          <form className="flex gap-1">
            <input type="hidden" name="show" value={show} />
            <input name="q" defaultValue={q} placeholder="이름·코드·주소·메모" className="h-8 w-40 rounded-lg border border-stone-300 px-2 text-xs" />
            <button className="h-8 rounded-lg bg-stone-900 px-3 text-xs font-semibold text-white">검색</button>
          </form>
        }
      />
      <Flash err={err ? `저장 실패: ${err}` : null} ok={okCode ? `${okCode} 을(를) ${sp(s.on) === "1" ? "켰습니다" : "껐습니다"}.` : null} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat title="가동 중" value={active} href={href({ show: "active" })} />
        <Stat title="파서 완성" value={PARSER_READY_SOURCES.length} href={href({ show: "parser" })} note="매일 실제 수집" />
        <Stat title="켜져 있지만 파서 없음" value={activeNoParser} href={href({ show: "active" })} warn note="켜도 0건 — 파서를 만들어야 함" />
        <Stat title="최근 7일 수집" value={stats.error ? null : totalWeek} href="/admin/crawled" />
      </div>
      <ChipRow>
        <Chip href={href({ show: "all" })} active={show === "all"}>전체</Chip>
        <Chip href={href({ show: "active" })} active={show === "active"}>가동 중</Chip>
        <Chip href={href({ show: "parser" })} active={show === "parser"}>파서 있음</Chip>
        <Chip href={href({ show: "private" })} active={show === "private"}>민간·협의대기</Chip>
        <Chip href={href({ show: "dup" })} active={show === "dup"}>아트누리 중복</Chip>
        <Chip href={href({ show: "blocked" })} active={show === "blocked"}>차단·회색</Chip>
      </ChipRow>
      {stats.error && <ErrorNote message={stats.error} missing={stats.missing} />}
      {all.length === 0 ? (
        <Empty icon="🔌">소스 대장이 비어 있습니다. <code>supabase/seed/crawl_sources.sql</code> 을 SQL Editor 에서 실행하세요.</Empty>
      ) : rows.length === 0 ? (
        <Empty icon="🔌">조건에 맞는 소스가 없습니다.</Empty>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
          {rows.map((r) => {
            const rb = ROBOTS_LABEL[r.robots_status] ?? ROBOTS_LABEL.unchecked;
            const canEnable = r.robots_status === "clean" || r.robots_status === "agreed";
            const st = statOf(r.code);
            return (
              <li key={r.code} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {r.name} <span className="text-xs font-normal text-stone-400">{r.code}</span>
                    {hasParser(r) && <Badge tone="indigo" className="ml-1">파서 있음</Badge>}
                    {r.is_active && !hasParser(r) && <Badge tone="amber" className="ml-1" title="켜져 있지만 파서가 없어 수집되지 않습니다">파서 없음</Badge>}
                  </p>
                  <p className="truncate text-xs text-stone-500">
                    <a href={r.base_url + (r.list_path ?? "")} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{r.base_url}{r.list_path ?? ""}</a>
                    {r.note && <> · {r.note}</>}
                  </p>
                  {st && Number(st.total) > 0 && (
                    <p className="text-[11px] text-stone-400">
                      <Link href={`/admin/crawled?source=${r.code}`} className="hover:underline">누적 {Number(st.total)} · 모집중 {Number(st.open_count)} · 7일 {Number(st.week_count)}{Number(st.hidden_count) > 0 ? ` · 숨김 ${Number(st.hidden_count)}` : ""}</Link>
                      {st.last_seen && <> · 마지막 확인 {timeAgo(st.last_seen)}</>}
                    </p>
                  )}
                </div>
                {isPrivate(r) && <Badge tone="orange" title="사기업·사립기관 등 민간 사업체입니다. 서면 협의(수집 안내) 전까지는 켜지 않습니다.">민간·협의대기</Badge>}
                {isDup(r) && <Badge tone="violet" title="공모·지원사업은 아트누리(통합안내)가 모아 오므로 개별 수집에서 제외했습니다.">아트누리 중복</Badge>}
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${rb.tone}`}>{rb.label}</span>
                <SourceToggle action={setSourceActive.bind(null, r.code, !r.is_active)} active={r.is_active} canEnable={canEnable} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
