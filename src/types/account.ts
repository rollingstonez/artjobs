// 회원·프로필·지원·메시지 타입. DB 정의는 supabase/migrations/0004_accounts.sql.
import type { Region } from "@/types/job";

export const ACCOUNT_ROLES = [
  {
    code: "artist",
    label: "예술가 · 구직자",
    note: "작가·연주자·무용수·배우·소리꾼·강사·스태프. 프로필을 만들고 공고에 지원하고 알림을 받습니다.",
  },
  {
    code: "organization",
    label: "기관 · 구인자",
    note: "미술관·공연장·예술단·재단·학교·학원. 공고를 올리고 인재를 찾고 메시지로 연락합니다.",
  },
] as const;

export type AccountRole = (typeof ACCOUNT_ROLES)[number]["code"];

export const ORG_TYPES = [
  { code: "museum", label: "미술관·박물관" },
  { code: "gallery", label: "갤러리·레지던시" },
  { code: "theater", label: "공연장·문예회관" },
  { code: "troupe", label: "극단·무용단·국악단" },
  { code: "orchestra", label: "오케스트라·합창단" },
  { code: "foundation", label: "문화재단·공공기관" },
  { code: "school", label: "학교·대학" },
  { code: "academy", label: "학원·교습소" },
  { code: "company", label: "기획사·제작사·기업" },
  { code: "other", label: "기타" },
] as const;

export type OrgTypeCode = (typeof ORG_TYPES)[number]["code"];

export function orgTypeLabel(code: string | null): string | null {
  return ORG_TYPES.find((t) => t.code === code)?.label ?? null;
}

export interface Profile {
  id: string;
  role: AccountRole;
  display_name: string;
  status: "active" | "suspended" | "deleted";
  is_admin: boolean;
}

export interface ArtistProfile {
  user_id: string;
  field: string | null;
  genres: string[];
  roles: string[];
  employment_types: string[];
  region: Region | null;
  address_hint: string | null;
  lat: number | null;
  lng: number | null;
  max_distance_km: number;
  career_years: number | null;
  education: string | null;
  bio: string | null;
  career: string | null;
  portfolio_url: string | null;
  photo_url: string | null;
  availability: "open" | "closed";
  is_public: boolean;
  allow_messages: boolean;
  profile_completed: boolean;
  updated_at: string;
}

export interface OrgProfile {
  user_id: string;
  org_name: string;
  org_type: OrgTypeCode | null;
  field: string | null;
  region: Region | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  website: string | null;
  intro: string | null;
  logo_url: string | null;
  is_verified: boolean;
  profile_completed: boolean;
  updated_at: string;
}

/** 인재정보 공개 뷰(talents_public). 좌표 없음. */
export type TalentPublic = Omit<ArtistProfile, "lat" | "lng" | "is_public" | "profile_completed" | "max_distance_km"> & {
  display_name: string;
};

export type PostingSource = "crawled" | "org" | "sample";

/** 선발 단계. 접수 → 확인 → 서류통과 → 오디션·면접 → 최종선발/불합격. 철회는 어디서든. */
export const APPLICATION_STATUS = {
  submitted: "지원 완료",
  viewed: "기관 확인",
  shortlisted: "서류 통과",
  interview: "오디션·면접",
  accepted: "최종 선발",
  rejected: "불합격",
  withdrawn: "지원 취소",
} as const;

export type ApplicationStatus = keyof typeof APPLICATION_STATUS;

/** 기관이 고를 수 있는 단계(철회 제외), 진행 순서대로. */
export const APPLICATION_STAGES: readonly { code: ApplicationStatus; label: string; tone: string }[] = [
  { code: "submitted", label: "접수", tone: "bg-stone-100 text-stone-700" },
  { code: "viewed", label: "확인", tone: "bg-sky-50 text-sky-700" },
  { code: "shortlisted", label: "서류 통과", tone: "bg-indigo-50 text-indigo-700" },
  { code: "interview", label: "오디션·면접", tone: "bg-amber-50 text-amber-700" },
  { code: "accepted", label: "최종 선발", tone: "bg-emerald-50 text-emerald-700" },
  { code: "rejected", label: "불합격", tone: "bg-stone-100 text-stone-500" },
];

export function stageTone(status: string): string {
  return APPLICATION_STAGES.find((s) => s.code === status)?.tone ?? "bg-stone-100 text-stone-400";
}

export const PORTFOLIO_KINDS = [
  { code: "video", label: "영상" },
  { code: "image", label: "이미지" },
  { code: "audio", label: "음원" },
  { code: "document", label: "문서" },
  { code: "link", label: "링크" },
] as const;

export type PortfolioKind = (typeof PORTFOLIO_KINDS)[number]["code"];

