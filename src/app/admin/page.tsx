import Link from "next/link";
import { makeDayBuckets, kstDayKey, StackedBars } from "@/components/admin/charts";
import MenuGrid from "@/components/admin/MenuGrid";
import { DailyVisits, HourlyHeatmap, type TrafficData } from "@/components/admin/TrafficCharts";
import { Bar, Card, ErrorNote, Stat } from "@/components/admin/ui";
import { ADMIN_ACTION_LABEL, PARSER_READY_SOURCES } from "@/lib/admin/labels";
import { daysAgoIso, getAdminBadges, nameMap, safeCount, safeRpc } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime, timeAgo } from "@/lib/format";
import { todayStr } from "@/lib/living";
import { createClient } from "@/lib/supabase/server";
import type { AdminLog } from "@/types/account";
import { sourceLabel } from "@/lib/traffic";

type Activity = { relogin_count: number; message_sender_count: number; two_way_conversation_count: number; active_ratio: number; new_applications: number; new_conversations: number; messages_count: number; logins: number };
type SourceStat = { source_code: string; total: number; open_count: number; hidden_count: number; last_created: string | null; last_seen: string | null; week_count: number };

function Todo({ label, value, href, accent }: { label: string; value: number | null; href: string; accent?: boolean }) {
  const hot = accent && (value ?? 0) > 0;
  return (
    <Link href={href} className={`group rounded-xl p-2.5 ring-1 transition ${hot ? "bg-amber-400/10 ring-amber-400/30 hover:bg-amber-400/20" : "bg-white/5 ring-white/10 hover:bg-white/10"}`}>
      <p className={`flex items-center gap-1 text-[11px] font-bold ${hot ? "text-amber-200" : "text-stone-300"}`}>
        {label}<span className={`transition-colors ${hot ? "text-amber-400/70 group-hover:text-amber-200" : "text-stone-500 group-hover:text-white"}`}>→</span>
      </p>
      <p className={`mt-0.5 text-2xl font-extrabold tabular-nums ${hot ? "text-amber-300" : "text-white"}`}>{value == null ? "—" : value}</p>
    </Link>
  );
}

