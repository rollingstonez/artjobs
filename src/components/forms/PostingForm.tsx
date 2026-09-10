"use client";

import { useActionState, useState } from "react";
import type { ActionResult } from "@/lib/actions/auth";
import { createOrgPosting, updateOrgPosting } from "@/lib/actions/postings";
import { SELECTABLE_REGIONS } from "@/lib/location";
import { BOARDS, EMPLOYMENT_TYPES, FIELDS, ROLES, genresOf } from "@/types/job";
import { Field, Notice, inputClass, primaryBtn, textareaClass } from "./ui";

export type PostingFormValues = {
  id?: string; board: string; field: string; genre: string; role: string; title: string; employment_type: string; employment_raw: string;
  region: string; address: string; salary: string; recruit_count: string; apply_start: string; apply_end: string; work_start: string; work_end: string;
  apply_method: string; apply_url: string; required_docs: string; description: string; status: string;
};

export const EMPTY_POSTING: PostingFormValues = {
  board: "job", field: "", genre: "", role: "", title: "", employment_type: "", employment_raw: "", region: "", address: "", salary: "",
  recruit_count: "", apply_start: "", apply_end: "", work_start: "", work_end: "", apply_method: "messenger", apply_url: "", required_docs: "", description: "", status: "open",
};

export default function PostingForm({ initial, orgAddress, orgRegion }: { initial: PostingFormValues; orgAddress?: string | null; orgRegion?: string | null }) {
  const isEdit = Boolean(initial.id);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(isEdit ? updateOrgPosting : createOrgPosting, null);
  const [field, setField] = useState(initial.field);
  const [applyMethod, setApplyMethod] = useState(initial.apply_method);

  return (
    <form action={action} className="space-y-6">
      {isEdit && <input type="hidden" name="id" value={initial.id} />}
      <section className="space-y-3">
        <h2 className="text-base font-bold">무엇을 모집하나요</h2>
        <Field label="게시판">
          <div className="grid grid-cols-2 gap-1.5">
            {BOARDS.map((b) => (
              <label key={b.code} className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm has-[:checked]:border-stone-900 has-[:checked]:bg-stone-900 has-[:checked]:text-white">
                <input type="radio" name="board" value={b.code} defaultChecked={initial.board === b.code} className="sr-only" />
                {b.label}
              </label>
            ))}
          </div>
        </Field>
        <Field label="공고 제목">
          <input name="title" defaultValue={initial.title} required minLength={5} placeholder="예: 2027 시즌 단원 오디션 (바이올린)" className={inputClass} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="분야">
            <select name="field" value={field} onChange={(e) => setField(e.target.value)} className={inputClass} required>
              <option value="">선택</option>
              {FIELDS.map((f) => <option key={f.code} value={f.code}>{f.label}</option>)}
            </select>
          </Field>
          <Field label="장르">
            <select name="genre" defaultValue={initial.genre} className={inputClass} disabled={!field}>
              <option value="">선택</option>
              {genresOf(field).map((g) => <option key={g.code} value={g.code}>{g.label}</option>)}
            </select>
          </Field>
          <Field label="직무">
            <select name="role" defaultValue={initial.role} className={inputClass}>
              <option value="">선택</option>
              {ROLES.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="고용형태">
            <select name="employment_type" defaultValue={initial.employment_type} className={inputClass}>
              <option value="">선택</option>
              {EMPLOYMENT_TYPES.map((e) => <option key={e.code} value={e.code}>{e.label}</option>)}
            </select>
          </Field>
          <Field label="고용형태 설명 (선택)">
            <input name="employment_raw" defaultValue={initial.employment_raw} placeholder="예: 기간제 1년, 연장 가능" className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold">어디서 · 언제 · 얼마나</h2>
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <Field label="시·도">
            <select name="region" defaultValue={initial.region || orgRegion || ""} className={inputClass} required>
              <option value="">선택</option>
              {SELECTABLE_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="근무지 주소">
            <input name="address" defaultValue={initial.address || orgAddress || ""} className={inputClass} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="급여 · 출연료 · 지원금"><input name="salary" defaultValue={initial.salary} placeholder="예: 월 280만원 (세전)" className={inputClass} /></Field>
          <Field label="모집 인원"><input name="recruit_count" defaultValue={initial.recruit_count} placeholder="예: 2명" className={inputClass} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="접수 시작"><input name="apply_start" type="date" defaultValue={initial.apply_start} className={inputClass} /></Field>
          <Field label="접수 마감"><input name="apply_end" type="date" defaultValue={initial.apply_end} className={inputClass} /></Field>
          <Field label="근무 시작"><input name="work_start" type="date" defaultValue={initial.work_start} className={inputClass} /></Field>
          <Field label="근무 종료"><input name="work_end" type="date" defaultValue={initial.work_end} className={inputClass} /></Field>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold">내용</h2>
        <Field label="공고 내용">
          <textarea name="description" rows={8} defaultValue={initial.description} className={textareaClass} placeholder="담당 업무, 자격 요건, 우대 사항, 전형 절차 등" />
        </Field>
        <Field label="제출 서류 (선택)">
          <input name="required_docs" defaultValue={initial.required_docs} placeholder="예: 이력서, 포트폴리오, 연주 영상 링크" className={inputClass} />
        </Field>
      </section>

      <section className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
        <h2 className="text-base font-bold">접수 방법</h2>
        <div className="grid gap-1.5 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-stone-200 bg-white p-3 text-sm has-[:checked]:border-stone-900">
            <input type="radio" name="apply_method" value="messenger" checked={applyMethod === "messenger"} onChange={() => setApplyMethod("messenger")} className="mt-0.5" />
            <span><span className="font-semibold">아트잡스 메신저로 받기 (추천)</span><span className="block text-xs text-stone-500">지원서가 메시지로 오고, 지원자 목록에서 확인·수락할 수 있습니다. 연락처가 노출되지 않습니다.</span></span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-stone-200 bg-white p-3 text-sm has-[:checked]:border-stone-900">
            <input type="radio" name="apply_method" value="external" checked={applyMethod === "external"} onChange={() => setApplyMethod("external")} className="mt-0.5" />
            <span><span className="font-semibold">기관 접수 페이지로 보내기</span><span className="block text-xs text-stone-500">기관 홈페이지 등 외부 접수처 링크를 안내합니다.</span></span>
          </label>
        </div>
        {applyMethod === "external" && (
          <Field label="접수 페이지 주소">
            <input name="apply_url" type="url" defaultValue={initial.apply_url} placeholder="https://" className={inputClass} />
          </Field>
        )}
      </section>

      {state && !state.ok && <Notice kind="error">{state.error}</Notice>}
      <div className="flex gap-2">
        <button type="submit" name="status" value="open" disabled={pending} className={primaryBtn}>{pending ? "저장 중…" : isEdit ? "수정 저장" : "공고 게시"}</button>
        <button type="submit" name="status" value="draft" disabled={pending} className="h-11 rounded-lg border border-stone-300 bg-white px-5 text-sm font-semibold">임시저장</button>
      </div>
    </form>
  );
}
