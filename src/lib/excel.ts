import * as XLSX from "xlsx";

/**
 * 마스터 엑셀 파서 — 브라우저에서 실행된다(서버 전송 없음).
 * 파일 바이트를 받아 구조화하며, 계산 열(차수합계·검증·계)은 수식에 의존하지 않고 재계산한다.
 */

export type Project = {
  code: string; title: string; type: string; agency: string | null; period: string | null;
  startDate: Date | null; endDate: Date | null; totalKWon: number | null;
  status: string; role: string | null; company: string | null; progress: string | null; note: string | null;
  phaseSumKWon: number; phaseCheck: "OK" | "불일치" | "—";
};
export type Phase = { code: string; label: string | null; period: string | null; govKWon: number | null; cashKWon: number | null; inKindKWon: number | null; totalKWon: number };
export type Consortium = { code: string; name: string; role: string | null; govKWon: number | null; cashKWon: number | null; inKindKWon: number | null };
export type Disbursement = { code: string; paidAt: Date | null; payer: string | null; amountKWon: number | null };
export type Patent = {
  status: string; title: string; regNumber: string | null; appNumber: string | null;
  filedAt: Date | null; registeredAt: Date | null; owner: string | null; inventors: string | null;
  claims: number | null; citations: number | null; isPCT: boolean; examStatus: string | null;
  note: string | null; projectCode: string | null;
};
export type Researcher = { name: string; position: string | null; degree: string | null; major: string | null; university: string | null; gradYear: string | null; researcherNo: string | null; company: string | null; note: string | null; active: boolean };
export type Certification = {
  year: string; name: string; category: string; renewable: boolean; validUntil: Date | null;
  renewalDue: Date | null; rndRelated: boolean; issuer: string | null; certNo: string | null;
  status: string | null; note: string | null;
};
export type Funding = {
  title: string; agency: string; program: string | null; announcedAt: Date | null; applyDue: Date | null;
  scale: string | null; months: number | null; field: string | null; eligibility: string | null;
  sourceUrl: string | null; status: string; rejectReason: string | null; note: string | null;
};
export type Compliance = { kind: string; title: string; dueDate: Date | null; recurrence: string | null; note: string | null };
export type Participation = { name: string; code: string; ratePercent: number; start: Date | null; end: Date | null };
export type LibraryDoc = { category: string | null; name: string; url: string | null; note: string | null };

export type Data = {
  projects: Project[]; phases: Phase[]; consortium: Consortium[]; disbursements: Disbursement[];
  patents: Patent[]; researchers: Researcher[]; certifications: Certification[];
  funding: Funding[]; compliance: Compliance[]; participations: Participation[];
  library: LibraryDoc[];
  loadedAt: string;
};

type Row = Record<string, unknown>;
const s = (v: unknown): string | null => (v === null || v === undefined || v === "" ? null : String(v).trim());
const n = (v: unknown): number | null => (typeof v === "number" ? v : v ? Number(String(v).replace(/,/g, "")) || null : null);
// SheetJS는 로컬 타임존 Date를 만들 수 있어 날짜 부분만 취해 UTC 자정으로 정규화한다
const dt = (v: unknown): Date | null => {
  if (v instanceof Date) return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return new Date(v.slice(0, 10) + "T00:00:00Z");
  return null;
};
const yn = (v: unknown): boolean => String(v ?? "").trim().toUpperCase() === "Y";

