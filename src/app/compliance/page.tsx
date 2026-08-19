"use client";

import { fmtKWon, participationTotals, laborCostByProject } from "@/lib/excel";
import { Badge, Section } from "@/components/ui";
import { WithData } from "@/components/FileGate";
import { EditableTable, dateStr, type Col } from "@/components/EditableTable";
import type { Participation } from "@/lib/excel";

const PART_EMPTY: Participation = { name: "", code: "", ratePercent: 0, start: null, end: null, role: null, isNew: false, costType: null, costKWon: null, note: null };
const PART_COLS: Col<Participation>[] = [
  { key: "name", label: "연구원 성명" },
  { key: "code", label: "과제코드" },
  { key: "role", label: "과제내 직위", th: "직위" },
  { key: "ratePercent", label: "참여율(%)", type: "number", align: "right", th: "참여율", view: (p) => <span className="font-semibold">{p.ratePercent}%</span> },
  { key: "costType", label: "인건비 구분", type: "select", options: ["현금", "현물"], th: "구분", view: (p) => (p.costType ? <Badge tone={p.costType === "현금" ? "blue" : "violet"}>{p.costType}</Badge> : "—") },
  { key: "costKWon", label: "인건비(천원)", type: "number", align: "right", th: "인건비", view: (p) => fmtKWon(p.costKWon) },
  { key: "start", label: "시작일", type: "date", hide: true },
  { key: "end", label: "종료일", type: "date", hide: true },
  { key: "isNew", label: "신규 여부", type: "toggle", hide: true },
  { key: "note", label: "비고", span: true, hide: true },
];
const partRow = (p: Participation) => ({
  "연구원 성명": p.name, 과제코드: p.code, "과제내 직위": p.role, 신규여부: p.isNew ? "O" : "",
  "참여율(%)": p.ratePercent, 시작일: dateStr(p.start), 종료일: dateStr(p.end),
  "인건비 구분": p.costType, "인건비(천원)": p.costKWon, 비고: p.note,
});

export default function CompliancePage() {
  return (
    <WithData>
      {(data) => {
        const totals = participationTotals(data);
        const labor = laborCostByProject(data);
        const projTitle = (code: string) => data.projects.find((p) => p.code === code)?.title ?? code;
        const partCols = PART_COLS.map((c) => (c.key === "code" ? { ...c, th: "사업", label: "사업(과제)", view: (p: Participation) => <span className="text-xs text-slate-600">{projTitle(p.code)}</span> } : c));
        const partRows = [...data.participations].sort((a, b) => a.code.localeCompare(b.code));
        return (
          <div className="space-y-5">
            {labor.map((lc) => (
              <Section key={lc.code} title={`💰 인건비 현황 — ${lc.title}`} sub={`${lc.code} · 참여연구원 ${lc.members.length}명 · 단위: 천원 (아래 참여율 편집분 자동 집계)`}>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">현금</p><p className="mt-0.5 text-lg font-bold text-slate-900">{fmtKWon(lc.cashKWon)}</p></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">현물</p><p className="mt-0.5 text-lg font-bold text-slate-900">{fmtKWon(lc.inKindKWon)}</p>{lc.hasPhases && <p className="mt-1">{lc.matchedPhaseLabel ? <Badge tone="green">✓ {lc.matchedPhaseLabel} 현물 일치</Badge> : <Badge tone="amber">⚠ 일치 차수 없음</Badge>}</p>}</div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-3"><p className="text-xs text-blue-700">인건비 합계</p><p className="mt-0.5 text-lg font-bold text-blue-800">{fmtKWon(lc.totalKWon)}</p></div>
                </div>
              </Section>
            ))}

            <Section title={`👥 참여율 — ${data.participations.length}건`} sub="사업(과제)별 참여연구원·인건비. '참여율 추가'로 등록하면 위 인건비·아래 총참여율에 자동 반영됩니다.">
              <EditableTable rows={partRows} cols={partCols} sheetName="참여율" toSheetRow={partRow} blank={PART_EMPTY} requiredKey="name" addLabel="참여율 추가" entityLabel="참여율" emptyMessage="참여율 기록이 없습니다. '참여율 추가'로 등록하세요." />
            </Section>

            <Section title="🧮 연구원별 총 참여율" sub="진행중 과제 · 오늘 기준 — 동일 기간 합계 100% 초과 금지">
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
      }}
    </WithData>
  );
}
