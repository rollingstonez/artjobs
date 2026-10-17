// 가입 후 안내 메일(드립) — 바로쌤 app/api/teacher-drip/send 를 아트잡스에 맞게 옮겼다.
// 실행: GitHub Actions(.github/workflows/email-drip.yml) 매일 09:07 KST. 로컬: npx tsx scripts/email/drip.ts --dry-run
//
//   예술가                                         기관
//   D+1  a1_profile_tips  프로필 작성 요령            D+1 o1_verify         기관 인증 안내
//   D+3  a3_alert         새 공고 N건 + 알림 설정     D+3 o3_first_posting  첫 공고 쓰는 요령
//   D+7  a7_progress      프로필 N% · 남은 항목       D+7 o7_talent         인재 찾기 · 함께 심사
//   D+14 a14_noticed      관심받는 요령(인재정보 공개)
//   D+21 a21_seeking      구직 글 올리기
//
// 규칙
//   · 대상은 가입 LOOKBACK_DAYS 안의 활성 회원. 설정 '이메일로도 받기'를 끈 사람은 드립을 보내지 않는다.
//   · 한 사람에게 하루 1통, 직전 메일과 MIN_GAP_DAYS 이상 간격.
//   · 이미 한 일(프로필 완성·알림 저장·인증 등)에 대한 안내는 보내지 않고 skipped 로 남긴다.
//   · 날짜가 지난 단계가 여럿 밀려 있으면(처음 켰을 때의 기존 회원) 가장 최근 단계 하나만 보내고 나머지는 skipped.
//   · 가입 환영 메일을 놓친 최근 가입자(키 설정 전 가입 등)에게는 환영 메일을 대신 보낸다.
//   · 기록표 email_sends (user_id, kind) 1회. 발송이 실패하면 행을 만들지 않아 다음 날 다시 시도한다.
//   · --dry-run 이면 보내지도 기록하지도 않고 "누구에게 무엇을" 만 찍는다(받는 주소는 가린다).
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "../../src/lib/email/send";
import * as T from "../../src/lib/email/templates";
import { FIELDS } from "../../src/types/job";

const DRY = process.argv.includes("--dry-run");
const LOOKBACK_DAYS = 35;
const WELCOME_CATCHUP_DAYS = 3;
const MIN_GAP_DAYS = 2;
const DAY = 86_400_000;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없습니다.");
  process.exit(1);
}
if (!DRY && !process.env.RESEND_API_KEY) {
  // 키를 아직 안 넣은 동안 매일 실패 알림이 가지 않도록 조용히 끝낸다.
  console.log("RESEND_API_KEY 가 아직 없어 보내지 않고 끝냅니다. (GitHub Secrets 에 넣으면 다음 실행부터 보냅니다)");
  process.exit(0);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const fieldLabel = (code: string | null) => FIELDS.find((f) => f.code === code)?.label ?? null;

type Step = { kind: string; day: number };
const ARTIST_STEPS: Step[] = [
  { kind: "a1_profile_tips", day: 1 },
  { kind: "a3_alert", day: 3 },
  { kind: "a7_progress", day: 7 },
  { kind: "a14_noticed", day: 14 },
  { kind: "a21_seeking", day: 21 },
];
const ORG_STEPS: Step[] = [
  { kind: "o1_verify", day: 1 },
  { kind: "o3_first_posting", day: 3 },
  { kind: "o7_talent", day: 7 },
];

const mask = (email: string) => email.replace(/^(.).*?(@.*)$/, "$1***$2");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function artistCompleteness(a: Record<string, unknown> | undefined) {
  if (!a) return { percent: 0, missing: ["프로필"] };
  const arr = (v: unknown) => (Array.isArray(v) ? v.length : 0);
  const checks: [boolean, string][] = [
    [Boolean(a.field), "분야"],
    [arr(a.genres) > 0, "장르"],
    [arr(a.roles) > 0, "희망 직무"],
    [Boolean(a.region), "지역"],
    [typeof a.bio === "string" && a.bio.trim().length >= 30, "자기소개(30자 이상)"],
    [Boolean(a.career), "경력"],
  ];
  const missing = checks.filter(([ok]) => !ok).map(([, l]) => l);
  return { percent: Math.round(((checks.length - missing.length) / checks.length) * 100), missing };
}

async function allAuthUsers() {
  const out = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) if (u.email) out.set(u.id, u.email);
    if (data.users.length < 1000) break;
  }
  return out;
}

