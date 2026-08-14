"use client";

import { useRef, useState } from "react";
import { StatusBadge, Badge, Section } from "@/components/ui";
import { WithData } from "@/components/FileGate";
import { useAgreementFiles } from "@/lib/agreement-files";
import { EditableTable, dateStr, type Col } from "@/components/EditableTable";
import DocViewButton from "@/components/DocViewButton";
import type { Patent } from "@/lib/excel";

const EMPTY: Patent = {
  status: "출원중", title: "", regNumber: null, appNumber: null, filedAt: null, registeredAt: null,
  owner: "㈜신정개발", inventors: null, claims: null, citations: null, isPCT: false,
  examStatus: null, note: null, projectCode: null,
};
// 연계과제코드는 저장에서 제외(열 삭제)
const toRow = (p: Patent) => ({
  상태: p.status, 특허명칭: p.title, 등록번호: p.regNumber, 출원번호: p.appNumber,
  출원일: dateStr(p.filedAt), 등록일: dateStr(p.registeredAt), 특허권자: p.owner, 발명자: p.inventors,
  청구항수: p.claims, 피인용: p.citations, PCT: p.isPCT ? "Y" : "N",
  "진행상태(출원건)": p.examStatus, "연계사업(비고)": p.note,
});
const norm = (s: string) => s.replace(/[\s()·∙\-_]/g, "").toLowerCase();

/** 특허 연도 — 출원일 우선, 없으면 등록일, 없으면 출원/등록번호의 4자리 연도 */
const patentYear = (p: Patent): string => {
  const d = p.filedAt ?? p.registeredAt;
  if (d) return String(d.getUTCFullYear());
  const m = (p.appNumber ?? p.regNumber ?? "").match(/(20\d{2})/);
  return m ? m[1] : "기타";
};

export default function PatentsPage() {
  const { count, cloud, uploading, error, loadFolder, getByPattern } = useAgreementFiles();
  const certRef = useRef<HTMLInputElement>(null);
  const [year, setYear] = useState("전체");

  const findCert = (p: Patent) => {
    const byNum = p.regNumber ? getByPattern(p.regNumber, "patents") : null;
    if (byNum) return byNum;
    const prefix = norm(p.title).slice(0, 5);
    return prefix.length >= 4 ? getByPattern(prefix, "patents") : null;
  };

  const cols: Col<Patent>[] = [
    { key: "status", label: "상태", type: "select", options: ["등록완료", "출원중"], view: (p) => <StatusBadge status={p.status} /> },
    {
      key: "title", label: "특허 명칭", span: true,
      view: (p) => {
        const cert = findCert(p);
        const name = <>{p.title} {p.isPCT && <Badge tone="cyan">PCT</Badge>}</>;
        return cert ? <DocViewButton doc={cert} label={name} /> : <span className="font-medium">{name}</span>;
      },
    },
    { key: "regNumber", label: "등록번호" },
    { key: "appNumber", label: "출원번호" },
    { key: "filedAt", label: "출원일", type: "date" },
    { key: "registeredAt", label: "등록일", type: "date" },
    { key: "note", label: "연계사업(비고)", th: "연계사업", span: true, view: (p) => (p.note ? <Badge tone="blue">{p.note}</Badge> : "—") },
    { key: "owner", label: "특허권자", hide: true },
    { key: "inventors", label: "발명자", span: true, hide: true },
    { key: "claims", label: "청구항수", type: "number", align: "right", hide: true },
    { key: "citations", label: "피인용", type: "number", align: "right", hide: true },
    { key: "isPCT", label: "PCT 국제출원", type: "toggle", hide: true },
    { key: "examStatus", label: "진행상태(출원중)", hide: true },
  ];

  return (
    <WithData>
      {(data) => {
        const years = ["전체", ...Array.from(new Set(data.patents.map(patentYear))).sort().reverse()];
        const inYear = (p: Patent) => year === "전체" || patentYear(p) === year;
        const reg = data.patents.filter((p) => p.status === "등록완료").length;
        const filed = data.patents.filter((p) => p.status === "출원중").length;
        const shown = data.patents.filter(inYear).length;

        return (
          <Section title={`💡 특허 — ${shown}건${year !== "전체" ? ` (${year}년)` : ` (등록 ${reg} · 출원 ${filed})`}`} sub="행의 특허증 '보기 ↗'로 등록증 미리보기. ✎로 수정(연계사업 포함), '특허 추가'로 등록.">
            {/* 연도 필터 (과제탭과 동일) */}
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-semibold text-slate-400">연도</span>
              {years.map((y) => (
                <button key={y} onClick={() => setYear(y)} className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${year === y ? "bg-blue-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  {y === "전체" ? "전체" : `${y}년`}
                </button>
              ))}
              <a href="https://www.kipris.or.kr/khome/search/searchResult.do?tab=patent" target="_blank" rel="noreferrer" className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50">
                🔍 KIPRIS 특허검색 ↗
              </a>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-xs text-emerald-800">🏅 특허증은 파일명에 <b>등록번호</b>(예: 10-2693397) 또는 특허명이 들어가면 자동 연결됩니다{cloud ? ` · ${count}건 로드됨` : ""}. 로그인 사용자만 열람.</p>
              <button onClick={() => certRef.current?.click()} disabled={uploading} className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {uploading ? "업로드 중…" : "특허증 폴더 업로드"}
              </button>
              <input ref={certRef} type="file"
                // @ts-expect-error webkitdirectory는 표준 타입에 없음
                webkitdirectory="" directory="" multiple className="hidden"
                onChange={(e) => e.target.files && loadFolder(e.target.files, "patents")} />
            </div>
            {error && <p className="mb-2 text-sm font-medium text-red-600">⚠ {error}</p>}

            <EditableTable rows={data.patents} rowFilter={inYear} cols={cols} sheetName="특허" toSheetRow={toRow} blank={EMPTY} requiredKey="title" addLabel="특허 추가" entityLabel="특허" />
          </Section>
        );
      }}
    </WithData>
  );
}
