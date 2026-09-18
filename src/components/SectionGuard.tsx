"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccess } from "@/lib/access-context";
import { useDataCtx } from "@/lib/data-context";
import { SECTIONS, sectionForPath } from "@/lib/sections";

function Blocked({ title, msg }: { title: string; msg: string }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="text-3xl">🔒</p>
      <h2 className="mt-3 text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{msg}</p>
    </div>
  );
}

/** 로그인한 뷰어의 열람 범위를 벗어난 섹션 접근을 차단한다. 소유자는 전체 통과. */
export default function SectionGuard({ children }: { children: React.ReactNode }) {
  const { ready, isOwner, authorized, allowed } = useAccess();
  const { user, authReady, firebaseEnabled } = useDataCtx();
  const pathname = usePathname();
  const router = useRouter();

  const isAccessRoute = pathname === "/access" || pathname.startsWith("/access/");
  const section = sectionForPath(pathname);

  // 허용되지 않은 랜딩(예: 대시보드)에 들어오면 첫 허용 섹션으로 이동
  useEffect(() => {
    if (!ready || isOwner || !authorized || isAccessRoute) return;
    if (section && !allowed(section)) {
      const first = SECTIONS.find((s) => allowed(s.key));
      if (first && first.href !== pathname) router.replace(first.href);
    }
  }, [ready, isOwner, authorized, section, allowed, isAccessRoute, pathname, router]);

  // 로그인 화면은 각 페이지(WithData)가 담당 — 미로그인 시 그대로 통과
  if (firebaseEnabled && !authReady) return null;
  if (firebaseEnabled && !user) return <>{children}</>;
  if (!ready) return <div className="py-24 text-center text-sm text-slate-400">권한 확인 중…</div>;

  if (isOwner) return <>{children}</>;

  if (!authorized) {
    return <Blocked title="접근 권한이 없습니다" msg={`이 계정(${user?.email ?? ""})은 열람 권한이 없습니다. 관리자에게 문의하세요.`} />;
  }
  if (isAccessRoute) {
    return <Blocked title="접근 관리" msg="소유자 계정만 접근할 수 있습니다." />;
  }
  if (section && !allowed(section)) {
    return <Blocked title="열람 범위가 아닙니다" msg="이 섹션은 열람 권한 범위에 포함되어 있지 않습니다." />;
  }
  return <>{children}</>;
}
