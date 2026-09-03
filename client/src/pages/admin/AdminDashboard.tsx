import {
  Activity,
  Clock3,
  Receipt,
  Users,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/dashboard/StatCard";
import Badge from "../../components/common/Badge";
import { getAdminDashboard } from "../../services/adminService";

const money = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
export default function AdminDashboard() {
  const [d, setD] = useState<any>({
    todayVisits: 0,
    waiting: 0,
    inConsultation: 0,
    completed: 0,
    paid: 0,
    unpaidInvoices: 0,
    todayRevenue: 0,
    queue: [],
  });
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setD((await getAdminDashboard()).data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Today's overview, queue and payment operations."
        action={
          <button
            onClick={load}
            className="ad-btn border border-[#dfe3ea] bg-white text-[#101a3d]"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Patients Today" value={d.todayVisits} icon={Users} />
        <StatCard
          label="In Queue"
          value={d.waiting}
          icon={Clock3}
          tone="amber"
        />
        <StatCard
          label="In Consultation"
          value={d.inConsultation}
          icon={Activity}
          tone="cyan"
        />
        <StatCard
          label="Completed"
          value={d.completed}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard label="Paid" value={d.paid} icon={Receipt} tone="violet" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_.9fr]">
        <section className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 p-5 bg-white">
            <div>
              <h2 className="text-base font-extrabold text-[#1B3C53]">Antrean Pasien Hari Ini</h2>
              <p className="text-xs text-slate-500 font-medium">
                Status alur pelayanan rawat jalan poliklinik
              </p>
            </div>
            <Link
              to="/dashboard/admin/queue"
              className="text-xs font-bold text-[#1B3C53] hover:underline flex items-center gap-1"
            >
              Lihat antrean lengkap <ArrowRight size={13} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Pasien</th>
                  <th>Waktu</th>
                  <th>Dokter</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(d.queue || []).map((v: any) => (
                  <tr key={v.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5 font-bold text-[#1B3C53]">
                      {v.patient?.name}
                    </td>
                    <td className="text-slate-500 font-medium">
                      {new Date(v.visitDate).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="text-slate-700 font-medium">{v.doctor?.name}</td>
                    <td>
                      <Badge
                        tone={
                          v.status === "WAITING"
                            ? "amber"
                            : v.status === "IN_CONSULTATION"
                              ? "cyan"
                              : "emerald"
                        }
                      >
                        {v.status.replaceAll("_", " ")}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {(!d.queue || d.queue.length === 0) && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-xs text-slate-400">
                      Belum ada kunjungan tercatat hari ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#1B3C53] text-white">
                  <WalletCards size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Ringkasan Keuangan
                  </p>
                  <h2 className="text-base font-extrabold text-[#1B3C53]">Pendapatan Hari Ini</h2>
                </div>
              </div>
              <span className="rounded-md bg-[#DCD7C9]/40 px-2 py-0.5 text-xs font-bold text-[#1B3C53] border border-[#DCD7C9]">
                Live
              </span>
            </div>

            <div>
              <p className="text-3xl font-black text-[#1B3C53]">{money(d.todayRevenue)}</p>
              <p className="text-xs text-slate-400 mt-1">Total pembayaran berhasil divalidasi kasir</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-[11px] font-semibold text-slate-500">Tagihan Belum Lunas</p>
                <b className="text-xl font-extrabold text-[#1B3C53]">{d.unpaidInvoices}</b>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-[11px] font-semibold text-slate-500">Selesai Berobat</p>
                <b className="text-xl font-extrabold text-emerald-700">{d.completed}</b>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Aktivitas Kunjungan</h3>
              <span className="text-xs text-slate-400 font-medium">Jam Operasional</span>
            </div>
            <div className="mt-4 flex h-28 items-end gap-2">
              {[35, 52, 44, 62, 58, 78, 68, 84, 72, 92].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-[#1B3C53] hover:opacity-80 transition"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-slate-400 font-mono">
              <span>08:00</span>
              <span>10:00</span>
              <span>12:00</span>
              <span>14:00</span>
              <span>16:00</span>
              <span>18:00</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
