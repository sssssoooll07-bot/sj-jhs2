"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collectDeadlines, participationTotals, daysUntil, fmtKWon, fmtDate } from "@/lib/excel";
import { Badge, Dday, Empty, Section } from "@/components/ui";
import { WithData } from "@/components/FileGate";

type FeedItem = {
  source: string; agency: string; title: string; category: string | null; summary: string | null;
  applyStart: string | null; applyEnd: string | null; announcedAt: string | null; url: string;
};

// 여수(본사)와 무관한 전남 내 다른 시·군 한정 공고는 제외 (AutoAnnouncements와 동일 기준)
const OTHER_CITIES = [
  "광양", "순천", "나주", "목포", "장성", "곡성", "구례", "고흥", "보성", "화순",
  "장흥", "강진", "해남", "영암", "무안", "함평", "영광", "완도", "진도", "신안", "담양", "광주",
];
function feedRelevant(i: FeedItem): boolean {
  const t = `${i.title} ${i.category ?? ""} ${i.summary ?? ""}`;
  if (t.includes("여수")) return true;
  if (OTHER_CITIES.some((c) => t.includes(c))) return false;
  return true;
}

export default function Dashboard() {
  // /funding 과 동일한 자동수집 피드를 읽어 '접수중' 공고를 대시보드에도 표시
  const [feed, setFeed] = useState<FeedItem[] | null>(null);
  useEffect(() => {
    fetch("/announcements.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setFeed(d.items ?? []))
      .catch(() => setFeed([]));
  }, []);

  const accepting = (feed ?? [])
    .filter((i) => {
      if (!feedRelevant(i)) return false;
      if (i.applyEnd) { const d = daysUntil(new Date(i.applyEnd + "T00:00:00Z")); return d >= 0 && d <= 100; }
      if (i.announcedAt) { const d = daysUntil(new Date(i.announcedAt + "T00:00:00Z")); return d >= -30 && d <= 0; }
      return false;
    })
    .sort((a, b) => (a.applyEnd ?? "9999").localeCompare(b.applyEnd ?? "9999")); // 마감 임박순

  return (
    <WithData>
      {(data) => {
        const active = data.projects.filter((p) => p.status === "진행중");
        const rnd = data.projects.filter((p) => p.type === "연구과제").length;
        const biz = data.projects.filter((p) => p.type === "지원사업").length;
        const registered = data.patents.filter((p) => p.status === "등록완료").length;
        const filed = data.patents.filter((p) => p.status === "출원완료").length;
        const renewable = data.certifications.filter((c) => c.renewable).length;
        const activeResearchers = data.researchers.filter((r) => r.active).length;
        const totals = participationTotals(data);
        const over = totals.filter((t) => t.total > 100);
        const projDeadlines = collectDeadlines(data, 90);

        const cards = [
          { href: "/projects", label: "과제", value: `${data.projects.length}건`, sub: `진행중 ${active.length} · R&D ${rnd} / 비R&D ${biz}` },
          { href: "/patents", label: "특허", value: `${data.patents.length}건`, sub: `등록 ${registered} · 출원 ${filed}` },
          { href: "/certifications", label: "인증·면허", value: `${data.certifications.length}건`, sub: `갱신대상 ${renewable}건` },
          { href: "/funding", label: "지원사업 공고", value: feed === null ? "…" : `접수중 ${accepting.length}건`, sub: "매일 08:00 자동 수집" },
          { href: "/compliance", label: "참여율", value: `${data.participations.length}건`, sub: `참여율 초과 ${over.length}명` },
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
              {/* 과제 마감 임박 (과제만) */}
              <Section title="⏰ 과제 마감 임박 (90일 내)" sub="진행중 과제의 수행기간 종료 (D-day 순)">
                {projDeadlines.length === 0 ? (
                  <Empty message="수행기간 종료가 임박한 과제가 없습니다." />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {projDeadlines.map((d, i) => (
                      <li key={i}>
                        <Link href={d.href} className="flex items-center gap-3 py-2 hover:bg-slate-50">
                          <Dday days={d.dday} />
                          <span className="min-w-0 flex-1 truncate text-sm">
                            <Badge tone={d.source === "연구과제" ? "blue" : "violet"}>{d.source === "연구과제" ? "R&D" : "비R&D"}</Badge> <span className="ml-1">{d.title}</span>
                          </span>
                          <span className="whitespace-nowrap text-xs text-slate-400">종료 {fmtDate(d.due)}</span>
                        </Link>
                      </li>
                    ))}
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

              {/* 지원사업 공고 (자동 수집 · 접수중) — 헤더/행 클릭으로 이동 */}
              <section className="card p-5 sm:p-6">
                <Link href="/funding" className="group mb-4 flex items-start gap-2.5">
                  <span className="mt-1 h-4 w-1 shrink-0 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold tracking-tight text-slate-800 group-hover:text-blue-700">
                      📢 지원사업 공고 — 접수중 {feed === null ? "…" : `${accepting.length}건`}{" "}
                      <span className="text-sm font-normal text-blue-600 group-hover:underline">전체보기 ↗</span>
                    </h2>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-400">전남 전체·여수 · 마감 임박순 · 매일 08:00 자동 수집</p>
                  </div>
                </Link>
                {feed === null ? (
                  <p className="py-6 text-center text-sm text-slate-400">불러오는 중…</p>
                ) : accepting.length === 0 ? (
                  <Empty message="현재 접수중인(전남 전체·여수) 공고가 없습니다." />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {accepting.slice(0, 6).map((f, i) => (
                      <li key={i}>
                        <a href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-2 hover:bg-slate-50">
                          {f.applyEnd ? <Dday days={daysUntil(new Date(f.applyEnd + "T00:00:00Z"))} /> : <span className="text-xs text-slate-400">—</span>}
                          <span className="min-w-0 flex-1 truncate text-sm">
                            <span className="font-medium">{f.title}</span> <span className="text-xs text-slate-400">· {f.agency}</span>
                          </span>
                          <span className="whitespace-nowrap text-xs text-slate-400">{f.applyEnd ?? "—"}</span>
                        </a>
                      </li>
                    ))}
                    {accepting.length > 6 && (
                      <li className="pt-2 text-center text-xs">
                        <Link href="/funding" className="text-blue-600 hover:underline">외 {accepting.length - 6}건 전체보기 →</Link>
                      </li>
                    )}
                  </ul>
                )}
              </section>
            </div>
          </div>
        );
      }}
    </WithData>
  );
}
