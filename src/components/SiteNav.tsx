"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "홈" },
  { href: "/jobs", label: "채용공고" },
  { href: "/auditions", label: "오디션·공모" },
  { href: "/rentals", label: "대관" },
  { href: "/seeking", label: "구직" },
  { href: "/about", label: "About" },
];

export interface NavUser {
  name: string;
  role: "artist" | "organization";
  unread: number;
}

/** 누른 메뉴 아래에 뜨는 진행 표시. Link 안에서만 쓸 수 있다(useLinkStatus).
 *  화면이 바뀌기 전에 "이 버튼을 눌렀다"를 바로 보여 주는 역할만 한다. */
function NavPending() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-x-2 bottom-0.5 h-0.5 rounded-full bg-current transition-opacity duration-150 ${
        pending ? "animate-pulse opacity-70" : "opacity-0"
      }`}
    />
  );
}

/** 진행 표시가 붙은 메뉴 링크. 위치 기준을 잡으려고 relative 를 항상 함께 준다. */
function NavLink({
  href,
  className,
  children,
  ...rest
}: React.ComponentProps<typeof Link>) {
  return (
    <Link href={href} className={`relative ${className ?? ""}`} {...rest}>
      {children}
      <NavPending />
    </Link>
  );
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
                <NavLink href="/notifications" aria-label="알림" className="px-2 py-1 text-sm">
                  🔔
                  {user.unread > 0 && <span className="absolute -right-0.5 -top-0.5 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{user.unread}</span>}
                </NavLink>
                <NavLink href="/me" className="rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs font-semibold">{user.name}</NavLink>
              </>
            ) : accountsEnabled ? (
              <NavLink href="/login" className="rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs font-semibold text-white">로그인</NavLink>
            ) : null}
          </div>

          <div className="hidden shrink-0 items-center gap-1 md:order-last md:flex">
            {user ? (
              <>
                <NavLink href="/notifications" aria-label="알림" className="rounded-lg px-2.5 py-2 text-sm text-stone-600 hover:bg-stone-100">
                  🔔
                  {user.unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{user.unread}</span>
                  )}
                </NavLink>
                <NavLink href="/messages" className="rounded-lg px-2.5 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100">메시지</NavLink>
                {user.role === "organization" && (
                  <NavLink href="/post" className="rounded-lg px-2.5 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100">공고 올리기</NavLink>
                )}
                <NavLink href="/me" className="rounded-lg bg-stone-100 px-3 py-2 text-sm font-semibold text-stone-900 hover:bg-stone-200">{user.name}</NavLink>
              </>
            ) : accountsEnabled ? (
              <>
                <NavLink href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100">로그인</NavLink>
                <NavLink href="/signup" className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-700">회원가입</NavLink>
              </>
            ) : null}
          </div>

          <ul className="hidden flex-1 items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isActive(item.href)
                      ? "bg-stone-900 text-white"
                      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <ul className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-2.5 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV_ITEMS.map((item) => (
            <li key={item.href} className="shrink-0">
              <NavLink
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`block whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold transition ${
                  isActive(item.href)
                    ? "bg-stone-900 text-white"
                    : "border border-stone-200 bg-white text-stone-600"
                }`}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
