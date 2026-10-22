"use client";

import { useEffect, useState } from "react";
import { EditableTable, dateStr, type Col } from "@/components/EditableTable";
import { fmtKWon, fmtDate, type Data, type Project, type BudgetItem, type BudgetUsage } from "@/lib/excel";

const won = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("ko-KR"));

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

/**
 * 한 과제의 사업비 상세(비목·사용내역·부가세 복원). 사업비 현황 페이지와 과제 상세 탭에서 공용.
 * showSummary=true면 상단에 총사업금액/기간/기관/역할 요약 그리드를 함께 표시한다.
 */
export function ProjectBudget({ data, p, showSummary = false }: { data: Data; p: Project; showSummary?: boolean }) {
  const [showRestore, setShowRestore] = useState(false);
  const [showUsage, setShowUsage] = useState(false); // true면 전체보기(일자순)
  const [selCat, setSelCat] = useState<string | null>(null); // 선택한 비목(비목별 입력)
  useEffect(() => { setShowRestore(false); setShowUsage(false); setSelCat(null); }, [p.code]);

  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  // 모두 '원' 단위. 집행액은 공급가만(부가세 제외).
  const usedWon = (cat: string) =>
    data.budgetUsages.filter((u) => u.code === p.code && u.category === cat).reduce((s, u) => s + (u.amountKWon ?? 0), 0);

  const items = data.budgetItems.filter((b) => b.code === p.code);
  const isInKind = (cat: string) => (cat ?? "").includes("현물");
  const tot = items.reduce(
    (a, b) => {
      const fin = b.finalKWon ?? 0;
      const kind = isInKind(b.category);
      return {
        plan: a.plan + (b.planKWon ?? 0),
        final: a.final + fin,
        exec: a.exec + usedWon(b.category),
        inKind: a.inKind + (kind ? fin : 0), // 현물(비집행) 최종변경 기준
        cashFinal: a.cashFinal + (kind ? 0 : fin), // 현금 집행대상
      };
    },
    { plan: 0, final: 0, exec: 0, inKind: 0, cashFinal: 0 },
  );
  const execBase = tot.inKind > 0 ? tot.cashFinal : tot.final; // 집행율 분모(현물 제외)

  // 부가세 복원: 사용내역 부가세 합(복원대상) - 복원내역 합(복원완료)
  const RESTORE_CAT = "부가세복원";
  const vatToRestore = data.budgetUsages.filter((u) => u.code === p.code && u.category !== RESTORE_CAT).reduce((s, u) => s + (u.vatKWon ?? 0), 0);
  const vatRestored = data.budgetUsages.filter((u) => u.code === p.code && u.category === RESTORE_CAT).reduce((s, u) => s + (u.amountKWon ?? 0), 0);
  const vatOutstanding = vatToRestore - vatRestored;
  const restoreCount = data.budgetUsages.filter((u) => u.code === p.code && u.category === RESTORE_CAT).length;

  const BUDGET_COLS: Col<BudgetItem>[] = [
    { key: "category", label: "비목(세목)", span: true, view: (b) => <span className="font-medium">{b.category}</span> },
    { key: "planKWon", label: "최초계획금액(원)", type: "money", align: "center", th: "최초계획", nowrap: true, view: (b) => won(b.planKWon) },
    { key: "finalKWon", label: "최종변경금액(원)", type: "money", align: "center", th: "최종변경", nowrap: true, view: (b) => won(b.finalKWon) },
    { key: "execKWon", label: "집행", th: "집행", align: "center", nowrap: true, editable: false, view: (b) => won(usedWon(b.category)) },
    {
      key: "note", label: "비고", th: "잔액(집행율)", align: "center", nowrap: true, editable: false,
      view: (b) => {
        const f = b.finalKWon ?? 0, e = usedWon(b.category);
        const rate = f ? (e / f) * 100 : 0;
        return <span className="text-xs">{won(f - e)}{f ? <span className={rate > 100 ? "ml-1 font-semibold text-red-600" : "ml-1 text-slate-400"}>({rate.toFixed(0)}%)</span> : null}</span>;
      },
    },
  ];
  const budgetRow = (b: BudgetItem) => ({ 과제코드: b.code, 비목: b.category, 최초계획금액: b.planKWon, 최종변경금액: b.finalKWon, 집행금액: b.execKWon, 비고: b.note });

  // 여비 등 부가세 없는 비목: 부가세 0, 총액=공급가
  const noVat = (cat?: string | null) => (cat ?? "").includes("여비");
  const USAGE_COLS: Col<BudgetUsage>[] = [
    { key: "usedAt", label: "집행일", type: "date", nowrap: true },
    { key: "desc", label: "적요(사용내역)", span: true },
    { key: "payee", label: "거래처(지급처)", th: "거래처", nowrap: true, view: (u) => u.payee ?? "—" },
    {
      key: "amountKWon", label: "공급가액(원) — 입력하면 부가세·총액 자동", type: "money", align: "center", th: "공급가", nowrap: true, placeholder: "공급가 입력",
      view: (u) => won(u.amountKWon),
      derive: (v, r) => { if (v == null) return { vatKWon: null, grossKWon: null }; const a = Number(v) || 0; const vat = noVat(r.category) ? 0 : Math.round(a * 0.1); return { vatKWon: vat, grossKWon: a + vat }; },
    },
    {
      key: "vatKWon", label: "부가세(원) — 0도 직접 입력 가능", type: "money", align: "center", th: "부가세", nowrap: true, placeholder: "부가세 입력",
      view: (u) => won(u.vatKWon),
      derive: (v, r) => {
        if (noVat(r.category)) return { vatKWon: 0, grossKWon: r.amountKWon ?? null };
        if (v == null) return { grossKWon: r.amountKWon ?? null };
        const vat = Number(v) || 0;
        if (r.amountKWon != null) return { grossKWon: (Number(r.amountKWon) || 0) + vat };
        return vat ? { amountKWon: vat * 10, grossKWon: vat * 11 } : { amountKWon: null, grossKWon: null };
      },
    },
    {
      key: "grossKWon", label: "총액(원) — 입력하면 공급가·부가세 자동", type: "money", align: "center", th: "총액", nowrap: true, placeholder: "총액 입력",
      view: (u) => won(u.grossKWon ?? ((u.amountKWon ?? 0) + (u.vatKWon ?? 0))),
      derive: (v, r) => { if (v == null) return { vatKWon: null, amountKWon: null }; const g = Number(v) || 0; if (noVat(r.category)) return { vatKWon: 0, amountKWon: g }; const vat = Math.round(g / 11); return { vatKWon: vat, amountKWon: g - vat }; },
    },
  ];
  const usageRow = (u: BudgetUsage) => ({ 과제코드: u.code, 비목: u.category, 집행일: dateStr(u.usedAt), 적요: u.desc, 거래처: u.payee, "총액(원)": u.grossKWon ?? ((u.amountKWon ?? 0) + (u.vatKWon ?? 0)), "금액(원)": u.amountKWon, "부가세(원)": u.vatKWon, 비고: u.note });

  // 전체보기용 컬럼 — 비목(세목) 열 추가 (비목별 선택 없이 전체를 일자순으로)
  const ALL_USAGE_COLS: Col<BudgetUsage>[] = [
    USAGE_COLS[0],
    { key: "category", label: "비목", type: "select", options: items.map((b) => b.category).filter(Boolean) as string[], th: "비목", nowrap: true, view: (u) => <span className="font-medium text-slate-600">{u.category}</span> },
    ...USAGE_COLS.slice(1),
  ];

  // 부가세 복원 내역 입력 컬럼 (복원일·적요·복원액)
  const RESTORE_COLS: Col<BudgetUsage>[] = [
    { key: "usedAt", label: "복원일", type: "date", nowrap: true },
    { key: "desc", label: "적요(복원 내역)", span: true },
    { key: "amountKWon", label: "복원액(원)", type: "money", align: "center", th: "복원액", nowrap: true, placeholder: "복원액 입력", view: (u) => won(u.amountKWon) },
    { key: "note", label: "비고", span: true, hide: true },
  ];

  if (items.length === 0 && data.budgetUsages.filter((u) => u.code === p.code).length === 0) {
    return <p className="text-sm text-slate-400">이 과제의 사업비 내역이 없습니다. &apos;비목 추가&apos;로 비목을 등록하면 사용내역을 입력할 수 있습니다.</p>;
  }

  return (
    <div className="space-y-4">
      {showSummary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Info label="총사업금액" value={fmtKWon(p.totalKWon)} />
          <Info label="사업기간" value={p.period ?? (p.startDate && p.endDate ? `${fmtDate(p.startDate)} ~ ${fmtDate(p.endDate)}` : "—")} />
          <Info label="지원기관" value={p.agency ?? "—"} />
          <Info label="역할" value={p.role ?? "—"} />
        </div>
      )}

      <EditableTable
        rows={data.budgetItems} rowFilter={(b) => b.code === p.code} cols={BUDGET_COLS} editColumn
        onRowClick={(b) => { if (b.category && !isInKind(b.category)) { setSelCat(b.category); setShowUsage(false); } }}
        sheetName="사업비" toSheetRow={budgetRow} blank={{ code: p.code, category: "", planKWon: null, finalKWon: null, execKWon: null, note: null }}
        requiredKey="category" addLabel="비목 추가" entityLabel="비목"
        emptyMessage="등록된 비목이 없습니다. '비목 추가'로 세목을 등록하세요."
      />

      <div className={`grid grid-cols-2 gap-3 ${tot.inKind > 0 ? "sm:grid-cols-3 lg:grid-cols-5" : "sm:grid-cols-4"}`}>
        <Info label="최초계획 합계" value={`${won(tot.plan)}원`} />
        <Info label="최종변경 합계" value={`${won(tot.final)}원`} />
        {tot.inKind > 0 && <Info label="↳ 현물(비집행)" value={`${won(tot.inKind)}원`} />}
        <Info label="집행 합계(공급가)" value={`${won(tot.exec)}원`} />
        <Info label={tot.inKind > 0 ? "잔액 (현금 집행율)" : "잔액 (집행율)"} value={`${won(execBase - tot.exec)}원${execBase ? ` (${((tot.exec / execBase) * 100).toFixed(0)}%)` : ""}`} />
      </div>
      {tot.inKind > 0 && (
        <p className="text-[11px] text-slate-400">※ 현물(비집행) {won(tot.inKind)}원은 현금 집행 대상이 아니므로 집행율 계산(현금 집행대상 {won(tot.cashFinal)}원)에서 제외됩니다.</p>
      )}

      {/* 사용내역 — 비목별 입력 + 일자별 전체보기 */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-700">📋 사용내역 — 집행(공급가) {won(tot.exec)}원</p>
          <div className="ml-auto flex flex-wrap items-center gap-1">
            {items.filter((b) => b.category && !isInKind(b.category)).map((b) => {
              const on = !showUsage && selCat === b.category;
              return (
                <button key={b.category} onClick={() => { setSelCat(b.category); setShowUsage(false); }}
                  className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${on ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  {b.category}
                </button>
              );
            })}
            <button onClick={() => { setShowUsage(true); setSelCat(null); }}
              className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${showUsage ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}>
              전체보기 (일자순)
            </button>
            {(showUsage || selCat) && (
              <button onClick={() => { setShowUsage(false); setSelCat(null); }}
                className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 hover:bg-slate-50">
                접기 ▲
              </button>
            )}
          </div>
        </div>

        {showUsage ? (
          <EditableTable
            rows={data.budgetUsages} rowFilter={(u) => u.code === p.code && u.category !== RESTORE_CAT} cols={ALL_USAGE_COLS}
            sort={(a, b) => +(a.usedAt ?? 0) - +(b.usedAt ?? 0)}
            sheetName="사업비사용내역" toSheetRow={usageRow} blank={{ code: p.code, category: "", usedAt: todayUTC, desc: null, payee: null, amountKWon: null, vatKWon: null, grossKWon: null, note: null }}
            requiredKey="category" addLabel="사용내역 추가" entityLabel="사용내역"
            emptyMessage="사용내역이 없습니다. 위 비목 탭을 선택해 입력하세요."
          />
        ) : selCat ? (
          <EditableTable
            rows={data.budgetUsages} rowFilter={(u) => u.code === p.code && u.category === selCat} cols={USAGE_COLS}
            sort={(a, b) => +(a.usedAt ?? 0) - +(b.usedAt ?? 0)}
            sheetName="사업비사용내역" toSheetRow={usageRow} blank={{ code: p.code, category: selCat, usedAt: todayUTC, desc: null, payee: null, amountKWon: null, vatKWon: null, grossKWon: null, note: null }}
            requiredKey="category" addLabel={`${selCat} 사용내역 추가`} entityLabel="사용내역"
            emptyMessage={`'${selCat}' 사용내역이 없습니다. '${selCat} 사용내역 추가'로 기록하세요.`}
          />
        ) : (
          <p className="py-5 text-center text-sm text-slate-400">위 표에서 비목을 클릭하거나 위 탭에서 선택하면 해당 비목의 사용내역을 입력할 수 있습니다. · [전체보기 (일자순)]로 전체를 날짜순으로 확인하세요.</p>
        )}

        <p className="mt-2 text-[11px] text-slate-400">※ 비목별로 입력한 내역이 [전체보기 (일자순)]에서 집행일 순으로 정리됩니다. 부가세는 집행액에서 제외되고 공급가만 반영됩니다.</p>
      </div>

      {/* 부가세 복원 */}
      <div className={`rounded-xl border px-4 py-3 ${vatOutstanding > 0 ? "border-red-200 bg-red-50/50" : "border-slate-200 bg-slate-50"}`}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-sm font-semibold text-slate-700">💳 부가세 복원</span>
          <span className="text-xs text-slate-500">복원대상 <b className="text-slate-700">{won(vatToRestore)}원</b> · 복원완료 <b className="text-slate-700">{won(vatRestored)}원</b></span>
          <button onClick={() => setShowRestore((v) => !v)} className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50">
            {showRestore ? "접기 ▲" : `복원 내역 전체보기 (${restoreCount}건) ▼`}
          </button>
          <span className="ml-auto text-sm font-bold">
            미복원{" "}
            {vatOutstanding > 0 ? <span className="text-red-600">{won(vatOutstanding)}원</span> : <span className="text-emerald-600">0원 ✓</span>}
          </span>
        </div>
        {showRestore && (
          <div className="mt-3">
            <EditableTable
              rows={data.budgetUsages} rowFilter={(u) => u.code === p.code && u.category === RESTORE_CAT} cols={RESTORE_COLS}
              sort={(a, b) => +(a.usedAt ?? 0) - +(b.usedAt ?? 0)}
              sheetName="사업비사용내역" toSheetRow={usageRow} blank={{ code: p.code, category: RESTORE_CAT, usedAt: todayUTC, desc: null, payee: null, amountKWon: null, vatKWon: null, grossKWon: null, note: null }}
              requiredKey="code" addLabel="복원 내역 추가" entityLabel="복원 내역"
              emptyMessage="복원 내역이 없습니다. 부가세를 사업비 계좌로 복원하면 '복원 내역 추가'로 기록하세요."
            />
            <p className="mt-2 text-[11px] text-slate-400">※ 사용내역의 부가세 합계만큼 사업비 계좌로 복원해야 하며, 복원 내역을 입력하면 미복원 금액이 0원이 됩니다. (복원일 순 정렬)</p>
          </div>
        )}
      </div>
    </div>
  );
}
