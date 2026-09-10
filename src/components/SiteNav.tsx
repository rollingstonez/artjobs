"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "홈" },
  { href: "/jobs", label: "채용공고" },
  { href: "/auditions", label: "오디션·공모" },
  { href: "/about", label: "소개" },
];

export default function SiteNav() {
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
