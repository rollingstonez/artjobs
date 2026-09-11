"use client";

import { useActionState, useState } from "react";
import type { ActionResult } from "@/lib/actions/auth";
import { saveArtistProfile } from "@/lib/actions/profile";
import { SELECTABLE_REGIONS } from "@/lib/location";
import type { ArtistProfile, PortfolioItem } from "@/types/account";
import { EMPLOYMENT_TYPES, FIELDS, ROLES, genresOf } from "@/types/job";
import PortfolioEditor from "./PortfolioEditor";
import { CheckGroup, Field, Notice, inputClass, primaryBtn, textareaClass } from "./ui";

export default function ArtistProfileForm({ profile, displayName, portfolio }: { profile: ArtistProfile; displayName: string; portfolio: PortfolioItem[] }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveArtistProfile, null);
  const [field, setField] = useState(profile.field ?? "");

  return (
    <form action={action} className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-base font-bold">기본 정보</h2>
        <Field label="이름 또는 활동명" hint="인재정보에 공개되는 이름입니다.">
          <input name="display_name" defaultValue={displayName} required className={inputClass} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="분야">
            <select name="field" value={field} onChange={(e) => setField(e.target.value)} className={inputClass}>
              <option value="">선택</option>
              {FIELDS.map((f) => (
                <option key={f.code} value={f.code}>
                  {f.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="경력 (년)">
            <input name="career_years" type="number" min={0} max={60} defaultValue={profile.career_years ?? ""} className={inputClass} />
          </Field>
        </div>
        {field && (
          <Field label="장르 (여러 개 가능)">
            <CheckGroup name="genres" options={genresOf(field)} selected={profile.genres} />
          </Field>
        )}
        <Field label="희망 직무 (여러 개 가능)">
          <CheckGroup name="roles" options={ROLES} selected={profile.roles} />
        </Field>
        <Field label="희망 고용형태">
          <CheckGroup name="employment_types" options={EMPLOYMENT_TYPES} selected={profile.employment_types} />
        </Field>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold">활동 지역</h2>
        <p className="text-xs text-stone-500">
          공고를 내 집 근처부터 보여주고, 알림도 이 위치 기준으로 보냅니다. 정확한 주소는 받지 않습니다.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
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
          <Field label="시·군·구 (선택)">
            <input name="address_hint" defaultValue={profile.address_hint ?? ""} placeholder="예: 마포구" className={inputClass} />
          </Field>
          <Field label="이동 가능 거리 (km)">
            <input name="max_distance_km" type="number" min={5} max={200} defaultValue={profile.max_distance_km} className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold">소개와 경력</h2>
        <Field label="자기소개 (30자 이상)">
          <textarea name="bio" rows={4} defaultValue={profile.bio ?? ""} className={textareaClass} />
        </Field>
        <Field label="주요 경력 · 수상 · 전시 · 공연" hint="한 줄에 하나씩 적어주세요.">
          <textarea name="career" rows={5} defaultValue={profile.career ?? ""} className={textareaClass} />
        </Field>
        <Field label="학력 (선택)">
          <input name="education" defaultValue={profile.education ?? ""} placeholder="예: OO대학교 회화과 졸업" className={inputClass} />
        </Field>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold">포트폴리오</h2>
        <p className="text-xs text-stone-500">
          공연 영상, 작품 사진, 음원, 작품집 PDF 링크를 여러 개 넣을 수 있습니다. 기관은 심사 화면에서 이 링크를 바로 열어 보며 메모하고 점수를 줍니다. 경력 글보다 이게 더 큰 힘이 됩니다.
        </p>
        <PortfolioEditor items={portfolio} />
        <Field label="대표 포트폴리오 주소 (선택)" hint="개인 홈페이지나 작가 페이지 하나. 인재정보 카드에 표시됩니다.">
          <input name="portfolio_url" type="url" defaultValue={profile.portfolio_url ?? ""} placeholder="https://" className={inputClass} />
        </Field>
      </section>

      <section className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
        <h2 className="text-base font-bold">공개 설정</h2>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="is_public" defaultChecked={profile.is_public} className="mt-0.5" />
          <span>
            <span className="font-semibold">인재정보에 공개</span>
            <span className="block text-xs text-stone-500">
              프로필이 100% 완성된 뒤에 로그인한 기관 회원에게만 보입니다. 연락처는 어디에도 나오지 않습니다.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="allow_messages" defaultChecked={profile.allow_messages} className="mt-0.5" />
          <span>
            <span className="font-semibold">기관의 메시지 받기</span>
            <span className="block text-xs text-stone-500">끄면 기관이 먼저 말을 걸 수 없습니다. 내가 지원한 곳과는 계속 대화할 수 있습니다.</span>
          </span>
        </label>
        <Field label="구직 상태">
          <select name="availability" defaultValue={profile.availability} className={inputClass}>
            <option value="open">구직 중</option>
            <option value="closed">지금은 쉬는 중</option>
          </select>
        </Field>
      </section>

      {state && !state.ok && <Notice kind="error">{state.error}</Notice>}
      {state?.ok && <Notice kind="success">저장했습니다.</Notice>}
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? "저장 중…" : "프로필 저장"}
      </button>
    </form>
  );
}
