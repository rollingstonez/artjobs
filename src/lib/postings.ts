// 공고 조회 계층 — 화면은 이 파일만 부른다.
// Supabase 가 연결되면 crawled_postings(크롤러) + org_postings(기관 직접 등록)을 합쳐 읽고,
// 아니면 샘플 데이터(src/data/sample-postings.ts)를 읽는다.
import { cache } from "react";
import { SAMPLE_POSTINGS } from "@/data/sample-postings";
import { isLivingPosting, noDeadlineCutoff, todayStr } from "@/lib/living";
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
  /**
   * 어떤 공고를 보여줄지.
   *   "living"(기본) 모집중만 · "closed" 마감된 것만 · "all" 모집중 먼저 + 마감을 뒤에.
   * 마감 공고도 지우지 않고 아카이브로 남겨, 사이트에 늘 볼거리가 있게 한다.
   */
  status?: "living" | "closed" | "all";
  /** status 가 closed·all 일 때, 마감 후 이 일수 안쪽만 보여준다(아주 오래된 건 감춤). 없으면 전부. */
  closedWithinDays?: number;
  /** 사용자 위치. 주면 가까운 공고(같은 시·도 → 인접권·전국 → 그 밖)가 먼저 온다. */
  near?: UserLocation | null;
}

/** 주어진 날짜에서 days 일 뺀 날짜(YYYY-MM-DD). */
function minusDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() - days);
  return todayStr(d);
}

/** 오늘로부터 days 일 전 날짜(YYYY-MM-DD). 마감 아카이브의 보존 기간 계산에 쓴다. */
function daysAgoStr(days: number): string {
  return minusDays(todayStr(), days);
}

/** 마감된(=모집이 끝난) 공고인지. isLivingPosting 의 반대. */
function isClosedPosting(p: Posting): boolean {
  return !isLivingPosting(p.applyEnd, p.createdAt);
}

/** 마감 공고를 보존 기간(withinDays) 안쪽만 남긴다. 기준일은 마감일(없으면 등록일). */
function withinClosedWindow(p: Posting, withinDays?: number): boolean {
  if (withinDays == null) return true;
  const end = (p.applyEnd ?? p.createdAt ?? "").slice(0, 10);
  return end ? end >= daysAgoStr(withinDays) : false;
}

/** 공고 id 는 "출처:원래id" 로 만든다. 저장·지원 테이블이 (posting_source, posting_id) 로 가리킨다.
 * URL 경로 파라미터로 들어올 때는 ":" 가 "%3A" 로 인코딩된 채 그대로 올 수 있어(Next.js 16 라우트 파라미터가
 * 자동으로 디코딩해 주지 않는 경우가 있다) 먼저 한 번 디코딩한다. 이미 디코딩된 값이 들어와도 안전하다. */
