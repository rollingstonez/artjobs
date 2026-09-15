// 서버 응답을 기다리는 동안 화면 자리를 잡아 주는 뼈대. app/**/loading.tsx 들이 함께 쓴다.
//
// 이게 없으면 Next.js 는 새 페이지가 다 준비될 때까지 "이전 화면"을 그대로 두기 때문에,
// 메뉴를 눌러도 아무 일도 일어나지 않는 것처럼 보인다(먹통 느낌). 뼈대를 두면 클릭 즉시 바뀐다.
// 서버 컴포넌트라 브라우저로 내려가는 자바스크립트가 늘지 않는다.

function Bar({ className }: { className: string }) {
  return <span className={`block rounded bg-stone-200 ${className}`} />;
}

/** 공고·구직·인재 카드 한 장 */
function CardSkeleton() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <Bar className="h-3 w-20" />
      <Bar className="mt-3 h-4 w-full" />
      <Bar className="mt-2 h-4 w-2/3" />
      <div className="mt-4 flex gap-2">
        <Bar className="h-5 w-14 rounded-full" />
        <Bar className="h-5 w-16 rounded-full" />
        <Bar className="h-5 w-12 rounded-full" />
      </div>
    </div>
  );
}

/** 목록 화면(채용공고·오디션·구직·인재) 전체 */
export function ListPageSkeleton({ cards = 6, filters = true }: { cards?: number; filters?: boolean }) {
  return (
    <main
      role="status"
      aria-label="불러오는 중"
      className="mx-auto w-full max-w-5xl animate-pulse px-4 pb-16 md:px-6"
    >
      <div className="py-8">
        <Bar className="h-7 w-40" />
        <Bar className="mt-2.5 h-3.5 w-72 max-w-full" />
        <Bar className="mt-2 h-3.5 w-24" />
      </div>
      {filters && (
        <>
          <Bar className="mb-4 h-11 w-full rounded-xl" />
          <div className="flex gap-1.5 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <Bar key={i} className="h-8 w-16 shrink-0 rounded-full" />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bar key={i} className="h-10 w-32 rounded-lg" />
            ))}
          </div>
        </>
      )}
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {Array.from({ length: cards }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <span className="sr-only">불러오는 중입니다.</span>
    </main>
  );
}

/** 글 하나를 보여 주는 화면(공고 상세·공지 등) */
export function DetailPageSkeleton() {
  return (
    <main
      role="status"
      aria-label="불러오는 중"
      className="mx-auto w-full max-w-5xl animate-pulse px-4 pb-16 md:px-6"
    >
      <div className="py-8">
        <Bar className="h-3 w-24" />
        <Bar className="mt-3 h-7 w-3/4" />
        <Bar className="mt-3 h-4 w-40" />
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <Bar key={i} className={`mt-3 h-3.5 ${i % 3 === 2 ? "w-1/2" : "w-full"}`} />
        ))}
      </div>
      <span className="sr-only">불러오는 중입니다.</span>
    </main>
  );
}

/** 마이페이지·관리자처럼 왼쪽 메뉴 + 본문으로 나뉜 화면의 "본문"만 */
export function PanelSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="불러오는 중" className="animate-pulse">
      <Bar className="h-6 w-36" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-xl border border-stone-200 bg-white p-4">
            <Bar className="h-4 w-1/2" />
            <Bar className="mt-2.5 h-3 w-1/3" />
          </div>
        ))}
      </div>
      <span className="sr-only">불러오는 중입니다.</span>
    </div>
  );
}
