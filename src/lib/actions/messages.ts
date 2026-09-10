"use server";
// 메신저: 대화 시작 · 메시지 보내기 · 읽음 · 차단 · 신고. 알림 읽음 처리도 여기.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { splitPostingId } from "@/lib/postings";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

/** 상대(예술가 또는 기관)와의 대화방을 찾거나 만들고 그리로 이동. */
export async function startConversation(otherUserId: string, postingId?: string): Promise<void> {
  const me = await requireUser("/messages");
  const supabase = (await createClient())!;
  const { data: other } = await supabase.from("profiles").select("id, role").eq("id", otherUserId).maybeSingle();
  if (!other || other.role === me.profile.role) redirect("/messages");

  const artist = me.profile.role === "artist" ? me.id : otherUserId;
  const org = me.profile.role === "organization" ? me.id : otherUserId;

  if (me.profile.role === "organization") {
    const { data: a } = await supabase.from("artist_profiles").select("allow_messages").eq("user_id", artist).maybeSingle();
    if (a && a.allow_messages === false) redirect(`/talents/${artist}?blocked=1`);
  }

  const { data: conv, error } = await supabase
    .from("conversations")
    .upsert(
      {
        artist_user_id: artist,
        org_user_id: org,
        ...(postingId
          ? { posting_source: splitPostingId(postingId).source, posting_id: splitPostingId(postingId).rawId }
          : {}),
      },
      { onConflict: "artist_user_id,org_user_id" },
    )
    .select("id")
    .single();
  if (error || !conv) redirect("/messages?error=blocked");
  redirect(`/messages/${conv.id}`);
}

export async function sendMessage(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const conversationId = String(fd.get("conversation_id") ?? "");
  const me = await requireUser(`/messages/${conversationId}`);
  const supabase = (await createClient())!;
  const body = String(fd.get("body") ?? "").trim();
  if (!body) return { ok: false, error: "내용을 적어주세요." };
  if (body.length > 4000) return { ok: false, error: "메시지는 4000자까지입니다." };
  const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_user_id: me.id, body });
  if (error) return { ok: false, error: "메시지를 보낼 수 없습니다. 차단되었거나 대화방이 없습니다." };
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return { ok: true };
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const me = await requireUser(`/messages/${conversationId}`);
  const supabase = (await createClient())!;
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_user_id", me.id)
    .is("read_at", null);
}

export async function blockUser(userId: string): Promise<void> {
  const me = await requireUser("/messages");
  const supabase = (await createClient())!;
  await supabase.from("user_blocks").upsert({ blocker_user_id: me.id, blocked_user_id: userId }, { onConflict: "blocker_user_id,blocked_user_id" });
  revalidatePath("/messages");
  redirect("/messages");
}

export async function reportUser(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const me = await requireUser("/messages");
  const supabase = (await createClient())!;
  const reported = String(fd.get("reported_user_id") ?? "");
  const category = String(fd.get("category") ?? "").trim();
  const detail = String(fd.get("detail") ?? "").trim();
  if (!reported || !category) return { ok: false, error: "신고 사유를 골라주세요." };
  const { error } = await supabase.from("user_reports").insert({
    reporter_user_id: me.id,
    reported_user_id: reported,
    context_type: String(fd.get("context_type") ?? "message"),
    context_id: String(fd.get("context_id") ?? "") || null,
    category,
    detail: detail || null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function markNotificationsRead(): Promise<void> {
  const me = await requireUser("/notifications");
  const supabase = (await createClient())!;
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", me.id)
    .eq("is_read", false);
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}
