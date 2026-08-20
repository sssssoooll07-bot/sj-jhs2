import * as XLSX from "xlsx";

/**
 * 마스터 엑셀 파서 — 브라우저에서 실행된다(서버 전송 없음).
 * 파일 바이트를 받아 구조화하며, 계산 열(차수합계·검증·계)은 수식에 의존하지 않고 재계산한다.
 */

export type Project = {
  code: string; title: string; type: string; agency: string | null; period: string | null;
  startDate: Date | null; endDate: Date | null; totalKWon: number | null;
  status: string; role: string | null; company: string | null; progress: string | null; note: string | null;
  bank: string | null; account: string | null; accountHolder: string | null;
  vatPaid: boolean; selfPaid: boolean;
  techType: string | null;
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
export type Participant = { code: string; kind: string; name: string; org: string | null; position: string | null; role: string | null; note: string | null };
export type Employee = { name: string; joinedAt: Date | null; rndLab: boolean; note: string | null };
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
export type Participation = {
  name: string; code: string; ratePercent: number; start: Date | null; end: Date | null;
  role: string | null; isNew: boolean; costType: string | null; costKWon: number | null; note: string | null;
  kind: string | null; org: string | null; duty: string | null;
};
export type LibraryDoc = { category: string | null; name: string; url: string | null; validUntil: Date | null; note: string | null };
export type Agreement = {
  code: string; program: string; fileName: string | null; signedAt: Date | null;
  totalKWon: number | null; agency: string | null; note: string | null;
};

export type BudgetItem = { code: string; category: string; planKWon: number | null; finalKWon: number | null; execKWon: number | null; note: string | null };
export type BudgetUsage = { code: string; category: string; usedAt: Date | null; desc: string | null; amountKWon: number | null; vatKWon: number | null; grossKWon: number | null; note: string | null };
export type Data = {
  projects: Project[]; phases: Phase[]; consortium: Consortium[]; disbursements: Disbursement[];
  patents: Patent[]; researchers: Researcher[]; certifications: Certification[];
  funding: Funding[]; compliance: Compliance[]; participations: Participation[];
  library: LibraryDoc[];
  agreements: Agreement[];
  budgetItems: BudgetItem[];
  budgetUsages: BudgetUsage[];
  participants: Participant[];
  employees: Employee[];
  loadedAt: string;
};

type Row = Record<string, unknown>;
const s = (v: unknown): string | null => (v === null || v === undefined || v === "" ? null : String(v).trim());
const n = (v: unknown): number | null => (typeof v === "number" ? v : v ? Number(String(v).replace(/,/g, "")) || null : null);
/**
 * 날짜 정규화 — 뷰어 타임존에 따라 하루가 밀리지 않도록 항상 UTC 자정으로 맞춘다.
 * 엑셀 날짜 셀은 시리얼 숫자로 읽어 직접 변환한다(25569 = 1899-12-30 ~ 1970-01-01 일수).
 */
const dt = (v: unknown): Date | null => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return new Date(Math.round((v - 25569) * 86_400_000));
  if (v instanceof Date) return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return new Date(v.slice(0, 10) + "T00:00:00Z");
  return null;
};
const yn = (v: unknown): boolean => String(v ?? "").trim().toUpperCase() === "Y";
/** 신규여부 등 O/X 표기 (엑셀 서식에 따라 Y도 허용) */
const ox = (v: unknown): boolean => ["O", "Y"].includes(String(v ?? "").trim().toUpperCase());

