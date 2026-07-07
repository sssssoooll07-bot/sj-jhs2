"use client";

import { fmtDate, daysUntil } from "@/lib/excel";
import { Badge, Dday, Empty, Section } from "@/components/ui";
import { WithData } from "@/components/FileGate";

const CAT_TONE: Record<string, "blue" | "amber" | "violet"> = { 인증: "blue", "면허·등록": "amber", "표창·수상": "violet" };

export default function CertificationsPage() {
  return (
    <WithData>
      {(data) => {
        const list = data.certifications;
        const now = new Date();
        const dueOf = (c: (typeof list)[number]) => c.renewalDue ?? c.validUntil;
        const renewSoon = list.filter((c) => { const d = dueOf(c); return c.renewable && d && daysUntil(d) >= 0 && daysUntil(d) <= 90; });
        const expired = list.filter((c) => { const d = dueOf(c); return d && d < now; });
        const noDate = list.filter((c) => c.renewable && !dueOf(c));

        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { label: "보유 현황", value: `${list.length}건`, sub: `인증 ${list.filter((c) => c.category === "인증").length} · 면허 ${list.filter((c) => c.category === "면허·등록").length} · 표창 ${list.filter((c) => c.category === "표창·수상").length}` },
                { label: "갱신 대상", value: `${list.filter((c) => c.renewable).length}건`, sub: `유효기간 미입력 ${noDate.length}건` },
                { label: "갱신 임박 (90일)", value: `${renewSoon.length}건`, sub: "유효기간 입력 시 자동 감지" },
                { label: "만료", value: `${expired.length}건`, sub: "" },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium text-slate-500">{c.label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{c.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{c.sub}</p>
                </div>
              ))}
            </div>

            <Section title="🏅 인증 · 면허 · 표창" sub="갱신형 인증은 엑셀 [인증] 시트에 유효기간을 입력하면 D-day가 표시됩니다 (발급기관 기준 우선)">
              {list.length === 0 ? (
                <Empty message="등록된 인증이 없습니다." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr><th>연도</th><th>명칭</th><th>구분</th><th>배지</th><th>유효기간/갱신마감</th><th>D-day</th></tr>
                    </thead>
                    <tbody>
                      {list.map((c, i) => {
                        const due = dueOf(c);
                        return (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="font-mono text-xs">{c.year}</td>
                            <td className="font-medium">{c.name}</td>
                            <td><Badge tone={CAT_TONE[c.category] ?? "slate"}>{c.category}</Badge></td>
                            <td>
                              <div className="flex gap-1">
                                {c.renewable && <Badge tone="amber">갱신 대상</Badge>}
                                {c.rndRelated && <Badge tone="green">연구소 관련</Badge>}
                              </div>
                            </td>
                            <td className="text-xs">{due ? fmtDate(due) : c.renewable ? "미입력 (엑셀에 입력하세요)" : "—"}</td>
                            <td>{due ? <Dday days={daysUntil(due)} /> : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </div>
        );
      }}
    </WithData>
  );
}
