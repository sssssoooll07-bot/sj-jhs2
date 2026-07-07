export function Badge({ tone = "slate", children }: { tone?: "slate" | "blue" | "green" | "red" | "amber" | "violet" | "cyan"; children: React.ReactNode }) {
  const map = {
    slate: "bg-slate-100 text-slate-600",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    violet: "bg-violet-100 text-violet-700",
    cyan: "bg-cyan-100 text-cyan-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[tone]}`}>{children}</span>;
}

export function Dday({ days }: { days: number }) {
  const label = days === 0 ? "D-DAY" : days > 0 ? `D-${days}` : `D+${-days}`;
  const tone = days < 0 ? "bg-red-600 text-white" : days <= 7 ? "bg-red-100 text-red-700" : days <= 30 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${tone}`}>{label}</span>;
}

export function Empty({ message }: { message: string }) {
  return <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-8 text-center text-sm text-slate-500">{message}</div>;
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
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-slate-700">{title}</h2>
      {sub && <p className="mb-3 mt-0.5 text-xs text-slate-400">{sub}</p>}
      <div className={sub ? "" : "mt-3"}>{children}</div>
    </section>
  );
}
