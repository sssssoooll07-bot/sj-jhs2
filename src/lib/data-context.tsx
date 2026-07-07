"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { parseWorkbook, type Data } from "@/lib/excel";

/**
 * 데이터 컨텍스트 — 보안 원칙:
 * 엑셀 파일은 사용자 브라우저 안에서만 읽고 파싱한다. 서버·저장소로 전송하지 않는다.
 * 새로고침 편의를 위해 파일 바이트를 이 브라우저의 localStorage에만 보관한다("이 기기에 기억").
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
};

const DataCtx = createContext<Ctx | null>(null);

function b64encode(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
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

  useEffect(() => {
    (async () => {
      // 1) 이 기기에 기억된 파일 복원 (브라우저 밖으로 나가지 않음)
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const { name, b64 } = JSON.parse(raw) as { name: string; b64: string };
          setData(parseWorkbook(b64decode(b64)));
          setFileName(name);
          setRemembered(true);
          setReady(true);
          return;
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
      // 2) 로컬 개발 편의: 개발 머신의 data/ 폴더 파일 자동 로드 (Vercel에서는 항상 404)
      try {
        const res = await fetch("/api/local-file");
        if (res.ok) {
          const buf = await res.arrayBuffer();
          setData(parseWorkbook(new Uint8Array(buf)));
          setFileName(decodeURIComponent(res.headers.get("x-file-name") ?? "로컬 파일"));
        }
      } catch {
        /* 무시 — 파일 선택 화면 표시 */
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
      if (remember) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: file.name, b64: b64encode(bytes), savedAt: new Date().toISOString() }));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "파일을 읽지 못했습니다.");
    }
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setData(null);
    setFileName(null);
    setRemembered(false);
  }, []);

  return (
    <DataCtx.Provider value={{ data, fileName, remembered, ready, error, loadFile, clear }}>
      {children}
    </DataCtx.Provider>
  );
}

export function useDataCtx(): Ctx {
  const ctx = useContext(DataCtx);
  if (!ctx) throw new Error("DataProvider가 필요합니다.");
  return ctx;
}
