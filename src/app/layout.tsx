import type { Metadata } from "next";
import Link from "next/link";
import { DataProvider } from "@/lib/data-context";
import { DataStatus } from "@/components/FileGate";
import "./globals.css";

export const metadata: Metadata = {
  title: "신정개발 연구소 현황",
  description: "엑셀 마스터 데이터 기반 연구소 현황 조회 — 신정개발 (sjdevel.com)",
};

const NAV = [
  { href: "/", label: "대시보드" },
  { href: "/projects", label: "과제" },
  { href: "/patents", label: "특허" },
  { href: "/funding", label: "지원사업 공고" },
  { href: "/compliance", label: "법정의무·참여율" },
  { href: "/certifications", label: "인증·면허" },
  { href: "/researchers", label: "연구원" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <DataProvider>
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3">
              <Link href="/" className="mr-2 text-lg font-extrabold tracking-tight text-slate-900">
                신정개발 <span className="text-blue-600">연구소 현황</span>
              </Link>
              <nav className="flex flex-wrap gap-1 text-sm">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="rounded-lg px-2.5 py-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                    {n.label}
                  </Link>
                ))}
              </nav>
              <div className="ml-auto flex items-center gap-3">
                <DataStatus />
                <a href="https://sjdevel.com/" target="_blank" rel="noreferrer" className="text-xs text-slate-400 hover:text-blue-600">
                  sjdevel.com ↗
                </a>
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
          <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-slate-400">
            🔒 데이터는 사용자가 브라우저에서 연 엑셀 파일에서만 읽으며, 서버·저장소로 전송되지 않습니다.
          </footer>
        </DataProvider>
      </body>
    </html>
  );
}
