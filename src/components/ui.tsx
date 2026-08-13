export function Badge({ tone = "slate", children }: { tone?: "slate" | "blue" | "green" | "red" | "amber" | "violet" | "cyan"; children: React.ReactNode }) {
  const map = {
    slate: "bg-slate-50 text-slate-600 ring-slate-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
    cyan: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${map[tone]}`}>{children}</span>;
}

export function Dday({ days }: { days: number }) {
  const label = days === 0 ? "D-DAY" : days > 0 ? `D-${days}` : `D+${-days}`;
  const tone =
    days < 0 ? "bg-red-600 text-white ring-red-600"
    : days <= 7 ? "bg-red-50 text-red-700 ring-red-200"
    : days <= 30 ? "bg-amber-50 text-amber-700 ring-amber-200"
    : "bg-slate-50 text-slate-600 ring-slate-200";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${tone}`}>{label}</span>;
}

export function Empty({ message }: { message: string }) {
  return <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-10 text-center text-sm text-slate-400">{message}</div>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    ["진행중", "선정", "등록완료", "유효"].includes(status) ? "green"
    : ["완료", "관심"].includes(status) ? "slate"
    : ["탈락", "거절", "만료"].includes(status) ? "red"
    : ["검토중", "신청완료"].includes(status) ? "blue"
    : "amber";
  return <Badge tone={tone as never}>{status}</Badge>;
}

export function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-2.5">
        <span className="mt-1 h-4 w-1 shrink-0 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500" />
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight text-slate-800">{title}</h2>
          {sub && <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