export function splitPostingId(id: string): { source: PostingSource; rawId: string } {
  let decoded = id;
  try {
    decoded = decodeURIComponent(id);
  } catch {
    // 잘못된 퍼센트 인코딩이면 원본 그대로 둔다.
  }
  if (decoded.startsWith("org:")) return { source: "org", rawId: decoded.slice(4) };
  if (decoded.startsWith("crawled:")) return { source: "crawled", rawId: decoded.slice(8) };
  return { source: "sample", rawId: decoded };
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

// ── DB에서 읽어올 범위 좁히기 ──────────────────────────────────────────────
// 예전에는 열려 있는 공고를 통째로(최대 3,000행) 읽어 와 JS로 걸렀다. 화면이 어차피 버릴 행까지
// 서버↔DB를 건너오느라 목록 한 장에 1초 넘게 걸렸다. 이제 같은 조건을 DB에 먼저 걸어 행 수를 줄인다.
//
// 지켜야 할 규칙 하나: 여기서 거는 조건은 반드시 getPostings 의 JS 필터보다 "느슨"해야 한다.
// 넓게 읽고 최종 판정은 그대로 JS가 한다 — 조건을 잘못 좁혀 공고가 사라지는 일이 없도록.

const SCOPE_FIELDS = [
  "board",
  "field",
  "genre",
  "role",
  "employmentType",
  "region",
  "q",
  "applyEndSince",
  "createdSince",
] as const;

type ScopeField = (typeof SCOPE_FIELDS)[number];
type LoadScope = Partial<Record<ScopeField, string>>;

/** 서버와 DB의 시간대가 하루 어긋나도 경계에 걸친 공고를 놓치지 않도록 두는 여유. */
const DATE_SLACK_DAYS = 1;

/** 검색어를 DB 조건으로 넘겨도 되는지. PostgREST 의 or(...) 문법에서 뜻이 달라지는 글자
 *  (쉼표·괄호·따옴표·%·*·점·공백 등)가 섞였으면 넘기지 않고 JS 필터에만 맡긴다.
 *  결과는 똑같고, 읽어 오는 양만 예전처럼 늘어난다. */
const PUSHABLE_QUERY = /^[\p{L}\p{N}_-]{2,40}$/u;
function pushableQuery(q?: string): string | undefined {
  const v = q?.trim();
  return v && PUSHABLE_QUERY.test(v) ? v : undefined;
}

/** 화면이 보여 줄 기간에 맞춰 날짜 하한을 정한다. 제한이 없으면 null(전부 읽기). */
function dateWindow(
  status: "living" | "closed" | "all",
  closedWithinDays?: number,
): { applyEndSince: string; createdSince: string } | null {
  const today = todayStr();
  const cutoff = noDeadlineCutoff(today); // 마감일 없는 공고가 모집중으로 남는 마지막 등록일
  if (status === "living") {
    return {
      applyEndSince: minusDays(today, DATE_SLACK_DAYS),
      createdSince: minusDays(cutoff, DATE_SLACK_DAYS),
    };
  }
  if (closedWithinDays == null) return null; // 보존 기간 제한이 없으면 전부 읽어야 한다
  const oldest = minusDays(today, closedWithinDays);
  return {
    applyEndSince: minusDays(oldest, DATE_SLACK_DAYS),
    createdSince: minusDays(oldest < cutoff ? oldest : cutoff, DATE_SLACK_DAYS),
  };
}

function scopeFor(filters: PostingFilters): LoadScope {
  const status = filters.status ?? (filters.includeClosed ? "all" : "living");
  return {
    board: filters.board,
    field: filters.field,
    genre: filters.genre,
    role: filters.role,
    employmentType: filters.employmentType,
    region: filters.region,
    q: pushableQuery(filters.q),
    ...(dateWindow(status, filters.closedWithinDays) ?? {}),
  };
}

// 주소(URL)가 너무 길어지지 않도록 두는 상한. 넘는 묶음은 DB에 넘기지 않고 JS 필터가 맡는다
// — 읽어 오는 양만 늘 뿐 결과는 같다. 8이면 최악의 경우에도 주소가 1KB 안쪽이다.
const MAX_OR_TERMS = 8;

/** "이 중 하나만 맞으면 됨" 묶음 여러 개를 or 조건 하나로 합친다.
 *  (A1|A2) 그리고 (B1|B2) → (A1&B1)|(A1&B2)|(A2&B1)|(A2&B2)
 *
 *  or 조건을 두 번 거는 방법도 있지만, 그렇게 걸었을 때 둘이 "그리고"로 묶이는지는
 *  실제 서버에 물어봐야 알 수 있다. 잘못 묶이면 공고가 조용히 사라지거나 엉뚱한 게 섞인다.
 *  그래서 처음부터 조건을 하나로 합쳐, 어느 쪽이든 결과가 같게 만든다. */
function combineOrGroups(groups: string[][]): string | null {
  const kept: string[][] = [];
  let terms = 1;
  for (const group of groups) {
    if (group.length === 0) continue;
    if (terms * group.length > MAX_OR_TERMS) break; // 남는 묶음은 JS 필터가 맡는다
    kept.push(group);
    terms *= group.length;
  }
  if (kept.length === 0) return null;
  if (kept.length === 1) return kept[0].join(",");
  let combos: string[][] = [[]];
  for (const group of kept) combos = combos.flatMap((c) => group.map((t) => [...c, t]));
  return combos.map((c) => `and(${c.join(",")})`).join(",");
}

/** 조회 범위를 PostgREST 조건으로 옮긴다. eq 는 값을 그대로 넘겨 안전하고,
 *  or 문자열에 들어가는 값은 미리 검증된 코드·날짜·검색어만 쓴다.
 *  묶음은 중요한 순서대로 — 날짜가 행을 가장 많이 줄여 준다. */
function scopeClauses(scope: LoadScope, table: "crawled_postings" | "org_postings") {
  const eq: [string, string][] = [];
  const orGroups: string[][] = [];

  if (scope.board) eq.push(["board", scope.board]);
  if (scope.genre) eq.push(["genre", scope.genre]);
  if (scope.role) eq.push(["role", scope.role]);
  if (scope.employmentType) eq.push(["employment_type", scope.employmentType]);
  if (scope.region) eq.push(["region", scope.region]);

  if (scope.applyEndSince && scope.createdSince) {
    orGroups.push([
      `apply_end.gte.${scope.applyEndSince}`,
      `and(apply_end.is.null,created_at.gte.${scope.createdSince})`,
    ]);
  }

  if (scope.field) {
    // 분야 탭에는 교차 노출 장르(예: 국악 탭의 한국무용)도 함께 보인다 — matchesField 와 같은 규칙.
    const codes = isField(scope.field) ? genreCodesForField(scope.field) : [];
    if (codes.length) orGroups.push([`field.eq.${scope.field}`, `genre.in.(${codes.join(",")})`]);
    else eq.push(["field", scope.field]);
  }

  if (scope.q) {
    // category_raw 는 수집 공고에만 있는 칸이다(기관 직접 등록 공고에는 없음).
    const cols =
      table === "crawled_postings"
        ? ["title", "organization", "category_raw", "description"]
        : ["title", "organization", "description"];
    orGroups.push(cols.map((c) => `${c}.ilike.*${scope.q}*`));
  }

  return { eq, or: combineOrGroups(orGroups) };
}

async function loadRows(scope: LoadScope): Promise<Posting[]> {
  const supabase = await createClient();
  if (!supabase) return SAMPLE_POSTINGS;

  const crawledClauses = scopeClauses(scope, "crawled_postings");
  let crawledQuery = supabase.from("crawled_postings").select("*").eq("status", "open");
  for (const [col, val] of crawledClauses.eq) crawledQuery = crawledQuery.eq(col, val);
  if (crawledClauses.or) crawledQuery = crawledQuery.or(crawledClauses.or);

  const orgClauses = scopeClauses(scope, "org_postings");
  let orgQuery = supabase.from("org_postings").select("*").eq("status", "open").is("deleted_at", null);
  for (const [col, val] of orgClauses.eq) orgQuery = orgQuery.eq(col, val);
  if (orgClauses.or) orgQuery = orgQuery.or(orgClauses.or);

  const [crawled, org] = await Promise.all([
    crawledQuery.order("created_at", { ascending: false }).limit(2000),
    orgQuery.order("created_at", { ascending: false }).limit(1000),
  ]);

  // 운영자가 숨긴 수집 공고(hidden_at, 0010)는 뺀다. RLS 가 비로그인·일반 회원에게는 이미 가리지만,
  // 운영자 계정으로 공개 화면을 볼 때도 같은 화면이 보이도록 여기서 한 번 더 거른다(칸이 없어도 안전).
  return [
    ...((org.data ?? []) as Row[]).map((r) => fromRow(r, "org")),
    ...((crawled.data ?? []) as Row[]).filter((r) => r.hidden_at == null).map((r) => fromRow(r, "crawled")),
  ];
}

const SCOPE_SEP = "\u0000";

/** 같은 조회 범위는 한 요청 안에서 한 번만 읽는다(React cache).
 *  홈처럼 한 화면이 getPostings 를 여러 번 부르는 곳에서 왕복이 그만큼 줄어든다.
 *  cache 는 인자가 값으로 같아야 맞아떨어져서, 범위를 문자열 한 개로 만들어 넘긴다. */
const loadScoped = cache(async (key: string): Promise<Posting[]> => {
  const values = key.split(SCOPE_SEP);
  const scope: LoadScope = {};
  SCOPE_FIELDS.forEach((field, i) => {
    if (values[i]) scope[field] = values[i];
  });
  return loadRows(scope);
});

async function loadAll(filters: PostingFilters): Promise<Posting[]> {
  if (!HAS_SUPABASE) return SAMPLE_POSTINGS;
  const scope = scopeFor(filters);
  return loadScoped(SCOPE_FIELDS.map((f) => scope[f] ?? "").join(SCOPE_SEP));
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
  const all = await loadAll(filters);
  const q = filters.q?.trim().toLowerCase();

  const status = filters.status ?? (filters.includeClosed ? "all" : "living");

  return all
    .filter((p) => {
      const living = isLivingPosting(p.applyEnd, p.createdAt);
      if (status === "closed") return !living && withinClosedWindow(p, filters.closedWithinDays);
      if (status === "all") return living || withinClosedWindow(p, filters.closedWithinDays);
      return living; // "living"
    })
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
      // 모집중을 항상 위에, 마감(아카이브)은 뒤로 가라앉힌다.
      const ca = isClosedPosting(a);
      const cb = isClosedPosting(b);
      if (ca !== cb) return ca ? 1 : -1;
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
  // 운영자가 숨긴 수집 공고(hidden_at, 0010)는 뺀다. RLS 가 비로그인·일반 회원에게는 이미 가리지만,
  // 운영자 계정으로 공개 화면을 볼 때도 같은 화면이 보이도록 여기서 한 번 더 거른다(칸이 없어도 안전).
  return [
    ...((org.data ?? []) as Row[]).map((r) => fromRow(r, "org")),
    ...((crawled.data ?? []) as Row[]).filter((r) => r.hidden_at == null).map((r) => fromRow(r, "crawled")),
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

/**
 * 마감된(모집이 끝난) 공고 누적 건수. 현황판의 "마감 N건"에 쓴다.
 * 마감 공고를 지우지 않고 쌓아 두므로 시간이 갈수록 늘어난다.
 * Supabase 에서는 마감일이 지난 공개(status=open) 행을 DB 에서 바로 센다(전량을 불러오지 않는다).
 */
export async function countArchived(): Promise<number> {
  if (!HAS_SUPABASE) {
    return SAMPLE_POSTINGS.filter((p) => isClosedPosting(p)).length;
  }
  const supabase = await createClient();
  if (!supabase) return 0;
  const today = todayStr();
  const cutoff = noDeadlineCutoff(today); // 마감일 없는 공고는 등록 후 NO_DEADLINE_DAYS 일까지만 모집중
  // isLivingPosting 과 같은 기준으로 "마감"을 센다: 마감일이 지났거나,
  // 마감일이 없고 등록일이 cutoff 보다 오래된 공고.
  const closed = `apply_end.lt.${today},and(apply_end.is.null,created_at.lt.${cutoff})`;
  const [crawled, org] = await Promise.all([
    supabase
      .from("crawled_postings")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .or(closed),
    supabase
      .from("org_postings")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .or(closed),
  ]);
  return (crawled.count ?? 0) + (org.count ?? 0);
}
