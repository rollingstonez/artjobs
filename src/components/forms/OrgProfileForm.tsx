"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/actions/auth";
import { saveOrgProfile } from "@/lib/actions/profile";
import { SELECTABLE_REGIONS } from "@/lib/location";
import { ORG_TYPES, type OrgProfile } from "@/types/account";
import { FIELDS } from "@/types/job";
import { Field, Notice, inputClass, primaryBtn, textareaClass } from "./ui";

export default function OrgProfileForm({ profile }: { profile: OrgProfile }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveOrgProfile, null);
  return (
    <form action={action} className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-base font-bold">기관 정보</h2>
        <Field label="기관명">
          <input name="org_name" defaultValue={profile.org_name} required className={inputClass} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="기관 유형">
            <select name="org_type" defaultValue={profile.org_type ?? ""} className={inputClass}>
              <option value="">선택</option>
              {ORG_TYPES.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="주 분야">
            <select name="field" defaultValue={profile.field ?? ""} className={inputClass}>
              <option value="">선택</option>
              {FIELDS.map((f) => (
                <option key={f.code} value={f.code}>
                  {f.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <Field label="시·도">
            <select name="region" defaultValue={profile.region ?? ""} className={inputClass}>
              <option value="">선택</option>
              {SELECTABLE_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="주소" hint="공고에 근무지로 표시됩니다.">
            <input name="address" defaultValue={profile.address ?? ""} className={inputClass} />
          </Field>
        </div>
        <Field label="홈페이지 (선택)">
          <input name="website" type="url" defaultValue={profile.website ?? ""} placeholder="https://" className={inputClass} />
        </Field>
        <Field label="기관 소개 (20자 이상)">
          <textarea name="intro" rows={4} defaultValue={profile.intro ?? ""} className={textareaClass} />
        </Field>
      </section>
      <p className="rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-600">
        담당자 전화번호·이메일은 받지 않습니다. 지원자와의 연락은 아트잡스 메신저로 이루어지며, 필요하면 대화 안에서 직접 알려주시면 됩니다.
      </p>
      {state && !state.ok && <Notice kind="error">{state.error}</Notice>}
      {state?.ok && <Notice kind="success">저장했습니다.</Notice>}
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? "저장 중…" : "기관 정보 저장"}
      </button>
    </form>
  );
}
