"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleBookmark } from "@/lib/actions/postings";

export default function SaveButton({ postingId, saved, loggedIn, size = "sm" }: { postingId: string; saved: boolean; loggedIn: boolean; size?: "sm" | "md" }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSaved, setSaved] = useState(saved);
  const [pending, start] = useTransition();

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    start(async () => {
      const r = await toggleBookmark(postingId, pathname);
      setSaved(r.saved);
    });
  };

  const cls = size === "md" ? "h-11 px-4 text-sm" : "h-7 px-2 text-[11px]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={isSaved}
      aria-label={isSaved ? "저장 취소" : "공고 저장"}
      className={`shrink-0 rounded-lg border font-semibold transition ${cls} ${
        isSaved ? "border-amber-300 bg-amber-50 text-amber-700" : "border-stone-200 bg-white text-stone-500 hover:border-stone-400"
      } disabled:opacity-60`}
    >
      {isSaved ? "★ 저장됨" : "☆ 저장"}
    </button>
  );
}
