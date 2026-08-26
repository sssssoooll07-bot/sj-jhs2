"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Empty } from "@/components/ui";
import { fmtDate } from "@/lib/excel";
import { useDataCtx } from "@/lib/data-context";

export type Col<T> = {
  key: Extract<keyof T, string>;
  label: string;
  type?: "text" | "number" | "date" | "toggle" | "select";
  options?: string[];
  span?: boolean; // 폼에서 2열 차지
  hide?: boolean; // 보기 테이블에서 숨김(폼엔 표시)
  editable?: boolean; // false면 폼에서 제외
  view?: (r: T) => React.ReactNode; // 보기 셀 커스텀
  align?: "left" | "right" | "center";
  nowrap?: boolean; // 보기 테이블에서 줄바꿈 방지(한 줄 표시)
  th?: string;
  placeholder?: string;
  derive?: (val: unknown, r: T) => Partial<T>; // 이 필드 변경 시 다른 필드 자동 계산(예: 총액→공급가/부가세)
};

/** Date → "yyyy-mm-dd" (시트 저장·date input용). Date 아니면 null. */
export function dateStr(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}-${String(v.getUTCDate()).padStart(2, "0")}`;
  }
  return null;
}
const inputToDate = (s: string): Date | null => (s ? new Date(s + "T00:00:00Z") : null);

function cellText(v: unknown, type?: string): React.ReactNode {
  if (v === null || v === undefined || v === "") return "—";
  if (type === "date") return v instanceof Date ? fmtDate(v) : "—";
  if (type === "toggle") return v ? "예" : "—";
  return String(v);
}

/** 시트 하나를 표로 보여주고, 행별 팝업 폼으로 편집·추가·삭제하는 공용 컴포넌트. */
export function EditableTable<T extends Record<string, unknown>>({
  rows, cols, sheetName, toSheetRow, blank, requiredKey, addLabel = "추가", entityLabel = "항목", emptyMessage, addOnly = false, readOnly = false, rowFilter, onRowClick,
}: {
  rows: T[];
  cols: Col<T>[];
  sheetName: string;
  toSheetRow: (r: T) => Record<string, unknown>;
  blank: T;
  requiredKey: Extract<keyof T, string>;
  addLabel?: string;
  entityLabel?: string;
  emptyMessage?: string;
  /** true면 기존 행 수정·삭제 없이 '추가'만 가능 (협약서 등) */
  addOnly?: boolean;
  /** true면 추가·수정 모두 없이 보기 전용 */
  readOnly?: boolean;
  /** 표시만 걸러낸다(저장은 rows 전체 기준) — 연도 필터 등 */
  rowFilter?: (r: T) => boolean;
  /** 행 클릭 시 호출 (수정 버튼 제외) — 상세 보기 등 */
  onRowClick?: (r: T) => void;
}) {
  const { saveSheet, error } = useDataCtx();
  const [modal, setModal] = useState<{ r: T; isNew: boolean; index: number } | null>(null);
  const [saving, setSaving] = useState(false);

  async function commit(list: T[]) {
    setSaving(true);
    try {
      await saveSheet(sheetName, list.filter((r) => String(r[requiredKey] ?? "").trim()).map(toSheetRow));
      setModal(null);
    } catch {
      /* error 상태로 표시 */
    } finally {
      setSaving(false);
    }
  }
  const save = (r: T) => modal && commit(modal.isNew ? [...rows, r] : rows.map((x, i) => (i === modal.index ? r : x)));
  const del = () => modal && commit(rows.filter((_, i) => i !== modal.index));

  const tableCols = cols.filter((c) => !c.hide);
  const formCols = cols.filter((c) => c.editable !== false);
  const visible = rows.map((r, i) => ({ r, i })).filter(({ r }) => !rowFilter || rowFilter(r));

  return (
    <div>
      {!readOnly && (
        <div className="mb-4 flex items-center gap-2">
          <button onClick={() => setModal({ r: { ...blank }, isNew: true, index: -1 })} className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700">
            <Plus className="h-3.5 w-3.5" /> {addLabel}
          </button>
          {error && <span className="text-sm font-medium text-red-600">⚠ {error}</span>}
        </div>
      )}
      {visible.length === 0 ? (
        <Empty message={rows.length === 0 ? (emptyMessage ?? `등록된 ${entityLabel}이(가) 없습니다. '${addLabel}'으로 등록하세요.`) : "선택한 조건에 해당하는 항목이 없습니다."} />
      ) : (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                {tableCols.map((c, ci) => <th key={ci} className={c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""}>{c.th ?? c.label}</th>)}
                {onRowClick && !addOnly && !readOnly && <th className="text-right">수정</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map(({ r, i }) => (
                <tr key={i} onClick={() => { if (onRowClick) onRowClick(r); else if (!addOnly && !readOnly) setModal({ r: { ...r }, isNew: false, index: i }); }} className={`hover:bg-slate-50 ${onRowClick || (!addOnly && !readOnly) ? "cursor-pointer" : ""}`}>
                  {tableCols.map((c, ci) => (
                    <td key={ci} className={`${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""} ${c.nowrap ? "whitespace-nowrap" : ""}`}>
                      {c.view ? c.view(r) : cellText(r[c.key], c.type)}
                    </td>
                  ))}
                  {onRowClick && !addOnly && !readOnly && (
                    <td className="text-right">
                      <button onClick={(e) => { e.stopPropagation(); setModal({ r: { ...r }, isNew: false, index: i }); }} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="수정">
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <EditModal cols={formCols} initial={modal.r} isNew={modal.isNew} saving={saving} entityLabel={entityLabel} requiredKey={requiredKey} onSave={save} onDelete={del} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function EditModal<T extends Record<string, unknown>>({
  cols, initial, isNew, saving, entityLabel, requiredKey, onSave, onDelete, onClose,
}: {
  cols: Col<T>[]; initial: T; isNew: boolean; saving: boolean; entityLabel: string;
  requiredKey: Extract<keyof T, string>; onSave: (r: T) => void; onDelete: () => void; onClose: () => void;
}) {
  const [r, setR] = useState<T>(initial);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "Enter" && !saving && String(r[requiredKey] ?? "").trim()) { e.preventDefault(); onSave(r); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, onSave, r, saving, requiredKey]);
  const set = (k: string, v: unknown) => setR((p) => {
    const next = { ...p, [k]: v } as T;
    const col = cols.find((c) => c.key === k);
    if (col?.derive) Object.assign(next as Record<string, unknown>, col.derive(v, next));
    return next;
  });
  const valid = String(r[requiredKey] ?? "").trim().length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h3 className="text-base font-bold tracking-tight text-slate-800">{entityLabel} {isNew ? "추가" : "수정"}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 px-5 py-4">
          {cols.map((c) => (
            <label key={c.key} className={`block ${c.span ? "col-span-2" : ""}`}>
              <span className="mb-1 block text-xs font-medium text-slate-500">{c.label}</span>
              {c.type === "toggle" ? (
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
                  <button type="button" onClick={() => set(c.key, true)} className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${r[c.key] ? "bg-blue-500 text-white" : "text-slate-500 hover:bg-slate-50"}`}>예</button>
                  <button type="button" onClick={() => set(c.key, false)} className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${!r[c.key] ? "bg-slate-400 text-white" : "text-slate-500 hover:bg-slate-50"}`}>아니오</button>
                </div>
              ) : c.type === "select" ? (
                <select className="field" value={(r[c.key] as string | null) ?? ""} onChange={(e) => set(c.key, e.target.value || null)}>
                  <option value="">—</option>
                  {c.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : c.type === "date" ? (
                <input type="date" className="field" value={dateStr(r[c.key]) ?? ""} onChange={(e) => set(c.key, inputToDate(e.target.value))} />
              ) : c.type === "number" ? (
                <input type="number" className="field" value={(r[c.key] as number | null) ?? ""} onChange={(e) => set(c.key, e.target.value === "" ? null : Number(e.target.value))} placeholder={c.placeholder} />
              ) : (
                <input className="field" value={(r[c.key] as string | null) ?? ""} onChange={(e) => set(c.key, e.target.value || null)} placeholder={c.placeholder} autoFocus={c.key === requiredKey} />
              )}
            </label>
          ))}
        </div>
        <div className="sticky bottom-0 flex items-center gap-2 border-t border-slate-100 bg-white px-5 py-4">
          {!isNew && (
            <button onClick={onDelete} disabled={saving} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50">
              <Trash2 className="h-4 w-4" /> 삭제
            </button>
          )}
          <button onClick={onClose} disabled={saving} className="btn-ghost ml-auto">취소</button>
          <button onClick={() => onSave(r)} disabled={saving || !valid} className="btn-primary">{saving ? "저장 중…" : "저장"}</button>
        </div>
      </div>
    </div>
  );
}
