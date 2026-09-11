// 아트잡스 공고 표준 필드 — DB(crawled_postings)·크롤러·화면이 공유하는 단일 기준.
// 컬럼 정의는 supabase/migrations/, 크롤러 적재는 scripts/crawler/common.py 참조.
// 분류 설계 배경과 사이트맵은 docs/SITEMAP.md 에 있다.
//
// 분류는 네 축으로 나눈다.
//   family  서비스 우산   fine(아트잡스) | modern(모던아트잡스, 자리만 예약)
//   field   분야(대분류)  미술 · 음악 · 무용 · 국악 · 연극
//   genre   장르(소분류)  분야마다 다름. 코드 앞에 분야 코드를 붙여 장르만 봐도 분야를 알 수 있다.
//   role    직무(공통)    실연 · 창작 · 교육 · 기획행정 · 무대기술 · 보조
// 여기에 게시판 종류(board)와 고용형태(employment_type)가 붙는다.

// ── 서비스 우산 ──
export const FAMILIES = [
  { code: "fine", label: "아트잡스", note: "순수예술. 예술의전당·국립국악원 무대와 전시장에 오르는 장르" },
  { code: "modern", label: "모던아트잡스", note: "산업예술. 실용음악·디자인·영상 등 (별도 서비스, 자리만 예약)" },
] as const;

export type FamilyCode = (typeof FAMILIES)[number]["code"];

// ── 분야(대분류) ──
export const FIELDS = [
  { code: "art", label: "미술", family: "fine" },
  { code: "music", label: "음악", family: "fine" },
  { code: "dance", label: "무용", family: "fine" },
  { code: "gugak", label: "국악", family: "fine" },
  { code: "theater", label: "연극", family: "fine" },
] as const;

export type FieldCode = (typeof FIELDS)[number]["code"];

// ── 장르(소분류) ──
export const GENRES = [
  // 미술
  { code: "art_painting", field: "art", label: "회화" },
  { code: "art_sculpture", field: "art", label: "조소·설치" },
  { code: "art_print", field: "art", label: "판화·드로잉" },
  { code: "art_photo", field: "art", label: "사진" },
  { code: "art_media", field: "art", label: "미디어아트" },
  { code: "art_craft", field: "art", label: "공예" },
  { code: "art_calligraphy", field: "art", label: "서예" },
  // 음악
  { code: "music_voice", field: "music", label: "성악" },
  { code: "music_piano", field: "music", label: "피아노·건반" },
  { code: "music_strings", field: "music", label: "현악" },
  { code: "music_winds", field: "music", label: "관악" },
  { code: "music_percussion", field: "music", label: "타악" },
  { code: "music_composition", field: "music", label: "작곡·지휘" },
  // 무용 (한국무용은 무용 아래. 국악 쪽에서도 함께 보여준다 — GENRE_CROSSLINKS 참조)
  { code: "dance_ballet", field: "dance", label: "발레" },
  { code: "dance_contemporary", field: "dance", label: "현대무용" },
  { code: "dance_korean", field: "dance", label: "한국무용" },
  // 국악
  { code: "gugak_voice", field: "gugak", label: "성악(판소리·민요·정가)" },
  { code: "gugak_strings", field: "gugak", label: "현악(가야금·거문고·해금)" },
  { code: "gugak_winds", field: "gugak", label: "관악(대금·피리·태평소)" },
  { code: "gugak_percussion", field: "gugak", label: "타악(장구·사물)" },
  { code: "gugak_composition", field: "gugak", label: "작곡·지휘" },
  { code: "gugak_yeonhui", field: "gugak", label: "연희(풍물·탈춤)" },
  // 연극
  { code: "theater_play", field: "theater", label: "연극" },
  { code: "theater_musical", field: "theater", label: "뮤지컬" },
  { code: "theater_opera", field: "theater", label: "오페라" },
  { code: "theater_children", field: "theater", label: "아동극·인형극" },
  { code: "theater_changgeuk", field: "theater", label: "창극" },
] as const;

export type GenreCode = (typeof GENRES)[number]["code"];

// 다른 분야 탭에서도 함께 보여줄 장르. 예: 국악 탭에서 한국무용 공고도 보인다.
export const GENRE_CROSSLINKS: Partial<Record<FieldCode, readonly GenreCode[]>> = {
  gugak: ["dance_korean", "theater_changgeuk"],
  music: ["theater_opera"],
};

// ── 직무(모든 분야 공통) ──
export const ROLES = [
  { code: "performer", label: "실연", note: "작가·연주자·무용수·배우·소리꾼" },
  { code: "creator", label: "창작", note: "작곡·안무·연출·극작" },
  { code: "education", label: "교육", note: "강사·레슨·방과후·문화예술교육사" },
  { code: "planning", label: "기획·행정", note: "큐레이터·학예·공연기획·홍보·행정" },
  { code: "stage_tech", label: "무대·기술", note: "무대미술·조명·음향·의상·분장·무대감독·전시설치" },
  { code: "assistant", label: "보조·기타", note: "어시스턴트·인턴·아르바이트" },
] as const;

export type RoleCode = (typeof ROLES)[number]["code"];

// ── 게시판 종류 ──
export const BOARDS = [
  { code: "job", label: "채용공고", path: "/jobs" },
  { code: "audition", label: "오디션·공모", path: "/auditions" },
  // { code: "event", label: "공연·전시", path: "/events" },   // 3단계에서 연다
] as const;

export type BoardCode = (typeof BOARDS)[number]["code"];

// ── 고용형태 ──
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
  board: BoardCode;
  field: FieldCode | null;
  genre: GenreCode | null;
  role: RoleCode | null;
  categoryRaw: string | null; // 사이트 원문의 분야·직무 표기 (변형 없이 보존)
  employmentType: EmploymentCode | null;
  employmentRaw: string | null;
  region: Region | null;
  address: string | null;
  lat: number | null; // 근무지 좌표. 있으면 "내 집 근처" 정렬에 실제 거리를 쓴다 (src/lib/location.ts)
  lng: number | null;
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
  orgUserId?: string | null; // 기관이 직접 올린 공고면 그 기관 계정. 메신저 지원·문의 연결에 쓴다
}

// ── 조회 도우미 ──
export function fieldLabel(code: string | null): string | null {
  return FIELDS.find((f) => f.code === code)?.label ?? null;
}

export function genreLabel(code: string | null): string | null {
  return GENRES.find((g) => g.code === code)?.label ?? null;
}

export function roleLabel(code: string | null): string | null {
  return ROLES.find((r) => r.code === code)?.label ?? null;
}

export function boardLabel(code: string | null): string | null {
  return BOARDS.find((b) => b.code === code)?.label ?? null;
}

export function employmentLabel(code: string | null): string | null {
  return EMPLOYMENT_TYPES.find((c) => c.code === code)?.label ?? null;
}

export function genresOf(field: string | null | undefined) {
  return GENRES.filter((g) => g.field === field);
}

/** 분야 탭에 보일 장르 코드 전체(자기 장르 + 교차 노출 장르). */
export function genreCodesForField(field: FieldCode): GenreCode[] {
  return [...genresOf(field).map((g) => g.code), ...(GENRE_CROSSLINKS[field] ?? [])];
}

/** 장르 코드에서 분야 코드를 꺼낸다. 예: "music_strings" → "music" */
export function fieldOfGenre(genre: string | null): FieldCode | null {
  return GENRES.find((g) => g.code === genre)?.field ?? null;
}
