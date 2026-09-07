import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/dashboard/StatCard";
import CalendarPicker from "../../components/common/CalendarPicker";
import { clinic, unwrap } from "../../services/clinicService";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  RefreshCw,
  RotateCcw,
  User,
  Phone,
  Sparkles,
} from "lucide-react";

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
  createdAt: string;
  patient?: {
    id: number;
    name: string;
    nik?: string | null;
    gender?: string | null;
    age?: number | null;
    phone?: string | null;
  };
};

export default function AdminSchedulesPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "COMPLETED" | "HANGUS">("ALL");
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Reschedule Modal State
  const [selectedForReschedule, setSelectedForReschedule] = useState<Reminder | null>(null);
  const [newDate, setNewDate] = useState("");
  const [rescheduleNotes, setRescheduleNotes] = useState("");
  const [savingReschedule, setSavingReschedule] = useState(false);

  const todayStr = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setMsg(null);
      const res = await clinic.reminders();
      const all = (unwrap(res) as Reminder[]) || [];
      setReminders(all);
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal memuat daftar jadwal kontrol.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Compute status metrics
  const stats = useMemo(() => {
    const total = reminders.length;
    const completed = reminders.filter((r) => r.status === "COMPLETED" || r.effectiveStatus === "COMPLETED").length;
    const hangus = reminders.filter((r) => r.isHangus || r.effectiveStatus === "HANGUS").length;
    const pending = reminders.filter(
      (r) => !r.isHangus && r.status !== "COMPLETED" && r.effectiveStatus !== "HANGUS" && r.effectiveStatus !== "COMPLETED"
    ).length;

    return { total, completed, hangus, pending };
  }, [reminders]);

  // Filtered Reminders
  const filteredReminders = useMemo(() => {
    return reminders.filter((rem) => {
      const isCompleted = rem.status === "COMPLETED" || rem.effectiveStatus === "COMPLETED";
      const isHangus = rem.isHangus || rem.effectiveStatus === "HANGUS";
      const isPending = !isCompleted && !isHangus;

      if (statusFilter === "PENDING" && !isPending) return false;
      if (statusFilter === "COMPLETED" && !isCompleted) return false;
      if (statusFilter === "HANGUS" && !isHangus) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const pName = rem.patient?.name?.toLowerCase() || "";
      const pPhone = rem.patient?.phone?.toLowerCase() || "";
      const title = rem.title.toLowerCase();
      const notes = rem.notes?.toLowerCase() || "";

      return pName.includes(q) || pPhone.includes(q) || title.includes(q) || notes.includes(q);
    });
  }, [reminders, statusFilter, searchQuery]);

  function openRescheduleModal(rem: Reminder) {
    setSelectedForReschedule(rem);
    // Default to existing date or tomorrow
    const d = new Date(rem.date);
    const existingStr = !isNaN(d.getTime())
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      : todayStr;
    setNewDate(existingStr);
    setRescheduleNotes("Pasien berhalangan hadir pada tanggal semula.");
  }

  async function handleSaveReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedForReschedule || !newDate) return;

    try {
      setSavingReschedule(true);
      const res = await clinic.rescheduleReminder(
        selectedForReschedule.id,
        new Date(newDate).toISOString(),
        rescheduleNotes.trim() || undefined
      );

      const updated = unwrap(res) as Reminder;
      setReminders((prev) =>
        prev.map((r) => (r.id === selectedForReschedule.id ? { ...r, ...updated } : r))
      );

      setMsg({
        type: "success",
        text: `Jadwal kontrol pasien ${selectedForReschedule.patient?.name || ""} berhasil di-reschedule ke ${new Date(newDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}!`,
      });
      setSelectedForReschedule(null);
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal melakukan reschedule jadwal kontrol.",
      });
    } finally {
      setSavingReschedule(false);
    }
  }

  async function handleToggleCompleted(rem: Reminder) {
    const isCompleted = rem.status === "COMPLETED" || rem.effectiveStatus === "COMPLETED";
    const nextStatus = isCompleted ? "PENDING" : "COMPLETED";
    try {
      await clinic.updateReminderStatus(rem.id, nextStatus);
      setReminders((prev) =>
        prev.map((r) =>
          r.id === rem.id
            ? {
                ...r,
                status: nextStatus,
                effectiveStatus: nextStatus,
                isHangus: false,
              }
            : r
        )
      );
      setMsg({
        type: "info",
        text: `Status jadwal pasien ${rem.patient?.name || ""} diperbarui menjadi ${nextStatus}.`,
      });
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal memperbarui status kontrol.",
      });
    }
  }

  return (
    <>
      <PageHeader
        title="Manajemen Jadwal Kontrol Pasien (Schedule & Reschedule)"
        subtitle="Pantau jadwal kontrol pasien dari dokter, ubah tanggal (reschedule) jika pasien berhalangan hadir, dan pantau status jadwal hangus."
        action={
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh Data
          </button>
        }
      />

      {/* ALERT MESSAGE */}
      {msg && (
        <div
          className={`mb-6 flex items-center justify-between rounded-2xl border p-4 text-xs font-semibold shadow-sm transition ${
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
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
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

      {/* STATS OVERVIEW */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Jadwal Kontrol"
          value={stats.total}
          icon={Calendar}
          tone="cyan"
        />
        <StatCard
          label="Aktif / Menunggu"
          value={stats.pending}
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Selesai (Hadir)"
          value={stats.completed}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="Hangus (Lewat Tanggal)"
          value={stats.hangus}
          icon={AlertTriangle}
          tone="rose"
        />
      </div>

      {/* MAIN CONTAINER */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* FILTERS & SEARCH BAR */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5 bg-slate-50/70">
          {/* Tab Filter */}
          <div className="flex flex-wrap rounded-xl bg-slate-200/60 p-1 text-xs font-bold">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`rounded-lg px-3.5 py-1.5 transition ${
                statusFilter === "ALL" ? "bg-white text-[#101a3d] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter("PENDING")}
              className={`rounded-lg px-3.5 py-1.5 transition ${
                statusFilter === "PENDING" ? "bg-white text-[#101a3d] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Aktif ({stats.pending})
            </button>
            <button
              onClick={() => setStatusFilter("COMPLETED")}
              className={`rounded-lg px-3.5 py-1.5 transition ${
                statusFilter === "COMPLETED" ? "bg-white text-[#101a3d] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Selesai ({stats.completed})
            </button>
            <button
              onClick={() => setStatusFilter("HANGUS")}
              className={`rounded-lg px-3.5 py-1.5 transition ${
                statusFilter === "HANGUS" ? "bg-white text-rose-600 shadow-xs" : "text-rose-700 hover:text-rose-900"
              }`}
            >
              Hangus ({stats.hangus})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama pasien, telepon, keperluan..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* SCHEDULE LIST */}
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-24 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : filteredReminders.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Calendar size={40} className="mx-auto mb-2 opacity-40" />
              <p className="font-bold text-sm text-[#101a3d]">Tidak Ada Jadwal Kontrol Ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">
                {statusFilter === "HANGUS"
                  ? "Bagus! Tidak ada jadwal kontrol yang terlewat / hangus."
                  : "Daftar jadwal kontrol yang dibuat oleh dokter akan ditampilkan di sini."}
              </p>
            </div>
          ) : (
            filteredReminders.map((rem) => {
              const isCompleted = rem.status === "COMPLETED" || rem.effectiveStatus === "COMPLETED";
              const isHangus = rem.isHangus || rem.effectiveStatus === "HANGUS";

              return (
                <div
                  key={rem.id}
                  className={`p-5 transition flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/80 ${
                    isHangus ? "bg-rose-50/20" : ""
                  }`}
                >
                  {/* Left: Patient Info & Schedule Details */}
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                        {rem.type}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wide ${
                          isCompleted
                            ? "bg-emerald-100 text-emerald-800"
                            : isHangus
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {isCompleted ? "SELESAI (HADIR)" : isHangus ? "HANGUS (TIDAK HADIR)" : "TERJADWAL"}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-[#101a3d]">{rem.title}</h4>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1 font-bold text-slate-800">
                        <User size={13} className="text-indigo-600" />
                        {rem.patient?.name || `Pasien #${rem.patientId}`}
                        {rem.patient?.age ? ` (${rem.patient.age} thn)` : ""}
                      </span>
                      {rem.patient?.phone && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Phone size={12} />
                          {rem.patient.phone}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl w-fit">
                      <Calendar size={14} className="text-indigo-600" />
                      <span>
                        Jadwal: {new Date(rem.date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    </div>

                    {rem.notes && (
                      <div className="text-xs text-slate-600 bg-amber-50/50 border border-amber-100/70 p-2.5 rounded-xl">
                        <strong>Catatan / Riwayat Reschedule:</strong>
                        <p className="whitespace-pre-line mt-0.5 text-[11px] text-slate-700 font-medium">
                          {rem.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 ml-auto">
                    {/* Reschedule Button */}
                    <button
                      type="button"
                      onClick={() => openRescheduleModal(rem)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3.5 py-2 text-xs font-bold shadow-xs transition"
                    >
                      <RotateCcw size={14} />
                      Reschedule Tanggal
                    </button>

                    {/* Toggle Completed */}
                    <button
                      type="button"
                      onClick={() => handleToggleCompleted(rem)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold shadow-xs transition ${
                        isCompleted
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      <CheckCircle2 size={14} />
                      {isCompleted ? "Batal Selesai" : "Tandai Hadir"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RESCHEDULE MODAL WITH VISUAL CALENDAR PICKER */}
      {selectedForReschedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#101a3d] flex items-center gap-2">
                  <RotateCcw size={18} className="text-indigo-600" />
                  Reschedule Tanggal Kontrol Pasien
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ubah tanggal jika pasien berhalangan hadir pada jadwal semula.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedForReschedule(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Patient & Old Date Card */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs space-y-1">
              <p className="font-bold text-slate-800">
                Pasien: <span className="text-indigo-600 font-extrabold">{selectedForReschedule.patient?.name || `#ID: ${selectedForReschedule.patientId}`}</span>
              </p>
              <p className="text-slate-500">
                Keperluan: <strong>{selectedForReschedule.title}</strong>
              </p>
              <p className="text-slate-500">
                Tanggal Semula:{" "}
                <span className="font-semibold text-rose-600">
                  {new Date(selectedForReschedule.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </p>
            </div>

            <form onSubmit={handleSaveReschedule} className="space-y-4 text-xs">
              {/* INTERACTIVE VISUAL CALENDAR PICKER */}
              <div>
                <CalendarPicker
                  label="Pilih Tanggal Kontrol Baru (Reschedule)"
                  value={newDate}
                  minDate={todayStr}
                  onChange={(dateStr) => setNewDate(dateStr)}
                />
              </div>

              {/* Reschedule Reason */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Alasan Reschedule / Catatan Tambahan Admin
                </label>
                <textarea
                  rows={2}
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  placeholder="Contoh: Pasien berhalangan hadir karena keperluan mendadak. Menghubungi klinik via WA untuk ganti jadwal."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedForReschedule(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingReschedule || !newDate}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-white font-bold shadow-md transition disabled:opacity-50"
                >
                  <RotateCcw size={14} />
                  {savingReschedule ? "Menyimpan Reschedule..." : "Simpan Tanggal Baru"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
