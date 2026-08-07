"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getBlob, listAll, ref, uploadBytes } from "firebase/storage";
import { auth, storage, firebaseEnabled, AGREEMENTS_PREFIX, PATENTS_PREFIX, BANKBOOK_PREFIX } from "@/lib/firebase";

/**
 * 문서 파일 컨텍스트 — 협약서·특허증 원본을 연다.
 *
 * Firebase 사용 시(cloud): 로그인하면 Storage(agreements/, patents/)의 파일 목록을 자동으로 불러오고,
 *   "보기"를 누를 때만 그 파일을 내려받아 새 탭에서 연다(폴더 선택 불필요, 로그인한 본인만 접근).
 *   관리자는 폴더를 한 번 업로드하면 이후 모든 로그인 사용자가 본다.
 * Firebase 미사용: 기존처럼 브라우저에서 폴더를 선택해 로컬 파일로만 연다(서버 전송 없음).
 *
 * 어느 경우든 "보기"만 제공한다(다운로드 버튼 없음).
 */

export type Category = "agreements" | "patents" | "bankbook";

export type DocRef =
  | { name: string; kind: "local"; file: File }
  | { name: string; kind: "firebase"; path: string };

type Ctx = {
  count: number;
  cloud: boolean; // Firebase Storage 모드 여부
  loading: boolean;
  uploading: boolean;
  error: string | null;
  loadFolder: (fileList: FileList, category: Category) => Promise<void>;
  getByName: (name: string | null) => DocRef | null;
  getByPattern: (pattern: string | null) => DocRef | null;
  /** 미리보기용 blob URL을 만든다(다운로드 아님). 호출측이 표시 후 revokeObjectURL 해야 한다. */
  getViewUrl: (d: DocRef) => Promise<string>;
  clear: () => void;
};

const DocCtx = createContext<Ctx | null>(null);
const norm = (name: string) => name.trim().toLowerCase();

/** 확장자로 MIME 추론 — Storage에 contentType이 없으면 브라우저가 바로 다운로드하므로,
 *  미리보기(인라인)를 위해 blob을 이 MIME로 감싼다. */
function mimeFor(name: string): string | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return null;
}

export function AgreementFilesProvider({ children }: { children: React.ReactNode }) {
  const [docs, setDocs] = useState<Map<string, DocRef>>(new Map());
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Firebase 모드: 로그인 상태에서 Storage의 파일 목록을 불러온다(내용은 열 때 지연 로드)
  const refresh = useCallback(async () => {
    if (!storage) return;
    setLoading(true);
    try {
      const map = new Map<string, DocRef>();
      for (const prefix of [AGREEMENTS_PREFIX, PATENTS_PREFIX, BANKBOOK_PREFIX]) {
        try {
          const res = await listAll(ref(storage, prefix));
          for (const item of res.items) {
            map.set(norm(item.name), { name: item.name, kind: "firebase", path: item.fullPath });
          }
        } catch {
          /* 폴더가 아직 비어있음 */
        }
      }
      setDocs(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!firebaseEnabled || !auth) return;
    return onAuthStateChanged(auth, (u) => {
      if (u) refresh();
      else setDocs(new Map());
    });
  }, [refresh]);

  const loadFolder = useCallback(
    async (fileList: FileList, category: Category) => {
      // 통장거래내역(bankbook)은 엑셀(xlsx)도 허용 — 화면에서 표로 미리보기한다.
      const allow = category === "bankbook" ? /\.(pdf|png|jpe?g|xlsx?)$/i : /\.(pdf|hwp|hwpx|docx?|png|jpe?g)$/i;
      const files = Array.from(fileList).filter((f) => allow.test(f.name));
      if (firebaseEnabled && storage) {
        // 관리자 업로드: 선택한 폴더의 문서를 Storage에 올린다
        setUploading(true);
        setError(null);
        try {
          const prefix = category === "bankbook" ? BANKBOOK_PREFIX : category === "patents" ? PATENTS_PREFIX : AGREEMENTS_PREFIX;
          for (const f of files) {
            const bytes = new Uint8Array(await f.arrayBuffer());
            await uploadBytes(ref(storage, `${prefix}/${f.name}`), bytes);
          }
          await refresh();
        } catch (e) {
          const code = (e as { code?: string })?.code ?? "";
          if (code === "storage/unauthorized") setError("업로드가 거부됐습니다 — Firebase Storage 규칙에 협약서·특허증 경로를 추가하고 게시했는지 확인하세요.");
          else if (code === "storage/unauthenticated") setError("로그인이 필요합니다.");
          else setError(e instanceof Error ? e.message : "업로드에 실패했습니다.");
        } finally {
          setUploading(false);
        }
      } else {
        // 로컬 모드: 메모리에 누적
        setDocs((prev) => {
          const map = new Map(prev);
          for (const f of files) map.set(norm(f.name), { name: f.name, kind: "local", file: f });
          return map;
        });
      }
    },
    [refresh]
  );

  const getByName = useCallback(
    (name: string | null) => (name ? docs.get(norm(name)) ?? null : null),
    [docs]
  );

  const getByPattern = useCallback(
    (pattern: string | null) => {
      if (!pattern) return null;
      const p = pattern.trim().toLowerCase();
      if (!p) return null;
      for (const [name, d] of docs) if (name.includes(p)) return d;
      return null;
    },
    [docs]
  );

  // "보기" — 로컬이든 클라우드든 blob으로 받아 미리보기용 URL을 만든다.
  // Storage 파일은 contentType이 없어(octet-stream) 그대로 열면 다운로드되므로 확장자 MIME로 감싼다.
  const getViewUrl = useCallback(async (d: DocRef): Promise<string> => {
    let blob: Blob;
    if (d.kind === "local") {
      blob = d.file;
    } else {
      if (!storage) throw new Error("스토리지를 사용할 수 없습니다. 다시 로그인해 주세요.");
      blob = await getBlob(ref(storage, d.path));
    }
    const mime = mimeFor(d.name);
    if (mime && blob.type !== mime) blob = new Blob([blob], { type: mime });
    return URL.createObjectURL(blob);
  }, []);

  const clear = useCallback(() => setDocs(new Map()), []);

  return (
    <DocCtx.Provider
      value={{ count: docs.size, cloud: firebaseEnabled, loading, uploading, error, loadFolder, getByName, getByPattern, getViewUrl, clear }}
    >
      {children}
    </DocCtx.Provider>
  );
}

export function useAgreementFiles(): Ctx {
  const ctx = useContext(DocCtx);
  if (!ctx) throw new Error("AgreementFilesProvider가 필요합니다.");
  return ctx;
}
