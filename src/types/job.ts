// 아트잡스 공고 표준 필드 — DB(crawled_postings)·크롤러·화면이 공유하는 단일 기준.
// 컬럼 정의는 supabase/migrations/0001_init.sql, 크롤러 적재는 scripts/crawler/common.py 참조.

export const CATEGORIES = [
  { code: "painting", label: "회화" },
  { code: "sculpture_installation", label: "조각·설치" },
  { code: "media_art", label: "미디어아트" },
  { code: "print_drawing", label: "판화·드로잉" },
  { code: "craft", label: "공예" },
  { code: "photography", label: "사진" },
  { code: "curation", label: "전시기획·큐레이션" },
  { code: "art_management", label: "아트매니지먼트" },
  { code: "art_education", label: "예술교육" },
  { code: "residency_open_call", label: "레지던시·공모" },
] as const;

export type CategoryCode = (typeof CATEGORIES)[number]["code"];

export const EMPLOYMENT_TYPES = [
  { code: "full_time", label: "정규직" },
  { code: "contract", label: "계약직" },
  { code: "freelance", label: "프리랜서" },
  { code: "intern", label: "인턴" },
  { code: "open_call", label: "공모·지원사업" },
] as const;

export type EmploymentCode = (typeof EMPLOYMENT_TYPES)[number]["code"];

export const REGIONS = [
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "광주",
  "대전",
  "울산",
  "세종",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
  "전국·온라인",
] as const;

export type Region = (typeof REGIONS)[number];

export type PostingStatus = "open" | "closed";

export interface Posting {
  id: string;
  title: string;
  organization: string | null;
  category: CategoryCode | null;
  categoryRaw: string | null;
  employmentType: EmploymentCode | null;
  employmentRaw: string | null;
  region: Region | null;
  address: string | null;
  salary: string | null;
  recruitCount: string | null;
  applyStart: string | null;
  applyEnd: string | null;
  workStart: string | null;
  workEnd: string | null;
  applyMethod: string | null;
  applyEmail: string | null;
  applyContact: string | null;
  requiredDocs: string | null;
  description: string | null;
  sourceName: string;
  sourceUrl: string;
  status: PostingStatus;
  createdAt: string;
}

export function categoryLabel(code: string | null): string | null {
  return CATEGORIES.find((c) => c.code === code)?.label ?? null;
}

export function employmentLabel(code: string | null): string | null {
  return EMPLOYMENT_TYPES.find((c) => c.code === code)?.label ?? null;
}
