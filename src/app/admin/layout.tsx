import Link from "next/link";
import { getAdminBadges } from "@/lib/admin/queries";
import { signOut } from "@/lib/actions/auth";
import { requireAdmin } from "@/lib/auth";
import { fmtTodayKo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "./AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const me = await requireAdmin("/admin");
  const supabase = (await createClient())!;
  const badges = await getAdminBadges(supabase);
  const pending = (badges.pendingOrgs ?? 0) + (badges.openReports ?? 0) + (badges.newContacts ?? 0);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-16 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3 py-6">
        <div>
          <p className="text-xs font-semibold text-amber-700">🛠 운영자</p>
          <h1 className="text-2xl font-extrabold tracking-tight">아트잡스 관리자 센터</h1>
          <p className="mt-1 text-xs text-stone-500">
            오늘 · {fmtTodayKo()}
            {pending > 0 && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">처리 대기 {pending}건</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span className="font-semibold text-stone-700">{me.profile.display_name}</span>
          <span className="text-stone-300">·</span>
          <Link href="/" className="underline underline-offset-2 hover:text-stone-900">사이트</Link>
          <span className="text-stone-300">·</span>
          <Link href="/me" className="underline underline-offset-2 hover:text-stone-900">마이페이지</Link>
          <span className="text-stone-300">·</span>
          <form action={signOut}><button type="submit" className="underline underline-offset-2 hover:text-stone-900">로그아웃</button></form>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <AdminNav badges={badges} />
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
