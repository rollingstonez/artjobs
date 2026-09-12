import Link from "next/link";
import { BarList } from "@/components/admin/charts";
import { DailyVisits, HourlyHeatmap, NewReturningStrip, dayLabel, type TrafficData } from "@/components/admin/TrafficCharts";
import { Badge, Card, Chip, ChipRow, Empty, ErrorNote, Flash, PageHeader, Stat, Table, Td, Th, btn } from "@/components/admin/ui";
import { sp } from "@/lib/admin/queries";
import { deleteChannel, saveChannel, setChannelActive } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime, timeAgo } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { BROWSER_LABEL, DEVICE_LABEL, sourceLabel } from "@/lib/traffic";

type MonthRow = { day: string; visits: number; new_visits: number; signups: number; signup_artist: number; signup_org: number };

function pct(n: number, d: number): string {
  return d > 0 ? `${Math.round((n / d) * 1000) / 10}%` : "—";
}

/** 이번 달 "YYYY-MM"(한국시간). 렌더 밖 헬퍼. */
function currentMonthKst(): string {
  const k = new Date(Date.now() + 9 * 3600 * 1000);
  return `${k.getUTCFullYear()}-${String(k.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function AdminTrafficPage({ searchParams }: PageProps<"/admin/traffic">) {
  await requireAdmin("/admin/traffic");
  const s = await searchParams;
  const days = ["7", "30", "90"].includes(sp(s.days)) ? parseInt(sp(s.days), 10) : 7;
  const monthParam = /^\d{4}-\d{2}$/.test(sp(s.month)) ? sp(s.month) : "";
  const supabase = (await createClient())!;
  const { data, error } = await supabase.rpc("admin_traffic", { p_days: days });
  const t = (data ?? null) as TrafficData | null;
  const missing = Boolean(error && /does not exist|could not find|schema cache/i.test(error.message));

  // 월별 표(지난 달 기록)
  const thisMonth = currentMonthKst();
  const month = monthParam || thisMonth;
  const [y, m] = month.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 2, 1));
  const next = new Date(Date.UTC(y, m, 1));
  const fmtM = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const monthRes = monthParam ? await supabase.rpc("admin_visit_month", { p_year: y, p_month: m }) : null;
  const monthRows = ((monthRes?.data ?? []) as MonthRow[]).map((r) => ({ ...r, visits: Number(r.visits), new_visits: Number(r.new_visits), signups: Number(r.signups), signup_artist: Number(r.signup_artist), signup_org: Number(r.signup_org) }));

  const totalSignups = t ? t.daily.reduce((n, d) => n + Number(d.signups), 0) : 0;
  const busiestHour = t ? t.hours.map((n, h) => ({ h, n: Number(n) })).sort((a, b) => b.n - a.n)[0] : null;
  const busiestDay = t ? [...t.daily].sort((a, b) => Number(b.visits) - Number(a.visits))[0] : null;
  const toList = (rows: { key: string; cnt: number }[] | undefined, fmt: (k: string) => string) => (rows ?? []).map((r) => ({ label: fmt(r.key), value: Number(r.cnt) }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="유입 · 방문"
        description={<>어디서 얼마나 들어오고, 그중 몇 명이 가입하는지 봅니다. 봇 제외 · 한국시간 기준 · 브라우저 세션당 1회로 셉니다. IP 는 저장하지 않습니다. 운영자의 /admin 방문은 세지 않습니다.{t?.first_visit_at && <> 기록 시작: {fmtDateTime(t.first_visit_at)}.</>}</>}
        actions={<ChipRow>{[7, 30, 90].map((d) => <Chip key={d} href={`/admin/traffic?days=${d}`} active={days === d && !monthParam}>{d}일</Chip>)}<Chip href={`/admin/traffic?days=${days}&month=${thisMonth}`} active={Boolean(monthParam)}>월별 표</Chip></ChipRow>}
      />
      <Flash ok={sp(s.ok) || null} err={sp(s.err) || null} />
      {error && <ErrorNote message={error.message} missing={missing} />}

      {monthParam ? (
        <Card title={`${y}년 ${m}월 일별 기록`} action={<div className="flex gap-1 text-xs"><Link href={`/admin/traffic?days=${days}&month=${fmtM(prev)}`} className={btn.secondary}>← 이전 달</Link>{month < thisMonth && <Link href={`/admin/traffic?days=${days}&month=${fmtM(next)}`} className={btn.secondary}>다음 달 →</Link>}</div>}>
          {monthRes?.error ? <ErrorNote message={monthRes.error.message} missing /> : monthRows.length === 0 ? <p className="text-sm text-stone-500">기록 없음</p> : (
            <>
              <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat title="방문 합계" value={monthRows.reduce((n, r) => n + r.visits, 0)} note={`하루 평균 ${Math.round(monthRows.reduce((n, r) => n + r.visits, 0) / monthRows.length)}`} />
                <Stat title="가입 합계" value={monthRows.reduce((n, r) => n + r.signups, 0)} note={`예술가 ${monthRows.reduce((n, r) => n + r.signup_artist, 0)} · 기관 ${monthRows.reduce((n, r) => n + r.signup_org, 0)}`} />
                <Stat title="가입 전환율" value={pct(monthRows.reduce((n, r) => n + r.signups, 0), monthRows.reduce((n, r) => n + r.visits, 0))} note="가입 ÷ 방문" />
                <Stat title="가장 많이 온 날" value={(() => { const b = [...monthRows].sort((a, c) => c.visits - a.visits)[0]; return b && b.visits > 0 ? `${dayLabel(String(b.day))} (${b.visits})` : "—"; })()} />
              </div>
              <Table minWidth="min-w-[520px]">
                <thead className="bg-stone-50"><tr><Th>날짜</Th><Th>방문</Th><Th>신규</Th><Th>가입</Th><Th>예술가</Th><Th>기관</Th><Th className="hidden sm:table-cell">비교</Th></tr></thead>
                <tbody className="divide-y divide-stone-100">
                  {(() => { const max = Math.max(1, ...monthRows.map((r) => r.visits)); return monthRows.map((r) => {
                    const d = new Date(`${String(r.day).slice(0, 10)}T00:00:00Z`);
                    const dow = d.getUTCDay();
                    return (
                      <tr key={String(r.day)} className={r.signups > 0 ? "bg-sky-50/40" : ""}>
                        <Td className={`text-xs ${dow === 0 ? "text-red-600" : dow === 6 ? "text-sky-600" : ""}`}>{String(r.day).slice(5)} ({"일월화수목금토"[dow]})</Td>
                        <Td className="tabular-nums">{r.visits}</Td><Td className="tabular-nums text-stone-500">{r.new_visits}</Td>
                        <Td className="tabular-nums font-semibold">{r.signups || ""}</Td><Td className="tabular-nums text-stone-500">{r.signup_artist || ""}</Td><Td className="tabular-nums text-stone-500">{r.signup_org || ""}</Td>
                        <Td className="hidden sm:table-cell"><div className="h-2 rounded bg-sky-500" style={{ width: `${(r.visits / max) * 100}%` }} /></Td>
                      </tr>
                    );
                  }); })()}
                </tbody>
              </Table>
            </>
          )}
        </Card>
      ) : t ? (
        <>
          {/* 요약 */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Stat title={`방문 (${days}일)`} value={Number(t.total_visits)} note="브라우저 세션 기준" />
            <Stat title="사람 수(추정)" value={Number(t.unique_visitors)} note="브라우저 표식 기준" />
            <Stat title="가입" value={totalSignups} href={`/admin/users?days=${Math.min(days, 30)}`} />
            <Stat title="가입 전환율" value={pct(totalSignups, Number(t.total_visits))} note="가입 ÷ 방문" />
            <Stat title="가장 붐빈 시간" value={busiestHour && busiestHour.n > 0 ? `${busiestHour.h}시` : "—"} note={busiestHour && busiestHour.n > 0 ? `${busiestHour.n}명` : undefined} />
            <Stat title="가장 붐빈 날" value={busiestDay && Number(busiestDay.visits) > 0 ? dayLabel(String(busiestDay.day)) : "—"} note={busiestDay && Number(busiestDay.visits) > 0 ? `${Number(busiestDay.visits)}명` : undefined} />
          </div>

          {Number(t.total_visits) === 0 && (
            <Empty icon="📈">아직 방문 기록이 없습니다. 배포 후 첫 방문부터 쌓입니다. 0011 마이그레이션을 실행했는지, Vercel 에 최신 코드가 배포됐는지 확인하세요.</Empty>
          )}

          {/* 언제 들어오나 */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="일별 방문 추이" sub={`최근 ${days}일`}>
              <DailyVisits data={t} />
              <div className="mt-3"><NewReturningStrip data={t} /></div>
            </Card>
            <Card title="날짜 × 시간대" sub={`최근 ${Math.min(days, 14)}일 · 어느 날 몇 시에 들어왔나`}>
              <HourlyHeatmap data={t} />
              <p className="mt-2 text-xs font-bold text-stone-600">시간대 합계</p>
              <div className="mt-1 flex h-16 items-end gap-0.5">
                {t.hours.map((n, h) => { const max = Math.max(1, ...t.hours.map(Number)); return <div key={h} className="flex-1 rounded-t bg-sky-500" style={{ height: `${(Number(n) / max) * 100}%` }} title={`${h}시: ${Number(n)}명`} />; })}
              </div>
              <div className="flex justify-between text-[9px] text-stone-400"><span>0시</span><span>6시</span><span>12시</span><span>18시</span><span>23시</span></div>
            </Card>
          </div>

          {/* 어디서 오나 */}
          <h2 className="text-sm font-bold text-stone-700">어디서 오나</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card title="유입 경로" sub="utm_source → 이전 페이지 도메인 → 직접"><BarList items={toList(t.sources, sourceLabel)} unit="회" /></Card>
            <Card title="기기"><BarList items={toList(t.devices, (k) => DEVICE_LABEL[k] ?? k)} tone="bg-emerald-600" unit="회" /></Card>
            <Card title="브라우저" sub="인앱 = 카톡·인스타 링크로 들어옴"><BarList items={toList(t.browsers, (k) => BROWSER_LABEL[k] ?? k)} tone="bg-amber-500" unit="회" /></Card>
            <Card title="처음 연 페이지"><BarList items={toList(t.landing, (k) => k)} tone="bg-stone-500" unit="회" /></Card>
          </div>
          {t.referrers.length > 0 && (
            <Card title="이전 페이지 도메인 상위" sub="어느 사이트의 링크를 눌러 들어왔나 (이전 페이지 정보가 있는 방문만)"><BarList items={toList(t.referrers, (k) => k)} tone="bg-violet-500" unit="회" /></Card>
          )}

          {/* 가입 귀속 */}
          <h2 className="text-sm font-bold text-stone-700">가입은 어디서 오나 (첫 유입 기준)</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title={`최근 ${days}일 가입 · 유입원별`} sub="가입한 사람이 처음 아트잡스에 온 경로">
              {t.signup_period.length === 0 ? <p className="text-sm text-stone-500">기간 내 가입 없음</p> : <BarList items={toList(t.signup_period, sourceLabel)} tone="bg-indigo-500" unit="명" />}
            </Card>
            <Card title="전체 가입 · 유입원별" sub="unknown = 귀속 기능 이전 가입 또는 쿠키 없음">
              <BarList items={toList(t.signup_all, sourceLabel)} tone="bg-indigo-400" unit="명" />
            </Card>
          </div>
          {t.ads.some((a) => Number(a.visits) > 0 || Number(a.signups) > 0) && (
            <Card title="광고 성과" sub="utm_medium=cpc 등 유료 광고로 표시된 유입만">
              <Table minWidth="min-w-[420px]">
                <thead className="bg-stone-50"><tr><Th>광고</Th><Th>유입</Th><Th>가입</Th><Th>전환율</Th></tr></thead>
                <tbody className="divide-y divide-stone-100">
                  {t.ads.map((a) => <tr key={a.key}><Td>{sourceLabel(a.key)}</Td><Td>{Number(a.visits)}</Td><Td>{Number(a.signups)}</Td><Td>{pct(Number(a.signups), Number(a.visits))}</Td></tr>)}
                </tbody>
              </Table>
              <p className="mt-2 text-[11px] text-stone-400">광고 링크에 <code>?utm_source=naver&utm_medium=cpc&utm_campaign=이름</code> 을 붙여야 여기에 잡힙니다.</p>
            </Card>
          )}

          {/* 채널 링크 */}
          <h2 className="text-sm font-bold text-stone-700">채널 단축링크</h2>
          <Card title="카톡방·밴드·카페별 링크" sub={<>방마다 다른 링크를 나눠 주면 어느 방에서 사람이 오고 가입하는지 알 수 있습니다. 링크는 <code>{SITE_URL}/r/코드</code> 꼴이고, 누르면 홈으로 갑니다.</>}>
            {t.channels.length === 0 ? <p className="mb-3 text-sm text-stone-500">아직 만든 링크가 없습니다.</p> : (
              <Table minWidth="min-w-[760px]">
                <thead className="bg-stone-50"><tr><Th>채널</Th><Th>링크</Th><Th>인원</Th><Th>클릭({days}일)</Th><Th>누적 클릭</Th><Th>방문({days}일)</Th><Th>가입(누적)</Th><Th></Th></tr></thead>
                <tbody className="divide-y divide-stone-100">
                  {t.channels.map((c) => (
                    <tr key={c.code} className={c.is_active ? "" : "opacity-50"}>
                      <Td><span className="font-semibold">{c.name}</span>{!c.is_active && <Badge className="ml-1">중지</Badge>}<span className="block text-[11px] text-stone-400">{sourceLabel(c.utm_source)} · {c.utm_medium} · {c.utm_campaign}{c.note ? ` · ${c.note}` : ""} · {timeAgo(c.created_at)}</span></Td>
                      <Td><code className="text-xs">{SITE_URL}/r/{c.code}</code></Td>
                      <Td className="tabular-nums text-xs">{c.member_count ?? "—"}</Td>
                      <Td className="tabular-nums">{Number(c.period_clicks)}</Td>
                      <Td className="tabular-nums text-stone-500">{Number(c.total_clicks)}</Td>
                      <Td className="tabular-nums">{Number(c.period_visits)}</Td>
                      <Td className="tabular-nums font-semibold">{Number(c.signups)}</Td>
                      <Td>
                        <div className="flex justify-end gap-1">
                          <form action={setChannelActive.bind(null, c.code, !c.is_active)}><button className={btn.secondary}>{c.is_active ? "중지" : "다시 켜기"}</button></form>
                          <form action={deleteChannel.bind(null, c.code)}><button className={btn.danger}>삭제</button></form>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            <details className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
              <summary className="cursor-pointer text-xs font-bold text-stone-700">＋ 링크 만들기 / 수정 (같은 코드를 적으면 수정)</summary>
              <form action={saveChannel} className="mt-2 grid gap-2 sm:grid-cols-3">
                <input name="code" required pattern="[a-z0-9]{2,12}" placeholder="코드 (영문 소문자·숫자 2~12자, 예: gugak1)" className="h-9 rounded-lg border border-stone-300 bg-white px-2 text-xs" />
                <input name="name" required maxLength={80} placeholder="채널 이름 (예: 국악과 동문 카톡방)" className="h-9 rounded-lg border border-stone-300 bg-white px-2 text-xs" />
                <input name="member_count" type="number" min={0} placeholder="인원(선택)" className="h-9 rounded-lg border border-stone-300 bg-white px-2 text-xs" />
                <select name="utm_source" defaultValue="kakao" className="h-9 rounded-lg border border-stone-300 bg-white px-2 text-xs">
                  {["kakao", "band", "cafe", "instagram", "facebook", "youtube", "naver", "x", "other"].map((k) => <option key={k} value={k}>{sourceLabel(k)}</option>)}
                </select>
                <input name="utm_medium" defaultValue="community" maxLength={40} placeholder="매체 (community / dm / post)" className="h-9 rounded-lg border border-stone-300 bg-white px-2 text-xs" />
                <input name="utm_campaign" defaultValue="room" maxLength={60} placeholder="캠페인 (room / launch)" className="h-9 rounded-lg border border-stone-300 bg-white px-2 text-xs" />
                <input name="note" maxLength={200} placeholder="메모(선택)" className="h-9 rounded-lg border border-stone-300 bg-white px-2 text-xs sm:col-span-2" />
                <div><button className={btn.primary}>저장</button></div>
              </form>
            </details>
          </Card>

          {/* 기기 × 가입 */}
          {t.signup_device.length > 0 && (
            <Card title="가입 시 기기 (유입원별)">
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(t.signup_device.reduce<Record<string, Record<string, number>>>((acc, r) => { (acc[r.source] ??= {})[r.device] = Number(r.cnt); return acc; }, {})).map(([src, dev]) => (
                  <span key={src} className="rounded-lg bg-stone-50 px-2 py-1"><b>{sourceLabel(src)}</b> · {Object.entries(dev).map(([d, n]) => `${DEVICE_LABEL[d] ?? d} ${n}`).join(" · ")}</span>
                ))}
              </div>
            </Card>
          )}
          <p className="text-[11px] text-stone-400">
            읽는 법: 방문은 ‘브라우저 세션당 1회’라 같은 사람이 아침·저녁에 오면 2회입니다. 사람 수는 브라우저 표식으로 추정하므로 폰과 PC 로 오면 2명으로 잡힙니다. 정확한 숫자보다 추이와 비율(유입원 구성, 가입 전환율)을 보세요.
          </p>
        </>
      ) : null}
    </div>
  );
}
