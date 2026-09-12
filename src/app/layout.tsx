import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import VisitTracker from "@/components/VisitTracker";
import { SITE_URL } from "@/lib/site";
import { getCurrentUser } from "@/lib/auth";
import { HAS_SUPABASE } from "@/lib/supabase/env";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

const TITLE = "아트잡스 — 미술·음악·무용·국악·연극 채용·공모를 내 집 근처부터";
const DESCRIPTION =
  "미술관·공연장·예술단·문화재단·학교에 흩어진 순수예술 다섯 분야의 채용공고와 오디션·공모를 매일 모아, 내가 사는 곳에서 가까운 순서로 보여드립니다.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "아트잡스",
    title: TITLE,
    description: DESCRIPTION,
    locale: "ko_KR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const me = HAS_SUPABASE ? await getCurrentUser() : null;
  const navUser = me ? { name: me.profile.display_name, role: me.profile.role, unread: me.unreadNotifications } : null;
  return (
    <html lang="ko" className={`${notoSansKr.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-stone-50 text-stone-900">
        <SiteNav user={navUser} accountsEnabled={HAS_SUPABASE} />
        {HAS_SUPABASE && <VisitTracker />}
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
