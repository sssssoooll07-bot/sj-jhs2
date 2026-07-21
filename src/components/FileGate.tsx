"use client";

import { useRef, useState } from "react";
import { useDataCtx } from "@/lib/data-context";

/** 데이터 없을 때 표시되는 파일 선택 화면 — 파일은 브라우저 안에서만 처리된다. */
export function NeedFile() {
  const { loadFile, error, ready } = useDataCtx();
  const inputRef = useRef<HTMLInputElement>(null);
  const [remember, setRemember] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  if (!ready) {
    return <div className="py-24 text-center text-sm text-slate-400">데이터 확인 중…</div>;
  }

  async function onFiles(files: FileList | null) {
    const f = files?.[0];
    if (f) await loadFile(f, remember);
  }

  return (
    <div className="mx-auto max-w-xl py-10">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); onFiles(e.dataTransfer.files); }}
        className={`rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-white"
        }`}
      >
        <p className="text-3xl">📂</p>
        <h2 className="mt-3 text-lg font-bold text-slate-900">마스터 데이터 엑셀을 불러오세요</h2>
        <p className="mt-1 text-sm text-slate-500">
          <code className="rounded bg-slate-100 px-1">신정개발_RLMS_마스터데이터.xlsx</code> 파일을
          여기로 드래그하거나 선택하세요.
        </p>
        <button onClick={() => inputRef.current?.click()} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          파일 선택
        </button>
        <input ref={inputRef} type="file" accept=".xlsx,.xlsm" className="hidden" onChange={(e) => onFiles(e.target.files)} />
        <label className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-3.5 w-3.5" />
          이 브라우저에 기억 (이 기기의 저장공간에만 보관 — 공용 PC에서는 해제하세요)
        </label>
        {error && <p className="mt-3 text-sm font-medium text-red-600">⚠ {error}</p>}
      </div>
      <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-xs leading-relaxed text-emerald-800">
        🔒 <b>보안 안내</b> — 선택한 파일은 <b>브라우저 안에서만</b> 읽고 표시합니다. 서버·GitHub·외부로 전송되지
        않으며, 저장소에는 어떤 엑셀 파일도 커밋되지 않도록 차단되어 있습니다(.gitignore). &quot;기억&quot;을 켜면
        이 기기의 브라우저 저장공간에만 사본이 보관되고, 상단의 &quot;데이터 제거&quot;로 언제든 지울 수 있습니다.
      </div>
    </div>
  );
}

/** 데이터 상태 표시 + 교체/제거 (vertical: 사이드바용 세로 배치) */
export function DataStatus({ vertical = false }: { vertical?: boolean }) {
  const { data, fileName, remembered, clear, loadFile } = useDataCtx();
  const inputRef = useRef<HTMLInputElement>(null);
  if (!data) return null;
  return (
    <div className={vertical ? "space-y-1.5 text-xs" : "flex items-center gap-2 text-xs"}>
      <p className="truncate text-slate-400" title={`${fileName}${remembered ? " · 이 브라우저에 기억됨" : ""}`}>
        📄 {fileName} {remembered ? "· 기억됨" : ""}
      </p>
      <div className="flex gap-1.5">
        <button onClick={() => inputRef.current?.click()} className="rounded-lg border border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-50">
          파일 교체
        </button>
        <button onClick={clear} className="rounded-lg border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50">
          데이터 제거
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xlsm"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0], remembered)}
      />
    </div>
  );
}

/** 페이지 공통 게이트 — 데이터가 있으면 children(data), 없으면 파일 선택 화면 */
export function WithData({ children }: { children: (data: NonNullable<ReturnType<typeof useDataCtx>["data"]>) => React.ReactNode }) {
  const { data } = useDataCtx();
  if (!data) return <NeedFile />;
  return <>{children(data)}</>;
}
