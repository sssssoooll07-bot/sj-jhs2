"use client";

import { useRef } from "react";
import { fmtKWon, fmtDate, type Data, type Project } from "@/lib/excel";
import { Badge, Empty, Section, StatusBadge } from "@/components/ui";
import { WithData } from "@/components/FileGate";
import { useAgreementFiles } from "@/lib/agreement-files";
import { EditableTable, dateStr, type Col } from "@/components/EditableTable";
import DocViewButton from "@/components/DocViewButton";

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

/** 과제별 전용통장 — 은행·계좌·예금주 + 통장거래내역 미리보기 (로그인 사용자만 열람) */
function AccountTable({ list }: { list: Project[] }) {
  const { getByPattern, loadFolder, uploading, cloud } = useAgreementFiles();
  const bankRef = useRef<HTMLInputElement>(null);
  const rows = list.filter((p) => p.bank || p.account || p.accountHolder || getByPattern(p.code));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
        <p className="text-xs text-emerald-800">
          🏦 은행·계좌·예금주는 <b>과제 수정 창</b>에서 입력합니다. 통장거래내역은 파일명에 <b>과제코드</b>(예: <code className="rounded bg-white px-1">P2025-02</code>)를 넣어 업로드하면 자동 연결됩니다(다운로드 없이 보기).
        </p>
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
            <thead>
              <tr><th>코드</th><th>과제명</th><th>은행</th><th>계좌번호</th><th>예금주</th><th>거래내역</th></tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const stmt = getByPattern(p.code);
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

function Details({ data }: { data: Data }) {
  const detail = (code: string) => ({
    phases: data.phases.filter((x) => x.code === code),
    consortium: data.consortium.filter((x) => x.code === code),
    disb: data.disbursements.filter((x) => x.code === code),
  });
  const shown = data.projects.filter((p) => detail(p.code).phases.length > 0 || detail(p.code).consortium.length > 0);
  return (
    <div className="space-y-3">
      {shown.map((p) => {
        const d = detail(p.code);
        // 공동기관 사업비 분배: 참여기관별 지원금+부담(현금+현물) 합
        const share = d.consortium.map((c) => ({ name: c.name, role: c.role, total: (c.govKWon ?? 0) + (c.cashKWon ?? 0) + (c.inKindKWon ?? 0) }));
        const grand = share.reduce((s, x) => s + x.total, 0);
        return (
          <details key={p.code} className="overflow-hidden rounded-xl border border-slate-200">
            <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-medium hover:bg-slate-50">
              <span className="font-mono text-xs text-slate-400">{p.code}</span> {p.title}
              <span className="ml-2 text-xs text-slate-400">차수 {d.phases.length} · 기관 {d.consortium.length} · 입금 {d.disb.length}</span>
            </summary>
            <div className="grid grid-cols-1 gap-4 border-t border-slate-100 p-4 lg:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-500">차수별 예산</p>
                <table className="table-base">
                  <thead><tr><th>차수</th><th>기간</th><th className="text-right">지원금</th><th className="text-right">현금</th><th className="text-right">현물</th><th className="text-right">계</th></tr></thead>
                  <tbody>
                    {d.phases.map((ph, i) => (
                      <tr key={i}>
                        <td>{ph.label}</td><td className="text-xs">{ph.period}</td>
                        <td className="text-right">{fmtKWon(ph.govKWon)}</td>
                        <td className="text-right">{fmtKWon(ph.cashKWon)}</td>
                        <td className="text-right">{fmtKWon(ph.inKindKWon)}</td>
                        <td className="text-right font-semibold">{fmtKWon(ph.totalKWon)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3">
                {share.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-slate-500">공동기관 사업비 분배</p>
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
                        <tr className="bg-slate-50 font-bold">
                          <td colSpan={2}>합계</td>
                          <td className="text-right">{fmtKWon(grand)}</td>
                          <td className="text-right text-xs">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                {d.disb.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-slate-500">지원금 입금 이력</p>
                    <table className="table-base">
                      <thead><tr><th>입금일</th><th>지급업체</th><th className="text-right">금액</th></tr></thead>
                      <tbody>
                        {d.disb.map((x, i) => (
                          <tr key={i}>
                            <td>{fmtDate(x.paidAt)}</td><td>{x.payer}</td>
                            <td className="text-right font-semibold">{fmtKWon(x.amountKWon)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </details>
        );
      })}
    </div>
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
          <Section title="📅 다년차 상세 · 공동기관 사업비 분배" sub="[차수]·[참여기관]·[입금이력] 시트 기준 — 공동기관 사업비는 참여기관별로 자동 분배 표시">
            <Details data={data} />
          </Section>
        </div>
      )}
    </WithData>
  );
}
