import Link from "next/link";
import { withdrawApplication } from "@/lib/actions/postings";
import { requireUser } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { joinPostingId } from "@/lib/postings";
import { createClient } from "@/lib/supabase/server";
import { APPLICATION_STATUS, stageTone, type Application } from "@/types/account";


export default async function ApplicationsPage() {
  const me = await requireUser("/me/applications", "artist");
  const supabase = (await createClient())!;
  const { data } = await supabase.from("applications").select("*").eq("artist_user_id", me.id).order("created_at", { ascending: false });
  const apps = (data ?? []) as Application[];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">지원 내역 <span className="text-stone-400">{apps.length}</span></h2>
      {apps.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">아직 지원한 공고가 없습니다.</p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
          {apps.map((a) => {
            const href = `/jobs/${joinPostingId(a.posting_source, a.posting_id)}`;
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={href} className="block truncate text-sm font-semibold hover:underline">{a.posting_title}</Link>
                  <p className="text-xs text-stone-500">
                    {fmtDate(a.created_at)} 지원 · {a.posting_source === "org" ? "메신저 지원" : "기관 접수처로 직접 지원 (기록용)"}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${stageTone(a.status)}`}>{APPLICATION_STATUS[a.status]}</span>
                {a.status === "submitted" && (
                  <form action={withdrawApplication.bind(null, a.id)}>
                    <button type="submit" className="text-xs text-stone-500 underline-offset-2 hover:underline">지원 취소</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-stone-500">
        크롤링으로 모은 공고는 기관 접수처(이메일·홈페이지)로 직접 지원하고, 여기에는 지원 기록만 남깁니다. 기관이 아트잡스에 직접 올린 공고는 지원 시점의 프로필·포트폴리오가 기관 심사 화면에 전달되고, 확인 → 서류 통과 → 오디션·면접 → 최종 선발 단계가 여기에 표시됩니다.
      </p>
    </div>
  );
}
