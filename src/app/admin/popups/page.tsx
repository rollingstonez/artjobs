import Link from "next/link";
import PopupPreview from "@/components/admin/PopupPreview";
import { Badge, Card, Empty, ErrorNote, Flash, PageHeader, btn } from "@/components/admin/ui";
import { Field, inputClass, primaryBtn, textareaClass } from "@/components/forms/ui";
import { POPUP_TARGET, popupTargetLabel } from "@/lib/admin/labels";
import { sp } from "@/lib/admin/queries";
import { deletePopup, savePopup, togglePopupPublished } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime, toDatetimeLocalKst } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Row = {
  id: string; title: string; body: string | null; image_url: string | null; link_url: string | null; target: string;
  starts_at: string | null; ends_at: string | null; display_order: number; is_published: boolean; created_at: string; updated_at: string;
};

/** 지금 노출 중인지 판정(렌더 밖 헬퍼 — 시각 계산을 컴포넌트 안에서 하지 않는다). */
function liveState(p: Row): "live" | "waiting" | "ended" | "draft" {
  if (!p.is_published) return "draft";
  const now = Date.now();
  if (p.starts_at && new Date(p.starts_at).getTime() > now) return "waiting";
  if (p.ends_at && new Date(p.ends_at).getTime() < now) return "ended";
  return "live";
}

export default async function AdminPopupsPage({ searchParams }: PageProps<"/admin/popups">) {
  await requireAdmin("/admin/popups");
  const s = await searchParams;
  const editId = sp(s.edit);
  const supabase = (await createClient())!;
  const { data, error } = await supabase.from("popups").select("*").order("display_order").order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];
  const missing = Boolean(error && /does not exist|could not find|schema cache/i.test(error.message));
  const editing = editId ? rows.find((r) => r.id === editId) ?? null : null;
  const liveCount = rows.filter((r) => liveState(r) === "live").length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="첫 화면 팝업"
        count={rows.length}
        description={<>홈(artjobs.kr)에 들어온 사람에게 안내창을 띄웁니다. 공지사항이 찾아와서 읽는 곳이라면, 팝업은 먼저 보여 주는 것입니다. 방문자는 <b>오늘 하루 안 보기</b>를 누를 수 있고, 그 기록은 그 사람 브라우저에만 남습니다. 조건에 맞는 팝업이 여럿이면 <b>순서</b>가 작은 것 하나만 뜹니다.</>}
        actions={liveCount > 0 ? <Badge tone="green">지금 노출 중 {liveCount}</Badge> : <Badge tone="stone">지금 뜨는 팝업 없음</Badge>}
      />
      <Flash ok={sp(s.ok) || null} err={sp(s.err) || null} />
      {error && <ErrorNote message={error.message} missing={missing} />}

      {/* 만들기 · 수정 폼 */}
      <Card
        title={editing ? `팝업 수정 — ${editing.title}` : "새 팝업 만들기"}
        sub={editing ? undefined : "공개를 켜지 않으면 저장만 되고 홈에는 뜨지 않습니다."}
        action={editing ? <Link href="/admin/popups" className={btn.secondary}>새로 만들기로</Link> : undefined}
      >
        <form action={savePopup.bind(null, editing?.id ?? null)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <Field label="제목" hint="이미지만 넣어도 제목은 필요합니다(화면 읽기 도구가 읽습니다).">
              <input name="title" required minLength={2} maxLength={120} defaultValue={editing?.title ?? ""} className={inputClass} />
            </Field>
            <Field label="대상">
              <select name="target" defaultValue={editing?.target ?? "all"} className={inputClass}>
                {POPUP_TARGET.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="본문 (선택)" hint="빈 줄로 문단을 나눕니다.">
            <textarea name="body" rows={4} defaultValue={editing?.body ?? ""} className={textareaClass} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="이미지 주소 (선택)" hint="http:// 또는 https:// 로 시작하는 주소. 넣으면 이미지가 위에 크게 들어갑니다.">
              <input name="image_url" type="url" defaultValue={editing?.image_url ?? ""} placeholder="https://..." className={inputClass} />
            </Field>
            <Field label="누르면 갈 주소 (선택)" hint="사이트 안이면 /jobs 처럼, 밖이면 https:// 로 적습니다.">
              <input name="link_url" defaultValue={editing?.link_url ?? ""} placeholder="/notices" className={inputClass} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="노출 시작 (선택)" hint="비우면 바로 시작">
              <input name="starts_at" type="datetime-local" defaultValue={toDatetimeLocalKst(editing?.starts_at)} className={inputClass} />
            </Field>
            <Field label="노출 종료 (선택)" hint="비우면 끌 때까지">
              <input name="ends_at" type="datetime-local" defaultValue={toDatetimeLocalKst(editing?.ends_at)} className={inputClass} />
            </Field>
            <Field label="순서" hint="작은 숫자가 먼저">
              <input name="display_order" type="number" defaultValue={editing?.display_order ?? 0} className={inputClass} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_published" defaultChecked={editing?.is_published ?? false} className="h-4 w-4" />
            공개 (홈에 띄우기)
          </label>
          <p className="text-xs text-stone-500">시간은 한국시간 기준으로 저장됩니다.</p>
          <button className={primaryBtn}>{editing ? "저장" : "팝업 만들기"}</button>
        </form>
      </Card>

      {/* 목록 */}
      {!error && rows.length === 0 ? (
        <Empty icon="🪧">아직 만든 팝업이 없습니다. 위에서 첫 팝업을 만들어 보세요.</Empty>
      ) : (
        <ul className="space-y-2">
          {rows.map((p) => {
            const state = liveState(p);
            return (
              <li key={p.id} className={`rounded-2xl border bg-white p-4 ${state === "live" ? "border-emerald-200" : "border-stone-200"}`}>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-xs text-stone-400">#{p.display_order}</span>
                  {state === "live" && <Badge tone="green">🔴 지금 노출 중</Badge>}
                  {state === "waiting" && <Badge tone="sky">시작 전</Badge>}
                  {state === "ended" && <Badge tone="stone">기간 지남</Badge>}
                  {state === "draft" && <Badge tone="stone">비공개</Badge>}
                  <Badge tone="violet">{popupTargetLabel(p.target)}</Badge>
                  {p.image_url && <Badge tone="amber">🖼️ 이미지</Badge>}
                  <span className="font-bold">{p.title}</span>
                </div>
                {p.body && <p className="mt-1 line-clamp-2 text-sm text-stone-600">{p.body}</p>}
                <p className="mt-1 text-xs text-stone-500">
                  기간 {p.starts_at ? fmtDateTime(p.starts_at) : "제한 없음"} ~ {p.ends_at ? fmtDateTime(p.ends_at) : "제한 없음"}
                  {p.link_url && <> · 링크 {p.link_url}</>} · 수정 {fmtDateTime(p.updated_at)}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <PopupPreview
                    popup={{ id: p.id, title: p.title, body: p.body, image_url: p.image_url, link_url: p.link_url }}
                    note={`대상: ${popupTargetLabel(p.target)}`}
                    className={btn.secondary}
                  />
                  <form action={togglePopupPublished.bind(null, p.id, !p.is_published)}>
                    <button className={p.is_published ? btn.secondary : btn.successSolid}>{p.is_published ? "비공개로" : "공개하기"}</button>
                  </form>
                  <Link href={`/admin/popups?edit=${p.id}`} className={btn.secondary}>수정</Link>
                  <form action={deletePopup.bind(null, p.id)}><button className={btn.danger}>삭제</button></form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
