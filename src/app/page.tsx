"use client";

import Link from "next/link";
import { collectDeadlines, participationTotals, fmtKWon, fmtDate } from "@/lib/excel";
import { Badge, Dday, Empty, Section } from "@/components/ui";
import { WithData } from "@/components/FileGate";

export default function Dashboard() {
  return (
    <WithData>
      {(data) => {
        const deadlines = collectDeadlines(data, 60);
        const totals = participationTotals(data);
        const over = totals.filter((t) => t.total > 100);
        const active = data.projects.filter((p) => p.status === "진행중");
        const registered = data.patents.filter((p) => p.status === "등록완료").length;
        const filed = data.patents.filter((p) => p.status === "출원중").length;
        const renewable = data.certifications.filter((c) => c.renewable).length;
        const mismatch = data.projects.filter((p) => p.phaseCheck === "불일치");

        const cards = [
          { href: "/projects", label: "진행중 과제", value: `${active.length}건`, sub: `전체 ${data.projects.length}건` },
          { href: "/patents", label: "특허", value: `${registered + filed}건`, sub: `등록 ${registered} · 출원 ${filed}` },
          { href: "/funding", label: "마감 임박 (60일 내)", value: `${deadlines.length}건`, sub: "공고 신청 · 법정의무 · 인증 갱신" },
          { href: "/compliance", label: "참여율 경고", value: `${over.length}명`, sub: "합계 100% 초과" },
        ];

        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {cards.map((c) => (
                <Link key={c.label} href={c.href} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                  <p className="text-xs font-medium text-slate-500">{c.label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{c.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{c.sub}</p>
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Section title="⏰ 마감 임박" sub="공고 신청 마감 · 법정의무 · 인증 갱신 (D-day 오름차순)">
                {deadlines.length === 0 ? (
                  <Empty message="60일 내 마감 항목이 없습니다." />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {deadlines.map((d, i) => (
                      <li key={i}>
                        <Link href={d.href} className="flex items-center gap-3 py-2 hover:bg-slate-50">
                          <Dday days={d.dday} />
                          <span className="min-w-0 flex-1 truncate text-sm">
                            <Badge tone="blue">{d.source}</Badge> <span className="ml-1">{d.title}</span>
                          </span>
                          <span className="text-xs text-slate-400">{fmtDate(d.due)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="🚀 진행중 과제">
                {active.length === 0 ? (
                  <Empty message="진행중 과제가 없습니다." />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {active.map((p) => (
                      <li key={p.code} className="py-2">
                        <Link href="/projects" className="block hover:bg-slate-50">
                          <p className="text-sm font-medium">{p.title}</p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {p.code} · {p.agency} · {p.period} · <b className="text-slate-600">{fmtKWon(p.totalKWon)}</b>
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="👥 참여율 현황" sub="진행중 과제 기준 · 오늘 시점 합계">
                {totals.length === 0 ? (
                  <Empty message="진행중 과제의 참여율 기록이 없습니다." />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {totals.map((t) => (
                      <li key={t.name} className="flex items-center gap-3 py-2">
                        <Badge tone={t.total > 100 ? "red" : "green"}>{t.total}%</Badge>
                        <span className="text-sm font-medium">{t.name}</span>
                        <span className="min-w-0 flex-1 truncate text-xs text-slate-400">{t.detail}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="📋 데이터 품질" sub="엑셀 원본 검증 결과">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    {mismatch.length ? <Badge tone="amber">확인 필요</Badge> : <Badge tone="green">OK</Badge>}
                    차수합계 ≠ 총사업금액: {mismatch.length}건
                    {mismatch.length > 0 && <span className="text-xs text-slate-400">({mismatch.map((m) => m.code).join(", ")})</span>}
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge tone={renewable ? "blue" : "slate"}>갱신형 {renewable}건</Badge>
                    인증 {data.certifications.length}건 · 유효기간 미입력{" "}
                    {data.certifications.filter((c) => c.renewable && !c.validUntil && !c.renewalDue).length}건
                  </li>
                  <li className="text-xs text-slate-400">
                    연구원 {data.researchers.length}명 · 공고 {data.funding.length}건 · 법정의무 {data.compliance.length}건 · 데이터 로드{" "}
                    {new Date(data.loadedAt).toLocaleString("ko-KR")}
                  </li>
                </ul>
              </Section>
            </div>
          </div>
        );
      }}
    </WithData>
  );
}
