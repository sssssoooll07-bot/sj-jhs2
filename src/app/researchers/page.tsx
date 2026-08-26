"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Badge, Empty, Section } from "@/components/ui";
import { WithData } from "@/components/FileGate";
import { useDataCtx } from "@/lib/data-context";
import { EditableTable, dateStr, type Col } from "@/components/EditableTable";
import type { Researcher, Employee } from "@/lib/excel";

/** 국가연구자번호는 보기 화면에서 마스킹 (개인정보 최소수집) */
function mask(no: string | null): string {
  if (!no) return "—";
  if (no.length <= 4) return "****";
  return no.slice(0, 2) + "*".repeat(no.length - 4) + no.slice(-2);
}

const EMPTY: Researcher = {
  name: "", position: null, degree: null, major: null, university: null,
  gradYear: null, researcherNo: null, company: "신정개발", note: null, active: true,
};

/** Researcher[] → [연구원] 시트 행(엑셀 헤더 기준) */
function toRows(list: Researcher[]) {
  return list.map((r) => ({
    성명: r.name, 직위: r.position, 최종학위: r.degree, 전공: r.major,
    출신대학: r.university, 졸업연도: r.gradYear, 국가연구자번호: r.researcherNo,
    소속: r.company, 비고: r.note, 재직여부: r.active ? "Y" : "N",
  }));
}

/* 전체 직원 (4대보험 명부) */
const EMP_COLS: Col<Employee>[] = [
  { key: "name", label: "성명" },
  { key: "joinedAt", label: "입사일", type: "date", nowrap: true },
  { key: "rndLab", label: "기업부설연구소 연구원", type: "toggle", th: "기업부설연구소", view: (e) => (e.rndLab ? <Badge tone="green">연구원</Badge> : "—") },
  { key: "note", label: "비고", span: true },
];
const empRow = (e: Employee) => ({ 성명: e.name, 입사일: dateStr(e.joinedAt), 기업부설연구소: e.rndLab ? "Y" : "", 비고: e.note });

function Field({ label, span, children }: { label: string; span?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${span ? "col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function EditModal({
  initial, isNew, saving, onSave, onDelete, onClose,
}: {
  initial: Researcher; isNew: boolean; saving: boolean;
  onSave: (r: Researcher) => void; onDelete: () => void; onClose: () => void;
}) {
  const [r, setR] = useState<Researcher>(initial);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "Enter" && !saving && r.name.trim()) { e.preventDefault(); onSave(r); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, onSave, r, saving]);
  const set = (patch: Partial<Researcher>) => setR((p) => ({ ...p, ...patch }));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-bold tracking-tight text-slate-800">연구원 {isNew ? "추가" : "수정"}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 px-5 py-4">
          <Field label="성명"><input className="field" value={r.name} onChange={(e) => set({ name: e.target.value })} autoFocus /></Field>
          <Field label="직위"><input className="field" value={r.position ?? ""} onChange={(e) => set({ position: e.target.value || null })} /></Field>
          <Field label="최종학위"><input className="field" value={r.degree ?? ""} onChange={(e) => set({ degree: e.target.value || null })} /></Field>
          <Field label="전공"><input className="field" value={r.major ?? ""} onChange={(e) => set({ major: e.target.value || null })} /></Field>
          <Field label="출신대학"><input className="field" value={r.university ?? ""} onChange={(e) => set({ university: e.target.value || null })} /></Field>
          <Field label="졸업연도"><input className="field" value={r.gradYear ?? ""} onChange={(e) => set({ gradYear: e.target.value || null })} /></Field>
          <Field label="국가연구자번호"><input className="field" value={r.researcherNo ?? ""} onChange={(e) => set({ researcherNo: e.target.value || null })} /></Field>
          <Field label="소속"><input className="field" value={r.company ?? ""} onChange={(e) => set({ company: e.target.value || null })} /></Field>
          <Field label="재직 여부">
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
              <button type="button" onClick={() => set({ active: true })} className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${r.active ? "bg-emerald-500 text-white" : "text-slate-500 hover:bg-slate-50"}`}>재직</button>
              <button type="button" onClick={() => set({ active: false })} className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${!r.active ? "bg-red-500 text-white" : "text-slate-500 hover:bg-slate-50"}`}>퇴사</button>
            </div>
          </Field>
          <Field label="비고" span><input className="field" value={r.note ?? ""} onChange={(e) => set({ note: e.target.value || null })} /></Field>
        </div>
        <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-4">
          {!isNew && (
            <button onClick={onDelete} disabled={saving} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50">
              <Trash2 className="h-4 w-4" /> 삭제
            </button>
          )}
          <button onClick={onClose} disabled={saving} className="btn-ghost ml-auto">취소</button>
          <button onClick={() => onSave(r)} disabled={saving || !r.name.trim()} className="btn-primary">{saving ? "저장 중…" : "저장"}</button>
        </div>
      </div>
    </div>
  );
}

