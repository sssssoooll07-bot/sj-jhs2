"use client";

import { useRef, useState, useEffect } from "react";
import { StatusBadge, Badge, Section } from "@/components/ui";
import { WithData } from "@/components/FileGate";
import { useAgreementFiles } from "@/lib/agreement-files";
import { useAccess } from "@/lib/access-context";
import { EditableTable, dateStr, type Col } from "@/components/EditableTable";
import DocViewButton from "@/components/DocViewButton";
import { fmtDate, type Patent } from "@/lib/excel";

const EMPTY: Patent = {
  status: "출원완료", title: "", regNumber: null, appNumber: null, filedAt: null, registeredAt: null,
  owner: "㈜신정개발", inventors: null, claims: null, citations: null, isPCT: false,
  examStatus: null, note: null, projectCode: null,
};
// 연계과제코드는 저장에서 제외(열 삭제)
const toRow = (p: Patent) => ({
  상태: p.status, 특허명칭: p.title, 등록번호: p.regNumber, 출원번호: p.appNumber,
  출원일: dateStr(p.filedAt), 등록일: dateStr(p.registeredAt), 특허권자: p.owner, 발명자: p.inventors,
  청구항수: p.claims, 피인용: p.citations, PCT: p.isPCT ? "Y" : "N",
  "진행상태(출원건)": p.examStatus, "연계사업(비고)": p.note,
});
const norm = (s: string) => s.replace(/[\s()·∙\-_]/g, "").toLowerCase();

/** 특허 연도 — 출원일 우선, 없으면 등록일, 없으면 출원/등록번호의 4자리 연도 */
const patentYear = (p: Patent): string => {
  const d = p.filedAt ?? p.registeredAt;
  if (d) return String(d.getUTCFullYear());
  const m = (p.appNumber ?? p.regNumber ?? "").match(/(20\d{2})/);
  return m ? m[1] : "기타";
};