export default async function AdminHome() {
  await requireAdmin("/admin");
  const supabase = (await createClient())!;
  const since7 = daysAgoIso(7);
  const since14 = daysAgoIso(14);
  const since28 = daysAgoIso(28);
  const today = todayStr();

  const [
    badges,
    artists, orgs, verifiedOrgs, newUsers7,
    orgOpen, crawledOpen, crawledClosed, orgOverdue,
    apps, apps7, seekingOpen, convs,
    sourcesActive, sourcesTotal,
    signupRows, artistCohort, orgCohort,
    activity, sourceStats, logs, trafficRes,
  ] = await Promise.all([
    getAdminBadges(supabase),
    safeCount(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "artist").neq("status", "deleted")),
    safeCount(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "organization").neq("status", "deleted")),
    safeCount(supabase.from("org_profiles").select("user_id", { count: "exact", head: true }).eq("is_verified", true)),
    safeCount(supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since7)),
    safeCount(supabase.from("org_postings").select("id", { count: "exact", head: true }).eq("status", "open").is("deleted_at", null)),
    safeCount(supabase.from("crawled_postings").select("id", { count: "exact", head: true }).eq("status", "open")),
    safeCount(supabase.from("crawled_postings").select("id", { count: "exact", head: true }).eq("status", "closed")),
    safeCount(supabase.from("org_postings").select("id", { count: "exact", head: true }).eq("status", "open").is("deleted_at", null).lt("apply_end", today)),
    safeCount(supabase.from("applications").select("id", { count: "exact", head: true })),
    safeCount(supabase.from("applications").select("id", { count: "exact", head: true }).gte("created_at", since7)),
    safeCount(supabase.from("seeking_posts").select("id", { count: "exact", head: true }).eq("status", "open").is("deleted_at", null).gte("expires_at", today)),
    safeCount(supabase.from("conversations").select("id", { count: "exact", head: true })),
    safeCount(supabase.from("crawl_sources").select("code", { count: "exact", head: true }).eq("is_active", true)),
    safeCount(supabase.from("crawl_sources").select("code", { count: "exact", head: true })),
    supabase.from("profiles").select("created_at, role").gte("created_at", since14).limit(5000),
    supabase.from("artist_profiles").select("user_id, profile_completed, created_at").gte("created_at", since28).limit(5000),
    supabase.from("org_profiles").select("user_id, profile_completed, created_at").gte("created_at", since28).limit(5000),
    safeRpc<Activity>(supabase, "admin_activity_7d"),
    safeRpc<SourceStat>(supabase, "admin_source_stats"),
    supabase.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(8),
    supabase.rpc("admin_traffic", { p_days: 7 }),
  ]);
  const traffic = (trafficRes.data ?? null) as TrafficData | null;
  const trafficMissing = Boolean(trafficRes.error && /does not exist|could not find|schema cache/i.test(trafficRes.error.message));
  const topSource = traffic?.sources?.[0] ?? null;
  const trafficSignups = traffic ? traffic.daily.reduce((n, d) => n + Number(d.signups), 0) : 0;

  // ── 가입 추이(14일) ──
  const buckets = makeDayBuckets(14).map((b) => ({ ...b, values: { artist: 0, org: 0 } as Record<string, number> }));
  for (const r of signupRows.data ?? []) {
    const b = buckets.find((x) => x.key === kstDayKey(r.created_at));
    if (!b) continue;
    if (r.role === "artist") b.values.artist += 1;
    else b.values.org += 1;
  }
  const signup14 = buckets.reduce((s, b) => s + b.values.artist + b.values.org, 0);

  // ── 회원 구성 ──
  const a = artists ?? 0;
  const o = orgs ?? 0;
  const roleTotal = a + o;
  const aPct = roleTotal ? Math.round((a / roleTotal) * 100) : 0;
  const oPct = roleTotal ? 100 - aPct : 0;

  // ── 프로필 완성률(최근 28일 가입 코호트) ──
  const cohort = [...(artistCohort.data ?? []), ...(orgCohort.data ?? [])];
  const cohortDone = cohort.filter((c) => c.profile_completed).length;
  const cohortPct = cohort.length ? Math.round((cohortDone / cohort.length) * 100) : 0;

  // ── 수집 현황 ──
  const stats = sourceStats.data;
  const week = stats.reduce((s, r) => s + Number(r.week_count ?? 0), 0);
  const lastSeen = stats.map((r) => r.last_seen).filter(Boolean).sort().at(-1) ?? null;
  const topSources = [...stats].sort((x, y) => Number(y.week_count) - Number(x.week_count)).slice(0, 6);
  const act = activity.data[0] ?? null;

  // ── 최근 로그 이름표 ──
  const logRows = (logs.data ?? []) as AdminLog[];
  const names = await nameMap(supabase, logRows.flatMap((r) => [r.admin_user_id, r.target_type === "user" || r.target_type === "org" ? r.target_id : null]));

  return (
    <div className="space-y-6">
      {/* ① 오늘 처리할 일 */}
      <section className="rounded-2xl bg-stone-900 p-3 text-white sm:p-4">
        <h2 className="text-sm font-extrabold">오늘 처리할 일</h2>
        <p className="mt-0.5 text-[11px] text-stone-400">지금 검토·응답이 필요한 건입니다. 숫자를 누르면 그 화면으로 갑니다.</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          <Todo label="인증 대기 기관" value={badges.pendingOrgs} href="/admin/orgs" accent />
          <Todo label="미처리 신고" value={badges.openReports} href="/admin/reports" accent />
          <Todo label="새 문의" value={badges.newContacts} href="/admin/support?show=new" accent />
          <Todo label="새 의견" value={badges.newFeedback} href="/admin/feedback?show=new" accent />
          <Todo label="마감일 지난 모집중 공고" value={orgOverdue} href="/admin/postings?show=overdue" />
          <Todo label="정지된 계정" value={badges.suspended} href="/admin/users?status=suspended" />
          <Todo label="최근 7일 지원" value={apps7} href="/admin/applications?days=7" />
        </div>
      </section>

      {/* ② 핵심 지표 */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-stone-700">핵심 지표</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="회원 가입 추이" sub={`최근 14일 · 합계 ${signup14}명`} className="lg:col-span-2" action={<Link href="/admin/stats" className="text-xs font-semibold text-stone-500 hover:text-stone-900">통계 →</Link>}>
            <StackedBars buckets={buckets} series={[{ key: "artist", label: "예술가", color: "bg-stone-900" }, { key: "org", label: "기관", color: "bg-sky-500" }]} />
          </Card>
          <Card title="회원 구성" sub={`합계 ${roleTotal.toLocaleString("ko-KR")}명 · 최근 7일 가입 ${newUsers7 ?? 0}명`}>
            {roleTotal === 0 ? (
              <p className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-center text-sm text-stone-500">데이터 없음</p>
            ) : (
              <div className="space-y-3">
                <Link href="/admin/users?role=artist" className="group block">
                  <div className="flex items-center justify-between text-sm font-bold text-stone-800"><span>예술가 <span className="text-stone-400 group-hover:text-stone-700">→</span></span><span>{a}명 ({aPct}%)</span></div>
                  <div className="mt-1"><Bar percent={aPct} height="h-3" /></div>
                </Link>
                <Link href="/admin/users?role=organization" className="group block">
                  <div className="flex items-center justify-between text-sm font-bold text-stone-800"><span>기관 <span className="text-stone-400 group-hover:text-stone-700">→</span></span><span>{o}명 ({oPct}%)</span></div>
                  <div className="mt-1"><Bar percent={oPct} height="h-3" tone="bg-sky-500" /></div>
                </Link>
              </div>
            )}
            <Link href="/admin/orgs?show=all" className="group mt-4 flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-3 transition hover:border-stone-400 hover:bg-white">
              <span className="text-sm font-bold text-stone-700">인증 기관 <span className="text-stone-400 group-hover:text-stone-700">→</span></span>
              <span className="text-xl font-extrabold">{verifiedOrgs ?? 0}<span className="text-sm font-semibold text-stone-400"> / {o}</span></span>
            </Link>
            <Link href="/admin/users?completed=0" className="group mt-3 block rounded-xl border border-stone-200 bg-stone-50 p-3 transition hover:border-stone-400 hover:bg-white">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-stone-700">프로필 완성 <span className="text-stone-400 group-hover:text-stone-700">→</span></span>
                <span className="text-xl font-extrabold">{cohortPct}%</span>
              </div>
              <p className="mt-1 text-xs text-stone-500">최근 28일 가입 {cohort.length}명 중 프로필 완성 {cohortDone}명</p>
            </Link>
          </Card>
        </div>
      </section>

      {/* ③ 공고 · 지원 · 소통 */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-stone-700">공고 · 지원 · 소통</h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat title="기관 공고(모집중)" value={orgOpen} href="/admin/postings" />
          <Stat title="수집 공고(모집중)" value={crawledOpen} href="/admin/crawled" note={crawledClosed != null ? `마감 아카이브 ${crawledClosed.toLocaleString("ko-KR")}` : undefined} />
          <Stat title="지원 전체" value={apps} href="/admin/applications" note={`최근 7일 ${apps7 ?? 0}`} />
          <Stat title="구직 글(공개 중)" value={seekingOpen} href="/admin/seeking" />
          <Stat title="대화방" value={convs} href="/admin/messages" note={convs == null ? "0010 마이그레이션 필요" : "본문은 읽지 않습니다"} />
          <Stat title="가동 크롤 소스" value={sourcesActive == null ? null : `${sourcesActive} / ${sourcesTotal ?? 0}`} href="/admin/sources" note={`파서 완성 ${PARSER_READY_SOURCES.length}곳`} />
        </div>
      </section>

      {/* ④ 최근 7일 활동 + 수집 현황 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="최근 7일 활동" sub="얼마나 살아 있나" action={<Link href="/admin/stats" className="text-xs font-semibold text-stone-500 hover:text-stone-900">통계 전체 →</Link>}>
          {activity.error ? (
            <ErrorNote message={activity.error} missing={activity.missing} />
          ) : act ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "로그인", value: act.logins, note: "7일 안에 로그인" },
                { label: "재로그인", value: act.relogin_count, note: "기존 회원이 다시 옴" },
                { label: "메시지 보낸 사람", value: act.message_sender_count, note: `메시지 ${act.messages_count}건` },
                { label: "양방향 대화", value: act.two_way_conversation_count, note: `새 대화방 ${act.new_conversations}` },
              ].map((it) => (
                <div key={it.label} className="rounded-xl bg-stone-50 p-3">
                  <p className="text-[11px] font-semibold text-stone-500">{it.label}</p>
                  <p className="text-xl font-extrabold tabular-nums">{Number(it.value).toLocaleString("ko-KR")}</p>
                  <p className="text-[11px] text-stone-400">{it.note}</p>
                </div>
              ))}
              <div className="col-span-2 rounded-xl bg-stone-50 p-3 sm:col-span-4">
                <div className="flex items-center justify-between text-xs"><span className="font-semibold text-stone-600">활성 비율(전체 활성 회원 중 7일 내 로그인)</span><span className="font-extrabold">{Number(act.active_ratio)}%</span></div>
                <div className="mt-1"><Bar percent={Number(act.active_ratio)} tone="bg-emerald-600" /></div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-stone-500">데이터 없음</p>
          )}
        </Card>

        <Card title="수집 현황" sub={lastSeen ? `마지막 수집 확인 ${timeAgo(lastSeen)} · 최근 7일 신규 ${week.toLocaleString("ko-KR")}건` : "최근 7일 신규 수집 건수"} action={<Link href="/admin/sources" className="text-xs font-semibold text-stone-500 hover:text-stone-900">크롤 소스 →</Link>}>
          {sourceStats.error ? (
            <ErrorNote message={sourceStats.error} missing={sourceStats.missing} />
          ) : topSources.length === 0 ? (
            <p className="text-sm text-stone-500">아직 수집된 공고가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-stone-100 text-sm">
              {topSources.map((s) => (
                <li key={s.source_code} className="flex items-center justify-between gap-2 py-1.5">
                  <Link href={`/admin/crawled?source=${s.source_code}`} className="min-w-0 truncate font-semibold hover:underline">{s.source_code}</Link>
                  <span className="shrink-0 text-xs text-stone-500">7일 <b className="text-stone-900">{Number(s.week_count)}</b> · 모집중 {Number(s.open_count)} · 누적 {Number(s.total)} · {s.last_seen ? timeAgo(s.last_seen) : "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ④-2 방문 현황(최근 7일) */}
      <Card
        title="방문 현황"
        sub={traffic ? `최근 7일 방문 ${Number(traffic.total_visits).toLocaleString("ko-KR")}회 · 사람 수(추정) ${Number(traffic.unique_visitors)} · 가입 ${trafficSignups} · 상위 유입 ${topSource ? `${sourceLabel(topSource.key)} ${Number(topSource.cnt)}` : "—"} · 봇 제외·한국시간` : "최근 7일"}
        action={<Link href="/admin/traffic" className="text-xs font-semibold text-stone-500 hover:text-stone-900">유입·방문 자세히 →</Link>}
      >
        {trafficRes.error ? (
          <ErrorNote message={trafficRes.error.message} missing={trafficMissing} />
        ) : traffic && Number(traffic.total_visits) > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div><p className="mb-1 text-xs font-bold text-stone-600">날짜 × 시간대</p><HourlyHeatmap data={traffic} maxDays={7} /></div>
            <div><p className="mb-1 text-xs font-bold text-stone-600">일별 방문</p><DailyVisits data={traffic} /></div>
          </div>
        ) : (
          <p className="text-sm text-stone-500">아직 방문 기록이 없습니다. 배포 뒤 첫 방문부터 쌓입니다(0011 마이그레이션 필요).</p>
        )}
      </Card>

      {/* ⑤ 관리 메뉴 */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-stone-700">관리 메뉴</h2>
        <MenuGrid badges={badges} />
      </section>

      {/* ⑥ 최근 운영 기록 */}
      <Card title="최근 운영 기록" action={<Link href="/admin/logs" className="text-xs font-semibold text-stone-500 hover:text-stone-900">전체 보기 →</Link>}>
        {logRows.length === 0 ? (
          <p className="text-sm text-stone-500">아직 기록이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {logRows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 py-1.5">
                <span className="w-28 shrink-0 text-xs text-stone-400">{fmtDateTime(r.created_at)}</span>
                <span className="font-semibold">{names.get(r.admin_user_id)?.display_name ?? "운영자"}</span>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold">{ADMIN_ACTION_LABEL[r.action] ?? r.action}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-stone-600">{names.get(r.target_id ?? "")?.display_name ?? r.target_id ?? ""}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-xs text-stone-500">
        메시지 본문은 운영자도 읽지 않습니다. 신고는 신고자가 적은 내용으로 판단하고, 필요하면 계정을 정지합니다. 정지된 계정은 로그인은 되지만 메시지·지원·공고 등록이 막힙니다.
      </p>
    </div>
  );
}
