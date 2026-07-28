"use client";

import { useRef } from "react";
import { fmtDate, fmtKWon } from "@/lib/excel";
import { Empty, Section } from "@/components/ui";
import { WithData } from "@/components/FileGate";
import { useAgreementFiles } from "@/lib/agreement-files";
import DocViewButton from "@/components/DocViewButton";

export default function AgreementsPage() {
  const { count, loadFolder, getFile, clear } = useAgreementFiles();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <WithData>
      {(data) => {
        const rows = data.agreements;
        const matched = rows.filter((a) => getFile(a.fileName)).length;
        return (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-slate-900">협약서</h1>
              <p className="mt-1 text-sm text-slate-500">
                사업별 협약서 원본을 브라우저에서 열람합니다. 파일은 이 서비스·GitHub에 저장되지 않으며,
                폴더를 선택한 본인에게만 보입니다(서버 전송 없음).
              </p>
            </div>

            {/* 협약서 폴더 로드 */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-emerald-800">
                  🔒 협약서 폴더를 선택하면 과제별로 자동 연결됩니다. {count > 0 && <b>{count}개 파일 로드됨 · {matched}/{rows.length}건 매칭</b>}
                </p>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => inputRef.current?.click()} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
                    협약서 폴더 선택
                  </button>
                  {count > 0 && (
                    <button onClick={clear} className="rounded-lg border border-emerald-300 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-100">
                      로드 해제
                    </button>
                  )}
                </div>
                {/* webkitdirectory: 폴더 내 파일을 브라우저 메모리로만 읽음 */}
                <input
                  ref={inputRef}
                  type="file"
                  // @ts-expect-error webkitdirectory는 표준 타입에 없음
                  webkitdirectory=""
                  directory=""
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && loadFolder(e.target.files)}
                />
              </div>
              <p className="mt-2 text-xs text-emerald-700">
                다운로드 버튼은 제공하지 않습니다. 협약서는 계약금액·직인·서명이 담긴 민감 문서이므로 열람만 지원합니다.
              </p>
            </div>

            <Section title={`📜 사업별 협약서 — ${rows.length}건`} sub="총사업비·전담기관은 협약서 원본 기준">
              {rows.length === 0 ? (
                <Empty message="엑셀 [협약서] 시트에 등록된 항목이 없습니다." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr><th>과제</th><th>사업명</th><th>협약일</th><th className="text-right">총사업비</th><th>전담기관</th><th>협약서</th><th>비고</th></tr>
                    </thead>
                    <tbody>
                      {rows.map((a, i) => {
                        const file = getFile(a.fileName);
                        return (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="whitespace-nowrap font-mono text-xs">{a.code}</td>
                            <td className="font-medium">{a.program}</td>
                            <td className="whitespace-nowrap text-xs">{fmtDate(a.signedAt)}</td>
                            <td className="whitespace-nowrap text-right">{fmtKWon(a.totalKWon)}</td>
                            <td className="text-xs">{a.agency ?? "—"}</td>
                            <td>
                              <div className="flex items-center gap-2">
                                <DocViewButton file={file} />
                                {a.fileName && !file && count > 0 && (
                                  <span className="text-xs text-amber-600" title={a.fileName}>폴더에 없음</span>
                                )}
                              </div>
                            </td>
                            <td className="max-w-64 text-xs text-slate-400">{a.note ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </div>
        );
      }}
    </WithData>
  );
}
