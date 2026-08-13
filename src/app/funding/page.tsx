"use client";

import { fmtDate, daysUntil } from "@/lib/excel";
import { StatusBadge, Dday, Section } from "@/components/ui";
import { WithData } from "@/components/FileGate";
import { EditableTable, dateStr, type Col } from "@/components/EditableTable";
import AutoAnnouncements from "@/components/AutoAnnouncements";
import type { Funding } from "@/lib/excel";

const EMPTY: Funding = {
  title: "", agency: "", program: null, announcedAt: null, applyDue: null, scale: null,
  months: null, field: null, eligibility: null, sourceUrl: null, status: "관심", rejectReason: null, note: null,
};

const COLS: Col<Funding>[] = [
  {
    key: "applyDue", label: "신청 마감일", type: "date", th: "마감",
    view: (f) => {
      const active = ["관심", "검토중", "신청준비"].includes(f.status);
      return f.applyDue && active ? <Dday days={daysUntil(f.applyDue)} /> : f.applyDue ? fmtDate(f.applyDue) : "—";
    },
  },
  { key: "title", label: "공고명", span: true, view: (f) => <span className="font-medium">{f.title}</span> },
  { key: "agency", label: "주관/전문기관", th: "주관기관" },
  { key: "scale", label: "지원규모" },
  { key: "field", label: "분야" },
  { key: "status", label: "상태", type: "select", options: ["관심", "검토중", "신청준비", "신청완료", "선정", "탈락"], view: (f) => <StatusBadge status={f.status} /> },
  { key: "sourceUrl", label: "출처 URL", th: "출처", view: (f) => (f.sourceUrl ? <a href={f.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">링크 ↗</a> : "—") },
  { key: "program", label: "프로그램", hide: true },
  { key: "announcedAt", label: "공고일", type: "date", hide: true },
  { key: "months", label: "기간(개월)", type: "number", hide: true },
  { key: "eligibility", label: "자격요건", span: true, hide: true },
  { key: "rejectReason", label: "탈락사유", hide: true },
  { key: "note", label: "비고", span: true, hide: true },
];

const toRow = (f: Funding) => ({
  공고명: f.title, "주관/전문기관": f.agency, 프로그램: f.program, 공고일: dateStr(f.announcedAt),
  "신청 마감일": dateStr(f.applyDue), 지원규모: f.scale, "기간(개월)": f.months, 분야: f.field,
  자격요건: f.eligibility, 출처URL: f.sourceUrl, 상태: f.status, 탈락사유: f.rejectReason, 비고: f.note,
});

export default function FundingPage() {
  return (
    <div className="space-y-5">
      <WithData>
        {(data) => (
          <Section title={`📢 관리 대상 공고 — ${data.funding.length}건`} sub="관심 → 검토중 → 신청준비 → 신청완료 → 선정/탈락. 아래 자동 수집 목록에서 검토할 공고를 '공고 추가'로 등록하세요.">
            <EditableTable
              rows={data.funding}
              cols={COLS}
              sheetName="지원사업공고"
              toSheetRow={toRow}
              blank={EMPTY}
              requiredKey="title"
              addLabel="공고 추가"
              entityLabel="공고"
            />
          </Section>
        )}
      </WithData>
      <AutoAnnouncements />
    </div>
  );
}
