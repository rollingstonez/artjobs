"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/actions/auth";
import type { AccountRole } from "@/types/account";

export default function MeNav({ role, unread, hiring, admin }: { role: AccountRole; unread: number; hiring: boolean; admin: boolean }) {
  const pathname = usePathname();
  const items =
    role === "artist"
      ? [
          { href: "/me", label: "홈" },
          { href: "/me/profile", label: "내 프로필" },
          { href: "/me/saved", label: "저장한 공고" },
          { href: "/me/applications", label: "지원 내역" },
          { href: "/me/alerts", label: "새 공고 알림" },
          ...(hiring ? [{ href: "/me/reviews", label: "심사 참여" }] : []),
          { href: "/messages", label: "메시지" },
          { href: "/notifications", label: "알림", badge: unread },
          { href: "/me/settings", label: "설정" },
        ]
      : [
          { href: "/me", label: "홈" },
          { href: "/me/profile", label: "기관 정보" },
          { href: "/me/postings", label: "내 공고 · 지원자" },
          { href: "/me/team", label: "구성원" },
          ...(hiring ? [{ href: "/me/reviews", label: "심사 참여" }] : []),
          { href: "/post", label: "공고 올리기" },
          { href: "/talents", label: "인재 찾기" },
          { href: "/messages", label: "메시지" },
          { href: "/notifications", label: "알림", badge: unread },
          { href: "/me/settings", label: "설정" },
        ];
  return (
    <nav className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex gap-1 md:flex-col">
        {items.map((it) => {
          const active = it.href === "/me" ? pathname === "/me" : pathname.startsWith(it.href);
          return (
            <li key={it.href} className="shrink-0">
              <Link
                href={it.href}
                className={`flex items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${
                  active ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {it.label}
                {it.badge ? (
                  <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{it.badge}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
        {admin && (
          <li className="shrink-0">
            <Link href="/admin" className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100">
              🛠 운영자
            </Link>
          </li>
        )}
        <li className="shrink-0">
          <form action={signOut}>
            <button type="submit" className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-100">
              로그아웃
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
