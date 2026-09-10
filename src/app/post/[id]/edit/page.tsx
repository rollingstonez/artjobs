import { notFound } from "next/navigation";
import PostingForm, { type PostingFormValues } from "@/components/forms/PostingForm";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: PageProps<"/post/[id]/edit">) {
  const { id } = await params;
  const me = await requireUser(`/post/${id}/edit`, "organization");
  const supabase = (await createClient())!;
  const { data } = await supabase.from("org_postings").select("*").eq("id", id).eq("org_user_id", me.id).is("deleted_at", null).maybeSingle();
  if (!data) notFound();
  const v = (k: string) => (data[k] == null ? "" : String(data[k]));
  const initial: PostingFormValues = {
    id, board: v("board"), field: v("field"), genre: v("genre"), role: v("role"), title: v("title"), employment_type: v("employment_type"), employment_raw: v("employment_raw"),
    region: v("region"), address: v("address"), salary: v("salary"), recruit_count: v("recruit_count"), apply_start: v("apply_start"), apply_end: v("apply_end"),
    work_start: v("work_start"), work_end: v("work_end"), apply_method: v("apply_method") || "messenger", apply_url: v("apply_url"), required_docs: v("required_docs"), description: v("description"), status: v("status"),
  };
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 md:px-6">
      <div className="py-8">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">공고 수정</h1>
      </div>
      <PostingForm initial={initial} />
    </main>
  );
}
