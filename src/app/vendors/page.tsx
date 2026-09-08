"use client";

import { useMemo, useState } from "react";
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

// 초성 (겹자음은 기본 자음으로 묶음)
const CHO = ["ㄱ", "ㄱ", "ㄴ", "ㄷ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅂ", "ㅅ", "ㅅ", "ㅇ", "ㅈ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const ORDER = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ", "기타"];
const strip = (n: string) => {
  let k = n;
  for (const p of ["주식회사 ", "주식회사", "(주)", "㈜", "(재)", "(유)"]) k = k.split(p).join("");
  return k.trim();
};
function choOf(name: string): string {
  const s = strip(name);
  if (!s) return "기타";
  const c = s.charCodeAt(0);
  if (c >= 0xac00 && c <= 0xd7a3) return CHO[Math.floor((c - 0xac00) / 588)];
  return "기타";
}

function VendorsInner({ data }: { data: Data }) {
  const [cho, setCho] = useState("전체");
  const groups = useMemo(() => {
    const present = new Set(data.vendors.map((v) => choOf(v.name)));
    return ["전체", ...ORDER.filter((g) => present.has(g))];
  }, [data.vendors]);
  const shown = cho === "전체" ? data.vendors.length : data.vendors.filter((v) => choOf(v.name) === cho).length;

  return (
    <div className="space-y-5">
      <Section title={`🏢 거래처 — ${shown}곳${cho === "전체" ? "" : ` (${cho})`}`} sub="세금계산서 기준 거래처 · 초성으로 나눠 보기 · 행을 클릭해 수정, '거래처 추가'로 등록">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {groups.map((g) => (
            <button key={g} onClick={() => setCho(g)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${cho === g ? "bg-blue-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
              {g}
            </button>
          ))}
        </div>
        <EditableTable
          rows={data.vendors}
          rowFilter={(v) => cho === "전체" || choOf(v.name) === cho}
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
