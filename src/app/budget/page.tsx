"use client";

import { useState } from "react";
import { WithData } from "@/components/FileGate";
import { Section } from "@/components/ui";
import { fmtKWon, fmtDate, type Data } from "@/lib/excel";

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function BudgetInner({ data }: { data: Data }) {
  const active = data.projects.filter((p) => p.status === "진행중");
  const [sel, setSel] = useState(0);
  const idx = Math.min(sel, Math.max(active.length - 1, 0));
  const p = active[idx];
  const phases = p ? data.phases.filter((ph) => ph.code === p.code) : [];

  return (
    <div className="space-y-5">
      <Section title="💰 사업비 현황" sub="진행중인 사업별 사업비 관리 — 상단에서 사업을 선택하세요">
        {active.length === 0 ? (
          <p className="text-sm text-slate-400">진행중인 사업이 없습니다.</p>
        ) : (
          <>
            {/* 진행중 사업 탭 */}
            <div className="mb-4 flex flex-wrap gap-1.5">
              {active.map((pr, i) => (
                <button
                  key={pr.code}
                  onClick={() => setSel(i)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    i === idx ? "bg-blue-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {pr.title}
                </button>
              ))}
            </div>

            {p && (
              <div className="space-y-4">
                {/* 기본 정보 */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Info label="총사업금액" value={fmtKWon(p.totalKWon)} />
                  <Info label="사업기간" value={p.period ?? (p.startDate && p.endDate ? `${fmtDate(p.startDate)} ~ ${fmtDate(p.endDate)}` : "—")} />
                  <Info label="지원기관" value={p.agency ?? "—"} />
                  <Info label="역할" value={p.role ?? "—"} />
                </div>

                {/* 차수별 사업비 */}
                {phases.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="table-base">
                      <thead>
                        <tr><th>차수</th><th>기간</th><th className="text-right">지원금</th><th className="text-right">현금</th><th className="text-right">현물</th><th className="text-right">합계</th></tr>
                      </thead>
                      <tbody>
                        {phases.map((ph, i) => (
                          <tr key={i}>
                            <td className="font-medium">{ph.label ?? `${i + 1}차`}</td>
                            <td className="text-xs text-slate-500">{ph.period ?? "—"}</td>
                            <td className="text-right">{fmtKWon(ph.govKWon)}</td>
                            <td className="text-right">{fmtKWon(ph.cashKWon)}</td>
                            <td className="text-right">{fmtKWon(ph.inKindKWon)}</td>
                            <td className="text-right font-semibold">{fmtKWon(ph.totalKWon)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 양식 자리 (추후 입력) */}
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <p className="text-sm font-medium text-slate-500">📋 사업비 세부 양식 자리</p>
                  <p className="mt-1 text-xs text-slate-400">여기에 사업비 집행·정산 양식을 넣어 진행할 수 있습니다.</p>
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
