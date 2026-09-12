"use server";
// 운영자 액션. 모두 requireAdmin 을 거치고, DB 쪽도 is_admin() RLS 가 한 번 더 막는다.
// 결과는 ?ok= / ?err= 로 화면에 알려 준다(supabase-js 는 예외를 던지지 않고 error 를 돌려준다).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Supa = NonNullable<Awaited<ReturnType<typeof createClient>>>;

/** 운영자 활동 로그. 실패해도 본 작업은 막지 않는다. */
async function log(supabase: Supa, adminId: string, action: string, targetType: string, targetId: string, detail?: Record<string, unknown>) {
  await supabase.from("admin_logs").insert({ admin_user_id: adminId, action, target_type: targetType, target_id: targetId, detail: detail ?? null });
}

function back(path: string, msg: { ok?: string; err?: string }): never {
  const usp = new URLSearchParams();
  if (msg.ok) usp.set("ok", msg.ok);
  if (msg.err) usp.set("err", msg.err);
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${usp.toString()}`);
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

// ───────────────────────── 기관 인증 ─────────────────────────
export async function setOrgVerified(userId: string, verified: boolean): Promise<void> {
  const me = await requireAdmin("/admin/orgs");
  const supabase = (await createClient())!;
  await supabase.from("org_profiles").update({ is_verified: verified }).eq("user_id", userId);
  await log(supabase, me.id, verified ? "org_verify" : "org_unverify", "org", userId);
  revalidatePath("/admin/orgs");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin");
}

// ───────────────────────── 회원 ─────────────────────────
export async function setUserStatus(userId: string, status: "active" | "suspended"): Promise<void> {
  const me = await requireAdmin("/admin/users");
  if (userId === me.id) return; // 자기 계정은 정지 불가
  const supabase = (await createClient())!;
  await supabase.from("profiles").update({ status }).eq("id", userId);
  await log(supabase, me.id, status === "suspended" ? "user_suspend" : "user_restore", "user", userId);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}

export async function setUserAdmin(userId: string, isAdmin: boolean): Promise<void> {
  const me = await requireAdmin("/admin/users");
  if (userId === me.id) return; // 자기 권한은 못 뺀다
  const supabase = (await createClient())!;
  await supabase.from("profiles").update({ is_admin: isAdmin }).eq("id", userId);
  await log(supabase, me.id, isAdmin ? "admin_grant" : "admin_revoke", "user", userId);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/settings");
}

/** 인재정보 공개를 운영자가 끈다(연락처 노출 등 부적절한 프로필). 다시 켜는 건 본인만. */
export async function adminUnpublishArtist(userId: string): Promise<void> {
  const me = await requireAdmin("/admin/users");
  const supabase = (await createClient())!;
  const { error } = await supabase.from("artist_profiles").update({ is_public: false }).eq("user_id", userId);
  if (error) back(`/admin/users/${userId}`, { err: error.message });
  await log(supabase, me.id, "artist_unpublish", "user", userId);
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/talents");
  back(`/admin/users/${userId}`, { ok: "인재정보 공개를 껐습니다." });
}

/** 회원 운영 메모(운영자끼리만 보임) */
export async function addUserNote(userId: string, formData: FormData): Promise<void> {
  const me = await requireAdmin("/admin/users");
  const body = str(formData, "body");
  if (!body) back(`/admin/users/${userId}`, { err: "메모 내용을 적어 주세요." });
  const supabase = (await createClient())!;
  const { error } = await supabase.from("admin_user_notes").insert({ user_id: userId, admin_user_id: me.id, body });
  if (error) back(`/admin/users/${userId}`, { err: error.message });
  await log(supabase, me.id, "user_note", "user", userId, { body: body.slice(0, 200) });
  revalidatePath(`/admin/users/${userId}`);
  back(`/admin/users/${userId}`, { ok: "메모를 남겼습니다." });
}

export async function deleteUserNote(userId: string, noteId: string): Promise<void> {
  await requireAdmin("/admin/users");
  const supabase = (await createClient())!;
  await supabase.from("admin_user_notes").delete().eq("id", noteId);
  revalidatePath(`/admin/users/${userId}`);
}

/** 운영팀 → 회원 알림(종 아이콘에 뜬다). 메시지 본문은 안 읽지만, 운영팀이 회원에게 말을 거는 통로. */
export async function sendAdminNotification(userId: string, formData: FormData): Promise<void> {
  const me = await requireAdmin("/admin/users");
  const title = str(formData, "title");
  const body = str(formData, "body");
  const link = str(formData, "link") || "/notifications";
  const returnTo = str(formData, "return_to") || `/admin/users/${userId}`;
  if (title.length < 2) back(returnTo, { err: "알림 제목을 적어 주세요." });
  const supabase = (await createClient())!;
  const { error } = await supabase.from("notifications").insert({ user_id: userId, kind: "admin", title, body: body || null, link_url: link });
  if (error) back(returnTo, { err: error.message });
  await log(supabase, me.id, "notify_user", "user", userId, { title, body: body.slice(0, 500), link });
  revalidatePath("/admin/sent");
  revalidatePath(`/admin/users/${userId}`);
  back(returnTo, { ok: "알림을 보냈습니다." });
}

// ───────────────────────── 신고 ─────────────────────────
export async function setReportStatus(id: string, status: "open" | "reviewed" | "closed"): Promise<void> {
  const me = await requireAdmin("/admin/reports");
  const supabase = (await createClient())!;
  await supabase.from("user_reports").update({ status }).eq("id", id);
  await log(supabase, me.id, "report_status", "report", id, { status });
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}

// ───────────────────────── 기관 공고 ─────────────────────────
function revalidatePostings() {
  revalidatePath("/admin/postings");
  revalidatePath("/jobs");
  revalidatePath("/auditions");
  revalidatePath("/");
}

export async function adminClosePosting(id: string): Promise<void> {
  const me = await requireAdmin("/admin/postings");
  const supabase = (await createClient())!;
  await supabase.from("org_postings").update({ status: "closed" }).eq("id", id);
  await log(supabase, me.id, "posting_close", "posting", id);
  revalidatePostings();
}

export async function adminDeletePosting(id: string): Promise<void> {
  const me = await requireAdmin("/admin/postings");
  const supabase = (await createClient())!;
  await supabase.from("org_postings").update({ status: "closed", deleted_at: new Date().toISOString() }).eq("id", id);
  await log(supabase, me.id, "posting_delete", "posting", id);
  revalidatePostings();
}

/** 내린 공고 복구(마감 상태로 되돌린다. 다시 모집중으로 여는 건 기관이 한다). */
export async function adminRestorePosting(id: string): Promise<void> {
  const me = await requireAdmin("/admin/postings");
  const supabase = (await createClient())!;
  await supabase.from("org_postings").update({ deleted_at: null }).eq("id", id);
  await log(supabase, me.id, "posting_restore", "posting", id);
  revalidatePostings();
}

// ───────────────────────── 수집 공고 ─────────────────────────
export async function hideCrawledPosting(id: string, formData: FormData): Promise<void> {
  const me = await requireAdmin("/admin/crawled");
  const reason = str(formData, "reason");
  const returnTo = str(formData, "return_to") || "/admin/crawled";
  const supabase = (await createClient())!;
  const { error } = await supabase.from("crawled_postings").update({ hidden_at: new Date().toISOString(), hidden_reason: reason || null }).eq("id", id);
  if (error) back(returnTo, { err: error.message });
  await log(supabase, me.id, "crawled_hide", "crawled", id, { reason });
  revalidatePostings();
  revalidatePath("/admin/crawled");
  back(returnTo, { ok: "공고를 숨겼습니다. 목록·홈에서 사라집니다." });
}

export async function unhideCrawledPosting(id: string, formData: FormData): Promise<void> {
  const me = await requireAdmin("/admin/crawled");
  const returnTo = str(formData, "return_to") || "/admin/crawled";
  const supabase = (await createClient())!;
  const { error } = await supabase.from("crawled_postings").update({ hidden_at: null, hidden_reason: null }).eq("id", id);
  if (error) back(returnTo, { err: error.message });
  await log(supabase, me.id, "crawled_unhide", "crawled", id);
  revalidatePostings();
  revalidatePath("/admin/crawled");
  back(returnTo, { ok: "숨김을 풀었습니다." });
}

export async function closeCrawledPosting(id: string, formData: FormData): Promise<void> {
  const me = await requireAdmin("/admin/crawled");
  const returnTo = str(formData, "return_to") || "/admin/crawled";
  const supabase = (await createClient())!;
  const { error } = await supabase.from("crawled_postings").update({ status: "closed" }).eq("id", id);
  if (error) back(returnTo, { err: error.message });
  await log(supabase, me.id, "crawled_close", "crawled", id);
  revalidatePostings();
  revalidatePath("/admin/crawled");
  back(returnTo, { ok: "마감 처리했습니다. 다음 수집에서 다시 발견되면 모집중으로 돌아올 수 있습니다." });
}

// ───────────────────────── 구직 글 ─────────────────────────
export async function adminRestoreSeeking(id: string): Promise<void> {
  const me = await requireAdmin("/admin/seeking");
  const supabase = (await createClient())!;
  await supabase.from("seeking_posts").update({ deleted_at: null }).eq("id", id);
  await log(supabase, me.id, "seeking_restore", "seeking", id);
  revalidatePath("/admin/seeking");
  revalidatePath("/seeking");
}

// ───────────────────────── 크롤 소스 ─────────────────────────
export async function setSourceActive(code: string, active: boolean): Promise<void> {
  const me = await requireAdmin("/admin/sources");
  const supabase = (await createClient())!;
  const { data, error } = await supabase.from("crawl_sources").update({ is_active: active }).eq("code", code).select("code");
  if (error) redirect(`/admin/sources?err=${encodeURIComponent(error.message)}`);
  if (!data || data.length === 0) redirect(`/admin/sources?err=${encodeURIComponent(`${code}: 바뀐 행이 없음(권한 또는 코드 확인)`)}`);
  await log(supabase, me.id, active ? "source_on" : "source_off", "source", code);
  revalidatePath("/admin/sources");
  revalidatePath("/admin");
  redirect(`/admin/sources?ok=${encodeURIComponent(code)}&on=${active ? 1 : 0}`);
}

// ───────────────────────── 고객 문의 ─────────────────────────
export async function updateContact(id: string, formData: FormData): Promise<void> {
  const me = await requireAdmin("/admin/support");
  const status = str(formData, "status");
  const reply = str(formData, "admin_reply");
  const memo = str(formData, "admin_memo");
  const returnTo = str(formData, "return_to") || "/admin/support";
  if (!["new", "in_progress", "replied", "closed"].includes(status)) back(returnTo, { err: "상태 값이 잘못됐습니다." });
  const supabase = (await createClient())!;
  const { data: before } = await supabase.from("contact_messages").select("admin_reply").eq("id", id).maybeSingle();
  const replyChanged = reply !== (before?.admin_reply ?? "");
  const patch: Record<string, unknown> = { status, admin_memo: memo || null };
  if (replyChanged) {
    patch.admin_reply = reply || null;
    if (reply) {
      patch.replied_by = me.id;
      patch.replied_at = new Date().toISOString();
      if (status === "new" || status === "in_progress") patch.status = "replied";
    }
  }
  const { error } = await supabase.from("contact_messages").update(patch).eq("id", id);
  if (error) back(returnTo, { err: error.message });
  await log(supabase, me.id, "contact_update", "contact", id, { status: patch.status, replied: replyChanged && Boolean(reply) });
  revalidatePath("/admin/support");
  revalidatePath("/support");
  revalidatePath("/admin");
  back(returnTo, { ok: replyChanged && reply ? "답변을 저장했습니다. 회원 문의면 알림이 갑니다." : "저장했습니다." });
}

// ───────────────────────── 공지사항 ─────────────────────────
function revalidateNotices(id?: string) {
  revalidatePath("/admin/notices");
  revalidatePath("/notices");
  revalidatePath("/");
  if (id) revalidatePath(`/notices/${id}`);
}

export async function saveNotice(id: string | null, formData: FormData): Promise<void> {
  const me = await requireAdmin("/admin/notices");
  const title = str(formData, "title");
  const body = str(formData, "body");
  const kind = str(formData, "kind") || "notice";
  const isPinned = formData.get("is_pinned") === "on";
  const isPublished = formData.get("is_published") === "on";
  const returnTo = id ? `/admin/notices/${id}` : "/admin/notices/new";
  if (title.length < 2) back(returnTo, { err: "제목은 2자 이상 적어 주세요." });
  if (body.length < 1) back(returnTo, { err: "본문을 적어 주세요." });
  const supabase = (await createClient())!;
  const row: Record<string, unknown> = { title, body, kind, is_pinned: isPinned, is_published: isPublished };
  if (id) {
    const { data: before } = await supabase.from("site_notices").select("published_at").eq("id", id).maybeSingle();
    if (isPublished && !before?.published_at) row.published_at = new Date().toISOString();
    const { error } = await supabase.from("site_notices").update(row).eq("id", id);
    if (error) back(returnTo, { err: error.message });
    await log(supabase, me.id, "notice_update", "notice", id, { title });
    revalidateNotices(id);
    back(`/admin/notices/${id}`, { ok: "저장했습니다." });
  }
  row.created_by = me.id;
  if (isPublished) row.published_at = new Date().toISOString();
  const { data, error } = await supabase.from("site_notices").insert(row).select("id").single();
  if (error || !data) back(returnTo, { err: error?.message ?? "저장 실패" });
  await log(supabase, me.id, "notice_create", "notice", data.id, { title });
  revalidateNotices(data.id);
  back(`/admin/notices/${data.id}`, { ok: "공지를 만들었습니다." });
}

export async function toggleNoticePublished(id: string, publish: boolean): Promise<void> {
  const me = await requireAdmin("/admin/notices");
  const supabase = (await createClient())!;
  const patch: Record<string, unknown> = { is_published: publish };
  if (publish) patch.published_at = new Date().toISOString();
  await supabase.from("site_notices").update(patch).eq("id", id);
  await log(supabase, me.id, "notice_update", "notice", id, { is_published: publish });
  revalidateNotices(id);
}

export async function deleteNotice(id: string): Promise<void> {
  const me = await requireAdmin("/admin/notices");
  const supabase = (await createClient())!;
  const { error } = await supabase.from("site_notices").delete().eq("id", id);
  if (error) back(`/admin/notices/${id}`, { err: error.message });
  await log(supabase, me.id, "notice_delete", "notice", id);
  revalidateNotices(id);
  back("/admin/notices", { ok: "공지를 삭제했습니다." });
}

// ───────────────────────── 채널 단축링크(/r/{code}) ─────────────────────────
export async function saveChannel(formData: FormData): Promise<void> {
  const me = await requireAdmin("/admin/traffic");
  const code = str(formData, "code").toLowerCase();
  const name = str(formData, "name");
  const memberCount = parseInt(str(formData, "member_count"), 10);
  const utmSource = str(formData, "utm_source") || "kakao";
  const utmMedium = str(formData, "utm_medium") || "community";
  const utmCampaign = str(formData, "utm_campaign") || "room";
  const note = str(formData, "note");
  if (!/^[a-z0-9]{2,12}$/.test(code)) back("/admin/traffic", { err: "코드는 영문 소문자·숫자 2~12자로 적어 주세요. (예: gugak1)" });
  if (name.length < 1) back("/admin/traffic", { err: "채널 이름을 적어 주세요." });
  const supabase = (await createClient())!;
  const { data: exists } = await supabase.from("referral_channels").select("code").eq("code", code).maybeSingle();
  const row = { code, name, member_count: Number.isFinite(memberCount) ? memberCount : null, utm_source: utmSource, utm_medium: utmMedium, utm_campaign: utmCampaign, note: note || null };
  const { error } = exists
    ? await supabase.from("referral_channels").update(row).eq("code", code)
    : await supabase.from("referral_channels").insert({ ...row, created_by: me.id });
  if (error) back("/admin/traffic", { err: error.message });
  await log(supabase, me.id, exists ? "channel_update" : "channel_create", "channel", code, { name });
  revalidatePath("/admin/traffic");
  back("/admin/traffic", { ok: exists ? `${code} 를 수정했습니다.` : `링크를 만들었습니다: /r/${code}` });
}

export async function setChannelActive(code: string, active: boolean): Promise<void> {
  const me = await requireAdmin("/admin/traffic");
  const supabase = (await createClient())!;
  await supabase.from("referral_channels").update({ is_active: active }).eq("code", code);
  await log(supabase, me.id, "channel_update", "channel", code, { is_active: active });
  revalidatePath("/admin/traffic");
}

export async function deleteChannel(code: string): Promise<void> {
  const me = await requireAdmin("/admin/traffic");
  const supabase = (await createClient())!;
  const { error } = await supabase.from("referral_channels").delete().eq("code", code);
  if (error) back("/admin/traffic", { err: error.message });
  await log(supabase, me.id, "channel_delete", "channel", code);
  revalidatePath("/admin/traffic");
  back("/admin/traffic", { ok: `${code} 를 삭제했습니다(클릭 기록도 함께 지워집니다).` });
}

// ───────────────────────── 시스템 ─────────────────────────
/** 보관 기간이 지난 지원서의 개인정보(스냅샷·지원 메시지)를 지운다. */
export async function purgeExpiredApplications(): Promise<void> {
  const me = await requireAdmin("/admin/settings");
  const supabase = (await createClient())!;
  const { data, error } = await supabase.rpc("admin_purge_applications");
  if (error) back("/admin/settings", { err: error.message });
  await log(supabase, me.id, "purge_applications", "system", "applications", { count: data });
  revalidatePath("/admin/settings");
  back("/admin/settings", { ok: `만료 지원서 ${Number(data ?? 0)}건의 개인정보를 지웠습니다.` });
}
