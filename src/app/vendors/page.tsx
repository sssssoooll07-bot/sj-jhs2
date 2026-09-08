"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { WithData } from "@/components/FileGate";
import { Section } from "@/components/ui";
import { EditableTable, type Col } from "@/components/EditableTable";
import type { Data, Vendor } from "@/lib/excel";

const COLS: Col<Vendor>[] = [
  { key: "name", label: "거래처명", span: true, view: (v) => <span className="font-medium text-slate-800">{v.name}</span> },
  { key: "bizNo", label: "사업자등록번호", th: "사업자등록번호", nowrap: true, align: "center", view: (v) => v.bizNo ?? "—" },
  { key: "ceo", label: "대표자", th: "대표자", nowrap: true, align: "center", view: (v) => v.ceo ?? "—" },
  { key: "note", label: "주소", th: "주소", view: (v) => <span className="text-xs text-slate-500">{v.note ?? "—"}</span> },
];
const toRow = (v: Vendor) => ({ 거래처명: v.name, 사업자등록번호: v.bizNo, 대표자: v.ceo, 주소: v.note });
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
  const [cho, setCho] = useState("ㄱ");
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const groups = useMemo(() => {
    const present = new Set(data.vendors.map((v) => choOf(v.name)));
    return ["전체", ...ORDER.filter((g) => present.has(g))];
  }, [data.vendors]);

  // 검색어가 있으면 전체에서 검색(초성 필터 무시), 없으면 초성 필터
  const rowFilter = (v: Vendor) => {
    if (query) {
      return [v.name, v.bizNo, v.ceo, v.note].some((f) => (f ?? "").toLowerCase().includes(query));
    }
    return cho === "전체" || choOf(v.name) === cho;
  };
  const shown = data.vendors.filter(rowFilter).length;

  return (
    <div className="space-y-5">
      <Section title={`🏢 거래처 — ${shown}곳${query ? " (검색)" : cho === "전체" ? "" : ` (${cho})`}`} sub="세금계산서 기준 거래처 · 초성/검색으로 찾기 · 행을 클릭해 수정, '거래처 추가'로 등록">
        <div className="mb-3 space-y-2.5">
          <div className="relative max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="거래처명·사업자번호·대표자·주소 검색"
              className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-8 text-sm focus:border-blue-400 focus:outline-none"
            />
            {q && <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="지우기">✕</button>}
          </div>
          <div className={`flex flex-wrap gap-1.5 ${query ? "opacity-40" : ""}`}>
            {groups.map((g) => (
              <button key={g} onClick={() => { setQ(""); setCho(g); }}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${!query && cho === g ? "bg-blue-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                {g}
              </button>
            ))}
          </div>
        </div>
        <EditableTable
          rows={data.vendors}
          rowFilter={rowFilter}
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
