import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { clinic, unwrap } from "../../services/clinicService";
import { useAuth } from "../../context/AuthContext";
import {
  Calendar,
  Clock,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  ArrowRight,
  Sparkles,
  MapPin,
  Activity,
  Coffee,
  Bell,
  CalendarDays,
  List,
} from "lucide-react";

type Visit = {
  id: number;
  queueNumber?: string | null;
  status: string;
  complaint?: string | null;
  visitDate: string;
  createdAt: string;
  patient: {
    id: number;
    name: string;
    nik?: string | null;
    gender?: string | null;
    age?: number | null;
    phone?: string | null;
  };
  doctor?: {
    id: number;
    name: string;
    specialization?: string | null;
  } | null;
  poli?: {
    id: number;
    name: string;
  } | null;
};

import CalendarPicker from "../../components/common/CalendarPicker";

type Reminder = {
  id: number;
  patientId: number;
  type: "KONTROL" | "VAKSINASI" | "CEK_LAB";
  title: string;
  date: string;
  notes?: string | null;
  status: "PENDING" | "SENT" | "COMPLETED" | "HANGUS";
  effectiveStatus?: string;
  isHangus?: boolean;
  patient?: {
    id: number;
    name: string;
    phone?: string | null;
  };
};

const WEEKLY_DOCTOR_SCHEDULE = [
  { day: "Senin", shift: "Shift Pagi", time: "08:00 - 12:00 WIB", room: "Ruang Konsultasi 1", poli: "Poli Umum", status: "Aktif" },
  { day: "Selasa", shift: "Shift Pagi & Sore", time: "08:00 - 12:00 & 13:00 - 16:00 WIB", room: "Ruang Konsultasi 1", poli: "Poli Umum", status: "Aktif" },
  { day: "Rabu", shift: "Shift Pagi", time: "08:00 - 12:00 WIB", room: "Ruang Konsultasi 2", poli: "Poli Spesialis", status: "Aktif" },
  { day: "Kamis", shift: "Shift Pagi & Sore", time: "08:00 - 12:00 & 13:00 - 16:00 WIB", room: "Ruang Konsultasi 1", poli: "Poli Umum", status: "Aktif" },
  { day: "Jumat", shift: "Shift Pagi", time: "08:30 - 11:30 WIB", room: "Ruang Konsultasi 1", poli: "Poli Umum", status: "Aktif" },
  { day: "Sabtu", shift: "Shift Pagi Khusus", time: "09:00 - 13:00 WIB", room: "Ruang Konsultasi 1", poli: "Poli Umum & Anak", status: "Aktif" },
];

