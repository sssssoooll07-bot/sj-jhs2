"use client";

import { useEffect, useRef, useState } from "react";
import { WithData } from "@/components/FileGate";
import { Section } from "@/components/ui";
import { useAgreementFiles } from "@/lib/agreement-files";
import DocViewButton from "@/components/DocViewButton";
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
  const { list, getByPattern, loadFolder, refresh, uploading, error, cloud } = useAgreementFiles();
  const fileRef = useRef<HTMLInputElement>(null);
  const active = data.projects.filter((p) => p.status === "진행중");
  const [sel, setSel] = useState(0);
  const idx = Math.min(sel, Math.max(active.length - 1, 0));
  const p = active[idx];
  const phases = p ? data.phases.filter((ph) => ph.code === p.code) : [];

  // 사업비 폴더 목록을 새로 읽는다(업로드 직후 반영)
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const budgetDocs = list("budget");
  const template = budgetDocs.find((d) => /양식|서식|템플릿/.test(d.name));
  const projFile = p ? getByPattern(p.code, "budget") : null;

  return (
    <div className="space-y-5">
      <Section title="💰 사업비 현황" sub="진행중인 사업별 사업비 관리 — 상단에서 사업을 선택하세요">
        {/* 양식 · 업로드 */}
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <p className="text-xs text-emerald-800">
            📄 사업비 정산 양식 — 인건비 급여대장 · 비목(세목)별 지출부 · 내역서 · 사용현황{cloud ? ` · 파일 ${budgetDocs.length}건` : ""}
          </p>
          {template && <DocViewButton doc={template} label={<span className="text-xs font-semibold">빈 양식 보기 ↗</span>} />}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {uploading ? "업로드 중…" : "사업비 파일 업로드"}
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".xlsx,.xls,.pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => e.target.files && loadFolder(e.target.files, "budget")}
          />
        </div>
        {error && <p className="mb-2 text-sm font-medium text-red-600">⚠ {error}</p>}

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

                {/* 이 사업 사업비 파일 */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-700">📑 이 사업 사업비 정산 파일</p>
                  {projFile ? (
                    <div className="mt-2">
                      <DocViewButton doc={projFile} label={<span className="text-sm">{projFile.name}</span>} />
                    </div>
                  ) : (
                    <p className="mt-1.5 text-xs text-slate-400">
                      아직 등록된 파일이 없습니다. 위 &apos;사업비 파일 업로드&apos;로 올리세요 — 파일명에 과제코드
                      <b className="text-slate-600"> {p.code} </b>를 포함하면 이 사업에 자동 연결됩니다.
                    </p>
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
