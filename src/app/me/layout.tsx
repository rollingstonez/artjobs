import { requireUser } from "@/lib/auth";
import MeNav from "./MeNav";

export const dynamic = "force-dynamic";

export default async function MeLayout({ children }: LayoutProps<"/me">) {
  const me = await requireUser("/me");
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 md:px-6">
      <div className="py-6">
        <p className="text-xs font-semibold text-stone-500">
          {me.profile.role === "artist" ? "예술가 회원" : "기관 회원"}
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight">{me.profile.display_name}</h1>
      </div>
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <MeNav role={me.profile.role} unread={me.unreadNotifications} />
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