/** 특허 목록 화면출력(인쇄/PDF) — 현재 표시 중인 목록을 표로 인쇄한다 */
function printPatents(rows: Patent[], subtitle: string) {
  const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const dt = (d: Date | null) => { const s = fmtDate(d); return s === "—" ? "" : s; };
  const body = rows.map((p, i) => `<tr>
      <td class="c">${i + 1}</td>
      <td class="c">${esc(p.status)}${p.isPCT ? "<br>(PCT)" : ""}</td>
      <td class="l">${esc(p.title)}</td>
      <td class="c">${esc(p.regNumber ?? "")}</td>
      <td class="c">${esc(p.appNumber ?? "")}</td>
      <td class="c">${dt(p.filedAt)}</td>
      <td class="c">${dt(p.registeredAt)}</td>
      <td class="c">${esc(p.owner ?? "")}</td>
      <td class="ln">${esc(p.inventors ?? "")}</td>
      <td class="l">${esc(p.note ?? "")}</td>
    </tr>`).join("");
  const today = new Date();
  const dateK = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}.`;
  const css = `@page{size:A4 landscape;margin:12mm}
    body{font-family:'Malgun Gothic','맑은 고딕',sans-serif;color:#222;margin:0}
    h1{font-size:20px;text-align:center;margin:0 0 4px}
    .sub{text-align:center;color:#555;font-size:12px;margin:0 0 12px}
    table{border-collapse:collapse;width:100%;font-size:11px}
    th,td{border:1px solid #999;padding:4px 6px;vertical-align:middle}
    th{background:#eef2f8;text-align:center;white-space:nowrap}
    td.c{text-align:center;white-space:nowrap} td.l{text-align:left} td.ln{text-align:left;white-space:nowrap}
    .foot{margin-top:14px;text-align:right;font-size:12px;font-weight:bold}`;
  const html = `<h1>특허 현황</h1><p class="sub">㈜신정개발 · ${esc(subtitle)} · 출력일 ${dateK}</p>
    <table><thead><tr>
      <th>No</th><th>상태</th><th>특허 명칭</th><th>등록번호</th><th>출원번호</th><th>출원일</th><th>등록일</th><th>특허권자</th><th>발명자</th><th>비고</th>
    </tr></thead><tbody>${body}</tbody></table>
    <p class="foot">㈜ 신 정 개 발</p>`;
  const ifr = document.createElement("iframe");
  ifr.style.position = "fixed"; ifr.style.right = "0"; ifr.style.bottom = "0"; ifr.style.width = "0"; ifr.style.height = "0"; ifr.style.border = "0";
  document.body.appendChild(ifr);
  const doc = ifr.contentWindow!.document;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>특허현황</title><style>${css}</style></head><body>${html}</body></html>`);
  doc.close();
  ifr.contentWindow!.focus();
  setTimeout(() => { ifr.contentWindow!.print(); setTimeout(() => document.body.removeChild(ifr), 1000); }, 300);
}

export default function PatentsPage() {
  const { count, cloud, uploading, error, loadFolder, getByPattern, refresh } = useAgreementFiles();
  const { canEdit } = useAccess();
  const certRef = useRef<HTMLInputElement>(null);
  const [year, setYear] = useState("2025");
  const [kind, setKind] = useState<"전체" | "등록" | "출원">("전체"); // 분류: 등록특허 / 출원건

  // 특허 탭 진입 시 특허증 목록을 새로 읽는다(업로드 직후에도 재로그인 없이 반영)
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const findCert = (p: Patent) => {
    // 1) 등록번호 → 2) 특허명 전체 → 3) 앞 5글자(순서대로 더 느슨하게)
    const byNum = p.regNumber ? getByPattern(p.regNumber, "patents") : null;
    if (byNum) return byNum;
    const full = norm(p.title);
    const byFull = full.length >= 6 ? getByPattern(full, "patents") : null;
    if (byFull) return byFull;
    const prefix = full.slice(0, 5);
    return prefix.length >= 4 ? getByPattern(prefix, "patents") : null;
  };

  const cols: Col<Patent>[] = [
    { key: "status", label: "상태", type: "select", options: ["등록완료", "출원완료"], view: (p) => <StatusBadge status={p.status} /> },
    {
      key: "title", label: "특허 명칭", span: true,
      view: (p) => {
        const cert = findCert(p);
        const name = <>{p.title} {p.isPCT && <Badge tone="cyan">PCT</Badge>}</>;
        return cert ? <DocViewButton doc={cert} label={name} /> : <span className="font-medium">{name}</span>;
      },
    },
    { key: "regNumber", label: "등록번호", nowrap: true },
    { key: "appNumber", label: "출원번호", nowrap: true },
    { key: "filedAt", label: "출원일", type: "date" },
    { key: "registeredAt", label: "등록일", type: "date" },
    { key: "note", label: "연계사업(비고)", th: "연계사업", span: true, view: (p) => (p.note ? <Badge tone="blue">{p.note}</Badge> : "—") },
    { key: "owner", label: "특허권자", hide: true },
    { key: "inventors", label: "발명자", span: true, hide: true },
    { key: "claims", label: "청구항수", type: "number", align: "right", hide: true },
    { key: "citations", label: "피인용", type: "number", align: "right", hide: true },
    { key: "isPCT", label: "PCT 국제출원", type: "toggle", hide: true },
    { key: "examStatus", label: "진행상태(출원중)", hide: true },
  ];

  return (
    <WithData>
      {(data) => {
        const years = ["전체", ...Array.from(new Set(data.patents.map(patentYear))).sort().reverse()];
        const inYear = (p: Patent) => year === "전체" || patentYear(p) === year;
        const inKind = (p: Patent) => kind === "전체" || (kind === "등록" ? p.status === "등록완료" : p.status === "출원완료");
        const match = (p: Patent) => inYear(p) && inKind(p);
        const reg = data.patents.filter((p) => p.status === "등록완료").length;
        const filed = data.patents.filter((p) => p.status === "출원완료").length;
        const shown = data.patents.filter(match).length;
        const kindLabel = kind === "등록" ? "등록특허" : kind === "출원" ? "출원" : "전체";

        return (
          <Section title={`💡 특허 — ${shown}건${kind !== "전체" ? ` · ${kindLabel}` : ""}${year !== "전체" ? ` · ${year}년` : kind === "전체" ? ` (등록 ${reg} · 출원 ${filed})` : ""}`} sub="행의 특허증 '보기 ↗'로 등록증 미리보기. ✎로 수정(연계사업 포함), '특허 추가'로 등록.">
            {/* 분류 필터 (등록/출원) */}
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-semibold text-slate-400">분류</span>
              {(["전체", "등록", "출원"] as const).map((k) => (
                <button key={k} onClick={() => setKind(k)} className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${kind === k ? "bg-teal-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  {k === "전체" ? "전체" : k === "등록" ? "등록특허" : "출원"}
                </button>
              ))}
            </div>
            {/* 연도 필터 (과제탭과 동일) */}
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-semibold text-slate-400">연도</span>
              {years.map((y) => (
                <button key={y} onClick={() => setYear(y)} className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${year === y ? "bg-blue-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  {y === "전체" ? "전체" : `${y}년`}
                </button>
              ))}
              <button
                onClick={() => printPatents(data.patents.filter(match), `${kindLabel}${year === "전체" ? "" : ` · ${year}년`} · ${shown}건`)}
                className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50">
                🖨 화면출력(인쇄·PDF)
              </button>
              <a href="https://www.kipris.or.kr/khome/search/searchResult.do?tab=patent" target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50">
                🔍 KIPRIS 특허검색 ↗
              </a>
            </div>

            {canEdit && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-xs text-emerald-800">🏅 특허증은 파일명에 <b>등록번호</b>(예: 10-2693397) 또는 특허명이 들어가면 자동 연결됩니다{cloud ? ` · ${count}건 로드됨` : ""}. 로그인 사용자만 열람.</p>
                <button onClick={() => certRef.current?.click()} disabled={uploading} className="ml-auto rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                  {uploading ? "업로드 중…" : "특허증 폴더 업로드"}
                </button>
                <input ref={certRef} type="file"
                  // @ts-expect-error webkitdirectory는 표준 타입에 없음
                  webkitdirectory="" directory="" multiple className="hidden"
                  onChange={(e) => e.target.files && loadFolder(e.target.files, "patents")} />
              </div>
            )}
            {error && <p className="mb-2 text-sm font-medium text-red-600">⚠ {error}</p>}

            <EditableTable rows={data.patents} rowFilter={match} cols={cols} sheetName="특허" toSheetRow={toRow} blank={EMPTY} requiredKey="title" addLabel="특허 추가" entityLabel="특허" />
          </Section>
        );
      }}
    </WithData>
  );
}
