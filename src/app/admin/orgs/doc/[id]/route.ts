// 기관 인증 서류 열기 — 운영자만. 비공개 버킷이라 5분짜리 서명 링크를 만들어 넘긴다.
// 화면에 서명 링크를 미리 박아 두면 금방 만료되므로, 누를 때마다 새로 만든다.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin("/admin/orgs");
  const supabase = (await createClient())!;
  const { data: v } = await supabase.from("org_verifications").select("doc_path").eq("user_id", id).maybeSingle();
  if (!v?.doc_path) return new NextResponse("제출된 서류가 없습니다.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const { data, error } = await supabase.storage.from("org-docs").createSignedUrl(v.doc_path, 300);
  if (error || !data) return new NextResponse(`서류를 열지 못했습니다: ${error?.message ?? ""}`, { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } });
  return NextResponse.redirect(data.signedUrl);
}