export function parseWorkbook(bytes: ArrayBuffer | Uint8Array): Data {
  // cellDates 미사용: 날짜를 시리얼 숫자로 받아 dt()에서 타임존 영향 없이 변환한다
  const wb = XLSX.read(bytes, { type: "array" });
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
        bank: s(r["은행명"]), account: s(r["계좌번호"]), accountHolder: s(r["예금주"]),
        vatPaid: ox(r["부가세입금"]), selfPaid: ox(r["자부담입금"]),
        techType: s(r["기술유형"]),
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
    .filter((r) => s(r["연구원 성명"]) && s(r["과제코드"])) // 합계·주석 행 제외
    .map((r) => ({
      name: s(r["연구원 성명"])!, code: s(r["과제코드"])!, ratePercent: n(r["참여율(%)"]) ?? 0,
      start: dt(r["시작일"]), end: dt(r["종료일"]),
      role: s(r["과제내 직위"]), isNew: ox(r["신규여부"]),
      costType: s(r["인건비 구분"]), costKWon: n(r["인건비(천원)"]), note: s(r["비고"]),
      kind: s(r["구분"]), org: s(r["소속"]), duty: s(r["역할"]),
    }));

  // [자료실] 시트는 선택 사항 — 없으면 빈 목록 (기본 발급처 링크는 화면에 내장)
  const library: LibraryDoc[] = rows("자료실")
    .filter((r) => s(r["서류명"]))
    .map((r) => ({ category: s(r["구분"]), name: s(r["서류명"])!, url: s(r["발급처·링크"]), validUntil: dt(r["만료일"]), note: s(r["비고"]) }));

  // [협약서] 시트 — 과제↔협약서 파일명 매핑 (파일 자체는 브라우저에서만 연다)
  // 과제코드(P0000-00 형식)만 데이터로 취급 — 하단 안내(※) 행 제외
  const agreements: Agreement[] = rows("협약서")
    .filter((r) => /^P\d{4}-/.test(String(r["과제코드"] ?? "").trim()))
    .map((r) => ({
      code: s(r["과제코드"])!, program: s(r["사업명"]) ?? "", fileName: s(r["협약서 파일명"]),
      signedAt: dt(r["협약일"]), totalKWon: n(r["총사업비(천원)"]), agency: s(r["전문/전담기관"]), note: s(r["비고"]),
    }));

  // [사업비] 시트 — 사업(과제)별 비목(세목) 예산·집행 (원 단위)
  const budgetItems: BudgetItem[] = rows("사업비")
    .filter((r) => s(r["과제코드"]) && s(r["비목"]))
    .map((r) => ({
      code: s(r["과제코드"])!, category: s(r["비목"])!,
      planKWon: n(r["최초계획금액"]), finalKWon: n(r["최종변경금액"]), execKWon: n(r["집행금액"]), note: s(r["비고"]),
    }));

  const budgetUsages: BudgetUsage[] = rows("사업비사용내역")
    .filter((r) => s(r["과제코드"]) && s(r["비목"]))
    .map((r) => ({
      code: s(r["과제코드"])!, category: s(r["비목"])!,
      usedAt: dt(r["집행일"]), desc: s(r["적요"]), amountKWon: n(r["금액(원)"]), vatKWon: n(r["부가세(원)"]), grossKWon: n(r["총액(원)"]), note: s(r["비고"]),
    }));

  const participants: Participant[] = rows("참여인력")
    .filter((r) => s(r["과제코드"]) && s(r["성명"]))
    .map((r) => ({
      code: s(r["과제코드"])!, kind: s(r["구분"]) ?? "내부", name: s(r["성명"])!,
      org: s(r["소속"]), position: s(r["직위"]), role: s(r["역할"]), note: s(r["비고"]),
    }));

  const employees: Employee[] = rows("전체직원")
    .filter((r) => s(r["성명"]))
    .map((r) => ({ name: s(r["성명"])!, joinedAt: dt(r["입사일"]), rndLab: yn(r["기업부설연구소"]), note: s(r["비고"]) }));

  return { projects, phases, consortium, disbursements, patents, researchers, certifications, funding, compliance, participations, library, agreements, budgetItems, budgetUsages, participants, employees, loadedAt: new Date().toISOString() };
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

/**
 * 대시보드 마감 임박 — 진행중 과제의 수행기간(종료일) 임박만 표시한다.
 * 공고 신청·법정의무·인증 갱신 마감은 각자 화면에서 관리하고 여기엔 넣지 않는다.
 * 종료 30일 경과분까지는 정산·보고가 남아있을 수 있어 함께 노출한다.
 */
export type Deadline = { source: string; title: string; due: Date; dday: number; href: string };
export function collectDeadlines(data: Data, within = 90): Deadline[] {
  const out: Deadline[] = [];
  for (const p of data.projects) {
    if (p.status === "진행중" && p.endDate) {
      out.push({
        source: p.type === "연구과제" ? "연구과제" : "지원사업",
        title: p.title,
        due: p.endDate,
        dday: daysUntil(p.endDate),
        href: "/projects",
      });
    }
  }
  return out.filter((d) => d.dday <= within && d.dday >= -30).sort((a, b) => a.dday - b.dday);
}

/** 과제별 인건비 현황 — 참여연구원 현황표 기준(현금/현물 구분 집계) */
export type LaborCost = {
  code: string; title: string; cashKWon: number; inKindKWon: number; totalKWon: number;
  /** 현물 인건비와 금액이 일치하는 차수 라벨(없으면 null) — 기업부담(현물) 대사용 */
  matchedPhaseLabel: string | null;
  hasPhases: boolean;
  members: Participation[];
};
export function laborCostByProject(data: Data): LaborCost[] {
  const withCost = data.participations.filter((p) => p.costKWon != null);
  const codes = [...new Set(withCost.map((p) => p.code))];
  return codes.map((code) => {
    const members = withCost.filter((p) => p.code === code);
    const cash = members.filter((m) => m.costType === "현금").reduce((s, m) => s + (m.costKWon ?? 0), 0);
    const inKind = members.filter((m) => m.costType === "현물").reduce((s, m) => s + (m.costKWon ?? 0), 0);
    // 인건비는 해당 연차분이므로 차수 "합계"가 아니라 각 차수와 대조한다
    const phases = data.phases.filter((ph) => ph.code === code);
    const matched = phases.find((ph) => Math.abs((ph.inKindKWon ?? 0) - inKind) <= 1);
    return {
      code,
      title: data.projects.find((p) => p.code === code)?.title ?? code,
      cashKWon: cash,
      inKindKWon: inKind,
      totalKWon: cash + inKind,
      matchedPhaseLabel: matched?.label ?? null,
      hasPhases: phases.length > 0,
      members: [...members].sort((a, b) => b.ratePercent - a.ratePercent),
    };
  });
}

/** 연구원별 총 참여율(오늘 기준, 진행중 과제) */
export function participationTotals(data: Data): { name: string; total: number; detail: string }[] {
  const activeCodes = new Set(data.projects.filter((p) => p.status === "진행중").map((p) => p.code));
  const titleOf = (code: string) => data.projects.find((p) => p.code === code)?.title ?? code;
  const now = new Date();
  const byName = new Map<string, { total: number; parts: string[] }>();
  for (const p of data.participations) {
    if (!activeCodes.has(p.code)) continue;
    if (p.kind && p.kind.startsWith("외부")) continue; // 외부 위원 제외 (내부 연구원만)
    if (p.start && p.start > now) continue;
    if (p.end && p.end < now) continue;
    const cur = byName.get(p.name) ?? { total: 0, parts: [] };
    cur.total += p.ratePercent;
    if (p.ratePercent > 0) cur.parts.push(titleOf(p.code)); // 참여율 산정된 과제명만(비율은 총계 열에 표시)
    byName.set(p.name, cur);
  }
  return [...byName.entries()]
    .filter(([, v]) => v.total > 0)
    .map(([name, v]) => ({ name, total: v.total, detail: v.parts.join(" · ") || "—" }))
    .sort((a, b) => b.total - a.total);
}
