"use client";

import AutoAnnouncements from "@/components/AutoAnnouncements";

/** 지원사업 공고 — 매일 08:00 자동 수집. 상단 출처 필터(전남테크노파크/중기청)로 나눠 본다. */
export default function FundingPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">지원사업 공고</h1>
        <p className="mt-1 text-sm text-slate-500">매일 오전 8시에 전남테크노파크·중기청(SMTECH)에서 자동 수집합니다. 상단에서 출처를 선택해 보세요.</p>
      </div>
      <AutoAnnouncements />
    </div>
  );
}
