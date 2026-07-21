"use client";

import { fmtDate, fmtKWon, daysUntil, participationTotals, laborCostByProject } from "@/lib/excel";
import { Badge, Dday, Empty, Section } from "@/components/ui";
import { WithData } from "@/components/FileGate";

export default function CompliancePage() {
  return (
    <WithData>
      {(data) => {
        const tasks = [...data.compliance].sort((a, b) => +(a.dueDate ?? Infinity) - +(b.dueDate ?? Infinity));
        const totals = participationTotals(data);
        const labor = laborCostByProject(data);
        return (
          <div className="space-y-5">
            <Section title={`⚖ 법정 의무 — ${tasks.length}건`} sub="연구실 안전점검 · 안전교육 · 보험 · 기업부설연구소(KOITA) 신고">
              {tasks.length === 0 ? (
                <Empty message="등록된 법정 의무가 없습니다." />
              ) : (
                <table className="table-base">
                  <thead><tr><th>D-day</th><th>제목</th><th>종류</th><th>마감일</th><th>반복</th></tr></thead>
                  <tbody>
                    {tasks.map((t, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td>{t.dueDate ? <Dday days={daysUntil(t.dueDate)} /> : "—"}</td>
                        <td className="font-medium">{t.title}</td>
                        <td><Badge tone="blue">{t.kind}</Badge></td>
                        <td className="whitespace-nowrap">{fmtDate(t.dueDate)}</td>
                        <td className="text-xs">{t.recurrence ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            {/* 인건비 현황 — 참여연구원 현황표 기준 */}
            {labor.map((lc) => (
              <Section
                key={lc.code}
                title={`💰 인건비 현황 — ${lc.title}`}
                sub={`${lc.code} · 참여연구원 ${lc.members.length}명 · 단위: 천원`}
              >
                <div className="mb-4 grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">현금</p>
                    <p className="mt-0.5 text-lg font-bold text-slate-900">{fmtKWon(lc.cashKWon)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">현물</p>
                    <p className="mt-0.5 text-lg font-bold text-slate-900">{fmtKWon(lc.inKindKWon)}</p>
                    {lc.hasPhases && (
                      <p className="mt-1">
                        {lc.matchedPhaseLabel ? (
                          <Badge tone="green">✓ {lc.matchedPhaseLabel} 기업부담(현물) 일치</Badge>
                        ) : (
                          <Badge tone="amber">⚠ 일치하는 차수 없음</Badge>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="text-xs text-blue-700">인건비 합계</p>
                    <p className="mt-0.5 text-lg font-bold text-blue-800">{fmtKWon(lc.totalKWon)}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>성명</th><th>과제내 직위</th><th>신규</th><th>참여기간</th>
                        <th className="text-right">참여율</th><th>구분</th><th className="text-right">인건비</th><th>비고</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lc.members.map((m, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="font-medium">{m.name}</td>
                          <td>{m.role ?? "—"}</td>
                          <td>{m.isNew ? <Badge tone="cyan">신규</Badge> : <span className="text-xs text-slate-400">기존</span>}</td>
                          <td className="whitespace-nowrap text-xs">
                            {fmtDate(m.start)} ~ {fmtDate(m.end)}
                          </td>
                          <td className="text-right font-semibold">{m.ratePercent}%</td>
                          <td><Badge tone={m.costType === "현금" ? "blue" : "violet"}>{m.costType ?? "—"}</Badge></td>
                          <td className="text-right font-semibold">{fmtKWon(m.costKWon)}</td>
                          <td className="text-xs text-slate-400">{m.note ?? "—"}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold">
                        <td colSpan={6}>합계</td>
                        <td className="text-right">{fmtKWon(lc.totalKWon)}</td>
                        <td className="text-xs font-normal text-slate-400">현금 {fmtKWon(lc.cashKWon)} · 현물 {fmtKWon(lc.inKindKWon)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Section>
            ))}

            <Section title="👥 연구원별 총 참여율" sub="진행중 과제 · 오늘 기준 — 동일 기간 합계 100% 초과 금지">
              {totals.length === 0 ? (
                <Empty message="진행중 과제의 참여율 기록이 없습니다. 엑셀 [참여율] 시트에 입력하세요." />
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
              <p className="mt-3 text-xs text-slate-400">
                전체 참여율 기록 {data.participations.length}건 — 완료 과제 참여분은 합계에서 제외됩니다.
              </p>
            </Section>
          </div>
        );
      }}
    </WithData>
  );
}
