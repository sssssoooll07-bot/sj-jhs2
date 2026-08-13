"use client";

import { fmtDate, daysUntil } from "@/lib/excel";
import { Badge, Dday, Section } from "@/components/ui";
import { WithData } from "@/components/FileGate";
import { EditableTable, dateStr, type Col } from "@/components/EditableTable";
import type { Certification } from "@/lib/excel";

const CAT_TONE: Record<string, "blue" | "amber" | "violet"> = { 인증: "blue", "면허·등록": "amber", "표창·수상": "violet" };

const EMPTY: Certification = {
  year: "", name: "", category: "인증", renewable: false, validUntil: null, renewalDue: null,
  rndRelated: false, issuer: null, certNo: null, status: null, note: null,
};

const COLS: Col<Certification>[] = [
  { key: "year", label: "획득연도", th: "연도" },
  { key: "name", label: "명칭", span: true },
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

const toRow = (c: Certification) => ({
  획득연도: c.year, 명칭: c.name, 구분: c.category, 갱신대상: c.renewable ? "Y" : "N",
  "유효기간 만료일": dateStr(c.validUntil), "갱신 마감일": dateStr(c.renewalDue),
  연구소관련: c.rndRelated ? "Y" : "N", 발급기관: c.issuer, 인증번호: c.certNo, 상태: c.status, 비고: c.note,
});

export default function CertificationsPage() {
  return (
    <WithData>
      {(data) => (
        <Section title={`🏅 인증 · 면허 · 표창 — ${data.certifications.length}건`} sub="갱신형은 '갱신 대상'을 켜고 갱신 마감일을 입력하면 D-day가 표시됩니다.">
          <EditableTable
            rows={data.certifications}
            cols={COLS}
            sheetName="인증"
            toSheetRow={toRow}
            blank={EMPTY}
            requiredKey="name"
            addLabel="인증 추가"
            entityLabel="인증"
          />
        </Section>
      )}
    </WithData>
  );
}