export function parseWorkbook(bytes: ArrayBuffer | Uint8Array): Data {
  const wb = XLSX.read(bytes, { type: "array", cellDates: true });
  if (!wb.Sheets["과제"]) {
    throw new Error("마스터 데이터 형식이 아닙니다 — [과제] 시트를 찾을 수 없습니다.");
  }
  const rows = (name: string): Row[] =>
    wb.Sheets[name] ? XLSX.utils.sheet_to_json<Row>(wb.Sheets[name], { defval: null }) : [];

  const phases: Phase[] = rows("차수")
    .filter((r) => s(r["과제코드"]))
    .map((r) => {
      const gov = n(r["지원금(천원)"]), cash = n(r["기업부담-현금(천원)"]), ink = n(r["기업부담-현물(천원)"]);
      return {
        code: s(r["과제코드"])!, label: s(r["차수"]), period: s(r["기간"]),
        govKWon: gov, cashKWon: cash, inKindKWon: ink,
        totalKWon: (gov ?? 0) + (cash ?? 0) + (ink ?? 0),
      };
    });
  const phaseSum = new Map<string, number>();
  for (const p of phases) phaseSum.set(p.code, (phaseSum.get(p.code) ?? 0) + p.totalKWon);

  const projects: Project[] = rows("과제")
    .filter((r) => s(r["과제코드"]))
    .map((r) => {
      const code = s(r["과제코드"])!;
      const total = n(r["총사업금액(천원)"]);
      const sum = phaseSum.get(code) ?? 0;
      return {
        code, title: s(r["과제명"]) ?? "", type: s(r["구분"]) ?? "", agency: s(r["지원부처/기관"]),
        period: s(r["총사업기간"]), startDate: dt(r["시작일"]), endDate: dt(r["종료일"]),
        totalKWon: total, status: s(r["진행상태"]) ?? "", role: s(r["역할"]), company: s(r["수행사"]),
        progress: s(r["진행사항"]), note: s(r["비고"]),
        phaseSumKWon: sum,
        phaseCheck: total === null ? "—" : Math.abs(sum - total) <= 1 ? "OK" : "불일치",
      };
    });

  const consortium: Consortium[] = rows("참여기관")
    .filter((r) => s(r["과제코드"]))
    .map((r) => ({
      code: s(r["과제코드"])!, name: s(r["기관명"]) ?? "", role: s(r["역할"]),
      govKWon: n(r["지원금(천원)"]), cashKWon: n(r["기업부담-현금(천원)"]), inKindKWon: n(r["기업부담-현물(천원)"]),
    }));

  const disbursements: Disbursement[] = rows("입금이력")
    .filter((r) => s(r["과제코드"]))
    .map((r) => ({ code: s(r["과제코드"])!, paidAt: dt(r["입금일"]), payer: s(r["지급업체"]), amountKWon: n(r["금액(천원)"]) }));

  const patents: Patent[] = rows("특허")
    .filter((r) => s(r["특허명칭"]))
    .map((r) => ({
      status: s(r["상태"]) ?? "", title: s(r["특허명칭"]) ?? "", regNumber: s(r["등록번호"]), appNumber: s(r["출원번호"]),
      filedAt: dt(r["출원일"]), registeredAt: dt(r["등록일"]), owner: s(r["특허권자"]), inventors: s(r["발명자"]),
      claims: n(r["청구항수"]), citations: n(r["피인용"]), isPCT: yn(r["PCT"]),
      examStatus: s(r["진행상태(출원건)"]), note: s(r["연계사업(비고)"]), projectCode: s(r["연계과제코드"]),
    }));

  const researchers: Researcher[] = rows("연구원")
    .filter((r) => s(r["성명"]))
    .map((r) => ({
      name: s(r["성명"])!, position: s(r["직위"]), degree: s(r["최종학위"]), major: s(r["전공"]),
      university: s(r["출신대학"]), gradYear: s(r["졸업연도"]), researcherNo: s(r["국가연구자번호"]),
      company: s(r["소속"]), note: s(r["비고"]),
      // 재직여부 열이 없으면(구버전 엑셀) 재직으로 간주
      active: r["재직여부"] === null || r["재직여부"] === undefined ? true : yn(r["재직여부"]),
    }));

  const certifications: Certification[] = rows("인증")
    .filter((r) => s(r["명칭"]))
    .map((r) => ({
      year: s(r["획득연도"]) ?? "", name: s(r["명칭"])!, category: s(r["구분"]) ?? "",
      renewable: yn(r["갱신대상"]), validUntil: dt(r["유효기간 만료일"]), renewalDue: dt(r["갱신 마감일"]),
      rndRelated: yn(r["연구소관련"]), issuer: s(r["발급기관"]), certNo: s(r["인증번호"]),
      status: s(r["상태"]), note: s(r["비고"]),
    }));

  const funding: Funding[] = rows("지원사업공고")
    .filter((r) => s(r["공고명"]))
    .map((r) => ({
      title: s(r["공고명"])!, agency: s(r["주관/전문기관"]) ?? "", program: s(r["프로그램"]),
      announcedAt: dt(r["공고일"]), applyDue: dt(r["신청 마감일"]), scale: s(r["지원규모"]),
      months: n(r["기간(개월)"]), field: s(r["분야"]), eligibility: s(r["자격요건"]),
      sourceUrl: s(r["출처URL"]), status: s(r["상태"]) ?? "관심", rejectReason: s(r["탈락사유"]), note: s(r["비고"]),
    }));

  const compliance: Compliance[] = rows("법정의무")
    .filter((r) => s(r["제목"]))
    .map((r) => ({ kind: s(r["종류"]) ?? "", title: s(r["제목"])!, dueDate: dt(r["마감일"]), recurrence: s(r["반복주기"]), note: s(r["비고"]) }));

  const participations: Participation[] = rows("참여율")
    .filter((r) => s(r["연구원 성명"]))
    .map((r) => ({
      name: s(r["연구원 성명"])!, code: s(r["과제코드"]) ?? "", ratePercent: n(r["참여율(%)"]) ?? 0,
      start: dt(r["시작일"]), end: dt(r["종료일"]),
    }));

  // [자료실] 시트는 선택 사항 — 없으면 빈 목록 (기본 발급처 링크는 화면에 내장)
  const library: LibraryDoc[] = rows("자료실")
    .filter((r) => s(r["서류명"]))
    .map((r) => ({ category: s(r["구분"]), name: s(r["서류명"])!, url: s(r["발급처·링크"]), note: s(r["비고"]) }));

  return { projects, phases, consortium, disbursements, patents, researchers, certifications, funding, compliance, participations, library, loadedAt: new Date().toISOString() };
}

