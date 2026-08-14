"use client";

import { useDataCtx } from "@/lib/data-context";
import { Badge, Empty, Section } from "@/components/ui";
import { EditableTable, type Col } from "@/components/EditableTable";
import type { LibraryDoc } from "@/lib/excel";

/**
 * 자료실 — 발급처 바로가기 + 사내 보관함 링크(회사소개서·홈페이지 등).
 * (특허증은 '특허' 탭, 협약서는 '과제' 상세에서 확인)
 */

const PRIMARY = [
  { name: "4대보험 가입자명부", issuer: "4대사회보험 정보연계센터", url: "https://www.4insure.or.kr/", guide: "로그인(사업장) → 증명서 발급/신청 → 가입자명부", icon: "🧾" },
  { name: "재무제표 (표준재무제표증명)", issuer: "국세청 홈택스", url: "https://www.hometax.go.kr/", guide: "민원증명 → 표준재무제표증명 발급", icon: "📊" },
];

const SECONDARY = [
  { name: "사업자등록증명", issuer: "홈택스", url: "https://www.hometax.go.kr/" },
  { name: "국세 납세증명서", issuer: "홈택스", url: "https://www.hometax.go.kr/" },
  { name: "지방세 납세증명서", issuer: "위택스", url: "https://www.wetax.go.kr/" },
  { name: "중소기업확인서", issuer: "중소기업현황정보시스템", url: "https://sminfo.mss.go.kr/" },
  { name: "기업부설연구소 인정서", issuer: "KOITA 연구소/전담부서 신고관리시스템", url: "https://www.rnd.or.kr/" },
];

const LIB_EMPTY: LibraryDoc = { category: null, name: "", url: null, note: null };
const LIB_COLS: Col<LibraryDoc>[] = [
  { key: "category", label: "구분", view: (d) => (d.category ? <Badge tone="blue">{d.category}</Badge> : "—") },
  { key: "name", label: "서류명", span: true },
  { key: "url", label: "링크(URL)", th: "링크", view: (d) => (d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">열기 ↗</a> : "—") },
  { key: "note", label: "비고", span: true, hide: true },
];
const libRow = (d: LibraryDoc) => ({ 구분: d.category, 서류명: d.name, "발급처·링크": d.url, 비고: d.note });

export default function LibraryPage() {
  const { data } = useDataCtx();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">자료실</h1>
        <p className="mt-1 text-sm text-slate-500">발급처 바로가기 · 사내 보관함 링크(회사소개서·홈페이지 등). (특허증은 특허 탭, 협약서는 과제 상세에서 확인)</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PRIMARY.map((d) => (
          <a key={d.name} href={d.url} target="_blank" rel="noreferrer" className="card p-5 transition-shadow hover:shadow-md">
            <p className="text-2xl">{d.icon}</p>
            <p className="mt-2 text-base font-bold text-slate-900">{d.name} <span className="text-sm font-normal text-blue-600">↗</span></p>
            <p className="mt-0.5 text-sm text-slate-500">{d.issuer}</p>
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-500">발급 경로: {d.guide}</p>
          </a>
        ))}
      </div>

      <Section title="🏛 기타 발급처 바로가기" sub="지원사업 신청 시 함께 요구되는 경우가 많은 서류">
        <table className="table-base">
          <thead><tr><th>서류명</th><th>발급처</th><th>바로가기</th></tr></thead>
          <tbody>
            {SECONDARY.map((d) => (
              <tr key={d.name} className="hover:bg-slate-50">
                <td className="font-medium">{d.name}</td>
                <td className="text-xs">{d.issuer}</td>
                <td><a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">{d.url.replace("https://", "").replace(/\/$/, "")} ↗</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="🗂 사내 보관함" sub="회사소개서·홈페이지 등 웹 링크(URL)를 등록합니다. '열기 ↗'로 새 탭에서 열립니다.">
        {data ? (
          <EditableTable rows={data.library} cols={LIB_COLS} sheetName="자료실" toSheetRow={libRow} blank={LIB_EMPTY} requiredKey="name" addLabel="링크 추가" entityLabel="링크" emptyMessage="등록된 링크가 없습니다. '링크 추가'로 등록하세요(웹 주소 URL)." />
        ) : (
          <Empty message="로그인하면 사내 보관함을 편집할 수 있습니다." />
        )}
      </Section>
    </div>
  );
}
