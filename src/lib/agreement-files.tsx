"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getBlob, listAll, ref, uploadBytes } from "firebase/storage";
import { auth, storage, firebaseEnabled, AGREEMENTS_PREFIX, PATENTS_PREFIX } from "@/lib/firebase";

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

export type Category = "agreements" | "patents";

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
  openDoc: (d: DocRef) => Promise<void>;
  clear: () => void;
};

const DocCtx = createContext<Ctx | null>(null);
const norm = (name: string) => name.trim().toLowerCase();

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
      for (const prefix of [AGREEMENTS_PREFIX, PATENTS_PREFIX]) {
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
      const files = Array.from(fileList).filter((f) => /\.(pdf|hwp|hwpx|docx?|png|jpe?g)$/i.test(f.name));
      if (firebaseEnabled && storage) {
        // 관리자 업로드: 선택한 폴더의 문서를 Storage에 올린다
        setUploading(true);
        setError(null);
        try {
          const prefix = category === "patents" ? PATENTS_PREFIX : AGREEMENTS_PREFIX;
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

  // "보기" — 로컬이든 클라우드든 blob으로 받아 새 탭에서 연다(다운로드 버튼 없음)
  const openDoc = useCallback(async (d: DocRef) => {
    let blob: Blob;
    if (d.kind === "local") {
      blob = d.file;
    } else {
      if (!storage) return;
      blob = await getBlob(ref(storage, d.path));
    }
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    // 새 탭이 로드된 뒤 해제
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }, []);

  const clear = useCallback(() => setDocs(new Map()), []);

  return (
    <DocCtx.Provider
      value={{ count: docs.size, cloud: firebaseEnabled, loading, uploading, error, loadFolder, getByName, getByPattern, openDoc, clear }}
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
