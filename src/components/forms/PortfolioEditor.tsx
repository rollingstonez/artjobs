"use client";
// 포트폴리오 링크 여러 개 입력. 종류(영상·이미지·음원·문서·링크)는 주소로 짐작해 채워주고 바꿀 수 있다.
// 폼 필드 이름: pf_kind[] · pf_title[] · pf_url[] (같은 순서). 서버(saveArtistProfile)가 통째로 갈아끼운다.
import { useState } from "react";
import { embedFor, guessKind } from "@/lib/embed";
import { PORTFOLIO_KINDS, type PortfolioItem, type PortfolioKind } from "@/types/account";
import { inputClass } from "./ui";

type Row = { key: number; kind: PortfolioKind; title: string; url: string };

export default function PortfolioEditor({ items }: { items: PortfolioItem[] }) {
  const [rows, setRows] = useState<Row[]>(
    items.length ? items.map((it, i) => ({ key: i, kind: it.kind, title: it.title ?? "", url: it.url })) : [{ key: 0, kind: "video", title: "", url: "" }],
  );
  const [seq, setSeq] = useState(rows.length);

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const add = () => {
    setRows((rs) => [...rs, { key: seq, kind: "video", title: "", url: "" }]);
    setSeq((n) => n + 1);
  };
  const remove = (key: number) => setRows((rs) => rs.filter((r) => r.key !== key));
  const move = (key: number, d: -1 | 1) =>
    setRows((rs) => {
      const i = rs.findIndex((r) => r.key === key);
      const j = i + d;
      if (i < 0 || j < 0 || j >= rs.length) return rs;
      const next = [...rs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div className="space-y-2">
      {rows.map((r, i) => {
        const e = r.url ? embedFor(r.url) : null;
        return (
          <div key={r.key} className="rounded-lg border border-stone-200 bg-white p-2.5">
            <div className="grid gap-2 sm:grid-cols-[110px_1fr_1.4fr_auto]">
              <select name="pf_kind" value={r.kind} onChange={(ev) => update(r.key, { kind: ev.target.value as PortfolioKind })} className={inputClass}>
                {PORTFOLIO_KINDS.map((k) => (
                  <option key={k.code} value={k.code}>{k.label}</option>
                ))}
              </select>
              <input name="pf_title" value={r.title} onChange={(ev) => update(r.key, { title: ev.target.value })} placeholder="제목 (예: 2025 정기공연 발췌)" className={inputClass} />
              <input
                name="pf_url"
                type="url"
                value={r.url}
                onChange={(ev) => {
                  const url = ev.target.value;
                  update(r.key, { url, ...(url && !r.title ? { kind: guessKind(url) } : {}) });
                }}
                placeholder="https://"
                className={inputClass}
              />
              <div className="flex items-center gap-1 text-xs">
                <button type="button" onClick={() => move(r.key, -1)} disabled={i === 0} className="rounded border border-stone-300 px-2 py-1 disabled:opacity-30" title="위로">↑</button>
                <button type="button" onClick={() => move(r.key, 1)} disabled={i === rows.length - 1} className="rounded border border-stone-300 px-2 py-1 disabled:opacity-30" title="아래로">↓</button>
                <button type="button" onClick={() => remove(r.key)} className="rounded border border-stone-300 px-2 py-1 text-red-600" title="삭제">✕</button>
              </div>
            </div>
            {e && (
              <p className="mt-1 text-[11px] text-stone-500">
                {e.kind === "external" ? "이 주소는 기관 심사 화면에서 새 탭으로 열립니다. 유튜브·비메오·사운드클라우드·이미지 주소는 화면 안에서 바로 재생됩니다." : "기관 심사 화면에서 바로 재생됩니다 ✓"}
              </p>
            )}
          </div>
        );
      })}
      <button type="button" onClick={add} className="rounded-lg border border-dashed border-stone-400 px-3 py-2 text-sm font-semibold text-stone-700 hover:border-stone-900">
        + 링크 추가
      </button>
    </div>
  );
}
