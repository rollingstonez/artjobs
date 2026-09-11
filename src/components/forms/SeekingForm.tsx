"use client";
// 구직 글 작성·수정 폼. 프로필의 분야·장르·직무·지역을 기본값으로 채워준다.
import { useActionState, useState } from "react";
import type { ActionResult } from "@/lib/actions/auth";
import { saveSeeking } from "@/lib/actions/seeking";
import { SELECTABLE_REGIONS } from "@/lib/location";
import type { ArtistProfile, SeekingPost } from "@/types/account";
import { EMPLOYMENT_TYPES, FIELDS, ROLES, genresOf } from "@/types/job";
import { CheckGroup, Field, Notice, inputClass, primaryBtn, secondaryBtn, textareaClass } from "./ui";

export default function SeekingForm({ post, profile }: { post: SeekingPost | null; profile: ArtistProfile | null }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveSeeking, null);
  const [field, setField] = useState(post?.field ?? profile?.field ?? "");
  const genres = post?.genres ?? profile?.genres ?? [];
  const roles = post?.roles ?? profile?.roles ?? [];
  const employment = post?.employment_types ?? profile?.employment_types ?? [];

  return (
    <form action={action} className="space-y-5">
      {post && <input type="hidden" name="id" value={post.id} />}
      <Field label="제목" hint="어떤 일을 찾는지 한 줄로. 예: 뮤지컬 앙상블·코러스 가능한 소프라노, 10월부터 서울 지역 공연 구합니다">
        <input name="title" defaultValue={post?.title ?? ""} required minLength={5} maxLength={80} className={inputClass} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="분야">
          <select name="field" value={field} onChange={(e) => setField(e.target.value)} className={inputClass}>
            <option value="">선택</option>
            {FIELDS.map((f) => <option key={f.code} value={f.code}>{f.label}</option>)}
          </select>
        </Field>
        <Field label="활동 가능 지역">
          <select name="region" defaultValue={post?.region ?? profile?.region ?? ""} className={inputClass}>
            <option value="">전국·어디든</option>
            {SELECTABLE_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
      </div>
      {field && (
        <Field label="장르">
          <CheckGroup name="genres" options={genresOf(field)} selected={genres} />
        </Field>
      )}
      <Field label="할 수 있는 일(직무)">
        <CheckGroup name="roles" options={ROLES} selected={roles} />
      </Field>
      <Field label="원하는 형태">
        <CheckGroup name="employment_types" options={EMPLOYMENT_TYPES} selected={employment} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="가능 시작일 (선택)">
          <input name="available_from" type="date" defaultValue={post?.available_from ?? ""} className={inputClass} />
        </Field>
        <Field label="가능 종료일 (선택)" hint="비워두면 기한 없음">
          <input name="available_until" type="date" defaultValue={post?.available_until ?? ""} className={inputClass} />
        </Field>
      </div>
      <Field label="내용 (20자 이상)" hint="할 수 있는 것, 대표 경력 한두 줄, 가능한 일정·조건. 연락처는 적지 마세요. 기관이 아트잡스 메시지로 연락합니다.">
        <textarea name="body" rows={8} defaultValue={post?.body ?? ""} required minLength={20} maxLength={3000} className={textareaClass} />
      </Field>
      <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
        이 글은 <b>로그인하지 않은 사람도 볼 수 있게 공개</b>됩니다. 이름(활동명)·경력 연수·글 내용이 보이고, 프로필 상세와 포트폴리오는 로그인한 기관만 봅니다. 60일 뒤 자동으로 내려가며 연장할 수 있습니다.
      </p>
      {state && !state.ok && <Notice kind="error">{state.error}</Notice>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={primaryBtn}>{pending ? "저장 중…" : post ? "수정 저장" : "구직 글 올리기"}</button>
        <a href="/me/seeking" className={`${secondaryBtn} inline-flex items-center`}>취소</a>
      </div>
    </form>
  );
}
