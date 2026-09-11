// 심사 작업대 데이터 계층. 서버 컴포넌트·서버 액션에서만 쓴다.
// 누가 어떤 공고의 지원자를 볼 수 있는지는 DB(RLS + is_org_member/is_posting_reviewer)가 최종 판정하고,
// 여기서는 화면에 맞게 자격(HiringRole)을 알아내고 필요한 표를 한 번에 모은다.
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Application, ApplicationReview, HiringRole, OrgMember, PostingReviewer } from "@/types/account";

export interface PostingBrief {
  id: string;
  org_user_id: string;
  title: string;
  board: string;
  field: string | null;
  status: "draft" | "open" | "closed";
  apply_end: string | null;
  retention_days: number;
  organization: string;
  created_at: string;
}

export interface PostingAccess {
  me: CurrentUser;
  role: HiringRole;
  posting: PostingBrief;
  /** 기관 쪽(소유자·관리자·구성원)이면 true. 상태 변경·전체 점수 열람 가능. */
  isTeam: boolean;
  /** 초청·해제 권한. */
  isAdmin: boolean;
}

const POSTING_COLS = "id, org_user_id, title, board, field, status, apply_end, retention_days, organization, created_at";

/** 이 공고에 대한 내 자격. 없으면 null. */
export async function getPostingAccess(postingId: string): Promise<PostingAccess | null> {
  const me = await getCurrentUser();
  if (!me) return null;
  const supabase = (await createClient())!;
  const { data } = await supabase.from("org_postings").select(POSTING_COLS).eq("id", postingId).is("deleted_at", null).maybeSingle();
  if (!data) return null;
  const posting = data as PostingBrief;

  if (posting.org_user_id === me.id) return { me, role: "owner", posting, isTeam: true, isAdmin: true };

  const { data: member } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_user_id", posting.org_user_id)
    .eq("member_user_id", me.id)
    .eq("status", "active")
    .maybeSingle();
  if (member) {
    const role = member.role === "admin" ? "admin" : "member";
    return { me, role, posting, isTeam: true, isAdmin: role === "admin" };
  }

  const { data: reviewer } = await supabase
    .from("posting_reviewers")
    .select("id")
    .eq("posting_id", postingId)
    .eq("user_id", me.id)
    .eq("status", "active")
    .maybeSingle();
  if (reviewer) return { me, role: "reviewer", posting, isTeam: false, isAdmin: false };
  return null;
}

export interface ReviewerInfo extends PostingReviewer {
  display_name: string | null;
}

export interface WorkbenchApplicant extends Application {
  /** 내가 남긴 점수·메모 */
  mine: ApplicationReview | null;
  /** 기관 쪽만 채워진다: 모든 심사자의 기록 */
  reviews: (ApplicationReview & { reviewer_name: string })[];
  /** 기관 쪽만: 점수 평균(점수 있는 기록만) */
  avg: number | null;
}

export interface Workbench {
  access: PostingAccess;
  applicants: WorkbenchApplicant[];
  reviewers: ReviewerInfo[];
  /** 기관 쪽: 심사에 참여하는 사람 전원(소유자·구성원·심사위원) 이름표 */
  teamNames: Record<string, string>;
}

export async function loadWorkbench(postingId: string): Promise<Workbench | null> {
  const access = await getPostingAccess(postingId);
  if (!access) return null;
  const supabase = (await createClient())!;
  const { me, posting } = access;

  const [{ data: apps }, { data: reviewers }, { data: members }] = await Promise.all([
    supabase
      .from("applications")
      .select("*")
      .eq("posting_source", "org")
      .eq("posting_id", postingId)
      .neq("status", "withdrawn")
      .order("created_at", { ascending: true }),
    supabase.from("posting_reviewers").select("*").eq("posting_id", postingId).order("created_at"),
    access.isTeam
      ? supabase.from("org_members").select("*").eq("org_user_id", posting.org_user_id).eq("status", "active")
      : Promise.resolve({ data: [] as OrgMember[] }),
  ]);
  const applications = (apps ?? []) as Application[];
  const appIds = applications.map((a) => a.id);
  const { data: reviewRows } = appIds.length
    ? await supabase.from("application_reviews").select("*").in("application_id", appIds)
    : { data: [] };
  const reviews = (reviewRows ?? []) as ApplicationReview[];

  // 이름표: 소유자 + 구성원 + 심사위원(수락한 사람)
  const ids = new Set<string>([posting.org_user_id, me.id]);
  ((members ?? []) as OrgMember[]).forEach((m) => m.member_user_id && ids.add(m.member_user_id));
  ((reviewers ?? []) as PostingReviewer[]).forEach((r) => r.user_id && ids.add(r.user_id));
  reviews.forEach((r) => ids.add(r.reviewer_user_id));
  const { data: people } = await supabase.from("profiles").select("id, display_name").in("id", [...ids]);
  const teamNames: Record<string, string> = {};
  (people ?? []).forEach((p) => (teamNames[p.id] = p.display_name));

  const applicants: WorkbenchApplicant[] = applications.map((a) => {
    const rs = reviews.filter((r) => r.application_id === a.id);
    const mine = rs.find((r) => r.reviewer_user_id === me.id) ?? null;
    const scored = rs.filter((r) => r.score != null);
    const avg = access.isTeam && scored.length ? Math.round((scored.reduce((s, r) => s + (r.score ?? 0), 0) / scored.length) * 10) / 10 : null;
    return {
      ...a,
      mine,
      reviews: access.isTeam ? rs.map((r) => ({ ...r, reviewer_name: teamNames[r.reviewer_user_id] ?? "심사자" })) : [],
      avg,
    };
  });

  return {
    access,
    applicants,
    reviewers: ((reviewers ?? []) as PostingReviewer[]).map((r) => ({ ...r, display_name: r.user_id ? (teamNames[r.user_id] ?? null) : null })),
    teamNames,
  };
}

