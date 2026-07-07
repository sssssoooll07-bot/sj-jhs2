"use client";

import { fmtDate } from "@/lib/excel";
import { Badge, Empty, Section, StatusBadge } from "@/components/ui";
import { WithData } from "@/components/FileGate";

export default function PatentsPage() {
  return (
    <WithData>
      {(data) => {
        const registered = data.patents
          .filter((p) => p.status === "등록완료")
          .sort((a, b) => +(a.registeredAt ?? 0) - +(b.registeredAt ?? 0));
        const filed = data.patents
          .filter((p) => p.status === "출원중")
          .sort((a, b) => +(a.filedAt ?? 0) - +(b.filedAt ?? 0));

        return (
          <div className="space-y-5">
            <Section title={`✅ 등록완료 — ${registered.length}건 (등록일 순)`}>
              {registered.length === 0 ? (
                <Empty message="등록완료 특허가 없습니다." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr><th>#</th><th>특허 명칭</th><th>등록번호</th><th>등록일</th><th>출원일</th><th>발명자</th><th className="text-center">청구항</th><th className="text-center">피인용</th><th>특허권자</th></tr>
                    </thead>
                    <tbody>
                      {registered.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="text-xs text-slate-400">{i + 1}</td>
                          <td className="font-medium">{p.title} {p.isPCT && <Badge tone="cyan">PCT</Badge>}</td>
                          <td className="font-mono text-xs">{p.regNumber}</td>
                          <td className="whitespace-nowrap">{fmtDate(p.registeredAt)}</td>
                          <td className="whitespace-nowrap text-xs text-slate-500">{fmtDate(p.filedAt)}</td>
                          <td className="text-xs">{p.inventors ?? "—"}</td>
                          <td className="text-center">{p.claims ?? "—"}</td>
                          <td className="text-center">{p.citations ?? "—"}</td>
                          <td className="text-xs">{p.owner ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section title={`🕓 출원중 — ${filed.length}건 (출원일 순)`}>
              {filed.length === 0 ? (
                <Empty message="출원중 특허가 없습니다." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr><th>#</th><th>특허 명칭</th><th>출원번호</th><th>출원일</th><th>진행 상태</th><th>연계사업(비고)</th><th>연계 과제</th><th>발명자</th></tr>
                    </thead>
                    <tbody>
                      {filed.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="text-xs text-slate-400">{i + 1}</td>
                          <td className="font-medium">{p.title} {p.isPCT && <Badge tone="cyan">PCT 국제출원</Badge>}</td>
                          <td className="font-mono text-xs">{p.appNumber}</td>
                          <td className="whitespace-nowrap">{fmtDate(p.filedAt)}</td>
                          <td><StatusBadge status={p.examStatus ?? "심사중"} /></td>
                          <td className="text-xs">{p.note ?? "—"}</td>
                          <td className="font-mono text-xs">{p.projectCode ?? "—"}</td>
                          <td className="text-xs">{p.inventors ?? "—"}</td>
                        </tr>
                      ))}
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
