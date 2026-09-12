// 운영자 화면 공통 조각 — 서버 컴포넌트에서 그대로 쓴다(클라이언트 훅 없음).
import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, count, description, actions, back }: { title: string; count?: number | string | null; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="space-y-2">
      {back && (
        <Link href={back.href} className="text-xs font-semibold text-stone-500 hover:text-stone-900">← {back.label}</Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">
          {title}
          {count != null && <span className="ml-2 text-stone-400">{typeof count === "number" ? count.toLocaleString("ko-KR") : count}</span>}
        </h2>
        {actions && <div className="flex flex-wrap items-center gap-1">{actions}</div>}
      </div>
      {description && <div className="text-xs leading-relaxed text-stone-500">{description}</div>}
    </div>
  );
}

export function Card({ title, sub, action, children, className = "", tone = "white" }: { title?: ReactNode; sub?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; tone?: "white" | "muted" | "dark" }) {
  const base = tone === "dark" ? "bg-stone-900 text-white" : tone === "muted" ? "border border-stone-200 bg-stone-50" : "border border-stone-200 bg-white";
  return (
    <section className={`rounded-2xl ${base} p-4 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            {title && <h3 className="text-sm font-bold">{title}</h3>}
            {sub && <p className={`mt-0.5 text-xs ${tone === "dark" ? "text-stone-400" : "text-stone-500"}`}>{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Chip({ href, active, children, tone }: { href: string; active: boolean; children: ReactNode; tone?: "warn" }) {
  const cls = active
    ? "bg-stone-900 text-white"
    : tone === "warn"
      ? "border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
      : "border border-stone-300 bg-white text-stone-700 hover:border-stone-500";
  return (
    <Link href={href} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold ${cls}`}>{children}</Link>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-1">{children}</div>;
}

export function ChipDivider() {
  return <span className="mx-1 text-stone-300">|</span>;
}

export type BadgeTone = "green" | "red" | "amber" | "stone" | "sky" | "violet" | "orange" | "indigo";
const TONES: Record<BadgeTone, string> = {
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
  amber: "bg-amber-50 text-amber-700",
  stone: "bg-stone-100 text-stone-600",
  sky: "bg-sky-50 text-sky-700",
  violet: "bg-violet-50 text-violet-700",
  orange: "bg-orange-50 text-orange-700",
  indigo: "bg-indigo-50 text-indigo-700",
};

export function Badge({ tone = "stone", children, title, className = "" }: { tone?: BadgeTone; children: ReactNode; title?: string; className?: string }) {
  return (
    <span title={title} className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONES[tone]} ${className}`}>{children}</span>
  );
}

/** 클래스 문자열을 그대로 받는 배지(APPLICATION_STAGES.tone 처럼 이미 색이 정해진 것). */
export function ToneBadge({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{children}</span>;
}

export function Empty({ children, icon = "📭" }: { children: ReactNode; icon?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
      <p className="text-3xl">{icon}</p>
      <p className="mt-2">{children}</p>
    </div>
  );
}

export function ErrorNote({ message, missing }: { message: string | null; missing?: boolean }) {
  if (!message) return null;
  if (missing) {
    return (
      <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        이 화면에 필요한 DB 확장(<code>supabase/migrations/0010_admin_center.sql</code>)이 아직 적용되지 않았습니다. Supabase → SQL Editor 에서 그 파일을 실행하면 바로 보입니다.
        <span className="mt-1 block text-[11px] text-amber-700">{message}</span>
      </p>
    );
  }
  return <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">불러오지 못했습니다: {message}</p>;
}

export function Flash({ ok, err }: { ok?: string | null; err?: string | null }) {
  return (
    <>
      {err && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      {ok && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{ok}</p>}
    </>
  );
}

/** dt/dd 한 줄 */
export function KV({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-xs font-semibold text-stone-500">{label}</dt>
      <dd className="min-w-0 text-sm text-stone-900">{children ?? "—"}</dd>
    </>
  );
}

export function KVGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-[7.5rem_1fr]">{children}</dl>;
}

export function Bar({ percent, tone = "bg-stone-900", height = "h-2" }: { percent: number; tone?: string; height?: string }) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div className={`${height} w-full overflow-hidden rounded-full bg-stone-100`}>
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${p}%` }} />
    </div>
  );
}

/** 작은 통계 카드(링크). warn 이면 값이 0 보다 클 때 노란색. */
export function Stat({ title, value, href, note, warn, accent }: { title: string; value: number | string | null; href?: string; note?: string; warn?: boolean; accent?: boolean }) {
  const numeric = typeof value === "number" ? value : null;
  const hot = (warn && numeric != null && numeric > 0) || accent;
  const body = (
    <>
      <p className="text-xs font-semibold text-stone-500">{title}</p>
      <p className={`mt-1 text-2xl font-extrabold tabular-nums ${hot ? "text-amber-800" : ""}`}>{value == null ? "—" : typeof value === "number" ? value.toLocaleString("ko-KR") : value}</p>
      {note && <p className="mt-1 text-xs text-stone-500">{note}</p>}
    </>
  );
  const cls = `block rounded-xl border p-4 ${hot ? "border-amber-300 bg-amber-50/50" : "border-stone-200 bg-white"} ${href ? "hover:border-stone-400" : ""}`;
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

/** 표 껍데기. 가로 넘침은 안에서 스크롤. */
export function Table({ children, minWidth = "min-w-[720px]" }: { children: ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <table className={`w-full ${minWidth} text-sm`}>{children}</table>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-left text-xs font-semibold text-stone-500 ${className}`}>{children}</th>;
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-top ${className}`}>{children}</td>;
}

/** 페이지 이동(오프셋 기반). */
export function Pager({ total, limit, offset, makeHref }: { total: number; limit: number; offset: number; makeHref: (offset: number) => string }) {
  if (total <= limit) return null;
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.ceil(total / limit);
  return (
    <div className="flex items-center justify-between text-xs text-stone-500">
      <span>{page} / {pages} 페이지 · 전체 {total.toLocaleString("ko-KR")}</span>
      <div className="flex gap-1">
        {offset > 0 && <Link href={makeHref(Math.max(0, offset - limit))} className="rounded-lg border border-stone-300 px-3 py-1.5 font-semibold">← 이전</Link>}
        {offset + limit < total && <Link href={makeHref(offset + limit)} className="rounded-lg border border-stone-300 px-3 py-1.5 font-semibold">다음 →</Link>}
      </div>
    </div>
  );
}

export const btn = {
  primary: "rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-700 disabled:opacity-60",
  secondary: "rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 hover:border-stone-500 disabled:opacity-60",
  danger: "rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60",
  dangerSolid: "rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60",
  success: "rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60",
  successSolid: "rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60",
};

/** 사용자 이름 + 역할 뱃지 + 상세 링크 */
export function UserLink({ id, name, role, status, small }: { id: string | null; name: string | null | undefined; role?: string | null; status?: string | null; small?: boolean }) {
  const label = name ?? "(탈퇴)";
  const inner = (
    <>
      <span className={`font-semibold ${small ? "text-xs" : ""}`}>{label}</span>
      {role && <span className="ml-1 text-[10px] text-stone-400">{role === "organization" ? "기관" : "예술가"}</span>}
      {status === "suspended" && <span className="ml-1 text-[10px] font-bold text-red-600">정지</span>}
    </>
  );
  return id ? <Link href={`/admin/users/${id}`} className="underline-offset-2 hover:underline">{inner}</Link> : <span>{inner}</span>;
}
