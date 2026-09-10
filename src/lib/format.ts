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
