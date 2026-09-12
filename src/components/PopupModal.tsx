"use client";

// 첫 화면 팝업 — 홈(/)에서 조건에 맞는 팝업 하나를 화면 가운데 띄운다. 바로쌤 PopupModal 이식.
//   · 목록은 서버(홈 페이지)에서 "공개 + 기간 안 + 대상 일치" 로 걸러 넘겨준다.
//   · 방문자는 "오늘 하루 안 보기"(브라우저에만 기록) 또는 "닫기"를 누를 수 있다.
//   · PopupView 는 어드민 미리보기와 같은 컴포넌트를 쓴다 — 여기 모양을 고치면 미리보기도 같이 바뀐다.
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export interface PopupData {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  link_url: string | null;
}

const dismissKey = (id: string) => `aj_popup_dismissed_${id}`;

function todayKey(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function PopupModal({ popups }: { popups: PopupData[] }) {
  const [popup, setPopup] = useState<PopupData | null>(null);

  // "오늘 하루 안 보기"를 누르지 않은 첫 번째 팝업을 고른다.
  // localStorage 는 브라우저에만 있으므로 마운트 뒤에 판정한다(서버·클라이언트 화면이 어긋나지 않게).
  // 효과 본문에서 곧바로 setState 하지 않고 한 틱 뒤에 넘긴다 — CollectionDashboard 와 같은 방식.
  useEffect(() => {
    const id = setTimeout(() => {
      const target = popups.find((p) => {
        try {
          return localStorage.getItem(dismissKey(p.id)) !== todayKey();
        } catch {
          return true; // localStorage 를 못 쓰면 그냥 보여 준다
        }
      });
      if (target) setPopup(target);
    }, 0);
    return () => clearTimeout(id);
  }, [popups]);

  if (!popup) return null;

  return (
    <PopupView
      popup={popup}
      onClose={() => setPopup(null)}
      onDismissToday={() => {
        try {
          localStorage.setItem(dismissKey(popup.id), todayKey());
        } catch {
          /* 막혀 있어도 닫기는 진행 */
        }
        setPopup(null);
      }}
    />
  );
}

/** 팝업의 보이는 부분 전부. 실제 화면과 어드민 미리보기가 함께 쓴다. */
export function PopupView({
  popup,
  onClose,
  onDismissToday,
  preview = false,
  previewNote,
}: {
  popup: PopupData;
  onClose: () => void;
  onDismissToday: () => void;
  preview?: boolean;
  previewNote?: string;
}) {
  if (typeof document === "undefined") return null;
  const hasImage = Boolean(popup.image_url);

  const inner = hasImage ? (
    <div>
      {/* 외부 주소 이미지라 next/image 대신 img 를 쓴다(도메인을 미리 알 수 없음) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={popup.image_url!} alt={popup.title} className="block h-auto w-full" />
      {(popup.title || popup.body) && (
        <div className="px-5 py-4">
          <p className="text-base font-bold leading-snug text-stone-900">{popup.title}</p>
          {popup.body && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{popup.body}</p>}
        </div>
      )}
    </div>
  ) : (
    <div className="px-6 py-7">
      <p className="text-lg font-extrabold leading-snug text-stone-900">{popup.title}</p>
      {popup.body && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{popup.body}</p>}
    </div>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex h-[100dvh] w-[100dvw] flex-col items-center justify-center gap-3 overflow-hidden bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={popup.title}
    >
      {preview && (
        <div className="rounded-full bg-amber-400 px-4 py-1.5 text-xs font-extrabold text-amber-950 shadow" onClick={(e) => e.stopPropagation()}>
          👁 미리보기 — 방문자에게 이렇게 보입니다
          {previewNote && <span className="ml-2 font-medium text-amber-900">· {previewNote}</span>}
          {popup.link_url && <span className="ml-2 font-medium text-amber-900">(누르면 이동: {popup.link_url})</span>}
        </div>
      )}

      <div
        className="flex max-h-[calc(100dvh-32px)] w-[calc(100dvw-32px)] max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          {popup.link_url && !preview ? (
            popup.link_url.startsWith("/") ? (
              <Link href={popup.link_url} className="block">{inner}</Link>
            ) : (
              <a href={popup.link_url} target="_blank" rel="noopener noreferrer" className="block">{inner}</a>
            )
          ) : (
            inner
          )}
        </div>
        <div className="flex shrink-0 items-stretch border-t border-stone-100">
          <button type="button" onClick={onDismissToday} className="flex-1 py-3.5 text-sm font-medium text-stone-500 hover:bg-stone-50">
            오늘 하루 안 보기
          </button>
          <div className="w-px bg-stone-100" />
          <button type="button" onClick={onClose} className="flex-1 py-3.5 text-sm font-bold text-stone-900 hover:bg-stone-50">
            닫기 ✕
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
