"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db, OWNER_EMAIL } from "@/lib/firebase";
import { useDataCtx } from "@/lib/data-context";
import { Section, Badge } from "@/components/ui";

export default function AccessPage() {
  const { user, authReady } = useDataCtx();
  const isOwner = user?.email === OWNER_EMAIL;

  const [viewers, setViewers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "config", "access"));
      setViewers(snap.exists() ? ((snap.data().viewers as string[]) ?? []) : []);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isOwner) void load(); }, [isOwner, load]);

  async function add() {
    const e = email.trim().toLowerCase();
    if (!db || !e) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setErr("올바른 이메일 형식이 아닙니다."); return; }
    if (e === OWNER_EMAIL) { setErr("소유자 계정은 이미 편집 권한이 있습니다."); return; }
    if (viewers.includes(e)) { setErr("이미 등록된 이메일입니다."); return; }
    setBusy(true); setErr(null);
    try {
      const ref = doc(db, "config", "access");
      const snap = await getDoc(ref);
      if (snap.exists()) await updateDoc(ref, { viewers: arrayUnion(e) });
      else await setDoc(ref, { viewers: [e] });
      setEmail("");
      await load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  }

  async function remove(e: string) {
    if (!db) return;
    setBusy(true); setErr(null);
    try {
      await updateDoc(doc(db, "config", "access"), { viewers: arrayRemove(e) });
      await load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  }

  if (!authReady) return <p className="p-6 text-sm text-slate-400">불러오는 중…</p>;
  if (!user) return <Section title="🔑 접근 관리"><p className="text-sm text-slate-500">로그인이 필요합니다.</p></Section>;
  if (!isOwner) return <Section title="🔒 접근 관리"><p className="text-sm text-slate-500">소유자 계정만 접근할 수 있습니다.</p></Section>;

  return (
    <div className="space-y-5">
      <Section title="🔑 접근 관리 — 보기 전용 계정" sub="여기에 등록한 Google 계정은 로그인하면 '보기 전용'으로 열람할 수 있습니다. 추가·수정·삭제는 소유자만 가능합니다.">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void add(); }}
            placeholder="추가할 Google 이메일 (예: name@gmail.com)"
            className="w-72 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          />
          <button onClick={() => void add()} disabled={busy} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">추가</button>
          {err && <span className="text-xs font-medium text-red-600">⚠ {err}</span>}
        </div>

        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          👑 소유자(편집 가능): <b className="text-slate-800">{OWNER_EMAIL}</b>
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-slate-400">불러오는 중…</p>
        ) : viewers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 py-8 text-center text-sm text-slate-400">등록된 보기 전용 계정이 없습니다. 위에 이메일을 입력해 추가하세요.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {viewers.map((v) => (
              <li key={v} className="flex items-center gap-3 py-2">
                <Badge tone="green">보기 전용</Badge>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{v}</span>
                <button onClick={() => void remove(v)} disabled={busy} className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">삭제</button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
          ※ 추가된 계정은 해당 이메일로 <b>Google 로그인</b> 후 바로 열람할 수 있습니다(반영까지 1~2분). 편집·삭제·업로드는 불가합니다.
        </p>
      </Section>
    </div>
  );
}
