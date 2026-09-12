import Link from "next/link";
import { Badge, Chip, ChipDivider, ChipRow, Empty, ErrorNote, Flash, PageHeader, Pager, Stat, btn } from "@/components/admin/ui";
import { safeRpc, sp } from "@/lib/admin/queries";
import { closeCrawledPosting, hideCrawledPosting, unhideCrawledPosting } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { fmtDate, timeAgo } from "@/lib/format";
import { isLivingPosting } from "@/lib/living";
import { createClient } from "@/lib/supabase/server";
import { BOARDS, boardLabel, employmentLabel, fieldLabel } from "@/types/job";

type Row = {
  id: string; source_code: string; source_name: string; source_url: string; title: string; organization: string | null; board: string; field: string | null;
  employment_type: string | null; region: string | null; apply_end: string | null; status: string; created_at: string; last_seen_at: string | null;
  hidden_at?: string | null; hidden_reason?: string | null; category_raw: string | null;
};
type SourceStat = { source_code: string; total: number; open_count: number; hidden_count: number };

const LIMIT = 60;

export default async function AdminCrawledPage({ searchParams }: PageProps<"/admin/crawled">) {
  await requireAdmin("/admin/crawled");
  const s = await searchParams;
  const show = ["closed", "hidden", "all", "expired"].includes(sp(s.show)) ? sp(s.show) : "open";
  const source = sp(s.source);
  const board = BOARDS.some((b) => b.code === sp(s.board)) ? sp(s.board) : "";
  const q = sp(s.q);
  const offset = Math.max(0, parseInt(sp(s.offset) || "0", 10) || 0);
  const supabase = (await createClient())!;

  let query = supabase.from("crawled_postings").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(offset, offset + LIMIT - 1);
  if (show === "open") query = query.eq("status", "open");
  if (show === "expired") query = query.eq("status", "open").lt("apply_end", new Date().toISOString().slice(0, 10));
  if (show === "closed") query = query.eq("status", "closed");
  if (show === "hidden") query = query.not("hidden_at", "is", null);
  if (source) query = query.eq("source_code", source);
  if (board) query = query.eq("board", board);
  if (q) query = query.or(`title.ilike.%${q}%,organization.ilike.%${q}%`);

  const [res, stats, sources] = await Promise.all([
    query,
    safeRpc<SourceStat>(supabase, "admin_source_stats"),
    supabase.from("crawl_sources").select("code, name, is_active").order("name"),
  ]);
  const rows = (res.data ?? []) as Row[];
  const total = res.count ?? rows.length;
  const hiddenSupported = !(res.error && res.error.message.includes("hidden_at"));
  const totals = stats.data.reduce((acc, r) => ({ total: acc.total + Number(r.total), open: acc.open + Number(r.open_count), hidden: acc.hidden + Number(r.hidden_count) }), { total: 0, open: 0, hidden: 0 });
  const srcName = (code: string) => (sources.data ?? []).find((x) => x.code === code)?.name ?? code;
  const activeSources = (sources.data ?? []).filter((x) => x.is_active);
  const statOf = (code: string) => stats.data.find((x) => x.source_code === code);

  const href = (patch: Record<string, string>) => {
    const usp = new URLSearchParams({ show, ...(source ? { source } : {}), ...(board ? { board } : {}), ...(q ? { q } : {}), ...patch });
    for (const [k, v] of Object.entries(patch)) if (!v) usp.delete(k);
    return `/admin/crawled?${usp.toString()}`;
  };
  const self = href({ offset: offset ? String(offset) : "" });

  return (
    <div className="space-y-4">
      <PageHeader
        title="수집 공고"
        count={total}
        description={<>크롤러가 매일 모아 온 공고입니다. 잘못 분류됐거나 예술 분야가 아닌 공고, 기관이 내려달라고 한 공고는 <b>숨기기</b>로 목록·홈에서 뺄 수 있습니다(원문은 지우지 않고 보관). 다시 수집돼도 숨김은 유지됩니다. <b>마감</b>은 다음 수집에서 다시 발견되면 모집중으로 돌아올 수 있으니, 확실히 빼려면 숨기기를 쓰세요.</>}
        actions={
          <form className="flex gap-1">
            <input type="hidden" name="show" value={show} />
            {source && <input type="hidden" name="source" value={source} />}
            {board && <input type="hidden" name="board" value={board} />}
            <input name="q" defaultValue={q} placeholder="제목·기관명" className="h-8 w-40 rounded-lg border border-stone-300 px-2 text-xs" />
            <button className="h-8 rounded-lg bg-stone-900 px-3 text-xs font-semibold text-white">검색</button>
          </form>
        }
      />
      <Flash ok={sp(s.ok) || null} err={sp(s.err) || null} />
      {!stats.error && (
        <div className="grid grid-cols-3 gap-2">
          <Stat title="누적 수집" value={totals.total} href={href({ show: "all" })} />
          <Stat title="모집중" value={totals.open} href={href({ show: "open" })} />
          <Stat title="숨김" value={totals.hidden} href={href({ show: "hidden" })} />
        </div>
      )}
      <ChipRow>
        <Chip href={href({ show: "open", offset: "" })} active={show === "open"}>모집중</Chip>
        <Chip href={href({ show: "expired", offset: "" })} active={show === "expired"}>마감일 지남(모집중 표시)</Chip>
        <Chip href={href({ show: "closed", offset: "" })} active={show === "closed"}>마감</Chip>
        <Chip href={href({ show: "hidden", offset: "" })} active={show === "hidden"} tone="warn">숨김</Chip>
        <Chip href={href({ show: "all", offset: "" })} active={show === "all"}>전체</Chip>
        <ChipDivider />
        <Chip href={href({ board: "", offset: "" })} active={!board}>게시판 전체</Chip>
        {BOARDS.map((b) => <Chip key={b.code} href={href({ board: b.code, offset: "" })} active={board === b.code}>{b.label}</Chip>)}
      </ChipRow>
      <details className="rounded-xl border border-stone-200 bg-white p-3" open={Boolean(source)}>
        <summary className="cursor-pointer text-xs font-bold text-stone-700">소스별 보기 {source && <span className="text-stone-500">— {srcName(source)}</span>}</summary>
        <div className="mt-2 flex flex-wrap gap-1">
          <Chip href={href({ source: "", offset: "" })} active={!source}>전체 소스</Chip>
          {activeSources.map((x) => {
            const st = statOf(x.code);
            return <Chip key={x.code} href={href({ source: x.code, offset: "" })} active={source === x.code}>{x.name}{st ? ` ${Number(st.open_count)}/${Number(st.total)}` : ""}</Chip>;
          })}
        </div>
        <p className="mt-2 text-[11px] text-stone-400">가동 중인 소스만 보입니다. 숫자는 모집중/누적. 꺼진 소스의 공고를 보려면 검색을 쓰세요.</p>
      </details>
      {res.error && <ErrorNote message={res.error.message} missing={!hiddenSupported} />}
      {rows.length === 0 ? (
        <Empty icon="🛰️">해당하는 수집 공고가 없습니다.</Empty>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
          {rows.map((p) => {
            const living = p.status === "open" && isLivingPosting(p.apply_end, p.created_at);
            const hidden = Boolean(p.hidden_at);
            return (
              <li key={p.id} className={`px-4 py-3 text-sm ${hidden ? "bg-amber-50/40" : ""}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/${p.board === "audition" ? "auditions" : "jobs"}/crawled:${p.id}`} className="block truncate font-semibold hover:underline">{p.title}</Link>
                    <p className="text-xs text-stone-500">
                      <Link href={href({ source: p.source_code, offset: "" })} className="font-semibold text-stone-700 hover:underline">{p.source_name}</Link>
                      {p.organization && <> · {p.organization}</>} · {boardLabel(p.board)} · {fieldLabel(p.field) ?? "분야 미정"} · {employmentLabel(p.employment_type) ?? "고용형태 미정"} · {p.region ?? "지역 미정"} · {p.apply_end ? `~${fmtDate(p.apply_end)}` : "마감일 없음"} · 수집 {timeAgo(p.created_at)}{p.last_seen_at && <> · 확인 {timeAgo(p.last_seen_at)}</>}
                      {p.category_raw && <span className="text-stone-400"> · 원문분류 {p.category_raw}</span>}
                    </p>
                    {hidden && <p className="mt-0.5 text-xs text-amber-800">숨김 {fmtDate(p.hidden_at!)}{p.hidden_reason ? ` · ${p.hidden_reason}` : ""}</p>}
                  </div>
                  {hidden ? <Badge tone="amber">숨김</Badge> : p.status === "open" ? (living ? <Badge tone="green">모집중</Badge> : <Badge tone="stone">기간 지남</Badge>) : <Badge>마감</Badge>}
                  <a href={p.source_url} target="_blank" rel="noopener noreferrer" className={btn.secondary}>원문 ↗</a>
                  {hiddenSupported && (hidden ? (
                    <form action={unhideCrawledPosting.bind(null, p.id)}><input type="hidden" name="return_to" value={self} /><button className={btn.success}>숨김 해제</button></form>
                  ) : (
                    <>
                      {p.status === "open" && <form action={closeCrawledPosting.bind(null, p.id)}><input type="hidden" name="return_to" value={self} /><button className={btn.secondary}>마감</button></form>}
                      <details className="relative">
                        <summary className={`${btn.danger} cursor-pointer list-none`}>숨기기</summary>
                        <form action={hideCrawledPosting.bind(null, p.id)} className="absolute right-0 z-10 mt-1 w-72 space-y-1.5 rounded-xl border border-stone-200 bg-white p-3 shadow-lg">
                          <input type="hidden" name="return_to" value={self} />
                          <p className="text-xs font-bold">숨기는 이유(선택)</p>
                          <input name="reason" list="hide-reasons" maxLength={200} placeholder="예: 예술 분야 아님 / 기관 요청 / 중복" className="h-8 w-full rounded-lg border border-stone-300 px-2 text-xs" />
                          <button className={btn.dangerSolid}>숨기기</button>
                        </form>
                      </details>
                    </>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <datalist id="hide-reasons">
        <option value="예술 분야 아님" /><option value="기관 요청" /><option value="중복 공고" /><option value="잘못 수집됨(공고 아님)" /><option value="개인정보 포함" />
      </datalist>
      <Pager total={total} limit={LIMIT} offset={offset} makeHref={(o) => href({ offset: String(o) })} />
    </div>
  );
}