async function main() {
  const now = Date.now();
  const since = new Date(now - LOOKBACK_DAYS * DAY).toISOString();
  const { data: profs, error } = await db
    .from("profiles")
    .select("id, role, display_name, status, created_at")
    .eq("status", "active")
    .gte("created_at", since);
  if (error) throw error;
  const users = (profs ?? []) as { id: string; role: string; display_name: string; created_at: string }[];
  console.log(`대상(가입 ${LOOKBACK_DAYS}일 안, 활성): ${users.length}명${DRY ? " — 미리보기(dry-run)" : ""}`);
  if (!users.length) return;
  const ids = users.map((u) => u.id);
  const weekAgo = new Date(now - 7 * DAY).toISOString();

  const [emails, sendsR, setR, artR, pfR, alertR, seekR, orgR, verR, postR, crawledR, orgNewR] = await Promise.all([
    allAuthUsers(),
    db.from("email_sends").select("user_id, kind, result, sent_at").in("user_id", ids),
    db.from("user_settings").select("user_id, email_notification").in("user_id", ids),
    db.from("artist_profiles").select("*").in("user_id", ids),
    db.from("artist_portfolio_items").select("user_id").in("user_id", ids),
    db.from("alert_conditions").select("user_id").in("user_id", ids),
    db.from("seeking_posts").select("artist_user_id").in("artist_user_id", ids).is("deleted_at", null),
    db.from("org_profiles").select("user_id, org_name, is_verified").in("user_id", ids),
    db.from("org_verifications").select("user_id, status").in("user_id", ids),
    db.from("org_postings").select("org_user_id").in("org_user_id", ids).is("deleted_at", null),
    db.from("crawled_postings").select("field").gte("created_at", weekAgo),
    db.from("org_postings").select("field").gte("created_at", weekAgo).is("deleted_at", null).eq("status", "open"),
  ]);
  for (const r of [sendsR, setR, artR, pfR, alertR, seekR, orgR, verR, postR, crawledR, orgNewR]) if (r.error) throw r.error;

  const sends = (sendsR.data ?? []) as { user_id: string; kind: string; result: string; sent_at: string }[];
  const emailOff = new Set((setR.data ?? []).filter((s) => s.email_notification === false).map((s) => s.user_id));
  const artist = new Map((artR.data ?? []).map((a) => [a.user_id as string, a as Record<string, unknown>]));
  const pfCount = new Map<string, number>();
  for (const p of pfR.data ?? []) pfCount.set(p.user_id, (pfCount.get(p.user_id) ?? 0) + 1);
  const hasAlert = new Set((alertR.data ?? []).map((a) => a.user_id));
  const hasSeeking = new Set((seekR.data ?? []).map((s) => s.artist_user_id));
  const org = new Map((orgR.data ?? []).map((o) => [o.user_id as string, o as { org_name: string; is_verified: boolean }]));
  const verif = new Map((verR.data ?? []).map((v) => [v.user_id as string, v.status as string]));
  const hasPosting = new Set((postR.data ?? []).map((p) => p.org_user_id));
  const weekByField = new Map<string, number>();
  let weekTotal = 0;
  for (const p of [...(crawledR.data ?? []), ...(orgNewR.data ?? [])]) {
    weekTotal++;
    if (p.field) weekByField.set(p.field, (weekByField.get(p.field) ?? 0) + 1);
  }

  let sent = 0, skipped = 0, failed = 0;
  const record = async (user_id: string, kind: string, result: "sent" | "skipped", detail?: string) => {
    if (DRY) return;
    const { error: e } = await db.from("email_sends").upsert({ user_id, kind, result, detail: detail ?? null, sent_at: new Date().toISOString() });
    if (e) console.error(`  기록 실패 ${kind}: ${e.message}`);
  };
  const deliver = async (u: (typeof users)[number], to: string, kind: string, tpl: T.EmailTemplate) => {
    console.log(`  → ${u.role === "organization" ? "기관" : "예술가"} ${mask(to)} · ${kind} · "${tpl.subject}"`);
    if (DRY) return true;
    const res = await sendEmail({ to, ...tpl });
    await sleep(600); // Resend 초당 2건 제한
    if (!res.ok) {
      failed++;
      console.error(`    발송 실패: ${res.error}`);
      return false;
    }
    sent++;
    await record(u.id, kind, "sent");
    return true;
  };

  for (const u of users) {
    const to = emails.get(u.id);
    if (!to) continue;
    const mine = sends.filter((s) => s.user_id === u.id);
    const days = Math.floor((now - new Date(u.created_at).getTime()) / DAY);
    const isOrg = u.role === "organization";
    const name = isOrg ? (org.get(u.id)?.org_name ?? u.display_name) : u.display_name;

    // 1) 환영 메일을 놓친 최근 가입자
    const welcome = mine.find((s) => s.kind === "welcome");
    if ((!welcome || welcome.result === "failed") && days <= WELCOME_CATCHUP_DAYS) {
      await deliver(u, to, "welcome", isOrg ? T.welcomeOrgEmail({ name }) : T.welcomeArtistEmail({ name }));
      continue;
    }

    // 2) 드립
    if (emailOff.has(u.id)) continue;
    const lastSent = Math.max(0, ...mine.filter((s) => s.result === "sent").map((s) => new Date(s.sent_at).getTime()));
    if (now - lastSent < MIN_GAP_DAYS * DAY) continue;
    const done = new Set(mine.map((s) => s.kind));
    const due = (isOrg ? ORG_STEPS : ARTIST_STEPS).filter((s) => s.day <= days && !done.has(s.kind)).reverse(); // 최근 단계부터
    if (!due.length) continue;

    const a = artist.get(u.id);
    const comp = artistCompleteness(a);
    const o = org.get(u.id);
    const pick = (kind: string): T.EmailTemplate | null => {
      switch (kind) {
        case "a1_profile_tips":
          return comp.percent === 100 && (pfCount.get(u.id) ?? 0) > 0 ? null : T.artistProfileTipsEmail({ name });
        case "a3_alert": {
          if (hasAlert.has(u.id)) return null;
          const f = typeof a?.field === "string" ? a.field : null;
          const n = f ? (weekByField.get(f) ?? 0) : weekTotal;
          return n > 0 ? T.artistAlertEmail({ fieldLabel: f ? fieldLabel(f) : null, weekCount: n }) : null;
        }
        case "a7_progress":
          return comp.percent === 100 ? null : T.artistProgressEmail(comp);
        case "a14_noticed": {
          const isPublic = a?.is_public === true;
          return isPublic && comp.percent === 100 ? null : T.artistGetNoticedEmail({ isPublic, completed: comp.percent === 100, hasPortfolio: (pfCount.get(u.id) ?? 0) > 0 });
        }
        case "a21_seeking":
          return hasSeeking.has(u.id) ? null : T.artistSeekingEmail();
        case "o1_verify":
          return o?.is_verified || ["submitted", "approved"].includes(verif.get(u.id) ?? "") ? null : T.orgVerifyEmail({ name });
        case "o3_first_posting":
          return hasPosting.has(u.id) ? null : T.orgFirstPostingEmail();
        case "o7_talent":
          return T.orgTalentEmail();
      }
      return null;
    };

    let delivered = false;
    for (const step of due) {
      if (delivered) {
        skipped++;
        await record(u.id, step.kind, "skipped", "밀린 단계");
        continue;
      }
      const tpl = pick(step.kind);
      if (!tpl) {
        skipped++;
        await record(u.id, step.kind, "skipped", "이미 함");
        continue;
      }
      delivered = await deliver(u, to, step.kind, tpl);
      if (!delivered) break; // 실패하면 나머지는 내일 다시
    }
  }
  console.log(`끝: 보냄 ${DRY ? "(미리보기)" : sent} · 건너뜀 ${skipped} · 실패 ${failed}`);
  if (failed && !sent) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
