// 심사 결과 CSV 다운로드. 엑셀에서 바로 열리도록 UTF-8 BOM 을 붙인다.
import { NextResponse } from "next/server";
import { loadWorkbench, workbenchToCsv } from "@/lib/hiring";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/me/postings/[id]/review/export">) {
  const { id } = await ctx.params;
  const wb = await loadWorkbench(id);
  if (!wb) return new NextResponse("권한이 없거나 공고가 없습니다.", { status: 404 });
  const csv = workbenchToCsv(wb);
  const safeTitle = wb.access.posting.title.replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 60);
  const filename = encodeURIComponent(`심사표_${safeTitle}_${new Date().toISOString().slice(0, 10)}.csv`);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      "Cache-Control": "no-store",
    },
  });
}
