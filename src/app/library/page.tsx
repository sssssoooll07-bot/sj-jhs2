"use client";

import { useDataCtx } from "@/lib/data-context";
import { Badge, Empty, Section } from "@/components/ui";

/**
 * 자료실 — 지원사업 신청 시 자주 쓰는 서류의 발급처 바로가기.
 * 보안 원칙상 서류 파일 자체는 서버·저장소에 올리지 않는다.
 * 회사 내부 보관함(공유드라이브 등) 링크는 엑셀 [자료실] 시트에 입력해 브라우저에서만 표시한다.
 */

const PRIMARY = [
  {
    name: "4대보험 가입자명부",
    issuer: "4대사회보험 정보연계센터",
    url: "https://www.4insure.or.kr/",
    guide: "로그인(사업장) → 증명서 발급/신청 → 가입자명부",
    icon: "🧾",
  },
  {
    name: "재무제표 (표준재무제표증명)",
    issuer: "국세청 홈택스",
    url: "https://www.hometax.go.kr/",
    guide: "민원증명 → 표준재무제표증명 발급",
    icon: "📊",
  },
];

const SECONDARY = [
  { name: "사업자등록증명", issuer: "홈택스", url: "https://www.hometax.go.kr/" },
  { name: "국세 납세증명서", issuer: "홈택스", url: "https://www.hometax.go.kr/" },
  { name: "지방세 납세증명서", issuer: "위택스", url: "https://www.wetax.go.kr/" },
  { name: "중소기업확인서", issuer: "중소기업현황정보시스템", url: "https://sminfo.mss.go.kr/" },
  { name: "기업부설연구소 인정서", issuer: "KOITA 연구소/전담부서 신고관리시스템", url: "https://www.rnd.or.kr/" },
];

export default function LibraryPage() {
  const { data } = useDataCtx();
  const custom = data?.library ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">자료실</h1>
        <p className="mt-1 text-sm text-slate-500">
          지원사업 신청에 자주 쓰는 서류 발급처 모음 — 서류 파일은 보안상 이 서비스에 저장하지 않으며, 발급처에서
          받거나 사내 보관함 링크(엑셀 [자료실] 시트)로 연결합니다.
        </p>
      </div>

      {/* 주요 서류 2종 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PRIMARY.map((d) => (
          <a
            key={d.name}
            href={d.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-2xl">{d.icon}</p>
            <p className="mt-2 text-base font-bold text-slate-900">
              {d.name} <span className="text-sm font-normal text-blue-600">↗</span>
            </p>
            <p className="mt-0.5 text-sm text-slate-500">{d.issuer}</p>
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-500">발급 경로: {d.guide}</p>
          </a>
        ))}
      </div>

      <Section title="🏛 기타 발급처 바로가기" sub="지원사업 신청 시 함께 요구되는 경우가 많은 서류">
        <table className="table-base">
          <thead>
            <tr><th>서류명</th><th>발급처</th><th>바로가기</th></tr>
          </thead>
          <tbody>
            {SECONDARY.map((d) => (
              <tr key={d.name} className="hover:bg-slate-50">
                <td className="font-medium">{d.name}</td>
                <td className="text-xs">{d.issuer}</td>
                <td>
                  <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">
                    {d.url.replace("https://", "").replace(/\/$/, "")} ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section
        title="🗂 사내 보관함 (엑셀 [자료실] 시트)"
        sub="자주 쓰는 파일의 사내 공유드라이브 링크를 엑셀에 입력하면 여기 표시됩니다 — 링크도 브라우저 안에서만 읽습니다"
      >
        {custom.length === 0 ? (
          <Empty
            message={
              data
                ? "엑셀 [자료실] 시트에 등록된 항목이 없습니다. 서류명·발급처·링크를 입력해 보세요."
                : "엑셀 파일을 불러오면 사내 보관함 링크가 여기 표시됩니다."
            }
          />
        ) : (
          <table className="table-base">
            <thead>
              <tr><th>구분</th><th>서류명</th><th>링크</th><th>비고</th></tr>
            </thead>
            <tbody>
              {custom.map((d, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td>{d.category ? <Badge tone="blue">{d.category}</Badge> : "—"}</td>
                  <td className="font-medium">{d.name}</td>
                  <td>
                    {d.url ? (
                      <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">
                        열기 ↗
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-xs text-slate-400">{d.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
