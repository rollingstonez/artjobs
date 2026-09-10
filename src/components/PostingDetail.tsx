// 공고 상세 — /jobs/[id] 와 /auditions/[id] 가 함께 쓴다.
import Link from "next/link";
import ApplyForm from "@/components/ApplyForm";
import SaveButton from "@/components/SaveButton";
import { startConversation } from "@/lib/actions/messages";
import { fmtDate, getDeadline, periodText } from "@/lib/format";
import type { AccountRole, ApplicationStatus } from "@/types/account";
import {
  boardLabel,
  employmentLabel,
  fieldLabel,
  genreLabel,
  roleLabel,
  type Posting,
} from "@/types/job";

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[96px_1fr] gap-3 py-2.5 text-sm md:grid-cols-[120px_1fr]">
      <dt className="text-stone-500">{label}</dt>
      <dd className="whitespace-pre-line text-stone-800">{value}</dd>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-700">
      {children}
    </span>
  );
}

export interface ViewerState {
  loggedIn: boolean;
  role: AccountRole | null;
  saved: boolean;
  applicationStatus: ApplicationStatus | null;
  accountsEnabled: boolean;
}

export default function PostingDetail({ p, viewer }: { p: Posting; viewer: ViewerState }) {
  const deadline = getDeadline(p.applyEnd);
  const isOrgPosting = Boolean(p.orgUserId);
  const isExpired = deadline.kind === "expired";
  const backHref = p.board === "audition" ? "/auditions" : "/jobs";
  const field = fieldLabel(p.field);
  const genre = genreLabel(p.genre);
  const role = roleLabel(p.role);
  const classification = [field, genre, role].filter(Boolean).join(" · ") || null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 md:px-6">
      <div className="py-6">
        <Link href={backHref} className="text-sm text-stone-500 hover:text-stone-900">
          ← {boardLabel(p.board)} 목록
        </Link>
      </div>

      <article className="rounded-2xl border border-stone-200 bg-white p-5 md:p-8">
        <div className="flex flex-wrap items-center gap-1.5">
          {p.region && (
            <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[11px] font-bold text-white">
              {p.region}
            </span>
          )}
          {field && <Chip>{genre ? `${field} · ${genre}` : field}</Chip>}
          {role && <Chip>{role}</Chip>}
          {employmentLabel(p.employmentType) && <Chip>{employmentLabel(p.employmentType)}</Chip>}
          {deadline.kind !== "none" && (
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                deadline.kind === "soon" ? "bg-red-50 text-red-600" : "bg-stone-100 text-stone-500"
              }`}
            >
              {deadline.label}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-500">{p.organization}</p>
            <h1 className="mt-1 text-xl font-extrabold leading-snug md:text-2xl">{p.title}</h1>
          </div>
          {viewer.accountsEnabled && (
            <SaveButton postingId={p.id} saved={viewer.saved} loggedIn={viewer.loggedIn} size="md" />
          )}
        </div>

        <dl className="mt-6 divide-y divide-stone-100 border-y border-stone-100">
          <Row label="분야·직무" value={classification} />
          <Row label="원문 분야" value={p.categoryRaw} />
          <Row label="고용형태" value={p.employmentRaw ?? employmentLabel(p.employmentType)} />
          <Row label="모집인원" value={p.recruitCount} />
          <Row label="급여·지원금" value={p.salary} />
          <Row label="근무기간" value={periodText(p.workStart, p.workEnd)} />
          <Row label="근무지" value={p.address} />
          <Row label="접수기간" value={periodText(p.applyStart, p.applyEnd)} />
          <Row label="접수방법" value={p.applyMethod} />
          <Row label="지원 이메일" value={p.applyEmail} />
          <Row label="연락처" value={p.applyContact} />
          <Row label="제출서류" value={p.requiredDocs} />
        </dl>

        {p.description && (
          <section className="mt-6">
            <h2 className="text-sm font-bold text-stone-700">공고 내용</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-stone-800">
              {p.description}
            </p>
          </section>
        )}

        {/* 지원 영역 */}
        {viewer.accountsEnabled && !isExpired && (
          <section className="mt-8 rounded-xl border border-stone-200 bg-stone-50 p-4">
            <h2 className="text-sm font-bold text-stone-800">{isOrgPosting ? "이 공고에 지원하기" : "지원 기록 남기기"}</h2>
            {viewer.applicationStatus ? (
              <p className="mt-2 text-sm text-stone-700">
                이미 지원한 공고입니다.{" "}
                <Link href="/me/applications" className="font-semibold underline underline-offset-2">지원 내역</Link>에서 상태를 확인하세요.
              </p>
            ) : !viewer.loggedIn ? (
              <p className="mt-2 text-sm text-stone-600">
                <Link href={`/login?next=${encodeURIComponent(`/jobs/${p.id}`)}`} className="font-semibold underline underline-offset-2">로그인</Link>하거나{" "}
                <Link href="/signup?role=artist" className="font-semibold underline underline-offset-2">예술가로 가입</Link>하면 프로필로 바로 지원하고 지원 내역을 관리할 수 있습니다.
              </p>
            ) : viewer.role === "artist" ? (
              <div className="mt-3">
                <ApplyForm postingId={p.id} isOrgPosting={isOrgPosting} sourceUrl={p.sourceUrl} sourceName={p.sourceName} />
              </div>
            ) : (
              <p className="mt-2 text-sm text-stone-600">기관 회원은 지원할 수 없습니다.</p>
            )}
          </section>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-5">
          <p className="text-xs text-stone-500">
            {isOrgPosting ? `기관이 직접 등록 · ${fmtDate(p.createdAt)}` : `출처: ${p.sourceName} · 수집일 ${fmtDate(p.createdAt)}`}
          </p>
          <div className="flex gap-2">
            {isOrgPosting && viewer.role === "artist" && p.orgUserId && (
              <form action={startConversation.bind(null, p.orgUserId, p.id)}>
                <button className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold hover:border-stone-500">기관에 문의</button>
              </form>
            )}
            {p.sourceUrl && (
              <a
                href={p.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-700"
              >
                {isOrgPosting ? "기관 접수 페이지 ↗" : "원문 보기 ↗"}
              </a>
            )}
          </div>
        </div>
      </article>
    </main>
  );
}
