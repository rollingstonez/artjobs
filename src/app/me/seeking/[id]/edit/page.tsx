import { notFound } from "next/navigation";
import SeekingForm from "@/components/forms/SeekingForm";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { SeekingPost } from "@/types/account";

export default async function EditSeekingPage({ params }: PageProps<"/me/seeking/[id]/edit">) {
  const { id } = await params;
  const me = await requireUser(`/me/seeking/${id}/edit`, "artist");
  const supabase = (await createClient())!;
  const { data } = await supabase.from("seeking_posts").select("*").eq("id", id).eq("artist_user_id", me.id).maybeSingle();
  if (!data) notFound();
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">구직 글 수정</h2>
      <SeekingForm post={data as SeekingPost} profile={me.artist} />
    </div>
  );
}
