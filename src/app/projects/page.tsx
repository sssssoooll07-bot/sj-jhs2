"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { fmtKWon, fmtDate, type Data, type Project, type Agreement } from "@/lib/excel";
import { Badge, Section, StatusBadge } from "@/components/ui";
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
  bank: null, account: null, accountHolder: null, vatPaid: false, selfPaid: false, techType: null, phaseSumKWon: 0, phaseCheck: "—",
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
        <button onClick={() => bankRef.current?.click()} disabled={uploading} className="ml-auto rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
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
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-600"><span className="font-medium text-slate-700">사업계획서:</span> {doc ? <DocViewButton doc={doc} /> : "파일명에 과제코드를 넣어 업로드하면 여기 연결됩니다(PDF 권장)."}</p>
      <button onClick={() => planRef.current?.click()} disabled={uploading} className="ml-auto rounded-md bg-slate-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-slate-700 disabled:opacity-50">
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
  const ags = list.filter((a) => a.code === p.code);
  if (ags.length === 0) {
    return <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">이 과제의 협약서가 없습니다.</div>;
  }
  return (
    <div className="space-y-2">
      {ags.map((a, i) => (
        <div key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="font-medium text-slate-700">협약서:</span>
          {getByName(a.fileName) ? <DocViewButton doc={getByName(a.fileName)} /> : <span className="text-slate-400">파일 미연결</span>}
          {a.signedAt && <span>· 협약일 {fmtDate(a.signedAt)}</span>}
          {a.totalKWon != null && <span>· 총사업비 {fmtKWon(a.totalKWon)}</span>}
          {a.agency && <span>· {a.agency}</span>}
        </div>
      ))}
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

/** 과제 상세 — 상단 요약 + 전용통장/사업계획서/협약서 탭 */
function ProjectDetail({ data, p, onBack }: { data: Data; p: Project; onBack: () => void }) {
  const { refresh } = useAgreementFiles();
  const [tab, setTab] = useState<"account" | "plan" | "agreement">("agreement");
  // 과제 상세 진입 시 협약서·사업계획서·통장 목록을 새로 읽는다(업로드 직후 재로그인 없이 반영)
  useEffect(() => { void refresh(); }, [refresh]);

  const TABS: [typeof tab, string][] = [["agreement", "📜 협약서"], ["plan", "📑 사업계획서"], ["account", "💳 전용통장"]];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="btn-ghost"><ArrowLeft className="h-4 w-4" /> 과제 목록</button>

      <Section title={p.title} sub={p.note ?? undefined}>
        {p.techType && (
          <div className="mb-3">
            <Badge tone={p.techType.includes("궤도") ? "violet" : p.techType.startsWith("스크류") ? "blue" : "amber"}>🔧 {p.techType}</Badge>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Info label="구분" value={p.type} />
          <Info label="지원기관" value={p.agency} />
          <Info label="사업기간" value={p.period ?? (p.startDate && p.endDate ? `${fmtDate(p.startDate)} ~ ${fmtDate(p.endDate)}` : null)} />
          <Info label="진행상태" value={p.status} />
          <Info label="총사업금액" value={fmtKWon(p.totalKWon)} />
          <Info label="역할" value={p.role} />
          <Info label="수행사" value={p.company} />
        </div>
      </Section>

      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${tab === key ? "bg-blue-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4">
          {tab === "account" && <AccountBox p={p} />}
          {tab === "plan" && <PlanBox p={p} />}
          {tab === "agreement" && <AgreementBox p={p} list={data.agreements} />}
        </div>
      </div>
    </div>
  );
}

function ProjectsInner() {
  const [year, setYear] = useState("2026");
  const [roleF, setRoleF] = useState("주관");
  const params = useSearchParams();
  const router = useRouter();
  const sel = params.get("p");

  return (
    <WithData>
      {(data) => {
        const selProject = sel ? data.projects.find((x) => x.code === sel) : null;
        if (selProject) return <ProjectDetail data={data} p={selProject} onBack={() => router.push("/projects")} />;

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
              <EditableTable rows={data.projects} rowFilter={(p) => inYear(p.code) && inRole(p.role)} onRowClick={(p) => router.push(`/projects?p=${encodeURIComponent(p.code)}`)} cols={COLS} sheetName="과제" toSheetRow={toRow} blank={EMPTY} requiredKey="code" addLabel="과제 추가" entityLabel="과제" />
            </Section>
          </div>
        );
      }}
    </WithData>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsInner />
    </Suspense>
  );
}
