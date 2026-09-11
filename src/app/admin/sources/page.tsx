import SourceToggle from "@/components/admin/SourceToggle";
import { setSourceActive } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Row = { code: string; name: string; base_url: string; list_path: string | null; robots_status: string; is_active: boolean; note: string | null };

const ROBOTS: Record<string, { label: string; tone: string }> = {
  clean: { label: "허용", tone: "bg-emerald-50 text-emerald-700" },
  agreed: { label: "협의 완료", tone: "bg-emerald-50 text-emerald-700" },
  gray: { label: "회색", tone: "bg-amber-50 text-amber-700" },
  blocked: { label: "차단", tone: "bg-red-50 text-red-700" },
  unchecked: { label: "미판정", tone: "bg-stone-100 text-stone-500" },
};

export default async function AdminSourcesPage({ searchParams }: PageProps<"/admin/sources">) {
  await requireAdmin("/admin/sources");
  const sp = await searchParams;
  const err = typeof sp.err === "string" ? sp.err : null;
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  const supabase = (await createClient())!;
  const { data } = await supabase.from("crawl_sources").select("*").order("is_active", { ascending: false }).order("name");
  const rows = (data ?? []) as Row[];
  const active = rows.filter((r) => r.is_active).length;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">크롤 소스 <span className="text-stone-400">{active} / {rows.length} 가동</span></h2>
      {err && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">저장 실패: {err}</p>}
      {ok && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{ok} 을(를) {sp.on === "1" ? "켰습니다" : "껐습니다"}.</p>}
      <p className="text-xs text-stone-500">
        스위치를 켜면 크롤러가 그 사이트를 수집합니다. robots 판정이 &lsquo;허용&rsquo; 또는 &lsquo;협의 완료&rsquo;인 곳만 켜세요. 판정은 GitHub Actions 의 robots-check 로 갱신하고, 파서가 준비된 소스만 실제로 돕니다(`docs/collection-status.md`).
      </p>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
          소스 대장이 비어 있습니다. <code>supabase/seed/crawl_sources.sql</code> 을 SQL Editor 에서 실행하세요.
        </p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
          {rows.map((s) => {
            const r = ROBOTS[s.robots_status] ?? ROBOTS.unchecked;
            const canEnable = s.robots_status === "clean" || s.robots_status === "agreed";
            return (
              <li key={s.code} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {s.name} <span className="text-xs font-normal text-stone-400">{s.code}</span>
                  </p>
                  <p className="truncate text-xs text-stone-500">
                    <a href={s.base_url + (s.list_path ?? "")} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{s.base_url}{s.list_path ?? ""}</a>
                    {s.note && <> · {s.note}</>}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.tone}`}>{r.label}</span>
                <SourceToggle action={setSourceActive.bind(null, s.code, !s.is_active)} active={s.is_active} canEnable={canEnable} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
