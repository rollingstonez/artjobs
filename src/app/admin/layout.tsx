import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import AdminNav from "./AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const me = await requireAdmin("/admin");
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-2 py-6">
        <div>
          <p className="text-xs font-semibold text-amber-700">🛠 운영자</p>
          <h1 className="text-2xl font-extrabold tracking-tight">아트잡스 관리</h1>
        </div>
        <p className="text-xs text-stone-500">
          {me.profile.display_name} · <Link href="/me" className="underline underline-offset-2">마이페이지로</Link>
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-[180px_1fr]">
        <AdminNav />
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
