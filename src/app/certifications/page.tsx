"use client";

import { useEffect, useRef, useState } from "react";
import { fmtDate, daysUntil, type Data, type Certification } from "@/lib/excel";
import { Badge, Dday, Section } from "@/components/ui";
import { WithData } from "@/components/FileGate";
import { useAgreementFiles } from "@/lib/agreement-files";
import DocViewButton from "@/components/DocViewButton";
import { EditableTable, dateStr, type Col } from "@/components/EditableTable";

const CAT_TONE: Record<string, "blue" | "amber" | "violet"> = { 인증: "blue", "면허·등록": "amber", "표창·수상": "violet" };

const EMPTY: Certification = {
  year: "", name: "", category: "인증", renewable: false, validUntil: null, renewalDue: null,
  rndRelated: false, issuer: null, certNo: null, status: null, note: null,
};

const toRow = (c: Certification) => ({
  획득연도: c.year, 명칭: c.name, 구분: c.category, 갱신대상: c.renewable ? "Y" : "N",
  "유효기간 만료일": dateStr(c.validUntil), "갱신 마감일": dateStr(c.renewalDue),
  연구소관련: c.rndRelated ? "Y" : "N", 발급기관: c.issuer, 인증번호: c.certNo, 상태: c.status, 비고: c.note,
});

const yr = (c: Certification) => String(c.year ?? "").trim();

function CertInner({ data }: { data: Data }) {
  const { getByPattern, loadFolder, uploading, refresh } = useAgreementFiles();
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { void refresh(); }, [refresh]);

  const years = ["전체", ...Array.from(new Set(data.certifications.map(yr).filter(Boolean))).sort((a, b) => b.localeCompare(a))];
  const [year, setYear] = useState("전체"); // 기본: 전체
  const shown = data.certifications.filter((c) => year === "전체" || yr(c) === year).length;

  const cols: Col<Certification>[] = [
    { key: "year", label: "획득연도", th: "연도" },
    {
      key: "name", label: "명칭", span: true,
      view: (c) => {
        const doc = getByPattern(c.name, "cert");
        const label = <span className="font-medium">{c.name}</span>;
        return doc ? <DocViewButton doc={doc} label={label} /> : label;
      },
    },
    { key: "category", label: "구분", type: "select", options: ["인증", "면허·등록", "표창·수상"], view: (c) => <Badge tone={CAT_TONE[c.category] ?? "slate"}>{c.category}</Badge> },
    { key: "renewable", label: "갱신 대상", type: "toggle", view: (c) => (c.renewable ? <Badge tone="amber">갱신</Badge> : "—") },
    { key: "rndRelated", label: "연구소 관련", type: "toggle", view: (c) => (c.rndRelated ? <Badge tone="green">연구소</Badge> : "—") },
    {
      key: "renewalDue", label: "갱신 마감일", type: "date", th: "유효/갱신 마감",
      view: (c) => {
        const due = c.renewalDue ?? c.validUntil;
        return due ? <span className="whitespace-nowrap">{fmtDate(due)} <Dday days={daysUntil(due)} /></span> : "—";
      },
    },
    { key: "validUntil", label: "유효기간 만료일", type: "date", hide: true },
    { key: "issuer", label: "발급기관", hide: true },
    { key: "certNo", label: "인증번호", hide: true },
    { key: "status", label: "상태", hide: true },
    { key: "note", label: "비고", span: true, hide: true },
  ];

  return (
    <Section title={`🏅 인증 · 면허 · 표창 — ${shown}건${year !== "전체" ? ` (${year}년)` : ""}`} sub="갱신형은 '갱신 대상'을 켜고 만료일을 입력하면 D-day가 표시됩니다. 파일명에 명칭을 넣어 업로드하면 명칭 클릭 시 증서가 열립니다.">
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
        <p className="text-xs text-emerald-800">📎 인증서·확인서·표창장 파일 업로드(PDF·이미지). 명칭과 파일명이 같으면 명칭 클릭 시 열립니다.</p>
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="ml-auto rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          {uploading ? "업로드 중…" : "파일 업로드"}
        </button>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && loadFolder(e.target.files, "cert")} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold text-slate-400">연도</span>
        {years.map((y) => (
          <button key={y} onClick={() => setYear(y)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${year === y ? "bg-blue-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
            {y === "전체" ? "전체" : `${y}년`}
          </button>
        ))}
      </div>

      <EditableTable
        rows={data.certifications}
        rowFilter={(c) => year === "전체" || yr(c) === year}
        cols={cols}
        sheetName="인증"
        toSheetRow={toRow}
        blank={EMPTY}
        requiredKey="name"
        addLabel="인증 추가"
        entityLabel="인증"
      />
    </Section>
  );
}

export default function CertificationsPage() {
  return <WithData>{(data) => <CertInner data={data} />}</WithData>;
}
