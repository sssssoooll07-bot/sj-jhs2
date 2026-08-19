"use client";

import { useState } from "react";
import { fmtKWon, participationTotals, laborCostByProject, type Data, type Participation } from "@/lib/excel";
import { Badge, Section } from "@/components/ui";
import { WithData } from "@/components/FileGate";
import { EditableTable, dateStr, type Col } from "@/components/EditableTable";

const PART_EMPTY: Participation = { name: "", code: "", ratePercent: 0, start: null, end: null, role: null, isNew: false, costType: null, costKWon: null, note: null };
const PART_COLS: Col<Participation>[] = [
  { key: "name", label: "연구원 성명" },
  { key: "code", label: "과제코드" },
  { key: "role", label: "과제내 직위", th: "직위" },
  { key: "ratePercent", label: "참여율(%)", type: "number", align: "center", th: "참여율", view: (p) => <span className="font-semibold">{p.ratePercent}%</span> },
  { key: "costType", label: "인건비 구분", type: "select", options: ["현금", "현물"], th: "구분", view: (p) => (p.costType ? <Badge tone={p.costType === "현금" ? "blue" : "violet"}>{p.costType}</Badge> : "—") },
  { key: "costKWon", label: "인건비(천원)", type: "number", align: "center", th: "인건비", view: (p) => fmtKWon(p.costKWon) },
  { key: "start", label: "시작일", type: "date", hide: true },
  { key: "end", label: "종료일", type: "date", hide: true },
  { key: "isNew", label: "신규 여부", type: "toggle", hide: true },
  { key: "note", label: "구분·역할", span: true, th: "구분·역할", view: (p) => <span className="text-xs text-slate-500">{p.note ?? "—"}</span> },
];
const partRow = (p: Participation) => ({
  "연구원 성명": p.name, 과제코드: p.code, "과제내 직위": p.role, 신규여부: p.isNew ? "O" : "",
  "참여율(%)": p.ratePercent, 시작일: dateStr(p.start), 종료일: dateStr(p.end),
  "인건비 구분": p.costType, "인건비(천원)": p.costKWon, 비고: p.note,
});

function ComplianceInner({ data }: { data: Data }) {
  const active = data.projects.filter((p) => p.status === "진행중");
  const [sel, setSel] = useState(0);
  const idx = Math.min(sel, Math.max(active.length - 1, 0));
  const p = active[idx];
  const totals = participationTotals(data);
  const labor = laborCostByProject(data).filter((lc) => lc.code === p?.code);
  // 탭으로 사업을 선택하므로 표에서 과제코드 열은 감춘다
  const partCols = PART_COLS.filter((c) => c.key !== "code");

  return (
    <div className="space-y-5">
      <Section title="👥 참여율" sub="진행중 사업을 선택하면 해당 사업의 인건비·참여연구원이 표시됩니다. '참여율 추가'로 등록.">
        {active.length === 0 ? (
          <p className="text-sm text-slate-400">진행중인 사업이 없습니다.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {active.map((pr, i) => (
                <button key={pr.code} onClick={() => setSel(i)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${i === idx ? "bg-blue-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  {pr.title}
                </button>
              ))}
            </div>

            {p && (
              <div className="space-y-4">
                {labor.map((lc) => (
                  <div key={lc.code} className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">현금</p><p className="mt-0.5 text-lg font-bold text-slate-900">{fmtKWon(lc.cashKWon)}</p></div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">현물</p><p className="mt-0.5 text-lg font-bold text-slate-900">{fmtKWon(lc.inKindKWon)}</p></div>
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3"><p className="text-xs text-blue-700">인건비 합계</p><p className="mt-0.5 text-lg font-bold text-blue-800">{fmtKWon(lc.totalKWon)}</p></div>
                  </div>
                ))}
                <EditableTable
                  rows={data.participations} rowFilter={(pp) => pp.code === p.code} cols={partCols}
                  sheetName="참여율" toSheetRow={partRow} blank={{ ...PART_EMPTY, code: p.code }} requiredKey="name"
                  addLabel="참여율 추가" entityLabel="참여율"
                  emptyMessage="이 사업의 참여율 기록이 없습니다. '참여율 추가'로 등록하세요."
                />
              </div>
            )}
          </>
        )}
      </Section>

      <Section title="🧮 연구원별 총 참여율" sub="진행중 과제 전체 · 오늘 기준 — 동일 기간 합계 100% 초과 금지">
        {totals.length === 0 ? (
          <p className="text-sm text-slate-400">진행중 과제의 참여율 기록이 없습니다.</p>
        ) : (
          <table className="table-base">
            <thead><tr><th>연구원</th><th>총 참여율</th><th>상태</th><th>과제별 내역</th></tr></thead>
            <tbody>
              {totals.map((t) => (
                <tr key={t.name} className={t.total > 100 ? "bg-red-50" : ""}>
                  <td className="font-medium">{t.name}</td>
                  <td className="font-bold">{t.total}%</td>
                  <td>{t.total > 100 ? <Badge tone="red">한도 초과</Badge> : <Badge tone="green">정상</Badge>}</td>
                  <td className="text-xs text-slate-500">{t.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

export default function CompliancePage() {
  return <WithData>{(data) => <ComplianceInner data={data} />}</WithData>;
}
