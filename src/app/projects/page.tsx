"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { fmtKWon, fmtDate, type Data, type Project, type Phase, type Consortium, type Disbursement, type Agreement } from "@/lib/excel";
import { Badge, Empty, Section, StatusBadge } from "@/components/ui";
import { WithData } from "@/components/FileGate";
import { useAgreementFiles } from "@/lib/agreement-files";
import { EditableTable, dateStr, type Col } from "@/components/EditableTable";
import DocViewButton from "@/components/DocViewButton";

/** 과제코드에서 연도 추출 (P2025-02 → "2025"). 없으면 "기타". */
const yearOf = (code: string) => code.match(/(\d{4})/)?.[1] ?? "기타";

/* ── 과제 [과제] ── */
const EMPTY: Project = {
  code: "", title: "", type: "연구과제", agency: null, period: null, startDate: null, endDate: null,
  totalKWon: null, status: "진행중", role: "주관", company: "신정개발", progress: null, note: null,
  bank: null, account: null, accountHolder: null, vatPaid: false, selfPaid: false, phaseSumKWon: 0, phaseCheck: "—",
};
const COLS: Col<Project>[] = [
  { key: "type", label: "구분 (연구과제=R&D / 지원사업=비R&D)", type: "select", options: ["연구과제", "지원사업"], th: "구분", view: (p) => <Badge tone={p.type === "연구과제" ? "blue" : "violet"}>{p.type === "연구과제" ? "R&D" : "비R&D"}</Badge> },
  { key: "title", label: "과제명", span: true, view: (p) => <span className="font-medium">{p.title}</span> },
  { key: "agency", label: "지원부처/기관", th: "지원기관", nowrap: true },
  { key: "role", label: "역할 (주관/공동)", type: "select", options: ["주관", "공동", "참여"], th: "역할", nowrap: true, view: (p) => (p.role ? <Badge tone={p.role === "주관" ? "blue" : "amber"}>{p.role}</Badge> : "—") },
  { key: "period", label: "총사업기간", th: "사업기간", nowrap: true, view: (p) => <span className="whitespace-nowrap text-xs">{p.period ?? `${fmtDate(p.startDate)} ~ ${fmtDate(p.endDate)}`}</span> },
  { key: "totalKWon", label: "총사업금액(천원)", type: "number", align: "right", th: "총사업금액", nowrap: true, view: (p) => <span className="font-semibold">{fmtKWon(p.totalKWon)}</span> },
  { key: "status", label: "진행상태", type: "select", options: ["진행중", "완료"], nowrap: true, view: (p) => <StatusBadge status={p.status} /> },
  { key: "code", label: "과제코드", hide: true },
  { key: "startDate", label: "시작일", type: "date", hide: true },
  { key: "endDate", label: "종료일", type: "date", hide: true },
  { key: "company", label: "수행사", hide: true },
  { key: "progress", label: "진행사항", span: true, hide: true },
  { key: "note", label: "비고", span: true, hide: true },
  { key: "bank", label: "전용통장 은행", hide: true },
  { key: "account", label: "전용통장 계좌번호", hide: true },
  { key: "accountHolder", label: "예금주", hide: true },
  { key: "vatPaid", label: "부가세 입금완료", type: "toggle", hide: true },
  { key: "selfPaid", label: "자부담(민간부담금) 입금완료", type: "toggle", hide: true },
];
const toRow = (p: Project) => ({
  과제코드: p.code, 과제명: p.title, 구분: p.type, "지원부처/기관": p.agency, 총사업기간: p.period,
  시작일: dateStr(p.startDate), 종료일: dateStr(p.endDate), "총사업금액(천원)": p.totalKWon,
  진행상태: p.status, 역할: p.role, 수행사: p.company, 진행사항: p.progress, 비고: p.note,
  은행명: p.bank, 계좌번호: p.account, 예금주: p.accountHolder,
  부가세입금: p.vatPaid ? "O" : "", 자부담입금: p.selfPaid ? "O" : "",
});

