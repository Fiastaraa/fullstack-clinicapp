import {
  Pill,
  PackageCheck,
  Clock3,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/dashboard/StatCard";
import { clinic, unwrap } from "../../services/clinicService";
import Badge from "../../components/common/Badge";
export default function PharmacistDashboard() {
  const [visits, setVisits] = useState<any[]>([]);
  const load = () => clinic.visits().then((r) => setVisits(unwrap(r)));
  useEffect(() => {
    load();
  }, []);
  const rx = visits.flatMap((v) => v.prescriptions || []);
  return (
    <>
      <PageHeader
        title="Pharmacist Dashboard"
        subtitle="Prescription queue, medicine inventory and preparation."
        action={
          <button
            onClick={load}
            className="ad-btn border border-[#dfe3ea] bg-white"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Waiting Rx"
          value={rx.filter((r) => r.status === "PENDING").length}
          icon={Clock3}
          tone="amber"
        />
        <StatCard
          label="Prepared"
          value={rx.filter((r) => r.status === "READY").length}
          icon={PackageCheck}
          tone="emerald"
        />
        <StatCard
          label="Prescriptions"
          value={rx.length}
          icon={Pill}
          tone="cyan"
        />
        <StatCard label="Visits" value={visits.length} icon={CheckCircle2} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white p-5">
            <div>
              <h2 className="text-base font-extrabold text-[#1B3C53]">
                Resep Hari Ini
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Daftar penyiapan obat dan pembaharuan status
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard/pharmacist/prescriptions"
                className="text-xs font-bold text-slate-600 hover:text-[#1B3C53] transition"
              >
                Detail Resep
              </Link>
              <Link
                to="/dashboard/pharmacist/queue"
                className="text-xs font-bold text-[#1B3C53] flex items-center gap-1 hover:underline"
              >
                Buka Antrean <ArrowRight size={13} />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {rx.slice(0, 8).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition"
              >
                <div>
                  <p className="font-extrabold text-sm text-[#1B3C53]">{r.medicine.name}</p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Jumlah: {r.quantity} unit · Kunjungan #{r.visit?.id}
                  </p>
                </div>
                <Badge tone={r.status === "READY" ? "emerald" : "amber"}>
                  {r.status === "READY" ? "SIAP" : "MENUNGGU"}
                </Badge>
              </div>
            ))}
            {rx.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                Belum ada resep masuk hari ini.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 h-fit">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Pusat Inventaris & Stok
              </p>
              <h2 className="mt-1 text-base font-extrabold text-[#1B3C53]">Kesiapan Stok Obat</h2>
            </div>
            <span className="rounded-md bg-[#DCD7C9]/50 px-2.5 py-1 text-xs font-bold text-[#1B3C53] border border-[#DCD7C9]">
              Live Audit
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Periksa ketersediaan sediaan fisik, dosis, dan harga sebelum melakukan penyiapan dan peracikan resep obat pasien.
          </p>
          <div className="pt-2">
            <Link
              to="/dashboard/pharmacist/inventory"
              className="ad-btn ad-btn-primary w-full justify-center"
            >
              Buka Inventaris Obat
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
