"use client";

import { useEffect, useState } from "react";
import { daysUntil } from "@/lib/excel";
import { Badge, Dday, Empty, Section } from "@/components/ui";

type Item = {
  source: string; agency: string; title: string; category: string | null; summary: string | null;
  applyStart: string | null; applyEnd: string | null; announcedAt: string | null; url: string;
};
type Feed = { fetchedAt: string; errors?: string[]; items: Item[] };

const SOURCE_INFO = {
  JNTP: { label: "전남테크노파크", icon: "🏢", tone: "blue" as const, site: "https://data.jntp.or.kr/jntp/content/business/announcement/list.jsp" },
  SMTECH: { label: "중기청 (SMTECH)", icon: "🏛", tone: "violet" as const, site: "https://www.smtech.go.kr/front/ifg/no/notice02_list.do" },
};
type SrcKey = keyof typeof SOURCE_INFO;

// 여수(본사 소재지)와 무관한 전남 내 다른 시·군 한정 공고는 제외한다.
const OTHER_CITIES = [
  "광양", "순천", "나주", "목포", "장성", "곡성", "구례", "고흥", "보성", "화순",
  "장흥", "강진", "해남", "영암", "무안", "함평", "영광", "완도", "진도", "신안", "담양", "광주",
];
/** 전남 전체(도 단위) 또는 여수 관련만 관심 대상 */
function isRelevant(i: Item): boolean {
  const t = `${i.title} ${i.category ?? ""} ${i.summary ?? ""}`;
  if (t.includes("여수")) return true; // 여수 관련은 항상 표시
  if (OTHER_CITIES.some((c) => t.includes(c))) return false; // 다른 시·군 한정 → 제외
  return true; // 시·군 특정이 없으면 전남 전체(또는 전국)로 간주
}

function SourceTable({ items, tone }: { items: Item[]; tone: "blue" | "violet" }) {
  if (items.length === 0) return <Empty message="현재 접수중인(마감 100일 이내) 전남 전체·여수 공고가 없습니다." />;
  return (
    <div className="overflow-x-auto">
      <table className="table-base">
        <thead>
          <tr><th>마감</th><th>공고명</th><th>구분/사업명</th><th>접수기간</th></tr>
        </thead>
        <tbody>
          {items.map((i, idx) => (
            <tr key={idx} className="hover:bg-slate-50">
              <td>{i.applyEnd ? <Dday days={daysUntil(new Date(i.applyEnd + "T00:00:00Z"))} /> : "—"}</td>
              <td>
                <a href={i.url} target="_blank" rel="noreferrer" className="font-medium text-slate-800 hover:text-blue-700 hover:underline" title={i.summary ?? undefined}>
                  {i.title} <span className="text-xs text-slate-400">↗</span>
                </a>
              </td>
              <td className="max-w-52 text-xs">{i.category ? <Badge tone={tone}>{i.category}</Badge> : "—"}</td>
              <td className="whitespace-nowrap text-xs">{i.applyStart ?? "—"} ~ {i.applyEnd ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 매일 08:00 KST에 GitHub Actions가 갱신하는 공개 공고 피드 — 출처 필터(전체/전남TP/중기청), 전남 전체·여수만 */
export default function AutoAnnouncements() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [failed, setFailed] = useState(false);
  const [src, setSrc] = useState<"전체" | SrcKey>("JNTP");

  useEffect(() => {
    fetch("/announcements.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setFeed)
      .catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <Section title="🤖 자동 수집 공고" sub="매일 08:00 자동 수집 (참고용)">
        <Empty message="자동 수집 데이터를 불러오지 못했습니다. 다음 수집(매일 08:00) 후 다시 확인하세요." />
      </Section>
    );
  }
  if (!feed) {
    return (
      <Section title="🤖 자동 수집 공고" sub="매일 08:00 자동 수집 (참고용)">
        <p className="py-6 text-center text-sm text-slate-400">불러오는 중…</p>
      </Section>
    );
  }

  // 전남 전체·여수 + 접수중 + 마감 100일 이내
  const accepting = feed.items.filter((i) => {
    if (!isRelevant(i)) return false;
    if (!i.applyEnd) return true;
    const d = daysUntil(new Date(i.applyEnd + "T00:00:00Z"));
    return d >= 0 && d <= 100;
  });
  const fetchedLabel = `매일 08:00 자동 수집 · 전남 전체·여수만 · 마지막 수집 ${new Date(feed.fetchedAt).toLocaleString("ko-KR")}`;
  const keys: SrcKey[] = src === "전체" ? (Object.keys(SOURCE_INFO) as SrcKey[]) : [src];
  const filterButtons: ["전체" | SrcKey, string][] = [["JNTP", "전남테크노파크"], ["SMTECH", "중기청"], ["전체", "전체"]];

  return (
    <div className="space-y-5">
      {/* 출처 필터 (과제탭과 동일한 스타일) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold text-slate-400">출처</span>
        {filterButtons.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setSrc(k)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${src === k ? "bg-blue-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {keys.map((key) => {
        const info = SOURCE_INFO[key];
        const items = accepting.filter((i) => i.source === key);
        return (
          <Section key={key} title={`${info.icon} ${info.label} — 접수중 ${items.length}건`} sub={fetchedLabel}>
            <div className="mb-2 text-right">
              <a href={info.site} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">{info.label} 공고 전체보기 ↗</a>
            </div>
            <SourceTable items={items} tone={info.tone} />
          </Section>
        );
      })}
      {feed.errors && <p className="text-xs text-amber-600">⚠ 일부 출처 수집 실패: {feed.errors.join(" / ")} (이전 수집분 표시)</p>}
    </div>
  );
}
