"use client";

import { useMemo, useState } from "react";
import { Search, FileSpreadsheet, Plus, Trash2, Download, X, Eye, Printer } from "lucide-react";
import { WithData } from "@/components/FileGate";
import { Section } from "@/components/ui";
import { EditableTable, type Col } from "@/components/EditableTable";
import type { Data, Vendor } from "@/lib/excel";

const won = (v: number) => (v ? v.toLocaleString("ko-KR") : "");
const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const COLS: Col<Vendor>[] = [
  { key: "name", label: "거래처명", span: true, view: (v) => <span className="font-medium text-slate-800">{v.name}</span> },
  { key: "bizNo", label: "사업자등록번호", th: "사업자등록번호", nowrap: true, align: "center", view: (v) => v.bizNo ?? "—" },
  { key: "ceo", label: "대표자", th: "대표자", nowrap: true, align: "center", view: (v) => v.ceo ?? "—" },
  { key: "note", label: "주소", th: "주소", view: (v) => <span className="text-xs text-slate-500">{v.note ?? "—"}</span> },
];
const toRow = (v: Vendor) => ({ 거래처명: v.name, 사업자등록번호: v.bizNo, 대표자: v.ceo, 주소: v.note });
const EMPTY: Vendor = { name: "", bizNo: null, ceo: null, note: null };

// 초성
const CHO = ["ㄱ", "ㄱ", "ㄴ", "ㄷ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅂ", "ㅅ", "ㅅ", "ㅇ", "ㅈ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const ORDER = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ", "기타"];
const strip = (n: string) => { let k = n; for (const p of ["주식회사 ", "주식회사", "(주)", "㈜", "(재)", "(유)"]) k = k.split(p).join(""); return k.trim(); };
function choOf(name: string): string {
  const s = strip(name); if (!s) return "기타";
  const c = s.charCodeAt(0);
  return c >= 0xac00 && c <= 0xd7a3 ? CHO[Math.floor((c - 0xac00) / 588)] : "기타";
}

// ── 발주서 ──
type POItem = { name: string; spec: string; unit: string; qty: string; price: string; supply: string };
const blankItem = (): POItem => ({ name: "", spec: "", unit: "", qty: "", price: "", supply: "" });
const supplyOf = (it: POItem) => Number(it.supply) || 0; // 공급가액(직접 입력 또는 수량×단가 자동)
const vatOf = (it: POItem) => Math.round(supplyOf(it) * 0.1);

function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
const dateKor = (d: string) => (d ? `${d.slice(0, 4)}년 ${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일` : "");
function defaultNo() { const d = new Date(); return `제${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-01호`; }

