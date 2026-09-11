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

export default async function AdminSourcesPage() {
  await requireAdmin("/admin/sources");
  const supabase = (await createClient())!;
  const { data } = await supabase.from("crawl_sources").select("*").order("is_active", { ascending: false }).order("name");
  const rows = (data ?? []) as Row[];
  const active = rows.filter((r) => r.is_active).length;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">크롤 소스 <span className="text-stone-400">{active} / {rows.length} 가동</span></h2>
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
                {s.is_active ? (
                  <form action={setSourceActive.bind(null, s.code, false)}><button className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white">가동 중 · 끄기</button></form>
                ) : (
                  <form action={setSourceActive.bind(null, s.code, true)}>
                    <button disabled={!canEnable} title={canEnable ? "" : "robots 허용 또는 협의 완료 후 켤 수 있습니다"} className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-40">켜기</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
