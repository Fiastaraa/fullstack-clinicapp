import type { LucideIcon } from "lucide-react";
export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = "indigo",
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "indigo" | "cyan" | "emerald" | "amber" | "rose" | "violet";
  hint?: string;
}) {
  const tones = {
    indigo: "bg-[#1B3C53] text-white",
    cyan: "bg-[#DCD7C9] text-[#1B3C53]",
    emerald: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    amber: "bg-amber-50 text-amber-900 border border-amber-200",
    rose: "bg-rose-50 text-rose-900 border border-rose-200",
    violet: "bg-slate-100 text-[#1B3C53] border border-slate-200",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-extrabold text-[#1B3C53]">{value}</p>
          {hint && <p className="mt-1 text-[11px] font-medium text-slate-500">{hint}</p>}
        </div>
        <div
          className={`grid h-10 w-10 place-items-center rounded-lg shrink-0 ${tones[tone]}`}
        >
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}
