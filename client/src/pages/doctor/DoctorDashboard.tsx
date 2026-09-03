import {
  Clock3,
  Stethoscope,
  CheckCircle2,
  Users,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/dashboard/StatCard";
import Badge from "../../components/common/Badge";
import { clinic, unwrap } from "../../services/clinicService";
export default function DoctorDashboard() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => clinic.visits().then((r) => setRows(unwrap(r)));
  useEffect(() => {
    load();
  }, []);
  return (
    <>
      <PageHeader
        title="Doctor Dashboard"
        subtitle="Today's queue, patient information and consultation workspace."
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
          label="Waiting"
          value={rows.filter((v) => v.status === "WAITING").length}
          icon={Clock3}
          tone="amber"
        />
        <StatCard
          label="Consultation"
          value={rows.filter((v) => v.status === "IN_CONSULTATION").length}
          icon={Stethoscope}
          tone="cyan"
        />
        <StatCard
          label="Completed"
          value={rows.filter((v) => v.status === "COMPLETED").length}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard label="Today's Patients" value={rows.length} icon={Users} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <section className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white p-5">
            <div>
              <h2 className="text-base font-extrabold text-[#1B3C53]">Jadwal & Antrean Saya</h2>
              <p className="text-xs text-slate-500 font-medium">
                Daftar pasien dalam antrean konsultasi hari ini
              </p>
            </div>
            <Link
              to="/dashboard/doctor/queue"
              className="text-xs font-bold text-[#1B3C53] flex items-center gap-1 hover:underline"
            >
              Buka antrean <ArrowRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {rows.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition"
              >
                <div>
                  <p className="font-extrabold text-sm text-[#1B3C53]">{v.patient.name}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500 font-medium">
                    {new Date(v.visitDate).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {v.patient.age} tahun · {v.patient.gender}
                  </p>
                </div>
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
              </div>
            ))}
            {rows.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                Tidak ada pasien dalam antrean saat ini.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 h-fit">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Ruang Konsultasi Dokter
              </p>
              <h2 className="mt-1 text-base font-extrabold text-[#1B3C53]">Kesiapan Pasien</h2>
            </div>
            <span className="rounded-md bg-[#DCD7C9]/50 px-2.5 py-1 text-xs font-bold text-[#1B3C53] border border-[#DCD7C9]">
              EMR Ready
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Periksa rekam medis, anamnesis, input diagnosa ICD-10, dan terbitkan resep digital dalam satu lembar kerja terintegrasi.
          </p>
          <div className="pt-2">
            <Link
              to="/dashboard/doctor/consultation"
              className="ad-btn ad-btn-primary w-full justify-center"
            >
              Mulai Konsultasi Pasien
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
