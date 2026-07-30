"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { parseWorkbook, type Data } from "@/lib/excel";
import { auth, storage, firebaseEnabled, MASTER_PATH } from "@/lib/firebase";

/**
 * 데이터 컨텍스트 — 보안 원칙:
 * 엑셀 파일은 사용자 브라우저 안에서만 파싱한다.
 *
 * Firebase가 설정된 경우(firebaseEnabled): 로그인하면 마스터 엑셀을 Firebase Storage에서
 *   자동으로 내려받아 표시한다. 매번 파일을 고를 필요가 없다. (관리자는 새 엑셀을 업로드)
 * Firebase 미설정: 기존처럼 브라우저에서 파일을 선택해 로드한다(서버·저장소 전송 없음).
 *
 * 어느 경우든 협약서·특허증 원본은 Firebase에 올리지 않고 로컬에서만 연다.
 */

const STORAGE_KEY = "rlms-lite-file-v1";

type Ctx = {
  data: Data | null;
  fileName: string | null;
  remembered: boolean;
  ready: boolean;
  error: string | null;
  loadFile: (file: File, remember: boolean) => Promise<void>;
  clear: () => void;
  // Firebase 연동
  firebaseEnabled: boolean;
  user: User | null;
  authReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  uploadMaster: (file: File) => Promise<void>;
  source: "firebase" | "local" | null;
};

const DataCtx = createContext<Ctx | null>(null);

function b64encode(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
}
function b64decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [remembered, setRemembered] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!firebaseEnabled);
  const [source, setSource] = useState<"firebase" | "local" | null>(null);

  // Firebase Storage에서 마스터 엑셀 자동 로드
  const loadFromFirebase = useCallback(async () => {
    if (!storage) return false;
    try {
      const url = await getDownloadURL(ref(storage, MASTER_PATH));
      const res = await fetch(url);
      if (!res.ok) return false;
      const buf = await res.arrayBuffer();
      setData(parseWorkbook(new Uint8Array(buf)));
      setFileName("신정개발_RLMS_마스터데이터.xlsx (Firebase)");
      setSource("firebase");
      return true;
    } catch {
      // 아직 업로드된 엑셀이 없거나 권한 없음 → 업로드/파일선택 화면
      return false;
    }
  }, []);

  // 인증 상태 감시 (Firebase 사용 시)
  useEffect(() => {
    if (!firebaseEnabled || !auth) return;
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthReady(true);
      if (u) {
        setReady(false);
        await loadFromFirebase();
        setReady(true);
      } else {
        setData(null);
        setSource(null);
        setReady(true);
      }
    });
    return () => unsub();
  }, [loadFromFirebase]);

  // Firebase 미사용 시: 로컬 기억/개발 파일 자동 로드
  useEffect(() => {
    if (firebaseEnabled) return;
    (async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const { name, b64 } = JSON.parse(raw) as { name: string; b64: string };
          setData(parseWorkbook(b64decode(b64)));
          setFileName(name);
          setRemembered(true);
          setSource("local");
          setReady(true);
          return;
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
      try {
        const res = await fetch("/api/local-file");
        if (res.ok) {
          const buf = await res.arrayBuffer();
          setData(parseWorkbook(new Uint8Array(buf)));
          setFileName(decodeURIComponent(res.headers.get("x-file-name") ?? "로컬 파일"));
          setSource("local");
        }
      } catch {
        /* 파일 선택 화면 */
      }
      setReady(true);
    })();
  }, []);

  const loadFile = useCallback(async (file: File, remember: boolean) => {
    setError(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const parsed = parseWorkbook(bytes);
      setData(parsed);
      setFileName(file.name);
      setRemembered(remember);
      setSource("local");
      if (remember) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: file.name, b64: b64encode(bytes), savedAt: new Date().toISOString() }));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "파일을 읽지 못했습니다.");
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase가 설정되지 않았습니다.");
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      const code = (e as { code?: string })?.code ?? "";
      if (code === "auth/operation-not-allowed" || code === "auth/configuration-not-found") {
        throw new Error("Firebase 콘솔에서 이메일/비밀번호 로그인이 아직 켜지지 않았습니다.");
      }
      if (code === "auth/network-request-failed") {
        throw new Error("네트워크 오류로 로그인하지 못했습니다.");
      }
      // invalid-credential / user-not-found / wrong-password
      throw new Error("이메일 또는 비밀번호가 올바르지 않습니다. (계정은 Firebase 콘솔 Authentication → Users에서 추가)");
    }
  }, []);

  const signOutUser = useCallback(async () => {
    if (auth) await signOut(auth);
    setData(null);
    setSource(null);
  }, []);

  // 관리자: 새 마스터 엑셀을 Firebase Storage에 업로드 → 즉시 반영
  const uploadMaster = useCallback(async (file: File) => {
    if (!storage) throw new Error("Firebase가 설정되지 않았습니다.");
    setError(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      parseWorkbook(bytes); // 형식 검증(실패 시 throw)
      await uploadBytes(ref(storage, MASTER_PATH), bytes, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      await loadFromFirebase();
    } catch (e) {
      const code = (e as { code?: string })?.code ?? "";
      if (code === "storage/unauthorized") {
        setError("업로드가 거부됐습니다 — Firebase 콘솔 Storage → 규칙에서 최신 규칙을 게시했는지 확인하세요.");
      } else if (code === "storage/unauthenticated") {
        setError("로그인이 필요합니다. 다시 로그인해 주세요.");
      } else if (code.startsWith("storage/")) {
        setError(`업로드 실패 (${code}). 잠시 후 다시 시도하세요.`);
      } else {
        setError(e instanceof Error ? e.message : "엑셀 형식이 올바르지 않습니다.");
      }
      throw e;
    }
  }, [loadFromFirebase]);

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setData(null);
    setFileName(null);
    setRemembered(false);
    setSource(null);
  }, []);

  return (
    <DataCtx.Provider
      value={{
        data, fileName, remembered, ready, error, loadFile, clear,
        firebaseEnabled, user, authReady, signIn, signOutUser, uploadMaster, source,
      }}
    >
      {children}
    </DataCtx.Provider>
  );
}

export function useDataCtx(): Ctx {
  const ctx = useContext(DataCtx);
  if (!ctx) throw new Error("DataProvider가 필요합니다.");
  return ctx;
}
