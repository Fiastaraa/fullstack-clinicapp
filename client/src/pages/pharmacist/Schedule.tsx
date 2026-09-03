import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  User,
  Pill,
  CheckCircle2,
  Plus,
  Sparkles,
  Thermometer,
  CheckSquare,
  Square,
  Trash2,
  X,
  Volume2,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/dashboard/StatCard";
import Badge from "../../components/common/Badge";
import { clinic, unwrap } from "../../services/clinicService";

// Weekly Shifts Template
const WEEKLY_SHIFT_ROSTER = [
  {
    day: "Senin",
    dateLabel: "Hari Kerja",
    shifts: [
      { name: "Shift Pagi (07:00 - 14:00)", lead: "Apt. Siti Rahma, S.Farm", staff: "Budi (AA), Ratna (AA)", status: "ACTIVE" },
      { name: "Shift Siang (14:00 - 21:00)", lead: "Apt. Dimas Prasetyo, S.Farm", staff: "Fajar (AA)", status: "UPCOMING" },
    ],
  },
  {
    day: "Selasa",
    dateLabel: "Hari Kerja",
    shifts: [
      { name: "Shift Pagi (07:00 - 14:00)", lead: "Apt. Dimas Prasetyo, S.Farm", staff: "Ratna (AA)", status: "UPCOMING" },
      { name: "Shift Siang (14:00 - 21:00)", lead: "Apt. Siti Rahma, S.Farm", staff: "Budi (AA)", status: "UPCOMING" },
    ],
  },
  {
    day: "Rabu",
    dateLabel: "Hari Kerja",
    shifts: [
      { name: "Shift Pagi (07:00 - 14:00)", lead: "Apt. Siti Rahma, S.Farm", staff: "Fajar (AA)", status: "UPCOMING" },
      { name: "Shift Siang (14:00 - 21:00)", lead: "Apt. Dimas Prasetyo, S.Farm", staff: "Ratna (AA)", status: "UPCOMING" },
    ],
  },
  {
    day: "Kamis",
    dateLabel: "Hari Kerja",
    shifts: [
      { name: "Shift Pagi (07:00 - 14:00)", lead: "Apt. Dimas Prasetyo, S.Farm", staff: "Budi (AA)", status: "UPCOMING" },
      { name: "Shift Siang (14:00 - 21:00)", lead: "Apt. Siti Rahma, S.Farm", staff: "Fajar (AA)", status: "UPCOMING" },
    ],
  },
  {
    day: "Jumat",
    dateLabel: "Hari Kerja",
    shifts: [
      { name: "Shift Pagi (07:00 - 14:00)", lead: "Apt. Siti Rahma, S.Farm", staff: "Ratna (AA)", status: "UPCOMING" },
      { name: "Shift Siang (14:00 - 21:00)", lead: "Apt. Dimas Prasetyo, S.Farm", staff: "Budi (AA)", status: "UPCOMING" },
    ],
  },
  {
    day: "Sabtu",
    dateLabel: "Pelayanan Akhir Pekan",
    shifts: [
      { name: "Shift Penuh (08:00 - 16:00)", lead: "Apt. Dimas Prasetyo, S.Farm", staff: "Fajar (AA), Ratna (AA)", status: "UPCOMING" },
    ],
  },
];