export default function DoctorSchedule() {
  const { user } = useAuth();

  const [visits, setVisits] = useState<Visit[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"PATIENTS" | "WEEKLY" | "REMINDERS">("PATIENTS");
  const [dateFilter, setDateFilter] = useState<string>("TODAY");
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "WAITING" | "IN_CONSULTATION" | "COMPLETED">("ALL");

  // Doctor Availability Toggle (Persisted in localStorage)
  const [doctorStatus, setDoctorStatus] = useState<"AVAILABLE" | "BREAK" | "OFFLINE">(() => {
    return (localStorage.getItem("assistdoc_doctor_status") as any) || "AVAILABLE";
  });

  // New Reminder Modal
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [reminderPatientId, setReminderPatientId] = useState<number | "">("");
  const [reminderType, setReminderType] = useState<"KONTROL" | "VAKSINASI" | "CEK_LAB">("KONTROL");
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState(new Date().toISOString().split("T")[0]);
  const [reminderNotes, setReminderNotes] = useState("");
  const [submittingReminder, setSubmittingReminder] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Load visits and reminders
  async function loadData() {
    try {
      setLoading(true);
      const [visitsRes, remindersRes] = await Promise.all([
        clinic.visits("all"),
        clinic.reminders(),
      ]);
      setVisits((unwrap(visitsRes) as Visit[]) || []);
      setReminders((unwrap(remindersRes) as Reminder[]) || []);
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal memuat jadwal dokter.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleSetDoctorStatus(newStatus: "AVAILABLE" | "BREAK" | "OFFLINE") {
    setDoctorStatus(newStatus);
    localStorage.setItem("assistdoc_doctor_status", newStatus);
    setMsg({
      type: "info",
      text: `Status ketersediaan dokter diperbarui menjadi: ${
        newStatus === "AVAILABLE"
          ? "Aktif / Siap Praktik"
          : newStatus === "BREAK"
          ? "Sedang Istirahat"
          : "Selesai Praktik / Offline"
      }.`,
    });
  }

  // Filter visits based on date
  const filteredByDateVisits = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];

    return visits.filter((v) => {
      const vDateStr = new Date(v.visitDate || v.createdAt).toISOString().split("T")[0];

      if (dateFilter === "TODAY") {
        return vDateStr === todayStr;
      }
      if (dateFilter === "CUSTOM") {
        return vDateStr === customDate;
      }
      return true; // ALL
    });
  }, [visits, dateFilter, customDate]);

  // Filter visits based on search and status
  const filteredVisits = useMemo(() => {
    return filteredByDateVisits.filter((v) => {
      // Status
      if (statusFilter !== "ALL") {
        if (v.status !== statusFilter) return false;
      }

      // Search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const pName = v.patient?.name?.toLowerCase() || "";
      const qNum = v.queueNumber?.toLowerCase() || "";
      const complaint = v.complaint?.toLowerCase() || "";

      return pName.includes(q) || qNum.includes(q) || complaint.includes(q);
    });
  }, [filteredByDateVisits, statusFilter, searchQuery]);

  // Metrics
  const stats = useMemo(() => {
    const totalToday = filteredByDateVisits.length;
    const waiting = filteredByDateVisits.filter((v) => v.status === "WAITING" || v.status === "CALLED").length;
    const inProgress = filteredByDateVisits.filter((v) => v.status === "IN_CONSULTATION").length;
    const completed = filteredByDateVisits.filter((v) => v.status === "COMPLETED" || v.status === "PAID").length;
    return { totalToday, waiting, inProgress, completed };
  }, [filteredByDateVisits]);

  // Create Follow-up Reminder
  async function handleCreateReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!reminderPatientId || !reminderTitle.trim()) return;

    try {
      setSubmittingReminder(true);
      const res = await clinic.createReminder({
        patientId: Number(reminderPatientId),
        type: reminderType,
        title: reminderTitle.trim(),
        date: new Date(reminderDate).toISOString(),
        notes: reminderNotes.trim() || undefined,
      });

      const newRem = unwrap(res) as Reminder;
      setReminders((prev) => [newRem, ...prev]);
      setShowAddReminderModal(false);
      setReminderTitle("");
      setReminderNotes("");
      setReminderPatientId("");
      setMsg({ type: "success", text: "Jadwal kontrol pasien berhasil ditambahkan!" });
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal membuat jadwal kontrol pasien.",
      });
    } finally {
      setSubmittingReminder(false);
    }
  }

  // Toggle Reminder
  async function handleToggleReminder(id: number, currentStatus: string) {
    const nextStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    try {
      await clinic.updateReminderStatus(id, nextStatus);
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: nextStatus } : r))
      );
      setMsg({ type: "info", text: `Status jadwal kontrol diperbarui menjadi ${nextStatus}.` });
    } catch (err: any) {
      console.error(err);
    }
  }

  return (
    <>
      <PageHeader
        title="Jadwal Praktik & Janji Temu Dokter (Schedule)"
        subtitle="Manajemen jadwal konsultasi pasien harian, kalender praktik mingguan, dan tindak lanjut janji kontrol."
        action={
          <button
            onClick={() => setShowAddReminderModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition"
          >
            <Plus size={15} /> Jadwalkan Kontrol Pasien
          </button>
        }
      />

      {/* ALERT BANNER */}
      {msg && (
        <div
          className={`mb-6 flex items-center justify-between rounded-2xl border p-4 text-sm font-semibold shadow-sm transition ${
            msg.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : msg.type === "error"
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-cyan-200 bg-cyan-50 text-cyan-900"
          }`}
        >
          <div className="flex items-center gap-3">
            {msg.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : msg.type === "error" ? (
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            ) : (
              <Sparkles className="h-5 w-5 text-cyan-600 shrink-0" />
            )}
            <span>{msg.text}</span>
          </div>
          <button
            onClick={() => setMsg(null)}
            className="text-xs opacity-60 hover:opacity-100 transition px-2 py-1"
          >
            Tutup
          </button>
        </div>
      )}

      {/* DOCTOR AVAILABILITY & CURRENT CLINIC STATUS CARD */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-[#111a3a] to-indigo-950 p-6 text-white shadow-md mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-black text-xl shadow-inner">
              <Stethoscope size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-white">{user?.name || "Dokter Pemeriksa"}</h2>
                <span className="rounded-full bg-indigo-500/30 px-3 py-0.5 text-xs font-bold text-indigo-200 border border-indigo-400/30">
                  Poli Umum & Rawat Jalan
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <MapPin size={13} className="text-indigo-400" /> Ruang Praktik 1
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock size={13} className="text-indigo-400" /> Jam Kerja: 08:00 – 16:00 WIB
                </span>
              </p>
            </div>
          </div>

          {/* Availability Status Selector */}
          <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xs">
            <button
              onClick={() => handleSetDoctorStatus("AVAILABLE")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                doctorStatus === "AVAILABLE"
                  ? "bg-emerald-500 text-white shadow-md"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Activity size={14} /> Aktif / Siap Praktik
            </button>
            <button
              onClick={() => handleSetDoctorStatus("BREAK")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                doctorStatus === "BREAK"
                  ? "bg-amber-500 text-white shadow-md"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Coffee size={14} /> Sedang Istirahat
            </button>
            <button
              onClick={() => handleSetDoctorStatus("OFFLINE")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                doctorStatus === "OFFLINE"
                  ? "bg-rose-500 text-white shadow-md"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Selesai / Offline
            </button>
          </div>
        </div>
      </div>

      {/* KPI METRICS BAR */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shrink-0">
            <CalendarDays size={24} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-slate-400">Total Pasien Terjadwal</span>
            <h3 className="text-2xl font-black text-[#101a3d]">{stats.totalToday}</h3>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-slate-400">Menunggu Giliran</span>
            <h3 className="text-2xl font-black text-amber-700">{stats.waiting}</h3>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 shrink-0">
            <Activity size={24} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-slate-400">Sedang Diperiksa</span>
            <h3 className="text-2xl font-black text-cyan-800">{stats.inProgress}</h3>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-slate-400">Konsultasi Selesai</span>
            <h3 className="text-2xl font-black text-emerald-700">{stats.completed}</h3>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("PATIENTS")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "PATIENTS"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <List size={15} /> Janji Temu Pasien ({filteredByDateVisits.length})
          </button>

          <button
            onClick={() => setActiveTab("WEEKLY")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "WEEKLY"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Calendar size={15} /> Jadwal Praktik Mingguan
          </button>

          <button
            onClick={() => setActiveTab("REMINDERS")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "REMINDERS"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Bell size={15} /> Jadwal Kontrol Pasien ({reminders.length})
          </button>
        </div>
      </div>

      {/* TAB 1: JANJI TEMU PASIEN (TIMELINE & QUEUE) */}
      {activeTab === "PATIENTS" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Date Filter Tabs */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDateFilter("TODAY")}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                    dateFilter === "TODAY"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  onClick={() => setDateFilter("ALL")}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                    dateFilter === "ALL"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Semua Tanggal
                </button>
                <button
                  onClick={() => setDateFilter("CUSTOM")}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                    dateFilter === "CUSTOM"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Pilih Tanggal
                </button>

                {dateFilter === "CUSTOM" && (
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-1 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:outline-none"
                  />
                )}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className={`rounded-lg px-2.5 py-1 font-bold ${
                    statusFilter === "ALL" ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setStatusFilter("WAITING")}
                  className={`rounded-lg px-2.5 py-1 font-bold ${
                    statusFilter === "WAITING" ? "bg-amber-500 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Menunggu
                </button>
                <button
                  onClick={() => setStatusFilter("IN_CONSULTATION")}
                  className={`rounded-lg px-2.5 py-1 font-bold ${
                    statusFilter === "IN_CONSULTATION" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Konsultasi
                </button>
                <button
                  onClick={() => setStatusFilter("COMPLETED")}
                  className={`rounded-lg px-2.5 py-1 font-bold ${
                    statusFilter === "COMPLETED" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Selesai
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama pasien, nomor antrean, atau keluhan..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs font-medium focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Timeline Cards List */}
          <div className="space-y-3">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100 border border-slate-200" />
              ))
            ) : filteredVisits.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
                <Calendar size={40} className="mx-auto mb-2 opacity-40" />
                <h4 className="font-bold text-sm text-[#101a3d]">Tidak Ada Jadwal Janji Temu</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Tidak ditemukan pasien terdaftar pada tanggal atau filter yang dipilih.
                </p>
              </div>
            ) : (
              filteredVisits.map((v) => {
                const isConsulting = v.status === "IN_CONSULTATION";
                const isDone = v.status === "COMPLETED" || v.status === "PAID";

                return (
                  <div
                    key={v.id}
                    className={`rounded-2xl border p-4 shadow-xs transition flex flex-wrap items-center justify-between gap-4 ${
                      isConsulting
                        ? "border-indigo-500 bg-indigo-50/40"
                        : isDone
                        ? "border-slate-200 bg-white opacity-85"
                        : "border-slate-200 bg-white hover:border-indigo-300"
                    }`}
                  >
                    {/* Time & Queue */}
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center rounded-xl bg-slate-100 px-3.5 py-2 min-w-[75px] text-center border border-slate-200">
                        <Clock size={14} className="text-indigo-600 mb-0.5" />
                        <span className="font-mono text-xs font-black text-slate-800">
                          {new Date(v.visitDate || v.createdAt).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="text-[10px] text-slate-500">WIB</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {v.queueNumber || `V-${v.id}`}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                              isConsulting
                                ? "bg-indigo-100 text-indigo-800 animate-pulse font-black"
                                : isDone
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {v.status}
                          </span>
                          <span className="text-xs text-slate-500">
                            Poli: {v.poli?.name || "Poli Umum"}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-[#101a3d] mt-1">{v.patient.name}</h3>
                        <p className="text-xs text-slate-500">
                          {v.patient.age ? `${v.patient.age} Tahun` : ""} · {v.patient.gender || ""} · No. Telp: {v.patient.phone || "-"}
                        </p>
                      </div>
                    </div>

                    {/* Complaint & Action */}
                    <div className="flex items-center gap-4 ml-auto">
                      <div className="text-right hidden sm:block max-w-xs">
                        <span className="text-[11px] text-slate-400 block font-semibold">Keluhan:</span>
                        <span className="text-xs font-bold text-slate-700 line-clamp-1">
                          {v.complaint || "Konsultasi Umum"}
                        </span>
                      </div>

                      <Link
                        to={`/dashboard/doctor/consultation?visitId=${v.id}`}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold shadow-xs transition ${
                          isConsulting
                            ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
                            : isDone
                            ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            : "bg-indigo-600 text-white hover:bg-indigo-700"
                        }`}
                      >
                        <Stethoscope size={14} />
                        {isConsulting ? "Lanjutkan Periksa" : isDone ? "Lihat Rekam Medis" : "Buka Konsultasi"}
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: JADWAL PRAKTIK MINGGUAN DOKTER */}
      {activeTab === "WEEKLY" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-base text-[#101a3d]">Jadwal Praktik Rutin Mingguan</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Jadwal kehadiran dan jam operasional pelayanan dokter di Klinik Pratama AssistDoc.
              </p>
            </div>
            <span className="rounded-xl bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              Periode Aktif: 2026 / 2027
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Hari</th>
                  <th className="py-3 px-4">Shift Layanan</th>
                  <th className="py-3 px-4">Jam Operasional</th>
                  <th className="py-3 px-4">Ruangan</th>
                  <th className="py-3 px-4">Poli Pelayanan</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {WEEKLY_DOCTOR_SCHEDULE.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-black text-sm text-[#101a3d]">{s.day}</td>
                    <td className="py-3.5 px-4 font-bold text-indigo-700">{s.shift}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 flex items-center gap-1.5 mt-2">
                      <Clock size={13} className="text-slate-400" /> {s.time}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{s.room}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">{s.poli}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-[10px] font-extrabold">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: JADWAL PASIEN KONTROL ULANG (REMINDERS) */}
      {activeTab === "REMINDERS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-[#101a3d]">Jadwal Kontrol Ulang & Tindak Lanjut Pasien</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengingat terjadwal untuk evaluasi hasil terapi, vaksinasi berkala, atau pemeriksaan lab.
              </p>
            </div>
            <span className="rounded-xl bg-cyan-50 px-3 py-1 text-xs font-bold text-[#168c9b]">
              Total {reminders.length} Pengingat
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reminders.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
                <Bell size={36} className="mx-auto mb-2 opacity-40" />
                <h4 className="font-bold text-sm text-[#101a3d]">Belum Ada Jadwal Kontrol Pasien</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Gunakan tombol "Jadwalkan Kontrol Pasien" di atas untuk menambahkan jadwal evaluasi ulang.
                </p>
              </div>
            ) : (
              reminders.map((rem) => {
                const isCompleted = rem.status === "COMPLETED" || rem.effectiveStatus === "COMPLETED";
                const isHangus = rem.isHangus || rem.effectiveStatus === "HANGUS";

                return (
                  <div
                    key={rem.id}
                    className={`rounded-2xl border bg-white p-5 shadow-xs flex flex-col justify-between ${
                      isHangus ? "border-rose-200 bg-rose-50/20" : "border-slate-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {rem.type}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                            isCompleted
                              ? "bg-emerald-100 text-emerald-800"
                              : isHangus
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isCompleted ? "SELESAI (HADIR)" : isHangus ? "HANGUS (TIDAK HADIR)" : rem.status}
                        </span>
                      </div>

                      <div className="mt-3">
                        <h4 className="font-bold text-sm text-[#101a3d]">{rem.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Pasien: <strong className="text-slate-800">{rem.patient?.name || `#ID: ${rem.patientId}`}</strong>
                        </p>
                      </div>

                      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600 font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <Calendar size={14} className="text-indigo-600" />
                        <span>Tanggal: {new Date(rem.date).toLocaleDateString("id-ID", { dateStyle: "long" })}</span>
                      </div>

                      {rem.notes && (
                        <p className="mt-2.5 text-xs text-slate-600 italic bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                          Catatan: {rem.notes}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Telp: {rem.patient?.phone || "-"}
                      </span>
                      <button
                        onClick={() => handleToggleReminder(rem.id, rem.status)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                          isCompleted
                            ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                        }`}
                      >
                        {isCompleted ? "Tandai Belum" : "Selesaikan Jadwal"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH JADWAL KONTROL PASIEN */}
      {showAddReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#101a3d] border-b border-slate-100 pb-3">
              Jadwalkan Kontrol Ulang Pasien
            </h3>

            <form onSubmit={handleCreateReminder} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Pasien *</label>
                <select
                  required
                  value={reminderPatientId}
                  onChange={(e) => setReminderPatientId(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-bold focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- Pilih Pasien Terdaftar --</option>
                  {visits.map((v) => (
                    <option key={v.patient.id} value={v.patient.id}>
                      {v.patient.name} (Antrean: {v.queueNumber || v.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tipe Jadwal</label>
                <select
                  value={reminderType}
                  onChange={(e) => setReminderType(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-bold focus:border-indigo-500 focus:outline-none"
                >
                  <option value="KONTROL">Kontrol Ulang Dokter</option>
                  <option value="VAKSINASI">Vaksinasi Berkala</option>
                  <option value="CEK_LAB">Cek Laboratorium</option>
                </select>
              </div>

              {/* INTERACTIVE VISUAL CALENDAR PICKER */}
              <div>
                <CalendarPicker
                  label="Pilih Tanggal Rencana Kontrol *"
                  value={reminderDate}
                  minDate={new Date().toISOString().split("T")[0]}
                  onChange={(d) => setReminderDate(d)}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Keperluan / Keterangan Jadwal *</label>
                <input
                  required
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  placeholder="Contoh: Evaluasi tensi darah & cek gula darah puasa"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-medium focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Instruksi Dokter untuk Pasien</label>
                <input
                  value={reminderNotes}
                  onChange={(e) => setReminderNotes(e.target.value)}
                  placeholder="Contoh: Puasa 8-10 jam sebelum periksa"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-medium focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddReminderModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingReminder}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-white font-bold shadow-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submittingReminder ? "Menyimpan..." : "Simpan Jadwal Kontrol"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
