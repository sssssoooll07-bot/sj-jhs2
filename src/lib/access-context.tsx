"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, OWNER_EMAIL } from "@/lib/firebase";
import { useDataCtx } from "@/lib/data-context";
import { ALL_KEYS, type SectionKey } from "@/lib/sections";

/**
 * 접근 권한 컨텍스트
 * - 소유자: 전체 열람 + 편집
 * - 등록된 보기 전용 계정: 지정된 '열람 범위'만 보기 (편집 불가)
 * - 그 외 로그인 계정: 열람 권한 없음
 */
type Access = {
  ready: boolean;
  isOwner: boolean;
  canEdit: boolean;
  authorized: boolean; // 소유자 또는 등록된 뷰어
  scope: SectionKey[] | null; // null = 전체(소유자·"*"), 배열 = 허용 섹션
  allowed: (key: SectionKey | null) => boolean;
};

const Ctx = createContext<Access | null>(null);

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const { user, authReady, firebaseEnabled } = useDataCtx();
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [scope, setScope] = useState<SectionKey[] | null>(null);

  const isOwner = !!user && user.email === OWNER_EMAIL;

  const load = useCallback(async () => {
    // Firebase 미사용(로컬 단독) → 제한 없음
    if (!firebaseEnabled) { setAuthorized(true); setScope(null); setReady(true); return; }
    if (isOwner) { setAuthorized(true); setScope(null); setReady(true); return; }
    if (!user) { setAuthorized(false); setScope([]); setReady(true); return; }
    if (!db) { setAuthorized(true); setScope(null); setReady(true); return; }
    try {
      const snap = await getDoc(doc(db, "config", "access"));
      const d = snap.exists() ? (snap.data() as { viewers?: string[]; scopes?: Record<string, string[]> }) : {};
      const email = (user.email ?? "").toLowerCase();
      const viewers = (d.viewers ?? []).map((v) => v.toLowerCase());
      if (!viewers.includes(email)) { setAuthorized(false); setScope([]); setReady(true); return; }
      const scopes = d.scopes ?? {};
      const mine = scopes[email] ?? scopes[user.email ?? ""] ?? null;
      if (!mine || mine.includes("*")) setScope(null); // 전체
      else setScope(mine.filter((k): k is SectionKey => (ALL_KEYS as string[]).includes(k)));
      setAuthorized(true); setReady(true);
    } catch {
      // 범위를 읽지 못하면 안전하게 차단
      setAuthorized(false); setScope([]); setReady(true);
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

  return <Ctx.Provider value={{ ready, isOwner, canEdit: isOwner, authorized, scope, allowed }}>{children}</Ctx.Provider>;
}

export function useAccess(): Access {
  const c = useContext(Ctx);
  if (!c) throw new Error("AccessProvider가 필요합니다.");
  return c;
}