// Daily Operational Milestones
const DAILY_OPERATIONAL_MILESTONES = [
  {
    time: "07:30 WIB",
    title: "Handover Shift & Cek Suhu Chiller Vaksin (2° - 8°C)",
    description: "Pemeriksaan log suhu kulkas obat dingin, pengisian lembar kontrol suhu harian, dan serah terima kunci lemari narkotika/psikotropika.",
    category: "Kontrol Kualitas",
    required: true,
  },
  {
    time: "08:15 WIB",
    title: "Buka Loket Farmasi & Monitor Antrean Resep Poli Pagi",
    description: "Standby penyiapan obat rawat jalan Poli Umum, Spesialis Anak, Penyakit Dalam, dan Poli Gigi.",
    category: "Pelayanan",
    required: true,
  },
  {
    time: "10:30 WIB",
    title: "Sesi Konseling & PIO Pasien Kronis / Polifarmasi",
    description: "Pelayanan Informasi Obat (PIO) tatap muka untuk pasien geriatri, insulin injeksi, dan kepatuhan minum antibiotik.",
    category: "Konseling Pasien",
    required: false,
  },
  {
    time: "13:00 WIB",
    title: "Penerimaan & Verifikasi Faktur PBF (Distributor Farmasi)",
    description: "Cross-check fisik barang masuk dengan Surat Pesanan (SP), pengecekan batch number, dan tanggal kadaluarsa (ED).",
    category: "Logistik & Stok",
    required: true,
  },
  {
    time: "14:00 WIB",
    title: "Serah Terima Shift Siang (Second Shift Handover)",
    description: "Rekonsiliasi resep yang belum terselesaikan, verifikasi kas kecil apotek, dan briefing stok obat kritis.",
    category: "Operasional",
    required: true,
  },
  {
    time: "17:30 WIB",
    title: "Audit Harian Obat High Alert & Fast Moving",
    description: "Penghitungan fisik acak (cycle count) sediaan paracetamol sirup, amoxicillin, dan obat darurat UGD.",
    category: "Stock Opname",
    required: false,
  },
  {
    time: "20:30 WIB",
    title: "Tutup Loket, Rekap Resep Harian & Penguncian Inventaris",
    description: "Pengarsipan salinan resep, backup data mutasi obat harian, dan penguncian loket apotek.",
    category: "Penutupan",
    required: true,
  },
];

type CustomTask = {
  id: string;
  text: string;
  completed: boolean;
  time?: string;
};

