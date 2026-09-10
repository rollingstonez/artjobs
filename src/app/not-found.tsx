import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-20 text-center md:px-6">
      <h1 className="text-2xl font-extrabold">페이지를 찾을 수 없습니다</h1>
      <p className="mt-2 text-sm text-stone-500">공고가 삭제되었거나 주소가 잘못되었습니다.</p>
      <Link
        href="/jobs"
        className="mt-6 inline-block rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white"
      >
        채용공고 목록으로
      </Link>
    </main>
  );
}
