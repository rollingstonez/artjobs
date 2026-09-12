export function fmtDate(d: string | null): string {
  if (!d) return "";
  const parts = d.slice(0, 10).split("-");
  return parts.length === 3 ? `${parts[0]}.${parts[1]}.${parts[2]}` : d;
}

export function periodText(start: string | null, end: string | null): string {
  const s = fmtDate(start);
  const e = fmtDate(end);
  if (s && e) return `${s} ~ ${e}`;
  if (s) return `${s} ~`;
  if (e) return `~ ${e}`;
  return "";
}

export type Deadline = {
  kind: "none" | "expired" | "soon" | "normal";
  label: string;
};

export function getDeadline(applyEnd: string | null): Deadline {
  if (!applyEnd) return { kind: "none", label: "" };
  const end = new Date(`${applyEnd.slice(0, 10)}T00:00:00`);
  if (isNaN(end.getTime())) return { kind: "none", label: "" };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((end.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return { kind: "expired", label: "마감" };
  if (diffDays === 0) return { kind: "soon", label: "오늘 마감" };
  if (diffDays <= 3) return { kind: "soon", label: `마감임박 D-${diffDays}` };
  return { kind: "normal", label: `D-${diffDays}` };
}

/** 날짜+시간 (2026.09.12 14:03). 서버·클라이언트 어디서든 같은 결과가 나오도록 KST 고정. */
export function fmtDateTime(d: string | null | undefined): string {
  if (!d) return "";
  const t = new Date(d);
  if (isNaN(t.getTime())) return d;
  const k = new Date(t.getTime() + 9 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${k.getUTCFullYear()}.${p(k.getUTCMonth() + 1)}.${p(k.getUTCDate())} ${p(k.getUTCHours())}:${p(k.getUTCMinutes())}`;
}

/** "3분 전", "2일 전" 같은 상대 시각. 운영자 화면에서 최근 활동을 한눈에 볼 때 쓴다. */
export function timeAgo(d: string | null | undefined): string {
  if (!d) return "—";
  const t = new Date(d).getTime();
  if (isNaN(t)) return "—";
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;
  return `${Math.floor(months / 12)}년 전`;
}

/** 오늘 날짜를 "2026년 9월 12일 (금)" 형식으로. */
export function fmtTodayKo(d: Date = new Date()): string {
  const k = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${k.getUTCFullYear()}년 ${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일 (${days[k.getUTCDay()]})`;
}
