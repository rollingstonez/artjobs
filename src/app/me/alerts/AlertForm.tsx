"use client";

import { useActionState, useState } from "react";
import { CheckGroup, Field, Notice, inputClass, primaryBtn } from "@/components/forms/ui";
import { saveAlert } from "@/lib/actions/alerts";
import type { ActionResult } from "@/lib/actions/auth";
import { SELECTABLE_REGIONS } from "@/lib/location";
import { BOARDS, EMPLOYMENT_TYPES, FIELDS, GENRES, ROLES } from "@/types/job";

export default function AlertForm({
  hasLocation,
  defaultFields,
  defaultGenres,
  defaultRoles,
}: {
  hasLocation: boolean;
  defaultFields: string[];
  defaultGenres: string[];
  defaultRoles: string[];
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveAlert, null);
  const [nearMe, setNearMe] = useState(hasLocation);
  const [fields, setFields] = useState<string[]>(defaultFields);
  const genreOptions = fields.length ? GENRES.filter((g) => fields.includes(g.field)) : GENRES;

  return (
    <form action={action} className="space-y-4">
      <Field label="알림 이름">
        <input name="name" defaultValue="내 알림" className={inputClass} />
      </Field>
      <Field label="게시판">
        <CheckGroup name="boards" options={BOARDS} selected={BOARDS.map((b) => b.code)} columns={2} />
      </Field>
      <Field label="분야">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {FIELDS.map((f) => (
            <label key={f.code} className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-sm has-[:checked]:border-stone-900 has-[:checked]:bg-stone-900 has-[:checked]:text-white">
              <input
                type="checkbox"
                name="fields"
                value={f.code}
                checked={fields.includes(f.code)}
                onChange={(e) => setFields((prev) => (e.target.checked ? [...prev, f.code] : prev.filter((x) => x !== f.code)))}
                className="sr-only"
              />
              {f.label}
            </label>
          ))}
        </div>
      </Field>
      <Field label="장르 (비우면 전체)">
        <CheckGroup name="genres" options={genreOptions.map((g) => ({ code: g.code, label: fields.length === 1 ? g.label : `${FIELDS.find((f) => f.code === g.field)?.label}·${g.label}` }))} selected={defaultGenres} />
      </Field>
      <Field label="직무 (비우면 전체)">
        <CheckGroup name="roles" options={ROLES} selected={defaultRoles} />
      </Field>
      <Field label="고용형태 (비우면 전체)">
        <CheckGroup name="employment_types" options={EMPLOYMENT_TYPES} selected={[]} />
      </Field>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="near_me" checked={nearMe} disabled={!hasLocation} onChange={(e) => setNearMe(e.target.checked)} />
          <span className="font-semibold">내 집 근처 공고만</span>
          <span className="text-xs text-stone-500">(프로필의 지역과 이동 가능 거리 기준)</span>
        </label>
        {!nearMe && (
          <Field label="지역 (비우면 전국)">
            <CheckGroup name="regions" options={SELECTABLE_REGIONS.map((r) => ({ code: r, label: r }))} selected={[]} columns={4} />
          </Field>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="받는 방법">
          <CheckGroup name="channels" options={[{ code: "in_app", label: "사이트 알림" }, { code: "email", label: "이메일" }]} selected={["in_app", "email"]} columns={2} />
        </Field>
        <Field label="얼마나 자주">
          <select name="frequency" defaultValue="daily" className={inputClass}>
            <option value="instant">즉시</option>
            <option value="daily">하루 한 번 모아서</option>
            <option value="weekly">주 1회 모아서</option>
          </select>
        </Field>
      </div>
      {state && !state.ok && <Notice kind="error">{state.error}</Notice>}
      {state?.ok && <Notice kind="success">알림 조건을 저장했습니다.</Notice>}
      <button type="submit" disabled={pending} className={primaryBtn}>{pending ? "저장 중…" : "알림 조건 저장"}</button>
    </form>
  );
}
