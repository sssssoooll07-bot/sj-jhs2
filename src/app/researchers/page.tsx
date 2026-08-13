"use client";

import { useState } from "react";
import { Badge, Empty, Section } from "@/components/ui";
import { WithData } from "@/components/FileGate";
import { useDataCtx } from "@/lib/data-context";
import type { Researcher } from "@/lib/excel";

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

const inp = "w-full min-w-[5rem] rounded border border-slate-300 px-1.5 py-1 text-xs";

export default function ResearchersPage() {
  const { saveSheet, error } = useDataCtx();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Researcher[]>([]);
  const [saving, setSaving] = useState(false);

  return (
    <WithData>
      {(data) => {
        function startEdit() {
          setDraft(data.researchers.map((r) => ({ ...r })));
          setEditing(true);
        }
        function cancel() {
          setEditing(false);
          setDraft([]);
        }
        function update(i: number, patch: Partial<Researcher>) {
          setDraft((d) => d.map((r, j) => (j === i ? { ...r, ...patch } : r)));
        }
        function addRow() {
          setDraft((d) => [...d, { ...EMPTY }]);
        }
        function removeRow(i: number) {
          setDraft((d) => d.filter((_, j) => j !== i));
        }
        async function save() {
          setSaving(true);
          try {
            await saveSheet("연구원", toRows(draft.filter((r) => r.name.trim())));
            setEditing(false);
            setDraft([]);
          } catch {
            /* 실패 시 error 상태로 표시되고 편집 유지 */
          } finally {
            setSaving(false);
          }
        }

        const active = data.researchers.filter((r) => r.active);
        const departed = data.researchers.filter((r) => !r.active);
        const list = [...active, ...departed];

        return (
          <Section
            title={`🧑‍🔬 연구원 — 재직 ${active.length}명 (퇴사 ${departed.length}명)`}
            sub="4대보험 명부 대조 기준. 개인정보 최소수집 — 국가연구자번호는 보기 화면에서 마스킹됩니다."
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {!editing ? (
                <button onClick={startEdit} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
                  ✏ 편집
                </button>
              ) : (
                <>
                  <button onClick={save} disabled={saving} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                    {saving ? "저장 중…" : "💾 저장"}
                  </button>
                  <button onClick={cancel} disabled={saving} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                    취소
                  </button>
                  <button onClick={addRow} className="rounded-lg border border-blue-300 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50">
                    + 행 추가
                  </button>
                  <span className="text-xs text-slate-400">편집 후 저장하면 마스터 데이터에 반영됩니다.</span>
                </>
              )}
              {error && <span className="text-sm font-medium text-red-600">⚠ {error}</span>}
            </div>

            {list.length === 0 && !editing ? (
              <Empty message="등록된 연구원이 없습니다. '편집'으로 추가하세요." />
            ) : editing ? (
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr><th>재직</th><th>성명</th><th>직위</th><th>학위</th><th>전공</th><th>출신대학</th><th>졸업</th><th>국가연구자번호</th><th>소속</th><th>비고</th><th></th></tr>
                  </thead>
                  <tbody>
                    {draft.map((r, i) => (
                      <tr key={i}>
                        <td className="text-center"><input type="checkbox" checked={r.active} onChange={(e) => update(i, { active: e.target.checked })} className="h-4 w-4" /></td>
                        <td><input className={inp} value={r.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="성명" /></td>
                        <td><input className={inp} value={r.position ?? ""} onChange={(e) => update(i, { position: e.target.value || null })} /></td>
                        <td><input className={inp} value={r.degree ?? ""} onChange={(e) => update(i, { degree: e.target.value || null })} /></td>
                        <td><input className={inp} value={r.major ?? ""} onChange={(e) => update(i, { major: e.target.value || null })} /></td>
                        <td><input className={inp} value={r.university ?? ""} onChange={(e) => update(i, { university: e.target.value || null })} /></td>
                        <td><input className={inp} value={r.gradYear ?? ""} onChange={(e) => update(i, { gradYear: e.target.value || null })} /></td>
                        <td><input className={inp} value={r.researcherNo ?? ""} onChange={(e) => update(i, { researcherNo: e.target.value || null })} /></td>
                        <td><input className={inp} value={r.company ?? ""} onChange={(e) => update(i, { company: e.target.value || null })} /></td>
                        <td><input className={inp} value={r.note ?? ""} onChange={(e) => update(i, { note: e.target.value || null })} /></td>
                        <td><button onClick={() => removeRow(i)} className="whitespace-nowrap text-xs text-red-600 hover:underline">삭제</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr><th>재직</th><th>성명</th><th>직위</th><th>학위</th><th>전공</th><th>출신대학</th><th>졸업</th><th>국가연구자번호</th><th>소속</th><th>비고</th></tr>
                  </thead>
                  <tbody>
                    {list.map((r, i) => (
                      <tr key={i} className={r.active ? "hover:bg-slate-50" : "opacity-50"}>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        );
      }}
    </WithData>
  );
}
