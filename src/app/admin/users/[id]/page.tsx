import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Bar, Card, ErrorNote, Flash, KV, KVGrid, PageHeader, ToneBadge, btn } from "@/components/admin/ui";
import { ADMIN_ACTION_LABEL, REPORT_CONTEXT_LABEL } from "@/lib/admin/labels";
import { nameMap, safeRpc, sp } from "@/lib/admin/queries";
import { addUserNote, adminUnpublishArtist, deleteUserNote, sendAdminNotification, setOrgVerified, setUserAdmin, setUserStatus } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { fmtDate, fmtDateTime, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import {
  APPLICATION_STATUS, REPORT_STATUS, artistCompleteness, orgCompleteness, orgTypeLabel, stageTone,
  type AdminLog, type AlertCondition, type Application, type ArtistProfile, type OrgProfile, type PortfolioItem, type Profile, type SeekingPost, type UserReport,
} from "@/types/account";
import { boardLabel, employmentLabel, fieldLabel, genreLabel, roleLabel } from "@/types/job";

type AuthInfo = { email: string | null; providers: string[]; created_at: string; last_sign_in_at: string | null; email_confirmed_at: string | null };
type Note = { id: string; admin_user_id: string; body: string; created_at: string };
type Settings = { message_notification: boolean; new_posting_notification: boolean; application_notification: boolean; email_notification: boolean };
type PostingRow = { id: string; title: string; board: string; status: string; apply_end: string | null; created_at: string; view_count: number; deleted_at: string | null };

const PROVIDER: Record<string, string> = { email: "이메일", google: "Google", kakao: "카카오", apple: "Apple" };

export default async function AdminUserDetail({ params, searchParams }: PageProps<"/admin/users/[id]">) {
  const me = await requireAdmin("/admin/users");
  const { id } = await params;
  const s = await searchParams;
  const supabase = (await createClient())!;

  const { data: profileRow } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!profileRow) notFound();
  const profile = profileRow as Profile & { created_at: string };
  const isArtist = profile.role === "artist";
  const self = `/admin/users/${id}`;

  const [
    auth, artistRes, orgRes, portfolioRes, settingsRes, alertsRes, notesRes,
    appsRes, savedCount, convCount, notifTotal, notifUnread, seekingRes, postingsRes, receivedApps, membersCount,
    reportsAgainst, reportsBy, blocksRes, logsRes,
  ] = await Promise.all([
    safeRpc<AuthInfo>(supabase, "admin_user_auth", { p_user: id }),
    isArtist ? supabase.from("artist_profiles").select("*").eq("user_id", id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    !isArtist ? supabase.from("org_profiles").select("*").eq("user_id", id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    isArtist ? supabase.from("artist_portfolio_items").select("*").eq("user_id", id).order("sort_order") : Promise.resolve({ data: [], error: null }),
    supabase.from("user_settings").select("*").eq("user_id", id).maybeSingle(),
    supabase.from("alert_conditions").select("*").eq("user_id", id).order("created_at"),
    supabase.from("admin_user_notes").select("*").eq("user_id", id).order("created_at", { ascending: false }),
    isArtist ? supabase.from("applications").select("*").eq("artist_user_id", id).order("created_at", { ascending: false }).limit(30) : Promise.resolve({ data: [], error: null }),
    supabase.from("bookmarks").select("id", { count: "exact", head: true }).eq("user_id", id),
    supabase.from("conversations").select("id", { count: "exact", head: true }).or(`artist_user_id.eq.${id},org_user_id.eq.${id}`),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", id),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", id).eq("is_read", false),
    isArtist ? supabase.from("seeking_posts").select("*").eq("artist_user_id", id).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    !isArtist ? supabase.from("org_postings").select("id, title, board, status, apply_end, created_at, view_count, deleted_at").eq("org_user_id", id).order("created_at", { ascending: false }).limit(30) : Promise.resolve({ data: [], error: null }),
    !isArtist ? supabase.from("applications").select("id", { count: "exact", head: true }).eq("org_user_id", id) : Promise.resolve({ count: null }),
    !isArtist ? supabase.from("org_members").select("id", { count: "exact", head: true }).eq("org_user_id", id) : Promise.resolve({ count: null }),
    supabase.from("user_reports").select("*").eq("reported_user_id", id).order("created_at", { ascending: false }),
    supabase.from("user_reports").select("*").eq("reporter_user_id", id).order("created_at", { ascending: false }),
    supabase.from("user_blocks").select("*").or(`blocker_user_id.eq.${id},blocked_user_id.eq.${id}`),
    supabase.from("admin_logs").select("*").eq("target_id", id).order("created_at", { ascending: false }).limit(30),
  ]);

  const a = (artistRes.data ?? null) as ArtistProfile | null;
  const o = (orgRes.data ?? null) as OrgProfile | null;
  const portfolio = (portfolioRes.data ?? []) as PortfolioItem[];
  const settings = (settingsRes.data ?? null) as Settings | null;
  const alerts = (alertsRes.data ?? []) as AlertCondition[];
  const notes = (notesRes.data ?? []) as Note[];
  const apps = (appsRes.data ?? []) as Application[];
  const seeking = (seekingRes.data ?? []) as SeekingPost[];
  const postings = (postingsRes.data ?? []) as PostingRow[];
  const against = (reportsAgainst.data ?? []) as UserReport[];
  const by = (reportsBy.data ?? []) as UserReport[];
  const blocks = (blocksRes.data ?? []) as { id: string; blocker_user_id: string; blocked_user_id: string; created_at: string }[];
  const logs = (logsRes.data ?? []) as AdminLog[];
  const au = auth.data[0] ?? null;
  const completeness = isArtist ? artistCompleteness(a) : orgCompleteness(o);

  const names = await nameMap(supabase, [
    ...notes.map((n) => n.admin_user_id), ...logs.map((l) => l.admin_user_id),
    ...against.map((r) => r.reporter_user_id), ...by.map((r) => r.reported_user_id),
    ...blocks.flatMap((b) => [b.blocker_user_id, b.blocked_user_id]),
  ]);
  const nm = (uid: string) => names.get(uid)?.display_name ?? "(탈퇴)";

  const statusBadge = profile.status === "active" ? <Badge tone="green">활성</Badge> : profile.status === "suspended" ? <Badge tone="red">정지</Badge> : <Badge tone="stone">탈퇴</Badge>;

  return (
    <div className="space-y-4">
      <PageHeader
        back={{ href: "/admin/users", label: "회원 관리로" }}
        title={profile.display_name}
        description={
          <span className="flex flex-wrap items-center gap-1">
            <Badge tone={isArtist ? "stone" : "sky"}>{isArtist ? "예술가" : "기관"}</Badge>
            {statusBadge}
            {profile.is_admin && <Badge tone="amber">운영자</Badge>}
            {!isArtist && (o?.is_verified ? <Badge tone="green">✓ 인증 기관</Badge> : <Badge tone="stone">미인증</Badge>)}
            {isArtist && a?.is_public && <Badge tone="violet">인재정보 공개 중</Badge>}
            {!completeness.missing.length ? <Badge tone="green">프로필 완성</Badge> : <Badge tone="orange">프로필 {completeness.percent}%</Badge>}
          </span>
        }
        actions={
          <>
            {isArtist ? <Link href={`/talents/${id}`} className={btn.secondary}>인재정보로 보기</Link> : null}
            {!isArtist && o?.website ? <a href={o.website} target="_blank" rel="noopener noreferrer" className={btn.secondary}>홈페이지 ↗</a> : null}
          </>
        }
      />
      <Flash ok={sp(s.ok) || null} err={sp(s.err) || null} />

      {/* 기본 정보 + 운영 조치 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="기본 정보" className="lg:col-span-2">
          <KVGrid>
            <KV label="이메일">{au?.email ?? "(0010 마이그레이션 후 표시)"}</KV>
            <KV label="가입 경로">{au ? (au.providers.length ? au.providers.map((p) => PROVIDER[p] ?? p).join(", ") : "이메일") : "—"}</KV>
            <KV label="가입일">{fmtDateTime(profile.created_at)} <span className="text-xs text-stone-400">({timeAgo(profile.created_at)})</span></KV>
            <KV label="마지막 로그인">{au?.last_sign_in_at ? <>{fmtDateTime(au.last_sign_in_at)} <span className="text-xs text-stone-400">({timeAgo(au.last_sign_in_at)})</span></> : "—"}</KV>
            <KV label="이메일 확인">{au ? (au.email_confirmed_at ? "확인됨" : <span className="text-amber-700">미확인</span>) : "—"}</KV>
            <KV label="회원 ID"><code className="text-xs text-stone-500">{id}</code></KV>
          </KVGrid>
          {auth.error && <div className="mt-3"><ErrorNote message={auth.error} missing={auth.missing} /></div>}
        </Card>
        <Card title="운영 조치" sub="모든 조치는 활동 로그에 남습니다">
          <div className="flex flex-wrap gap-1.5">
            {id !== me.id && profile.status !== "deleted" && (
              profile.status === "active" ? (
                <form action={setUserStatus.bind(null, id, "suspended")}><button className={btn.dangerSolid}>계정 정지</button></form>
              ) : (
                <form action={setUserStatus.bind(null, id, "active")}><button className={btn.successSolid}>정지 해제</button></form>
              )
            )}
            {id !== me.id && <form action={setUserAdmin.bind(null, id, !profile.is_admin)}><button className={btn.secondary}>{profile.is_admin ? "운영자 해제" : "운영자 지정"}</button></form>}
            {!isArtist && (o?.is_verified ? (
              <form action={setOrgVerified.bind(null, id, false)}><button className={btn.secondary}>인증 취소</button></form>
            ) : (
              <form action={setOrgVerified.bind(null, id, true)}><button className={btn.successSolid}>기관 인증</button></form>
            ))}
            {isArtist && a?.is_public && <form action={adminUnpublishArtist.bind(null, id)}><button className={btn.danger}>인재정보 비공개</button></form>}
          </div>
          <p className="mt-2 text-[11px] text-stone-500">{id === me.id ? "본인 계정은 정지·권한 변경을 할 수 없습니다." : "정지된 계정은 로그인은 되지만 메시지·지원·공고 등록이 막힙니다."}</p>
          <details className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
            <summary className="cursor-pointer text-xs font-bold text-stone-700">✉️ 운영팀 알림 보내기</summary>
            <form action={sendAdminNotification.bind(null, id)} className="mt-2 space-y-2">
              <input type="hidden" name="return_to" value={self} />
              <input name="title" required minLength={2} maxLength={80} placeholder="제목 (예: 프로필을 보완해 주세요)" className="h-9 w-full rounded-lg border border-stone-300 bg-white px-2 text-xs" />
              <textarea name="body" rows={3} maxLength={500} placeholder="내용 — 회원의 알림(종 아이콘)에 그대로 보입니다. 존댓말로, 무엇을 어떻게 하면 되는지만 적어 주세요." className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs" />
              <input name="link" placeholder="누르면 갈 주소 (기본 /notifications, 예: /me/profile)" className="h-9 w-full rounded-lg border border-stone-300 bg-white px-2 text-xs" />
              <button className={btn.primary}>알림 보내기</button>
            </form>
          </details>
        </Card>
      </div>

      {/* 활동 요약 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {(isArtist
          ? [
              { label: "지원", value: apps.length, href: `/admin/applications?q=${encodeURIComponent(profile.display_name)}` },
              { label: "저장한 공고", value: savedCount.count },
              { label: "알림 조건", value: alerts.length },
              { label: "대화방", value: convCount.count, href: `/admin/messages?q=${encodeURIComponent(profile.display_name)}` },
              { label: "구직 글", value: seeking.length, href: "/admin/seeking" },
              { label: "알림(안 읽음)", value: notifTotal.count == null ? null : `${notifTotal.count}(${notifUnread.count ?? 0})` },
            ]
          : [
              { label: "공고", value: postings.length, href: "/admin/postings?show=all" },
              { label: "받은 지원", value: receivedApps.count, href: `/admin/applications?q=${encodeURIComponent(profile.display_name)}` },
              { label: "구성원", value: membersCount.count },
              { label: "대화방", value: convCount.count, href: `/admin/messages?q=${encodeURIComponent(profile.display_name)}` },
              { label: "알림 조건", value: alerts.length },
              { label: "알림(안 읽음)", value: notifTotal.count == null ? null : `${notifTotal.count}(${notifUnread.count ?? 0})` },
            ]
        ).map((it) => {
          const body = (
            <>
              <p className="text-[11px] font-semibold text-stone-500">{it.label}</p>
              <p className="text-lg font-extrabold tabular-nums">{it.value == null ? "—" : it.value}</p>
            </>
          );
          return it.href ? <Link key={it.label} href={it.href} className="rounded-xl border border-stone-200 bg-white p-3 hover:border-stone-400">{body}</Link> : <div key={it.label} className="rounded-xl border border-stone-200 bg-white p-3">{body}</div>;
        })}
      </div>

      {/* 프로필 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={isArtist ? "예술가 프로필" : "기관 정보"} sub={completeness.missing.length ? `빠진 항목: ${completeness.missing.join(", ")}` : "모든 항목을 채웠습니다"}>
          <div className="mb-3"><Bar percent={completeness.percent} tone="bg-emerald-600" /></div>
          {isArtist ? (
            a ? (
              <>
                <KVGrid>
                  <KV label="분야">{fieldLabel(a.field) ?? "—"}</KV>
                  <KV label="장르">{a.genres.map((g) => genreLabel(g) ?? g).join(" · ") || "—"}</KV>
                  <KV label="희망 직무">{a.roles.map((r) => roleLabel(r) ?? r).join(" · ") || "—"}</KV>
                  <KV label="고용형태">{a.employment_types.map((e) => employmentLabel(e) ?? e).join(" · ") || "—"}</KV>
                  <KV label="지역">{[a.region, a.address_hint].filter(Boolean).join(" ") || "—"} <span className="text-xs text-stone-400">(반경 {a.max_distance_km}km)</span></KV>
                  <KV label="경력">{a.career_years != null ? `${a.career_years}년` : "—"}</KV>
                  <KV label="학력">{a.education ?? "—"}</KV>
                  <KV label="포트폴리오 URL">{a.portfolio_url ? <a href={a.portfolio_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{a.portfolio_url}</a> : "—"}</KV>
                  <KV label="상태">{a.availability === "open" ? "구직 중" : "구직 안 함"} · 인재정보 {a.is_public ? "공개" : "비공개"} · 메시지 {a.allow_messages ? "받음" : "안 받음"}</KV>
                  <KV label="수정">{fmtDateTime(a.updated_at)}</KV>
                </KVGrid>
                {a.bio && <div className="mt-3 whitespace-pre-wrap rounded-xl bg-stone-50 p-3 text-sm text-stone-800">{a.bio}</div>}
                {a.career && <div className="mt-2 whitespace-pre-wrap rounded-xl bg-stone-50 p-3 text-xs text-stone-700"><b>주요 경력</b><br />{a.career}</div>}
                <div className="mt-3">
                  <p className="text-xs font-bold text-stone-700">포트폴리오 {portfolio.length}건</p>
                  {portfolio.length === 0 ? <p className="text-xs text-stone-500">없음</p> : (
                    <ul className="mt-1 space-y-1 text-xs">
                      {portfolio.map((p) => (
                        <li key={p.id}><Badge>{p.kind}</Badge> <a href={p.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{p.title ?? p.url}</a></li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : <p className="text-sm text-stone-500">프로필이 없습니다.</p>
          ) : o ? (
            <>
              <KVGrid>
                <KV label="기관명">{o.org_name}</KV>
                <KV label="유형">{orgTypeLabel(o.org_type) ?? "—"}</KV>
                <KV label="주 분야">{fieldLabel(o.field) ?? "—"}</KV>
                <KV label="지역·주소">{[o.region, o.address].filter(Boolean).join(" ") || "—"}</KV>
                <KV label="홈페이지">{o.website ? <a href={o.website} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{o.website}</a> : "—"}</KV>
                <KV label="인증">{o.is_verified ? "✓ 인증됨" : "미인증"}</KV>
                <KV label="수정">{fmtDateTime(o.updated_at)}</KV>
              </KVGrid>
              {o.intro && <div className="mt-3 whitespace-pre-wrap rounded-xl bg-stone-50 p-3 text-sm text-stone-800">{o.intro}</div>}
            </>
          ) : <p className="text-sm text-stone-500">기관 정보가 없습니다.</p>}
        </Card>

        {/* 알림 설정 점검 */}
        <Card title="알림 설정 점검" sub="새 공고 알림이 실제로 나갈 상태인지">
          {settings ? (
            <p className="flex flex-wrap gap-x-2 gap-y-1 text-xs">
              {[["메시지", settings.message_notification], ["새 공고", settings.new_posting_notification], ["지원", settings.application_notification], ["이메일", settings.email_notification]].map(([l, on]) => (
                <span key={String(l)} className={on ? "font-semibold text-sky-700" : "text-stone-400"}>{l} {on ? "켜짐" : "꺼짐"}</span>
              ))}
            </p>
          ) : <p className="text-xs text-stone-400">설정 없음(기본값) — 0010 마이그레이션 전이면 읽을 수 없습니다.</p>}
          {isArtist && alerts.length === 0 && <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">알림 조건이 없어 새 공고 알림이 나가지 않습니다.</p>}
          <div className="mt-3 border-t border-stone-100 pt-3">
            <p className="text-xs font-bold text-stone-700">걸어둔 알림 조건 · {alerts.length}개</p>
            {alerts.length === 0 ? <p className="text-xs text-stone-500">없음</p> : (
              <ul className="mt-1 space-y-1.5 text-xs">
                {alerts.map((al) => (
                  <li key={al.id} className="flex items-start justify-between gap-2">
                    <span className="min-w-0 text-stone-800">
                      <b>{al.name}</b> · {al.boards.map((b) => boardLabel(b) ?? b).join("·") || "전체"} · {al.fields.map((f) => fieldLabel(f) ?? f).join("·") || "전 분야"} · {al.near_me ? "내 근처" : al.regions.join("·") || "전국"} · {al.frequency === "instant" ? "바로" : al.frequency === "daily" ? "매일" : "매주"} · {al.channels.join("+")}
                    </span>
                    <span className={`shrink-0 font-semibold ${al.is_active ? "text-sky-700" : "text-stone-400"}`}>{al.is_active ? "켜짐" : "꺼짐"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* 활동 이력 */}
      {isArtist ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title={`지원 이력 · ${apps.length}건`} action={<Link href={`/admin/applications?q=${encodeURIComponent(profile.display_name)}`} className="text-xs text-stone-500 hover:text-stone-900">지원 현황에서 보기 →</Link>}>
            {apps.length === 0 ? <p className="text-sm text-stone-500">지원한 공고가 없습니다.</p> : (
              <ul className="divide-y divide-stone-100 text-sm">
                {apps.map((ap) => (
                  <li key={ap.id} className="flex items-center gap-2 py-1.5">
                    <ToneBadge tone={stageTone(ap.status)}>{APPLICATION_STATUS[ap.status]}</ToneBadge>
                    <Link href={`/${ap.posting_source === "org" ? "jobs/org:" : "jobs/crawled:"}${ap.posting_id}`} className="min-w-0 flex-1 truncate hover:underline">{ap.posting_title}</Link>
                    <span className="shrink-0 text-xs text-stone-400">{fmtDate(ap.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title={`구직 글 · ${seeking.length}건`}>
            {seeking.length === 0 ? <p className="text-sm text-stone-500">올린 구직 글이 없습니다.</p> : (
              <ul className="divide-y divide-stone-100 text-sm">
                {seeking.map((sk) => (
                  <li key={sk.id} className="flex items-center gap-2 py-1.5">
                    <Badge tone={sk.deleted_at ? "red" : sk.status === "open" ? "green" : "stone"}>{sk.deleted_at ? "내림" : sk.status === "open" ? "공개" : "닫음"}</Badge>
                    <Link href={`/seeking/${sk.id}`} className="min-w-0 flex-1 truncate hover:underline">{sk.title}</Link>
                    <span className="shrink-0 text-xs text-stone-400">~{fmtDate(sk.expires_at)} · 조회 {sk.view_count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : (
        <Card title={`등록 공고 · ${postings.length}건`} action={<Link href="/admin/postings?show=all" className="text-xs text-stone-500 hover:text-stone-900">기관 공고 관리 →</Link>}>
          {postings.length === 0 ? <p className="text-sm text-stone-500">올린 공고가 없습니다.</p> : (
            <ul className="divide-y divide-stone-100 text-sm">
              {postings.map((p) => (
                <li key={p.id} className="flex items-center gap-2 py-1.5">
                  <Badge tone={p.deleted_at ? "red" : p.status === "open" ? "green" : "stone"}>{p.deleted_at ? "내림" : { open: "모집중", closed: "마감", draft: "임시" }[p.status] ?? p.status}</Badge>
                  <Link href={`/${p.board === "audition" ? "auditions" : "jobs"}/org:${p.id}`} className="min-w-0 flex-1 truncate hover:underline">{p.title}</Link>
                  <span className="shrink-0 text-xs text-stone-400">{boardLabel(p.board)} · {p.apply_end ? `~${fmtDate(p.apply_end)}` : "상시"} · 조회 {p.view_count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* 신고 · 차단 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`받은 신고 · ${against.length}건`} sub={by.length ? `이 회원이 한 신고 ${by.length}건` : undefined} action={<Link href="/admin/reports?show=all" className="text-xs text-stone-500 hover:text-stone-900">신고 처리 →</Link>}>
          {against.length === 0 ? <p className="text-sm text-stone-500">받은 신고가 없습니다.</p> : (
            <ul className="divide-y divide-stone-100 text-sm">
              {against.map((r) => (
                <li key={r.id} className="py-1.5">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <Badge tone="red">{r.category}</Badge>
                    <span className="text-stone-500">{REPORT_CONTEXT_LABEL[r.context_type ?? ""] ?? "기타"} · 신고자 {nm(r.reporter_user_id)} · {fmtDateTime(r.created_at)}</span>
                    <Badge className="ml-auto">{REPORT_STATUS[r.status]}</Badge>
                  </div>
                  {r.detail && <p className="mt-1 line-clamp-2 text-xs text-stone-600">{r.detail}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={`차단 관계 · ${blocks.length}건`}>
          {blocks.length === 0 ? <p className="text-sm text-stone-500">차단 관계가 없습니다.</p> : (
            <ul className="divide-y divide-stone-100 text-xs">
              {blocks.map((b) => (
                <li key={b.id} className="py-1.5">
                  {b.blocker_user_id === id ? <>이 회원이 <b>{nm(b.blocked_user_id)}</b> 을(를) 차단</> : <><b>{nm(b.blocker_user_id)}</b> 이(가) 이 회원을 차단</>}
                  <span className="ml-2 text-stone-400">{fmtDateTime(b.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* 운영 메모 + 로그 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`운영 메모 · ${notes.length}건`} sub="운영자끼리만 보입니다. 회원에게는 보이지 않습니다.">
          <form action={addUserNote.bind(null, id)} className="flex gap-1">
            <input name="body" required maxLength={2000} placeholder="예: 9/12 기관 홈페이지 확인, 사업자 등록 확인 요청함" className="h-9 min-w-0 flex-1 rounded-lg border border-stone-300 px-2 text-xs" />
            <button className={btn.primary}>남기기</button>
          </form>
          {notesRes.error && <div className="mt-2"><ErrorNote message={notesRes.error.message} missing /></div>}
          {notes.length > 0 && (
            <ul className="mt-3 space-y-2">
              {notes.map((n) => (
                <li key={n.id} className="rounded-xl bg-amber-50 p-3 text-sm text-stone-800">
                  <p className="whitespace-pre-wrap">{n.body}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-stone-500">
                    <span>{nm(n.admin_user_id)} · {fmtDateTime(n.created_at)}</span>
                    <form action={deleteUserNote.bind(null, id, n.id)} className="ml-auto"><button className="underline-offset-2 hover:underline">삭제</button></form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={`이 회원에 대한 운영 기록 · ${logs.length}건`} action={<Link href={`/admin/logs?q=${id}`} className="text-xs text-stone-500 hover:text-stone-900">활동 로그 →</Link>}>
          {logs.length === 0 ? <p className="text-sm text-stone-500">기록이 없습니다.</p> : (
            <ul className="divide-y divide-stone-100 text-xs">
              {logs.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-2 py-1.5">
                  <span className="w-28 shrink-0 text-stone-400">{fmtDateTime(l.created_at)}</span>
                  <span className="font-semibold">{nm(l.admin_user_id)}</span>
                  <Badge>{ADMIN_ACTION_LABEL[l.action] ?? l.action}</Badge>
                  {l.detail && <span className="min-w-0 truncate text-stone-500">{typeof l.detail.title === "string" ? l.detail.title : typeof l.detail.body === "string" ? l.detail.body : JSON.stringify(l.detail)}</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
