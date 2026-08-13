"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getBlob, listAll, ref, uploadBytes } from "firebase/storage";
import { auth, storage, firebaseEnabled, AGREEMENTS_PREFIX, PATENTS_PREFIX, BANKBOOK_PREFIX, BUSINESSPLAN_PREFIX } from "@/lib/firebase";

/**
 * 문서 파일 컨텍스트 — 협약서·특허증·통장거래내역·사업계획서 원본을 연다(카테고리별로 구분 저장).
 * Firebase 사용 시: 로그인하면 각 폴더의 파일 목록을 불러오고, "보기"를 누를 때 지연 로드해 미리보기한다.
 * 어느 경우든 "보기"만 제공한다(다운로드 버튼 없음, 엑셀은 표로 미리보기).
 */

export type Category = "agreements" | "patents" | "bankbook" | "businessplan";

export type DocRef =
  | { name: string; kind: "local"; file: File; category: Category }
  | { name: string; kind: "firebase"; path: string; category: Category };

const PREFIX: Record<Category, string> = {
  agreements: AGREEMENTS_PREFIX,
  patents: PATENTS_PREFIX,
  bankbook: BANKBOOK_PREFIX,
  businessplan: BUSINESSPLAN_PREFIX,
};
const PREFIX_CAT: [string, Category][] = [
  [AGREEMENTS_PREFIX, "agreements"],
  [PATENTS_PREFIX, "patents"],
  [BANKBOOK_PREFIX, "bankbook"],
  [BUSINESSPLAN_PREFIX, "businessplan"],
];

type Ctx = {
  count: number;
  cloud: boolean;
  loading: boolean;
  uploading: boolean;
  error: string | null;
  loadFolder: (fileList: FileList, category: Category) => Promise<void>;
  getByName: (name: string | null, category?: Category) => DocRef | null;
  getByPattern: (pattern: string | null, category?: Category) => DocRef | null;
  getViewUrl: (d: DocRef) => Promise<string>;
  clear: () => void;
};

const DocCtx = createContext<Ctx | null>(null);
const norm = (name: string) => name.trim().toLowerCase();

/** 확장자로 MIME 추론 — Storage에 contentType이 없으면 브라우저가 바로 다운로드하므로 감싼다. */
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

  const refresh = useCallback(async () => {
    if (!storage) return;
    setLoading(true);
    try {
      const map = new Map<string, DocRef>();
      for (const [prefix, cat] of PREFIX_CAT) {
        try {
          const res = await listAll(ref(storage, prefix));
          for (const item of res.items) {
            map.set(norm(item.name), { name: item.name, kind: "firebase", path: item.fullPath, category: cat });
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
        setUploading(true);
        setError(null);
        try {
          const prefix = PREFIX[category];
          for (const f of files) {
            const bytes = new Uint8Array(await f.arrayBuffer());
            await uploadBytes(ref(storage, `${prefix}/${f.name}`), bytes);
          }
          await refresh();
        } catch (e) {
          const code = (e as { code?: string })?.code ?? "";
          if (code === "storage/unauthorized") setError("업로드가 거부됐습니다 — Firebase Storage 규칙에 해당 경로를 추가하고 게시했는지 확인하세요.");
          else if (code === "storage/unauthenticated") setError("로그인이 필요합니다.");
          else setError(e instanceof Error ? e.message : "업로드에 실패했습니다.");
        } finally {
          setUploading(false);
        }
      } else {
        setDocs((prev) => {
          const map = new Map(prev);
          for (const f of files) map.set(norm(f.name), { name: f.name, kind: "local", file: f, category });
          return map;
        });
      }
    },
    [refresh]
  );

  const getByName = useCallback(
    (name: string | null, category?: Category) => {
      if (!name) return null;
      const d = docs.get(norm(name));
      return d && (!category || d.category === category) ? d : null;
    },
    [docs]
  );

  const getByPattern = useCallback(
    (pattern: string | null, category?: Category) => {
      if (!pattern) return null;
      const p = pattern.trim().toLowerCase();
      if (!p) return null;
      for (const [name, d] of docs) if (name.includes(p) && (!category || d.category === category)) return d;
      return null;
    },
    [docs]
  );

  // "보기" — 미리보기용 blob URL. Storage 파일은 contentType이 없어 확장자 MIME으로 감싼다.
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
