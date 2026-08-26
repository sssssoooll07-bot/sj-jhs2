"use client";

import { useEffect, useMemo, useState } from "react";
import { WithData } from "@/components/FileGate";
import { Section } from "@/components/ui";
import { useAgreementFiles } from "@/lib/agreement-files";
import DocViewButton from "@/components/DocViewButton";
import { EditableTable, dateStr, type Col } from "@/components/EditableTable";
import { fmtKWon, fmtDate, type Data, type BudgetItem, type BudgetUsage } from "@/lib/excel";

const won = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("ko-KR"));

// 사업별 지출부 양식의 집행내역 셀 매핑 (다운로드 시 채울 위치)
const LEDGER_MAP: Record<string, { start: number; date: string; amt: string; desc: string; payee: string; vat: string; cols: Record<string, string> }> = {
  "P2026-03": { start: 14, date: "B", amt: "C", desc: "E", payee: "F", vat: "K", cols: { "위원수당": "G", "자문수당": "H", "원고료": "I", "회의비": "J", "교통비": "L" } },
};

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function BudgetInner({ data }: { data: Data }) {
  const { list, refresh, getViewUrl } = useAgreementFiles();
  const active = data.projects.filter((p) => p.status === "진행중");
  const [sel, setSel] = useState(0);
  const [selCat, setSelCat] = useState<string | null>(null);
  const idx = Math.min(sel, Math.max(active.length - 1, 0));
  const p = active[idx];

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { setSelCat(null); }, [idx]);

  const template = useMemo(() => list("budget").find((d) => /양식|서식|템플릿/.test(d.name)), [list]);
  const ledgerTmpl = useMemo(() => (p ? list("budget").find((d) => d.name.includes("지출부") && d.name.includes(p.code)) : undefined), [list, p]);

  async function downloadLedger() {
    if (!p || !ledgerTmpl) return;
    const map = LEDGER_MAP[p.code];
    if (!map) { alert("이 사업의 지출부 양식 셀 매핑이 아직 없습니다."); return; }
    const ExcelJS = (await import("exceljs")).default;
    const url = await getViewUrl(ledgerTmpl);
    const buf = await (await fetch(url)).arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets[0];
    data.budgetUsages.filter((u) => u.code === p.code).forEach((u, i) => {
      const row = map.start + i;
      ws.getCell(`A${row}`).value = i + 1;
      ws.getCell(`${map.date}${row}`).value = dateStr(u.usedAt) ?? "";
      ws.getCell(`${map.amt}${row}`).value = (u.amountKWon ?? 0) + (u.vatKWon ?? 0);
      ws.getCell(`${map.desc}${row}`).value = u.desc ?? "";
      ws.getCell(`${map.payee}${row}`).value = u.note ?? "";
      const col = map.cols[u.category];
      if (col) ws.getCell(`${col}${row}`).value = u.amountKWon ?? 0;
      if (u.vatKWon) ws.getCell(`${map.vat}${row}`).value = u.vatKWon;
    });
    const out = await wb.xlsx.writeBuffer();
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `지출부_${p.title}.xlsx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  // 모두 '원' 단위. 집행액은 공급가만(부가세 제외).
  const usedWon = (cat: string) =>
    data.budgetUsages.filter((u) => u.code === p?.code && u.category === cat).reduce((s, u) => s + (u.amountKWon ?? 0), 0);
  const usedTotalWon = (cat: string) =>
    data.budgetUsages.filter((u) => u.code === p?.code && u.category === cat).reduce((s, u) => s + (u.amountKWon ?? 0) + (u.vatKWon ?? 0), 0);

  const items = p ? data.budgetItems.filter((b) => b.code === p.code) : [];
  const tot = items.reduce(
    (a, b) => ({ plan: a.plan + (b.planKWon ?? 0), final: a.final + (b.finalKWon ?? 0), exec: a.exec + usedWon(b.category) }),
    { plan: 0, final: 0, exec: 0 },
  );

  const BUDGET_COLS: Col<BudgetItem>[] = [
    { key: "category", label: "비목(세목)", span: true, view: (b) => <span className="font-medium">{b.category}</span> },
    { key: "planKWon", label: "최초계획금액(원)", type: "number", align: "center", th: "최초계획", nowrap: true, view: (b) => won(b.planKWon) },
    { key: "finalKWon", label: "최종변경금액(원)", type: "number", align: "center", th: "최종변경", nowrap: true, view: (b) => won(b.finalKWon) },
    { key: "execKWon", label: "집행", th: "집행", align: "center", nowrap: true, editable: false, view: (b) => won(usedWon(b.category)) },
    {
      key: "note", label: "비고", th: "잔액(집행율)", align: "center", nowrap: true, editable: false,
      view: (b) => {
        const f = b.finalKWon ?? 0, e = usedWon(b.category);
        const rate = f ? (e / f) * 100 : 0;
        return <span className="text-xs">{won(f - e)}{f ? <span className={rate > 100 ? "ml-1 font-semibold text-red-600" : "ml-1 text-slate-400"}>({rate.toFixed(0)}%)</span> : null}</span>;
      },
    },
  ];
  const budgetRow = (b: BudgetItem) => ({ 과제코드: b.code, 비목: b.category, 최초계획금액: b.planKWon, 최종변경금액: b.finalKWon, 집행금액: b.execKWon, 비고: b.note });

  const USAGE_COLS: Col<BudgetUsage>[] = [
    { key: "usedAt", label: "집행일", type: "date", nowrap: true },
    { key: "desc", label: "적요(사용내역)", span: true },
    {
      key: "grossKWon", label: "총액(원) — 입력하면 부가세 자동계산", type: "number", align: "center", th: "총액", nowrap: true, placeholder: "총액 입력",
      view: (u) => won(u.grossKWon ?? ((u.amountKWon ?? 0) + (u.vatKWon ?? 0))),
      derive: (v) => { const g = Number(v) || 0; const vat = Math.round(g / 11); return g ? { vatKWon: vat, amountKWon: g - vat } : { vatKWon: null, amountKWon: null }; },
    },
    { key: "amountKWon", label: "공급가(원) — 자동·수정가능", type: "number", align: "center", th: "공급가", nowrap: true, view: (u) => won(u.amountKWon) },
    { key: "vatKWon", label: "부가세(원) — 자동·수정가능", type: "number", align: "center", th: "부가세", nowrap: true, view: (u) => won(u.vatKWon) },
  ];
  const usageRow = (u: BudgetUsage) => ({ 과제코드: u.code, 비목: u.category, 집행일: dateStr(u.usedAt), 적요: u.desc, "총액(원)": u.grossKWon ?? ((u.amountKWon ?? 0) + (u.vatKWon ?? 0)), "금액(원)": u.amountKWon, "부가세(원)": u.vatKWon, 비고: u.note });

  return (
    <div className="space-y-5">
      <Section title="💰 사업비 현황" sub="단위: 원 · 비목을 클릭하면 사용내역을 입력할 수 있습니다. 부가세는 집행액에서 제외되고 공급가만 집행에 반영됩니다.">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {template && <DocViewButton doc={template} label={<span className="text-xs font-semibold text-emerald-700">📄 정산 양식 보기 ↗</span>} />}
          {p && ledgerTmpl && LEDGER_MAP[p.code] && (
            <button onClick={downloadLedger} className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-700">
              📥 지출부 양식으로 다운로드
            </button>
          )}
        </div>

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
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Info label="총사업금액" value={fmtKWon(p.totalKWon)} />
                  <Info label="사업기간" value={p.period ?? (p.startDate && p.endDate ? `${fmtDate(p.startDate)} ~ ${fmtDate(p.endDate)}` : "—")} />
                  <Info label="지원기관" value={p.agency ?? "—"} />
                  <Info label="역할" value={p.role ?? "—"} />
                </div>

                <EditableTable
                  rows={data.budgetItems} rowFilter={(b) => b.code === p.code} cols={BUDGET_COLS}
                  onRowClick={(b) => setSelCat(b.category)}
                  sheetName="사업비" toSheetRow={budgetRow} blank={{ code: p.code, category: "", planKWon: null, finalKWon: null, execKWon: null, note: null }}
                  requiredKey="category" addLabel="비목 추가" entityLabel="비목"
                  emptyMessage="등록된 비목이 없습니다. '비목 추가'로 세목을 등록하세요."
                />

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Info label="최초계획 합계" value={`${won(tot.plan)}원`} />
                  <Info label="최종변경 합계" value={`${won(tot.final)}원`} />
                  <Info label="집행 합계(공급가)" value={`${won(tot.exec)}원`} />
                  <Info label="잔액 (집행율)" value={`${won(tot.final - tot.exec)}원${tot.final ? ` (${((tot.exec / tot.final) * 100).toFixed(0)}%)` : ""}`} />
                </div>

                {/* 선택 비목 사용내역 */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  {selCat ? (
                    <>
                      <p className="mb-2 text-sm font-semibold text-slate-700">📋 &lt;{selCat}&gt; 사용내역 — 실지출 {won(usedTotalWon(selCat))}원 · 집행(공급가) {won(usedWon(selCat))}원</p>
                      <EditableTable
                        rows={data.budgetUsages} rowFilter={(u) => u.code === p.code && u.category === selCat} cols={USAGE_COLS}
                        sheetName="사업비사용내역" toSheetRow={usageRow} blank={{ code: p.code, category: selCat, usedAt: todayUTC, desc: null, amountKWon: null, vatKWon: null, grossKWon: null, note: null }}
                        requiredKey="desc" addLabel="사용내역 추가" entityLabel="사용내역"
                        emptyMessage="사용내역이 없습니다. '사용내역 추가'로 집행 내역(집행일·적요·공급가·부가세)을 기록하세요."
                      />
                      <p className="mt-2 text-[11px] text-slate-400">※ 부가세는 집행액(비목)에서 제외되고 공급가만 반영됩니다.</p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400">위 표에서 <b className="text-slate-600">비목을 클릭</b>하면 해당 비목의 사용내역을 입력할 수 있습니다.</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </Section>
    </div>
  );
}

export default function BudgetPage() {
  return <WithData>{(data) => <BudgetInner data={data} />}</WithData>;
}
