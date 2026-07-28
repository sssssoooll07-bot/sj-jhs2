"use client";

import { useEffect, useState } from "react";

/** 로컬 문서를 새 탭에서 미리보기(다운로드 버튼 없음). blob URL은 사용 후 해제한다. */
export default function DocViewButton({ file }: { file: File | null }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  if (!file) return <span className="text-xs text-slate-400">미로드</span>;

  const viewable = /\.(pdf|png|jpe?g)$/i.test(file.name);
  if (!viewable) {
    return (
      <span className="text-xs text-slate-400" title="브라우저에서 직접 열 수 없는 형식(HWP 등)">
        파일 있음(뷰어 미지원)
      </span>
    );
  }
  function open() {
    const u = URL.createObjectURL(file!);
    setUrl(u);
    window.open(u, "_blank", "noopener,noreferrer");
  }
  return (
    <button onClick={open} className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50">
      보기 ↗
    </button>
  );
}