const DAY = 86_400_000;
export function daysUntil(due: Date, now: Date = new Date()): number {
  const d = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const t = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d - t) / DAY);
}

export function fmtKWon(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${Math.round(v).toLocaleString("ko-KR")}천원`;
}

export function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** 대시보드용 마감 임박 항목(공고 신청·법정의무·인증 갱신) */
export type Deadline = { source: string; title: string; due: Date; dday: number; href: string };
export function collectDeadlines(data: Data, within = 60): Deadline[] {
  const out: Deadline[] = [];
  for (const f of data.funding) {
    if (f.applyDue && ["관심", "검토중", "신청준비"].includes(f.status))
      out.push({ source: "공고 신청", title: f.title, due: f.applyDue, dday: daysUntil(f.applyDue), href: "/funding" });
  }
  for (const c of data.compliance) {
    if (c.dueDate) out.push({ source: "법정의무", title: c.title, due: c.dueDate, dday: daysUntil(c.dueDate), href: "/compliance" });
  }
  for (const c of data.certifications) {
    const due = c.renewalDue ?? c.validUntil;
    if (c.renewable && due) out.push({ source: "인증 갱신", title: c.name, due, dday: daysUntil(due), href: "/certifications" });
  }
  return out.filter((d) => d.dday <= within).sort((a, b) => a.dday - b.dday);
}

/** 연구원별 총 참여율(오늘 기준, 진행중 과제) */
export function participationTotals(data: Data): { name: string; total: number; detail: string }[] {
  const activeCodes = new Set(data.projects.filter((p) => p.status === "진행중").map((p) => p.code));
  const now = new Date();
  const byName = new Map<string, { total: number; parts: string[] }>();
  for (const p of data.participations) {
    if (!activeCodes.has(p.code)) continue;
    if (p.start && p.start > now) continue;
    if (p.end && p.end < now) continue;
    const cur = byName.get(p.name) ?? { total: 0, parts: [] };
    cur.total += p.ratePercent;
    cur.parts.push(`${p.code} ${p.ratePercent}%`);
    byName.set(p.name, cur);
  }
  return [...byName.entries()]
    .map(([name, v]) => ({ name, total: v.total, detail: v.parts.join(" · ") }))
    .sort((a, b) => b.total - a.total);
}
