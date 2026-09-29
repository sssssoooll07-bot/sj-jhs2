"use client";

import { useRef } from "react";
import { useAgreementFiles, type Category } from "@/lib/agreement-files";

const extOf = (name: string) => { const i = name.lastIndexOf("."); return i >= 0 ? name.slice(i) : ".pdf"; };
const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();

/** 📎 파일 첨부 — 파일 1개를 선택하면 saveName(+원본 확장자)으로 저장해 항목에 자동 연결한다. */
export default function AttachButton({
  category, saveName, accept = ".pdf,.png,.jpg,.jpeg", title = "파일 첨부",
}: { category: Category; saveName: string; accept?: string; title?: string }) {
  const { uploadNamed, uploading } = useAgreementFiles();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" title={title} disabled={uploading || !safe(saveName)}
        onClick={(e) => { e.stopPropagation(); ref.current?.click(); }}
        className="shrink-0 rounded p-0.5 text-slate-300 transition-colors hover:text-emerald-600 disabled:opacity-50">📎</button>
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadNamed(f, category, `${safe(saveName)}${extOf(f.name)}`); e.target.value = ""; }} />
    </>
  );
}
