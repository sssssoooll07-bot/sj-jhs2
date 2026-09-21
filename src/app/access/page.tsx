"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, OWNER_EMAIL } from "@/lib/firebase";
import { useDataCtx } from "@/lib/data-context";
import { Section, Badge } from "@/components/ui";
import { SECTIONS, ALL_KEYS, type SectionKey } from "@/lib/sections";

type Scopes = Record<string, SectionKey[]>;

/** 보기/수정 범위 선택 그리드 (수정은 보기를 포함) */
function ScopePicker({
  view, edit, onView, onEdit,
}: { view: SectionKey[]; edit: SectionKey[]; onView: (v: SectionKey[]) => void; onEdit: (v: SectionKey[]) => void }) {
  const allView = view.length === ALL_KEYS.length;
  const allEdit = edit.length === ALL_KEYS.length;
  const toggleView = (k: SectionKey) => {
    const next = view.includes(k) ? view.filter((x) => x !== k) : [...view, k];
    onView(next);
    if (!next.includes(k)) onEdit(edit.filter((x) => x !== k)); // 보기 해제 시 수정도 해제
  };
  const toggleEdit = (k: SectionKey) => {
    if (edit.includes(k)) { onEdit(edit.filter((x) => x !== k)); return; }
    onEdit([...edit, k]);
    if (!view.includes(k)) onView([...view, k]); // 수정 켜면 보기도 자동 포함
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="mb-1.5 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={allView} onChange={(e) => { onView(e.target.checked ? [...ALL_KEYS] : []); if (!e.target.checked) onEdit([]); }} className="h-3.5 w-3.5" /> 전체 보기
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={allEdit} onChange={(e) => { if (e.target.checked) { onView([...ALL_KEYS]); onEdit([...ALL_KEYS]); } else onEdit([]); }} className="h-3.5 w-3.5" /> 전체 수정
        </label>
        <span className="text-[11px] font-normal text-slate-400">※ 수정을 켜면 보기도 자동 포함</span>
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <div key={s.key} className="flex items-center justify-between rounded px-1.5 py-0.5 hover:bg-slate-50">
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <input type="checkbox" checked={view.includes(s.key)} onChange={() => toggleView(s.key)} className="h-3.5 w-3.5" /> {s.label}
            </label>
            <label className="flex items-center gap-1 text-[11px] text-slate-500">
              <input type="checkbox" checked={edit.includes(s.key)} onChange={() => toggleEdit(s.key)} className="h-3.5 w-3.5" /> 수정
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function scopeLabel(keys: SectionKey[] | undefined): string {
  if (!keys || keys.length === 0 || keys.length === ALL_KEYS.length) return "전체";
  return SECTIONS.filter((s) => keys.includes(s.key)).map((s) => s.label).join(", ");
}
function editLabel(keys: SectionKey[] | undefined): string {
  if (!keys || keys.length === 0) return "없음";
  if (keys.length === ALL_KEYS.length) return "전체";
  return SECTIONS.filter((s) => keys.includes(s.key)).map((s) => s.label).join(", ");
}
/** 전부 선택 시 "*"로 저장(향후 섹션 추가 시 자동 포함) */
function normScope(keys: SectionKey[]): SectionKey[] {
  return (keys.length === ALL_KEYS.length ? ["*"] : keys) as SectionKey[];
}

export default function AccessPage() {
  const { user, authReady } = useDataCtx();
  const isOwner = user?.email === OWNER_EMAIL;

  const [viewers, setViewers] = useState<string[]>([]);
  const [scopes, setScopes] = useState<Scopes>({});
  const [editScopes, setEditScopes] = useState<Scopes>({});
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [newView, setNewView] = useState<SectionKey[]>([...ALL_KEYS]);
  const [newEdit, setNewEdit] = useState<SectionKey[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [eView, setEView] = useState<SectionKey[]>([]);
  const [eEdit, setEEdit] = useState<SectionKey[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "config", "access"));
      const d = snap.exists() ? (snap.data() as { viewers?: string[]; scopes?: Scopes; editScopes?: Scopes }) : {};
      setViewers(d.viewers ?? []);
      setScopes(d.scopes ?? {});
      setEditScopes(d.editScopes ?? {});
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isOwner) void load(); }, [isOwner, load]);

  const persist = useCallback(async (v: string[], sc: Scopes, ec: Scopes) => {
    if (!db) return;
    await setDoc(doc(db, "config", "access"), { viewers: v, scopes: sc, editScopes: ec });
    setViewers(v); setScopes(sc); setEditScopes(ec);
  }, []);

  const expand = (keys: SectionKey[] | undefined): SectionKey[] =>
    !keys ? [] : keys.includes("*" as SectionKey) ? [...ALL_KEYS] : keys.filter((k) => (ALL_KEYS as string[]).includes(k));

  async function add() {
    const e = email.trim().toLowerCase();
    if (!db || !e) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setErr("올바른 이메일 형식이 아닙니다."); return; }
    if (e === OWNER_EMAIL) { setErr("소유자 계정은 이미 편집 권한이 있습니다."); return; }
    if (viewers.map((v) => v.toLowerCase()).includes(e)) { setErr("이미 등록된 이메일입니다."); return; }
    if (newView.length === 0) { setErr("열람 범위를 하나 이상 선택하세요."); return; }
    setBusy(true); setErr(null);
    try {
      await persist([...viewers, e], { ...scopes, [e]: normScope(newView) }, { ...editScopes, [e]: normScope(newEdit) });
      setEmail(""); setNewView([...ALL_KEYS]); setNewEdit([]);
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : String(e2)); } finally { setBusy(false); }
  }

  async function remove(e: string) {
    if (!db) return;
    setBusy(true); setErr(null);
    try {
      const { [e]: _s, ...sc } = scopes; void _s;
      const { [e]: _e, ...ec } = editScopes; void _e;
      await persist(viewers.filter((v) => v !== e), sc, ec);
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : String(e2)); } finally { setBusy(false); }
  }

  function startEdit(v: string) {
    setEditing(v);
    setEView(scopes[v] && !scopes[v].includes("*" as SectionKey) && scopes[v].length ? expand(scopes[v]) : [...ALL_KEYS]);
    setEEdit(expand(editScopes[v]));
  }
  async function saveEdit() {
    if (!editing) return;
    if (eView.length === 0) { setErr("열람 범위를 하나 이상 선택하세요."); return; }
    setBusy(true); setErr(null);
    try {
      await persist(viewers, { ...scopes, [editing]: normScope(eView) }, { ...editScopes, [editing]: normScope(eEdit) });
      setEditing(null);
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : String(e2)); } finally { setBusy(false); }
  }

  if (!authReady) return <p className="p-6 text-sm text-slate-400">불러오는 중…</p>;
  if (!user) return <Section title="🔑 접근 관리"><p className="text-sm text-slate-500">로그인이 필요합니다.</p></Section>;
  if (!isOwner) return <Section title="🔒 접근 관리"><p className="text-sm text-slate-500">소유자 계정만 접근할 수 있습니다.</p></Section>;

  return (
    <div className="space-y-5">
      <Section title="🔑 접근 관리 — 보기 전용 계정" sub="등록한 Google 계정은 로그인하면 지정한 범위만 열람합니다. '수정'을 켠 섹션은 그 계정이 편집도 할 수 있습니다. 추가·삭제·권한변경은 소유자만 가능합니다.">
        {/* 추가 폼 */}
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void add(); }}
              placeholder="추가할 Google 이메일 (예: name@gmail.com)"
              className="w-72 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
            <button onClick={() => void add()} disabled={busy} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">추가</button>
            {err && <span className="text-xs font-medium text-red-600">⚠ {err}</span>}
          </div>
          <p className="mb-1.5 text-[11px] font-semibold text-slate-500">이 계정의 보기·수정 범위</p>
          <ScopePicker view={newView} edit={newEdit} onView={setNewView} onEdit={setNewEdit} />
        </div>

        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          👑 소유자(전체 편집): <b className="text-slate-800">{OWNER_EMAIL}</b>
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-slate-400">불러오는 중…</p>
        ) : viewers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 py-8 text-center text-sm text-slate-400">등록된 계정이 없습니다. 위에 이메일을 입력해 추가하세요.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {viewers.map((v) => {
              const hasEdit = (editScopes[v]?.length ?? 0) > 0;
              return (
                <li key={v} className="py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={hasEdit ? "blue" : "green"}>{hasEdit ? "보기+수정" : "보기 전용"}</Badge>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{v}</span>
                    <span className="text-[11px] text-slate-400">보기: <b className="text-slate-600">{scopeLabel(scopes[v])}</b> · 수정: <b className={hasEdit ? "text-blue-600" : "text-slate-500"}>{editLabel(editScopes[v])}</b></span>
                    <button onClick={() => (editing === v ? setEditing(null) : startEdit(v))} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50">{editing === v ? "닫기" : "권한 수정"}</button>
                    <button onClick={() => void remove(v)} disabled={busy} className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">삭제</button>
                  </div>
                  {editing === v && (
                    <div className="mt-2 space-y-2">
                      <ScopePicker view={eView} edit={eEdit} onView={setEView} onEdit={setEEdit} />
                      <div className="flex gap-2">
                        <button onClick={() => void saveEdit()} disabled={busy} className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">권한 저장</button>
                        <button onClick={() => setEditing(null)} className="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">취소</button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-3 space-y-1 text-[11px] leading-relaxed text-slate-400">
          <p>※ 추가·권한변경 후 <b>파일/수정 권한 반영</b>: GitHub → Actions → <b>“접근권한 클레임 동기화”</b>를 Run workflow로 실행(자동 6시간마다). 실행 뒤 해당 계정이 새로고침하면 반영됩니다.</p>
          <p>※ 수정 권한은 데이터가 하나의 마스터 파일에 모여 있어, <b>어느 한 섹션이라도 수정 권한을 주면 데이터 저장 권한이 열립니다</b>(화면에는 지정한 섹션의 편집만 노출). 원본 문서 파일 업로드는 섹션별로 제한됩니다.</p>
        </div>
      </Section>
    </div>
  );
}
