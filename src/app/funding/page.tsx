"use client";

import { fmtDate, daysUntil } from "@/lib/excel";
import { Dday, Empty, Section, StatusBadge } from "@/components/ui";
import { WithData } from "@/components/FileGate";

const SOURCES = [
  { name: "전남테크노파크 (JNTP) 지원사업 공고", url: "https://data.jntp.or.kr/jntp/" },
  { name: "SMTECH 중소기업 기술개발사업 종합관리시스템", url: "https://www.smtech.go.kr/front/main/main.do" },
];

export default function FundingPage() {
  return (
    <WithData>
      {(data) => {
        const list = [...data.funding].sort((a, b) => +(a.applyDue ?? Infinity) - +(b.applyDue ?? Infinity));
        return (
          <div className="space-y-5">
            <Section title="🔗 공고 출처 바로가기" sub="새 공고 확인 후 엑셀 [지원사업공고] 시트에 입력하세요">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {SOURCES.map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                    {s.name} ↗
                  </a>
                ))}
              </div>
            </Section>

            <Section title={`📢 지원사업 공고 — ${list.length}건`} sub="파이프라인: 관심 → 검토중 → 신청준비 → 신청완료 → 선정/탈락">
              {list.length === 0 ? (
                <Empty message="등록된 공고가 없습니다. 엑셀 [지원사업공고] 시트에 입력하세요." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr><th>마감</th><th>공고명</th><th>주관기관</th><th>신청 마감일</th><th>지원규모</th><th>분야</th><th>상태</th><th>출처</th><th>비고</th></tr>
                    </thead>
                    <tbody>
                      {list.map((f, i) => {
                        const active = ["관심", "검토중", "신청준비"].includes(f.status);
                        return (
                          <tr key={i} className="hover:bg-slate-50">
                            <td>{f.applyDue && active ? <Dday days={daysUntil(f.applyDue)} /> : "—"}</td>
                            <td className="font-medium">{f.title}</td>
                            <td className="text-xs">{f.agency}</td>
                            <td className="whitespace-nowrap">{fmtDate(f.applyDue)}</td>
                            <td className="text-xs">{f.scale ?? "—"}</td>
                            <td className="text-xs">{f.field ?? "—"}</td>
                            <td><StatusBadge status={f.status} /></td>
                            <td>
                              {f.sourceUrl ? (
                                <a href={f.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">링크 ↗</a>
                              ) : "—"}
                            </td>
                            <td className="text-xs text-slate-400">{f.note ?? f.rejectReason ?? "—"}</td>
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
