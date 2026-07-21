import type { Metadata } from "next";
import { DataProvider } from "@/lib/data-context";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "신정개발 연구소 현황",
  description: "엑셀 마스터 데이터 기반 연구소 현황 조회 — 신정개발 (sjdevel.com)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <DataProvider>
          <Sidebar />
          <div className="pl-52">
            <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
            <footer className="mx-auto max-w-6xl px-6 pb-8 text-xs text-slate-400">
              🔒 데이터는 사용자가 브라우저에서 연 엑셀 파일에서만 읽으며, 서버·저장소로 전송되지 않습니다.
            </footer>
          </div>
        </DataProvider>
      </body>
    </html>
  );
}
