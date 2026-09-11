import type { Metadata } from "next";
import { Notice } from "@/components/forms/ui";
import TeamPanel from "@/components/hiring/TeamPanel";
import { purgeExpiredNow } from "@/lib/actions/hiring";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { OrgMember } from "@/types/account";

export const metadata: Metadata = { title: "구성원 | 아트잡스" };

export default async function TeamPage({ searchParams }: PageProps<"/me/team">) {
  const me = await requireUser("/me/team", "organization");
  const sp = await searchParams;
  const supabase = (await createClient())!;
  const { data } = await supabase.from("org_members").select("*").eq("org_user_id", me.id).order("created_at");
  const members = (data ?? []) as OrgMember[];
  const ids = members.map((m) => m.member_user_id).filter((x): x is string => Boolean(x));
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, display_name").in("id", ids) : { data: [] };
  const names: Record<string, string> = {};
  (people ?? []).forEach((p) => (names[p.id] = p.display_name));

  const purged = typeof sp.purged === "string" ? sp.purged : null;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-lg font-bold">구성원 <span className="text-stone-400">{members.filter((m) => m.status === "active").length}</span></h2>
        <p className="text-sm text-stone-600">
          담당 직원을 초청하면 이 기관의 모든 공고와 지원자를 함께 보고 심사·선발할 수 있습니다. 공고 하나만 봐줄 외부 심사위원은 각 공고의 심사 작업대에서 따로 초청하세요.
        </p>
        <TeamPanel members={members} names={names} myId={me.id} />
      </section>

      <section className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
        <h2 className="text-base font-bold">지원서 보관·파기</h2>
        <p className="text-sm text-stone-600">
          공고마다 정한 보관 기간(기본 마감 후 180일)이 지난 지원서는 지원자의 프로필 사본과 지원 메시지를 지우고 점수·단계만 남깁니다.
          아래 버튼으로 지금 바로 정리할 수 있습니다.
        </p>
        <form action={purgeExpiredNow}>
          <button className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold hover:border-stone-500">기간 지난 지원서 지금 정리</button>
        </form>
        {purged === "error" && <Notice kind="error">정리하지 못했습니다. 잠시 후 다시 시도해주세요.</Notice>}
        {purged && purged !== "error" && <Notice kind="success">지원서 {purged}건의 개인정보를 정리했습니다.</Notice>}
      </section>
    </div>
  );
}