export default function Schedule() {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"operations" | "shifts" | "counseling">("operations");

  // Custom checklist stored in localStorage
  const [tasks, setTasks] = useState<CustomTask[]>(() => {
    try {
      const stored = localStorage.getItem("pharmacist_custom_tasks");
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { id: "1", text: "Periksa kelembapan & suhu ruang penyimpanan obat (maks 25°C)", completed: true, time: "08:00" },
      { id: "2", text: "Cek ketersediaan etiket putih (oral) dan etiket biru (luar)", completed: true, time: "09:00" },
      { id: "3", text: "Konfirmasi pesanan PO Paracetamol & Vitamin ke PBF Kimia Farma", completed: false, time: "11:00" },
      { id: "4", text: "Kalibrasi timbangan digital mortir & stamper", completed: false, time: "15:00" },
    ];
  });

  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskTime, setNewTaskTime] = useState("10:00");
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

  // Completed counseling session IDs
  const [completedCounselingIds, setCompletedCounselingIds] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem("pharmacist_completed_counseling");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const vRes = await clinic.visits("all");
      setVisits(unwrap(vRes) || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save tasks to localStorage
  function saveTasks(updated: CustomTask[]) {
    setTasks(updated);
    try {
      localStorage.setItem("pharmacist_custom_tasks", JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to persist tasks:", e);
    }
  }

  function toggleTask(id: string) {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    saveTasks(updated);
  }

  function deleteTask(id: string) {
    const updated = tasks.filter((t) => t.id !== id);
    saveTasks(updated);
  }

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask: CustomTask = {
      id: Date.now().toString(),
      text: newTaskText.trim(),
      completed: false,
      time: newTaskTime || undefined,
    };
    saveTasks([...tasks, newTask]);
    setNewTaskText("");
    setShowAddTaskModal(false);
  }

  function toggleCounseling(id: number) {
    const next = new Set(completedCounselingIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setCompletedCounselingIds(next);
    try {
      localStorage.setItem(
        "pharmacist_completed_counseling",
        JSON.stringify(Array.from(next))
      );
    } catch (e) {
      console.warn("Failed to persist counseling state:", e);
    }
  }

  // Voice announcement for counseling
  function announceCounseling(patientName: string, queueNumber: string) {
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const text = `Panggilan konseling obat, atas nama pasien ${patientName}, nomor antrean ${queueNumber}, silakan menuju Ruang Konseling Farmasi.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "id-ID";
        utterance.rate = 0.92;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("Speech synthesis error:", e);
      }
    }
  }

  // Metrics
  const totalPrescriptions = useMemo(
    () => visits.flatMap((v) => v.prescriptions || []).length,
    [visits]
  );
  const pendingRxCount = useMemo(
    () => visits.flatMap((v) => v.prescriptions || []).filter((r) => r.status === "PENDING").length,
    [visits]
  );
  const completedTasksCount = tasks.filter((t) => t.completed).length;

  // Candidates for Medication Counseling (Patients with multiple medications or reminders)
  const counselingPatients = useMemo(() => {
    return visits
      .filter((v) => (v.prescriptions || []).length >= 2 || v.status === "IN_PROGRESS" || v.status === "WAITING_PHARMACY")
      .map((v) => {
        const rx = v.prescriptions || [];
        const isDone = completedCounselingIds.has(v.id);
        return {
          id: v.id,
          queueNumber: v.queueNumber || `A0${v.id}`,
          patientName: v.patient?.name || "Pasien",
          age: v.patient?.age,
          gender: v.patient?.gender,
          doctorName: v.doctor?.name || "Dokter",
          poliName: v.poli?.name || "Poli Umum",
          complaint: v.complaint || "Keluhan klinis",
          medicationsCount: rx.length,
          medicationNames: rx.map((r: any) => r.medicine?.name).filter(Boolean).join(", "),
          isDone,
        };
      });
  }, [visits, completedCounselingIds]);

  return (
    <>
      <PageHeader
        title="Jadwal & Agenda Operasional Farmasi"
        subtitle="Roster shift apoteker, milestone operasional harian, sesi konseling obat, dan checklist mutu farmasi."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddTaskModal(true)}
              className="ad-btn ad-btn-primary shadow-xs"
            >
              <Plus size={15} /> Tambah Agenda Shift
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="ad-btn border border-[#dfe3ea] bg-white text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        }
      />

      {/* STAT CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Shift Aktif Hari Ini"
          value="Pagi (07:00 - 14:00)"
          icon={Clock}
          tone="indigo"
          hint="Apt. Siti Rahma, S.Farm"
        />
        <StatCard
          label="Resep Menunggu Penyiapan"
          value={pendingRxCount}
          icon={Pill}
          tone="amber"
          hint={`Dari total ${totalPrescriptions} resep`}
        />
        <StatCard
          label="Sesi Konseling Pasien"
          value={`${completedCounselingIds.size} / ${counselingPatients.length}`}
          icon={User}
          tone="emerald"
          hint="Pasien polifarmasi / edukasi"
        />
        <StatCard
          label="Checklist Mutu Selesai"
          value={`${completedTasksCount} / ${tasks.length}`}
          icon={CheckSquare}
          tone="cyan"
          hint={`${Math.round(tasks.length > 0 ? (completedTasksCount / tasks.length) * 100 : 100)}% kepatuhan SOP`}
        />
      </div>

      {/* TAB NAVIGATION */}
      <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab("operations")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
            activeTab === "operations"
              ? "bg-[#1B3C53] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Clock size={15} /> Milestone Operasional & Checklist SOP
        </button>
        <button
          onClick={() => setActiveTab("counseling")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
            activeTab === "counseling"
              ? "bg-[#1B3C53] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Sparkles size={15} /> Konseling & Edukasi Obat ({counselingPatients.length})
        </button>
        <button
          onClick={() => setActiveTab("shifts")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
            activeTab === "shifts"
              ? "bg-[#1B3C53] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <CalendarDays size={15} /> Roster Shift Apoteker Mingguan
        </button>
      </div>

      {/* TAB 1: OPERATIONS & CHECKLIST */}
      {activeTab === "operations" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
          {/* MILESTONES TIMELINE */}
          <div className="ad-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-[#1B3C53] text-base">
                  Jadwal Alur Kerja Rutin Farmasi Hari Ini
                </h3>
                <p className="text-xs text-slate-500">
                  Panduan standar tahapan pelayanan obat dan jaminan mutu sediaan.
                </p>
              </div>
              <Badge tone="cyan">STANDAR OPERASIONAL PROSEDUR</Badge>
            </div>

            <div className="relative border-l-2 border-slate-200 ml-3.5 space-y-6 py-2">
              {DAILY_OPERATIONAL_MILESTONES.map((m, idx) => (
                <div key={idx} className="relative pl-6">
                  {/* Timeline dot */}
                  <div className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-white bg-[#1B3C53] shadow-xs" />

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 transition space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-black text-sm text-[#1B3C53] flex items-center gap-1.5">
                        <Clock size={14} className="text-[#1B3C53]" />
                        {m.time}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge tone={m.required ? "indigo" : "slate"}>
                          {m.category}
                        </Badge>
                        {m.required && (
                          <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700 border border-rose-200">
                            WAJIB
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 className="font-bold text-[#1B3C53] text-sm">{m.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{m.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CHECKLIST MUTU & CUSTOM AGENDA */}
          <div className="space-y-6">
            <div className="ad-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-[#1B3C53] text-base flex items-center gap-2">
                    <CheckSquare size={17} className="text-emerald-600" />
                    Checklist Kepatuhan & Mutu Shift
                  </h3>
                  <p className="text-xs text-slate-500">
                    Daftar periksa harian yang harus diselesaikan selama bertugas.
                  </p>
                </div>
                <span className="text-xs font-black text-emerald-700">
                  {completedTasksCount} / {tasks.length} Selesai
                </span>
              </div>

              <div className="space-y-2.5">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => toggleTask(t.id)}
                    className={`flex items-start justify-between gap-3 rounded-xl border p-3 cursor-pointer transition ${
                      t.completed
                        ? "border-emerald-200 bg-emerald-50/40 text-slate-500"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="pt-0.5 text-[#1B3C53]">
                        {t.completed ? (
                          <CheckCircle2 size={16} className="text-emerald-600" />
                        ) : (
                          <Square size={16} className="text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p
                          className={`text-xs font-bold leading-snug ${
                            t.completed ? "line-through text-slate-400" : "text-[#1B3C53]"
                          }`}
                        >
                          {t.text}
                        </p>
                        {t.time && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            Target: {t.time} WIB
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTask(t.id);
                      }}
                      className="text-slate-300 hover:text-rose-600 p-1 transition"
                      title="Hapus tugas"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}

                {tasks.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Tidak ada agenda aktif. Tambahkan tugas baru.
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowAddTaskModal(true)}
                className="w-full ad-btn border border-dashed border-[#1B3C53] bg-teal-50/40 text-[#1B3C53] hover:bg-teal-50 justify-center text-xs font-bold"
              >
                <Plus size={14} /> Tambah Agenda Tugas Shift Baru
              </button>
            </div>

            {/* QUICK PROTOCOL NOTICE */}
            <div className="ad-card p-5 bg-gradient-to-br from-[#1B3C53] to-[#162752] text-white space-y-3">
              <div className="flex items-center gap-2">
                <Thermometer className="text-[#56c6d0]" size={18} />
                <h4 className="font-black text-sm">Prosedur Rantai Dingin (Cold Chain)</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Vaksin, Insulin, dan Serum wajib berada di suhu terkontrol 2°C - 8°C. Jika terjadi pemadaman listrik &gt;15 menit, segera pindahkan sediaan ke coolbox dengan ice pack dan catat di buku log.
              </p>
              <div className="flex justify-between items-center text-[11px] text-[#56c6d0] pt-1">
                <span>Hotline Teknisi Chiller:</span>
                <span className="font-mono font-bold">Ext. 204</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PATIENT COUNSELING */}
      {activeTab === "counseling" && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-[#1B3C53] text-base">
                Daftar Pasien Memerlukan Pelayanan Informasi Obat (PIO) & Konseling
              </h3>
              <p className="text-xs text-slate-500">
                Prioritas edukasi untuk pasien dengan regimen polifarmasi (≥2 obat), antibiotik jangka panjang, atau penyakit kronis.
              </p>
            </div>
            <span className="rounded-xl bg-teal-50 px-3 py-1.5 text-xs font-bold text-[#1B3C53] border border-teal-200">
              {counselingPatients.length} Pasien Terdaftar
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {counselingPatients.map((p) => (
              <div
                key={p.id}
                className={`ad-card p-5 space-y-3.5 transition ${
                  p.isDone
                    ? "border-emerald-200 bg-emerald-50/20 opacity-80"
                    : "hover:border-[#1B3C53] shadow-xs"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#1B3C53] text-white font-black text-sm">
                      {p.queueNumber}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-[#1B3C53] text-sm">{p.patientName}</h4>
                      <p className="text-[11px] text-slate-400">
                        {p.gender || "Pasien"} · {p.age ? `${p.age} thn` : "Umur -"}
                      </p>
                    </div>
                  </div>
                  <Badge tone={p.isDone ? "emerald" : "amber"}>
                    {p.isDone ? "SELESAI EDUKASI" : "PERLU KONSELING"}
                  </Badge>
                </div>

                {/* Details */}
                <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs border border-slate-100">
                  <p className="text-slate-600">
                    <b className="text-slate-700">Dokter:</b> {p.doctorName} ({p.poliName})
                  </p>
                  <p className="text-slate-600">
                    <b className="text-slate-700">Keluhan:</b> {p.complaint}
                  </p>
                  <p className="text-[#1B3C53] font-semibold truncate" title={p.medicationNames}>
                    <b className="text-slate-700">Obat ({p.medicationsCount}):</b>{" "}
                    {p.medicationNames || "Resep terintegrasi"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => announceCounseling(p.patientName, p.queueNumber)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Volume2 size={13} /> Panggil Konseling
                  </button>

                  <button
                    onClick={() => toggleCounseling(p.id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      p.isDone
                        ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                    }`}
                  >
                    <CheckCircle2 size={13} />
                    {p.isDone ? "Batal Selesai" : "Tandai Selesai"}
                  </button>
                </div>
              </div>
            ))}

            {counselingPatients.length === 0 && (
              <div className="col-span-full ad-card p-12 text-center text-slate-400 space-y-2">
                <Pill size={36} className="mx-auto text-slate-300" />
                <p className="font-bold text-slate-600 text-base">
                  Tidak Ada Jadwal Konseling Aktif
                </p>
                <p className="text-xs">
                  Pasien resep rawat jalan hari ini belum memiliki indikasi polifarmasi kompleks.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: WEEKLY SHIFT ROSTER */}
      {activeTab === "shifts" && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-[#1B3C53] text-base">
                Roster Jadwal Jaga Tenaga Kefarmasian (Mingguan)
              </h3>
              <p className="text-xs text-slate-500">
                Jadwal penugasan Apoteker Penanggung Jawab (APJ) dan Tenaga Teknis Kefarmasian (TTK / AA).
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Shift Operasional: 2 Shift / Hari
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {WEEKLY_SHIFT_ROSTER.map((r, i) => (
              <div key={i} className="ad-card p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-extrabold text-base text-[#1B3C53]">{r.day}</h4>
                    <p className="text-[11px] text-slate-400">{r.dateLabel}</p>
                  </div>
                  {r.day === "Senin" && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800">
                      HARI INI
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {r.shifts.map((s, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#1B3C53]">{s.name}</span>
                        <Badge tone={s.status === "ACTIVE" ? "emerald" : "slate"}>
                          {s.status === "ACTIVE" ? "SEDANG BERTUGAS" : "TERJADWAL"}
                        </Badge>
                      </div>
                      <p className="text-slate-600">
                        <b className="text-slate-700">Apoteker PJ:</b> {s.lead}
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        <b className="text-slate-600">Asisten (TTK):</b> {s.staff}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH AGENDA SHIFT BARU */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="ad-card w-full max-w-md p-6 bg-white space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#1B3C53] text-lg">
                  Tambah Agenda Tugas Shift
                </h3>
                <p className="text-xs text-slate-500">
                  Catat checklist atau tugas khusus farmasi untuk diselesaikan shift ini.
                </p>
              </div>
              <button
                onClick={() => setShowAddTaskModal(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTask} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Uraian Agenda / Checklist Tugas:
                </label>
                <textarea
                  required
                  rows={3}
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Misal: Cek ketersediaan sirup paracetamol, pesan alkohol 70%, validasi resep Dr. Hendra..."
                  className="ad-input text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Target Waktu Penyelesaian:
                </label>
                <input
                  type="time"
                  value={newTaskTime}
                  onChange={(e) => setNewTaskTime(e.target.value)}
                  className="ad-input text-xs font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="ad-btn border border-[#dfe3ea] bg-white text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="ad-btn ad-btn-primary"
                >
                  Simpan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