/* ── 차수 ── */
const PHASE_EMPTY: Phase = { code: "", label: null, period: null, govKWon: null, cashKWon: null, inKindKWon: null, totalKWon: 0 };
const PHASE_COLS: Col<Phase>[] = [
  { key: "code", label: "과제코드", hide: true },
  { key: "label", label: "차수" },
  { key: "period", label: "기간" },
  { key: "govKWon", label: "지원금(천원)", type: "number", align: "right", th: "지원금", view: (p) => fmtKWon(p.govKWon) },
  { key: "cashKWon", label: "기업부담-현금(천원)", type: "number", align: "right", th: "현금", view: (p) => fmtKWon(p.cashKWon) },
  { key: "inKindKWon", label: "기업부담-현물(천원)", type: "number", align: "right", th: "현물", view: (p) => fmtKWon(p.inKindKWon) },
];
const phaseRow = (p: Phase) => ({ 과제코드: p.code, 차수: p.label, 기간: p.period, "지원금(천원)": p.govKWon, "기업부담-현금(천원)": p.cashKWon, "기업부담-현물(천원)": p.inKindKWon });

/* ── 참여기관 ── */
const CONS_EMPTY: Consortium = { code: "", name: "", role: null, govKWon: null, cashKWon: null, inKindKWon: null };
const CONS_COLS: Col<Consortium>[] = [
  { key: "code", label: "과제코드", hide: true },
  { key: "name", label: "기관명" },
  { key: "role", label: "역할" },
  { key: "govKWon", label: "지원금(천원)", type: "number", align: "right", th: "지원금", view: (c) => fmtKWon(c.govKWon) },
  { key: "cashKWon", label: "기업부담-현금(천원)", type: "number", align: "right", th: "현금", view: (c) => fmtKWon(c.cashKWon) },
  { key: "inKindKWon", label: "기업부담-현물(천원)", type: "number", align: "right", th: "현물", view: (c) => fmtKWon(c.inKindKWon) },
];
const consRow = (c: Consortium) => ({ 과제코드: c.code, 기관명: c.name, 역할: c.role, "지원금(천원)": c.govKWon, "기업부담-현금(천원)": c.cashKWon, "기업부담-현물(천원)": c.inKindKWon });

/* ── 입금이력 ── */
const DISB_EMPTY: Disbursement = { code: "", paidAt: null, payer: null, amountKWon: null };
const DISB_COLS: Col<Disbursement>[] = [
  { key: "code", label: "과제코드", hide: true },
  { key: "paidAt", label: "입금일", type: "date" },
  { key: "payer", label: "지급업체" },
  { key: "amountKWon", label: "금액(천원)", type: "number", align: "right", th: "금액", view: (d) => fmtKWon(d.amountKWon) },
];
const disbRow = (d: Disbursement) => ({ 과제코드: d.code, 입금일: dateStr(d.paidAt), 지급업체: d.payer, "금액(천원)": d.amountKWon });

/** 전용통장 1건 + 통장거래내역 (상세용) */
function AccountBox({ p }: { p: Project }) {
  const { getByPattern, loadFolder, uploading } = useAgreementFiles();
  const bankRef = useRef<HTMLInputElement>(null);
  const stmt = getByPattern(p.code, "bankbook");
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-3">
        <Info label="은행" value={p.bank} />
        <Info label="계좌번호" value={p.account} mono />
        <Info label="예금주" value={p.accountHolder} />
      </div>
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">부가세 입금
          {p.vatPaid ? <Badge tone="green">완료 ✓</Badge> : <Badge tone="amber">미입금</Badge>}</span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">자부담(민간부담금) 입금
          {p.selfPaid ? <Badge tone="green">완료 ✓</Badge> : <Badge tone="amber">미입금</Badge>}</span>
        <span className="ml-auto text-[11px] text-slate-400">입금 여부는 과제 목록에서 ✎로 체크</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
        <p className="text-xs text-emerald-800">통장거래내역: {stmt ? <DocViewButton doc={stmt} /> : "파일명에 과제코드를 넣어 업로드하면 여기 연결됩니다."}</p>
        <button onClick={() => bankRef.current?.click()} disabled={uploading} className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          {uploading ? "업로드 중…" : "거래내역 업로드"}
        </button>
        <input ref={bankRef} type="file"
          // @ts-expect-error webkitdirectory는 표준 타입에 없음
          webkitdirectory="" directory="" multiple className="hidden"
          onChange={(e) => e.target.files && loadFolder(e.target.files, "bankbook")} />
      </div>
    </div>
  );
}

