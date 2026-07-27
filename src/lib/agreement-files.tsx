"use client";

import { createContext, useCallback, useContext, useState } from "react";

/**
 * 협약서 파일 컨텍스트 — 보안 원칙:
 * 협약서 원본(계약금액·직인·서명 포함)은 서버·GitHub로 전송하지 않는다.
 * 사용자가 이 브라우저에서 협약서 폴더를 선택하면, 그 순간의 File 객체만 메모리에 보관하고
 * 파일명으로 과제와 매칭한다. 새로고침하면 사라지므로 저장소·localStorage에도 남지 않는다.
 * 파일은 blob URL로 "보기"만 제공하며(다운로드 버튼 없음), 폴더를 선택한 본인에게만 보인다.
 */

type Ctx = {
  files: Map<string, File>; // 파일명(소문자) → File
  count: number;
  loadFolder: (fileList: FileList) => void;
  getFile: (fileName: string | null) => File | null;
  clear: () => void;
};

const AgreementCtx = createContext<Ctx | null>(null);

const norm = (name: string) => name.trim().toLowerCase();

export function AgreementFilesProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<Map<string, File>>(new Map());

  const loadFolder = useCallback((fileList: FileList) => {
    const map = new Map<string, File>();
    for (const f of Array.from(fileList)) {
      if (/\.(pdf|hwp|hwpx|docx?|png|jpe?g)$/i.test(f.name)) {
        // 폴더 선택 시 경로가 붙을 수 있어 파일명만 키로 사용
        map.set(norm(f.name), f);
      }
    }
    setFiles(map);
  }, []);

  const getFile = useCallback(
    (fileName: string | null) => (fileName ? files.get(norm(fileName)) ?? null : null),
    [files]
  );

  const clear = useCallback(() => setFiles(new Map()), []);

  return (
    <AgreementCtx.Provider value={{ files, count: files.size, loadFolder, getFile, clear }}>
      {children}
    </AgreementCtx.Provider>
  );
}

export function useAgreementFiles(): Ctx {
  const ctx = useContext(AgreementCtx);
  if (!ctx) throw new Error("AgreementFilesProvider가 필요합니다.");
  return ctx;
}
