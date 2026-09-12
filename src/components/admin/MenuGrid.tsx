import Link from "next/link";
import { ADMIN_MENU, badgeOf } from "@/lib/admin/menu";
import type { AdminBadges } from "@/lib/admin/queries";

/** 대시보드 아래쪽 "관리 메뉴" 그리드 — 아이콘 + 라벨 + 배지. 왼쪽 메뉴와 같은 표(ADMIN_MENU)를 쓴다. */
export default function MenuGrid({ badges }: { badges: AdminBadges | null }) {
  return (
    <div className="space-y-5">
      {ADMIN_MENU.map((g) => (
        <div key={g.title}>
          <h3 className="mb-2 text-sm font-bold text-stone-700">{g.title}</h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {g.items.map((it) => {
              const badge = badgeOf(badges, it.badgeKey);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  title={it.note}
                  className="relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-stone-200 bg-white p-3 text-center transition hover:border-stone-400 hover:shadow-md"
                >
                  {badge > 0 && (
                    <span className="absolute right-1.5 top-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{badge}</span>
                  )}
                  <span className="text-2xl leading-none" aria-hidden>{it.icon}</span>
                  <span className="text-xs font-bold leading-tight text-stone-800">{it.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
