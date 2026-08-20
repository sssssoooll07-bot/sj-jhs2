"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FlaskConical, Lightbulb,
  Megaphone, Percent, BadgeCheck, Users, FolderOpen, Wallet, type LucideIcon,
} from "lucide-react";
import { DataStatus } from "@/components/FileGate";

const NAV: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/", label: "대시보드", Icon: LayoutDashboard },
  { href: "/funding", label: "지원사업 공고", Icon: Megaphone },
  { href: "/projects", label: "과제", Icon: FlaskConical },
  { href: "/compliance", label: "참여율", Icon: Percent },
  { href: "/budget", label: "사업비 현황", Icon: Wallet },
  { href: "/researchers", label: "연구원", Icon: Users },
  { href: "/certifications", label: "인증·면허", Icon: BadgeCheck },
  { href: "/patents", label: "특허", Icon: Lightbulb },
  { href: "/library", label: "자료실", Icon: FolderOpen },
];

/** 좌측 탭 내비게이션 (다크) */
export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col bg-slate-900 text-slate-300">
      <div className="px-5 py-5">
        <Link href="/" className="block">
          <span className="text-lg font-extrabold tracking-tight text-white">신정개발</span>
          <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-400">
            연구소 관리 시스템
          </span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-1">
        {NAV.map((n) => {
          const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href + "/"));
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={(e) => { if (active) { e.preventDefault(); window.location.reload(); } }}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                active
                  ? "bg-blue-600 font-semibold text-white shadow-lg shadow-blue-900/40"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <n.Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.4 : 1.9} />
              <span className="truncate">{n.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="space-y-2 border-t border-white/10 p-4">
        <DataStatus vertical />
        <a href="https://sjdevel.com/" target="_blank" rel="noreferrer" className="block text-xs text-slate-500 transition-colors hover:text-blue-400">
          sjdevel.com ↗
        </a>
      </div>
    </aside>
  );
}
