"use client";

import { useRef } from "react";
import { useDataCtx } from "@/lib/data-context";
import { useAgreementFiles } from "@/lib/agreement-files";
import { fmtDate } from "@/lib/excel";
import { Badge, Empty, Section } from "@/components/ui";
import { EditableTable, type Col } from "@/components/EditableTable";
import DocViewButton from "@/components/DocViewButton";
import type { LibraryDoc } from "@/lib/excel";

/**
 * 자료실 — 지원사업 신청 시 자주 쓰는 서류의 발급처 바로가기 + 특허증 + 사내 보관함 링크.
 * 보안 원칙상 서류 파일 자체는 서버·저장소에 올리지 않는다(특허증은 로그인 사용자만 열람).
 */

const PRIMARY = [
  { name: "4대보험 가입자명부", issuer: "4대사회보험 정보연계센터", url: "https://www.4insure.or.kr/", guide: "로그인(사업장) → 증명서 발급/신청 → 가입자명부", icon: "🧾" },
  { name: "재무제표 (표준재무제표증명)", issuer: "국세청 홈택스", url: "https://www.hometax.go.kr/", guide: "민원증명 → 표준재무제표증명 발급", icon: "📊" },
];

const SECONDARY = [
  { name: "사업자등록증명", issuer: "홈택스", url: "https://www.hometax.go.kr/" },
  { name: "국세 납세증명서", issuer: "홈택스", url: "https://www.hometax.go.kr/" },
  { name: "지방세 납세증명서", issuer: "위택스", url: "https://www.wetax.go.kr/" },
  { name: "중소기업확인서", issuer: "중소기업현황정보시스템", url: "https://sminfo.mss.go.kr/" },
  { name: "기업부설연구소 인정서", issuer: "KOITA 연구소/전담부서 신고관리시스템", url: "https://www.rnd.or.kr/" },
];

const LIB_EMPTY: LibraryDoc = { category: null, name: "", url: null, note: null };
const LIB_COLS: Col<LibraryDoc>[] = [
  { key: "category", label: "구분", view: (d) => (d.category ? <Badge tone="blue">{d.category}</Badge> : "—") },
  { key: "name", label: "서류명", span: true },
  { key: "url", label: "링크(URL)", th: "링크", view: (d) => (d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">열기 ↗</a> : "—") },
  { key: "note", label: "비고", span: true, hide: true },
];
const libRow = (d: LibraryDoc) => ({ 구분: d.category, 서류명: d.name, "발급처·링크": d.url, 비고: d.note });

export default function LibraryPage() {
  const { data } = useDataCtx();
  const { count, cloud, loading, uploading, error: certError, loadFolder, getByPattern } = useAgreementFiles();
  const certInputRef = useRef<HTMLInputElement>(null);

  const registered = (data?.patents ?? [])
    .filter((p) => p.status === "등록완료")
    .sort((a, b) => +(a.registeredAt ?? 0) - +(b.registeredAt ?? 0));
  const norm = (s: string) => s.replace(/[\s()·∙\-_]/g, "").toLowerCase();
  const findCert = (regNumber: string | null, title: string) => {
    const byNum = regNumber ? getByPattern(regNumber, "patents") : null;
    if (byNum) return byNum;
    const prefix = norm(title).slice(0, 5);
    return prefix.length >= 4 ? getByPattern(prefix, "patents") : null;
  };
  const matchedCount = registered.filter((p) => findCert(p.regNumber, p.title)).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">자료실</h1>
        <p className="mt-1 text-sm text-slate-500">지원사업 신청에 자주 쓰는 서류 발급처 · 특허증 · 사내 보관함 링크 모음.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PRIMARY.map((d) => (
          <a key={d.name} href={d.url} target="_blank" rel="noreferrer" className="card p-5 transition-shadow hover:shadow-md">
            <p className="text-2xl">{d.icon}</p>
            <p className="mt-2 text-base font-bold text-slate-900">{d.name} <span className="text-sm font-normal text-blue-600">↗</span></p>
            <p className="mt-0.5 text-sm text-slate-500">{d.issuer}</p>
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-500">발급 경로: {d.guide}</p>
          </a>
        ))}
      </div>

      <Section title="🏛 기타 발급처 바로가기" sub="지원사업 신청 시 함께 요구되는 경우가 많은 서류">
        <table className="table-base">
          <thead><tr><th>서류명</th><th>발급처</th><th>바로가기</th></tr></thead>
          <tbody>
            {SECONDARY.map((d) => (
              <tr key={d.name} className="hover:bg-slate-50">
                <td className="font-medium">{d.name}</td>
                <td className="text-xs">{d.issuer}</td>
                <td><a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">{d.url.replace("https://", "").replace(/\/$/, "")} ↗</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-emerald-800">
            {cloud ? "☁ " : "🏅 "}
            {cloud ? (loading ? "특허증 불러오는 중…" : `클라우드 특허증 ${count}건 로드됨 · ${matchedCount}/${registered.length}건 매칭`) : "특허증 폴더를 선택하면 등록특허별로 자동 연결됩니다."}
          </p>
          <button onClick={() => certInputRef.current?.click()} disabled={uploading} className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {uploading ? "업로드 중…" : cloud ? "특허증 폴더 업로드" : "특허증 폴더 선택"}
          </button>
          <input ref={certInputRef} type="file"
            // @ts-expect-error webkitdirectory는 표준 타입에 없음
            webkitdirectory="" directory="" multiple className="hidden"
            onChange={(e) => e.target.files && loadFolder(e.target.files, "patents")} />
        </div>
        <p className="mt-2 text-xs text-emerald-700">특허증은 로그인한 사용자만 접근하며, 한 번 업로드하면 이후엔 로그인만 하면 자동으로 보입니다(다운로드 없이 열람만).</p>
        {certError && <p className="mt-2 text-sm font-medium text-red-600">⚠ {certError}</p>}
      </div>

      <Section title={`📜 특허증 — 등록특허 ${registered.length}건`} sub="등록번호 순 · 특허 탭의 등록완료 특허와 연결">
        {registered.length === 0 ? (
          <Empty message="등록완료 특허가 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>특허 명칭</th><th>등록번호</th><th>등록일</th><th>특허권자</th><th>특허증</th></tr></thead>
              <tbody>
                {registered.map((p, i) => {
                  const cert = findCert(p.regNumber, p.title);
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="font-medium">{p.title}</td>
                      <td className="font-mono text-xs">{p.regNumber ?? "—"}</td>
                      <td className="whitespace-nowrap text-xs">{fmtDate(p.registeredAt)}</td>
                      <td className="text-xs">{p.owner ?? "—"}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <DocViewButton doc={cert} />
                          {!cert && count > 0 && <span className="text-xs text-amber-600">폴더에 없음</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="🗂 사내 보관함" sub="자주 쓰는 파일의 사내 공유드라이브 링크. '서류 추가'로 등록하면 저장됩니다(구분·서류명·링크).">
        {data ? (
          <EditableTable rows={data.library} cols={LIB_COLS} sheetName="자료실" toSheetRow={libRow} blank={LIB_EMPTY} requiredKey="name" addLabel="서류 추가" entityLabel="서류" emptyMessage="등록된 사내 보관함 링크가 없습니다. '서류 추가'로 등록하세요." />
        ) : (
          <Empty message="로그인하면 사내 보관함을 편집할 수 있습니다." />
        )}
      </Section>
    </div>
  );
}
