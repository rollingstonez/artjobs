import type { Metadata } from "next";
import Link from "next/link";
import PostingForm, { EMPTY_POSTING } from "@/components/forms/PostingForm";
import { requireUser } from "@/lib/auth";
import { orgCompleteness } from "@/types/account";

export const metadata: Metadata = { title: "공고 올리기 | 아트잡스" };
export const dynamic = "force-dynamic";

export default async function PostPage() {
  const me = await requireUser("/post", "organization");
  const { percent } = orgCompleteness(me.org);
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 md:px-6">
      <div className="py-8">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">공고 올리기</h1>
        <p className="mt-1 text-sm text-stone-600">{me.org?.org_name} 이름으로 게시됩니다. 게시 즉시 채용공고·오디션 목록과 알림에 반영됩니다.</p>
      </div>
      {percent < 100 && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          기관 정보가 {percent}% 채워졌습니다. 지원자가 기관을 알 수 있도록{" "}
          <Link href="/me/profile" className="font-semibold underline underline-offset-2">기관 정보</Link>를 먼저 채워주세요.
        </p>
      )}
      <PostingForm initial={EMPTY_POSTING} orgAddress={me.org?.address} orgRegion={me.org?.region} />
    </main>
  );
}
