"use client";

import { WithData } from "@/components/FileGate";
import { Section } from "@/components/ui";
import { EditableTable, type Col } from "@/components/EditableTable";
import type { Data, Vendor } from "@/lib/excel";

const COLS: Col<Vendor>[] = [
  { key: "name", label: "거래처명", span: true, view: (v) => <span className="font-medium text-slate-800">{v.name}</span> },
  { key: "bizNo", label: "사업자등록번호", th: "사업자등록번호", nowrap: true, align: "center", view: (v) => v.bizNo ?? "—" },
  { key: "ceo", label: "대표자", th: "대표자", nowrap: true, align: "center", view: (v) => v.ceo ?? "—" },
  { key: "note", label: "비고", th: "비고", nowrap: true, view: (v) => v.note ?? "—" },
];
const toRow = (v: Vendor) => ({ 거래처명: v.name, 사업자등록번호: v.bizNo, 대표자: v.ceo, 비고: v.note });
const EMPTY: Vendor = { name: "", bizNo: null, ceo: null, note: null };

function VendorsInner({ data }: { data: Data }) {
  return (
    <div className="space-y-5">
      <Section title={`🏢 거래처 — ${data.vendors.length}곳`} sub="세금계산서 기준 거래처 목록 · 행을 클릭해 수정, '거래처 추가'로 등록">
        <EditableTable
          rows={data.vendors}
          cols={COLS}
          sheetName="거래처"
          toSheetRow={toRow}
          blank={EMPTY}
          requiredKey="name"
          addLabel="거래처 추가"
          entityLabel="거래처"
          emptyMessage="등록된 거래처가 없습니다. '거래처 추가'로 등록하세요."
        />
      </Section>
    </div>
  );
}

export default function VendorsPage() {
  return <WithData>{(data) => <VendorsInner data={data} />}</WithData>;
}
