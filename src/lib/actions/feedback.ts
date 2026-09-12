"use server";
// 의견 올리기(/feedback) 제출. 로그인 여부와 무관하게 남길 수 있다.
//   · 로그인 회원: 이름을 계정 표시 이름으로 쓰고 user_id 를 붙인다(답글 알림을 받는다).
//   · 비로그인: 이름만 받고 연락처는 받지 않는다.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { FEEDBACK_CATEGORY } from "@/lib/admin/labels";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function submitFeedback(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "idea");
  const content = String(formData.get("content") ?? "").trim();
  const honey = String(formData.get("website") ?? ""); // 봇 방지용 숨은 칸
  const fail = (msg: string): never => redirect(`/feedback?err=${encodeURIComponent(msg)}`);

  if (honey) redirect("/feedback?ok=1");
  if (!FEEDBACK_CATEGORY.some((c) => c.code === category)) fail("의견 종류를 골라 주세요.");
  if (content.length < 5 || content.length > 500) fail("의견은 5~500자로 적어 주세요.");

  const supabase = await createClient();
  if (!supabase) fail("지금은 의견을 받을 수 없습니다. 잠시 뒤 다시 시도해 주세요.");
  const me = await getCurrentUser();
  const finalName = me ? me.profile.display_name : name;
  if (!finalName || finalName.length > 20) fail("이름(또는 활동명)을 20자 이내로 적어 주세요.");

  const { error } = await supabase!.from("feedback").insert({ user_id: me?.id ?? null, name: finalName, category, content });
  if (error) fail(error.message.includes("5건") ? "오늘 남길 수 있는 의견은 5건까지입니다. 내일 다시 남겨 주세요." : `남기지 못했습니다: ${error.message}`);
  revalidatePath("/feedback");
  redirect("/feedback?ok=1");
}
