"use client";

import { fmtDate, daysUntil, participationTotals } from "@/lib/excel";
import { Badge, Dday, Empty, Section } from "@/components/ui";
import { WithData } from "@/components/FileGate";

export default function CompliancePage() {
  return (
    <WithData>
      {(data) => {
        const tasks = [...data.compliance].sort((a, b) => +(a.dueDate ?? Infinity) - +(b.dueDate ?? Infinity));
        const totals = participationTotals(data);
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
