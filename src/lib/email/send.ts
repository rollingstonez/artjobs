// Resend 발송 — SDK 없이 HTTP API 를 바로 부른다(Next 앱과 scripts/email/drip.ts 가 함께 쓴다. import 없음).
// - 키(RESEND_API_KEY)가 없으면 보내지 않고 { ok: false } 를 돌려준다. 가입 등 본 작업은 절대 막지 않는다.
// - 발신 주소 noreply@artjobs.kr 는 Resend 에서 artjobs.kr 도메인 인증(DNS: SPF·DKIM)이 끝나야 나간다.
//   인증 전에는 "domain is not verified" 오류가 돌아온다.

export const FROM_ADDRESS = "아트잡스 <noreply@artjobs.kr>";

export type SendResult = { ok: true; id: string | null } | { ok: false; error: string };

export async function sendEmail({ to, subject, html, replyTo }: { to: string; subject: string; html: string; replyTo?: string }): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY 없음" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) return { ok: false, error: `${res.status} ${body.name ?? ""} ${body.message ?? ""}`.trim() };
    return { ok: true, id: body.id ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
