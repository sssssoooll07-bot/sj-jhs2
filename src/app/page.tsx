"use client";

import Link from "next/link";
import { collectDeadlines, participationTotals, daysUntil, fmtKWon, fmtDate, type Data } from "@/lib/excel";
import { Badge, Dday, Empty, Section } from "@/components/ui";
import { WithData } from "@/components/FileGate";

type Due = { source: string; title: string; due: Date; dday: number; href: string; tone: "blue" | "violet" | "amber" | "cyan" | "red" };

/** 전체 탭 통합 마감 임박 (과제 종료 · 인증 갱신 · 공고 마감 · 법정의무) — 90일 내 */
function collectAllDue(data: Data): Due[] {
  const out: Due[] = [];
  for (const p of data.projects) {
    if (p.status === "진행중" && p.endDate) out.push({ source: "과제 종료", title: p.title, due: p.endDate, dday: daysUntil(p.endDate), href: "/projects", tone: "blue" });
  }
  for (const c of data.certifications) {
    const d = c.renewalDue ?? c.validUntil;
    if (c.renewable && d) out.push({ source: "인증 갱신", title: c.name, due: d, dday: daysUntil(d), href: "/certifications", tone: "amber" });
  }
  for (const f of data.funding) {
    if (f.applyDue && ["관심", "검토중", "신청준비"].includes(f.status)) out.push({ source: "공고 마감", title: f.title, due: f.applyDue, dday: daysUntil(f.applyDue), href: "/funding", tone: "cyan" });
  }
  for (const t of data.compliance) {
    if (t.dueDate) out.push({ source: "법정의무", title: t.title, due: t.dueDate, dday: daysUntil(t.dueDate), href: "/compliance", tone: "red" });
  }
  return out.filter((d) => d.dday <= 90 && d.dday >= -30).sort((a, b) => a.dday - b.dday);
}

export default function Dashboard() {
  return (
    <WithData>
      {(data) => {
        const active = data.projects.filter((p) => p.status === "진행중");
        const rnd = data.projects.filter((p) => p.type === "연구과제").length;
        const biz = data.projects.filter((p) => p.type === "지원사업").length;
        const registered = data.patents.filter((p) => p.status === "등록완료").length;
        const filed = data.patents.filter((p) => p.status === "출원중").length;
        const renewable = data.certifications.filter((c) => c.renewable).length;
        const fundingActive = data.funding.filter((f) => ["관심", "검토중", "신청준비", "신청완료"].includes(f.status)).length;
        const activeResearchers = data.researchers.filter((r) => r.active).length;
        const totals = participationTotals(data);
        const over = totals.filter((t) => t.total > 100);
        const allDue = collectAllDue(data);
        const projDeadlines = collectDeadlines(data, 90);
        const mismatch = data.projects.filter((p) => p.phaseCheck === "불일치");

        const cards = [
          { href: "/projects", label: "과제", value: `${data.projects.length}건`, sub: `진행중 ${active.length} · R&D ${rnd} / 비R&D ${biz}` },
          { href: "/patents", label: "특허", value: `${data.patents.length}건`, sub: `등록 ${registered} · 출원 ${filed}` },
          { href: "/certifications", label: "인증·면허", value: `${data.certifications.length}건`, sub: `갱신대상 ${renewable}건` },
          { href: "/funding", label: "지원사업 공고", value: `${data.funding.length}건`, sub: `신청관리 ${fundingActive}건` },
          { href: "/compliance", label: "법정의무·참여율", value: `${data.compliance.length}건`, sub: `참여율 초과 ${over.length}명` },
          { href: "/researchers", label: "연구원", value: `${activeResearchers}명`, sub: `전체 ${data.researchers.length}명 (재직 기준)` },
        ];

        return (
          <div className="space-y-5">
            {/* 전체 탭 요약 카드 */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {cards.map((c) => (
                <Link key={c.label} href={c.href} className="card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <p className="text-xs font-medium text-slate-500">{c.label}</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{c.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{c.sub}</p>
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* 통합 마감 임박 */}
              <Section title="⏰ 마감 임박 (통합, 90일 내)" sub="과제 종료 · 인증 갱신 · 공고 마감 · 법정의무를 D-day 순으로">
                {allDue.length === 0 ? (
                  <Empty message="임박한 마감이 없습니다." />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {allDue.slice(0, 12).map((d, i) => (
                      <li key={i}>
                        <Link href={d.href} className="flex items-center gap-3 py-2 hover:bg-slate-50">
                          <Dday days={d.dday} />
                          <span className="min-w-0 flex-1 truncate text-sm">
                            <Badge tone={d.tone}>{d.source}</Badge> <span className="ml-1">{d.title}</span>
                          </span>
                          <span className="whitespace-nowrap text-xs text-slate-400">{fmtDate(d.due)}</span>
                        </Link>
                      </li>
                    ))}
                    {allDue.length > 12 && <li className="pt-2 text-center text-xs text-slate-400">외 {allDue.length - 12}건</li>}
                  </ul>
                )}
              </Section>

              {/* 진행중 과제 */}
              <Section title={`🚀 진행중 과제 — ${active.length}건`}>
                {active.length === 0 ? (
                  <Empty message="진행중 과제가 없습니다." />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {active.map((p) => (
                      <li key={p.code} className="py-2">
                        <Link href="/projects" className="block hover:bg-slate-50">
                          <p className="text-sm font-medium">
                            <Badge tone={p.type === "연구과제" ? "blue" : "violet"}>{p.type === "연구과제" ? "R&D" : "비R&D"}</Badge>{" "}
                            <span className="ml-1">{p.title}</span>
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {p.code} · {p.agency} · {p.period ?? `${fmtDate(p.startDate)}~${fmtDate(p.endDate)}`} · <b className="text-slate-600">{fmtKWon(p.totalKWon)}</b>
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              {/* 참여율 현황 */}
              <Section title="👥 참여율 현황" sub="진행중 과제 기준 · 오늘 시점 합계 (100% 초과 주의)">
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

              {/* 요약 · 데이터 품질 */}
              <Section title="📋 요약 · 데이터 품질" sub="한눈에 보는 현황과 엑셀 검증">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    {mismatch.length ? <Badge tone="amber">확인 필요</Badge> : <Badge tone="green">OK</Badge>}
                    차수합계 ≠ 총사업금액: {mismatch.length}건
                    {mismatch.length > 0 && <span className="text-xs text-slate-400">({mismatch.map((m) => m.code).join(", ")})</span>}
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge tone={projDeadlines.length ? "amber" : "green"}>{projDeadlines.length}건</Badge>
                    과제 수행기간 종료 임박(90일)
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge tone="blue">특허 {data.patents.length}</Badge>
                    <Badge tone="cyan">공고 {data.funding.length}</Badge>
                    <Badge tone="violet">인증 {data.certifications.length}</Badge>
                    <Badge tone="slate">연구원 {data.researchers.length}</Badge>
                  </li>
                  <li className="text-xs text-slate-400">데이터 로드: {new Date(data.loadedAt).toLocaleString("ko-KR")}</li>
                </ul>
              </Section>
            </div>
          </div>
        );
      }}
    </WithData>
  );
}
