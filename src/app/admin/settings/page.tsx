import Link from "next/link";
import { Badge, Card, ErrorNote, Flash, KV, KVGrid, PageHeader, btn } from "@/components/admin/ui";
import { PARSER_READY_SOURCES } from "@/lib/admin/labels";
import { safeRpc, sp } from "@/lib/admin/queries";
import { purgeExpiredApplications, setUserAdmin } from "@/lib/actions/admin";
import { ENABLED_SOCIAL_PROVIDERS } from "@/lib/auth-providers";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { SUPABASE_URL } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type AdminRow = { id: string; display_name: string; role: string; status: string; created_at: string };

export default async function AdminSettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  const me = await requireAdmin("/admin/settings");
  const s = await searchParams;
  const supabase = (await createClient())!;
  const [{ data: adminsRaw }, purgeDue, purgedCount, migrationProbe, contactProbe, noticeProbe] = await Promise.all([
    supabase.from("profiles").select("id, display_name, role, status, created_at").eq("is_admin", true).order("created_at"),
    safeRpc<number>(supabase, "admin_purge_due_count"),
    supabase.from("applications").select("id", { count: "exact", head: true }).not("purged_at", "is", null),
    safeRpc(supabase, "admin_activity_7d"),
    supabase.from("contact_messages").select("id", { count: "exact", head: true }),
    supabase.from("site_notices").select("id", { count: "exact", head: true }),
  ]);
  const admins = (adminsRaw ?? []) as AdminRow[];
  const due = purgeDue.data[0] != null ? Number(purgeDue.data[0]) : null;
  const migrated = !migrationProbe.missing && !contactProbe.error && !noticeProbe.error;
  const providers = ENABLED_SOCIAL_PROVIDERS;

  return (
    <div className="space-y-4">
      <PageHeader title="환경 설정" description="운영자 계정, 데이터 정리, 지금 서비스가 어떤 설정으로 도는지 확인하는 곳입니다. 코드나 환경변수를 바꾸는 항목은 여기서 직접 바꿀 수 없고 어디를 고치면 되는지만 알려 줍니다." />
      <Flash ok={sp(s.ok) || null} err={sp(s.err) || null} />

      {/* 운영자 */}
      <Card title={`운영자 · ${admins.length}명`} sub="운영자는 기관(구인자)으로 가입한 뒤 지정합니다. lkseok911@gmail.com 은 가입 즉시 자동 운영자입니다.">
        <ul className="divide-y divide-stone-100 text-sm">
          {admins.map((ad) => (
            <li key={ad.id} className="flex flex-wrap items-center gap-2 py-2">
              <Link href={`/admin/users/${ad.id}`} className="font-semibold underline-offset-2 hover:underline">{ad.display_name}</Link>
              <Badge tone={ad.role === "organization" ? "sky" : "stone"}>{ad.role === "organization" ? "기관" : "예술가"}</Badge>
              {ad.status !== "active" && <Badge tone="red">{ad.status === "suspended" ? "정지" : "탈퇴"}</Badge>}
              {ad.id === me.id && <Badge tone="amber">나</Badge>}
              <span className="text-xs text-stone-400">{fmtDateTime(ad.created_at)} 가입</span>
              {ad.id !== me.id && <form action={setUserAdmin.bind(null, ad.id, false)} className="ml-auto"><button className={btn.danger}>운영자 해제</button></form>}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-stone-500">새 운영자를 지정하려면 <Link href="/admin/users" className="underline underline-offset-2">회원 관리</Link>에서 그 회원의 ‘운영자 지정’ 을 누르세요. 모든 지정·해제는 활동 로그에 남습니다.</p>
      </Card>

      {/* 데이터 정리 */}
      <Card title="데이터 정리" sub="지원서의 개인정보(프로필 스냅샷·지원 메시지)는 공고 마감 뒤 보관 기간(공고별 30~1095일, 기본 180일)이 지나면 지웁니다. 행과 선발 결과는 남습니다.">
        {purgeDue.error ? <ErrorNote message={purgeDue.error} missing={purgeDue.missing} /> : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm">지금 파기 대상 <b className="text-lg">{due ?? 0}</b>건 · 지금까지 파기됨 {purgedCount.count ?? 0}건</p>
            <form action={purgeExpiredApplications}><button className={btn.dangerSolid} disabled={!due}>만료 지원서 파기 실행</button></form>
          </div>
        )}
        <p className="mt-2 text-xs text-stone-500">자동으로 매일 돌리려면 Supabase → Database → Extensions 에서 pg_cron 을 켜고 SQL Editor 에서 아래를 한 번 실행하세요.</p>
        <pre className="mt-1 overflow-x-auto rounded-lg bg-stone-900 p-3 text-[11px] text-stone-100">{`select cron.schedule('purge-applications', '0 3 * * *', $$select purge_expired_applications()$$);`}</pre>
      </Card>

      {/* 환경 */}
      <Card title="환경 정보" sub="지금 이 서비스가 어떤 설정으로 도는지">
        <KVGrid>
          <KV label="사이트 주소">{SITE_URL}</KV>
          <KV label="Supabase">{SUPABASE_URL ? <><Badge tone="green">연결됨</Badge> <span className="text-xs text-stone-500">{SUPABASE_URL}</span></> : <Badge tone="red">미연결</Badge>}</KV>
          <KV label="DB 확장(0010)">{migrated ? <Badge tone="green">적용됨</Badge> : <><Badge tone="amber">미적용</Badge> <span className="text-xs text-stone-500">supabase/migrations/0010_admin_center.sql 을 SQL Editor 에서 실행하세요. 문의·공지·대화 모니터·통계가 그 뒤에 켜집니다.</span></>}</KV>
          <KV label="소셜 로그인">{providers.length ? providers.map((p) => <Badge key={p.code} className="mr-1">{p.shortLabel}</Badge>) : <span className="text-xs text-stone-500">이메일 가입만 (NEXT_PUBLIC_AUTH_PROVIDERS 비어 있음)</span>}</KV>
          <KV label="크롤 파서">{PARSER_READY_SOURCES.map((c) => <Badge key={c} tone="indigo" className="mr-1">{c}</Badge>)} <span className="text-xs text-stone-500">scripts/crawler/crawl_&lt;code&gt;.py · GitHub Actions 에서 매일 실행</span></KV>
          <KV label="이메일 발송"><span className="text-xs text-stone-500">아직 없음 — 문의 답변은 알림(회원) 또는 직접 메일. 알림 메일을 붙이려면 Resend 같은 발송 서비스 연동이 필요합니다.</span></KV>
          <KV label="방문 통계"><span className="text-xs text-stone-500">자체 기록(visit_logs, 0011) — <Link href="/admin/traffic" className="underline underline-offset-2">유입·방문</Link>. IP 저장 없음, 봇 제외, /admin 제외.</span></KV>
        </KVGrid>
      </Card>

      <Card title="바꾸려면 어디를 고치나" tone="muted">
        <ul className="list-disc space-y-1 pl-5 text-xs text-stone-600">
          <li>홈 문구·소개: <code>src/app/page.tsx</code>, <code>src/app/about/page.tsx</code></li>
          <li>분야·장르·직무·지역 코드표: <code>src/types/job.ts</code> (DB 와 크롤러가 같은 표를 씁니다)</li>
          <li>크롤 소스 추가·수정: <code>scripts/crawler/sources.py</code> → <code>supabase/seed/crawl_sources.sql</code></li>
          <li>운영자 자동 지정 이메일: <code>supabase/migrations/0007_admin.sql</code> 의 handle_new_user</li>
          <li>환경변수(Supabase 키, 소셜 로그인): Vercel → Settings → Environment Variables (<code>.env.example</code> 참고)</li>
        </ul>
      </Card>
    </div>
  );
}
