import Link from "next/link";
import { BarList, ColumnChart, StackedBars, type DayBucket } from "@/components/admin/charts";
import { Bar, Card, Chip, ChipRow, ErrorNote, PageHeader, Stat } from "@/components/admin/ui";
import { daysAgoIso, safeCount, safeRpc, sp } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { APPLICATION_STATUS, orgTypeLabel } from "@/types/account";
import { boardLabel, employmentLabel, fieldLabel } from "@/types/job";

type Daily = { day: string; signup_artist: number; signup_org: number; applications: number; org_postings: number; crawled_postings: number; conversations: number; messages: number; seeking_posts: number; contacts: number };
type Dist = { key: string; cnt: number };
type Activity = { relogin_count: number; message_sender_count: number; two_way_conversation_count: number; active_ratio: number; new_applications: number; new_conversations: number; messages_count: number; logins: number };

const label = (key: string) => `${Number(key.slice(5, 7))}/${Number(key.slice(8, 10))}`;

export default async function AdminStatsPage({ searchParams }: PageProps<"/admin/stats">) {
  await requireAdmin("/admin/stats");
  const s = await searchParams;
  const days = ["7", "30", "90"].includes(sp(s.days)) ? parseInt(sp(s.days), 10) : 30;
  const supabase = (await createClient())!;

  const [traffic, daily, activity, artists, orgs, verified, publicArtists, newUsers, apps, openTotal, ...dists] = await Promise.all([
    supabase.rpc("admin_traffic", { p_days: days }),
    safeRpc<Daily>(supabase, "admin_daily_counts", { p_days: days }),
    safeRpc<Activity>(supabase, "admin_activity_7d"),
    safeCount(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "artist").neq("status", "deleted")),
    safeCount(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "organization").neq("status", "deleted")),
    safeCount(supabase.from("org_profiles").select("user_id", { count: "exact", head: true }).eq("is_verified", true)),
    safeCount(supabase.from("artist_profiles").select("user_id", { count: "exact", head: true }).eq("is_public", true).eq("profile_completed", true)),
    safeCount(supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", daysAgoIso(days))),
    safeCount(supabase.from("applications").select("id", { count: "exact", head: true }).gte("created_at", daysAgoIso(days))),
    safeCount(supabase.from("crawled_postings").select("id", { count: "exact", head: true }).eq("status", "open")),
    ...["posting_field", "posting_region", "posting_board", "posting_employment", "artist_field", "artist_region", "org_type", "org_region", "application_status"].map((k) => safeRpc<Dist>(supabase, "admin_distribution", { p_kind: k })),
  ]);
  const [pField, pRegion, pBoard, pEmp, aField, aRegion, oType, oRegion, appStatus] = dists;
  const visits = traffic.error ? null : Number((traffic.data as { total_visits?: number } | null)?.total_visits ?? 0);
  const rows = daily.data.map((d) => ({ ...d, key: String(d.day).slice(0, 10) }));
  const signupBuckets: DayBucket[] = rows.map((d) => ({ key: d.key, label: label(d.key), values: { artist: Number(d.signup_artist), org: Number(d.signup_org) } }));
  const postingBuckets: DayBucket[] = rows.map((d) => ({ key: d.key, label: label(d.key), values: { crawled: Number(d.crawled_postings), org: Number(d.org_postings) } }));
  const sum = (k: keyof Daily) => rows.reduce((n, d) => n + Number(d[k] ?? 0), 0);
  const act = activity.data[0] ?? null;
  const a = artists ?? 0;
  const o = orgs ?? 0;
  const roleTotal = a + o;
  const toList = (r: Dist[], fmt: (k: string) => string | null) => r.map((x) => ({ label: fmt(x.key) ?? x.key, value: Number(x.cnt) }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="통계"
        description="가입·공고·지원·대화 흐름을 숫자로 봅니다. 기간 버튼은 추이 그래프와 ‘최근 N일’ 카드에만 적용되고, 분포는 현재 시점 기준입니다."
        actions={
          <ChipRow>
            {[7, 30, 90].map((d) => <Chip key={d} href={`/admin/stats?days=${d}`} active={days === d}>{d}일</Chip>)}
          </ChipRow>
        }
      />

      {/* 요약 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <Stat title={`방문(${days}일)`} value={visits} href={`/admin/traffic?days=${days}`} note={visits != null && newUsers != null && visits > 0 ? `가입 전환 ${Math.round((newUsers / visits) * 1000) / 10}%` : "봇 제외"} />
        <Stat title="총 회원" value={roleTotal} href="/admin/users" note={`예술가 ${a} · 기관 ${o}`} />
        <Stat title={`신규 가입(${days}일)`} value={newUsers} href={`/admin/users?days=${days <= 30 ? days : 30}`} />
        <Stat title="인증 기관" value={verified} href="/admin/orgs?show=verified" note={o ? `기관의 ${Math.round(((verified ?? 0) / o) * 100)}%` : undefined} />
        <Stat title="인재정보 공개 예술가" value={publicArtists} href="/talents" note={a ? `예술가의 ${Math.round(((publicArtists ?? 0) / a) * 100)}%` : undefined} />
        <Stat title={`지원(${days}일)`} value={apps} href={`/admin/applications?days=${days}`} />
        <Stat title="모집중 수집 공고" value={openTotal} href="/admin/crawled" />
      </div>

      {/* 활동 */}
      <Card title="활동 — 얼마나 살아있나" sub="최근 7일 고정">
        {activity.error ? <ErrorNote message={activity.error} missing={activity.missing} /> : act ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {[
              ["로그인", act.logins], ["재로그인", act.relogin_count], ["메시지 보낸 사람", act.message_sender_count], ["양방향 대화", act.two_way_conversation_count],
              ["새 지원", act.new_applications], ["새 대화방", act.new_conversations], ["메시지", act.messages_count], ["활성 비율", `${Number(act.active_ratio)}%`],
            ].map(([l, v]) => (
              <div key={String(l)} className="rounded-xl bg-stone-50 p-3"><p className="text-[11px] font-semibold text-stone-500">{l}</p><p className="text-xl font-extrabold tabular-nums">{typeof v === "number" ? v.toLocaleString("ko-KR") : v}</p></div>
            ))}
          </div>
        ) : <p className="text-sm text-stone-500">데이터 없음</p>}
      </Card>

      {/* 추이 */}
      {daily.error ? <ErrorNote message={daily.error} missing={daily.missing} /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="회원 가입 추이" sub={`최근 ${days}일 · 합계 ${sum("signup_artist") + sum("signup_org")}명`}>
            <StackedBars buckets={signupBuckets} series={[{ key: "artist", label: "예술가", color: "bg-stone-900" }, { key: "org", label: "기관", color: "bg-sky-500" }]} />
          </Card>
          <Card title="공고 등록 추이" sub={`수집 ${sum("crawled_postings")} · 기관 직접 ${sum("org_postings")}`}>
            <StackedBars buckets={postingBuckets} series={[{ key: "crawled", label: "수집", color: "bg-stone-500" }, { key: "org", label: "기관 직접", color: "bg-emerald-600" }]} />
          </Card>
          <Card title="지원 추이" sub={`합계 ${sum("applications")}건`}>
            <ColumnChart points={rows.map((d) => ({ label: label(d.key), value: Number(d.applications) }))} color="bg-indigo-500" unit="건" />
          </Card>
          <Card title="대화 추이" sub={`새 대화방 ${sum("conversations")} · 메시지 ${sum("messages")}통 (본문은 세지 않고 건수만)`}>
            <ColumnChart points={rows.map((d) => ({ label: label(d.key), value: Number(d.messages) }))} color="bg-amber-500" unit="통" />
          </Card>
          <Card title="구직 글 추이" sub={`합계 ${sum("seeking_posts")}건`}>
            <ColumnChart points={rows.map((d) => ({ label: label(d.key), value: Number(d.seeking_posts) }))} color="bg-rose-400" unit="건" />
          </Card>
          <Card title="문의 추이" sub={`합계 ${sum("contacts")}건`}>
            <ColumnChart points={rows.map((d) => ({ label: label(d.key), value: Number(d.contacts) }))} color="bg-stone-400" unit="건" />
          </Card>
        </div>
      )}

      {/* 구성 */}
      <Card title="회원 구성">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="flex items-center justify-between text-sm font-bold"><span>예술가</span><span>{a}명 ({roleTotal ? Math.round((a / roleTotal) * 100) : 0}%)</span></div>
            <div className="mt-1"><Bar percent={roleTotal ? (a / roleTotal) * 100 : 0} height="h-3" /></div>
            <div className="mt-2 flex items-center justify-between text-sm font-bold"><span>기관</span><span>{o}명 ({roleTotal ? Math.round((o / roleTotal) * 100) : 0}%)</span></div>
            <div className="mt-1"><Bar percent={roleTotal ? (o / roleTotal) * 100 : 0} height="h-3" tone="bg-sky-500" /></div>
          </div>
          <div>
            <p className="mb-1 text-xs font-bold text-stone-600">지원 단계 분포</p>
            {appStatus.error ? <ErrorNote message={appStatus.error} missing={appStatus.missing} /> : <BarList items={toList(appStatus.data, (k) => APPLICATION_STATUS[k as keyof typeof APPLICATION_STATUS] ?? k)} tone="bg-indigo-500" />}
          </div>
        </div>
      </Card>

      {/* 분포 */}
      {pField.error ? <ErrorNote message={pField.error} missing={pField.missing} /> : (
        <>
          <h2 className="text-sm font-bold text-stone-700">모집중 공고 분포 (수집 + 기관 직접)</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card title="분야별"><BarList items={toList(pField.data, fieldLabel)} /></Card>
            <Card title="지역별"><BarList items={toList(pRegion.data.slice(0, 12), (k) => k)} tone="bg-sky-500" /></Card>
            <Card title="게시판별"><BarList items={toList(pBoard.data, boardLabel)} tone="bg-emerald-600" /></Card>
            <Card title="고용형태별"><BarList items={toList(pEmp.data, employmentLabel)} tone="bg-amber-500" /></Card>
          </div>
          <h2 className="text-sm font-bold text-stone-700">회원 분포</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card title="예술가 분야" action={<Link href="/admin/users?role=artist" className="text-xs text-stone-500 hover:underline">회원 →</Link>}><BarList items={toList(aField.data, fieldLabel)} unit="명" /></Card>
            <Card title="예술가 지역"><BarList items={toList(aRegion.data.slice(0, 12), (k) => k)} tone="bg-sky-500" unit="명" /></Card>
            <Card title="기관 유형" action={<Link href="/admin/users?role=organization" className="text-xs text-stone-500 hover:underline">회원 →</Link>}><BarList items={toList(oType.data, orgTypeLabel)} tone="bg-emerald-600" unit="곳" /></Card>
            <Card title="기관 지역"><BarList items={toList(oRegion.data.slice(0, 12), (k) => k)} tone="bg-amber-500" unit="곳" /></Card>
          </div>
        </>
      )}
      <p className="text-[11px] text-stone-400">방문자·유입 경로·가입 귀속은 <Link href="/admin/traffic" className="underline underline-offset-2">유입·방문</Link>에서 봅니다.</p>
    </div>
  );
}
