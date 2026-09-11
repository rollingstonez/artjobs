"use client";
// 심사 작업대. 왼쪽 지원자 목록 ↔ 오른쪽 상세(프로필 스냅샷·포트폴리오 뷰어) + 점수·메모 패널.
// 포트폴리오는 화면 안에서(유튜브·비메오·사운드클라우드·이미지) 보거나 새 탭으로 열고, 메모 패널은 그대로 남는다.
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveReview, setApplicationStage } from "@/lib/actions/hiring";
import { embedFor, hostOf } from "@/lib/embed";
import { fmtDate } from "@/lib/format";
import type { WorkbenchApplicant } from "@/lib/hiring";
import { APPLICATION_STAGES, PORTFOLIO_KINDS, stageTone, type ApplicationStatus } from "@/types/account";
import { employmentLabel, fieldLabel, genreLabel, roleLabel } from "@/types/job";

type SortKey = "score" | "date" | "name" | "stage";

export interface WorkbenchProps {
  postingId: string;
  myId: string;
  isTeam: boolean;
  applicants: WorkbenchApplicant[];
  teamNames: Record<string, string>;
}

const stageIndex = (s: string) => Math.max(0, APPLICATION_STAGES.findIndex((x) => x.code === s));

export default function ReviewWorkbench({ postingId, myId, isTeam, applicants: initial, teamNames }: WorkbenchProps) {
  const [apps, setApps] = useState(initial);
  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id ?? null);
  const [sort, setSort] = useState<SortKey>("score");
  const [stageFilter, setStageFilter] = useState<string>("");
  const [q, setQ] = useState("");

  const scoreOf = (a: WorkbenchApplicant) => (isTeam ? a.avg : (a.mine?.score ?? null));

  const list = useMemo(() => {
    const filtered = apps.filter((a) => {
      if (stageFilter && a.status !== stageFilter) return false;
      if (q) {
        const hay = `${a.profile_snapshot?.display_name ?? ""} ${a.profile_snapshot?.genres?.join(" ") ?? ""} ${a.profile_snapshot?.career ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
    const byName = (a: WorkbenchApplicant, b: WorkbenchApplicant) =>
      (a.profile_snapshot?.display_name ?? "").localeCompare(b.profile_snapshot?.display_name ?? "", "ko");
    return [...filtered].sort((a, b) => {
      if (sort === "score") return (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1) || byName(a, b);
      if (sort === "date") return b.created_at.localeCompare(a.created_at);
      if (sort === "stage") return stageIndex(b.status) - stageIndex(a.status) || (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1);
      return byName(a, b);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apps, sort, stageFilter, q, isTeam]);

  const selected = apps.find((a) => a.id === selectedId) ?? null;
  const rankOf = (id: string) => {
    const ranked = [...apps].sort((a, b) => (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1));
    const i = ranked.findIndex((a) => a.id === id);
    return scoreOf(ranked[i]) == null ? null : i + 1;
  };

  const move = (delta: number) => {
    if (!selected) return;
    const i = list.findIndex((a) => a.id === selected.id);
    const next = list[i + delta];
    if (next) setSelectedId(next.id);
  };

  const patch = (id: string, fn: (a: WorkbenchApplicant) => WorkbenchApplicant) => setApps((prev) => prev.map((a) => (a.id === id ? fn(a) : a)));

  const scoredCount = apps.filter((a) => (isTeam ? a.avg != null : a.mine?.score != null)).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      {/* ── 지원자 목록 ── */}
      <aside className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-8 rounded-lg border border-stone-300 bg-white px-2">
            <option value="score">{isTeam ? "평균 점수순" : "내 점수순"}</option>
            <option value="stage">선발 단계순</option>
            <option value="date">지원일순</option>
            <option value="name">이름순</option>
          </select>
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="h-8 rounded-lg border border-stone-300 bg-white px-2">
            <option value="">모든 단계</option>
            {APPLICATION_STAGES.map((s) => (
              <option key={s.code} value={s.code}>{s.label}</option>
            ))}
          </select>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·장르·경력 검색" className="h-8 min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-2" />
        </div>
        <p className="text-xs text-stone-500">
          {apps.length}명 중 {scoredCount}명 채점 · 점수를 주면 목록이 자동으로 순위대로 정렬됩니다.
        </p>
        <ul className="max-h-[70vh] divide-y divide-stone-100 overflow-y-auto rounded-xl border border-stone-200 bg-white">
          {list.length === 0 && <li className="p-6 text-center text-sm text-stone-500">해당하는 지원자가 없습니다.</li>}
          {list.map((a) => {
            const p = a.profile_snapshot;
            const score = scoreOf(a);
            const rank = rankOf(a.id);
            const active = a.id === selectedId;
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-stone-50 ${active ? "bg-stone-900 text-white hover:bg-stone-900" : ""}`}
                >
                  <span className={`w-6 shrink-0 text-center text-xs font-bold ${active ? "text-stone-300" : "text-stone-400"}`}>{rank ?? "–"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p?.display_name ?? "(파기됨)"}</span>
                    <span className={`block truncate text-[11px] ${active ? "text-stone-300" : "text-stone-500"}`}>
                      {[fieldLabel(p?.field ?? null), p?.genres?.slice(0, 2).map(genreLabel).join("·"), p?.career_years != null ? `${p.career_years}년` : null].filter(Boolean).join(" · ") || "프로필 없음"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-bold tabular-nums">{score ?? <span className="text-stone-400">–</span>}</span>
                    <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${active ? "bg-white/15 text-white" : stageTone(a.status)}`}>
                      {APPLICATION_STAGES.find((s) => s.code === a.status)?.label ?? a.status}
                    </span>
                  </span>
                  {a.mine?.memo && <span title="메모 있음" className={`text-xs ${active ? "text-stone-300" : "text-stone-400"}`}>✎</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* ── 상세 + 심사 패널 ── */}
      {selected ? (
        <ApplicantDetail
          key={selected.id}
          a={selected}
          postingId={postingId}
          myId={myId}
          isTeam={isTeam}
          teamNames={teamNames}
          rank={rankOf(selected.id)}
          onPrev={() => move(-1)}
          onNext={() => move(1)}
          onReviewSaved={(review) =>
            patch(selected.id, (x) => {
              const mine = { ...(x.mine ?? { id: "", application_id: x.id, reviewer_user_id: myId }), ...review };
              const others = x.reviews.filter((r) => r.reviewer_user_id !== myId);
              const reviews = isTeam ? [...others, { ...mine, reviewer_name: teamNames[myId] ?? "나" }] : x.reviews;
              const scored = reviews.filter((r) => r.score != null);
              const avg = isTeam && scored.length ? Math.round((scored.reduce((s, r) => s + (r.score ?? 0), 0) / scored.length) * 10) / 10 : x.avg;
              return { ...x, mine, reviews, avg };
            })
          }
          onStageChanged={(status) => patch(selected.id, (x) => ({ ...x, status }))}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
          아직 지원자가 없습니다. 지원이 들어오면 여기서 바로 보고, 메모하고, 점수를 줄 수 있습니다.
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────

function ApplicantDetail({
  a, postingId, myId, isTeam, teamNames, rank, onPrev, onNext, onReviewSaved, onStageChanged,
}: {
  a: WorkbenchApplicant;
  postingId: string;
  myId: string;
  isTeam: boolean;
  teamNames: Record<string, string>;
  rank: number | null;
  onPrev: () => void;
  onNext: () => void;
  onReviewSaved: (r: { score: number | null; memo: string | null; updated_at: string }) => void;
  onStageChanged: (s: ApplicationStatus) => void;
}) {
  const p = a.profile_snapshot;
  const [viewer, setViewer] = useState<{ url: string; title: string } | null>(null);
  const [score, setScore] = useState<string>(a.mine?.score != null ? String(a.mine.score) : "");
  const [memo, setMemo] = useState(a.mine?.memo ?? "");
  const [savedAt, setSavedAt] = useState<string | null>(a.mine?.updated_at ?? null);
  const [dirty, setDirty] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [stagePending, startStage] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSave = () => {
    const s = score === "" ? null : Number(score);
    startTransition(async () => {
      const r = await saveReview(postingId, a.id, { score: s, memo });
      if (r.ok) {
        setSavedAt(r.updated_at);
        setDirty(false);
        setErr(null);
        onReviewSaved({ score: s == null ? null : Math.max(0, Math.min(100, Math.round(s))), memo: memo.trim() || null, updated_at: r.updated_at });
      } else setErr(r.error);
    });
  };

  // 입력이 멈추면 1.5초 뒤 자동 저장
  useEffect(() => {
    if (!dirty) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(doSave, 1500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, memo, dirty]);

  const portfolio = [
    ...(p?.portfolio ?? []),
    ...(p?.portfolio_url && !(p?.portfolio ?? []).some((x) => x.url === p.portfolio_url) ? [{ kind: "link" as const, title: "포트폴리오", url: p.portfolio_url }] : []),
  ];
  const kindLabel = (k: string) => PORTFOLIO_KINDS.find((x) => x.code === k)?.label ?? "링크";

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <section className="min-w-0 space-y-4">
        {/* 머리: 이름 · 순위 · 이전/다음 */}
        <div className="flex flex-wrap items-start gap-3 rounded-xl border border-stone-200 bg-white p-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-stone-500">
              {rank ? `현재 ${rank}위` : "아직 점수 없음"} · {fmtDate(a.created_at)} 지원
              {a.purged_at && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">보관 기간 만료로 개인정보 파기됨</span>}
            </p>
            <h3 className="text-xl font-extrabold">{p?.display_name ?? "(파기됨)"}</h3>
            <p className="mt-1 flex flex-wrap gap-1 text-xs">
              {p?.field && <span className="rounded-full bg-stone-900 px-2 py-0.5 font-bold text-white">{fieldLabel(p.field)}</span>}
              {p?.genres?.map((g) => <span key={g} className="rounded-full bg-stone-100 px-2 py-0.5">{genreLabel(g)}</span>)}
              {p?.roles?.map((r) => <span key={r} className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">{roleLabel(r)}</span>)}
              {p?.employment_types?.map((e) => <span key={e} className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">{employmentLabel(e)}</span>)}
            </p>
          </div>
          <div className="flex gap-1 text-xs">
            <button type="button" onClick={onPrev} className="rounded-lg border border-stone-300 px-2.5 py-1.5 hover:border-stone-500">← 이전</button>
            <button type="button" onClick={onNext} className="rounded-lg border border-stone-300 px-2.5 py-1.5 hover:border-stone-500">다음 →</button>
          </div>
        </div>

        {/* 뷰어: 링크를 화면 안에서 본다 */}
        {viewer && <MediaViewer url={viewer.url} title={viewer.title} onClose={() => setViewer(null)} />}

        {/* 포트폴리오 */}
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h4 className="text-sm font-bold text-stone-700">포트폴리오 <span className="font-normal text-stone-400">{portfolio.length}</span></h4>
          {portfolio.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">등록된 포트폴리오 링크가 없습니다.</p>
          ) : (
            <ul className="mt-2 divide-y divide-stone-100">
              {portfolio.map((it, i) => {
                const e = embedFor(it.url);
                const inline = e.kind !== "external";
                const open = viewer?.url === it.url;
                return (
                  <li key={i} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-semibold text-stone-600">{kindLabel(it.kind)}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {it.title || hostOf(it.url)} <span className="text-xs text-stone-400">{hostOf(it.url)}</span>
                    </span>
                    {inline ? (
                      <button
                        type="button"
                        onClick={() => setViewer(open ? null : { url: it.url, title: it.title || hostOf(it.url) })}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${open ? "bg-stone-900 text-white" : "border border-stone-300 hover:border-stone-500"}`}
                      >
                        {open ? "닫기" : "여기서 보기"}
                      </button>
                    ) : (
                      <span className="text-[11px] text-stone-400">삽입 불가</span>
                    )}
                    <a href={it.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold hover:border-stone-500">
                      새 탭 ↗
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 지원 메시지 · 프로필 */}
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h4 className="text-sm font-bold text-stone-700">지원 메시지</h4>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{a.message ?? <span className="text-stone-400">없음</span>}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h4 className="text-sm font-bold text-stone-700">프로필 <span className="font-normal text-stone-400">지원 시점 {p?.captured_at ? fmtDate(p.captured_at) : ""} 기준</span></h4>
          <dl className="mt-2 divide-y divide-stone-100 text-sm">
            {p?.career_years != null && <Row k="경력">{p.career_years}년</Row>}
            {p?.education && <Row k="학력">{p.education}</Row>}
            {(p?.region || p?.address_hint) && <Row k="지역">{[p.region, p.address_hint].filter(Boolean).join(" ")}</Row>}
          </dl>
          {p?.bio && <><h5 className="mt-4 text-xs font-bold text-stone-500">소개</h5><p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{p.bio}</p></>}
          {p?.career && <><h5 className="mt-4 text-xs font-bold text-stone-500">주요 경력 · 수상 · 전시 · 공연</h5><p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{p.career}</p></>}
        </div>
      </section>

      {/* ── 심사 패널 (항상 보임) ── */}
      <aside className="space-y-3 xl:sticky xl:top-4 xl:self-start">
        <div className="rounded-xl border-2 border-stone-900 bg-white p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold">내 심사</h4>
            <span className="text-[11px] text-stone-500">
              {pending ? "저장 중…" : dirty ? "입력 중" : savedAt ? `저장됨 ${new Date(savedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}` : ""}
            </span>
          </div>
          <label className="mt-3 block">
            <span className="flex items-center justify-between text-xs font-semibold text-stone-700">
              점수 <span className="text-2xl font-extrabold tabular-nums">{score === "" ? "–" : score}<span className="text-xs font-normal text-stone-400"> /100</span></span>
            </span>
            <input
              type="range" min={0} max={100} step={1}
              value={score === "" ? 0 : Number(score)}
              onChange={(e) => { setScore(e.target.value); setDirty(true); }}
              className="mt-1 w-full accent-stone-900"
            />
            <div className="mt-1 flex flex-wrap gap-1">
              {[50, 60, 70, 80, 90, 100].map((v) => (
                <button key={v} type="button" onClick={() => { setScore(String(v)); setDirty(true); }} className={`rounded px-2 py-0.5 text-[11px] font-semibold ${score === String(v) ? "bg-stone-900 text-white" : "bg-stone-100 hover:bg-stone-200"}`}>{v}</button>
              ))}
              <input
                type="number" min={0} max={100} value={score}
                onChange={(e) => { setScore(e.target.value); setDirty(true); }}
                placeholder="직접"
                className="h-6 w-16 rounded border border-stone-300 px-1 text-xs"
              />
              {score !== "" && <button type="button" onClick={() => { setScore(""); setDirty(true); }} className="text-[11px] text-stone-500 underline">지우기</button>}
            </div>
          </label>
          <label className="mt-3 block">
            <span className="text-xs font-semibold text-stone-700">메모</span>
            <textarea
              value={memo}
              onChange={(e) => { setMemo(e.target.value); setDirty(true); }}
              onBlur={() => dirty && doSave()}
              rows={7}
              placeholder="좋았던 점, 아쉬운 점, 확인할 것. 보면서 바로 적으세요. 심사위원끼리는 서로 보이지 않습니다."
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
            />
          </label>
          {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
          <button type="button" onClick={doSave} disabled={pending || !dirty} className="mt-2 h-10 w-full rounded-lg bg-stone-900 text-sm font-semibold text-white disabled:opacity-40">
            저장
          </button>
        </div>

        {isTeam && (
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <h4 className="text-sm font-bold">심사 종합 {a.avg != null && <span className="ml-1 text-lg font-extrabold tabular-nums">{a.avg}</span>}</h4>
            {a.reviews.length === 0 ? (
              <p className="mt-1 text-xs text-stone-500">아직 아무도 점수를 주지 않았습니다.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {a.reviews.map((r) => (
                  <li key={r.reviewer_user_id} className="text-xs">
                    <span className="font-semibold">{r.reviewer_user_id === myId ? "나" : (teamNames[r.reviewer_user_id] ?? r.reviewer_name)}</span>
                    <span className="ml-1 font-bold tabular-nums">{r.score ?? "–"}</span>
                    {r.memo && <p className="mt-0.5 whitespace-pre-line text-stone-600">{r.memo}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {isTeam && (
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <h4 className="text-sm font-bold">선발 단계</h4>
            <p className="mt-0.5 text-[11px] text-stone-500">바꾸면 지원자에게 알림이 갑니다.</p>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {APPLICATION_STAGES.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  disabled={stagePending || a.status === s.code}
                  onClick={() =>
                    startStage(async () => {
                      const r = await setApplicationStage(postingId, a.id, s.code);
                      if (r.ok) onStageChanged(s.code);
                      else setErr(r.error);
                    })
                  }
                  className={`rounded-lg px-2 py-1.5 text-xs font-semibold ${a.status === s.code ? `${s.tone} ring-2 ring-stone-900` : "border border-stone-200 hover:border-stone-500"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-3 py-2">
      <dt className="text-stone-500">{k}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function MediaViewer({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const e = embedFor(url);
  return (
    <div className="overflow-hidden rounded-xl border border-stone-900 bg-stone-950 text-white">
      <div className="flex items-center gap-2 px-3 py-2 text-xs">
        <span className="min-w-0 flex-1 truncate font-semibold">{title}</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="rounded px-2 py-1 hover:bg-white/10">새 탭 ↗</a>
        <button type="button" onClick={onClose} className="rounded px-2 py-1 hover:bg-white/10">닫기 ✕</button>
      </div>
      {e.kind === "iframe" && (
        <div className={e.ratio === "video" ? "aspect-video w-full" : "h-40 w-full"}>
          <iframe src={e.src} title={title} className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        </div>
      )}
      {e.kind === "image" && (
        <div className="flex max-h-[70vh] items-center justify-center bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={e.src} alt={title} className="max-h-[70vh] w-auto max-w-full object-contain" />
        </div>
      )}
      {e.kind === "external" && <p className="px-3 pb-3 text-xs text-stone-300">이 사이트는 화면 안에 띄울 수 없습니다. 새 탭에서 여세요.</p>}
    </div>
  );
}
