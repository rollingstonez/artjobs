import type { Metadata } from "next";
import Link from "next/link";
import { acceptInvitation } from "@/lib/actions/hiring";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "초대 | 아트잡스" };
export const dynamic = "force-dynamic";

type Invite = { kind: "member" | "reviewer"; org_name: string; posting_title: string | null; email: string; status: "pending" | "active"; role: string };

const RESULT_MSG: Record<string, string> = {
  already: "이미 참여 중인 초대입니다.",
  email_mismatch: "이 초대는 다른 이메일로 보낸 것입니다. 초대받은 이메일로 로그인해주세요.",
  not_found: "초대를 찾을 수 없습니다. 링크가 만료되었거나 취소되었습니다.",
  error: "수락하지 못했습니다. 잠시 후 다시 시도해주세요.",
};

export default async function InvitePage({ params, searchParams }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const sp = await searchParams;
  const me = await requireUser(`/invite/${token}`);
  const supabase = (await createClient())!;
  const { data } = await supabase.rpc("get_invitation", { p_token: token });
  const invite = ((data ?? []) as Invite[])[0] ?? null;
  const result = typeof sp.result === "string" ? sp.result : null;
  const mismatch = invite && me.email && invite.email.toLowerCase() !== me.email.toLowerCase();

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-16 md:px-6">
      <div className="py-8">
        <p className="text-xs font-semibold text-stone-500">초대</p>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {!invite ? "초대를 찾을 수 없습니다" : invite.kind === "member" ? `${invite.org_name}의 구성원으로 초대받았습니다` : `${invite.org_name}의 심사위원으로 초대받았습니다`}
        </h1>
      </div>
      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 md:p-6">
        {!invite ? (
          <p className="text-sm text-stone-600">{RESULT_MSG.not_found}</p>
        ) : (
          <>
            <dl className="divide-y divide-stone-100 text-sm">
              <div className="grid grid-cols-[90px_1fr] gap-3 py-2"><dt className="text-stone-500">기관</dt><dd className="font-semibold">{invite.org_name}</dd></div>
              {invite.posting_title && <div className="grid grid-cols-[90px_1fr] gap-3 py-2"><dt className="text-stone-500">공고</dt><dd className="font-semibold">{invite.posting_title}</dd></div>}
              <div className="grid grid-cols-[90px_1fr] gap-3 py-2"><dt className="text-stone-500">역할</dt><dd>{invite.kind === "member" ? (invite.role === "admin" ? "관리자 — 심사위원 초청, 공고 수정, 선발 결정" : "구성원 — 지원자 열람, 심사, 선발 단계 변경") : "심사위원 — 이 공고의 지원자 열람, 점수·메모 작성"}</dd></div>
              <div className="grid grid-cols-[90px_1fr] gap-3 py-2"><dt className="text-stone-500">초대 이메일</dt><dd>{invite.email}</dd></div>
            </dl>
            <p className="text-xs text-stone-500">
              수락하면 지원자의 프로필·포트폴리오·지원 메시지를 보게 됩니다. 채용 목적 외에 쓰거나 밖으로 옮기지 마세요. 심사위원의 점수·메모는 기관만 종합해서 봅니다.
            </p>
            {result && RESULT_MSG[result] && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{RESULT_MSG[result]}</p>}
            {invite.status === "active" ? (
              <p className="text-sm text-emerald-700">이미 수락한 초대입니다. <Link href="/me/reviews" className="underline underline-offset-2">심사 참여</Link>에서 확인하세요.</p>
            ) : mismatch ? (
              <p className="text-sm text-red-700">지금 로그인한 계정({me.email})과 초대받은 이메일이 다릅니다. 초대받은 이메일로 로그인한 뒤 이 링크를 다시 여세요.</p>
            ) : (
              <form action={acceptInvitation.bind(null, token)} className="flex flex-wrap gap-2">
                <button className="h-11 rounded-lg bg-stone-900 px-5 text-sm font-semibold text-white hover:bg-stone-700">수락하고 참여하기</button>
                <Link href="/me" className="flex h-11 items-center rounded-lg border border-stone-300 px-5 text-sm font-semibold">나중에</Link>
              </form>
            )}
          </>
        )}
      </section>
    </main>
  );
}
