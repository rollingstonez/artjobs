"use server";
// 고객 문의(/support) 제출. 로그인 여부와 무관하게 보낼 수 있고, 로그인했으면 user_id 를 붙여 답변 알림을 받는다.
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CONTACT_CATEGORY } from "@/lib/admin/labels";

export async function submitContact(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const category = String(formData.get("category") ?? "other");
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const honey = String(formData.get("website") ?? ""); // 봇 방지용 숨은 칸
  const fail = (msg: string): never => redirect(`/support?err=${encodeURIComponent(msg)}`);
  if (honey) redirect("/support?ok=1");
  if (name.length < 1) fail("이름을 적어 주세요.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("답변받을 이메일 주소를 정확히 적어 주세요.");
  if (!CONTACT_CATEGORY.some((c) => c.code === category)) fail("문의 유형을 골라 주세요.");
  if (subject.length < 2 || subject.length > 120) fail("제목은 2~120자로 적어 주세요.");
  if (body.length < 5 || body.length > 4000) fail("내용은 5~4000자로 적어 주세요.");
  const supabase = await createClient();
  if (!supabase) fail("지금은 문의를 받을 수 없습니다. barohaus.com@gmail.com 로 메일 주세요.");
  const me = await getCurrentUser();
  const { error } = await supabase!.from("contact_messages").insert({ user_id: me?.id ?? null, name, email, category, subject, body });
  if (error) fail(`보내지 못했습니다: ${error.message}`);
  redirect("/support?ok=1");
}
