"use client";

import { useEffect, useRef } from "react";
import { useDataCtx } from "@/lib/data-context";
import { useAgreementFiles } from "@/lib/agreement-files";
import { Badge, Empty, Section, Dday } from "@/components/ui";
import { EditableTable, dateStr, type Col } from "@/components/EditableTable";
import DocViewButton from "@/components/DocViewButton";
import { daysUntil, type LibraryDoc } from "@/lib/excel";

/**
 * 자료실 — 발급처 바로가기 + 사내 보관함(파일 업로드·URL 링크·만료일 관리).
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

const LIB_EMPTY: LibraryDoc = { category: null, name: "", url: null, validUntil: null, note: null };
const libRow = (d: LibraryDoc) => ({ 구분: d.category, 서류명: d.name, "발급처·링크": d.url, 만료일: dateStr(d.validUntil), 비고: d.note });

export default function LibraryPage() {
  const { data } = useDataCtx();
  const { getByPattern, loadFolder, refresh, uploading, error } = useAgreementFiles();
  const fileRef = useRef<HTMLInputElement>(null);

  // 사내보관함 파일 목록을 새로 읽는다(업로드 직후 반영)
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const cols: Col<LibraryDoc>[] = [
    { key: "category", label: "구분", view: (d) => (d.category ? <Badge tone="blue">{d.category}</Badge> : "—") },
    {
      key: "name", label: "서류명", span: true,
      view: (d) => {
        const doc = getByPattern(d.name, "refdoc");
        const label = <span className="font-medium">{d.name}</span>;
        return doc ? <DocViewButton doc={doc} label={label} /> : label;
      },
    },
    { key: "validUntil", label: "만료일", type: "date", th: "만료일", nowrap: true, view: (d) => (d.validUntil ? <Dday days={daysUntil(d.validUntil)} /> : "—") },
    { key: "url", label: "링크(URL)", th: "링크", view: (d) => (d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">열기 ↗</a> : "—") },
    { key: "note", label: "비고", span: true, hide: true },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">자료실</h1>
        <p className="mt-1 text-sm text-slate-500">발급처 바로가기 · 사내 보관함(파일·링크·만료일). (특허증은 특허 탭, 협약서는 과제 상세에서 확인)</p>
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

      <Section title="🗂 사내 보관함" sub="파일(라이선스·인증서 등)을 올리면 서류명 클릭으로 열람. 만료일을 입력하면 D-day로 표시됩니다. 파일명에 서류명을 넣으면 자동 연결.">
        {data ? (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-xs text-emerald-800">📎 사내 보관 파일 업로드(PDF·이미지·문서). 서류명과 파일명이 같으면 &apos;서류명&apos; 클릭 시 열립니다.</p>
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="ml-auto rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {uploading ? "업로드 중…" : "파일 업로드"}
              </button>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && loadFolder(e.target.files, "refdoc")} />
            </div>
            {error && <p className="mb-2 text-sm font-medium text-red-600">⚠ {error}</p>}
            <EditableTable rows={data.library} cols={cols} sheetName="자료실" toSheetRow={libRow} blank={LIB_EMPTY} requiredKey="name" addLabel="자료 추가" entityLabel="자료" emptyMessage="등록된 자료가 없습니다. '자료 추가'로 등록하거나 파일을 업로드하세요." />
          </>
        ) : (
          <Empty message="로그인하면 사내 보관함을 편집할 수 있습니다." />
        )}
      </Section>
    </div>
  );
}