function PurchaseOrderModal({ vendor, onClose }: { vendor: Vendor; onClose: () => void }) {
  const [company, setCompany] = useState(vendor.name);
  const [ceo, setCeo] = useState(vendor.ceo ?? "");
  const [tel, setTel] = useState("");
  const [fax, setFax] = useState("");
  const [no, setNo] = useState(defaultNo());
  const [date, setDate] = useState(todayStr());
  const [items, setItems] = useState<POItem[]>([blankItem()]);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);

  const totSupply = items.reduce((s, it) => s + supplyOf(it), 0);
  const totVat = items.reduce((s, it) => s + vatOf(it), 0);
  const grand = totSupply + totVat;

  const setItem = (i: number, patch: Partial<POItem>) => setItems((p) => p.map((x, idx) => {
    if (idx !== i) return x;
    const n = { ...x, ...patch };
    // 수량·단가를 입력하면 공급가액(=수량×단가) 자동 계산. 수량 미입력 시 1로 계산.
    if ("qty" in patch || "price" in patch) {
      const price = Number(n.price) || 0;
      const q = n.qty.trim() === "" ? 1 : Number(n.qty) || 0;
      const s = q * price;
      n.supply = s ? String(s) : "";
    }
    return n;
  }));
  const addItem = () => setItems((p) => (p.length >= 20 ? p : [...p, blankItem()]));
  const delItem = (i: number) => setItems((p) => (p.length <= 1 ? p : p.filter((_, idx) => idx !== i)));

  async function download() {
    setBusy(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const buf = await (await fetch("/발주서양식.xlsx")).arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      const ws = wb.worksheets[0];
      ws.getCell("B3").value = no;
      ws.getCell("G3").value = dateKor(date);
      ws.getCell("C5").value = company;
      ws.getCell("G5").value = ceo;
      ws.getCell("C6").value = tel;
      ws.getCell("G6").value = fax;
      items.slice(0, 20).forEach((it, i) => {
        const r = 13 + i, sup = supplyOf(it), vat = vatOf(it);
        ws.getCell(`B${r}`).value = it.name || "";
        ws.getCell(`C${r}`).value = it.spec || "";
        ws.getCell(`D${r}`).value = it.unit || "";
        ws.getCell(`E${r}`).value = Number(it.qty) || null;
        ws.getCell(`F${r}`).value = Number(it.price) || null;
        ws.getCell(`G${r}`).value = sup || null;
        ws.getCell(`H${r}`).value = vat || null;
        ws.getCell(`I${r}`).value = sup ? sup + vat : null;
        for (const col of ["E", "F", "G", "H", "I"]) ws.getCell(`${col}${r}`).numFmt = "#,##0";
      });
      ws.getCell("G33").value = totSupply || null;
      ws.getCell("H33").value = totVat || null;
      ws.getCell("I33").value = grand || null;
      for (const col of ["G", "H", "I"]) ws.getCell(`${col}33`).numFmt = "#,##0";
      ws.getCell("A39").value = dateKor(date);
      // 한 페이지에 맞춰 인쇄
      ws.pageSetup.orientation = "portrait";
      ws.pageSetup.fitToPage = true;
      ws.pageSetup.fitToWidth = 1;
      ws.pageSetup.fitToHeight = 1;
      ws.pageSetup.horizontalCentered = true;
      ws.pageSetup.margins = { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 };
      ws.pageSetup.printArea = "A1:I41";
      const out = await wb.xlsx.writeBuffer();
      const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `발주서_${company || "거래처"}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) {
      alert("발주서 생성 실패: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  // 미리보기·인쇄용 문서 HTML
  function bodyHtml() {
    const rows = items.filter((it) => it.name || supplyOf(it) > 0);
    const rowsHtml = (rows.length ? rows : [blankItem()]).map((it, i) => {
      const sup = supplyOf(it), vat = vatOf(it);
      return `<tr><td style="text-align:center">${i + 1}</td><td>${esc(it.name)}</td><td>${esc(it.spec)}</td><td style="text-align:center">${esc(it.unit)}</td><td style="text-align:right">${it.qty ? won(Number(it.qty)) : ""}</td><td style="text-align:right">${it.price ? won(Number(it.price)) : ""}</td><td style="text-align:right">${won(sup)}</td><td style="text-align:right">${won(vat)}</td><td style="text-align:right">${won(sup + vat)}</td></tr>`;
    }).join("");
    const dateK = dateKor(date);
    return `
      <h1>발 주 서</h1>
      <table class="kv"><colgroup><col style="width:14%"><col style="width:36%"><col style="width:14%"><col style="width:36%"></colgroup><tr>
        <th>발주번호</th><td>${esc(no)}</td><th>발주일</th><td>${esc(dateK)}</td>
      </tr></table>
      <table class="box">
        <colgroup><col style="width:8%"><col style="width:10%"><col style="width:32%"><col style="width:10%"><col style="width:40%"></colgroup>
        <tr><th rowspan="2" class="side">공급자</th><th>업체명</th><td>${esc(company)}</td><th>대표자</th><td>${esc(ceo)}</td></tr>
        <tr><th>전화</th><td>${esc(tel)}</td><th>팩스</th><td>${esc(fax)}</td></tr>
        <tr><th rowspan="2" class="side">발주자</th><th>업체명</th><td>㈜신정개발</td><th>담당자</th><td>정한솔</td></tr>
        <tr><th>전화</th><td>061-682-5537</td><th>팩스</th><td>061-683-5567</td></tr>
      </table>
      <p class="sec">■ 발주내역</p>
      <table class="items">
        <colgroup><col style="width:6%"><col style="width:20%"><col style="width:18%"><col style="width:7%"><col style="width:7%"><col style="width:12%"><col style="width:12%"><col style="width:9%"><col style="width:9%"></colgroup>
        <thead>
          <tr><th rowspan="2">NO</th><th rowspan="2">품목</th><th rowspan="2">규격 및 재질</th><th rowspan="2">단위</th><th rowspan="2">수량</th><th colspan="3">금액</th><th rowspan="2">합계금액</th></tr>
          <tr><th>단가</th><th>공급가액</th><th>세액</th></tr>
        </thead>
        <tbody>${rowsHtml}
          <tr class="sum"><td colspan="6">합 계</td><td class="r">${won(totSupply)}</td><td class="r">${won(totVat)}</td><td class="r">${won(grand)}</td></tr>
        </tbody>
      </table>
      <table class="kv"><tr><th style="width:14%">비고사항</th><td style="text-align:left">- 부가세 포함</td></tr></table>
      <p class="note2">위와 같은 내용으로 발주하오니 납기를 준수하여 납품해 주시기 바랍니다.</p>
      <p class="date">${dateK}</p>
      <p class="sign">㈜ 신 정 개 발</p>`;
  }
  const DOC_CSS = `body{font-family:'Malgun Gothic','맑은 고딕',sans-serif;color:#222;margin:0}
    h1{font-size:26px;text-align:center;letter-spacing:10px;margin:0 0 16px}
    table{border-collapse:collapse;width:100%;font-size:13px;margin-bottom:8px}
    .kv,.box{table-layout:auto} .items{table-layout:fixed}
    th,td{border:1px solid #888;padding:5px 7px}
    th{background:#eef2f8;text-align:center} .box .side{background:#e2e8f0;font-weight:bold}
    td{text-align:left}
    .kv th,.kv td,.box th,.box td{white-space:nowrap}
    .items td{text-align:right;white-space:nowrap}
    .items td:nth-child(2),.items td:nth-child(3){text-align:left;white-space:normal;word-break:break-all}
    .items td:nth-child(1),.items td:nth-child(4){text-align:center}
    .items .sum td{background:#eef2f8;font-weight:bold;text-align:center} .items .sum td.r{text-align:right}
    .sec{font-weight:bold;margin:12px 0 4px} .note2{text-align:center;margin:22px 0 4px;font-size:13px}
    .date{text-align:center;font-size:14px;margin:6px 0} .sign{text-align:center;font-size:16px;font-weight:bold;letter-spacing:2px;margin:4px 0}
    @page{size:A4;margin:14mm}`;
  function printPDF() {
    const ifr = document.createElement("iframe");
    ifr.style.position = "fixed"; ifr.style.right = "0"; ifr.style.bottom = "0"; ifr.style.width = "0"; ifr.style.height = "0"; ifr.style.border = "0";
    document.body.appendChild(ifr);
    const doc = ifr.contentWindow!.document;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>발주서_${esc(company)}</title><style>${DOC_CSS}</style></head><body>${bodyHtml()}</body></html>`);
    doc.close();
    ifr.contentWindow!.focus();
    setTimeout(() => { ifr.contentWindow!.print(); setTimeout(() => document.body.removeChild(ifr), 1000); }, 300);
  }

  const field = "rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none";
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/60 p-3 sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          <p className="text-sm font-bold text-slate-800">발주서 — {vendor.name}</p>
          <button onClick={() => setPreview(true)} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
            <Eye className="h-3.5 w-3.5" /> 미리보기
          </button>
          <button onClick={printPDF} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
            <Printer className="h-3.5 w-3.5" /> PDF 저장
          </button>
          <button onClick={download} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            <Download className="h-3.5 w-3.5" /> {busy ? "생성 중…" : "엑셀"}
          </button>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 p-4">
          <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-center text-2xl font-bold tracking-widest text-slate-800">발 주 서</h2>

            <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
              <label className="flex items-center gap-2"><span className="w-16 shrink-0 text-xs font-semibold text-slate-500">발주번호</span><input value={no} onChange={(e) => setNo(e.target.value)} className={`${field} flex-1`} /></label>
              <label className="flex items-center gap-2"><span className="w-16 shrink-0 text-xs font-semibold text-slate-500">발주일</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${field} flex-1`} /></label>
            </div>

            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-xs font-bold text-slate-600">공급자 (거래처)</p>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2"><span className="w-12 shrink-0 text-xs text-slate-500">업체명</span><input value={company} onChange={(e) => setCompany(e.target.value)} className={`${field} flex-1`} /></label>
                  <label className="flex items-center gap-2"><span className="w-12 shrink-0 text-xs text-slate-500">대표자</span><input value={ceo} onChange={(e) => setCeo(e.target.value)} className={`${field} flex-1`} /></label>
                  <label className="flex items-center gap-2"><span className="w-12 shrink-0 text-xs text-slate-500">전화</span><input value={tel} onChange={(e) => setTel(e.target.value)} className={`${field} flex-1`} /></label>
                  <label className="flex items-center gap-2"><span className="w-12 shrink-0 text-xs text-slate-500">팩스</span><input value={fax} onChange={(e) => setFax(e.target.value)} className={`${field} flex-1`} /></label>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-bold text-slate-600">발주자</p>
                <div className="space-y-1 text-sm text-slate-700">
                  <p>업체명: <b>㈜신정개발</b></p>
                  <p>담당자: 정한솔</p>
                  <p>전화: 061-682-5537 · 팩스: 061-683-5567</p>
                </div>
              </div>
            </div>

            <p className="mb-1 text-xs font-bold text-slate-600">■ 발주내역</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs [&_input]:w-full [&_input]:bg-transparent [&_input]:px-1 [&_input]:py-1 [&_input]:outline-none [&_td]:border [&_td]:border-slate-200 [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-1 [&_th]:py-1">
                <thead>
                  <tr><th>NO</th><th>품목</th><th>규격/재질</th><th>단위</th><th>수량</th><th>단가</th><th>공급가액</th><th>세액</th><th>합계</th><th></th></tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td className="text-center text-slate-400">{i + 1}</td>
                      <td><input value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} placeholder="품목" /></td>
                      <td><input value={it.spec} onChange={(e) => setItem(i, { spec: e.target.value })} /></td>
                      <td className="w-12"><input value={it.unit} onChange={(e) => setItem(i, { unit: e.target.value })} className="text-center" /></td>
                      <td className="w-16"><input inputMode="numeric" value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value.replace(/[^\d]/g, "") })} className="text-right" /></td>
                      <td className="w-24"><input inputMode="numeric" value={it.price ? Number(it.price).toLocaleString("ko-KR") : ""} onChange={(e) => setItem(i, { price: e.target.value.replace(/[^\d]/g, "") })} className="text-right" /></td>
                      <td className="w-24"><input inputMode="numeric" value={it.supply ? Number(it.supply).toLocaleString("ko-KR") : ""} onChange={(e) => setItem(i, { supply: e.target.value.replace(/[^\d]/g, "") })} className="text-right" placeholder="공급가액" /></td>
                      <td className="w-20 text-right text-slate-600">{won(vatOf(it))}</td>
                      <td className="w-24 text-right font-medium text-slate-700">{won(supplyOf(it) + vatOf(it))}</td>
                      <td className="w-7 text-center">{items.length > 1 && <button onClick={() => delItem(i)} className="text-slate-300 hover:text-red-500"><Trash2 className="mx-auto h-3.5 w-3.5" /></button>}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td colSpan={6} className="bg-slate-50 py-1 text-center">합 계</td>
                    <td className="bg-slate-50 py-1 text-right">{won(totSupply)}</td>
                    <td className="bg-slate-50 py-1 text-right">{won(totVat)}</td>
                    <td className="bg-slate-50 py-1 text-right text-blue-700">{won(grand)}</td>
                    <td className="bg-slate-50"></td>
                  </tr>
                </tbody>
              </table>
            </div>
            {items.length < 20 && (
              <button onClick={addItem} className="mt-2 inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" /> 품목 추가</button>
            )}
            <p className="mt-2 text-[11px] text-slate-400">※ 수량·단가를 입력하면 공급가액·세액(10%)·합계가 자동 계산됩니다. 비고: 부가세 포함.</p>
          </div>
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[110] flex flex-col bg-black/70 p-3 sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) setPreview(false); }} role="dialog" aria-modal="true">
          <div className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
              <p className="text-sm font-bold text-slate-800">발주서 미리보기</p>
              <button onClick={printPDF} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"><Printer className="h-3.5 w-3.5" /> PDF 저장</button>
              <button onClick={() => setPreview(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">닫기</button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-100 p-4">
              <div className="mx-auto bg-white p-6 shadow" style={{ width: "794px", maxWidth: "100%" }} dangerouslySetInnerHTML={{ __html: `<style>${DOC_CSS}</style>` + bodyHtml() }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VendorsInner({ data }: { data: Data }) {
  const [cho, setCho] = useState("ㄱ");
  const [q, setQ] = useState("");
  const [po, setPo] = useState<Vendor | null>(null);
  const query = q.trim().toLowerCase();

  const groups = useMemo(() => {
    const present = new Set(data.vendors.map((v) => choOf(v.name)));
    return ["전체", ...ORDER.filter((g) => present.has(g))];
  }, [data.vendors]);

  const rowFilter = (v: Vendor) => {
    if (query) return [v.name, v.bizNo, v.ceo, v.note].some((f) => (f ?? "").toLowerCase().includes(query));
    return cho === "전체" || choOf(v.name) === cho;
  };
  const shown = data.vendors.filter(rowFilter).length;

  return (
    <div className="space-y-5">
      {/* 발주서 양식 */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
        <div className="mr-auto">
          <p className="text-sm font-bold text-slate-800">📄 발주서 양식</p>
          <p className="text-xs text-slate-500">아래 <b>거래처명을 클릭</b>하면 그 거래처로 발주서를 작성·미리보기하고 바로 엑셀로 내려받을 수 있습니다.</p>
        </div>
        <a href="/발주서양식.xlsx" download className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
          <Download className="h-3.5 w-3.5" /> 빈 양식 다운로드
        </a>
      </div>

      <Section title={`🏢 거래처 — ${shown}곳${query ? " (검색)" : cho === "전체" ? "" : ` (${cho})`}`} sub="거래처명 클릭 → 발주서 작성 · ✎ 로 정보 수정 · '거래처 추가'로 등록">
        <div className="mb-3 space-y-2.5">
          <div className="relative max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="거래처명·사업자번호·대표자·주소 검색" className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-8 text-sm focus:border-blue-400 focus:outline-none" />
            {q && <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="지우기">✕</button>}
          </div>
          <div className={`flex flex-wrap gap-1.5 ${query ? "opacity-40" : ""}`}>
            {groups.map((g) => (
              <button key={g} onClick={() => { setQ(""); setCho(g); }} className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${!query && cho === g ? "bg-blue-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{g}</button>
            ))}
          </div>
        </div>
        <EditableTable
          rows={data.vendors}
          rowFilter={rowFilter}
          onRowClick={(v) => setPo(v)}
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

      {po && <PurchaseOrderModal vendor={po} onClose={() => setPo(null)} />}
    </div>
  );
}

export default function VendorsPage() {
  return <WithData>{(data) => <VendorsInner data={data} />}</WithData>;
}
