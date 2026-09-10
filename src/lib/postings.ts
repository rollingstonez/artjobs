// 공고 조회 계층 — 화면은 이 파일만 부른다.
// 지금은 샘플 데이터(src/data/sample-postings.ts)를 읽는다. Supabase 연결 시
// 이 파일 안의 구현만 crawled_postings 조회로 바꾸면 화면 코드는 그대로다.
import { SAMPLE_POSTINGS } from "@/data/sample-postings";
import { isLivingPosting } from "@/lib/living";
import type { Posting } from "@/types/job";

export const DATA_SOURCE: "sample" | "supabase" = "sample";

export interface PostingFilters {
  category?: string;
  employmentType?: string;
  region?: string;
  q?: string;
  includeClosed?: boolean;
}

async function loadAll(): Promise<Posting[]> {
  return SAMPLE_POSTINGS;
}

export async function getPostings(filters: PostingFilters = {}): Promise<Posting[]> {
  const all = await loadAll();
  const q = filters.q?.trim().toLowerCase();

  return all
    .filter((p) => filters.includeClosed || isLivingPosting(p.applyEnd, p.createdAt))
    .filter((p) => !filters.category || p.category === filters.category)
    .filter((p) => !filters.employmentType || p.employmentType === filters.employmentType)
    .filter((p) => !filters.region || p.region === filters.region)
    .filter(
      (p) =>
        !q ||
        [p.title, p.organization, p.categoryRaw, p.description]
          .filter(Boolean)
          .some((t) => (t as string).toLowerCase().includes(q)),
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getPosting(id: string): Promise<Posting | null> {
  const all = await loadAll();
  return all.find((p) => p.id === id) ?? null;
}

export async function countByCategory(): Promise<Record<string, number>> {
  const living = await getPostings();
  const out: Record<string, number> = {};
  for (const p of living) {
    if (!p.category) continue;
    out[p.category] = (out[p.category] ?? 0) + 1;
  }
  return out;
}
