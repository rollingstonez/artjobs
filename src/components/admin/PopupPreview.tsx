"use client";

// 어드민 팝업 관리의 "미리보기" 버튼 — 저장된 팝업을 방문자 화면과 똑같은 모양으로 띄운다.
// 실제 화면(PopupModal)과 같은 PopupView 를 쓰므로 "미리보기와 실제가 다르다"는 일이 생기지 않는다.
import { useState } from "react";
import { PopupView, type PopupData } from "@/components/PopupModal";

export default function PopupPreview({ popup, note, className }: { popup: PopupData; note?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>👁 미리보기</button>
      {open && <PopupView popup={popup} preview previewNote={note} onClose={() => setOpen(false)} onDismissToday={() => setOpen(false)} />}
    </>
  );
}
