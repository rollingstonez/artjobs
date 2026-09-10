// 공고 조회 계층 — 화면은 이 파일만 부른다.
// 지금은 샘플 데이터(src/data/sample-postings.ts)를 읽는다. Supabase 연결 시
// 이 파일 안의 구현만 crawled_postings 조회로 바꾸면 화면 코드는 그대로다.
import { SAMPLE_POSTINGS } from "@/data/sample-postings";
import { isLivingPosting } from "@/lib/living";
import { rankNearness, type UserLocation } from "@/lib/location";
import { FIELDS, genreCodesForField, type BoardCode, type FieldCode, type Posting } from "@/types/job";

export const DATA_SOURCE: "sample" | "supabase" = "sample";

export interface PostingFilters {
  board?: BoardCode;
  field?: string;
  genre?: string;
  role?: string;
  employmentType?: string;
  region?: string;
  q?: string;
  includeClosed?: boolean;
  /** 사용자 위치. 주면 가까운 공고(같은 시·도 → 인접권·전국 → 그 밖)가 먼저 온다. */
  near?: UserLocation | null;
}

async function loadAll(): Promise<Posting[]> {
  return SAMPLE_POSTINGS;
}

function isField(v: string | undefined): v is FieldCode {
  return FIELDS.some((f) => f.code === v);
}

/** 분야 필터. 분야가 같거나, 그 분야 탭에 교차 노출하기로 한 장르면 통과. */
function matchesField(p: Posting, field: string | undefined): boolean {
  if (!field) return true;
  if (p.field === field) return true;
  if (isField(field) && p.genre) {
    return (genreCodesForField(field) as string[]).includes(p.genre);
  }
  return false;
}

export async function getPostings(filters: PostingFilters = {}): Promise<Posting[]> {
  const all = await loadAll();
  const q = filters.q?.trim().toLowerCase();

  return all
    .filter((p) => filters.includeClosed || isLivingPosting(p.applyEnd, p.createdAt))
    .filter((p) => !filters.board || p.board === filters.board)
    .filter((p) => matchesField(p, filters.field))
    .filter((p) => !filters.genre || p.genre === filters.genre)
    .filter((p) => !filters.role || p.role === filters.role)
    .filter((p) => !filters.employmentType || p.employmentType === filters.employmentType)
    .filter((p) => !filters.region || p.region === filters.region)
    .filter(
      (p) =>
        !q ||
        [p.title, p.organization, p.categoryRaw, p.description]
          .filter(Boolean)
          .some((t) => (t as string).toLowerCase().includes(q)),
    )
    .sort((a, b) => {
      if (filters.near) {
        const d = rankNearness(a, filters.near) - rankNearness(b, filters.near);
        if (d !== 0) return d;
      }
      return a.createdAt < b.createdAt ? 1 : -1;
    });
}

export async function getPosting(id: string): Promise<Posting | null> {
  const all = await loadAll();
  return all.find((p) => p.id === id) ?? null;
}

/** 분야별 모집중 건수(교차 노출 포함). 게시판을 주면 그 게시판만 센다. */
export async function countByField(board?: BoardCode): Promise<Record<string, number>> {
  const living = await getPostings({ board });
  const out: Record<string, number> = {};
  for (const f of FIELDS) {
    out[f.code] = living.filter((p) => matchesField(p, f.code)).length;
  }
  return out;
}
