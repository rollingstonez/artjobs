// 운영자 화면용 작은 차트 — 라이브러리 없이 div + Tailwind 로 그린다(바로쌤 방식).
// 서버 컴포넌트에서 그대로 쓴다.

export interface Series {
  key: string;
  label: string;
  color: string; // tailwind bg-*
}

export interface DayBucket {
  key: string; // YYYY-MM-DD
  label: string; // M/D
  values: Record<string, number>;
}

/** 일별 누적 세로 막대. 이상치(대량 이관)가 있으면 그 날만 노란 단색으로 그리고 스케일은 2등 값 기준. */
export function StackedBars({ buckets, series, height = "h-36", emptyText = "데이터 없음" }: { buckets: DayBucket[]; series: Series[]; height?: string; emptyText?: string }) {
  const totals = buckets.map((b) => series.reduce((s, k) => s + (b.values[k.key] ?? 0), 0));
  const sum = totals.reduce((a, b) => a + b, 0);
  if (sum === 0) return <p className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4 text-center text-sm text-stone-500">{emptyText}</p>;
  const sorted = [...totals].sort((a, b) => b - a);
  const top1 = sorted[0] ?? 0;
  const top2 = sorted[1] ?? 0;
  const hasSpike = top1 >= 8 && top1 >= top2 * 3;
  const scaleBase = Math.max(1, hasSpike ? top2 : top1);
  const many = buckets.length > 20;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-stone-600">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1"><span className={`inline-block h-2.5 w-2.5 rounded-sm ${s.color}`} />{s.label}</span>
        ))}
        {hasSpike && <span className="flex items-center gap-1 text-amber-700"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500" />대량 유입·이상치</span>}
      </div>
      <div className={`mt-3 flex ${height} items-stretch gap-0.5 sm:gap-1`}>
        {buckets.map((b, i) => {
          const total = totals[i];
          const spikeDay = hasSpike && total >= top1;
          const ratio = spikeDay ? 1 : Math.min(1, total / scaleBase);
          const heightPct = total > 0 ? Math.max(10, ratio * 100) : 0;
          const tip = `${b.label}: ${series.map((s) => `${s.label} ${b.values[s.key] ?? 0}`).join(" · ")} (합계 ${total})`;
          return (
            <div key={b.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-[8px] font-bold leading-none text-stone-600">{total > 0 && !many ? total : ""}</span>
              <div className="flex w-full flex-1 items-end rounded bg-stone-100">
                <div className="flex w-full flex-col overflow-hidden rounded" style={{ height: `${heightPct}%` }} title={tip}>
                  {spikeDay ? (
                    <div className="w-full flex-1 bg-amber-500" />
                  ) : (
                    [...series].reverse().map((s) => (
                      <div key={s.key} className={`w-full ${s.color}`} style={{ flexGrow: b.values[s.key] ?? 0, flexBasis: 0 }} />
                    ))
                  )}
                </div>
              </div>
              <span className={`text-[8px] font-medium text-stone-500 ${many && i % 5 !== 0 ? "invisible" : ""}`}>{b.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 가로 막대 목록(분포). */
export function BarList({ items, tone = "bg-stone-900", max: maxIn, unit = "건" }: { items: { label: string; value: number; href?: string }[]; tone?: string; max?: number; unit?: string }) {
  if (items.length === 0) return <p className="text-sm text-stone-500">데이터 없음</p>;
  const max = maxIn ?? Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <ul className="space-y-1.5">
      {items.map((it) => (
        <li key={it.label}>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0 truncate font-semibold text-stone-700">{it.label}</span>
            <span className="shrink-0 tabular-nums text-stone-500">{it.value.toLocaleString("ko-KR")}{unit}{total > 0 && <span className="ml-1 text-stone-400">({Math.round((it.value / total) * 100)}%)</span>}</span>
          </div>
          <div className="mt-0.5 h-2 w-full overflow-hidden rounded-full bg-stone-100">
            <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(2, (it.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** 단순 세로 막대(한 계열). 평균선 포함. */
export function ColumnChart({ points, color = "bg-sky-500", height = "h-28", unit = "" }: { points: { label: string; value: number }[]; color?: string; height?: string; unit?: string }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const sum = points.reduce((s, p) => s + p.value, 0);
  if (sum === 0) return <p className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-center text-sm text-stone-500">데이터 없음</p>;
  const avg = sum / points.length;
  const many = points.length > 20;
  return (
    <div className={`relative flex ${height} items-end gap-0.5 sm:gap-1`}>
      <div className="pointer-events-none absolute inset-x-0 h-0 border-t border-dashed border-stone-400" style={{ bottom: `${(avg / max) * 100}%` }} title={`평균 ${avg.toFixed(1)}`} />
      {points.map((p, i) => (
        <div key={p.label + i} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5" title={`${p.label}: ${p.value}${unit}`}>
          <div className={`w-full rounded-t ${color}`} style={{ height: `${p.value > 0 ? Math.max(4, (p.value / max) * 100) : 0}%` }} />
          <span className={`text-[8px] text-stone-500 ${many && i % 5 !== 0 ? "invisible" : ""}`}>{p.label}</span>
        </div>
      ))}
    </div>
  );
}

/** 날짜 버킷 만들기: 오늘 포함 최근 n 일. KST 기준. */
export function makeDayBuckets(days: number): { key: string; label: string }[] {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const out: { key: string; label: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    const key = d.toISOString().slice(0, 10);
    out.push({ key, label: `${d.getUTCMonth() + 1}/${d.getUTCDate()}` });
  }
  return out;
}

/** timestamptz → KST 날짜 키 */
export function kstDayKey(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}
