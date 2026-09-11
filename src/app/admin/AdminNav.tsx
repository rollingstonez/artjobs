"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "현황" },
  { href: "/admin/orgs", label: "기관 인증" },
  { href: "/admin/reports", label: "신고 처리" },
  { href: "/admin/users", label: "회원" },
  { href: "/admin/postings", label: "기관 공고" },
  { href: "/admin/sources", label: "크롤 소스" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex gap-1 md:flex-col">
        {ITEMS.map((it) => {
          const active = it.href === "/admin" ? pathname === "/admin" : pathname.startsWith(it.href);
          return (
            <li key={it.href} className="shrink-0">
              <Link
                href={it.href}
                className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${active ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}
              >
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