export interface PortfolioItem {
  id: string;
  user_id: string;
  kind: PortfolioKind;
  title: string | null;
  url: string;
  sort_order: number;
}

/** 지원 시점에 복사해 둔 프로필. DB 트리거(snapshot_applicant)가 만든다. */
export interface ApplicantSnapshot {
  display_name: string;
  field: string | null;
  genres: string[];
  roles: string[];
  employment_types: string[];
  region: string | null;
  address_hint: string | null;
  career_years: number | null;
  education: string | null;
  bio: string | null;
  career: string | null;
  portfolio_url: string | null;
  photo_url: string | null;
  portfolio: { kind: PortfolioKind; title: string | null; url: string }[];
  captured_at: string;
}

export interface Application {
  id: string;
  artist_user_id: string;
  posting_source: PostingSource;
  posting_id: string;
  org_user_id: string | null;
  posting_title: string;
  message: string | null;
  status: ApplicationStatus;
  status_changed_at: string;
  created_at: string;
  profile_snapshot: ApplicantSnapshot | null;
  purged_at: string | null;
}

export const ORG_MEMBER_ROLES = [
  { code: "admin", label: "관리자", note: "심사위원 초청, 공고 수정, 선발 결정" },
  { code: "member", label: "구성원", note: "지원자 열람, 심사, 선발 단계 변경" },
] as const;

export type OrgMemberRole = (typeof ORG_MEMBER_ROLES)[number]["code"];

export interface OrgMember {
  id: string;
  org_user_id: string;
  member_user_id: string | null;
  email: string;
  role: OrgMemberRole;
  status: "pending" | "active";
  token: string;
  created_at: string;
  accepted_at: string | null;
}

export interface PostingReviewer {
  id: string;
  posting_id: string;
  user_id: string | null;
  email: string;
  status: "pending" | "active";
  token: string;
  created_at: string;
  accepted_at: string | null;
}

export interface ApplicationReview {
  id: string;
  application_id: string;
  reviewer_user_id: string;
  score: number | null;
  memo: string | null;
  updated_at: string;
}

export const REPORT_STATUS = { open: "미처리", reviewed: "확인함", closed: "종결" } as const;

export interface UserReport {
  id: string;
  reporter_user_id: string;
  reported_user_id: string;
  context_type: string | null;
  context_id: string | null;
  category: string;
  detail: string | null;
  status: keyof typeof REPORT_STATUS;
  created_at: string;
}

/** 심사 화면에서의 내 자격. owner·admin·member 는 기관 쪽, reviewer 는 이 공고 심사위원. */
export type HiringRole = "owner" | "admin" | "member" | "reviewer";

export interface Bookmark {
  id: string;
  posting_source: PostingSource;
  posting_id: string;
  created_at: string;
}

export interface AlertCondition {
  id: string;
  user_id: string;
  name: string;
  boards: string[];
  fields: string[];
  genres: string[];
  roles: string[];
  employment_types: string[];
  regions: string[];
  near_me: boolean;
  channels: string[];
  frequency: "instant" | "daily" | "weekly";
  is_active: boolean;
  last_matched_at: string | null;
}

export interface Notification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  artist_user_id: string;
  org_user_id: string;
  posting_source: string | null;
  posting_id: string | null;
  last_message_at: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

/** 프로필 완성도(%)와 빠진 항목. 바로쌤의 profile_completed 판정을 옮겼다. */
export function artistCompleteness(a: ArtistProfile | null): { percent: number; missing: string[] } {
  if (!a) return { percent: 0, missing: ["프로필"] };
  const checks: [boolean, string][] = [
    [Boolean(a.field), "분야"],
    [a.genres.length > 0, "장르"],
    [a.roles.length > 0, "희망 직무"],
    [Boolean(a.region), "지역"],
    [Boolean(a.bio && a.bio.trim().length >= 30), "자기소개(30자 이상)"],
    [Boolean(a.career), "경력"],
  ];
  const missing = checks.filter(([ok]) => !ok).map(([, label]) => label);
  return { percent: Math.round(((checks.length - missing.length) / checks.length) * 100), missing };
}

export function orgCompleteness(o: OrgProfile | null): { percent: number; missing: string[] } {
  if (!o) return { percent: 0, missing: ["프로필"] };
  const checks: [boolean, string][] = [
    [Boolean(o.org_name), "기관명"],
    [Boolean(o.org_type), "기관 유형"],
    [Boolean(o.field), "주 분야"],
    [Boolean(o.region), "지역"],
    [Boolean(o.address), "주소"],
    [Boolean(o.intro && o.intro.trim().length >= 20), "기관 소개(20자 이상)"],
  ];
  const missing = checks.filter(([ok]) => !ok).map(([, label]) => label);
  return { percent: Math.round(((checks.length - missing.length) / checks.length) * 100), missing };
}
