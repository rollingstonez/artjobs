"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_MENU, badgeOf } from "@/lib/admin/menu";
import type { AdminBadges } from "@/lib/admin/queries";

export default function AdminNav({ badges }: { badges: AdminBadges | null }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/"));

  const item = (href: string, label: string, icon: string, badge: number) => (
    <Link
      href={href}
      className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold ${
        isActive(href) ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
      }`}
    >
      <span className="text-base leading-none" aria-hidden>{icon}</span>
      <span className="flex-1">{label}</span>
      {badge > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{badge}</span>}
    </Link>
  );

  return (
    <nav>
      {/* 모바일: 가로 스크롤 한 줄 */}
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <li className="shrink-0">{item("/admin", "현황", "🏠", 0)}</li>
        {ADMIN_MENU.flatMap((g) => g.items).map((it) => (
          <li key={it.href} className="shrink-0">{item(it.href, it.label, it.icon, badgeOf(badges, it.badgeKey))}</li>
        ))}
      </ul>
      {/* 데스크톱: 그룹별 세로 메뉴 */}
      <div className="hidden space-y-4 md:block">
        <div>{item("/admin", "현황", "🏠", 0)}</div>
        {ADMIN_MENU.map((g) => (
          <div key={g.title}>
            <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wide text-stone-400">{g.title}</p>
            <ul className="space-y-0.5">
              {g.items.map((it) => (
                <li key={it.href}>{item(it.href, it.label, it.icon, badgeOf(badges, it.badgeKey))}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