/** 사업계획서 1건 (상세용) */
function PlanBox({ p }: { p: Project }) {
  const { getByPattern, loadFolder, uploading } = useAgreementFiles();
  const planRef = useRef<HTMLInputElement>(null);
  const doc = getByPattern(p.code, "businessplan");
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
      <p className="text-xs text-indigo-800">사업계획서: {doc ? <DocViewButton doc={doc} /> : "파일명에 과제코드를 넣어 업로드하면 여기 연결됩니다(PDF 권장)."}</p>
      <button onClick={() => planRef.current?.click()} disabled={uploading} className="ml-auto rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
        {uploading ? "업로드 중…" : "사업계획서 업로드"}
      </button>
      <input ref={planRef} type="file"
        // @ts-expect-error webkitdirectory는 표준 타입에 없음
        webkitdirectory="" directory="" multiple className="hidden"
        onChange={(e) => e.target.files && loadFolder(e.target.files, "businessplan")} />
    </div>
  );
}

/** 과제별 협약서 — 정보 추가(추가 전용) + 파일 업로드·연결 보기 */
function AgreementBox({ p, list }: { p: Project; list: Agreement[] }) {
  const { getByName } = useAgreementFiles();
  const cols: Col<Agreement>[] = [
    { key: "program", label: "사업명", span: true, view: (a) => <span className="font-medium">{a.program}</span> },
    { key: "signedAt", label: "협약일", type: "date" },
    { key: "totalKWon", label: "총사업비(천원)", type: "number", align: "right", th: "총사업비", view: (a) => fmtKWon(a.totalKWon) },
    { key: "agency", label: "전문/전담기관", th: "전담기관" },
    { key: "fileName", label: "협약서 파일명(연결)", th: "협약서", view: (a) => <DocViewButton doc={getByName(a.fileName)} /> },
    { key: "code", label: "과제코드", hide: true },
    { key: "note", label: "비고", span: true, hide: true },
  ];
  const toRow = (a: Agreement) => ({ 과제코드: a.code, 사업명: a.program, "협약서 파일명": a.fileName, 협약일: dateStr(a.signedAt), "총사업비(천원)": a.totalKWon, "전문/전담기관": a.agency, 비고: a.note });
  const blank: Agreement = { code: p.code, program: "", fileName: null, signedAt: null, totalKWon: null, agency: null, note: null };
  return (
    <div className="space-y-3">
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">🔒 협약서는 로그인 사용자만 열람합니다(다운로드 없이 보기). &apos;협약서&apos; 열의 링크를 눌러 확인하세요.</p>
      <EditableTable rows={list} rowFilter={(a) => a.code === p.code} cols={cols} sheetName="협약서" toSheetRow={toRow} blank={blank} requiredKey="code" entityLabel="협약서" addOnly readOnly emptyMessage="이 과제의 협약서가 없습니다." />
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-medium text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm text-slate-800 ${mono ? "font-mono" : ""}`}>{value ?? "—"}</p>
    </div>
  );
}

/** 공동기관 사업비 분배 */
function ShareTable({ list, code }: { list: Consortium[]; code: string }) {
  const share = list.filter((c) => c.code === code).map((c) => ({ name: c.name, role: c.role, total: (c.govKWon ?? 0) + (c.cashKWon ?? 0) + (c.inKindKWon ?? 0) }));
  const grand = share.reduce((s, x) => s + x.total, 0);
  if (share.length === 0) return <Empty message="참여기관이 없습니다. 아래 '참여기관'에서 추가하세요." />;
  return (
    <table className="table-base">
      <thead><tr><th>기관</th><th>역할</th><th className="text-right">사업비</th><th className="text-right">비중</th></tr></thead>
      <tbody>
        {share.map((c, i) => (
          <tr key={i}>
            <td>{c.name}</td>
            <td>{c.role ? <Badge tone={c.role === "주관" ? "blue" : "slate"}>{c.role}</Badge> : "—"}</td>
            <td className="text-right font-semibold">{fmtKWon(c.total)}</td>
            <td className="text-right text-xs text-slate-500">{grand > 0 ? `${Math.round((c.total / grand) * 100)}%` : "—"}</td>
          </tr>
        ))}
        <tr className="bg-slate-50 font-bold"><td colSpan={2}>합계</td><td className="text-right">{fmtKWon(grand)}</td><td className="text-right text-xs">100%</td></tr>
      </tbody>
    </table>
  );
}

/** 과제 상세 — 전용통장·사업계획서·사업비 분배·차수·참여기관·입금 */
function ProjectDetail({ data, p, onBack }: { data: Data; p: Project; onBack: () => void }) {
  const { refresh } = useAgreementFiles();
  const only = (code: string) => code === p.code;
  // 과제 상세 진입 시 협약서·사업계획서·통장 목록을 새로 읽는다(업로드 직후 재로그인 없이 반영)
  useEffect(() => { void refresh(); }, [refresh]);
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="btn-ghost"><ArrowLeft className="h-4 w-4" /> 과제 목록</button>

      <Section title={`${p.code} · ${p.title}`} sub={`${p.type} · ${p.agency ?? "—"} · ${p.period ?? `${fmtDate(p.startDate)} ~ ${fmtDate(p.endDate)}`}`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Info label="진행상태" value={p.status} />
          <Info label="총사업금액" value={fmtKWon(p.totalKWon)} />
          <Info label="역할" value={p.role} />
          <Info label="수행사" value={p.company} />
        </div>
        {p.note && <p className="mt-3 text-xs text-slate-500">비고: {p.note}</p>}
      </Section>

      <Section title="💳 전용통장 · 통장거래내역"><AccountBox p={p} /></Section>
      <Section title="📑 사업계획서"><PlanBox p={p} /></Section>
      <Section title="📜 협약서"><AgreementBox p={p} list={data.agreements} /></Section>
      <Section title="🏢 공동기관 사업비 분배" sub="참여기관별 사업비와 비중 자동 계산"><ShareTable list={data.consortium} code={p.code} /></Section>

      <Section title={`📊 차수 — ${data.phases.filter((x) => only(x.code)).length}건`} sub="연차 예산. '차수 추가'로 등록.">
        <EditableTable rows={data.phases} rowFilter={(x) => only(x.code)} cols={PHASE_COLS} sheetName="차수" toSheetRow={phaseRow} blank={{ ...PHASE_EMPTY, code: p.code }} requiredKey="code" addLabel="차수 추가" entityLabel="차수" />
      </Section>
      <Section title={`🏢 참여기관 — ${data.consortium.filter((x) => only(x.code)).length}건`} sub="공동·참여 기관별 사업비.">
        <EditableTable rows={data.consortium} rowFilter={(x) => only(x.code)} cols={CONS_COLS} sheetName="참여기관" toSheetRow={consRow} blank={{ ...CONS_EMPTY, code: p.code }} requiredKey="name" addLabel="참여기관 추가" entityLabel="참여기관" />
      </Section>
      <Section title={`💵 입금이력 — ${data.disbursements.filter((x) => only(x.code)).length}건`} sub="지원금 입금 내역.">
        <EditableTable rows={data.disbursements} rowFilter={(x) => only(x.code)} cols={DISB_COLS} sheetName="입금이력" toSheetRow={disbRow} blank={{ ...DISB_EMPTY, code: p.code }} requiredKey="code" addLabel="입금 추가" entityLabel="입금" />
      </Section>
    </div>
  );
}

export default function ProjectsPage() {
  const [year, setYear] = useState("2026");
  const [roleF, setRoleF] = useState("주관");
  const [sel, setSel] = useState<string | null>(null);

  return (
    <WithData>
      {(data) => {
        const selProject = sel ? data.projects.find((x) => x.code === sel) : null;
        if (selProject) return <ProjectDetail data={data} p={selProject} onBack={() => setSel(null)} />;

        const years = ["전체", ...Array.from(new Set(data.projects.map((p) => yearOf(p.code)))).sort().reverse()];
        const inYear = (code: string) => year === "전체" || yearOf(code) === year;
        const inRole = (r: string | null) => roleF === "전체" || (roleF === "주관" ? r === "주관" : r !== "주관");
        const cnt = data.projects.filter((p) => inYear(p.code) && inRole(p.role)).length;

        return (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs font-semibold text-slate-400">연도</span>
                {years.map((y) => (
                  <button key={y} onClick={() => setYear(y)} className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${year === y ? "bg-blue-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                    {y === "전체" ? "전체" : `${y}년`}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs font-semibold text-slate-400">역할</span>
                {["전체", "주관", "공동"].map((r) => (
                  <button key={r} onClick={() => setRoleF(r)} className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${roleF === r ? "bg-teal-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <Section title={`⚗ 과제 — ${cnt}건${year !== "전체" ? ` · ${year}년` : ""}${roleF !== "전체" ? ` · ${roleF}` : ""}`} sub="R&D=연구과제, 비R&D=지원사업. 행을 클릭하면 상세로 이동, ✎는 기본정보 수정, '과제 추가'로 등록.">
              <EditableTable rows={data.projects} rowFilter={(p) => inYear(p.code) && inRole(p.role)} onRowClick={(p) => setSel(p.code)} cols={COLS} sheetName="과제" toSheetRow={toRow} blank={EMPTY} requiredKey="code" addLabel="과제 추가" entityLabel="과제" />
            </Section>
          </div>
        );
      }}
    </WithData>
  );
}
