import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/dashboard/StatCard";
import { BarChart3, Users, Wallet } from "lucide-react";
import { clinic, unwrap } from "../../services/clinicService";
export default function ReportsPage() {
  const [range, setRange] = useState("weekly"),
    [d, setD] = useState<any>(null);
  useEffect(() => {
    clinic.reports(range).then((r) => setD(unwrap(r)));
  }, [range]);
  const max = Math.max(...(d?.chart || []).map((x: any) => x.visits), 1);
  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Daily, weekly and monthly visits and revenue."
        action={
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Visits"
          value={d?.totalVisits ?? 0}
          icon={Users}
        />
        <StatCard
          label="Revenue"
          value={`Rp ${(d?.totalRevenue ?? 0).toLocaleString("id-ID")}`}
          icon={Wallet}
          tone="emerald"
        />
        <StatCard
          label="Data Points"
          value={d?.chart?.length ?? 0}
          icon={BarChart3}
          tone="violet"
        />
      </div>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-bold">Visit Trend</h2>
        <div className="mt-8 flex h-64 items-end gap-3 overflow-x-auto">
          {(d?.chart || []).map((x: any) => (
            <div
              key={x.date}
              className="flex min-w-10 flex-1 flex-col items-center justify-end gap-2"
            >
              <div
                title={`${x.visits} visits`}
                className="w-full max-w-12 rounded-t-lg bg-indigo-500"
                style={{ height: `${Math.max(8, (x.visits / max) * 190)}px` }}
              />
              <span className="text-[10px] text-slate-400">
                {x.date.slice(5)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
