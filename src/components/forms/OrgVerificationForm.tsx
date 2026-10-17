"use client";
// 기관 인증 서류 제출. 파일은 브라우저에서 비공개 버킷(org-docs/{내 id}/)에 바로 올리고,
// 올라간 경로를 서버 액션(submitOrgVerification)에 넘겨 기록한다. 서버 액션 본문 한도(1MB)를 피하려는 것.
import { startTransition, useActionState, useState } from "react";
import type { ActionResult } from "@/lib/actions/auth";
import { submitOrgVerification } from "@/lib/actions/profile";
import { createClient } from "@/lib/supabase/client";
import { ORG_DOC_TYPES, fmtRegNumber, orgDocTypeLabel, type OrgVerification } from "@/types/account";
import { Field, Notice, inputClass, primaryBtn } from "./ui";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

export default function OrgVerificationForm({ userId, isVerified, verification }: { userId: string; isVerified: boolean; verification: OrgVerification | null }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(submitOrgVerification, null);
  const [docType, setDocType] = useState<string>(verification?.doc_type ?? "business");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // "다시 올리기"를 누른 순간의 결과값. 그 뒤 새로 성공하면 편집 모드를 닫는다.
  const [editFrom, setEditFrom] = useState<ActionResult | null | undefined>(undefined);
  const editing = editFrom !== undefined && !(state?.ok && state !== editFrom);

  async function onSubmit(fd: FormData) {
    setUploadError(null);
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return setUploadError("서류 파일을 골라 주세요.");
    const ext = ACCEPT[file.type];
    if (!ext) return setUploadError("JPG·PNG·WEBP 사진이나 PDF 파일만 올릴 수 있습니다.");
    if (file.size > MAX_BYTES) return setUploadError("파일이 10MB 보다 큽니다. 사진을 줄이거나 PDF 로 저장해 올려 주세요.");
    setUploading(true);
    // 저장소 경로에는 한글 파일명을 쓰지 않는다(키 제한). 원래 이름은 doc_name 으로 따로 남긴다.
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await createClient().storage.from("org-docs").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return setUploadError(`파일을 올리지 못했습니다: ${error.message}`);
    fd.delete("file");
    fd.set("doc_path", path);
    fd.set("doc_name", file.name);
    // await 뒤라 폼 액션 전환이 끝났으므로 직접 감싼다.
    startTransition(() => action(fd));
  }


  const busy = uploading || pending;
  const v = verification;
  const showForm = !isVerified && (!v || v.status === "needs_more" || editing);

  return (
    <section id="verify" className="scroll-mt-24 space-y-3 rounded-xl border border-stone-200 bg-white p-5">
      <div>
        <h2 className="text-base font-bold">기관 인증</h2>
        <p className="mt-1 text-xs text-stone-500">
          사업자등록증이나 고유번호증을 올려 주시면 운영팀이 확인 후 인증해 드립니다. 인증되면 공고에 ✓ 인증 기관 표시가 붙습니다. 올린 서류는 운영팀만 볼 수 있습니다.
        </p>
      </div>

      {isVerified ? (
        <Notice kind="success">✓ 인증된 기관입니다.</Notice>
      ) : v?.status === "needs_more" ? (
        <Notice kind="error">
          <span className="font-semibold">운영팀이 서류 보완을 요청했습니다.</span>
          {v.admin_note && <span className="mt-1 block whitespace-pre-line">{v.admin_note}</span>}
        </Notice>
      ) : v ? (
        <Notice>
          서류를 확인하고 있습니다. 인증되면 알림으로 알려 드립니다.
          <span className="mt-1 block text-xs text-stone-500">
            {[orgDocTypeLabel(v.doc_type), fmtRegNumber(v.reg_number), v.doc_name].filter(Boolean).join(" · ")}
          </span>
        </Notice>
      ) : null}

      {state?.ok && !showForm && <Notice kind="success">서류를 제출했습니다.</Notice>}

      {!isVerified && v?.status === "submitted" && !editing && (
        <button type="button" onClick={() => setEditFrom(state)} className="text-xs font-semibold text-stone-600 underline underline-offset-2">
          서류 다시 올리기
        </button>
      )}

      {showForm && (
        <form action={onSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="서류 종류">
              <select name="doc_type" value={docType} onChange={(e) => setDocType(e.target.value)} className={inputClass}>
                {ORG_DOC_TYPES.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={docType === "other" ? "등록번호 (있으면)" : "등록번호"} hint="사업자등록번호 또는 고유번호 10자리">
              <input
                name="reg_number"
                defaultValue={fmtRegNumber(v?.reg_number ?? null) ?? ""}
                inputMode="numeric"
                placeholder="123-45-67890"
                required={docType !== "other"}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="서류 파일" hint="사진(JPG·PNG) 또는 PDF, 10MB 이하. 기관명과 번호가 보이게 찍어 주세요.">
            <input name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm file:font-semibold" />
          </Field>
          {uploadError && <Notice kind="error">{uploadError}</Notice>}
          {state && !state.ok && <Notice kind="error">{state.error}</Notice>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={primaryBtn}>
              {uploading ? "올리는 중…" : pending ? "제출 중…" : "인증 서류 제출"}
            </button>
            {editing && (
              <button type="button" onClick={() => setEditFrom(undefined)} className="text-sm text-stone-500">
                취소
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
