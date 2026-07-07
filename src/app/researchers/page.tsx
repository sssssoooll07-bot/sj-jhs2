"use client";

import { Badge, Empty, Section } from "@/components/ui";
import { WithData } from "@/components/FileGate";

/** 국가연구자번호는 공개 화면 기준 마스킹 표시 (개인정보 최소수집) */
function mask(no: string | null): string {
  if (!no) return "—";
  if (no.length <= 4) return "****";
  return no.slice(0, 2) + "*".repeat(no.length - 4) + no.slice(-2);
}

export default function ResearchersPage() {
  return (
    <WithData>
      {(data) => (
        <Section
          title={`🧑‍🔬 연구원 — ${data.researchers.length}명`}
          sub="개인정보 최소수집: 연봉·연락처·생년월일은 수집하지 않으며, 국가연구자번호는 마스킹 표시됩니다."
        >
          {data.researchers.length === 0 ? (
            <Empty message="등록된 연구원이 없습니다." />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr><th>성명</th><th>직위</th><th>학위</th><th>전공</th><th>출신대학</th><th>졸업</th><th>국가연구자번호</th><th>소속</th></tr>
                </thead>
                <tbody>
                  {data.researchers.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="font-medium">{r.name}</td>
                      <td>{r.position ?? "—"}</td>
                      <td>{r.degree ?? "—"}</td>
                      <td className="text-xs">{r.major ?? "—"}</td>
                      <td className="text-xs">{r.university ?? "—"}</td>
                      <td className="text-xs">{r.gradYear ?? "—"}</td>
                      <td className="font-mono text-xs">{mask(r.researcherNo)}</td>
                      <td><Badge tone={r.company === "신정개발" ? "blue" : "violet"}>{r.company}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}
    </WithData>
  );
}
