import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PackageCheck,
  Search,
  RefreshCw,
  CheckCheck,
  Volume2,
  ArrowRight,
  ShieldAlert,
  Calendar,
  PackagePlus,
  X,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/dashboard/StatCard";
import Badge from "../../components/common/Badge";
import { clinic, unwrap } from "../../services/clinicService";

type NotificationItem = {
  id: string;
  type: "incoming_rx" | "low_stock" | "ready_rx" | "reminder";
  title: string;
  message: string;
  timestamp: string;
  priority: "high" | "medium" | "low";
  data?: any;
};

export default function Notifications() {
  const [visits, setVisits] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Read notifications set stored in localStorage
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("pharmacist_read_notifs");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Filter & Search
  const [categoryFilter, setCategoryFilter] = useState<
    "ALL" | "incoming_rx" | "low_stock" | "ready_rx" | "reminder"
  >("ALL");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Restock modal state from notification
  const [restockMedicine, setRestockMedicine] = useState<any | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(20);

  // Toast message
  const [msg, setMsg] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  async function loadAllData() {
    setLoading(true);
    try {
      const [vRes, mRes, rRes] = await Promise.all([
        clinic.visits("all"),
        clinic.medicines(),
        clinic.reminders(),
      ]);
      setVisits(unwrap(vRes) || []);
      setMedicines(unwrap(mRes) || []);
      setReminders(unwrap(rRes) || []);
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal memuat notifikasi farmasi.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllData();
  }, []);

  // Persist read IDs
  function saveReadIds(updated: Set<string>) {
    setReadIds(updated);
    try {
      localStorage.setItem(
        "pharmacist_read_notifs",
        JSON.stringify(Array.from(updated))
      );
    } catch (e) {
      console.warn("Failed to persist read notifications:", e);
    }
  }

  function toggleRead(id: string) {
    const next = new Set(readIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    saveReadIds(next);
  }

  function markAllAsRead(allIds: string[]) {
    const next = new Set(readIds);
    allIds.forEach((id) => next.add(id));
    saveReadIds(next);
    setMsg({
      type: "success",
      text: "Semua notifikasi telah ditandai sebagai dibaca.",
    });
  }

  // Voice Announcement
  function announcePatient(queueNumber: string, patientName: string) {
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const text = `Nomor antrean ${queueNumber}, atas nama ${patientName}, silakan menuju Loket Farmasi untuk pengambilan obat.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "id-ID";
        utterance.rate = 0.92;
        window.speechSynthesis.speak(utterance);
        setMsg({
          type: "info",
          text: `Memanggil pasien ${patientName} (${queueNumber}) via pengeras suara.`,
        });
      } catch (e) {
        console.warn("Speech synthesis error:", e);
      }
    }
  }

  // Handle Quick Restock from notification
  async function handleRestockSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!restockMedicine || restockAmount <= 0) return;

    try {
      setLoading(true);
      await clinic.adjustMedicineStock(restockMedicine.id, restockAmount);
      setMsg({
        type: "success",
        text: `Stok "${restockMedicine.name}" berhasil ditambah +${restockAmount} unit.`,
      });
      setRestockMedicine(null);
      loadAllData();
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal menyesuaikan stok obat.",
      });
      setLoading(false);
    }
  }

  // Generate notifications from live data
  const notifications = useMemo(() => {
    const items: NotificationItem[] = [];

    // 1. Low Stock & Out of Stock Alerts
    medicines.forEach((m) => {
      if (m.stock === 0) {
        items.push({
          id: `stock-out-${m.id}`,
          type: "low_stock",
          title: `Stok Obat Habis: ${m.name} (${m.dosage})`,
          message: `Stok saat ini 0 unit di rak farmasi. Obat tidak dapat diresepkan ke pasien. Segera lakukan restock.`,
          timestamp: m.updatedAt || new Date().toISOString(),
          priority: "high",
          data: m,
        });
      } else if (m.stock < 20) {
        items.push({
          id: `stock-low-${m.id}`,
          type: "low_stock",
          title: `Peringatan Stok Menipis: ${m.name} (${m.dosage})`,
          message: `Sisa stok fisik di inventaris hanya tersisa ${m.stock} unit (batas minimum: 20 unit).`,
          timestamp: m.updatedAt || new Date().toISOString(),
          priority: "medium",
          data: m,
        });
      }
    });

    // 2. Incoming Prescriptions & Ready Prescriptions from Visits
    visits.forEach((v) => {
      const rx = v.prescriptions || [];
      if (rx.length === 0) return;

      const qNum = v.queueNumber || `A0${v.id}`;
      const pendingRx = rx.filter((r: any) => r.status === "PENDING");
      const readyRx = rx.filter((r: any) => r.status === "READY");

      // Incoming pending
      if (pendingRx.length > 0) {
        const medNames = pendingRx.map((r: any) => r.medicine?.name).join(", ");
        items.push({
          id: `rx-pending-${v.id}`,
          type: "incoming_rx",
          title: `Resep Baru: ${v.patient?.name} (${qNum})`,
          message: `${pendingRx.length} obat menunggu peracikan: ${medNames}. Dokter: Dr. ${v.doctor?.name} (${v.poli?.name || "Poli"}).`,
          timestamp: v.visitDate || v.createdAt,
          priority: "high",
          data: v,
        });
      }

      // Ready for pickup
      if (readyRx.length > 0 && readyRx.length === rx.length) {
        items.push({
          id: `rx-ready-${v.id}`,
          type: "ready_rx",
          title: `Obat Siap Diserahkan: ${v.patient?.name} (${qNum})`,
          message: `Seluruh ${rx.length} jenis obat telah selesai diracik dan siap diambil di loket penyerahan farmasi.`,
          timestamp: v.visitDate || v.updatedAt,
          priority: "medium",
          data: v,
        });
      }
    });

    // 3. Reminders
    reminders.forEach((rem) => {
      if (rem.status === "PENDING") {
        items.push({
          id: `reminder-${rem.id}`,
          type: "reminder",
          title: `Jadwal Pasien: ${rem.title}`,
          message: `Pengingat untuk ${rem.patient?.name || "Pasien"} pada ${new Date(rem.date).toLocaleDateString("id-ID")}: ${rem.notes || "Kepatuhan pengobatan."}`,
          timestamp: rem.date,
          priority: "low",
          data: rem,
        });
      }
    });

    // Sort by timestamp descending
    return items.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [visits, medicines, reminders]);

  // Statistics
  const pendingRxCount = useMemo(
    () => notifications.filter((n) => n.type === "incoming_rx").length,
    [notifications]
  );
  const lowStockCount = useMemo(
    () => notifications.filter((n) => n.type === "low_stock").length,
    [notifications]
  );
  const readyRxCount = useMemo(
    () => notifications.filter((n) => n.type === "ready_rx").length,
    [notifications]
  );
  const unreadCount = useMemo(
    () => notifications.filter((n) => !readIds.has(n.id)).length,
    [notifications, readIds]
  );

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Category filter
      if (categoryFilter !== "ALL" && n.type !== categoryFilter) {
        return false;
      }

      // Unread only
      if (unreadOnly && readIds.has(n.id)) {
        return false;
      }

      // Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q)
      );
    });
  }, [notifications, categoryFilter, unreadOnly, readIds, searchQuery]);

  return (
    <>
      <PageHeader
        title="Pusat Notifikasi & Peringatan Operasional"
        subtitle="Pantau alur resep masuk, peringatan stok kritis, obat siap diserahkan, dan pengingat farmasi real-time."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => markAllAsRead(notifications.map((n) => n.id))}
              disabled={unreadCount === 0}
              className="ad-btn border border-[#dfe3ea] bg-white text-slate-700 hover:bg-slate-50 shadow-xs disabled:opacity-40"
            >
              <CheckCheck size={15} /> Tandai Semua Dibaca
            </button>
            <button
              onClick={loadAllData}
              disabled={loading}
              className="ad-btn border border-[#dfe3ea] bg-white text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        }
      />

      {/* ALERT BANNER */}
      {msg && (
        <div
          className={`mb-6 flex items-center justify-between rounded-2xl border p-4 text-sm font-semibold shadow-xs transition ${
            msg.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : msg.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-900"
              : "border-cyan-200 bg-cyan-50 text-cyan-900"
          }`}
        >
          <div className="flex items-center gap-3">
            {msg.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            )}
            <span>{msg.text}</span>
          </div>
          <button
            onClick={() => setMsg(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100 transition px-2 py-1"
          >
            Tutup
          </button>
        </div>
      )}

      {/* STAT CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Resep Masuk Menunggu"
          value={pendingRxCount}
          icon={Clock}
          tone="amber"
          hint="Perlu segera diracik"
        />
        <StatCard
          label="Peringatan Stok Kritis"
          value={lowStockCount}
          icon={ShieldAlert}
          tone="rose"
          hint="Stok menipis atau kosong"
        />
        <StatCard
          label="Obat Siap Diambil"
          value={readyRxCount}
          icon={PackageCheck}
          tone="emerald"
          hint="Siap diserahkan ke pasien"
        />
        <StatCard
          label="Belum Dibaca"
          value={unreadCount}
          icon={Bell}
          tone="cyan"
          hint={`Dari ${notifications.length} notifikasi`}
        />
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="mt-6 rounded-2xl border border-[#dfe3ea] bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Kategori:</span>
            <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100 p-1">
              <button
                onClick={() => setCategoryFilter("ALL")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  categoryFilter === "ALL"
                    ? "bg-white text-[#1B3C53] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua ({notifications.length})
              </button>
              <button
                onClick={() => setCategoryFilter("incoming_rx")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  categoryFilter === "incoming_rx"
                    ? "bg-[#806a1b] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Resep Masuk ({pendingRxCount})
              </button>
              <button
                onClick={() => setCategoryFilter("low_stock")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  categoryFilter === "low_stock"
                    ? "bg-[#a13e34] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Peringatan Stok ({lowStockCount})
              </button>
              <button
                onClick={() => setCategoryFilter("ready_rx")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  categoryFilter === "ready_rx"
                    ? "bg-[#21704b] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Siap Diambil ({readyRxCount})
              </button>
              <button
                onClick={() => setCategoryFilter("reminder")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  categoryFilter === "reminder"
                    ? "bg-[#5c43a6] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pengingat ({reminders.length})
              </button>
            </div>
          </div>

          {/* Unread Only Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUnreadOnly(!unreadOnly)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                unreadOnly
                  ? "border-[#1B3C53] bg-teal-50 text-[#1B3C53]"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {unreadOnly ? "✓ Hanya Belum Dibaca" : "Tampilkan Semua"}
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari notifikasi berdasarkan nama pasien, nama obat, atau dokter..."
            className="w-full rounded-xl border border-[#dfe3ea] bg-slate-50/50 pl-10 pr-4 py-2.5 text-xs font-medium focus:border-[#1B3C53] focus:bg-white focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* NOTIFICATIONS FEED */}
      <div className="mt-6 space-y-3">
        {filteredNotifications.map((n) => {
          const isRead = readIds.has(n.id);

          return (
            <div
              key={n.id}
              className={`ad-card p-5 transition flex flex-col sm:flex-row items-start justify-between gap-4 ${
                !isRead
                  ? "border-l-4 border-l-[#1B3C53] bg-teal-50/15"
                  : "opacity-85 hover:opacity-100"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Notification Type Icon */}
                <div
                  className={`grid h-11 w-11 place-items-center rounded-2xl shrink-0 ${
                    n.type === "incoming_rx"
                      ? "bg-amber-100 text-amber-800"
                      : n.type === "low_stock"
                      ? "bg-rose-100 text-rose-800"
                      : n.type === "ready_rx"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-violet-100 text-violet-800"
                  }`}
                >
                  {n.type === "incoming_rx" && <Clock size={20} />}
                  {n.type === "low_stock" && <AlertTriangle size={20} />}
                  {n.type === "ready_rx" && <PackageCheck size={20} />}
                  {n.type === "reminder" && <Calendar size={20} />}
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-extrabold text-[#1B3C53] text-sm">
                      {n.title}
                    </h4>
                    {!isRead && (
                      <span className="rounded-full bg-[#1B3C53] px-2 py-0.5 text-[10px] font-black text-white">
                        BARU
                      </span>
                    )}
                    <Badge
                      tone={
                        n.type === "incoming_rx"
                          ? "amber"
                          : n.type === "low_stock"
                          ? "rose"
                          : n.type === "ready_rx"
                          ? "emerald"
                          : "violet"
                      }
                    >
                      {n.type === "incoming_rx"
                        ? "RESEP MASUK"
                        : n.type === "low_stock"
                        ? "STOK KRITIS"
                        : n.type === "ready_rx"
                        ? "SIAP DIAMBIL"
                        : "PENGINGAT"}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                    {n.message}
                  </p>

                  <p className="text-[11px] text-slate-400 font-medium pt-1">
                    {new Date(n.timestamp).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    ·{" "}
                    {new Date(n.timestamp).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
                {/* Specific actions depending on type */}
                {n.type === "incoming_rx" && (
                  <Link
                    to="/dashboard/pharmacist/queue"
                    onClick={() => toggleRead(n.id)}
                    className="inline-flex items-center gap-1 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 shadow-xs transition"
                  >
                    Buka Antrean <ArrowRight size={13} />
                  </Link>
                )}

                {n.type === "low_stock" && (
                  <button
                    onClick={() => {
                      setRestockMedicine(n.data);
                      setRestockAmount(20);
                      toggleRead(n.id);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 shadow-xs transition"
                  >
                    <PackagePlus size={13} /> Restock Sekarang
                  </button>
                )}

                {n.type === "ready_rx" && (
                  <button
                    onClick={() => {
                      announcePatient(
                        n.data?.queueNumber || `A0${n.data?.id}`,
                        n.data?.patient?.name || "Pasien"
                      );
                      toggleRead(n.id);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100 shadow-xs transition"
                  >
                    <Volume2 size={13} /> Panggil Pasien
                  </button>
                )}

                {/* Read toggle */}
                <button
                  onClick={() => toggleRead(n.id)}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100 transition"
                  title={isRead ? "Tandai Belum Dibaca" : "Tandai Sudah Dibaca"}
                >
                  {isRead ? "Tandai Belum Dibaca" : "Tandai Dibaca"}
                </button>
              </div>
            </div>
          );
        })}

        {!loading && filteredNotifications.length === 0 && (
          <div className="ad-card p-12 text-center text-slate-400 space-y-2">
            <Bell size={36} className="mx-auto text-slate-300" />
            <p className="font-bold text-slate-600 text-base">
              Tidak Ada Notifikasi Sesuai Filter
            </p>
            <p className="text-xs">
              Semua alur kerja farmasi berjalan normal tanpa kendala operasional.
            </p>
          </div>
        )}
      </div>

      {/* MODAL: INSTANT RESTOCK FROM NOTIFICATION */}
      {restockMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="ad-card w-full max-w-md p-6 bg-white space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#1B3C53] text-lg">
                  Restock Cepat Obat
                </h3>
                <p className="text-xs text-slate-500">
                  {restockMedicine.name} ({restockMedicine.dosage})
                </p>
              </div>
              <button
                onClick={() => setRestockMedicine(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-500 font-bold">Sisa Stok Fisik:</span>
                <span className="font-black text-xl text-rose-600">
                  {restockMedicine.stock} unit
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Jumlah Tambahan Unit Restock:
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={restockAmount}
                  onChange={(e) =>
                    setRestockAmount(Math.max(1, parseInt(e.target.value) || 0))
                  }
                  className="ad-input font-bold text-lg text-[#1B3C53]"
                />
              </div>

              <div className="rounded-xl bg-teal-50/70 p-3 border border-teal-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-teal-900">Perkiraan Stok Baru:</span>
                <span className="font-black text-teal-800 text-base">
                  {restockMedicine.stock + restockAmount} unit
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRestockMedicine(null)}
                  className="ad-btn border border-[#dfe3ea] bg-white text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="ad-btn ad-btn-primary"
                >
                  Simpan Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
