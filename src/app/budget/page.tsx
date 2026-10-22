"use client";

import { useEffect, useMemo, useState } from "react";
import { WithData } from "@/components/FileGate";
import { Section } from "@/components/ui";
import { useAgreementFiles } from "@/lib/agreement-files";
import DocViewButton from "@/components/DocViewButton";
import { ProjectBudget } from "@/components/ProjectBudget";
import { dateStr } from "@/components/EditableTable";
import { type Data } from "@/lib/excel";

// 사업별 지출부 양식의 집행내역 셀 매핑 (다운로드 시 채울 위치)
const LEDGER_MAP: Record<string, { start: number; date: string; amt: string; desc: string; payee: string; vat: string; cols: Record<string, string> }> = {
  "P2026-03": { start: 14, date: "B", amt: "C", desc: "E", payee: "F", vat: "K", cols: { "위원수당": "G", "자문수당": "H", "원고료": "I", "회의비": "J", "여비": "L" } },
};

function BudgetInner({ data }: { data: Data }) {
  const { list, refresh, getViewUrl } = useAgreementFiles();
  const active = data.projects.filter((p) => p.status === "진행중");
  const [sel, setSel] = useState(0);
  const idx = Math.min(sel, Math.max(active.length - 1, 0));
  const p = active[idx];

  useEffect(() => { void refresh(); }, [refresh]);

  const template = useMemo(() => list("budget").find((d) => /양식|서식|템플릿/.test(d.name)), [list]);
  const ledgerTmpl = useMemo(() => (p ? list("budget").find((d) => d.name.includes("지출부") && d.name.includes(p.code)) : undefined), [list, p]);

  async function buildLedgerBuffer() {
    const map = LEDGER_MAP[p!.code];
    const ExcelJS = (await import("exceljs")).default;
    const url = await getViewUrl(ledgerTmpl!);
    const buf = await (await fetch(url)).arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets[0];
    data.budgetUsages.filter((u) => u.code === p!.code).forEach((u, i) => {
      const row = map.start + i;
      ws.getCell(`A${row}`).value = i + 1;
      ws.getCell(`${map.date}${row}`).value = dateStr(u.usedAt) ?? "";
      ws.getCell(`${map.amt}${row}`).value = (u.amountKWon ?? 0) + (u.vatKWon ?? 0);
      ws.getCell(`${map.desc}${row}`).value = u.desc ?? "";
      ws.getCell(`${map.payee}${row}`).value = u.payee ?? u.note ?? "";
      const col = map.cols[u.category];
      if (col) ws.getCell(`${col}${row}`).value = u.amountKWon ?? 0;
      if (u.vatKWon) ws.getCell(`${map.vat}${row}`).value = u.vatKWon;
    });
    return wb.xlsx.writeBuffer();
  }
  async function downloadLedger() {
    if (!p || !ledgerTmpl || !LEDGER_MAP[p.code]) return;
    const out = await buildLedgerBuffer();
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `지출부_${p.title}.xlsx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return (
    <div className="space-y-5">
      <Section title="💰 사업비 현황" sub="단위: 원 · 비목을 클릭하면 사용내역을 입력할 수 있습니다. 부가세는 집행액에서 제외되고 공급가만 집행에 반영됩니다. (종료된 사업은 과제 상세의 '사업비' 탭에서 확인)">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {template && <DocViewButton doc={template} label={<span className="text-xs font-semibold text-emerald-700">📄 정산 양식 보기 ↗</span>} />}
          {p && ledgerTmpl && LEDGER_MAP[p.code] && (
            <button onClick={downloadLedger} className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-700">
              📥 지출부 다운로드
            </button>
          )}
        </div>

        {active.length === 0 ? (
          <p className="text-sm text-slate-400">진행중인 사업이 없습니다. (종료된 사업의 사업비는 과제 상세의 &apos;사업비&apos; 탭에서 확인하세요.)</p>
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
            {p && <ProjectBudget data={data} p={p} showSummary />}
          </>
        )}
      </Section>
    </div>
  );
}

export default function BudgetPage() {
  return <WithData>{(data) => <BudgetInner data={data} />}</WithData>;
}
