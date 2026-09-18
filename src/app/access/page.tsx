"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, OWNER_EMAIL } from "@/lib/firebase";
import { useDataCtx } from "@/lib/data-context";
import { Section, Badge } from "@/components/ui";
import { SECTIONS, ALL_KEYS, type SectionKey } from "@/lib/sections";

type Scopes = Record<string, SectionKey[]>;

/** 범위(섹션) 체크박스 그리드 */
function ScopePicker({ value, onChange }: { value: SectionKey[]; onChange: (v: SectionKey[]) => void }) {
  const all = value.length === ALL_KEYS.length;
  const toggle = (k: SectionKey) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
        <input type="checkbox" checked={all} onChange={(e) => onChange(e.target.checked ? [...ALL_KEYS] : [])} className="h-3.5 w-3.5" />
        전체 선택
      </label>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
        {SECTIONS.map((s) => (
          <label key={s.key} className="flex items-center gap-1.5 text-xs text-slate-600">
            <input type="checkbox" checked={value.includes(s.key)} onChange={() => toggle(s.key)} className="h-3.5 w-3.5" />
            {s.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function scopeLabel(keys: SectionKey[] | undefined): string {
  if (!keys || keys.length === 0 || keys.length === ALL_KEYS.length) return "전체";
  return SECTIONS.filter((s) => keys.includes(s.key)).map((s) => s.label).join(", ");
}
/** 전부 선택 시 "*"로 저장(향후 섹션 추가 시 자동 포함) */
function normalizeScope(keys: SectionKey[]): SectionKey[] | ["*"] {
  return keys.length === ALL_KEYS.length ? ["*"] : keys;
}

export default function AccessPage() {
  const { user, authReady } = useDataCtx();
  const isOwner = user?.email === OWNER_EMAIL;

  const [viewers, setViewers] = useState<string[]>([]);
  const [scopes, setScopes] = useState<Scopes>({});
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [newScope, setNewScope] = useState<SectionKey[]>([...ALL_KEYS]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editScope, setEditScope] = useState<SectionKey[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "config", "access"));
      const d = snap.exists() ? (snap.data() as { viewers?: string[]; scopes?: Scopes }) : {};
      setViewers(d.viewers ?? []);
      setScopes(d.scopes ?? {});
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isOwner) void load(); }, [isOwner, load]);

  /** 전체 문서를 다시 쓴다(뷰어 목록 + 범위) */
  const persist = useCallback(async (nextViewers: string[], nextScopes: Scopes) => {
    if (!db) return;
    await setDoc(doc(db, "config", "access"), { viewers: nextViewers, scopes: nextScopes });
    setViewers(nextViewers);
    setScopes(nextScopes);
  }, []);

  async function add() {
    const e = email.trim().toLowerCase();
    if (!db || !e) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setErr("올바른 이메일 형식이 아닙니다."); return; }
    if (e === OWNER_EMAIL) { setErr("소유자 계정은 이미 편집 권한이 있습니다."); return; }
    if (viewers.map((v) => v.toLowerCase()).includes(e)) { setErr("이미 등록된 이메일입니다."); return; }
    if (newScope.length === 0) { setErr("열람 범위를 하나 이상 선택하세요."); return; }
    setBusy(true); setErr(null);
    try {
      await persist([...viewers, e], { ...scopes, [e]: normalizeScope(newScope) as SectionKey[] });
      setEmail(""); setNewScope([...ALL_KEYS]);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally { setBusy(false); }
  }

  async function remove(e: string) {
    if (!db) return;
    setBusy(true); setErr(null);
    try {
      const { [e]: _drop, ...rest } = scopes; void _drop;
      await persist(viewers.filter((v) => v !== e), rest);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally { setBusy(false); }
  }

  function startEdit(v: string) {
    const cur = scopes[v];
    setEditing(v);
    setEditScope(!cur || cur.includes("*" as SectionKey) || cur.length === 0 ? [...ALL_KEYS] : cur.filter((k) => (ALL_KEYS as string[]).includes(k)));
  }
  async function saveEdit() {
    if (!editing) return;
    if (editScope.length === 0) { setErr("열람 범위를 하나 이상 선택하세요."); return; }
    setBusy(true); setErr(null);
    try {
      await persist(viewers, { ...scopes, [editing]: normalizeScope(editScope) as SectionKey[] });
      setEditing(null);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally { setBusy(false); }
  }

  if (!authReady) return <p className="p-6 text-sm text-slate-400">불러오는 중…</p>;
  if (!user) return <Section title="🔑 접근 관리"><p className="text-sm text-slate-500">로그인이 필요합니다.</p></Section>;
  if (!isOwner) return <Section title="🔒 접근 관리"><p className="text-sm text-slate-500">소유자 계정만 접근할 수 있습니다.</p></Section>;

  return (
    <div className="space-y-5">
      <Section title="🔑 접근 관리 — 보기 전용 계정" sub="등록한 Google 계정은 로그인하면 '보기 전용'으로 열람합니다. 계정별로 볼 수 있는 범위(메뉴)를 지정할 수 있습니다. 추가·수정·삭제는 소유자만 가능합니다.">
        {/* 추가 폼 */}
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
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
          <p className="mb-1.5 text-[11px] font-semibold text-slate-500">이 계정이 볼 수 있는 범위</p>
          <ScopePicker value={newScope} onChange={setNewScope} />
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
              <li key={v} className="py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="green">보기 전용</Badge>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{v}</span>
                  <span className="text-[11px] text-slate-400">범위: <b className="text-slate-600">{scopeLabel(scopes[v])}</b></span>
                  <button onClick={() => (editing === v ? setEditing(null) : startEdit(v))} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50">
                    {editing === v ? "닫기" : "범위 수정"}
                  </button>
                  <button onClick={() => void remove(v)} disabled={busy} className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">삭제</button>
                </div>
                {editing === v && (
                  <div className="mt-2 space-y-2">
                    <ScopePicker value={editScope} onChange={setEditScope} />
                    <div className="flex gap-2">
                      <button onClick={() => void saveEdit()} disabled={busy} className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">범위 저장</button>
                      <button onClick={() => setEditing(null)} className="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">취소</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
          ※ 추가된 계정은 해당 이메일로 <b>Google 로그인</b> 후 지정된 범위만 열람합니다(반영까지 1~2분). 편집·삭제·업로드는 불가합니다.
          범위에 포함된 메뉴만 보이며, 특허·과제·사업비·인증·자료실의 <b>원본 문서 파일</b>도 범위에 따라 열람이 제한됩니다.
        </p>
      </Section>
    </div>
  );
}
