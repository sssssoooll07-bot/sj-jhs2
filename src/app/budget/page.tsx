"use client";

import { useEffect, useMemo, useState } from "react";
import { WithData } from "@/components/FileGate";
import { Section } from "@/components/ui";
import { useAgreementFiles } from "@/lib/agreement-files";
import { useDataCtx } from "@/lib/data-context";
import DocViewButton from "@/components/DocViewButton";
import { fmtKWon, fmtDate, type Data } from "@/lib/excel";

// 비목(세목) — 직접비 7종 + 간접비
const DIRECT = ["인건비", "학생인건비", "연구시설·장비 및 재료비", "연구활동비", "연구과제추진비", "위탁사업비", "연구수당"];
const ALL_ITEMS = [...DIRECT, "간접비"];

type Cell = { plan: string; final: string; exec: string };
const EMPTY_CELL: Cell = { plan: "", final: "", exec: "" };
const num = (v: string) => Number(String(v).replace(/,/g, "")) || 0;
const won = (v: number) => v.toLocaleString("ko-KR");

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function BudgetInner({ data }: { data: Data }) {
  const { list } = useAgreementFiles();
  const { saveSheet } = useDataCtx();
  const active = data.projects.filter((p) => p.status === "진행중");
  const [sel, setSel] = useState(0);
  const idx = Math.min(sel, Math.max(active.length - 1, 0));
  const p = active[idx];
  const [edits, setEdits] = useState<Record<string, Cell>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // master 사업비 데이터 → 편집 상태 초기화
  useEffect(() => {
    const m: Record<string, Cell> = {};
    for (const b of data.budgetItems) {
      m[`${b.code}||${b.category}`] = {
        plan: b.planKWon != null ? String(b.planKWon) : "",
        final: b.finalKWon != null ? String(b.finalKWon) : "",
        exec: b.execKWon != null ? String(b.execKWon) : "",
      };
    }
    setEdits(m);
  }, [data.budgetItems]);

  const template = useMemo(() => list("budget").find((d) => /양식|서식|템플릿/.test(d.name)), [list]);

  const cellOf = (item: string): Cell => (p ? edits[`${p.code}||${item}`] ?? EMPTY_CELL : EMPTY_CELL);
  const setCell = (item: string, patch: Partial<Cell>) => {
    if (!p) return;
    const key = `${p.code}||${item}`;
    setEdits((prev) => ({ ...prev, [key]: { ...(prev[key] ?? EMPTY_CELL), ...patch } }));
  };

  const calc = (item: string) => {
    const c = cellOf(item);
    const plan = num(c.plan), final = num(c.final), exec = num(c.exec);
    return { plan, final, exec, remain: final - exec, rate: final ? (exec / final) * 100 : 0 };
  };
  const sumOf = (items: string[]) =>
    items.reduce((a, it) => { const r = calc(it); a.plan += r.plan; a.final += r.final; a.exec += r.exec; return a; }, { plan: 0, final: 0, exec: 0 });
  const direct = sumOf(DIRECT);
  const indirect = calc("간접비");
  const total = { plan: direct.plan + indirect.plan, final: direct.final + indirect.final, exec: direct.exec + indirect.exec };

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const rows: Record<string, unknown>[] = [];
      for (const pr of active) {
        for (const item of ALL_ITEMS) {
          const c = edits[`${pr.code}||${item}`];
          if (!c) continue;
          const plan = num(c.plan), final = num(c.final), exec = num(c.exec);
          if (!plan && !final && !exec) continue;
          rows.push({ 과제코드: pr.code, 비목: item, 최초계획금액: plan, 최종변경금액: final, 집행금액: exec, 비고: "" });
        }
      }
      await saveSheet("사업비", rows);
      setMsg("저장되었습니다.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const Cellcls = "w-28 rounded-md border border-slate-200 px-2 py-1 text-right text-sm tabular-nums focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300";
  const rateBadge = (rate: number, final: number) =>
    final === 0 ? <span className="text-slate-300">—</span> : <span className={rate > 100 ? "font-semibold text-red-600" : "text-slate-700"}>{rate.toFixed(1)}%</span>;

  const InputRow = ({ item, indent }: { item: string; indent?: boolean }) => {
    const c = cellOf(item);
    const r = calc(item);
    return (
      <tr>
        <td className={`whitespace-nowrap ${indent ? "pl-6 text-slate-600" : "font-semibold text-slate-800"}`}>{indent ? `- ${item}` : item}</td>
        <td className="text-right"><input inputMode="numeric" value={c.plan} onChange={(e) => setCell(item, { plan: e.target.value })} className={Cellcls} placeholder="0" /></td>
        <td className="text-right"><input inputMode="numeric" value={c.final} onChange={(e) => setCell(item, { final: e.target.value })} className={Cellcls} placeholder="0" /></td>
        <td className="text-right"><input inputMode="numeric" value={c.exec} onChange={(e) => setCell(item, { exec: e.target.value })} className={Cellcls} placeholder="0" /></td>
        <td className="text-right tabular-nums text-slate-700">{won(r.remain)}</td>
        <td className="text-right">{rateBadge(r.rate, r.final)}</td>
      </tr>
    );
  };
  const CalcRow = ({ label, s }: { label: string; s: { plan: number; final: number; exec: number } }) => {
    const remain = s.final - s.exec;
    const rate = s.final ? (s.exec / s.final) * 100 : 0;
    return (
      <tr className="bg-slate-50 font-semibold text-slate-900">
        <td className="whitespace-nowrap">{label}</td>
        <td className="text-right tabular-nums">{won(s.plan)}</td>
        <td className="text-right tabular-nums">{won(s.final)}</td>
        <td className="text-right tabular-nums">{won(s.exec)}</td>
        <td className="text-right tabular-nums">{won(remain)}</td>
        <td className="text-right">{rateBadge(rate, s.final)}</td>
      </tr>
    );
  };

  return (
    <div className="space-y-5">
      <Section title="💰 사업비 현황" sub="진행중인 사업을 선택해 비목(세목)별 예산·집행을 입력하세요. 사용잔액·집행율은 자동 계산됩니다. (단위: 원)">
        {template && (
          <div className="mb-3">
            <DocViewButton doc={template} label={<span className="text-xs font-semibold text-emerald-700">📄 정산 양식 보기 ↗</span>} />
          </div>
        )}

        {active.length === 0 ? (
          <p className="text-sm text-slate-400">진행중인 사업이 없습니다.</p>
        ) : (
          <>
            {/* 진행중 사업 탭 */}
            <div className="mb-4 flex flex-wrap gap-1.5">
              {active.map((pr, i) => (
                <button
                  key={pr.code}
                  onClick={() => setSel(i)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    i === idx ? "bg-blue-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {pr.title}
                </button>
              ))}
            </div>

            {p && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Info label="총사업금액" value={fmtKWon(p.totalKWon)} />
                  <Info label="사업기간" value={p.period ?? (p.startDate && p.endDate ? `${fmtDate(p.startDate)} ~ ${fmtDate(p.endDate)}` : "—")} />
                  <Info label="지원기관" value={p.agency ?? "—"} />
                  <Info label="역할" value={p.role ?? "—"} />
                </div>

                <div className="overflow-x-auto">
                  <table className="table-base min-w-[720px]">
                    <thead>
                      <tr>
                        <th className="text-left">비목(세목)</th>
                        <th className="text-right">최초 계획금액(A)</th>
                        <th className="text-right">최종 변경금액(B)</th>
                        <th className="text-right">집행금액(C)</th>
                        <th className="text-right">사용잔액(B−C)</th>
                        <th className="text-right">집행율</th>
                      </tr>
                    </thead>
                    <tbody>
                      <CalcRow label="1. 직접비" s={direct} />
                      {DIRECT.map((it) => <InputRow key={it} item={it} indent />)}
                      <InputRow item="간접비" />
                      <CalcRow label="합계" s={total} />
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={save} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    {saving ? "저장 중…" : "💾 사업비 저장"}
                  </button>
                  {msg && <span className={`text-sm ${msg.includes("저장되었") ? "text-emerald-600" : "text-red-600"}`}>{msg}</span>}
                </div>
              </div>
            )}
          </>
        )}
      </Section>
    </div>
  );
}

export default function BudgetPage() {
  return <WithData>{(data) => <BudgetInner data={data} />}</WithData>;
}
