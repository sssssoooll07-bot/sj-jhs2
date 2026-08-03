"use client";

import { useEffect, useState } from "react";
import { useAgreementFiles, type DocRef } from "@/lib/agreement-files";

/**
 * 문서를 앱 안의 미리보기 창(모달)에서 먼저 보여준다.
 * 바로 다운로드되지 않고, 사용자가 원하면 "다운로드" 버튼으로 저장한다.
 * PDF/이미지는 인라인 표시되며, 로컬/클라우드(Firebase) 모두 blob으로 연다.
 */
export default function DocViewButton({ doc }: { doc: DocRef | null }) {
  const { getViewUrl } = useAgreementFiles();
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // 미리보기 창이 열려 있는 동안 body 스크롤 잠금 + ESC로 닫기
  useEffect(() => {
    if (!url) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  if (!doc) return <span className="text-xs text-slate-400">미로드</span>;

  const viewable = /\.(pdf|png|jpe?g)$/i.test(doc.name);
  if (!viewable) {
    return (
      <span className="text-xs text-slate-400" title="브라우저에서 직접 열 수 없는 형식(HWP 등)">
        파일 있음(뷰어 미지원)
      </span>
    );
  }
  const isImage = /\.(png|jpe?g)$/i.test(doc.name);

  async function open() {
    setBusy(true);
    setErr(null);
    try {
      setUrl(await getViewUrl(doc!));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "열지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }
  function close() {
    setUrl((u) => {
      if (u) URL.revokeObjectURL(u);
      return null;
    });
  }

  return (
    <>
      <div className="inline-flex items-center gap-1">
        <button
          onClick={open}
          disabled={busy}
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 disabled:opacity-50"
        >
          {busy ? "여는 중…" : "보기 ↗"}
        </button>
        {err && <span className="text-xs text-red-600" title={err}>실패</span>}
      </div>

      {url && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/70 p-3 sm:p-6"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
              <p className="truncate text-sm font-medium text-slate-800" title={doc.name}>
                📄 {doc.name}
              </p>
              <a
                href={url}
                download={doc.name}
                className="ml-auto rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                ⬇ 다운로드
              </a>
              <button
                onClick={close}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              >
                닫기 ✕
              </button>
            </div>
            {isImage ? (
              <div className="flex-1 overflow-auto bg-slate-100 p-4 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={doc.name} className="mx-auto max-h-full max-w-full" />
              </div>
            ) : (
              <iframe src={url} title={doc.name} className="w-full flex-1 bg-slate-100" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
