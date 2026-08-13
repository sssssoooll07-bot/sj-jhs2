"use client";

import { StatusBadge, Badge, Section } from "@/components/ui";
import { WithData } from "@/components/FileGate";
import { EditableTable, dateStr, type Col } from "@/components/EditableTable";
import type { Patent } from "@/lib/excel";

const EMPTY: Patent = {
  status: "출원중", title: "", regNumber: null, appNumber: null, filedAt: null, registeredAt: null,
  owner: "㈜신정개발", inventors: null, claims: null, citations: null, isPCT: false,
  examStatus: null, note: null, projectCode: null,
};

const COLS: Col<Patent>[] = [
  { key: "status", label: "상태", type: "select", options: ["등록완료", "출원중"], view: (p) => <StatusBadge status={p.status} /> },
  { key: "title", label: "특허 명칭", span: true, view: (p) => <span className="font-medium">{p.title} {p.isPCT && <Badge tone="cyan">PCT</Badge>}</span> },
  { key: "regNumber", label: "등록번호" },
  { key: "registeredAt", label: "등록일", type: "date" },
  { key: "owner", label: "특허권자" },
  { key: "inventors", label: "발명자", span: true },
  { key: "appNumber", label: "출원번호", hide: true },
  { key: "filedAt", label: "출원일", type: "date", hide: true },
  { key: "claims", label: "청구항수", type: "number", align: "right", hide: true },
  { key: "citations", label: "피인용", type: "number", align: "right", hide: true },
  { key: "isPCT", label: "PCT 국제출원", type: "toggle", hide: true },
  { key: "examStatus", label: "진행상태(출원중)", hide: true },
  { key: "projectCode", label: "연계 과제코드", hide: true },
  { key: "note", label: "연계사업(비고)", span: true, hide: true },
];

const toRow = (p: Patent) => ({
  상태: p.status, 특허명칭: p.title, 등록번호: p.regNumber, 출원번호: p.appNumber,
  출원일: dateStr(p.filedAt), 등록일: dateStr(p.registeredAt), 특허권자: p.owner, 발명자: p.inventors,
  청구항수: p.claims, 피인용: p.citations, PCT: p.isPCT ? "Y" : "N",
  "진행상태(출원건)": p.examStatus, "연계사업(비고)": p.note, 연계과제코드: p.projectCode,
});

export default function PatentsPage() {
  return (
    <WithData>
      {(data) => {
        const reg = data.patents.filter((p) => p.status === "등록완료").length;
        const filed = data.patents.filter((p) => p.status === "출원중").length;
        return (
          <Section title={`💡 특허 — 총 ${data.patents.length}건 (등록 ${reg} · 출원 ${filed})`} sub="행의 ✎로 수정, '특허 추가'로 등록. 상세 항목(출원번호·청구항 등)은 수정 창에서 입력합니다.">
            <EditableTable
              rows={data.patents}
              cols={COLS}
              sheetName="특허"
              toSheetRow={toRow}
              blank={EMPTY}
              requiredKey="title"
              addLabel="특허 추가"
              entityLabel="특허"
            />
          </Section>
        );
      }}
    </WithData>
  );
}
