// 운영자 화면 공통 라벨 — 로그 액션명·문의 유형·공지 종류·알림 종류.
// DB 에는 코드만 들어가고, 화면은 여기서 한글로 바꾼다.

export const ADMIN_ACTION_LABEL: Record<string, string> = {
  org_verify: "기관 인증",
  org_unverify: "기관 인증 취소",
  user_suspend: "계정 정지",
  user_restore: "정지 해제",
  admin_grant: "운영자 지정",
  admin_revoke: "운영자 해제",
  report_status: "신고 상태 변경",
  posting_close: "공고 마감",
  posting_delete: "공고 내리기",
  posting_restore: "공고 복구",
  crawled_hide: "수집 공고 숨김",
  crawled_unhide: "수집 공고 숨김 해제",
  crawled_close: "수집 공고 마감",
  seeking_hide: "구직 글 내리기",
  seeking_restore: "구직 글 복구",
  source_on: "크롤 소스 켬",
  source_off: "크롤 소스 끔",
  notify_user: "회원에게 알림",
  user_note: "운영 메모",
  artist_unpublish: "인재정보 비공개",
  contact_update: "문의 처리",
  notice_create: "공지 작성",
  notice_update: "공지 수정",
  notice_delete: "공지 삭제",
  purge_applications: "만료 지원서 파기",
  channel_create: "채널 링크 만듦",
  channel_update: "채널 링크 수정",
  channel_delete: "채널 링크 삭제",
};

export const ADMIN_TARGET_LABEL: Record<string, string> = {
  user: "회원",
  org: "기관",
  report: "신고",
  posting: "기관 공고",
  crawled: "수집 공고",
  seeking: "구직 글",
  source: "크롤 소스",
  contact: "문의",
  notice: "공지",
  channel: "채널 링크",
  system: "시스템",
};

export const CONTACT_CATEGORY = [
  { code: "account", label: "계정·로그인" },
  { code: "posting", label: "공고 등록·수정" },
  { code: "report", label: "신고·부적절한 이용" },
  { code: "partnership", label: "제휴·수집 협의" },
  { code: "bug", label: "오류 제보" },
  { code: "other", label: "기타" },
] as const;

export type ContactCategory = (typeof CONTACT_CATEGORY)[number]["code"];

export function contactCategoryLabel(code: string | null): string {
  return CONTACT_CATEGORY.find((c) => c.code === code)?.label ?? "기타";
}

export const CONTACT_STATUS: Record<string, { label: string; tone: string }> = {
  new: { label: "새 문의", tone: "bg-red-50 text-red-700" },
  in_progress: { label: "처리 중", tone: "bg-amber-50 text-amber-700" },
  replied: { label: "답변 완료", tone: "bg-emerald-50 text-emerald-700" },
  closed: { label: "종결", tone: "bg-stone-100 text-stone-500" },
};

export const NOTICE_KIND = [
  { code: "notice", label: "공지" },
  { code: "update", label: "업데이트" },
  { code: "event", label: "이벤트" },
  { code: "maintenance", label: "점검" },
] as const;

export function noticeKindLabel(code: string | null): string {
  return NOTICE_KIND.find((k) => k.code === code)?.label ?? "공지";
}

export const NOTIFICATION_KIND_LABEL: Record<string, string> = {
  message: "메시지",
  application: "지원 접수",
  application_status: "지원 결과",
  new_posting: "새 공고",
  invite: "초대",
  system: "시스템",
  admin: "운영팀",
};

export const REPORT_CONTEXT_LABEL: Record<string, string> = { message: "메시지", posting: "공고", profile: "프로필", seeking: "구직 글" };

export const ROBOTS_LABEL: Record<string, { label: string; tone: string }> = {
  clean: { label: "허용", tone: "bg-emerald-50 text-emerald-700" },
  agreed: { label: "협의 완료", tone: "bg-emerald-50 text-emerald-700" },
  gray: { label: "회색", tone: "bg-amber-50 text-amber-700" },
  blocked: { label: "차단", tone: "bg-red-50 text-red-700" },
  unchecked: { label: "미판정", tone: "bg-stone-100 text-stone-500" },
};

/** 매일 도는 파서가 완성된 소스 코드 — scripts/crawler/crawl_<code>.py 가 있는 것. docs/collection-status.md 와 맞춘다. */
export const PARSER_READY_SOURCES = ["artmore", "seoul_culture", "sfac", "kcdf", "sema", "mmca", "artnuri", "momo365"];