export default function ResearchersPage() {
  const { saveSheet, error } = useDataCtx();
  const [modal, setModal] = useState<{ r: Researcher; isNew: boolean; index: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"researchers" | "employees">("researchers");

  return (
    <WithData>
      {(data) => {
        const active = data.researchers.filter((r) => r.active);
        const departed = data.researchers.filter((r) => !r.active);
        const list = [...active, ...departed];

        async function commit(newList: Researcher[]) {
          setSaving(true);
          try {
            await saveSheet("연구원", toRows(newList.filter((r) => r.name.trim())));
            setModal(null);
          } catch {
            /* 실패 시 error 상태로 표시되고 모달 유지 */
          } finally {
            setSaving(false);
          }
        }
        function save(r: Researcher) {
          if (!modal) return;
          if (modal.isNew) commit([...data.researchers, r]);
          else commit(data.researchers.map((x, i) => (i === modal.index ? r : x)));
        }
        function del() {
          if (!modal) return;
          commit(data.researchers.filter((_, i) => i !== modal.index));
        }

        return (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-1.5">
              {([["researchers", "연구원 명단"], ["employees", "전체 직원"]] as const).map(([k, label]) => (
                <button key={k} onClick={() => setView(k)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${view === k ? "bg-blue-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  {label}
                </button>
              ))}
            </div>

            {view === "researchers" && (
            <Section
              title={`🧑‍🔬 연구원 명단 — 재직 ${active.length}명 (퇴사 ${departed.length}명)`}
              sub="회사 전체 연구원. 4대보험 명부 대조 기준. 국가연구자번호는 보기 화면에서 마스킹됩니다."
            >
              <div className="mb-4 flex items-center gap-2">
                <button onClick={() => setModal({ r: { ...EMPTY }, isNew: true, index: -1 })} className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700">
                  <Plus className="h-3.5 w-3.5" /> 연구원 추가
                </button>
                {error && <span className="text-sm font-medium text-red-600">⚠ {error}</span>}
              </div>

              {list.length === 0 ? (
                <Empty message="등록된 연구원이 없습니다. '연구원 추가'로 등록하세요." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr><th>재직</th><th>성명</th><th>직위</th><th>학위</th><th>전공</th><th>출신대학</th><th>졸업</th><th>국가연구자번호</th><th>소속</th><th>비고</th><th className="text-right">수정</th></tr>
                    </thead>
                    <tbody>
                      {list.map((r) => {
                        const ri = data.researchers.indexOf(r);
                        return (
                          <tr key={ri} className={r.active ? "hover:bg-slate-50" : "opacity-60"}>
                            <td>{r.active ? <Badge tone="green">재직</Badge> : <Badge tone="red">퇴사</Badge>}</td>
                            <td className="font-medium">{r.name}</td>
                            <td>{r.position ?? "—"}</td>
                            <td>{r.degree ?? "—"}</td>
                            <td className="text-xs">{r.major ?? "—"}</td>
                            <td className="text-xs">{r.university ?? "—"}</td>
                            <td className="text-xs">{r.gradYear ?? "—"}</td>
                            <td className="font-mono text-xs">{mask(r.researcherNo)}</td>
                            <td><Badge tone={r.company === "신정개발" ? "blue" : "violet"}>{r.company}</Badge></td>
                            <td className="max-w-56 text-xs text-slate-400">{r.note ?? "—"}</td>
                            <td className="text-right">
                              <button onClick={() => setModal({ r: { ...r }, isNew: false, index: ri })} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="수정">
                                <Pencil className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
            )}

            {view === "employees" && (
            <Section title={`🏢 전체 직원 — ${data.employees.length}명`} sub="4대보험 사업장 가입자 명부 기준 전체 직원. '기업부설연구소' 열에 연구전담요원 여부가 표시됩니다.">
              <EditableTable
                rows={data.employees} cols={EMP_COLS} sheetName="전체직원" toSheetRow={empRow}
                blank={{ name: "", joinedAt: null, rndLab: false, note: null }} requiredKey="name"
                addLabel="직원 추가" entityLabel="직원" emptyMessage="등록된 직원이 없습니다."
              />
            </Section>
            )}

            {modal && (
              <EditModal
                initial={modal.r}
                isNew={modal.isNew}
                saving={saving}
                onSave={save}
                onDelete={del}
                onClose={() => setModal(null)}
              />
            )}
          </div>
        );
      }}
    </WithData>
  );
}
