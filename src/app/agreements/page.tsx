"use client";

import { useRef } from "react";
import { fmtKWon } from "@/lib/excel";
import { Section } from "@/components/ui";
import { WithData } from "@/components/FileGate";
import { useAgreementFiles } from "@/lib/agreement-files";
import { EditableTable, dateStr, type Col } from "@/components/EditableTable";
import DocViewButton from "@/components/DocViewButton";
import type { Agreement } from "@/lib/excel";

const EMPTY: Agreement = { code: "", program: "", fileName: null, signedAt: null, totalKWon: null, agency: null, note: null };

export default function AgreementsPage() {
  const { count, cloud, loading, uploading, error, loadFolder, getByName } = useAgreementFiles();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <WithData>
      {(data) => {
        const matched = data.agreements.filter((a) => getByName(a.fileName)).length;
        const cols: Col<Agreement>[] = [
          { key: "code", label: "과제코드", th: "과제" },
          { key: "program", label: "사업명", span: true, view: (a) => <span className="font-medium">{a.program}</span> },
          { key: "signedAt", label: "협약일", type: "date" },
          { key: "totalKWon", label: "총사업비(천원)", type: "number", align: "right", th: "총사업비", view: (a) => <span className="font-semibold">{fmtKWon(a.totalKWon)}</span> },
          { key: "agency", label: "전문/전담기관", th: "전담기관" },
          { key: "fileName", label: "협약서 파일명(연결)", th: "협약서", view: (a) => <DocViewButton doc={getByName(a.fileName)} /> },
          { key: "note", label: "비고", span: true, hide: true },
        ];
        const toRow = (a: Agreement) => ({
          과제코드: a.code, 사업명: a.program, "협약서 파일명": a.fileName, 협약일: dateStr(a.signedAt),
          "총사업비(천원)": a.totalKWon, "전문/전담기관": a.agency, 비고: a.note,
        });

        return (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">협약서</h1>
              <p className="mt-1 text-sm text-slate-500">
                {cloud ? "로그인하면 협약서 파일이 자동 연결됩니다. 계약 문서라 목록은 추가만 가능하며, 다운로드 없이 열람만 지원합니다." : "협약서 폴더를 선택하면 과제별로 연결됩니다."}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-emerald-800">
                  {cloud ? "☁ " : "🔒 "}
                  {cloud ? (loading ? "협약서 불러오는 중…" : `클라우드 협약서 ${count}건 로드됨 · ${matched}/${data.agreements.length}건 매칭`) : "협약서 폴더를 선택하면 과제별로 자동 연결됩니다."}
                </p>
                <button onClick={() => inputRef.current?.click()} disabled={uploading} className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                  {uploading ? "업로드 중…" : cloud ? "협약서 폴더 업로드" : "협약서 폴더 선택"}
                </button>
                <input ref={inputRef} type="file"
                  // @ts-expect-error webkitdirectory는 표준 타입에 없음
                  webkitdirectory="" directory="" multiple className="hidden"
                  onChange={(e) => e.target.files && loadFolder(e.target.files, "agreements")} />
              </div>
              <p className="mt-2 text-xs text-emerald-700">협약서는 계약금액·직인이 담긴 민감 문서입니다. 로그인 사용자만 열람하며 다운로드 없이 보기만 지원합니다.</p>
              {error && <p className="mt-2 text-sm font-medium text-red-600">⚠ {error}</p>}
            </div>

            <Section title={`📜 협약 목록 — ${data.agreements.length}건`} sub="계약 문서이므로 '추가'만 가능합니다(수정·삭제 없음). 파일명을 올린 협약서 파일과 같게 입력하면 자동 연결됩니다.">
              <EditableTable
                rows={data.agreements}
                cols={cols}
                sheetName="협약서"
                toSheetRow={toRow}
                blank={EMPTY}
                requiredKey="code"
                addLabel="협약서 추가"
                entityLabel="협약서"
                addOnly
              />
            </Section>
          </div>
        );
      }}
    </WithData>
  );
}
