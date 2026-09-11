import SeekingForm from "@/components/forms/SeekingForm";
import { requireUser } from "@/lib/auth";

export default async function NewSeekingPage() {
  const me = await requireUser("/me/seeking/new", "artist");
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">구직 글 올리기</h2>
      <SeekingForm post={null} profile={me.artist} />
    </div>
  );
}
