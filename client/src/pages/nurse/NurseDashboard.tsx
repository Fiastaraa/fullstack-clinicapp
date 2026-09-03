import {
  ClipboardList,
  HeartPulse,
  Clock3,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Stethoscope,
  Activity,
  Users,
  CheckSquare,
  Calendar,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/dashboard/StatCard";
import { clinic, unwrap } from "../../services/clinicService";
import { useAuth } from "../../context/AuthContext";

type Visit = {
  id: number;
  queueNumber?: string | null;
  status: string;
  complaint?: string | null;
  temperature?: number | null;
  bloodPressure?: string | null;
  visitDate: string;
  createdAt: string;
  patient: {
    id: number;
    name: string;
    phone?: string | null;
    gender?: string | null;
    age?: number | null;
  };
  doctor: {
    id: number;
    name: string;
    specialization?: string | null;
  };
  poli?: {
    id: number;
    name: string;
  } | null;
};

type Task = {
  id: string;
  title: string;
  subtitle?: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  completed: boolean;
};

const DEFAULT_TASKS: Task[] = [
  {
    id: "task-1",
    title: "Cek Tanda-Tanda Vital Pasien Antrean",
    subtitle: "Prioritaskan pasien anak dengan keluhan demam",
    priority: "HIGH",
    completed: false,
  },
  {
    id: "task-2",
    title: "Kalibrasi Tensimeter & Timbangan Stasiun",
    subtitle: "Pemeriksaan fungsi alat stasiun triase",
    priority: "MEDIUM",
    completed: true,
  },
  {
    id: "task-3",
    title: "Restock Disposable & Hand Sanitizer",
    subtitle: "Sebelum pergantian shift dinas",
    priority: "LOW",
    completed: false,
  },
];

export default function NurseDashboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  // Real tasks from localStorage
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem("assistdoc_nurse_tasks");
      return saved ? JSON.parse(saved) : DEFAULT_TASKS;
    } catch {
      return DEFAULT_TASKS;
    }
  });

  const load = async () => {
    try {
      setLoading(true);
      const res = await clinic.visits("all");
      setRows((unwrap(res) as Visit[]) || []);
    } catch (err) {
      console.error("Failed to load visits:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Toggle quick task
  function toggleTask(id: string) {
    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      );
      try {
        localStorage.setItem("assistdoc_nurse_tasks", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }

  // Filter queue for triage
  const waitingVisits = useMemo(() => {
    return rows.filter((v) => v.status === "WAITING" || v.status === "CALLED");
  }, [rows]);

  const vitalsNeeded = useMemo(() => {
    return waitingVisits.filter((v) => !v.temperature && !v.bloodPressure);
  }, [waitingVisits]);

  const inConsultation = useMemo(() => {
    return rows.filter((v) => v.status === "IN_CONSULTATION");
  }, [rows]);

  const completedVisits = useMemo(() => {
    return rows.filter((v) => v.status === "COMPLETED" || v.status === "PAID");
  }, [rows]);

  return (
    <>
      <PageHeader
        title="Nurse Station"
        subtitle="Triase pasien rawat jalan, pemeriksaan tanda vital, dan pemantauan alur konsultasi poli."
        action={
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh Data
          </button>
        }
      />

      {/* NURSE STATION WELCOME BANNER */}
      <div className="mb-6 rounded-2xl border border-cyan-200/80 bg-gradient-to-r from-[#0f4651] via-[#1B3C53] to-[#12727f] p-6 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 border border-white/20 text-cyan-200 font-black text-xl shadow-inner backdrop-blur-xs">
              <HeartPulse size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-white">
                  Selamat Bertugas, {user?.name || "Perawat Jaga"}
                </h2>
                <span className="rounded-full bg-emerald-400/20 px-3 py-0.5 text-xs font-bold text-emerald-200 border border-emerald-400/30 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Stasiun Triase Aktif
                </span>
              </div>
              <p className="text-xs text-cyan-100/90 mt-1 flex flex-wrap items-center gap-3">
                <span>Shift Pagi · 07:30 – 14:30 WIB</span>
                <span>·</span>
                <span>Poli Rawat Jalan Terpadu</span>
                <span>·</span>
                <span>Ruang Pemeriksaan Awal</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/dashboard/nurse/vitals"
              className="inline-flex items-center gap-2 rounded-xl bg-white text-[#1B3C53] px-4 py-2.5 text-xs font-black shadow-md hover:bg-cyan-50 transition"
            >
              <HeartPulse size={15} /> Mulai Triase & TTV
            </Link>
            <Link
              to="/dashboard/nurse/queue"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 text-white border border-white/20 px-4 py-2.5 text-xs font-bold hover:bg-white/20 transition backdrop-blur-xs"
            >
              <Users size={15} /> Lihat Antrean Poli
            </Link>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Menunggu Triase"
          value={waitingVisits.length}
          icon={Clock3}
          tone="amber"
        />
        <StatCard
          label="Perlu Rekam TTV"
          value={vitalsNeeded.length}
          icon={HeartPulse}
          tone="rose"
        />
        <StatCard
          label="Dalam Konsultasi"
          value={inConsultation.length}
          icon={Stethoscope}
          tone="cyan"
        />
        <StatCard
          label="Pelayanan Selesai"
          value={completedVisits.length}
          icon={CheckCircle2}
          tone="emerald"
        />
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        {/* LEFT COLUMN: ACTIVE PATIENT TRIAGE QUEUE */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-base text-[#1B3C53] flex items-center gap-2">
                  <Activity size={18} className="text-[#1B3C53]" />
                  Antrean Pasien & Kesiapan Triase
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftar pasien yang memerlukan pengukuran tanda vital dan pemeriksaan awal perawat.
                </p>
              </div>
              <Link
                to="/dashboard/nurse/queue"
                className="text-xs font-bold text-[#1B3C53] hover:text-[#12727f] flex items-center gap-1 transition"
              >
                Buka Antrean Lengkap <ArrowRight size={14} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 h-20 animate-pulse bg-slate-50/50" />
                ))
              ) : waitingVisits.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Users size={36} className="mx-auto mb-2 opacity-40" />
                  <p className="font-bold text-[#1B3C53] text-sm">Tidak Ada Pasien Menunggu</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Semua pasien saat ini telah selesai dilakukan pemeriksaan awal.
                  </p>
                </div>
              ) : (
                waitingVisits.slice(0, 6).map((v) => {
                  const hasVitals = Boolean(v.temperature || v.bloodPressure);

                  return (
                    <div
                      key={v.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-slate-50/70 transition"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="flex flex-col items-center justify-center rounded-xl bg-slate-100 px-3 py-1.5 min-w-[65px] border border-slate-200">
                          <span className="font-mono text-xs font-black text-[#1B3C53]">
                            {v.queueNumber || `V-${v.id}`}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold">
                            {new Date(v.visitDate || v.createdAt).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-[#1B3C53]">{v.patient.name}</h4>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${hasVitals
                                ? "bg-cyan-100 text-cyan-800"
                                : "bg-rose-100 text-rose-800 border border-rose-200"
                                }`}
                            >
                              {hasVitals ? "TTV Selesai" : "Perlu TTV"}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 mt-0.5">
                            {v.patient.age ? `${v.patient.age} thn` : ""} {v.patient.gender ? `· ${v.patient.gender}` : ""}{" "}
                            · Poli: <strong className="text-slate-700">{v.poli?.name || "Umum"}</strong> · Dokter: {v.doctor.name}
                          </p>

                          {v.complaint && (
                            <p className="text-[11px] text-amber-800 font-medium mt-1 bg-amber-50 rounded px-1.5 py-0.5 inline-block">
                              Keluhan: {v.complaint}
                            </p>
                          )}
                        </div>
                      </div>

                      <Link
                        to={`/dashboard/nurse/vitals?visitId=${v.id}`}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-xs ${hasVitals
                          ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          : "bg-[#1B3C53] text-white hover:bg-[#12727f] shadow-sm"
                          }`}
                      >
                        <HeartPulse size={13} />
                        {hasVitals ? "Ubah TTV" : "Pemeriksaan TTV"}
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total {waitingVisits.length} Pasien dalam antrean triase</span>
            <Link
              to="/dashboard/nurse/vitals"
              className="text-[#1B3C53] font-bold hover:underline"
            >
              Buka Stasiun TTV &rarr;
            </Link>
          </div>
        </section>

        {/* RIGHT COLUMN: NURSE TASKS & QUICK SHORTCUTS */}
        <div className="space-y-6">
          {/* INTERACTIVE NURSE TASKS CARD */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-[#1B3C53] flex items-center gap-2">
                  <CheckSquare size={17} className="text-[#1B3C53]" />
                  Checklist Tugas Perawat
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tindakan & tugas harian stasiun keperawatan.
                </p>
              </div>
              <Link
                to="/dashboard/nurse/notes"
                className="text-xs font-bold text-[#1B3C53] hover:text-[#12727f]"
              >
                Kelola Semua &rarr;
              </Link>
            </div>

            <div className="mt-4 space-y-2.5">
              {tasks.slice(0, 4).map((task) => (
                <label
                  key={task.id}
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${task.completed
                    ? "border-slate-200 bg-slate-50/60 opacity-65"
                    : "border-slate-200 bg-white hover:border-[#1B3C53]/40 shadow-xs"
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    className="mt-0.5 h-4 w-4 rounded text-[#1B3C53] focus:ring-[#1B3C53] cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-bold text-[#1B3C53] ${task.completed ? "line-through text-slate-400" : ""
                        }`}
                    >
                      {task.title}
                    </p>
                    {task.subtitle && (
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {task.subtitle}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <Link
              to="/dashboard/nurse/notes"
              className="mt-4 block w-full rounded-xl bg-slate-50 hover:bg-slate-100 py-2.5 text-center text-xs font-bold text-slate-700 border border-slate-200 transition"
            >
              + Buka Manajemen Catatan & Tugas
            </Link>
          </section>

          {/* QUICK SHORTCUTS CARD */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">
              Akses Cepat Pelayanan Perawat
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                to="/dashboard/nurse/vitals"
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 hover:border-[#1B3C53] hover:bg-[#1B3C53]/5 transition flex flex-col items-center text-center group"
              >
                <HeartPulse size={20} className="text-[#1B3C53] mb-1 group-hover:scale-110 transition" />
                <span className="text-xs font-bold text-[#1B3C53]">Pemeriksaan TTV</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Input Vital Signs</span>
              </Link>

              <Link
                to="/dashboard/nurse/queue"
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 hover:border-[#1B3C53] hover:bg-[#1B3C53]/5 transition flex flex-col items-center text-center group"
              >
                <Users size={20} className="text-indigo-600 mb-1 group-hover:scale-110 transition" />
                <span className="text-xs font-bold text-[#1B3C53]">Antrean Triase</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Panggil Pasien</span>
              </Link>

              <Link
                to="/dashboard/nurse/notes"
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 hover:border-[#1B3C53] hover:bg-[#1B3C53]/5 transition flex flex-col items-center text-center group"
              >
                <ClipboardList size={20} className="text-amber-600 mb-1 group-hover:scale-110 transition" />
                <span className="text-xs font-bold text-[#1B3C53]">Catatan Medis</span>
                <span className="text-[10px] text-slate-400 mt-0.5">CPPT & SBAR</span>
              </Link>

              <Link
                to="/dashboard/nurse/schedule"
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 hover:border-[#1B3C53] hover:bg-[#1B3C53]/5 transition flex flex-col items-center text-center group"
              >
                <Calendar size={20} className="text-emerald-600 mb-1 group-hover:scale-110 transition" />
                <span className="text-xs font-bold text-[#1B3C53]">Jadwal Jaga</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Jadwal Shift Dinas</span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
