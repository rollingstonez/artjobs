import DeleteAccount from "./DeleteAccount";
import SettingsForm from "./SettingsForm";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const me = await requireUser("/me/settings");
  const supabase = (await createClient())!;
  const { data } = await supabase.from("user_settings").select("*").eq("user_id", me.id).maybeSingle();
  const s = data ?? { message_notification: true, new_posting_notification: true, application_notification: true, email_notification: true };
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">설정</h2>
      <p className="text-sm text-stone-600">로그인 이메일: {me.email}</p>
      <SettingsForm settings={s} />
      <p className="text-xs text-stone-500">
        이메일 알림은 준비 중입니다. 지금은 사이트 안 알림(종 아이콘)으로만 갑니다.
      </p>
      <DeleteAccount isAdmin={me.profile.is_admin} />
    </div>
  );
}
