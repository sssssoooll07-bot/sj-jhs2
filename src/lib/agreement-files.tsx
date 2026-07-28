"use client";

import { createContext, useCallback, useContext, useState } from "react";

/**
 * 로컬 문서 파일 컨텍스트 — 협약서·특허증 등 민감 원본을 브라우저에서만 연다.
 * 보안 원칙: 파일은 서버·GitHub로 전송하지 않는다. 사용자가 이 브라우저에서
 * 폴더를 선택하면 그 순간의 File 객체만 메모리에 보관하고, 새로고침하면 사라진다.
 * 여러 폴더를 선택하면 누적되며(협약서 폴더 + 특허증 폴더), blob URL로 "보기"만 제공한다.
 */

type Ctx = {
  files: Map<string, File>; // 파일명(소문자) → File
  count: number;
  loadFolder: (fileList: FileList) => void;
  getFile: (fileName: string | null) => File | null;
  getByPattern: (pattern: string | null) => File | null;
  clear: () => void;
};

const AgreementCtx = createContext<Ctx | null>(null);

const norm = (name: string) => name.trim().toLowerCase();

export function AgreementFilesProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<Map<string, File>>(new Map());

  const loadFolder = useCallback((fileList: FileList) => {
    setFiles((prev) => {
      const map = new Map(prev); // 기존 로드에 누적
      for (const f of Array.from(fileList)) {
        if (/\.(pdf|hwp|hwpx|docx?|png|jpe?g)$/i.test(f.name)) {
          map.set(norm(f.name), f);
        }
      }
      return map;
    });
  }, []);

  const getFile = useCallback(
    (fileName: string | null) => (fileName ? files.get(norm(fileName)) ?? null : null),
    [files]
  );

  // 파일명에 특정 문자열(등록번호 등)을 포함하는 파일 찾기
  const getByPattern = useCallback(
    (pattern: string | null) => {
      if (!pattern) return null;
      const p = pattern.trim().toLowerCase();
      if (!p) return null;
      for (const [name, file] of files) {
        if (name.includes(p)) return file;
      }
      return null;
    },
    [files]
  );

  const clear = useCallback(() => setFiles(new Map()), []);

  return (
    <AgreementCtx.Provider value={{ files, count: files.size, loadFolder, getFile, getByPattern, clear }}>
      {children}
    </AgreementCtx.Provider>
  );
}

export function useAgreementFiles(): Ctx {
  const ctx = useContext(AgreementCtx);
  if (!ctx) throw new Error("AgreementFilesProvider가 필요합니다.");
  return ctx;
}
