// 공고 조회 계층 — 화면은 이 파일만 부른다.
// Supabase 가 연결되면 crawled_postings(크롤러) + org_postings(기관 직접 등록)을 합쳐 읽고,
// 아니면 샘플 데이터(src/data/sample-postings.ts)를 읽는다.
import { SAMPLE_POSTINGS } from "@/data/sample-postings";
import { isLivingPosting } from "@/lib/living";
import { rankNearness, type UserLocation } from "@/lib/location";
import { HAS_SUPABASE } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { PostingSource } from "@/types/account";
import { FIELDS, genreCodesForField, type BoardCode, type FieldCode, type Posting } from "@/types/job";

export const DATA_SOURCE: "sample" | "supabase" = HAS_SUPABASE ? "supabase" : "sample";

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

/** 공고 id 는 "출처:원래id" 로 만든다. 저장·지원 테이블이 (posting_source, posting_id) 로 가리킨다. */
export function splitPostingId(id: string): { source: PostingSource; rawId: string } {
  if (id.startsWith("org:")) return { source: "org", rawId: id.slice(4) };
  if (id.startsWith("crawled:")) return { source: "crawled", rawId: id.slice(8) };
  return { source: "sample", rawId: id };
}

export function joinPostingId(source: PostingSource, rawId: string): string {
  return source === "sample" ? rawId : `${source}:${rawId}`;
}

// DB 행(snake_case) → Posting
type Row = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" && v ? v : null);
const n = (v: unknown) => (typeof v === "number" ? v : null);

function fromRow(r: Row, source: PostingSource): Posting {
  return {
    id: joinPostingId(source, String(r.id)),
    title: String(r.title ?? ""),
    organization: s(r.organization),
    board: (s(r.board) as Posting["board"]) ?? "job",
    field: s(r.field) as Posting["field"],
    genre: s(r.genre) as Posting["genre"],
    role: s(r.role) as Posting["role"],
    categoryRaw: s(r.category_raw),
    employmentType: s(r.employment_type) as Posting["employmentType"],
    employmentRaw: s(r.employment_raw),
    region: s(r.region) as Posting["region"],
    address: s(r.address),
    lat: n(r.lat),
    lng: n(r.lng),
    salary: s(r.salary),
    recruitCount: s(r.recruit_count),
    applyStart: s(r.apply_start),
    applyEnd: s(r.apply_end),
    workStart: s(r.work_start),
    workEnd: s(r.work_end),
    applyMethod: source === "org" ? (s(r.apply_method) === "external" ? "기관 접수 페이지" : "아트잡스 메신저로 지원") : s(r.apply_method),
    applyEmail: s(r.apply_email),
    applyContact: s(r.apply_contact),
    requiredDocs: s(r.required_docs),
    description: s(r.description),
    sourceName: source === "org" ? "기관 직접 등록" : String(r.source_name ?? ""),
    sourceUrl: source === "org" ? String(r.apply_url ?? "") : String(r.source_url ?? ""),
    status: (s(r.status) as Posting["status"]) ?? "open",
    createdAt: String(r.created_at ?? "").slice(0, 10),
    orgUserId: source === "org" ? s(r.org_user_id) : null,
    orgVerified: source === "org" && r.org_verified === true,
  };
}

async function loadAll(): Promise<Posting[]> {
  if (!HAS_SUPABASE) return SAMPLE_POSTINGS;
  const supabase = await createClient();
  if (!supabase) return SAMPLE_POSTINGS;
  const [crawled, org] = await Promise.all([
    supabase.from("crawled_postings").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(2000),
    supabase.from("org_postings").select("*").eq("status", "open").is("deleted_at", null).order("created_at", { ascending: false }).limit(1000),
  ]);
  return [
    ...((org.data ?? []) as Row[]).map((r) => fromRow(r, "org")),
    ...((crawled.data ?? []) as Row[]).map((r) => fromRow(r, "crawled")),
  ];
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
  if (!HAS_SUPABASE) return SAMPLE_POSTINGS.find((p) => p.id === id) ?? null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { source, rawId } = splitPostingId(id);
  if (source === "sample") return null;
  const table = source === "org" ? "org_postings" : "crawled_postings";
  const { data } = await supabase.from(table).select("*").eq("id", rawId).maybeSingle();
  return data ? fromRow(data as Row, source) : null;
}

/** 여러 공고를 id 로 한꺼번에(저장 목록·지원 목록용). 마감된 것도 돌려준다. */
export async function getPostingsByIds(ids: string[]): Promise<Posting[]> {
  if (ids.length === 0) return [];
  if (!HAS_SUPABASE) return SAMPLE_POSTINGS.filter((p) => ids.includes(p.id));
  const supabase = await createClient();
  if (!supabase) return [];
  const orgIds = ids.filter((i) => i.startsWith("org:")).map((i) => i.slice(4));
  const crawledIds = ids.filter((i) => i.startsWith("crawled:")).map((i) => i.slice(8));
  const [org, crawled] = await Promise.all([
    orgIds.length ? supabase.from("org_postings").select("*").in("id", orgIds) : Promise.resolve({ data: [] }),
    crawledIds.length ? supabase.from("crawled_postings").select("*").in("id", crawledIds) : Promise.resolve({ data: [] }),
  ]);
  return [
    ...((org.data ?? []) as Row[]).map((r) => fromRow(r, "org")),
    ...((crawled.data ?? []) as Row[]).map((r) => fromRow(r, "crawled")),
  ];
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