/** 내가 참여 중인 심사: 구성원으로 속한 기관의 공고 + 심사위원으로 초청된 공고. */
export interface HiringHub {
  memberships: { org_user_id: string; org_name: string; role: string; postings: PostingBrief[] }[];
  reviewing: (PostingBrief & { reviewer_row_id: string })[];
  pendingInvites: { kind: "member" | "reviewer"; token: string; label: string }[];
}

export async function loadHiringHub(me: CurrentUser): Promise<HiringHub> {
  const supabase = (await createClient())!;
  const [{ data: memberRows }, { data: reviewerRows }] = await Promise.all([
    supabase.from("org_members").select("*").eq("member_user_id", me.id),
    supabase.from("posting_reviewers").select("*").eq("user_id", me.id),
  ]);
  const members = (memberRows ?? []) as OrgMember[];
  const reviewers = (reviewerRows ?? []) as PostingReviewer[];

  const activeOrgIds = members.filter((m) => m.status === "active").map((m) => m.org_user_id);
  const activeReviewIds = reviewers.filter((r) => r.status === "active").map((r) => r.posting_id);

  const [{ data: orgs }, { data: orgPostings }, { data: reviewPostings }] = await Promise.all([
    activeOrgIds.length ? supabase.from("org_profiles").select("user_id, org_name").in("user_id", activeOrgIds) : Promise.resolve({ data: [] }),
    activeOrgIds.length
      ? supabase.from("org_postings").select(POSTING_COLS).in("org_user_id", activeOrgIds).is("deleted_at", null).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    activeReviewIds.length
      ? supabase.from("org_postings").select(POSTING_COLS).in("id", activeReviewIds).is("deleted_at", null).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const memberships = members
    .filter((m) => m.status === "active")
    .map((m) => ({
      org_user_id: m.org_user_id,
      org_name: (orgs ?? []).find((o) => o.user_id === m.org_user_id)?.org_name ?? "기관",
      role: m.role,
      postings: ((orgPostings ?? []) as PostingBrief[]).filter((p) => p.org_user_id === m.org_user_id),
    }));

  const reviewing = ((reviewPostings ?? []) as PostingBrief[]).map((p) => ({
    ...p,
    reviewer_row_id: reviewers.find((r) => r.posting_id === p.id)?.id ?? "",
  }));

  // 아직 수락하지 않은 초대(이메일이 일치해 미리 연결된 것)
  const pendingInvites: HiringHub["pendingInvites"] = [
    ...members.filter((m) => m.status === "pending").map((m) => ({ kind: "member" as const, token: m.token, label: "기관 구성원 초청" })),
    ...reviewers.filter((r) => r.status === "pending").map((r) => ({ kind: "reviewer" as const, token: r.token, label: "심사위원 초청" })),
  ];

  return { memberships, reviewing, pendingInvites };
}

/** 마이페이지 메뉴에 '심사 참여' 를 보여줄지. 구성원이거나 심사위원이면 true. */
export async function hasHiringRoles(userId: string): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;
  const [{ count: m }, { count: r }] = await Promise.all([
    supabase.from("org_members").select("id", { count: "exact", head: true }).eq("member_user_id", userId),
    supabase.from("posting_reviewers").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  return (m ?? 0) + (r ?? 0) > 0;
}

/** 심사 결과 CSV (엑셀에서 바로 열리게 BOM 포함). 기관 쪽은 심사자별 점수까지, 심사위원은 자기 점수만. */
export function workbenchToCsv(wb: Workbench): string {
  const reviewerIds = wb.access.isTeam
    ? [...new Set(wb.applicants.flatMap((a) => a.reviews.map((r) => r.reviewer_user_id)))]
    : [wb.access.me.id];
  const head = [
    "순위", "이름", "분야", "장르", "직무", "경력(년)", "지역", "학력", "선발 단계", "지원일",
    ...(wb.access.isTeam ? ["평균 점수"] : []),
    ...reviewerIds.flatMap((id) => [`${wb.teamNames[id] ?? "심사자"} 점수`, `${wb.teamNames[id] ?? "심사자"} 메모`]),
    "지원 메시지", "포트폴리오",
  ];
  const sorted = [...wb.applicants].sort((a, b) => {
    const sa = wb.access.isTeam ? a.avg : a.mine?.score ?? null;
    const sb = wb.access.isTeam ? b.avg : b.mine?.score ?? null;
    return (sb ?? -1) - (sa ?? -1);
  });
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [head.map(esc).join(",")];
  sorted.forEach((a, i) => {
    const p = a.profile_snapshot;
    const rowReviews = wb.access.isTeam ? a.reviews : a.mine ? [a.mine] : [];
    const cells = [
      i + 1,
      p?.display_name ?? "(파기됨)",
      p?.field ?? "",
      (p?.genres ?? []).join(" / "),
      (p?.roles ?? []).join(" / "),
      p?.career_years ?? "",
      [p?.region, p?.address_hint].filter(Boolean).join(" "),
      p?.education ?? "",
      a.status,
      a.created_at.slice(0, 10),
      ...(wb.access.isTeam ? [a.avg ?? ""] : []),
      ...reviewerIds.flatMap((id) => {
        const r = rowReviews.find((x) => x.reviewer_user_id === id);
        return [r?.score ?? "", r?.memo ?? ""];
      }),
      a.message ?? "",
      [...(p?.portfolio ?? []).map((x) => x.url), ...(p?.portfolio_url ? [p.portfolio_url] : [])].join(" "),
    ];
    lines.push(cells.map(esc).join(","));
  });
  return "﻿" + lines.join("\r\n");
}
