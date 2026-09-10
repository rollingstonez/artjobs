"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "홈" },
  { href: "/jobs", label: "채용공고" },
  { href: "/auditions", label: "오디션·공모" },
  { href: "/about", label: "소개" },
];

export interface NavUser {
  name: string;
  role: "artist" | "organization";
  unread: number;
}

export default function SiteNav({ user, accountsEnabled }: { user: NavUser | null; accountsEnabled: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          <Link href="/" className="shrink-0 text-xl font-extrabold tracking-tight text-stone-900">
            아트잡스
          </Link>

          <div className="flex items-center gap-1 md:hidden">
            {user ? (
              <>
                <Link href="/notifications" aria-label="알림" className="relative px-2 py-1 text-sm">
                  🔔
                  {user.unread > 0 && <span className="absolute -right-0.5 -top-0.5 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{user.unread}</span>}
                </Link>
                <Link href="/me" className="rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs font-semibold">{user.name}</Link>
              </>
            ) : accountsEnabled ? (
              <Link href="/login" className="rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs font-semibold text-white">로그인</Link>
            ) : null}
          </div>

          <div className="hidden shrink-0 items-center gap-1 md:order-last md:flex">
            {user ? (
              <>
                <Link href="/notifications" aria-label="알림" className="relative rounded-lg px-2.5 py-2 text-sm text-stone-600 hover:bg-stone-100">
                  🔔
                  {user.unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{user.unread}</span>
                  )}
                </Link>
                <Link href="/messages" className="rounded-lg px-2.5 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100">메시지</Link>
                {user.role === "organization" && (
                  <Link href="/post" className="rounded-lg px-2.5 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100">공고 올리기</Link>
                )}
                <Link href="/me" className="rounded-lg bg-stone-100 px-3 py-2 text-sm font-semibold text-stone-900 hover:bg-stone-200">{user.name}</Link>
              </>
            ) : accountsEnabled ? (
              <>
                <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100">로그인</Link>
                <Link href="/signup" className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-700">회원가입</Link>
              </>
            ) : null}
          </div>

          <ul className="hidden flex-1 items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isActive(item.href)
                      ? "bg-stone-900 text-white"
                      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <ul className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-2.5 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV_ITEMS.map((item) => (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`block whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold transition ${
                  isActive(item.href)
                    ? "bg-stone-900 text-white"
                    : "border border-stone-200 bg-white text-stone-600"
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
