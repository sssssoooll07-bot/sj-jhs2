"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { useAgreementFiles, type DocRef } from "@/lib/agreement-files";

/**
 * 문서를 앱 안의 미리보기 창(모달)에서 먼저 보여준다.
 * - PDF/이미지: 인라인 미리보기
 * - 엑셀(xlsx): 브라우저에서 파싱해 표(HTML)로 미리보기 — 통장거래내역 등
 * 바로 다운로드되지 않고, 원하면 "다운로드" 버튼으로 저장한다. 로컬/클라우드 모두 지원.
 */
export default function DocViewButton({ doc, label }: { doc: DocRef | null; label?: React.ReactNode }) {
  const { getViewUrl } = useAgreementFiles();
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const isOpen = Boolean(url || html);
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!doc) return <>{label ?? <span className="text-xs text-slate-400">미로드</span>}</>;

  const isImage = /\.(png|jpe?g)$/i.test(doc.name);
  const isExcel = /\.xlsx?$/i.test(doc.name);
  const isPdf = /\.pdf$/i.test(doc.name);
  if (!(isImage || isExcel || isPdf)) {
    return <>{label ?? <span className="text-xs text-slate-400" title="브라우저에서 직접 열 수 없는 형식(HWP 등)">파일 있음(뷰어 미지원)</span>}</>;
  }

  async function open() {
    setBusy(true);
    setErr(null);
    try {
      const u = await getViewUrl(doc!);
      if (isExcel) {
        const buf = await (await fetch(u)).arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const parts = wb.SheetNames.map(
          (n) => `<h4 class="xl-sheet">${n}</h4>` + XLSX.utils.sheet_to_html(wb.Sheets[n]),
        );
        setHtml(parts.join(""));
        setUrl(u); // 다운로드 버튼용으로 유지
      } else {
        setUrl(u);
      }
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
    setHtml(null);
  }

  return (
    <>
      {label ? (
        <button onClick={open} disabled={busy} className="text-left font-medium text-blue-700 hover:underline disabled:opacity-50" title="클릭하면 특허증 미리보기">
          {label}{busy ? " …" : ""}
        </button>
      ) : (
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
      )}

      {isOpen && (
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
              {url && (
                <a
                  href={url}
                  download={doc.name}
                  className="ml-auto rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                >
                  ⬇ 다운로드
                </a>
              )}
              <button
                onClick={close}
                className={`rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 ${url ? "" : "ml-auto"}`}
              >
                닫기 ✕
              </button>
            </div>
            {html ? (
              <div
                className="flex-1 overflow-auto bg-white p-4 text-xs [&_h4.xl-sheet]:mb-1 [&_h4.xl-sheet]:mt-3 [&_h4.xl-sheet]:font-semibold [&_h4.xl-sheet]:text-slate-500 [&_table]:border-collapse [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1 [&_td]:whitespace-nowrap"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : isImage ? (
              <div className="flex-1 overflow-auto bg-slate-100 p-4 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url!} alt={doc.name} className="mx-auto max-h-full max-w-full" />
              </div>
            ) : (
              <iframe src={url!} title={doc.name} className="w-full flex-1 bg-slate-100" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
