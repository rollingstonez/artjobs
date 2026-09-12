// 방문·유입 차트 — 서버 컴포넌트. admin_traffic() JSON 을 받아 그린다(바로쌤 TrafficChartsCard·HourlyHeatmap·NewReturningStrip 이식).
import { ColumnChart } from "@/components/admin/charts";

export interface TrafficData {
  days: number;
  since: string;
  total_visits: number;
  unique_visitors: number;
  new_visits: number;
  returning_visits: number;
  unknown_visits: number;
  first_visit_at: string | null;
  daily: { day: string; visits: number; new_visits: number; returning_visits: number; signups: number }[];
  hourly: { day: string; hour: number; visits: number }[];
  hours: number[];
  sources: { key: string; cnt: number }[];
  devices: { key: string; cnt: number }[];
  browsers: { key: string; cnt: number }[];
  os: { key: string; cnt: number }[];
  landing: { key: string; cnt: number }[];
  referrers: { key: string; cnt: number }[];
  signup_period: { key: string; cnt: number }[];
  signup_all: { key: string; cnt: number }[];
  signup_device: { source: string; device: string; cnt: number }[];
  channels: { code: string; name: string; member_count: number | null; utm_source: string; utm_medium: string; utm_campaign: string; is_active: boolean; note: string | null; created_at: string; period_clicks: number; total_clicks: number; period_visits: number; signups: number }[];
  ads: { key: string; visits: number; signups: number }[];
}

export const dayLabel = (key: string) => `${Number(key.slice(5, 7))}/${Number(key.slice(8, 10))}`;

/** 날짜 × 시간 히트맵. 최근 날짜가 위. */
export function HourlyHeatmap({ data, maxDays = 14 }: { data: TrafficData; maxDays?: number }) {
  const days = [...data.daily].slice(-maxDays).reverse();
  const grid = new Map<string, number[]>();
  for (const d of days) grid.set(d.day, new Array<number>(24).fill(0));
  for (const h of data.hourly) {
    const row = grid.get(h.day);
    if (row) row[h.hour] = Number(h.visits);
  }
  const max = Math.max(1, ...[...grid.values()].flat());
  const cell = (n: number) => (n <= 0 ? { backgroundColor: "#f5f5f4" } : { backgroundColor: `rgba(14, 165, 233, ${(0.18 + (n / max) * 0.82).toFixed(3)})` });
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="flex items-center gap-1 pb-1">
          <div className="w-10 shrink-0" />
          <div className="grid flex-1 grid-cols-[repeat(24,minmax(0,1fr))] gap-0.5">
            {Array.from({ length: 24 }, (_, h) => <div key={h} className="text-center text-[8px] font-medium text-stone-400">{h % 3 === 0 ? h : ""}</div>)}
          </div>
          <div className="w-8 shrink-0 text-right text-[8px] font-medium text-stone-400">합계</div>
        </div>
        <div className="flex flex-col gap-0.5">
          {days.map((d) => (
            <div key={d.day} className="flex items-center gap-1">
              <div className="w-10 shrink-0 text-right text-[10px] font-semibold text-stone-600">{dayLabel(d.day)}</div>
              <div className="grid flex-1 grid-cols-[repeat(24,minmax(0,1fr))] gap-0.5">
                {(grid.get(d.day) ?? []).map((n, h) => <div key={h} className="h-4 rounded-[2px]" style={cell(n)} title={`${dayLabel(d.day)} ${h}시: ${n}명`} />)}
              </div>
              <div className="w-8 shrink-0 text-right text-[10px] font-bold text-stone-700">{Number(d.visits) > 0 ? Number(d.visits) : ""}</div>
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex items-center justify-end gap-1 text-[9px] text-stone-400">
          적음 {[0.18, 0.4, 0.6, 0.8, 1].map((a) => <span key={a} className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: `rgba(14,165,233,${a})` }} />)} 많음
        </div>
      </div>
    </div>
  );
}

/** 일별 방문 세로 막대(오늘은 옅게) */
export function DailyVisits({ data }: { data: TrafficData }) {
  const points = data.daily.map((d) => ({ label: dayLabel(d.day), value: Number(d.visits) }));
  return (
    <div>
      <ColumnChart points={points} color="bg-sky-500" height="h-28" unit="명" />
      <p className="mt-1 text-[10px] text-stone-400">* 마지막 칸은 오늘이라 하루가 끝나지 않아 낮게 보입니다. 점선은 평균.</p>
    </div>
  );
}

/** 신규 / 재방문 한 줄 */
export function NewReturningStrip({ data }: { data: TrafficData }) {
  const known = Number(data.new_visits) + Number(data.returning_visits);
  if (known === 0) {
    return <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-3 py-2 text-[11px] text-stone-500">신규/재방문 구분은 브라우저 표식이 남는 방문부터 쌓입니다. 아직 구분된 방문이 없습니다.</p>;
  }
  const newPct = Math.round((Number(data.new_visits) / known) * 100);
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-extrabold">신규 / 재방문</p>
        <p className="text-[11px] text-stone-500">사람 수(추정) {Number(data.unique_visitors).toLocaleString("ko-KR")}명</p>
      </div>
      <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
        <div className="bg-sky-500" style={{ width: `${newPct}%` }} />
        <div className="bg-emerald-500" style={{ width: `${100 - newPct}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold">
        <span className="inline-flex items-center gap-1 text-sky-700"><span className="h-2 w-2 rounded-full bg-sky-500" />신규 {Number(data.new_visits).toLocaleString("ko-KR")}회 ({newPct}%)</span>
        <span className="inline-flex items-center gap-1 text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />재방문 {Number(data.returning_visits).toLocaleString("ko-KR")}회 ({100 - newPct}%)</span>
        {Number(data.unknown_visits) > 0 && <span className="text-stone-400">구분불가 {Number(data.unknown_visits)}회</span>}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-stone-500">재방문 비중이 올라가면 한 번 와본 사람이 다시 온다는 뜻입니다. 신규만 많고 재방문이 안 늘면 유입을 늘려도 새는 독입니다. 시크릿 모드·기록 삭제·다른 기기는 새 사람으로 잡히니 절대 수치가 아니라 추이로 보세요.</p>
    </div>
  );
}
