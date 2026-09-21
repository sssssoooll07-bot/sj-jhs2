"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, OWNER_EMAIL } from "@/lib/firebase";
import { useDataCtx } from "@/lib/data-context";
import { ALL_KEYS, sectionForPath, type SectionKey } from "@/lib/sections";

/**
 * 접근 권한 컨텍스트
 * - 소유자: 전체 열람 + 편집
 * - 등록된 보기 전용 계정: 지정된 '열람 범위'만 보기, '수정 범위'에 든 섹션은 편집도 가능
 * - 그 외 로그인 계정: 열람 권한 없음
 */
type Access = {
  ready: boolean;
  isOwner: boolean;
  canEdit: boolean; // 소유자 전용(마스터 교체 등 전역 편집)
  authorized: boolean; // 소유자 또는 등록된 뷰어
  scope: SectionKey[] | null; // 열람 범위 (null = 전체)
  editScope: SectionKey[] | null; // 수정 범위 (null = 전체(소유자))
  allowed: (key: SectionKey | null) => boolean;
  canEditSection: (key: SectionKey | null) => boolean;
};

const Ctx = createContext<Access | null>(null);

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const { user, authReady, firebaseEnabled } = useDataCtx();
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [scope, setScope] = useState<SectionKey[] | null>(null);
  const [editScope, setEditScope] = useState<SectionKey[] | null>(null);

  const isOwner = !!user && user.email === OWNER_EMAIL;

  const load = useCallback(async () => {
    if (!firebaseEnabled) { setAuthorized(true); setScope(null); setEditScope(null); setReady(true); return; }
    if (isOwner) { setAuthorized(true); setScope(null); setEditScope(null); setReady(true); return; }
    if (!user) { setAuthorized(false); setScope([]); setEditScope([]); setReady(true); return; }
    if (!db) { setAuthorized(true); setScope(null); setEditScope(null); setReady(true); return; }
    try {
      const snap = await getDoc(doc(db, "config", "access"));
      const d = snap.exists() ? (snap.data() as { viewers?: string[]; scopes?: Record<string, string[]>; editScopes?: Record<string, string[]> }) : {};
      const email = (user.email ?? "").toLowerCase();
      const viewers = (d.viewers ?? []).map((v) => v.toLowerCase());
      if (!viewers.includes(email)) { setAuthorized(false); setScope([]); setEditScope([]); setReady(true); return; }
      const pick = (m: Record<string, string[]> | undefined) => {
        const raw = m?.[email] ?? m?.[user.email ?? ""] ?? null;
        if (!raw) return [] as SectionKey[];
        if (raw.includes("*")) return null; // 전체
        return raw.filter((k): k is SectionKey => (ALL_KEYS as string[]).includes(k));
      };
      // 열람 범위: 없으면 전체(하위호환), 수정 범위: 없으면 없음(보기 전용)
      const sc = d.scopes?.[email] ?? d.scopes?.[user.email ?? ""] ?? null;
      setScope(!sc || sc.includes("*") ? null : sc.filter((k): k is SectionKey => (ALL_KEYS as string[]).includes(k)));
      setEditScope(pick(d.editScopes));
      setAuthorized(true); setReady(true);
    } catch {
      setAuthorized(false); setScope([]); setEditScope([]); setReady(true);
    }
  }, [firebaseEnabled, isOwner, user]);

  useEffect(() => {
    if (firebaseEnabled && !authReady) { setReady(false); return; }
    setReady(false);
    void load();
  }, [firebaseEnabled, authReady, load]);

  const allowed = useCallback(
    (key: SectionKey | null) => {
      if (isOwner) return true;
      if (!authorized) return false;
      if (scope === null) return true;
      if (!key) return false;
      return scope.includes(key);
    },
    [isOwner, authorized, scope]
  );

  const canEditSection = useCallback(
    (key: SectionKey | null) => {
      if (isOwner) return true;
      if (!authorized) return false;
      if (editScope === null) return true; // "*" 부여
      if (!key) return false;
      return editScope.includes(key);
    },
    [isOwner, authorized, editScope]
  );

  return (
    <Ctx.Provider value={{ ready, isOwner, canEdit: isOwner, authorized, scope, editScope, allowed, canEditSection }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAccess(): Access {
  const c = useContext(Ctx);
  if (!c) throw new Error("AccessProvider가 필요합니다.");
  return c;
}

/** 현재 페이지(라우트)의 섹션에 대한 편집 권한 */
export function useCanEditHere(): boolean {
  const { canEditSection } = useAccess();
  const pathname = usePathname();
  return canEditSection(sectionForPath(pathname));
}
