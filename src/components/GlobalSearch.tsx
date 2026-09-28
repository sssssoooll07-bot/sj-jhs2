"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useDataCtx } from "@/lib/data-context";
import { useAccess } from "@/lib/access-context";
import type { SectionKey } from "@/lib/sections";

type Hit = { type: string; label: string; sub?: string | null; href: string };

/** 전역 통합 검색 — 과제·특허·거래처·인증·연구원 (열람 권한 범위 내에서만) */
export default function GlobalSearch() {
  const { data } = useDataCtx();
  const { allowed } = useAccess();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const blurT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hits = useMemo<Hit[]>(() => {
    const s = q.trim().toLowerCase();
    if (!data || s.length < 1) return [];
    const has = (...vals: (string | null | undefined)[]) => vals.some((v) => (v ?? "").toLowerCase().includes(s));
    const can = (k: SectionKey) => allowed(k);
    const out: Hit[] = [];
    if (can("projects")) for (const p of data.projects) if (has(p.title, p.code, p.agency)) out.push({ type: "과제", label: p.title, sub: p.code, href: `/projects?p=${encodeURIComponent(p.code)}` });
    if (can("patents")) for (const p of data.patents) if (has(p.title, p.regNumber, p.appNumber)) out.push({ type: "특허", label: p.title, sub: p.regNumber ?? p.appNumber, href: "/patents" });
    if (can("vendors")) for (const v of data.vendors) if (has(v.name, v.ceo, v.bizNo)) out.push({ type: "거래처", label: v.name, sub: v.ceo, href: "/vendors" });
    if (can("certifications")) for (const c of data.certifications) if (has(c.name, c.issuer)) out.push({ type: "인증", label: c.name, sub: c.category, href: "/certifications" });
    if (can("researchers")) for (const r of data.researchers) if (has(r.name, r.major, r.university)) out.push({ type: "연구원", label: r.name, sub: r.position, href: "/researchers" });
    return out.slice(0, 12);
  }, [q, data, allowed]);

  if (!data) return null;

  const go = (h: Hit) => { setQ(""); setOpen(false); router.push(h.href); };

  return (
    <div className="relative mb-4">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { blurT.current = setTimeout(() => setOpen(false), 150); }}
        onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); (e.target as HTMLInputElement).blur(); } else if (e.key === "Enter" && hits[0]) go(hits[0]); }}
        placeholder="통합 검색 — 과제·특허·거래처·인증·연구원"
        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm focus:border-blue-400 focus:outline-none"
      />
      {open && q.trim() && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
          onMouseDown={() => { if (blurT.current) clearTimeout(blurT.current); }}>
          {hits.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">검색 결과가 없습니다.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-50 overflow-y-auto">
              {hits.map((h, i) => (
                <li key={i}>
                  <button onClick={() => go(h)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-blue-50">
                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{h.type}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{h.label}</span>
                    {h.sub && <span className="shrink-0 truncate text-xs text-slate-400">{h.sub}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
