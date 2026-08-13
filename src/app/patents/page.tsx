"use client";

import { useRef } from "react";
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
const toRow = (p: Patent) => ({
  상태: p.status, 특허명칭: p.title, 등록번호: p.regNumber, 출원번호: p.appNumber,
  출원일: dateStr(p.filedAt), 등록일: dateStr(p.registeredAt), 특허권자: p.owner, 발명자: p.inventors,
  청구항수: p.claims, 피인용: p.citations, PCT: p.isPCT ? "Y" : "N",
  "진행상태(출원건)": p.examStatus, "연계사업(비고)": p.note, 연계과제코드: p.projectCode,
});
const norm = (s: string) => s.replace(/[\s()·∙\-_]/g, "").toLowerCase();

export default function PatentsPage() {
  const { count, cloud, uploading, error, loadFolder, getByPattern } = useAgreementFiles();
  const certRef = useRef<HTMLInputElement>(null);

  // 특허증 매칭: 파일명에 등록번호 포함 → 없으면 특허명 앞부분(정규화 5자)
  const findCert = (p: Patent) => {
    const byNum = p.regNumber ? getByPattern(p.regNumber, "patents") : null;
    if (byNum) return byNum;
    const prefix = norm(p.title).slice(0, 5);
    return prefix.length >= 4 ? getByPattern(prefix, "patents") : null;
  };

  const cols: Col<Patent>[] = [
    { key: "status", label: "상태", type: "select", options: ["등록완료", "출원중"], view: (p) => <StatusBadge status={p.status} /> },
    { key: "title", label: "특허 명칭", span: true, view: (p) => <span className="font-medium">{p.title} {p.isPCT && <Badge tone="cyan">PCT</Badge>}</span> },
    { key: "regNumber", label: "등록번호" },
    { key: "registeredAt", label: "등록일", type: "date" },
    { key: "owner", label: "특허권자" },
    { key: "citations", label: "특허증", th: "특허증", editable: false, view: (p) => <DocViewButton doc={findCert(p)} /> },
    { key: "inventors", label: "발명자", span: true, hide: true },
    { key: "appNumber", label: "출원번호", hide: true },
    { key: "filedAt", label: "출원일", type: "date", hide: true },
    { key: "claims", label: "청구항수", type: "number", align: "right", hide: true },
    { key: "citations", label: "피인용", type: "number", align: "right", hide: true },
    { key: "isPCT", label: "PCT 국제출원", type: "toggle", hide: true },
    { key: "examStatus", label: "진행상태(출원중)", hide: true },
    { key: "projectCode", label: "연계 과제코드", hide: true },
    { key: "note", label: "연계사업(비고)", span: true, hide: true },
  ];

  return (
    <WithData>
      {(data) => {
        const reg = data.patents.filter((p) => p.status === "등록완료").length;
        const filed = data.patents.filter((p) => p.status === "출원중").length;
        return (
          <Section title={`💡 특허 — 총 ${data.patents.length}건 (등록 ${reg} · 출원 ${filed})`} sub="행의 특허증 '보기 ↗'로 등록증 미리보기. ✎로 수정, '특허 추가'로 등록.">
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-xs text-emerald-800">🏅 특허증은 파일명에 <b>등록번호</b>(예: 10-2693397) 또는 특허명이 들어가면 자동 연결됩니다{cloud ? ` · ${count}건 로드됨` : ""}. 로그인 사용자만 열람(다운로드 없이 보기).</p>
              <button onClick={() => certRef.current?.click()} disabled={uploading} className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {uploading ? "업로드 중…" : "특허증 폴더 업로드"}
              </button>
              <input ref={certRef} type="file"
                // @ts-expect-error webkitdirectory는 표준 타입에 없음
                webkitdirectory="" directory="" multiple className="hidden"
                onChange={(e) => e.target.files && loadFolder(e.target.files, "patents")} />
            </div>
            {error && <p className="mb-2 text-sm font-medium text-red-600">⚠ {error}</p>}
            <EditableTable rows={data.patents} cols={cols} sheetName="특허" toSheetRow={toRow} blank={EMPTY} requiredKey="title" addLabel="특허 추가" entityLabel="특허" />
          </Section>
        );
      }}
    </WithData>
  );
}
