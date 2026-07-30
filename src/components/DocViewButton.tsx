"use client";

import { useState } from "react";
import { useAgreementFiles, type DocRef } from "@/lib/agreement-files";

/** 문서를 새 탭에서 미리보기(다운로드 버튼 없음). 로컬/클라우드(Firebase) 모두 blob으로 연다. */
export default function DocViewButton({ doc }: { doc: DocRef | null }) {
  const { openDoc } = useAgreementFiles();
  const [busy, setBusy] = useState(false);

  if (!doc) return <span className="text-xs text-slate-400">미로드</span>;

  const viewable = /\.(pdf|png|jpe?g)$/i.test(doc.name);
  if (!viewable) {
    return (
      <span className="text-xs text-slate-400" title="브라우저에서 직접 열 수 없는 형식(HWP 등)">
        파일 있음(뷰어 미지원)
      </span>
    );
  }
  async function open() {
    setBusy(true);
    try {
      await openDoc(doc!);
    } finally {
      setBusy(false);
    }
  }
  return (
    <button onClick={open} disabled={busy} className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 disabled:opacity-50">
      {busy ? "여는 중…" : "보기 ↗"}
    </button>
  );
}
