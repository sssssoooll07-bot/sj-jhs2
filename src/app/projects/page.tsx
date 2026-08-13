"use client";

import { useRef } from "react";
import { fmtKWon, fmtDate, type Project, type Phase, type Consortium, type Disbursement } from "@/lib/excel";
import { Badge, Empty, Section, StatusBadge } from "@/components/ui";
import { WithData } from "@/components/FileGate";
import { useAgreementFiles } from "@/lib/agreement-files";
import { EditableTable, dateStr, type Col } from "@/components/EditableTable";
import DocViewButton from "@/components/DocViewButton";

/* ── 과제 [과제] ── */
const EMPTY: Project = {
  code: "", title: "", type: "연구과제", agency: null, period: null, startDate: null, endDate: null,
  totalKWon: null, status: "진행중", role: "주관", company: "신정개발", progress: null, note: null,
  bank: null, account: null, accountHolder: null, phaseSumKWon: 0, phaseCheck: "—",
};
const COLS: Col<Project>[] = [
  { key: "code", label: "과제코드", th: "코드" },
  { key: "title", label: "과제명", span: true, view: (p) => <span className="font-medium">{p.title}</span> },
  { key: "type", label: "구분", type: "select", options: ["연구과제", "지원사업"], view: (p) => <Badge tone={p.type === "연구과제" ? "blue" : "violet"}>{p.type}</Badge> },
  { key: "agency", label: "지원부처/기관", th: "지원기관" },
  { key: "status", label: "진행상태", type: "select", options: ["진행중", "완료"], view: (p) => <StatusBadge status={p.status} /> },
  { key: "totalKWon", label: "총사업금액(천원)", type: "number", align: "right", th: "총사업금액", view: (p) => <span className="font-semibold">{fmtKWon(p.totalKWon)}</span> },
  { key: "period", label: "총사업기간", hide: true },
  { key: "startDate", label: "시작일", type: "date", hide: true },
  { key: "endDate", label: "종료일", type: "date", hide: true },
  { key: "role", label: "역할", hide: true },
  { key: "company", label: "수행사", hide: true },
  { key: "progress", label: "진행사항", span: true, hide: true },
  { key: "note", label: "비고", span: true, hide: true },
  { key: "bank", label: "전용통장 은행", hide: true },
  { key: "account", label: "전용통장 계좌번호", hide: true },
  { key: "accountHolder", label: "예금주", hide: true },
];
const toRow = (p: Project) => ({
  과제코드: p.code, 과제명: p.title, 구분: p.type, "지원부처/기관": p.agency, 총사업기간: p.period,
  시작일: dateStr(p.startDate), 종료일: dateStr(p.endDate), "총사업금액(천원)": p.totalKWon,
  진행상태: p.status, 역할: p.role, 수행사: p.company, 진행사항: p.progress, 비고: p.note,
  은행명: p.bank, 계좌번호: p.account, 예금주: p.accountHolder,
});

/* ── 차수 ── */
const PHASE_EMPTY: Phase = { code: "", label: null, period: null, govKWon: null, cashKWon: null, inKindKWon: null, totalKWon: 0 };
const PHASE_COLS: Col<Phase>[] = [
  { key: "code", label: "과제코드", th: "과제" },
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
  { key: "code", label: "과제코드", th: "과제" },
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
  { key: "code", label: "과제코드", th: "과제" },
  { key: "paidAt", label: "입금일", type: "date" },
  { key: "payer", label: "지급업체" },
  { key: "amountKWon", label: "금액(천원)", type: "number", align: "right", th: "금액", view: (d) => fmtKWon(d.amountKWon) },
];
const disbRow = (d: Disbursement) => ({ 과제코드: d.code, 입금일: dateStr(d.paidAt), 지급업체: d.payer, "금액(천원)": d.amountKWon });

