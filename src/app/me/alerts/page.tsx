import AlertForm from "./AlertForm";
import { deleteAlert, toggleAlert } from "@/lib/actions/alerts";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AlertCondition } from "@/types/account";
import { BOARDS, EMPLOYMENT_TYPES, FIELDS, GENRES, ROLES } from "@/types/job";

const label = (codes: string[], table: readonly { code: string; label: string }[]) =>
  codes.map((c) => table.find((t) => t.code === c)?.label ?? c).join("·");

export default async function AlertsPage() {
  const me = await requireUser("/me/alerts");
  const supabase = (await createClient())!;
  const { data } = await supabase.from("alert_conditions").select("*").eq("user_id", me.id).order("created_at");
  const alerts = (data ?? []) as AlertCondition[];
  const hasLocation = Boolean(me.artist?.region);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">새 공고 알림</h2>
        <p className="mt-1 text-sm text-stone-600">
          조건에 맞는 공고가 올라오면 사이트 알림과 이메일로 알려드립니다. 조건을 비워 두면 전체를 뜻합니다.
        </p>
        {!hasLocation && (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            프로필에 지역을 넣으면 ‘내 집 근처만’ 조건을 쓸 수 있습니다.
          </p>
        )}
      </div>

      {alerts.length > 0 && (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li key={a.id} className={`rounded-xl border bg-white p-4 ${a.is_active ? "border-stone-200" : "border-stone-100 opacity-60"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{a.name}</p>
                <div className="flex gap-3 text-xs">
                  <form action={toggleAlert.bind(null, a.id, !a.is_active)}>
                    <button className="text-stone-600 underline-offset-2 hover:underline">{a.is_active ? "일시 정지" : "다시 켜기"}</button>
                  </form>
                  <form action={deleteAlert.bind(null, a.id)}>
                    <button className="text-red-600 underline-offset-2 hover:underline">삭제</button>
                  </form>
                </div>
              </div>
              <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs text-stone-600 sm:grid-cols-2">
                <div>게시판: {label(a.boards, BOARDS) || "전체"}</div>
                <div>분야: {label(a.fields, FIELDS) || "전체"}</div>
                <div>장르: {label(a.genres, GENRES) || "전체"}</div>
                <div>직무: {label(a.roles, ROLES) || "전체"}</div>
                <div>고용형태: {label(a.employment_types, EMPLOYMENT_TYPES) || "전체"}</div>
                <div>지역: {a.near_me ? `내 집 근처 (${me.artist?.max_distance_km ?? 30}km)` : a.regions.join("·") || "전국"}</div>
                <div>받는 방법: {a.channels.map((c) => (c === "email" ? "이메일" : "사이트")).join("·")} · {{ instant: "즉시", daily: "하루 한 번", weekly: "주 1회" }[a.frequency]}</div>
              </dl>
            </li>
          ))}
        </ul>
      )}

      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <h3 className="font-bold">알림 조건 추가</h3>
        <div className="mt-3">
          <AlertForm hasLocation={hasLocation} defaultFields={me.artist?.field ? [me.artist.field] : []} defaultGenres={me.artist?.genres ?? []} defaultRoles={me.artist?.roles ?? []} />
        </div>
      </section>
    </div>
  );
}
