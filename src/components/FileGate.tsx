"use client";

import { useRef, useState } from "react";
import { useDataCtx } from "@/lib/data-context";

/** Firebase 로그인 화면 (Firebase 사용 시, 미로그인 상태) */
function LoginScreen() {
  const { signIn, error } = useDataCtx();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setLocalErr(null);
    try {
      await signIn(email, password);
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : "로그인에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm py-16">
      <div className="mb-6 text-center">
        <p className="text-3xl">🔐</p>
        <h2 className="mt-2 text-lg font-bold text-slate-900">로그인</h2>
        <p className="mt-1 text-sm text-slate-500">로그인하면 마스터 데이터가 자동으로 표시됩니다.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
        <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {(localErr || error) && <p className="text-sm text-red-600">⚠ {localErr || error}</p>}
        <button className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50" disabled={busy}>
          {busy ? "로그인 중…" : "로그인"}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-400">계정은 관리자(Firebase 콘솔)에서 발급합니다.</p>
    </div>
  );
}

/** 데이터 없을 때 화면 — Firebase면 로그인/업로드, 아니면 파일 선택 */
export function NeedFile() {
  const { loadFile, uploadMaster, error, ready, firebaseEnabled, user, authReady } = useDataCtx();
  const inputRef = useRef<HTMLInputElement>(null);
  const [remember, setRemember] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Firebase 사용 + 미로그인 → 로그인 화면
  if (firebaseEnabled) {
    if (!authReady) return <div className="py-24 text-center text-sm text-slate-400">확인 중…</div>;
    if (!user) return <LoginScreen />;
  }
  if (!ready) return <div className="py-24 text-center text-sm text-slate-400">데이터 확인 중…</div>;

  async function onFiles(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    if (firebaseEnabled) {
      // 로그인 상태인데 데이터가 없음 = 아직 엑셀 미업로드 → 관리자가 업로드
      setUploading(true);
      try { await uploadMaster(f); } catch { /* 에러는 error 상태로 표시됨 */ } finally { setUploading(false); }
    } else {
      await loadFile(f, remember);
    }
  }

  return (
    <div className="mx-auto max-w-xl py-10">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); onFiles(e.dataTransfer.files); }}
        className={`rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${dragOver ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-white"}`}
      >
        <p className="text-3xl">📂</p>
        <h2 className="mt-3 text-lg font-bold text-slate-900">
          {firebaseEnabled ? "마스터 데이터 엑셀을 업로드하세요" : "마스터 데이터 엑셀을 불러오세요"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          <code className="rounded bg-slate-100 px-1">신정개발_RLMS_마스터데이터.xlsx</code>{" "}
          {firebaseEnabled ? "를 올리면 Firebase에 저장되어 다음부터 자동으로 표시됩니다." : "파일을 드래그하거나 선택하세요."}
        </p>
        <button onClick={() => inputRef.current?.click()} disabled={uploading} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {uploading ? "업로드 중…" : firebaseEnabled ? "엑셀 업로드" : "파일 선택"}
        </button>
        <input ref={inputRef} type="file" accept=".xlsx,.xlsm" className="hidden" onChange={(e) => onFiles(e.target.files)} />
        {!firebaseEnabled && (
          <label className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-3.5 w-3.5" />
            이 브라우저에 기억 (이 기기의 저장공간에만 보관 — 공용 PC에서는 해제하세요)
          </label>
        )}
        {error && <p className="mt-3 text-sm font-medium text-red-600">⚠ {error}</p>}
      </div>
      <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-xs leading-relaxed text-emerald-800">
        🔒 <b>보안 안내</b> —{" "}
        {firebaseEnabled
          ? "마스터 엑셀만 Firebase에 저장되며, 로그인한 사용자만 접근할 수 있습니다. 협약서·특허증 원본은 Firebase에 올리지 않고 계속 브라우저 로컬에서만 엽니다."
          : "선택한 파일은 브라우저 안에서만 읽고 표시합니다. 서버·GitHub·외부로 전송되지 않습니다."}
      </div>
    </div>
  );
}

/** 데이터 상태 표시 + 교체/제거/로그아웃 (vertical: 사이드바용) */
export function DataStatus({ vertical = false }: { vertical?: boolean }) {
  const { data, fileName, remembered, clear, loadFile, uploadMaster, firebaseEnabled, user, signOutUser, source } = useDataCtx();
  const inputRef = useRef<HTMLInputElement>(null);
  if (!data && !user) return null;

  async function onReplace(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    if (firebaseEnabled) await uploadMaster(f);
    else await loadFile(f, remembered);
  }

  return (
    <div className={vertical ? "space-y-1.5 text-xs" : "flex items-center gap-2 text-xs"}>
      {fileName && (
        <p className="truncate text-slate-400" title={fileName}>
          {source === "firebase" ? "☁ " : "📄 "}{fileName}
        </p>
      )}
      {firebaseEnabled && user && <p className="truncate text-slate-400">👤 {user.email}</p>}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => inputRef.current?.click()} className="rounded-lg border border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-50">
          {firebaseEnabled ? "엑셀 갱신" : "파일 교체"}
        </button>
        {firebaseEnabled ? (
          <button onClick={signOutUser} className="rounded-lg border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50">로그아웃</button>
        ) : (
          <button onClick={clear} className="rounded-lg border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50">데이터 제거</button>
        )}
      </div>
      <input ref={inputRef} type="file" accept=".xlsx,.xlsm" className="hidden" onChange={(e) => onReplace(e.target.files)} />
    </div>
  );
}

export function WithData({ children }: { children: (data: NonNullable<ReturnType<typeof useDataCtx>["data"]>) => React.ReactNode }) {
  const { data } = useDataCtx();
  if (!data) return <NeedFile />;
  return <>{children(data)}</>;
}
