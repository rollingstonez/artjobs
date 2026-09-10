import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { REGION_CENTERS, SELECTABLE_REGIONS, distanceKm } from "@/lib/location";
import { createClient } from "@/lib/supabase/server";
import type { TalentPublic } from "@/types/account";
import { FIELDS, ROLES, fieldLabel, genreLabel, roleLabel } from "@/types/job";

export const metadata: Metadata = { title: "인재정보 | 아트잡스" };
export const dynamic = "force-dynamic";

const selectClass = "h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm";

export default async function TalentsPage({ searchParams }: PageProps<"/talents">) {
  const me = await requireUser("/talents");
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : "");
  const field = pick("field"), role = pick("role"), region = pick("region"), q = pick("q");

  const supabase = (await createClient())!;
  let query = supabase.from("talents_public").select("*").eq("availability", "open").order("updated_at", { ascending: false }).limit(200);
  if (field) query = query.eq("field", field);
  if (role) query = query.contains("roles", [role]);
  if (region) query = query.eq("region", region);
  const { data } = await query;
  let talents = ((data ?? []) as TalentPublic[]).filter((t) => t.user_id !== me.id);
  if (q) {
    const lq = q.toLowerCase();
    talents = talents.filter((t) => [t.display_name, t.bio, t.career, t.education].filter(Boolean).some((s) => (s as string).toLowerCase().includes(lq)));
  }
  // 기관 회원이면 기관 위치에서 가까운 순
  const myRegion = me.org?.region ?? me.artist?.region ?? null;
  if (myRegion && myRegion in REGION_CENTERS) {
    const c = REGION_CENTERS[myRegion as keyof typeof REGION_CENTERS];
    const d = (t: TalentPublic) => (t.region && t.region in REGION_CENTERS ? distanceKm(c, REGION_CENTERS[t.region as keyof typeof REGION_CENTERS]) : 9999);
    talents.sort((a, b) => d(a) - d(b));
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 md:px-6">
      <div className="py-8">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">인재정보</h1>
        <p className="mt-1 text-sm text-stone-600">프로필을 공개한 예술가입니다. 연락은 메시지로만 할 수 있고, 전화번호·이메일은 공개되지 않습니다.</p>
        <p className="mt-1 text-sm text-stone-500">{myRegion ? `${myRegion} 근처부터 · ` : ""}{talents.length}명</p>
      </div>

      <form className="flex flex-wrap gap-2">
        <select name="field" defaultValue={field} className={selectClass}>
          <option value="">분야 전체</option>
          {FIELDS.map((f) => <option key={f.code} value={f.code}>{f.label}</option>)}
        </select>
        <select name="role" defaultValue={role} className={selectClass}>
          <option value="">직무 전체</option>
          {ROLES.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
        </select>
        <select name="region" defaultValue={region} className={selectClass}>
          <option value="">지역 전체</option>
          {SELECTABLE_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <input name="q" defaultValue={q} placeholder="이름·소개·경력 검색" className="h-10 min-w-[180px] flex-1 rounded-lg border border-stone-300 px-3 text-sm" />
        <button className="h-10 rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white">검색</button>
      </form>

      {me.profile.role === "artist" && (
        <p className="mt-4 rounded-lg border border-stone-200 bg-stone-100 px-3 py-2 text-xs text-stone-600">
          예술가 회원도 다른 예술가의 공개 프로필을 볼 수 있지만, 메시지는 기관 회원만 보낼 수 있습니다.
        </p>
      )}

      <ul className="mt-5 grid gap-3 md:grid-cols-2">
        {talents.map((t) => (
          <li key={t.user_id}>
            <Link href={`/talents/${t.user_id}`} className="block rounded-2xl border border-stone-200 bg-white p-4 hover:border-stone-400">
              <div className="flex items-center gap-2">
                {t.region && <span className="rounded-full bg-stone-900 px-1.5 py-0.5 text-[10px] font-bold text-white">{t.region}{t.address_hint ? ` ${t.address_hint}` : ""}</span>}
                <span className="truncate text-[17px] font-bold">{t.display_name}</span>
                <span className="ml-auto shrink-0 text-xs text-stone-500">{fieldLabel(t.field)}{t.career_years != null ? ` · 경력 ${t.career_years}년` : ""}</span>
              </div>
              <p className="mt-1 flex flex-wrap gap-1 text-[11px]">
                {t.genres.map((g) => <span key={g} className="rounded-full bg-stone-100 px-2 py-0.5">{genreLabel(g)}</span>)}
                {t.roles.map((r) => <span key={r} className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">{roleLabel(r)}</span>)}
              </p>
              {t.bio && <p className="mt-2 line-clamp-2 text-sm text-stone-600">{t.bio}</p>}
            </Link>
          </li>
        ))}
      </ul>
      {talents.length === 0 && <p className="mt-10 text-center text-sm text-stone-500">조건에 맞는 인재가 아직 없습니다.</p>}
    </main>
  );
}
