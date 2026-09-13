// 회원가입·로그인·비밀번호 찾기 화면의 공통 틀. 제목 + 한 줄 안내 + 흰 카드.
import type { ReactNode } from "react";

export default function AuthCard({
  title,
  lead,
  children,
  footer,
  wide,
}: {
  title: string;
  lead?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className={`mx-auto w-full px-4 pb-16 md:px-6 ${wide ? "max-w-lg" : "max-w-md"}`}>
      <div className="pt-10 pb-6 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
        {lead && <p className="mt-2 text-sm text-stone-600">{lead}</p>}
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-7">{children}</div>
      {footer && <div className="mt-5 text-center text-sm text-stone-600">{footer}</div>}
    </main>
  );
}
