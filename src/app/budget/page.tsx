"use client";

import { useEffect, useMemo, useState } from "react";
import { WithData } from "@/components/FileGate";
import { Section } from "@/components/ui";
import { useAgreementFiles } from "@/lib/agreement-files";
import DocViewButton from "@/components/DocViewButton";
import { EditableTable, type Col } from "@/components/EditableTable";
import { fmtKWon, fmtDate, type Data, type BudgetItem } from "@/lib/excel";

const won = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("ko-KR"));

const BUDGET_COLS: Col<BudgetItem>[] = [
  { key: "category", label: "비목(세목)", span: true, view: (b) => <span className="font-medium">{b.category}</span> },
  { key: "planKWon", label: "최초계획금액(천원)", type: "number", align: "right", th: "최초계획", nowrap: true, view: (b) => won(b.planKWon) },
  { key: "finalKWon", label: "최종변경금액(천원)", type: "number", align: "right", th: "최종변경", nowrap: true, view: (b) => won(b.finalKWon) },
  { key: "execKWon", label: "집행금액(천원)", type: "number", align: "right", th: "집행", nowrap: true, view: (b) => won(b.execKWon) },
  {
    key: "note", label: "비고", th: "잔액(집행율)", nowrap: true, align: "right", editable: false,
    view: (b) => {
      const f = b.finalKWon ?? 0, e = b.execKWon ?? 0;
      const rate = f ? (e / f) * 100 : 0;
      return <span className="text-xs">{won(f - e)}{f ? <span className={rate > 100 ? "ml-1 font-semibold text-red-600" : "ml-1 text-slate-400"}>({rate.toFixed(0)}%)</span> : null}</span>;
    },
  },
];
const budgetRow = (b: BudgetItem) => ({ 과제코드: b.code, 비목: b.category, 최초계획금액: b.planKWon, 최종변경금액: b.finalKWon, 집행금액: b.execKWon, 비고: b.note });

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function BudgetInner({ data }: { data: Data }) {
  const { list, refresh } = useAgreementFiles();
  const active = data.projects.filter((p) => p.status === "진행중");
  const [sel, setSel] = useState(0);
  const idx = Math.min(sel, Math.max(active.length - 1, 0));
  const p = active[idx];

  useEffect(() => { void refresh(); }, [refresh]);

  const template = useMemo(() => list("budget").find((d) => /양식|서식|템플릿/.test(d.name)), [list]);
  const items = p ? data.budgetItems.filter((b) => b.code === p.code) : [];
  const tot = items.reduce((a, b) => ({ plan: a.plan + (b.planKWon ?? 0), final: a.final + (b.finalKWon ?? 0), exec: a.exec + (b.execKWon ?? 0) }), { plan: 0, final: 0, exec: 0 });
  const blank: BudgetItem = { code: p?.code ?? "", category: "", planKWon: null, finalKWon: null, execKWon: null, note: null };

  return (
    <div className="space-y-5">
      <Section title="💰 사업비 현황" sub="진행중 사업별 비목(세목) 예산·집행. '비목 추가'로 세목 등록, ✎로 금액 수정. 잔액·집행율은 자동 계산. (단위: 천원)">
        {template && (
          <div className="mb-3">
            <DocViewButton doc={template} label={<span className="text-xs font-semibold text-emerald-700">📄 정산 양식 보기 ↗</span>} />
          </div>
        )}

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
                  sheetName="사업비" toSheetRow={budgetRow} blank={blank} requiredKey="category"
                  addLabel="비목 추가" entityLabel="비목"
                  emptyMessage="등록된 비목이 없습니다. '비목 추가'로 세목을 등록하세요."
                />

                {/* 합계 */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Info label="최초계획 합계" value={`${won(tot.plan)}천원`} />
                  <Info label="최종변경 합계" value={`${won(tot.final)}천원`} />
                  <Info label="집행 합계" value={`${won(tot.exec)}천원`} />
                  <Info label="잔액 (집행율)" value={`${won(tot.final - tot.exec)}천원${tot.final ? ` (${((tot.exec / tot.final) * 100).toFixed(0)}%)` : ""}`} />
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
