"use client";

import { fmtKWon, fmtDate, type Data, type Project } from "@/lib/excel";
import { Badge, Empty, Section, StatusBadge } from "@/components/ui";
import { WithData } from "@/components/FileGate";

function ProjectTable({ list }: { list: Project[] }) {
  if (list.length === 0) return <Empty message="등록된 과제가 없습니다." />;
  return (
    <div className="overflow-x-auto">
      <table className="table-base">
        <thead>
          <tr>
            <th>코드</th><th>과제명</th><th>지원부처/기관</th><th>총사업기간</th>
            <th className="text-right">총사업금액</th><th className="text-right">차수합계</th>
            <th>검증</th><th>역할</th><th>상태</th>
          </tr>
        </thead>
        <tbody>
          {list.map((p) => (
            <tr key={p.code} className="hover:bg-slate-50">
              <td className="whitespace-nowrap font-mono text-xs">{p.code}</td>
              <td className="font-medium">{p.title}</td>
              <td className="text-xs">{p.agency ?? "—"}</td>
              <td className="whitespace-nowrap text-xs">{p.period ?? `${fmtDate(p.startDate)} ~ ${fmtDate(p.endDate)}`}</td>
              <td className="whitespace-nowrap text-right font-semibold">{fmtKWon(p.totalKWon)}</td>
              <td className="whitespace-nowrap text-right">{fmtKWon(p.phaseSumKWon)}</td>
              <td>{p.phaseCheck === "OK" ? <Badge tone="green">OK</Badge> : p.phaseCheck === "불일치" ? <Badge tone="amber">⚠ 불일치</Badge> : "—"}</td>
              <td>{p.role ?? "—"}</td>
              <td><StatusBadge status={p.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 과제별 전용통장 — 마스터 [과제] 시트의 은행명·계좌번호·예금주 (로그인 사용자만 열람) */
function AccountTable({ list }: { list: Project[] }) {
  const withAcct = list.filter((p) => p.bank || p.account || p.accountHolder);
  if (withAcct.length === 0)
    return <Empty message="마스터 [과제] 시트의 은행명·계좌번호·예금주 칸을 채우면 여기에 표시됩니다." />;
  return (
    <div className="overflow-x-auto">
      <table className="table-base">
        <thead>
          <tr><th>코드</th><th>과제명</th><th>은행</th><th>계좌번호</th><th>예금주</th></tr>
        </thead>
        <tbody>
          {withAcct.map((p) => (
            <tr key={p.code} className="hover:bg-slate-50">
              <td className="whitespace-nowrap font-mono text-xs">{p.code}</td>
              <td className="font-medium">{p.title}</td>
              <td className="whitespace-nowrap text-xs">{p.bank ?? "—"}</td>
              <td className="whitespace-nowrap font-mono text-sm">{p.account ?? "—"}</td>
              <td className="whitespace-nowrap text-xs">{p.accountHolder ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Details({ data }: { data: Data }) {
  const detail = (code: string) => ({
    phases: data.phases.filter((x) => x.code === code),
    consortium: data.consortium.filter((x) => x.code === code),
    disb: data.disbursements.filter((x) => x.code === code),
  });
  return (
    <div className="space-y-4">
      {data.projects
        .filter((p) => detail(p.code).phases.length > 0)
        .map((p) => {
          const d = detail(p.code);
          return (
            <details key={p.code} className="rounded-lg border border-slate-200">
              <summary className="cursor-pointer select-none px-4 py-2 text-sm font-medium hover:bg-slate-50">
                <span className="font-mono text-xs text-slate-400">{p.code}</span> {p.title}
                <span className="ml-2 text-xs text-slate-400">차수 {d.phases.length} · 기관 {d.consortium.length} · 입금 {d.disb.length}</span>
              </summary>
              <div className="grid grid-cols-1 gap-4 border-t border-slate-100 p-4 lg:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-semibold text-slate-500">차수별 예산</p>
                  <table className="table-base">
                    <thead><tr><th>차수</th><th>기간</th><th className="text-right">지원금</th><th className="text-right">부담(현금)</th><th className="text-right">부담(현물)</th><th className="text-right">계</th></tr></thead>
                    <tbody>
                      {d.phases.map((ph, i) => (
                        <tr key={i}>
                          <td>{ph.label}</td><td className="text-xs">{ph.period}</td>
                          <td className="text-right">{fmtKWon(ph.govKWon)}</td>
                          <td className="text-right">{fmtKWon(ph.cashKWon)}</td>
                          <td className="text-right">{fmtKWon(ph.inKindKWon)}</td>
                          <td className="text-right font-semibold">{fmtKWon(ph.totalKWon)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-3">
                  {d.consortium.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-semibold text-slate-500">참여기관</p>
                      <table className="table-base">
                        <thead><tr><th>기관</th><th>역할</th><th className="text-right">지원금</th><th className="text-right">현금</th><th className="text-right">현물</th></tr></thead>
                        <tbody>
                          {d.consortium.map((c, i) => (
                            <tr key={i}>
                              <td>{c.name}</td>
                              <td>{c.role ? <Badge tone={c.role === "주관" ? "blue" : "slate"}>{c.role}</Badge> : "—"}</td>
                              <td className="text-right">{fmtKWon(c.govKWon)}</td>
                              <td className="text-right">{fmtKWon(c.cashKWon)}</td>
                              <td className="text-right">{fmtKWon(c.inKindKWon)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {d.disb.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-semibold text-slate-500">지원금 입금 이력</p>
                      <table className="table-base">
                        <thead><tr><th>입금일</th><th>지급업체</th><th className="text-right">금액</th></tr></thead>
                        <tbody>
                          {d.disb.map((x, i) => (
                            <tr key={i}>
                              <td>{fmtDate(x.paidAt)}</td><td>{x.payer}</td>
                              <td className="text-right font-semibold">{fmtKWon(x.amountKWon)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </details>
          );
        })}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <WithData>
      {(data) => {
        const gov = data.projects.filter((p) => p.type === "연구과제");
        const biz = data.projects.filter((p) => p.type === "지원사업");
        return (
          <div className="space-y-5">
            <Section title={`⚗ 연구과제 (GOV_RND) — ${gov.length}건`} sub="금액 단위: 천원 · 차수합계는 [차수] 시트에서 자동 집계">
              <ProjectTable list={gov} />
            </Section>
            <Section title={`🏭 지원사업 (BIZ_SUPPORT) — ${biz.length}건`}>
              <ProjectTable list={biz} />
            </Section>
            <Section title="💳 과제별 전용통장" sub="정부 R&D 전용계좌 — 마스터 [과제] 시트의 은행명·계좌번호·예금주 (로그인 사용자만 열람)">
              <AccountTable list={data.projects} />
            </Section>
            <Section title="📅 다년차 상세 (차수 · 참여기관 · 입금)" sub="과제코드 기준 연결">
              <Details data={data} />
            </Section>
          </div>
        );
      }}
    </WithData>
  );
}
