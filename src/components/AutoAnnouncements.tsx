"use client";

import { useEffect, useState } from "react";
import { daysUntil } from "@/lib/excel";
import { Badge, Dday, Empty, Section } from "@/components/ui";

type Item = {
  source: string; agency: string; title: string; category: string | null; summary: string | null;
  applyStart: string | null; applyEnd: string | null; announcedAt: string | null; url: string;
};
type Feed = { fetchedAt: string; errors?: string[]; items: Item[] };

/** 매일 08:00 KST에 GitHub Actions가 갱신하는 공개 공고 피드 (public/announcements.json) */
export default function AutoAnnouncements() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/announcements.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setFeed)
      .catch(() => setFailed(true));
  }, []);

  const items = (feed?.items ?? []).filter((i) => !i.applyEnd || daysUntil(new Date(i.applyEnd + "T00:00:00Z")) >= 0);

  return (
    <Section
      title={`🤖 자동 수집 공고 — 접수중 ${items.length}건`}
      sub={`JNTP·SMTECH에서 매일 08:00 자동 수집 (참고용 — 신청 관리는 엑셀에 입력)${
        feed ? ` · 마지막 수집 ${new Date(feed.fetchedAt).toLocaleString("ko-KR")}` : ""
      }`}
    >
      {failed ? (
        <Empty message="자동 수집 데이터를 불러오지 못했습니다. 다음 수집(매일 08:00) 후 다시 확인하세요." />
      ) : !feed ? (
        <p className="py-6 text-center text-sm text-slate-400">불러오는 중…</p>
      ) : items.length === 0 ? (
        <Empty message="현재 접수중인 자동 수집 공고가 없습니다." />
      ) : (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>마감</th><th>공고명</th><th>출처</th><th>구분</th><th>접수기간</th></tr>
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
                  <td><Badge tone={i.source === "JNTP" ? "blue" : "violet"}>{i.source}</Badge></td>
                  <td className="text-xs">{i.category ?? "—"}</td>
                  <td className="whitespace-nowrap text-xs">
                    {i.applyStart ?? "—"} ~ {i.applyEnd ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {feed?.errors && <p className="mt-2 text-xs text-amber-600">⚠ 일부 출처 수집 실패: {feed.errors.join(" / ")} (이전 수집분 표시)</p>}
    </Section>
  );
}
