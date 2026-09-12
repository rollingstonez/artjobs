import { Field, inputClass, primaryBtn, textareaClass } from "@/components/forms/ui";
import { NOTICE_KIND } from "@/lib/admin/labels";

export interface NoticeValues {
  title: string;
  body: string;
  kind: string;
  is_pinned: boolean;
  is_published: boolean;
}

/** 공지 작성·수정 폼(서버 컴포넌트). action 은 saveNotice.bind(null, id|null). */
export default function NoticeForm({ action, values, submitLabel = "저장" }: { action: (formData: FormData) => Promise<void>; values: NoticeValues; submitLabel?: string }) {
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Field label="종류">
          <select name="kind" defaultValue={values.kind} className={inputClass}>
            {NOTICE_KIND.map((k) => <option key={k.code} value={k.code}>{k.label}</option>)}
          </select>
        </Field>
        <Field label="제목"><input name="title" required minLength={2} maxLength={120} defaultValue={values.title} className={inputClass} /></Field>
      </div>
      <Field label="본문" hint="빈 줄로 문단을 나눕니다. 주소(https://…)는 자동으로 링크가 됩니다.">
        <textarea name="body" required rows={14} defaultValue={values.body} className={textareaClass} />
      </Field>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="is_published" defaultChecked={values.is_published} className="h-4 w-4" /> 공개(회원·방문자에게 보임)</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="is_pinned" defaultChecked={values.is_pinned} className="h-4 w-4" /> 상단 고정</label>
      </div>
      <button className={primaryBtn}>{submitLabel}</button>
    </form>
  );
}
