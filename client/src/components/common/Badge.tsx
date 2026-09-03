export default function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  const m: any = {
    slate: "bg-slate-50 text-slate-700 border border-slate-200",
    navy: "bg-[#1B3C53]/10 text-[#1B3C53] border border-[#1B3C53]/20",
    sand: "bg-[#DCD7C9]/50 text-[#1B3C53] border border-[#DCD7C9]",
    amber: "bg-amber-50 text-amber-900 border border-amber-200",
    cyan: "bg-sky-50 text-sky-900 border border-sky-200",
    emerald: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    rose: "bg-rose-50 text-rose-800 border border-rose-200",
    violet: "bg-purple-50 text-purple-800 border border-purple-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold tracking-tight ${m[tone] || m.slate}`}
    >
      {children}
    </span>
  );
}
