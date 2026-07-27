"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DataStatus } from "@/components/FileGate";

const NAV = [
  { href: "/", label: "대시보드", icon: "▦" },
  { href: "/projects", label: "과제", icon: "⚗" },
  { href: "/patents", label: "특허", icon: "🧾" },
  { href: "/agreements", label: "협약서", icon: "📜" },
  { href: "/funding", label: "지원사업 공고", icon: "📢" },
  { href: "/compliance", label: "법정의무·참여율", icon: "⚖" },
  { href: "/certifications", label: "인증·면허", icon: "🏅" },
  { href: "/researchers", label: "연구원", icon: "🧑‍🔬" },
  { href: "/library", label: "자료실", icon: "📁" },
];

/** 좌측 탭 내비게이션 */
export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-52 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <Link href="/" className="block text-lg font-extrabold tracking-tight text-slate-900">
          신정개발
          <span className="block text-sm font-bold text-blue-600">연구소 현황</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {NAV.map((n) => {
          const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href + "/"));
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
                active ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="w-4 text-center text-xs">{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-2 border-t border-slate-100 p-4">
        <DataStatus vertical />
        <a href="https://sjdevel.com/" target="_blank" rel="noreferrer" className="block text-xs text-slate-400 hover:text-blue-600">
          sjdevel.com ↗
        </a>
      </div>
    </aside>
  );
}
