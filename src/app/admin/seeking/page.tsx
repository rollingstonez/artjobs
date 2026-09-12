import Link from "next/link";
import { Badge, Chip, ChipDivider, ChipRow, Empty, PageHeader, btn } from "@/components/admin/ui";
import { sp } from "@/lib/admin/queries";
import { adminRestoreSeeking } from "@/lib/actions/admin";
import { adminHideSeeking } from "@/lib/actions/seeking";
import { requireAdmin } from "@/lib/auth";
import { fmtDate, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { SeekingPost } from "@/types/account";
import { FIELDS, fieldLabel, roleLabel } from "@/types/job";

// 연락처가 들어간 글을 빨리 찾기 위한 단순 탐지(전화번호·이메일·카카오 아이디 표기).
const CONTACT_RE = /(01[016789][-.\s]?\d{3,4}[-.\s]?\d{4})|([\w.+-]+@[\w-]+\.[\w.]+)|(카톡|카카오톡|kakao)\s*(id|아이디)?\s*[:：]?\s*\S{3,}/i;

export default async function AdminSeekingPage({ searchParams }: PageProps<"/admin/seeking">) {
  await requireAdmin("/admin/seeking");
  const s = await searchParams;
  const show = ["expired", "closed", "hidden", "all", "flagged"].includes(sp(s.show)) ? sp(s.show) : "live";
  const field = FIELDS.some((f) => f.code === sp(s.field)) ? sp(s.field) : "";
  const q = sp(s.q);
  const supabase = (await createClient())!;
  const today = new Date().toISOString().slice(0, 10);

  let query = supabase.from("seeking_posts").select("*").order("created_at", { ascending: false }).limit(300);
  if (show === "live") query = query.eq("status", "open").is("deleted_at", null).gte("expires_at", today);
  if (show === "expired") query = query.eq("status", "open").is("deleted_at", null).lt("expires_at", today);
  if (show === "closed") query = query.eq("status", "closed").is("deleted_at", null);
  if (show === "hidden") query = query.not("deleted_at", "is", null);
  if (show === "flagged") query = query.is("deleted_at", null);
  if (field) query = query.eq("field", field);
  if (q) query = query.or(`title.ilike.%${q}%,display_name.ilike.%${q}%,body.ilike.%${q}%`);
  const { data } = await query;
  let rows = (data ?? []) as SeekingPost[];
  const flagged = (p: SeekingPost) => CONTACT_RE.test(`${p.title}\n${p.body}`);
  if (show === "flagged") rows = rows.filter(flagged);
  const href = (patch: Record<string, string>) => {
    const usp = new URLSearchParams({ show, ...(field ? { field } : {}), ...(q ? { q } : {}), ...patch });
    for (const [k, v] of Object.entries(patch)) if (!v) usp.delete(k);
    return `/admin/seeking?${usp.toString()}`;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="구직 글"
        count={rows.length}
        description={<>예술가가 올린 구직 글입니다. 연락처(전화·이메일·카톡 아이디)가 적혀 있거나 광고·부적절한 글은 <b>내리기</b>로 숨깁니다(작성자에게는 내려간 상태로 보이고, 복구할 수 있습니다). <b>🚩 연락처 의심</b> 필터는 전화번호·이메일 패턴이 보이는 글만 추려 줍니다 — 확실하지 않으니 직접 읽고 판단하세요.</>}
        actions={
          <form className="flex gap-1">
            <input type="hidden" name="show" value={show} />
            {field && <input type="hidden" name="field" value={field} />}
            <input name="q" defaultValue={q} placeholder="제목·이름·본문" className="h-8 w-40 rounded-lg border border-stone-300 px-2 text-xs" />
            <button className="h-8 rounded-lg bg-stone-900 px-3 text-xs font-semibold text-white">검색</button>
          </form>
        }
      />
      <ChipRow>
        <Chip href={href({ show: "live" })} active={show === "live"}>공개 중</Chip>
        <Chip href={href({ show: "flagged" })} active={show === "flagged"} tone="warn">🚩 연락처 의심</Chip>
        <Chip href={href({ show: "expired" })} active={show === "expired"}>기간 만료</Chip>
        <Chip href={href({ show: "closed" })} active={show === "closed"}>작성자가 닫음</Chip>
        <Chip href={href({ show: "hidden" })} active={show === "hidden"}>내림</Chip>
        <Chip href={href({ show: "all" })} active={show === "all"}>전체</Chip>
        <ChipDivider />
        <Chip href={href({ field: "" })} active={!field}>전 분야</Chip>
        {FIELDS.map((f) => <Chip key={f.code} href={href({ field: f.code })} active={field === f.code}>{f.label}</Chip>)}
      </ChipRow>
      {rows.length === 0 ? (
        <Empty icon="🙋">해당하는 구직 글이 없습니다.</Empty>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
          {rows.map((p) => {
            const live = p.status === "open" && !p.deleted_at && p.expires_at >= today;
            const flag = flagged(p);
            return (
              <li key={p.id} className={`px-4 py-3 text-sm ${flag && !p.deleted_at ? "bg-red-50/40" : ""}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/seeking/${p.id}`} className="block truncate font-semibold hover:underline">{p.title}</Link>
                    <p className="text-xs text-stone-500">
                      <Link href={`/admin/users/${p.artist_user_id}`} className="font-semibold text-stone-700 hover:underline">{p.display_name}</Link>
                      {p.career_years != null && <> · 경력 {p.career_years}년</>} · {fieldLabel(p.field) ?? "분야 미정"} · {p.roles.map((r) => roleLabel(r) ?? r).join("·") || "직무 미정"} · {p.region ?? "전국"} · 올림 {timeAgo(p.created_at)} · ~{fmtDate(p.expires_at)} · 조회 {p.view_count}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-stone-600">{p.body}</p>
                  </div>
                  {flag && !p.deleted_at && <Badge tone="red" title="전화번호·이메일·카톡 아이디로 보이는 문자열이 있습니다">🚩 연락처 의심</Badge>}
                  {p.deleted_at ? <Badge tone="red">내림</Badge> : live ? <Badge tone="green">공개 중</Badge> : p.status === "closed" ? <Badge>닫음</Badge> : <Badge tone="stone">기간 만료</Badge>}
                  {p.deleted_at ? (
                    <form action={adminRestoreSeeking.bind(null, p.id)}><button className={btn.success}>복구</button></form>
                  ) : (
                    <form action={adminHideSeeking.bind(null, p.id)}><button className={btn.danger}>내리기</button></form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
