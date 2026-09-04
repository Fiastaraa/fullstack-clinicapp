import { useEffect, useMemo, useState } from "react";
import {
  Pill,
  RefreshCw,
  Search,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Printer,
  FileText,
  CheckCheck,
  X,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Badge from "../../components/common/Badge";
import { clinic, unwrap } from "../../services/clinicService";
import { useRealtimeRefresh } from "../../hooks/useRealtimeRefresh";

type Prescription = {
  id: number;
  visitId: number;
  medicineId: number;
  quantity: number;
  status: "PENDING" | "READY";
  medicine: {
    id: number;
    name: string;
    dosage: string;
    price: number | string;
    stock: number;
  };
};

type Visit = {
  id: number;
  queueNumber?: string | null;
  visitDate: string;
  status: string;
  complaint?: string | null;
  bloodPressure?: string | null;
  temperature?: number | null;
  weight?: number | null;
  height?: number | null;
  notes?: string | null;
  patient: {
    id: number;
    name: string;
    age: number;
    gender: string;
    phone: string;
    nik?: string | null;
    address?: string;
  };
  doctor: {
    id: number;
    name: string;
    specialization: string;
  };
  poli?: {
    id: number;
    name: string;
    code: string;
  } | null;
  diagnoses?: Array<{
    id: number;
    diagnosisName: string;
    notes?: string;
  }>;
  prescriptions: Prescription[];
  invoice?: {
    id: number;
    consultationFee: number | string;
    medicineTotal: number | string;
    adminFee: number | string;
    tax: number | string;
    total: number | string;
    status: "UNPAID" | "PAID";
  } | null;
};

export default function Prescriptions() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "READY">("ALL");
  const [dateFilter, setDateFilter] = useState<"today" | "all">("all");

  // Notifications
  const [msg, setMsg] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Print Modals
  const [printMode, setPrintMode] = useState<"etiket" | "salinan_resep" | null>(null);

  async function loadVisits(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await clinic.visits(dateFilter);
      const allVisits = unwrap<Visit[]>(res) || [];
      // Filter only visits that have prescriptions
      const rxVisits = allVisits.filter(
        (v) => v.prescriptions && v.prescriptions.length > 0
      );
      setVisits(rxVisits);

      // Preserve or set selected visit
      if (rxVisits.length > 0) {
        if (!selectedVisitId || !rxVisits.some((v) => v.id === selectedVisitId)) {
          setSelectedVisitId(rxVisits[0].id);
        }
      } else {
        setSelectedVisitId(null);
      }
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal memuat daftar resep.",
      });
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadVisits();
  }, [dateFilter]);

  // Auto-refresh when doctor finishes consultation, prescription is created, or payment is completed
  useRealtimeRefresh(["invoices", "visits", "prescriptions"], () => {
    loadVisits(true);
  });

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

  // Handle Mark Single Item Ready
  async function handleMarkReady(rxId: number, medicineName: string) {
    try {
      const res = await clinic.prescriptionStatus(rxId, "READY");
      const invoiceCreated = res?.invoice ? " Tagihan/Invoice otomatis terbit." : "";
      setMsg({
        type: "success",
        text: `Obat "${medicineName}" siap diserahkan.${invoiceCreated}`,
      });
      loadVisits();
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal memperbarui status obat.",
      });
    }
  }

  // Handle Mark All Items in Visit Ready
  async function handleMarkAllReady(visit: Visit) {
    const pendingItems = visit.prescriptions.filter((r) => r.status === "PENDING");
    if (pendingItems.length === 0) return;

    try {
      setLoading(true);
      for (const item of pendingItems) {
        await clinic.prescriptionStatus(item.id, "READY");
      }
      setMsg({
        type: "success",
        text: `Semua obat untuk ${visit.patient.name} (${visit.queueNumber || `A0${visit.id}`}) telah berstatus SIAP.`,
      });
      await loadVisits();
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal memperbarui semua resep.",
      });
    } finally {
      setLoading(false);
    }
  }

  // Filtered Visits for Left Panel
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      // Status filter
      if (statusFilter === "PENDING") {
        const hasPending = v.prescriptions.some((r) => r.status === "PENDING");
        if (!hasPending) return false;
      } else if (statusFilter === "READY") {
        const allReady = v.prescriptions.every((r) => r.status === "READY");
        if (!allReady) return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const pName = v.patient.name.toLowerCase();
      const qNum = (v.queueNumber || `A0${v.id}`).toLowerCase();
      const docName = v.doctor.name.toLowerCase();
      const rxMatch = v.prescriptions.some((r) =>
        r.medicine.name.toLowerCase().includes(q)
      );

      return (
        pName.includes(q) ||
        qNum.includes(q) ||
        docName.includes(q) ||
        rxMatch
      );
    });
  }, [visits, statusFilter, searchQuery]);

  // Currently Selected Visit
  const selectedVisit = useMemo(() => {
    return visits.find((v) => v.id === selectedVisitId) || null;
  }, [visits, selectedVisitId]);

  // Totals for selected visit
  const totalMedicinePrice = useMemo(() => {
    if (!selectedVisit) return 0;
    return selectedVisit.prescriptions.reduce(
      (sum, r) => sum + Number(r.medicine.price || 0) * r.quantity,
      0
    );
  }, [selectedVisit]);

  const selectedVisitAllReady = useMemo(() => {
    if (!selectedVisit) return false;
    return selectedVisit.prescriptions.every((r) => r.status === "READY");
  }, [selectedVisit]);

  return (
    <>
      <PageHeader
        title="Detail & Verifikasi Resep Farmasi"
        subtitle="Pemeriksaan klinis resep, penyiapan obat, telaah interaksi, dan penerbitan etiket pasien."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={loadVisits}
              disabled={loading}
              className="ad-btn border border-[#dfe3ea] bg-white text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
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
            ) : msg.type === "error" ? (
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            ) : (
              <Volume2 className="h-5 w-5 text-cyan-600 shrink-0" />
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

      {/* WORKSTATION GRID (SPLIT-SCREEN) */}
      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        {/* LEFT PANEL: PRESCRIPTION EXPLORER */}
        <div className="ad-card flex flex-col h-[calc(100vh-210px)] overflow-hidden">
          {/* Explorer Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-[#1B3C53] text-sm flex items-center gap-2">
                <FileText size={16} className="text-[#1B3C53]" />
                Daftar Resep Masuk ({filteredVisits.length})
              </h3>
              <select
                value={dateFilter}
                onChange={(e: any) => setDateFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 outline-none"
              >
                <option value="all">Semua Waktu</option>
                <option value="today">Hari Ini</option>
              </select>
            </div>

            {/* Status filter tabs */}
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200/60 p-1 text-[11px] font-bold">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`rounded-lg py-1.5 transition ${
                  statusFilter === "ALL"
                    ? "bg-white text-[#1B3C53] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setStatusFilter("PENDING")}
                className={`rounded-lg py-1.5 transition ${
                  statusFilter === "PENDING"
                    ? "bg-[#806a1b] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Menunggu
              </button>
              <button
                onClick={() => setStatusFilter("READY")}
                className={`rounded-lg py-1.5 transition ${
                  statusFilter === "READY"
                    ? "bg-[#21704b] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Siap
              </button>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pasien, antrean, dokter, obat..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-medium focus:border-[#1B3C53] focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-[10px] text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5">
            {filteredVisits.map((v) => {
              const qNum = v.queueNumber || `A0${v.id}`;
              const isSelected = v.id === selectedVisitId;
              const allReady = v.prescriptions.every((r) => r.status === "READY");
              const pendingCount = v.prescriptions.filter((r) => r.status === "PENDING").length;

              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVisitId(v.id)}
                  className={`cursor-pointer rounded-xl p-3 transition border text-xs ${
                    isSelected
                      ? "border-[#1B3C53] bg-teal-50/50 shadow-xs"
                      : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono font-black text-xs text-[#1B3C53] bg-[#1B3C53]/10 px-2 py-0.5 rounded-md">
                      {qNum}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                          v.invoice?.status === "PAID"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {v.invoice?.status === "PAID" ? "LUNAS" : "BELUM LUNAS"}
                      </span>
                      <Badge tone={allReady ? "emerald" : "amber"}>
                        {allReady ? "SIAP" : `${pendingCount} Menunggu`}
                      </Badge>
                    </div>
                  </div>

                  <h4 className="font-extrabold text-[#1B3C53] text-sm">
                    {v.patient.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {v.patient.age} thn · {v.patient.gender} · Dr. {v.doctor.name}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-1.5">
                    <span>{v.prescriptions.length} jenis obat</span>
                    <span>
                      {new Date(v.visitDate).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}

            {!loading && filteredVisits.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                Tidak ada resep ditemukan
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: SELECTED PRESCRIPTION WORKSPACE */}
        <div className="space-y-6">
          {selectedVisit ? (
            <>
              {/* PATIENT & DOCTOR CLINICAL BANNER */}
              <div className="ad-card overflow-hidden">
                <div className="bg-[#1B3C53] p-5 text-white flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-500/20 text-[#56c6d0] font-mono text-lg font-black">
                      {selectedVisit.queueNumber || `A0${selectedVisit.id}`}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black">{selectedVisit.patient.name}</h2>
                        <span className="text-xs text-slate-300 font-semibold">
                          ({selectedVisit.patient.age} tahun · {selectedVisit.patient.gender})
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        No. RM: RM-{selectedVisit.patient.id} · Telp: {selectedVisit.patient.phone || "-"}
                      </p>
                    </div>
                  </div>

                  {/* Actions Header */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Audio call button */}
                    <button
                      onClick={() =>
                        announcePatient(
                          selectedVisit.queueNumber || `A0${selectedVisit.id}`,
                          selectedVisit.patient.name
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-400/20 transition"
                    >
                      <Volume2 size={15} /> Panggil Suara
                    </button>

                    {/* Print etiket */}
                    <button
                      onClick={() => setPrintMode("etiket")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-500 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 transition"
                    >
                      <Printer size={15} /> Cetak Etiket
                    </button>

                    {/* Print salinan resep */}
                    <button
                      onClick={() => setPrintMode("salinan_resep")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-500 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 transition"
                    >
                      <FileText size={15} /> Salinan Resep
                    </button>

                    {/* Dispense all button */}
                    {!selectedVisitAllReady && (
                      <button
                        onClick={() => handleMarkAllReady(selectedVisit)}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-black text-slate-950 hover:bg-emerald-400 shadow-xs transition"
                      >
                        <CheckCheck size={16} /> Siapkan Semua Obat
                      </button>
                    )}
                  </div>
                </div>

                {/* Clinical Context Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border-b border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Dokter Pemeriksa
                    </span>
                    <span className="font-bold text-slate-800">
                      Dr. {selectedVisit.doctor.name}
                    </span>
                    <p className="text-[10px] text-slate-500">
                      {selectedVisit.poli?.name || "Poli Umum"}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Keluhan Pasien
                    </span>
                    <span className="font-semibold text-slate-700 truncate block">
                      {selectedVisit.complaint || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Tanda Vital (TTV)
                    </span>
                    <span className="font-semibold text-slate-700">
                      {selectedVisit.bloodPressure ? `TD: ${selectedVisit.bloodPressure}` : "TD: -"} ·{" "}
                      {selectedVisit.temperature ? `${selectedVisit.temperature}°C` : "Suhu: -"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Diagnosa Utama
                    </span>
                    <span className="font-bold text-indigo-900 truncate block">
                      {selectedVisit.diagnoses && selectedVisit.diagnoses.length > 0
                        ? selectedVisit.diagnoses.map((d) => d.diagnosisName).join(", ")
                        : "Tidak ada catatan spesifik"}
                    </span>
                  </div>
                </div>
              </div>

              {/* MEDICINES DISPENSING & SAFETY VERIFICATION TABLE */}
              <div className="ad-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-[#1B3C53] text-base">
                      Rincian Obat & Verifikasi Racikan
                    </h3>
                    <p className="text-xs text-slate-500">
                      Periksa ketersediaan stok fisik di inventaris sebelum menyerahkan obat.
                    </p>
                  </div>
                  <Badge tone={selectedVisitAllReady ? "emerald" : "amber"}>
                    {selectedVisitAllReady
                      ? "SELURUH OBAT SIAP"
                      : "DALAM PROSES PENYIAPAN"}
                  </Badge>
                </div>

                {/* PAYMENT STATUS BANNER (Alur Kasir -> Apotek) */}
                <div
                  className={`flex items-center justify-between rounded-xl border p-3.5 text-xs font-semibold ${
                    selectedVisit.invoice?.status === "PAID"
                      ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
                      : "border-amber-300 bg-amber-50 text-amber-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {selectedVisit.invoice?.status === "PAID" ? (
                      <>
                        <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-bold text-emerald-900">
                            Status Pembayaran: SUDAH LUNAS (Kasir / Midtrans)
                          </p>
                          <p className="text-[11px] text-emerald-700">
                            Pasien telah melunasi tagihan di loket kasir/admin. Obat dapat diserahkan ke pasien.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                        <div>
                          <p className="font-bold text-amber-900">
                            Status Pembayaran: MENUNGGU PEMBAYARAN KASIR
                          </p>
                          <p className="text-[11px] text-amber-700">
                            Pasien belum melunasi tagihan sebesar Rp {Number(selectedVisit.invoice?.total || totalMedicinePrice).toLocaleString("id-ID")} di loket kasir. Pastikan pasien melunasi sebelum obat diserahkan.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                      selectedVisit.invoice?.status === "PAID"
                        ? "bg-emerald-200/60 text-emerald-800"
                        : "bg-amber-200/80 text-amber-900"
                    }`}
                  >
                    {selectedVisit.invoice?.status === "PAID" ? "LUNAS" : "BELUM LUNAS"}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold tracking-wider">
                        <th className="pb-3">Nama Obat & Sediaan</th>
                        <th className="pb-3">Jumlah Permintaan</th>
                        <th className="pb-3">Sisa Stok Apotek</th>
                        <th className="pb-3">Harga Satuan</th>
                        <th className="pb-3">Total Biaya</th>
                        <th className="pb-3 text-center">Status</th>
                        <th className="pb-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedVisit.prescriptions.map((rx) => {
                        const isPending = rx.status === "PENDING";
                        const isLowStock = rx.medicine.stock < rx.quantity;
                        const subtotal = Number(rx.medicine.price || 0) * rx.quantity;

                        return (
                          <tr key={rx.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="grid h-7 w-7 place-items-center rounded-lg bg-teal-50 text-[#1B3C53]">
                                  <Pill size={15} />
                                </div>
                                <div>
                                  <p className="font-extrabold text-[#1B3C53] text-sm">
                                    {rx.medicine.name}
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    Dosis: {rx.medicine.dosage}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 font-bold text-slate-800 text-sm">
                              {rx.quantity} <span className="text-xs text-slate-500 font-normal">tablet/unit</span>
                            </td>
                            <td className="py-3.5">
                              {isLowStock ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-black text-rose-700">
                                  <ShieldAlert size={12} /> Sisa {rx.medicine.stock} (Kurang!)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                                  <ShieldCheck size={13} className="text-emerald-600" /> Sisa {rx.medicine.stock} unit
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 font-medium text-slate-600">
                              Rp {Number(rx.medicine.price).toLocaleString("id-ID")}
                            </td>
                            <td className="py-3.5 font-bold text-[#1B3C53] text-sm">
                              Rp {subtotal.toLocaleString("id-ID")}
                            </td>
                            <td className="py-3.5 text-center">
                              <Badge tone={isPending ? "amber" : "emerald"}>
                                {isPending ? "PENDING" : "READY"}
                              </Badge>
                            </td>
                            <td className="py-3.5 text-right">
                              {isPending ? (
                                <button
                                  onClick={() => handleMarkReady(rx.id, rx.medicine.name)}
                                  disabled={loading}
                                  className="ad-btn ad-btn-primary py-1.5 px-3 text-xs shadow-xs"
                                >
                                  <CheckCircle2 size={13} /> Tandai Siap
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                                  <CheckCircle2 size={14} /> Siap Diambil
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* INSTRUCTIONS & BILLING FOOTER */}
                <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-slate-200 text-xs">
                  {/* Aturan Pakai Note */}
                  <div className="rounded-xl bg-amber-50/50 p-3.5 border border-amber-200/70 space-y-1">
                    <span className="font-extrabold text-amber-900 block text-[11px] uppercase tracking-wider">
                      Instruksi & Etiket Penggunaan
                    </span>
                    <p className="text-slate-600 text-xs">
                      Pastikan pasien menerima edukasi mengenai jadwal minum obat, kepatuhan antibiotik, serta efek samping yang mungkin timbul.
                    </p>
                  </div>

                  {/* Billing Calculation */}
                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal Obat ({selectedVisit.prescriptions.length} item):</span>
                      <span className="font-bold">Rp {totalMedicinePrice.toLocaleString("id-ID")}</span>
                    </div>
                    {selectedVisit.invoice && (
                      <>
                        <div className="flex justify-between text-slate-600">
                          <span>Jasa Konsultasi Dokter:</span>
                          <span className="font-bold">
                            Rp {Number(selectedVisit.invoice.consultationFee).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Biaya Administrasi & PPN:</span>
                          <span className="font-bold">
                            Rp {(Number(selectedVisit.invoice.adminFee) + Number(selectedVisit.invoice.tax)).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-1 font-extrabold text-[#1B3C53] text-sm">
                          <span>Total Tagihan:</span>
                          <span className="text-[#1B3C53]">
                            Rp {Number(selectedVisit.invoice.total).toLocaleString("id-ID")} (
                            {selectedVisit.invoice.status === "PAID" ? "LUNAS" : "BELUM LUNAS"})
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="ad-card p-12 text-center text-slate-400 space-y-3">
              <Pill size={40} className="mx-auto text-slate-300" />
              <p className="font-bold text-slate-600 text-base">
                Pilih Resep untuk Membuka Lembar Kerja
              </p>
              <p className="text-xs">
                Pilih salah satu resep pasien di panel kiri untuk melihat rincian obat, status racikan, dan riwayat klinis.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL PRINT: ETIKET OBAT ATAU SALINAN RESEP */}
      {printMode && selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="ad-card w-full max-w-xl p-6 bg-white space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#1B3C53] text-lg">
                  {printMode === "etiket"
                    ? "Cetak Etiket Obat Pasien"
                    : "Cetak Salinan Resep (Apograph)"}
                </h3>
                <p className="text-xs text-slate-500">
                  {printMode === "etiket"
                    ? "Label stiker untuk ditempelkan pada wadah/kemasan obat."
                    : "Dokumen resmi salinan resep klinik untuk arsip atau rujukan pasien."}
                </p>
              </div>
              <button
                onClick={() => setPrintMode(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Printable Preview */}
            <div className="rounded-2xl border-2 border-dashed border-slate-300 p-6 bg-amber-50/20 space-y-4">
              <div className="border-b border-slate-200 pb-3 text-center">
                <h4 className="font-black text-lg text-[#1B3C53] uppercase tracking-wider">
                  INSTALASI FARMASI KLINIK ASSISTDOC
                </h4>
                <p className="text-xs text-slate-500">
                  Jl. Kesehatan Sejahtera No. 45 · Telp: (021) 555-1234
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-b border-slate-200 pb-3">
                <div>
                  <span className="text-slate-400 block text-[10px]">No. Antrean & Resep:</span>
                  <span className="font-mono font-bold text-sm text-[#1B3C53]">
                    {selectedVisit.queueNumber || `A0${selectedVisit.id}`} / RX-{selectedVisit.id}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Tanggal:</span>
                  <span className="font-semibold text-slate-700">
                    {new Date(selectedVisit.visitDate).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Nama Pasien:</span>
                  <span className="font-bold text-[#1B3C53] text-sm">
                    {selectedVisit.patient.name} ({selectedVisit.patient.age} thn)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Dokter Penulis:</span>
                  <span className="font-semibold text-slate-700">
                    Dr. {selectedVisit.doctor.name}
                  </span>
                </div>
              </div>

              {/* Medicines on Label/Copy */}
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase text-slate-500">
                  Rincian Obat & Aturan Pakai:
                </p>
                {selectedVisit.prescriptions.map((r, i) => (
                  <div key={r.id} className="rounded-xl bg-white p-3 border border-slate-200 text-xs">
                    <div className="flex justify-between font-bold text-[#1B3C53]">
                      <span>
                        {i + 1}. {r.medicine.name} ({r.medicine.dosage})
                      </span>
                      <span>{r.quantity} unit</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 italic">
                      Aturan Pakai: Sesuai petunjuk dokter / 3 x sehari 1 tablet sesudah makan.
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-6 border-t border-slate-200">
                <div>
                  <p className="text-[10px] text-slate-400">Pemberi Resep:</p>
                  <p className="font-bold text-slate-700 mt-6">Dr. {selectedVisit.doctor.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400">Apoteker Penanggung Jawab:</p>
                  <p className="font-bold text-[#1B3C53] mt-6">Apt. Farmasis AssistDoc</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPrintMode(null)}
                className="ad-btn border border-[#dfe3ea] bg-white text-slate-700"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="ad-btn ad-btn-primary"
              >
                <Printer size={16} /> Cetak Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