/** 과제별 전용통장 + 통장거래내역 (로그인 사용자만 열람) */
function AccountTable({ list }: { list: Project[] }) {
  const { getByPattern, loadFolder, uploading, cloud } = useAgreementFiles();
  const bankRef = useRef<HTMLInputElement>(null);
  const rows = list.filter((p) => p.bank || p.account || p.accountHolder || getByPattern(p.code, "bankbook"));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
        <p className="text-xs text-emerald-800">🏦 은행·계좌·예금주는 <b>과제 수정 창</b>에서 입력합니다. 통장거래내역은 파일명에 <b>과제코드</b>를 넣어 업로드하면 자동 연결됩니다(보기 전용).</p>
        <button onClick={() => bankRef.current?.click()} disabled={uploading} className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          {uploading ? "업로드 중…" : cloud ? "거래내역 폴더 업로드" : "거래내역 폴더 선택"}
        </button>
        <input ref={bankRef} type="file"
          // @ts-expect-error webkitdirectory는 표준 타입에 없음
          webkitdirectory="" directory="" multiple className="hidden"
          onChange={(e) => e.target.files && loadFolder(e.target.files, "bankbook")} />
      </div>
      {rows.length === 0 ? (
        <Empty message="과제 수정 창에서 은행·계좌·예금주를 입력하거나, 과제코드가 든 통장거래내역 파일을 올리면 여기에 표시됩니다." />
      ) : (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>코드</th><th>과제명</th><th>은행</th><th>계좌번호</th><th>예금주</th><th>거래내역</th></tr></thead>
            <tbody>
              {rows.map((p) => {
                const stmt = getByPattern(p.code, "bankbook");
                return (
                  <tr key={p.code} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap font-mono text-xs">{p.code}</td>
                    <td className="font-medium">{p.title}</td>
                    <td className="whitespace-nowrap text-xs">{p.bank ?? "—"}</td>
                    <td className="whitespace-nowrap font-mono text-sm">{p.account ?? "—"}</td>
                    <td className="whitespace-nowrap text-xs">{p.accountHolder ?? "—"}</td>
                    <td>{stmt ? <DocViewButton doc={stmt} /> : <span className="text-xs text-slate-400">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** 과제별 사업계획서 (로그인 사용자만 열람) */
function BusinessPlanTable({ list }: { list: Project[] }) {
  const { getByPattern, loadFolder, uploading, cloud } = useAgreementFiles();
  const planRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
        <p className="text-xs text-indigo-800">📑 사업계획서는 파일명에 <b>과제코드</b>(예: <code className="rounded bg-white px-1">P2025-02</code>)를 넣어 업로드하면 과제별로 연결됩니다(PDF 권장, 다운로드 없이 보기).</p>
        <button onClick={() => planRef.current?.click()} disabled={uploading} className="ml-auto rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {uploading ? "업로드 중…" : cloud ? "사업계획서 폴더 업로드" : "사업계획서 폴더 선택"}
        </button>
        <input ref={planRef} type="file"
          // @ts-expect-error webkitdirectory는 표준 타입에 없음
          webkitdirectory="" directory="" multiple className="hidden"
          onChange={(e) => e.target.files && loadFolder(e.target.files, "businessplan")} />
      </div>
      <div className="overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>코드</th><th>과제명</th><th>구분</th><th>사업계획서</th></tr></thead>
          <tbody>
            {list.map((p) => {
              const doc = getByPattern(p.code, "businessplan");
              return (
                <tr key={p.code} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap font-mono text-xs">{p.code}</td>
                  <td className="font-medium">{p.title}</td>
                  <td><Badge tone={p.type === "연구과제" ? "blue" : "violet"}>{p.type}</Badge></td>
                  <td>{doc ? <DocViewButton doc={doc} /> : <span className="text-xs text-slate-400">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** 공동기관 사업비 분배 (참여기관별 자동 %) */
function ShareTable({ list, code }: { list: Consortium[]; code: string }) {
  const share = list.filter((c) => c.code === code).map((c) => ({ name: c.name, role: c.role, total: (c.govKWon ?? 0) + (c.cashKWon ?? 0) + (c.inKindKWon ?? 0) }));
  const grand = share.reduce((s, x) => s + x.total, 0);
  if (share.length === 0) return null;
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

export default function ProjectsPage() {
  return (
    <WithData>
      {(data) => (
        <div className="space-y-5">
          <Section title={`⚗ 과제 — ${data.projects.length}건`} sub="연구과제·지원사업 통합. 행의 ✎로 수정, '과제 추가'로 등록. 은행·계좌·예금주도 수정 창에서 입력합니다.">
            <EditableTable rows={data.projects} cols={COLS} sheetName="과제" toSheetRow={toRow} blank={EMPTY} requiredKey="code" addLabel="과제 추가" entityLabel="과제" />
          </Section>

          <Section title="💳 과제별 전용통장" sub="정부 R&D 전용계좌 · 통장거래내역 (로그인 사용자만 열람)">
            <AccountTable list={data.projects} />
          </Section>

          <Section title="📑 과제별 사업계획서" sub="과제코드가 든 파일을 올리면 과제별로 연결됩니다 (로그인 사용자만 열람)">
            <BusinessPlanTable list={data.projects} />
          </Section>

          <Section title="🏢 공동기관 사업비 분배" sub="참여기관별 사업비(지원금+기업부담)와 비중을 과제별로 자동 계산">
            <div className="space-y-4">
              {data.projects.filter((p) => data.consortium.some((c) => c.code === p.code)).map((p) => (
                <div key={p.code}>
                  <p className="mb-1 text-xs font-semibold text-slate-500"><span className="font-mono">{p.code}</span> {p.title}</p>
                  <ShareTable list={data.consortium} code={p.code} />
                </div>
              ))}
              {data.consortium.length === 0 && <Empty message="참여기관이 없습니다. 아래 '참여기관'에서 추가하세요." />}
            </div>
          </Section>

          <Section title={`📊 차수 — ${data.phases.length}건`} sub="과제별 연차 예산. '차수 추가'로 등록(과제코드·차수 기준).">
            <EditableTable rows={data.phases} cols={PHASE_COLS} sheetName="차수" toSheetRow={phaseRow} blank={PHASE_EMPTY} requiredKey="code" addLabel="차수 추가" entityLabel="차수" />
          </Section>

          <Section title={`🏢 참여기관 — ${data.consortium.length}건`} sub="공동·참여 기관별 사업비. 위 '공동기관 사업비 분배'에 자동 반영됩니다.">
            <EditableTable rows={data.consortium} cols={CONS_COLS} sheetName="참여기관" toSheetRow={consRow} blank={CONS_EMPTY} requiredKey="name" addLabel="참여기관 추가" entityLabel="참여기관" />
          </Section>

          <Section title={`💵 입금이력 — ${data.disbursements.length}건`} sub="지원금 입금 내역. '입금 추가'로 등록.">
            <EditableTable rows={data.disbursements} cols={DISB_COLS} sheetName="입금이력" toSheetRow={disbRow} blank={DISB_EMPTY} requiredKey="code" addLabel="입금 추가" entityLabel="입금" />
          </Section>
        </div>
      )}
    </WithData>
  );
}
