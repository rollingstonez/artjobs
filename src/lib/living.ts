// 살아있는(모집중) 공고 판정 — 바로쌤 lib/postings/living.ts 규칙 이식.
// 마감일이 있으면 그 날짜로, 없으면 등록일로부터 NO_DEADLINE_DAYS일까지만 모집중으로 본다.
// DB 데이터는 건드리지 않고 조회·표시 단계에서만 거른다.

export const NO_DEADLINE_DAYS = 14;

export function todayStr(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function noDeadlineCutoff(today: string = todayStr()): string {
  const d = new Date(`${today}T00:00:00`);
  d.setDate(d.getDate() - NO_DEADLINE_DAYS);
  return todayStr(d);
}

export function isLivingPosting(
  applyEnd: string | null | undefined,
  createdAt: string | null | undefined,
  today: string = todayStr(),
): boolean {
  if (applyEnd) return String(applyEnd).slice(0, 10) >= today;
  if (!createdAt) return false;
  return String(createdAt).slice(0, 10) >= noDeadlineCutoff(today);
}
