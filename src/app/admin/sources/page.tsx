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
        <b>&lsquo;허용&rsquo;</b>은 &ldquo;robots.txt 상 긁어가도 된다&rdquo;는 뜻일 뿐, 켠다고 바로 수집되는 건 아닙니다. 실제로 수집되려면 그 사이트 전용 <b>수집기(파서)</b>가 있어야 하고, 지금은 <b>아트모아·서울문화포털·서울문화재단·KCDF·서울시립미술관·국립현대미술관·아트누리</b> 7곳만 파서가 완성돼 매일 돕니다(`docs/collection-status.md`). 파서 없는 소스는 켜도 0건입니다.
      </p>
      <p className="text-xs text-stone-500">
        <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[11px] font-semibold text-orange-700">민간·협의대기</span> 표시는 사기업·사립기관 등 민간 사업체입니다. 정보수집에 민감할 수 있어 <b>서면 협의(수집 안내) 전까지는 켜지 않습니다</b>. · <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700">아트누리 중복</span> 표시는 공모·지원사업이 <b>아트누리(통합안내)</b>에 이미 다 모이는 지역 문화재단이라 개별 수집에서 빼 둔 곳입니다(꺼진 채 보관, 직원 채용만 필요할 때 켜기).
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
            const isDup = (s.note ?? "").includes("아트누리와 공모 중복");
            const isPrivate = (s.note ?? "").includes("민간·협의대기");
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
                {isPrivate && (
                  <span
                    className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700"
                    title="사기업·사립기관 등 민간 사업체입니다. 서면 협의(수집 안내) 전까지는 켜지 않습니다."
                  >
                    민간·협의대기
                  </span>
                )}
                {isDup && (
                  <span
                    className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700"
                    title="공모·지원사업은 아트누리(통합안내)가 전국 문화재단 것을 모아 오므로, 이 소스는 개별 수집 대상에서 제외했습니다. 직원 채용만 따로 필요할 때 켜세요."
                  >
                    아트누리 중복
                  </span>
                )}
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
