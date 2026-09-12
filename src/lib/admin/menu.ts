// 운영자 메뉴 정의 — 왼쪽 메뉴(AdminNav)와 대시보드 메뉴 그리드가 같은 표를 쓴다.
// badgeKey 는 getAdminBadges() 의 키. 0 보다 크면 빨간 숫자가 붙는다.
import type { AdminBadges } from "@/lib/admin/queries";

export interface AdminMenuItem {
  href: string;
  label: string;
  icon: string;
  badgeKey?: keyof AdminBadges;
  note?: string;
}

export interface AdminMenuGroup {
  title: string;
  items: AdminMenuItem[];
}

export const ADMIN_MENU: AdminMenuGroup[] = [
  {
    title: "회원",
    items: [
      { href: "/admin/users", label: "회원 관리", icon: "👥", note: "검색·정지·운영자 지정·상세" },
      { href: "/admin/orgs", label: "기관 인증", icon: "🏛️", badgeKey: "pendingOrgs", note: "사업자·기관 확인 후 인증" },
    ],
  },
  {
    title: "공고 · 지원",
    items: [
      { href: "/admin/postings", label: "기관 공고", icon: "📋", note: "기관이 직접 올린 공고" },
      { href: "/admin/crawled", label: "수집 공고", icon: "🛰️", note: "크롤러가 모은 공고 · 숨기기" },
      { href: "/admin/applications", label: "지원 현황", icon: "📨", note: "전체 지원서와 선발 단계" },
      { href: "/admin/seeking", label: "구직 글", icon: "🙋", note: "예술가가 올린 구직 글" },
    ],
  },
  {
    title: "신뢰 · 안전",
    items: [
      { href: "/admin/reports", label: "신고 처리", icon: "🚨", badgeKey: "openReports", note: "신고 확인·계정 정지" },
      { href: "/admin/blocks", label: "차단 모니터", icon: "🚫", note: "누가 누구를 막았는지" },
      { href: "/admin/messages", label: "대화 모니터", icon: "💬", note: "대화 건수·응답 여부(본문 없음)" },
    ],
  },
  {
    title: "소통",
    items: [
      { href: "/admin/support", label: "고객 문의", icon: "📮", badgeKey: "newContacts", note: "문의 답변·상태 관리" },
      { href: "/admin/feedback", label: "의견", icon: "💡", badgeKey: "newFeedback", note: "회원이 남긴 의견·답글" },
      { href: "/admin/notices", label: "공지사항", icon: "📢", note: "공지 작성·게시" },
      { href: "/admin/sent", label: "운영팀 발신함", icon: "📤", note: "회원에게 보낸 알림" },
    ],
  },
  {
    title: "시스템 · 분석",
    items: [
      { href: "/admin/sources", label: "크롤 소스", icon: "🔌", note: "수집 스위치·소스별 현황" },
      { href: "/admin/stats", label: "통계", icon: "📊", note: "가입·공고·지원·대화 추이" },
      { href: "/admin/traffic", label: "유입·방문", icon: "📈", note: "방문자·유입 경로·가입 전환" },
      { href: "/admin/logs", label: "활동 로그", icon: "🧾", note: "운영자가 한 일" },
      { href: "/admin/settings", label: "환경 설정", icon: "⚙️", note: "운영자·데이터 정리·환경" },
    ],
  },
];

export function badgeOf(badges: AdminBadges | null, key?: keyof AdminBadges): number {
  if (!badges || !key) return 0;
  return badges[key] ?? 0;
}
