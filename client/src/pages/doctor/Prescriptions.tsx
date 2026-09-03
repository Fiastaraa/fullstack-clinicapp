import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import { clinic, unwrap } from "../../services/clinicService";
import {
  Pill,
  Search,
  CheckCircle2,
  Clock,
  Plus,
  Printer,
  FileText,
  AlertCircle,
  Sparkles,
  Calendar,
  Layers,
  List,
} from "lucide-react";

type Medicine = {
  id: number;
  name: string;
  dosage: string;
  price: number | string;
  stock: number;
};

type PrescriptionItem = {
  id: number;
  quantity: number;
  status: "PENDING" | "READY";
  medicine: Medicine;
};

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
    name: string;
  } | null;
  diagnoses?: Array<{
    id: number;
    diagnosisName: string;
    notes?: string | null;
  }>;
  prescriptions: PrescriptionItem[];
  invoice?: {
    id: number;
    status: string;
    total: number | string;
  } | null;
};

export default function Prescriptions() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "READY">("ALL");
  const [viewMode, setViewMode] = useState<"SHEET" | "ITEMIZED">("SHEET");
  const [searchQuery, setSearchQuery] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Selected visit for Prescription Print / Detail Modal
  const [selectedVisitForPrint, setSelectedVisitForPrint] = useState<Visit | null>(null);

  // New Prescription Modal State
  const [showNewRxModal, setShowNewRxModal] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<number | "">("");
  const [selectedMedId, setSelectedMedId] = useState<number | "">("");
  const [quantity, setQuantity] = useState<string>("10");
  const [savingRx, setSavingRx] = useState(false);

  // Load visits and medicines
  async function loadData() {
    try {
      setLoading(true);
      const [visitsRes, medsRes] = await Promise.all([
        clinic.visits("all"),
        clinic.medicines(),
      ]);

      const allVisits = (unwrap(visitsRes) as Visit[]) || [];
      const allMeds = (unwrap(medsRes) as Medicine[]) || [];

      // Filter visits that have prescriptions or are active
      setVisits(allVisits);
      setMedicines(allMeds);

      if (allMeds.length > 0) {
        setSelectedMedId(allMeds[0].id);
      }
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal memuat data riwayat resep dokter.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Visits with at least one prescription
  const visitsWithPrescriptions = useMemo(() => {
    return visits.filter((v) => v.prescriptions && v.prescriptions.length > 0);
  }, [visits]);

  // Flattened itemized prescriptions
  const flattenedPrescriptions = useMemo(() => {
    return visitsWithPrescriptions.flatMap((v) =>
      v.prescriptions.map((p) => ({
        ...p,
        visitId: v.id,
        queueNumber: v.queueNumber,
        visitDate: v.visitDate || v.createdAt,
        patient: v.patient,
        doctor: v.doctor,
        poli: v.poli,
        diagnosis: v.diagnoses?.[0]?.diagnosisName || "Konsultasi Umum",
      }))
    );
  }, [visitsWithPrescriptions]);

  // Filtered by search and status
  const filteredVisits = useMemo(() => {
    return visitsWithPrescriptions.filter((v) => {
      // Status filter
      if (statusFilter !== "ALL") {
        const matchStatus = v.prescriptions.some((p) => p.status === statusFilter);
        if (!matchStatus) return false;
      }

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const pName = v.patient?.name?.toLowerCase() || "";
      const qNum = v.queueNumber?.toLowerCase() || "";
      const id = String(v.id);
      const diag = v.diagnoses?.map((d) => d.diagnosisName.toLowerCase()).join(" ") || "";
      const medNames = v.prescriptions.map((p) => p.medicine?.name?.toLowerCase()).join(" ");

      return pName.includes(q) || qNum.includes(q) || id.includes(q) || diag.includes(q) || medNames.includes(q);
    });
  }, [visitsWithPrescriptions, statusFilter, searchQuery]);

  const filteredItemized = useMemo(() => {
    return flattenedPrescriptions.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const pName = item.patient?.name?.toLowerCase() || "";
      const medName = item.medicine?.name?.toLowerCase() || "";
      const qNum = item.queueNumber?.toLowerCase() || "";
      const diag = item.diagnosis.toLowerCase();

      return pName.includes(q) || medName.includes(q) || qNum.includes(q) || diag.includes(q);
    });
  }, [flattenedPrescriptions, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalSheets = visitsWithPrescriptions.length;
    const pendingCount = flattenedPrescriptions.filter((p) => p.status === "PENDING").length;
    const readyCount = flattenedPrescriptions.filter((p) => p.status === "READY").length;
    const totalItems = flattenedPrescriptions.length;
    return { totalSheets, pendingCount, readyCount, totalItems };
  }, [visitsWithPrescriptions, flattenedPrescriptions]);

  // Handle Add New Prescription Item
  async function handleCreatePrescription(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVisitId || !selectedMedId) return;

    try {
      setSavingRx(true);
      await clinic.prescription({
        visitId: Number(selectedVisitId),
        medicineId: Number(selectedMedId),
        quantity: Number(quantity) || 1,
      });

      setMsg({
        type: "success",
        text: "Resep obat berhasil diterbitkan dan dikirim ke Farmasi!",
      });

      setShowNewRxModal(false);
      await loadData();
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal menerbitkan resep.",
      });
    } finally {
      setSavingRx(false);
    }
  }

  // Trigger browser print for prescription sheet
  function handlePrint() {
    window.print();
  }

  return (
    <>
      <PageHeader
        title="Riwayat Resep & Farmasi (E-Prescriptions)"
        subtitle="Manajemen dan pelacakan status penyiapan resep dokter di instalasi farmasi serta salinan lembar resep resmi."
        action={
          <button
            onClick={() => setShowNewRxModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition"
          >
            <Plus size={15} /> Tulis Resep Tambahan
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

      {/* KPI METRICS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shrink-0">
            <FileText size={24} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-slate-400">Total Lembar Resep</span>
            <h3 className="text-2xl font-black text-[#101a3d]">{stats.totalSheets}</h3>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-slate-400">Menunggu di Farmasi</span>
            <h3 className="text-2xl font-black text-amber-700">{stats.pendingCount}</h3>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-slate-400">Obat Siap / Selesai</span>
            <h3 className="text-2xl font-black text-emerald-700">{stats.readyCount}</h3>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 shrink-0">
            <Pill size={24} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-slate-400">Total Item Obat</span>
            <h3 className="text-2xl font-black text-[#101a3d]">{stats.totalItems}</h3>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                statusFilter === "ALL"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Semua ({visitsWithPrescriptions.length})
            </button>
            <button
              onClick={() => setStatusFilter("PENDING")}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                statusFilter === "PENDING"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
              }`}
            >
              Menunggu Farmasi ({stats.pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter("READY")}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                statusFilter === "READY"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
              }`}
            >
              Obat Siap ({stats.readyCount})
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600">
            <button
              onClick={() => setViewMode("SHEET")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                viewMode === "SHEET" ? "bg-white text-indigo-600 shadow-xs" : "hover:text-slate-900"
              }`}
            >
              <Layers size={14} /> Lembar Resep Pasien
            </button>
            <button
              onClick={() => setViewMode("ITEMIZED")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                viewMode === "ITEMIZED" ? "bg-white text-indigo-600 shadow-xs" : "hover:text-slate-900"
              }`}
            >
              <List size={14} /> Rincian Obat
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama pasien, nama obat, nomor resep, atau diagnosis..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-xs font-medium focus:border-indigo-500 focus:bg-white focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
            >
              Hapus
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: GROUPED BY PRESCRIPTION SHEET / VISIT */}
      {viewMode === "SHEET" && (
        <div className="space-y-4">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-100 border border-slate-200" />
            ))
          ) : filteredVisits.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
              <Pill size={40} className="mx-auto mb-2 opacity-40" />
              <h4 className="font-bold text-sm text-[#101a3d]">Tidak Ada Data Resep</h4>
              <p className="text-xs text-slate-400 mt-1">
                Resep yang dikeluarkan dari ruang konsultasi dokter akan muncul di sini.
              </p>
            </div>
          ) : (
            filteredVisits.map((v) => {
              const allReady = v.prescriptions.every((p) => p.status === "READY");
              const hasPending = v.prescriptions.some((p) => p.status === "PENDING");
              const totalPrice = v.prescriptions.reduce(
                (sum, p) => sum + Number(p.medicine?.price || 0) * p.quantity,
                0
              );

              return (
                <div
                  key={v.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-300 transition flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                          No. Resep: RX-{v.id.toString().padStart(4, "0")}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          Antrean: {v.queueNumber || `V-${v.id}`}
                        </span>
                        <span className="text-xs font-bold text-slate-600">
                          Poli: {v.poli?.name || "Poli Umum"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            allReady
                              ? "bg-emerald-100 text-emerald-800"
                              : hasPending
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {allReady ? "OBAT SIAP" : "MENUNGGU RACIK (FARMASI)"}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(v.visitDate || v.createdAt).toLocaleDateString("id-ID", {
                            dateStyle: "medium",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Patient & Doctor Details */}
                    <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-black text-[#101a3d]">{v.patient.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {v.patient.age ? `${v.patient.age} Tahun` : ""} · {v.patient.gender || ""} · No. Telp: {v.patient.phone || "-"}
                        </p>
                        {v.diagnoses && v.diagnoses.length > 0 && (
                          <p className="mt-2 text-xs font-bold text-indigo-700 bg-indigo-50/70 inline-block px-2.5 py-1 rounded-lg border border-indigo-100">
                            Diagnosis: {v.diagnoses[0].diagnosisName}
                          </p>
                        )}
                      </div>

                      <div className="text-right sm:block hidden">
                        <span className="text-[11px] text-slate-400 block">Dokter Penulis Resep:</span>
                        <span className="text-xs font-bold text-slate-800">{v.doctor?.name || "Dokter Jaga"}</span>
                      </div>
                    </div>

                    {/* Medicines Table */}
                    <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100 bg-slate-50/60 p-1">
                      <table className="w-full text-left text-xs">
                        <thead className="text-slate-500 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Obat</th>
                            <th className="p-2.5">Dosis</th>
                            <th className="p-2.5 text-center">Jumlah</th>
                            <th className="p-2.5 text-right">Harga Satuan</th>
                            <th className="p-2.5 text-right">Subtotal</th>
                            <th className="p-2.5 text-center">Status Farmasi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {v.prescriptions.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/50">
                              <td className="p-2.5 font-bold text-[#101a3d]">{p.medicine?.name}</td>
                              <td className="p-2.5 text-slate-600">{p.medicine?.dosage}</td>
                              <td className="p-2.5 text-center font-bold">{p.quantity}</td>
                              <td className="p-2.5 text-right text-slate-600">
                                Rp {Number(p.medicine?.price || 0).toLocaleString("id-ID")}
                              </td>
                              <td className="p-2.5 text-right font-bold text-indigo-700">
                                Rp {(Number(p.medicine?.price || 0) * p.quantity).toLocaleString("id-ID")}
                              </td>
                              <td className="p-2.5 text-center">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                    p.status === "READY"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Footer & Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-slate-600">
                      Total Biaya Obat:{" "}
                      <strong className="text-sm font-black text-indigo-700">
                        Rp {totalPrice.toLocaleString("id-ID")}
                      </strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedVisitForPrint(v)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition"
                      >
                        <Printer size={14} className="text-indigo-600" /> Cetak Lembar R/
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW MODE 2: ITEMIZED TABLE */}
      {viewMode === "ITEMIZED" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">No. Resep</th>
                  <th className="py-3 px-4">Pasien</th>
                  <th className="py-3 px-4">Diagnosis</th>
                  <th className="py-3 px-4">Obat & Dosis</th>
                  <th className="py-3 px-4 text-center">Jumlah</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                  <th className="py-3 px-4 text-center">Status Farmasi</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItemized.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Tidak ada obat yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredItemized.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                        RX-{item.visitId.toString().padStart(4, "0")}
                      </td>
                      <td className="py-3 px-4">
                        <strong className="text-[#101a3d] block">{item.patient?.name}</strong>
                        <span className="text-[11px] text-slate-400">{item.patient?.gender} · {item.patient?.age} thn</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {item.diagnosis}
                      </td>
                      <td className="py-3 px-4">
                        <strong className="text-slate-800 block">{item.medicine?.name}</strong>
                        <span className="text-[11px] text-slate-400">{item.medicine?.dosage}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">{item.quantity}</td>
                      <td className="py-3 px-4 text-right font-bold text-indigo-700">
                        Rp {(Number(item.medicine?.price || 0) * item.quantity).toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                            item.status === "READY"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            const foundVisit = visits.find((v) => v.id === item.visitId);
                            if (foundVisit) setSelectedVisitForPrint(foundVisit);
                          }}
                          className="text-indigo-600 hover:text-indigo-800 font-bold underline text-[11px]"
                        >
                          Lihat Resep
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: SALINAN LEMBAR RESEP RESMI DOKTER (COPY RESEP R/) */}
      {selectedVisitForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto print:m-0 print:p-0 print:shadow-none">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 print:hidden">
              <h3 className="font-bold text-base text-[#101a3d] flex items-center gap-2">
                <FileText size={18} className="text-indigo-600" /> Salinan Lembar Resep Dokter (R/)
              </h3>
              <button
                onClick={() => setSelectedVisitForPrint(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* PRINTABLE PRESCRIPTION SHEET */}
            <div className="rounded-xl border-2 border-slate-800 p-6 bg-white space-y-4 font-serif text-slate-900">
              {/* Clinic Header */}
              <div className="text-center border-b-2 border-slate-800 pb-4">
                <h2 className="text-xl font-black uppercase tracking-wider font-sans text-indigo-950">
                  KLINIK PRATAMA ASSISTDOC
                </h2>
                <p className="text-xs font-sans text-slate-600 mt-0.5">
                  Jl. Kesehatan No. 45, Jakarta · Telp: (021) 555-0199 · Surat Izin Operasional: 445/102/DKS
                </p>
                <div className="mt-2 text-xs font-sans font-bold text-slate-800">
                  Dokter: {selectedVisitForPrint.doctor?.name || "Dr. Pemeriksa"} · SIP: 503/SIP.DU/2024/09
                </div>
              </div>

              {/* Patient Meta */}
              <div className="grid grid-cols-2 text-xs font-sans gap-2 border-b border-slate-300 pb-3">
                <div>
                  <span className="text-slate-500">Nama Pasien: </span>
                  <strong>{selectedVisitForPrint.patient.name}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">No. Resep: </span>
                  <strong className="font-mono">RX-{selectedVisitForPrint.id.toString().padStart(4, "0")}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Usia / JK: </span>
                  <span>{selectedVisitForPrint.patient.age || "-"} thn / {selectedVisitForPrint.patient.gender || "-"}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Tanggal: </span>
                  <span>
                    {new Date(selectedVisitForPrint.visitDate || selectedVisitForPrint.createdAt).toLocaleDateString("id-ID", {
                      dateStyle: "long",
                    })}
                  </span>
                </div>
              </div>

              {/* R/ Formulations */}
              <div className="py-2 space-y-4">
                {selectedVisitForPrint.prescriptions.map((item) => (
                  <div key={item.id} className="pl-4">
                    <div className="text-base font-bold italic">
                      R/ <span className="font-sans font-black">{item.medicine?.name}</span> {item.medicine?.dosage} No. {item.quantity}
                    </div>
                    <div className="text-xs pl-6 text-slate-700 italic font-sans mt-0.5">
                      S. 3 x 1 tablet sesudah makan (prn)
                    </div>
                  </div>
                ))}
              </div>

              {/* Doctor Signature & Pro */}
              <div className="pt-6 border-t border-slate-300 grid grid-cols-2 text-xs font-sans items-end">
                <div>
                  <span className="text-slate-500 block text-[10px]">Pro (Untuk Pasien):</span>
                  <strong className="text-sm">{selectedVisitForPrint.patient.name}</strong>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Keluhan: {selectedVisitForPrint.complaint || "Demam / Nyeri"}
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-slate-500 text-[11px] mb-12">Tanda Tangan Dokter Pemeriksa,</p>
                  <p className="font-bold underline text-slate-900">
                    ({selectedVisitForPrint.doctor?.name || "Dr. Pemeriksa"})
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => setSelectedVisitForPrint(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
              >
                <Printer size={15} /> Cetak Lembar Resep (Print)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TULIS RESEP TAMBAHAN */}
      {showNewRxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#101a3d] border-b border-slate-100 pb-3">
              Tulis Resep Tambahan Dokter
            </h3>

            <form onSubmit={handleCreatePrescription} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Pasien / Kunjungan *</label>
                <select
                  required
                  value={selectedVisitId}
                  onChange={(e) => setSelectedVisitId(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-bold focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- Pilih Pasien Konsultasi --</option>
                  {visits.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.patient.name} (Antrean: {v.queueNumber || v.id} · Status: {v.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Obat dari Apotek *</label>
                <select
                  required
                  value={selectedMedId}
                  onChange={(e) => setSelectedMedId(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-bold focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- Pilih Obat --</option>
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.dosage}) · Stok: {m.stock} · Rp {Number(m.price).toLocaleString("id-ID")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Jumlah Obat (Qty) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-bold focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewRxModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingRx}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-white font-bold shadow-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {savingRx ? "Mengirim..." : "Kirim Resep ke Farmasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
