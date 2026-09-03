import { useEffect, useMemo, useState } from "react";
import {
  Pill,
  Clock,
  PackageCheck,
  RefreshCw,
  Search,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Printer,
  FileText,
  CheckCheck,
  User,
  Stethoscope,
  X,
  Building2,
  Calendar,
  ShieldAlert,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/dashboard/StatCard";
import Badge from "../../components/common/Badge";
import { clinic, unwrap } from "../../services/clinicService";

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
  invoice?: any;
};

export default function Queue() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{
    type: "success" | "info" | "error";
    text: string;
  } | null>(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "READY">("ALL");
  const [selectedPoli, setSelectedPoli] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [selectedVisitForPrint, setSelectedVisitForPrint] = useState<Visit | null>(null);
  const [selectedVisitForDetail, setSelectedVisitForDetail] = useState<Visit | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const res = await clinic.visits("all");
      const data = unwrap<Visit[]>(res);
      // Only keep visits that actually have prescriptions!
      const pharmacyVisits = (data || []).filter(
        (v) => v.prescriptions && v.prescriptions.length > 0
      );
      setVisits(pharmacyVisits);
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal memuat antrean resep farmasi.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

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
          text: `Memanggil pasien ${patientName} (${queueNumber}) melalui pengeras suara.`,
        });
      } catch (e) {
        console.warn("Speech synthesis error:", e);
      }
    } else {
      setMsg({
        type: "error",
        text: "Fitur panggil suara tidak didukung oleh peramban ini.",
      });
    }
  }

  // Single Prescription Status Update
  async function handleMarkReady(rxId: number, medicineName: string) {
    try {
      const res = await clinic.prescriptionStatus(rxId, "READY");
      const invoiceCreated = res?.invoice ? " Struk & Tagihan otomatis dibuat." : "";
      setMsg({
        type: "success",
        text: `Obat "${medicineName}" berhasil ditandai SIAP.${invoiceCreated}`,
      });
      loadData();
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || `Gagal mengubah status obat ${medicineName}.`,
      });
    }
  }

  // Mark all pending prescriptions for a visit as READY
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
        text: `Seluruh obat untuk pasien ${visit.patient.name} (${visit.queueNumber || `A0${visit.id}`}) siap diambil.`,
      });
      await loadData();
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal memperbarui seluruh resep pasien.",
      });
    } finally {
      setLoading(false);
    }
  }

  // All Prescriptions flat array
  const allRx = useMemo(() => {
    return visits.flatMap((v) =>
      (v.prescriptions || []).map((r) => ({
        ...r,
        patient: v.patient,
        doctor: v.doctor,
        queueNumber: v.queueNumber,
        poli: v.poli,
      }))
    );
  }, [visits]);

  // Statistics
  const pendingCount = useMemo(
    () => allRx.filter((r) => r.status === "PENDING").length,
    [allRx]
  );
  const readyCount = useMemo(
    () => allRx.filter((r) => r.status === "READY").length,
    [allRx]
  );
  const lowStockCount = useMemo(
    () =>
      allRx.filter((r) => r.status === "PENDING" && r.medicine.stock < r.quantity).length,
    [allRx]
  );

  // Distinct Polis
  const poliList = useMemo(() => {
    const map = new Map<string, string>();
    visits.forEach((v) => {
      if (v.poli?.name) map.set(v.poli.name, v.poli.name);
    });
    return Array.from(map.values());
  }, [visits]);

  // Filtered Visits
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      // Poli Filter
      if (selectedPoli !== "ALL" && v.poli?.name !== selectedPoli) {
        return false;
      }

      // Status Filter
      if (statusFilter === "PENDING") {
        const hasPending = v.prescriptions.some((r) => r.status === "PENDING");
        if (!hasPending) return false;
      } else if (statusFilter === "READY") {
        const allReady = v.prescriptions.every((r) => r.status === "READY");
        if (!allReady) return false;
      }

      // Search Query
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
  }, [visits, selectedPoli, statusFilter, searchQuery]);

  return (
    <>
      <PageHeader
        title="Antrean Farmasi & Penyiapan Obat"
        subtitle="Kelola resep masuk, racik obat, verifikasi stok, dan panggil pasien saat obat siap."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
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

      {/* LOW STOCK WARNING BANNER */}
      {lowStockCount > 0 && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-xs">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-sm">
                Peringatan Stok Kritis ({lowStockCount} Obat)
              </p>
              <p className="text-xs text-amber-800">
                Terdapat resep aktif dengan jumlah pemesanan melebihi sisa stok di inventaris. Harap cek inventaris obat.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STAT CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Menunggu Racik / Siap"
          value={pendingCount}
          icon={Clock}
          tone="amber"
          hint="Resep perlu disiapkan"
        />
        <StatCard
          label="Obat Siap Diambil"
          value={readyCount}
          icon={PackageCheck}
          tone="emerald"
          hint="Siap untuk penyerahan"
        />
        <StatCard
          label="Total Pasien Farmasi"
          value={visits.length}
          icon={User}
          tone="cyan"
          hint="Kunjungan hari ini"
        />
        <StatCard
          label="Peringatan Stok"
          value={lowStockCount}
          icon={AlertTriangle}
          tone="rose"
          hint="Stok kurang dari permintaan"
        />
      </div>

      {/* SEARCH & FILTER CONTROLS */}
      <div className="mt-6 rounded-2xl border border-[#dfe3ea] bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Status Resep:</span>
            <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  statusFilter === "ALL"
                    ? "bg-white text-[#1B3C53] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua ({visits.length})
              </button>
              <button
                onClick={() => setStatusFilter("PENDING")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  statusFilter === "PENDING"
                    ? "bg-[#806a1b] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Menunggu ({visits.filter((v) => v.prescriptions.some((r) => r.status === "PENDING")).length})
              </button>
              <button
                onClick={() => setStatusFilter("READY")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  statusFilter === "READY"
                    ? "bg-[#21704b] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Siap Diambil ({visits.filter((v) => v.prescriptions.every((r) => r.status === "READY")).length})
              </button>
            </div>
          </div>

          {/* Poli Select */}
          {poliList.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Poli:</span>
              <select
                value={selectedPoli}
                onChange={(e) => setSelectedPoli(e.target.value)}
                className="rounded-xl border border-[#dfe3ea] bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-[#1B3C53]"
              >
                <option value="ALL">Semua Poli</option>
                {poliList.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama pasien, nomor antrean (mis. A001), nama dokter, atau nama obat..."
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

      {/* QUEUE VISITS LIST */}
      <div className="mt-6 space-y-4">
        {filteredVisits.map((visit) => {
          const qNum = visit.queueNumber || `A0${visit.id}`;
          const allReady = visit.prescriptions.every((r) => r.status === "READY");
          const pendingCountInVisit = visit.prescriptions.filter((r) => r.status === "PENDING").length;

          const totalPrice = visit.prescriptions.reduce(
            (sum, item) => sum + Number(item.medicine.price || 0) * item.quantity,
            0
          );

          return (
            <div
              key={visit.id}
              className={`ad-card overflow-hidden transition ${
                allReady ? "border-emerald-200 bg-emerald-50/20" : "border-[#dfe3ea]"
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece8df] bg-slate-50/70 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-base font-black text-white bg-[#1B3C53] px-3 py-1 rounded-xl shadow-xs">
                    {qNum}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-[#1B3C53] text-base">
                        {visit.patient.name}
                      </h3>
                      <span className="text-xs text-slate-500 font-semibold">
                        ({visit.patient.age} thn · {visit.patient.gender})
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1 font-semibold text-indigo-900">
                        <Stethoscope size={13} /> Dr. {visit.doctor.name}
                      </span>
                      {visit.poli && (
                        <span className="flex items-center gap-1 font-semibold text-slate-600">
                          <Building2 size={13} /> {visit.poli.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar size={13} /> {new Date(visit.visitDate).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Header Status & Main Action */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={allReady ? "emerald" : "amber"}>
                    {allReady ? "SELESAI / SIAP" : `${pendingCountInVisit} BELUM READY`}
                  </Badge>

                  {/* Speaker Call Action */}
                  <button
                    onClick={() => announcePatient(qNum, visit.patient.name)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 shadow-xs transition"
                    title="Panggil pasien melalui pengeras suara"
                  >
                    <Volume2 size={14} /> Panggil Pasien
                  </button>

                  {/* Mark All Ready Button */}
                  {!allReady && (
                    <button
                      onClick={() => handleMarkAllReady(visit)}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition disabled:opacity-50"
                    >
                      <CheckCheck size={14} /> Tandai Semua Siap
                    </button>
                  )}

                  {/* Print Label Button */}
                  <button
                    onClick={() => setSelectedVisitForPrint(visit)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#dfe3ea] bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition"
                  >
                    <Printer size={14} /> Etiket & Struk
                  </button>

                  {/* Clinical Details Modal Trigger */}
                  <button
                    onClick={() => setSelectedVisitForDetail(visit)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#dfe3ea] bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 shadow-xs transition"
                  >
                    <FileText size={14} /> Diagnosa
                  </button>
                </div>
              </div>

              {/* Medicines List Table */}
              <div className="p-4 sm:p-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="pb-3 font-extrabold">Nama Obat & Dosis</th>
                        <th className="pb-3 font-extrabold">Jumlah</th>
                        <th className="pb-3 font-extrabold">Stok Inventaris</th>
                        <th className="pb-3 font-extrabold">Harga / Subtotal</th>
                        <th className="pb-3 font-extrabold text-center">Status</th>
                        <th className="pb-3 font-extrabold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visit.prescriptions.map((rx) => {
                        const isPending = rx.status === "PENDING";
                        const isStockLow = rx.medicine.stock < rx.quantity;
                        const subtotal = Number(rx.medicine.price || 0) * rx.quantity;

                        return (
                          <tr key={rx.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-3 font-bold text-[#1B3C53]">
                              <div className="flex items-center gap-2">
                                <Pill size={15} className="text-[#1B3C53] shrink-0" />
                                <div>
                                  <p className="font-extrabold text-[#1B3C53] text-sm">
                                    {rx.medicine.name}
                                  </p>
                                  <p className="text-[11px] text-slate-500 font-normal">
                                    Dosis: {rx.medicine.dosage}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 font-bold text-slate-800 text-sm">
                              {rx.quantity} <span className="text-xs text-slate-500 font-normal">tablet/unit</span>
                            </td>
                            <td className="py-3">
                              {isStockLow ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-black text-rose-700">
                                  <AlertTriangle size={12} /> Tersisa {rx.medicine.stock} (Kurang!)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-slate-600 font-semibold">
                                  Tersedia {rx.medicine.stock} unit
                                </span>
                              )}
                            </td>
                            <td className="py-3 font-medium text-slate-700">
                              <p className="font-bold text-[#1B3C53]">
                                Rp {subtotal.toLocaleString("id-ID")}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                @ Rp {Number(rx.medicine.price).toLocaleString("id-ID")}
                              </p>
                            </td>
                            <td className="py-3 text-center">
                              <Badge tone={isPending ? "amber" : "emerald"}>
                                {isPending ? "PENDING" : "READY"}
                              </Badge>
                            </td>
                            <td className="py-3 text-right">
                              {isPending ? (
                                <button
                                  onClick={() => handleMarkReady(rx.id, rx.medicine.name)}
                                  disabled={loading}
                                  className="inline-flex items-center gap-1 rounded-xl bg-[#1B3C53] hover:bg-[#117582] px-3 py-1.5 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
                                >
                                  <CheckCircle2 size={13} /> Mark Ready
                                </button>
                              ) : (
                                <span className="text-xs font-bold text-emerald-600 inline-flex items-center gap-1">
                                  <CheckCircle2 size={14} /> Siap
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer Total Summary for Visit */}
                <div className="mt-4 flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <div className="text-slate-500">
                    Total {visit.prescriptions.length} jenis obat untuk pasien ini
                  </div>
                  <div className="font-bold text-[#1B3C53] text-sm">
                    Estimasi Total Obat:{" "}
                    <span className="text-[#1B3C53] font-black">
                      Rp {totalPrice.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!loading && filteredVisits.length === 0 && (
          <div className="ad-card p-12 text-center text-slate-400 space-y-2">
            <Pill size={36} className="mx-auto text-slate-300" />
            <p className="font-bold text-slate-600 text-base">
              Tidak Ada Antrean Resep Sesuai Filter
            </p>
            <p className="text-xs">
              Semua resep obat telah diproses atau tidak ditemukan hasil pencarian.
            </p>
          </div>
        )}
      </div>

      {/* PRINT ETIKET & STRUK MODAL */}
      {selectedVisitForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="ad-card w-full max-w-xl p-6 bg-white space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#1B3C53] text-lg">
                  Cetak Etiket & Ringkasan Resep
                </h3>
                <p className="text-xs text-slate-500">
                  Label resmi obat untuk ditempel pada kemasan pasien.
                </p>
              </div>
              <button
                onClick={() => setSelectedVisitForPrint(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Printable Label View */}
            <div id="printable-rx-label" className="rounded-2xl border-2 border-dashed border-slate-300 p-5 bg-amber-50/30 space-y-4">
              <div className="border-b border-slate-200 pb-3 text-center">
                <h4 className="font-black text-base text-[#1B3C53] uppercase tracking-wider">
                  KLINIK ASSISTDOC PHARMACY
                </h4>
                <p className="text-[11px] text-slate-500">
                  Instalasi Farmasi & Pelayanan Obat Pasien
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">No. Antrean:</span>
                  <span className="font-mono font-black text-sm text-[#1B3C53]">
                    {selectedVisitForPrint.queueNumber || `A0${selectedVisitForPrint.id}`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Tanggal:</span>
                  <span className="font-semibold text-slate-700">
                    {new Date(selectedVisitForPrint.visitDate).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Nama Pasien:</span>
                  <span className="font-bold text-[#1B3C53] text-sm">
                    {selectedVisitForPrint.patient.name} ({selectedVisitForPrint.patient.age} thn)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Dokter Penanggung Jawab:</span>
                  <span className="font-semibold text-slate-700">
                    Dr. {selectedVisitForPrint.doctor.name}
                  </span>
                </div>
              </div>

              <div className="border-t border-b border-slate-200 py-3 space-y-2">
                <p className="text-[11px] font-black uppercase text-slate-500">
                  Daftar Obat & Aturan Pakai:
                </p>
                {selectedVisitForPrint.prescriptions.map((r, i) => (
                  <div key={r.id} className="rounded-lg bg-white p-2.5 border border-slate-200 text-xs">
                    <div className="flex justify-between font-bold text-[#1B3C53]">
                      <span>{i + 1}. {r.medicine.name} ({r.medicine.dosage})</span>
                      <span>{r.quantity} unit</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 italic">
                      Aturan pakai: Sesuai petunjuk dokter / 3x sehari 1 tablet sesudah makan.
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Apoteker Penanggung Jawab</span>
                <span className="font-bold text-[#1B3C53]">Farmasi AssistDoc</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedVisitForPrint(null)}
                className="ad-btn border border-[#dfe3ea] bg-white text-slate-700"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="ad-btn ad-btn-primary"
              >
                <Printer size={16} /> Cetak Struk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLINICAL DETAIL MODAL */}
      {selectedVisitForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="ad-card w-full max-w-lg p-6 bg-white space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#1B3C53] text-lg">
                  Detail Klinis & Diagnosa
                </h3>
                <p className="text-xs text-slate-500">
                  Verifikasi medis dokter untuk peracikan obat.
                </p>
              </div>
              <button
                onClick={() => setSelectedVisitForDetail(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Pasien</span>
                <p className="font-bold text-[#1B3C53] text-sm">
                  {selectedVisitForDetail.patient.name} ({selectedVisitForDetail.patient.age} thn · {selectedVisitForDetail.patient.gender})
                </p>
                <p className="text-slate-500">Alamat: {selectedVisitForDetail.patient.address || "-"}</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Keluhan Utama</span>
                <p className="font-semibold text-slate-800">
                  {selectedVisitForDetail.complaint || "Tidak ada keluhan tertulis."}
                </p>
              </div>

              <div className="rounded-xl bg-indigo-50/50 p-3 border border-indigo-100">
                <span className="text-indigo-800 font-bold block text-[10px] uppercase">Diagnosa Dokter</span>
                {selectedVisitForDetail.diagnoses && selectedVisitForDetail.diagnoses.length > 0 ? (
                  <ul className="mt-1 space-y-1">
                    {selectedVisitForDetail.diagnoses.map((d) => (
                      <li key={d.id} className="font-bold text-[#1B3C53] flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-indigo-600" />
                        {d.diagnosisName} {d.notes ? `(${d.notes})` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500 italic mt-1">Belum ada input diagnosa spesifik.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedVisitForDetail(null)}
                className="ad-btn ad-btn-primary"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

