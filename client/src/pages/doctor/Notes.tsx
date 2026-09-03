import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import { clinic, unwrap } from "../../services/clinicService";
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  Edit3,
  Calendar,
  AlertCircle,
  Bookmark,
  Sparkles,
  ClipboardList,
} from "lucide-react";

type Visit = {
  id: number;
  queueNumber?: string | null;
  status: string;
  complaint?: string | null;
  notes?: string | null;
  bloodPressure?: string | null;
  temperature?: number | null;
  weight?: number | null;
  height?: number | null;
  visitDate: string;
  createdAt: string;
  patient: {
    id: number;
    name: string;
    nik?: string | null;
    gender?: string | null;
    age?: number | null;
    phone?: string | null;
    address?: string | null;
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
  prescriptions?: Array<{
    id: number;
    quantity: number;
    status: string;
    medicine: {
      id: number;
      name: string;
      dosage: string;
    };
  }>;
};

export default function Notes() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "IN_CONSULTATION" | "COMPLETED" | "WAITING">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Edit Note Modal
  const [selectedVisitForEdit, setSelectedVisitForEdit] = useState<Visit | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Medical Certificate (Surat Keterangan Sakit) Modal
  const [selectedVisitForCert, setSelectedVisitForCert] = useState<Visit | null>(null);
  const [restDays, setRestDays] = useState<number>(3);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  // Load visits
  async function loadData() {
    try {
      setLoading(true);
      const res = await clinic.visits("all");
      const allVisits = (unwrap(res) as Visit[]) || [];
      setVisits(allVisits);
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal memuat catatan medis dokter.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Visits
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      // Status filter
      if (statusFilter !== "ALL" && v.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const pName = v.patient?.name?.toLowerCase() || "";
      const qNum = v.queueNumber?.toLowerCase() || "";
      const notes = v.notes?.toLowerCase() || "";
      const complaint = v.complaint?.toLowerCase() || "";
      const diag = v.diagnoses?.map((d) => d.diagnosisName.toLowerCase()).join(" ") || "";

      return pName.includes(q) || qNum.includes(q) || notes.includes(q) || complaint.includes(q) || diag.includes(q);
    });
  }, [visits, statusFilter, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const total = visits.length;
    const withNotes = visits.filter((v) => v.notes && v.notes.trim().length > 0).length;
    const completed = visits.filter((v) => v.status === "COMPLETED" || v.status === "PAID").length;
    const inConsultation = visits.filter((v) => v.status === "IN_CONSULTATION").length;

    return { total, withNotes, completed, inConsultation };
  }, [visits]);

  // Save Note Handler
  async function handleSaveNote() {
    if (!selectedVisitForEdit) return;
    try {
      setSavingNote(true);
      await clinic.notes(selectedVisitForEdit.id, noteContent);

      setVisits((prev) =>
        prev.map((v) => (v.id === selectedVisitForEdit.id ? { ...v, notes: noteContent } : v))
      );

      setMsg({
        type: "success",
        text: `Catatan medis untuk ${selectedVisitForEdit.patient.name} berhasil disimpan!`,
      });
      setSelectedVisitForEdit(null);
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal menyimpan catatan medis.",
      });
    } finally {
      setSavingNote(false);
    }
  }

  // Template inserters
  function insertSOAPTemplate() {
    const sbar =
      `[S - SUBJECTIVE]
Pasien datang dengan keluhan ${selectedVisitForEdit?.complaint || "demam / nyeri"}. Gejala dirasakan sejak 2 hari yang lalu.

[O - OBJECTIVE]
KU baik, kesadaran compos mentis.
TD: ${selectedVisitForEdit?.bloodPressure || "120/80"} mmHg, Suhu: ${selectedVisitForEdit?.temperature || "36.8"}°C, BB: ${selectedVisitForEdit?.weight || "60"} kg.
Pemeriksaan fisik: Paru & jantung dalam batas normal, abdomen supel.

[A - ASSESSMENT]
Diagnosis: ${selectedVisitForEdit?.diagnoses?.[0]?.diagnosisName || "Observasi Klinis"}

[P - PLAN]
Terapi farmakologis oral, anjuran istirahat cukup, hidrasi cairan oral minimal 2 liter/hari. Kontrol bila demam > 3 hari.`;
    setNoteContent(sbar);
  }

  function insertEducationTemplate() {
    const edu =
      `[EDUKASI PASIEN & RENCANA TINDAK LANJUT]
• Istirahat tirah baring selama 2-3 hari.
• Hindari makanan berlemak, terlalu pedas, atau minuman dingin.
• Minum obat sesuai anjuran dan jadwal yang tertera pada etiket.
• Segera periksakan kembali bila terdapat tanda kegawatdaruratan (sesak napas, nyeri dada hebat, muntah terus-menerus).`;
    setNoteContent((prev) => (prev ? `${prev}\n\n${edu}` : edu));
  }

  function insertReferralTemplate() {
    const ref =
      `[CATATAN RUJUKAN LANJUTAN]
Rujukan ke Dokter Spesialis Penyakit Dalam / Poli Terkait untuk evaluasi diagnostik penunjang lanjutan (Laboratorium Darah Lengkap & Pemeriksaan Radiologis).`;
    setNoteContent((prev) => (prev ? `${prev}\n\n${ref}` : ref));
  }

  // Calculate certificate end date
  const endDate = useMemo(() => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + (restDays - 1));
    return d.toISOString().split("T")[0];
  }, [startDate, restDays]);

  return (
    <>
      <PageHeader
        title="Medical Notes"
        subtitle="Dokumentasi perkembangan pasien terintegrasi (CPPT), ringkasan hasil konsultasi klinis, dan penerbitan surat keterangan sakit."
      />

      {/* ALERT BANNER */}
      {msg && (
        <div
          className={`mb-6 flex items-center justify-between rounded-2xl border p-4 text-sm font-semibold shadow-sm transition ${msg.type === "success"
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

      {/* KPI STATS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shrink-0">
            <ClipboardList size={24} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-slate-400">Total Kunjungan</span>
            <h3 className="text-2xl font-black text-[#101a3d]">{metrics.total}</h3>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 shrink-0">
            <FileText size={24} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-slate-400">Catatan Terekam</span>
            <h3 className="text-2xl font-black text-cyan-800">{metrics.withNotes}</h3>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-slate-400">Selesai Konsultasi</span>
            <h3 className="text-2xl font-black text-emerald-700">{metrics.completed}</h3>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-slate-400">Sedang Konsultasi</span>
            <h3 className="text-2xl font-black text-amber-700">{metrics.inConsultation}</h3>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${statusFilter === "ALL"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >
              Semua Pasien ({visits.length})
            </button>
            <button
              onClick={() => setStatusFilter("IN_CONSULTATION")}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${statusFilter === "IN_CONSULTATION"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200"
                }`}
            >
              Sedang Konsultasi ({metrics.inConsultation})
            </button>
            <button
              onClick={() => setStatusFilter("COMPLETED")}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${statusFilter === "COMPLETED"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                }`}
            >
              Selesai ({metrics.completed})
            </button>
          </div>

          <span className="text-xs font-bold text-slate-500">
            Menampilkan {filteredVisits.length} Data
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama pasien, nomor antrean, diagnosis, atau keluhan..."
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

      {/* MEDICAL NOTES LIST */}
      <div className="space-y-4">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-100 border border-slate-200" />
          ))
        ) : filteredVisits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
            <FileText size={40} className="mx-auto mb-2 opacity-40" />
            <h4 className="font-bold text-sm text-[#101a3d]">Tidak Ada Catatan Medis</h4>
            <p className="text-xs text-slate-400 mt-1">
              Pasien yang melakukan konsultasi akan terdokumentasi catatan medisnya di sini.
            </p>
          </div>
        ) : (
          filteredVisits.map((v) => {
            const hasDiagnosis = v.diagnoses && v.diagnoses.length > 0;
            const primaryDiag = hasDiagnosis ? v.diagnoses![0].diagnosisName : "Belum dicatat";

            return (
              <div
                key={v.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-300 transition flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                        {v.queueNumber || `V-${v.id}`}
                      </span>
                      <span className="text-xs font-bold text-slate-600">
                        Poli: {v.poli?.name || "Umum"}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${v.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-800"
                          : v.status === "IN_CONSULTATION"
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-amber-100 text-amber-800"
                          }`}
                      >
                        {v.status}
                      </span>
                    </div>

                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(v.visitDate || v.createdAt).toLocaleDateString("id-ID", {
                        dateStyle: "medium",
                      })}
                    </span>
                  </div>

                  {/* Patient Info & Diagnosis */}
                  <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-black text-[#101a3d]">{v.patient.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {v.patient.age ? `${v.patient.age} Tahun` : ""} · {v.patient.gender || ""} · No. Telp: {v.patient.phone || "-"}
                      </p>
                      {v.complaint && (
                        <p className="mt-1 text-xs text-amber-800 bg-amber-50 rounded-md px-2 py-0.5 inline-block font-semibold">
                          Keluhan Utama: {v.complaint}
                        </p>
                      )}
                    </div>

                    <div className="text-right sm:block hidden">
                      <span className="text-[11px] text-slate-400 block">Dokter Pemeriksa:</span>
                      <span className="text-xs font-bold text-slate-800">{v.doctor?.name || "Dr. Pemeriksa"}</span>
                    </div>
                  </div>

                  {/* Vitals Summary Badge */}
                  {(v.bloodPressure || v.temperature || v.weight) && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {v.bloodPressure && (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                          TD: <strong>{v.bloodPressure}</strong>
                        </span>
                      )}
                      {v.temperature && (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                          Suhu: <strong>{v.temperature}°C</strong>
                        </span>
                      )}
                      {v.weight && (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                          BB: <strong>{v.weight} kg</strong>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Diagnosis & Prescriptions Info */}
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-indigo-50/50 p-3 border border-indigo-100/60">
                      <span className="text-[10px] font-black uppercase text-indigo-700 block mb-1">
                        Diagnosis Medis:
                      </span>
                      <p className="text-xs font-bold text-[#101a3d]">{primaryDiag}</p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/60">
                      <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                        Terapi Obat Diberikan:
                      </span>
                      <p className="text-xs text-slate-700 font-medium">
                        {v.prescriptions && v.prescriptions.length > 0
                          ? v.prescriptions.map((p) => `${p.medicine?.name} (${p.quantity})`).join(", ")
                          : "Tidak ada obat diresepkan"}
                      </p>
                    </div>
                  </div>

                  {/* Clinical Notes (CPPT) Content */}
                  <div className="mt-3.5 rounded-xl bg-slate-50/80 p-3.5 text-xs text-slate-800 border border-slate-200/70 min-h-[64px]">
                    <span className="font-bold text-[10px] uppercase text-slate-400 block mb-1.5 flex items-center gap-1.5">
                      <FileText size={12} className="text-indigo-600" />
                      Catatan Perkembangan Pasien Terintegrasi (CPPT / Medical Advice):
                    </span>
                    {v.notes ? (
                      <p className="whitespace-pre-line text-slate-800 leading-relaxed font-medium">
                        {v.notes}
                      </p>
                    ) : (
                      <span className="italic text-slate-400">
                        Belum ada catatan klinis detail yang direkam untuk kunjungan ini.
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock size={12} /> Terakhir diperbarui:{" "}
                    {new Date(v.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedVisitForCert(v);
                        setStartDate(new Date().toISOString().split("T")[0]);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition"
                    >
                      <Printer size={13} className="text-indigo-600" /> Cetak Surat Sakit
                    </button>

                    <button
                      onClick={() => {
                        setSelectedVisitForEdit(v);
                        setNoteContent(v.notes || "");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition"
                    >
                      <Edit3 size={13} /> {v.notes ? "Edit Catatan" : "Tambah Catatan Medis"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: EDIT CATATAN MEDIS DOKTER */}
      {selectedVisitForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#101a3d]">
                  Catatan Medis & CPPT Pasien
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pasien: <strong>{selectedVisitForEdit.patient.name}</strong> (Antrean #{selectedVisitForEdit.queueNumber || selectedVisitForEdit.id})
                </p>
              </div>
              <button
                onClick={() => setSelectedVisitForEdit(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Template Buttons */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                Template Catatan Cepat:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={insertSOAPTemplate}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
                >
                  <Bookmark size={12} /> Format SOAP CPPT
                </button>
                <button
                  type="button"
                  onClick={insertEducationTemplate}
                  className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 border border-cyan-200 px-2.5 py-1 text-xs font-bold text-cyan-800 hover:bg-cyan-100 transition"
                >
                  <Bookmark size={12} /> Edukasi & Rencana Kontrol
                </button>
                <button
                  type="button"
                  onClick={insertReferralTemplate}
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100 transition"
                >
                  <Bookmark size={12} /> Catatan Rujukan Spesialis
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Isi Catatan Medis / Dokumentasi Klinis Dokter
              </label>
              <textarea
                rows={9}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Tuliskan catatan perkembangan kondisi klinis, respons terapi, hasil observasi, atau anjuran istirahat..."
                className="w-full rounded-xl border border-slate-200 p-3.5 text-xs focus:border-indigo-500 focus:outline-none font-sans leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedVisitForEdit(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={savingNote}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingNote ? "Menyimpan..." : "Simpan Catatan Medis"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SURAT KETERANGAN DOKTER (MEDICAL REST CERTIFICATE) */}
      {selectedVisitForCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 print:hidden">
              <h3 className="font-bold text-base text-[#101a3d] flex items-center gap-2">
                <Printer size={18} className="text-indigo-600" /> Surat Keterangan Sakit / Istirahat
              </h3>
              <button
                onClick={() => setSelectedVisitForCert(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Form Inputs (Hidden on Print) */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-xs print:hidden">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mulai Istirahat Dari Tanggal</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 font-semibold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Lama Istirahat (Jumlah Hari)</label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={restDays}
                  onChange={(e) => setRestDays(Number(e.target.value) || 1)}
                  className="w-full rounded-lg border border-slate-300 p-2 font-bold"
                />
              </div>
            </div>

            {/* PRINTABLE CERTIFICATE SHEET */}
            <div className="rounded-xl border-2 border-slate-800 p-6 bg-white space-y-4 font-serif text-slate-900">
              {/* Header */}
              <div className="text-center border-b-2 border-slate-800 pb-4">
                <h2 className="text-xl font-black uppercase tracking-wider font-sans text-indigo-950">
                  KLINIK PRATAMA ASSISTDOC
                </h2>
                <p className="text-xs font-sans text-slate-600 mt-0.5">
                  Jl. Kesehatan No. 45, Jakarta · Telp: (021) 555-0199 · SIP: 503/SIP.DU/2024/09
                </p>
                <div className="mt-3">
                  <h3 className="text-base font-bold underline uppercase tracking-wide">
                    SURAT KETERANGAN ISTIRAHAT SAKIT
                  </h3>
                  <p className="text-xs font-sans text-slate-500 mt-0.5">
                    Nomor: SKD/{selectedVisitForCert.id}/AD/{new Date().getFullYear()}
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="text-xs leading-relaxed space-y-3 pt-2">
                <p>
                  Yang bertanda tangan di bawah ini, Dokter Pemeriksa Klinik Pratama AssistDoc, dengan ini menerangkan bahwa:
                </p>

                <div className="pl-6 space-y-1.5 font-sans">
                  <div className="grid grid-cols-[140px_1fr]">
                    <span className="text-slate-600">Nama Pasien</span>
                    <strong>: {selectedVisitForCert.patient.name}</strong>
                  </div>
                  <div className="grid grid-cols-[140px_1fr]">
                    <span className="text-slate-600">Umur / Jenis Kelamin</span>
                    <span>: {selectedVisitForCert.patient.age || "-"} Tahun / {selectedVisitForCert.patient.gender || "-"}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr]">
                    <span className="text-slate-600">Pekerjaan / Instansi</span>
                    <span>: Karyawan / Mahasiswa</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr]">
                    <span className="text-slate-600">Diagnosis Klinis</span>
                    <span className="font-bold">: {selectedVisitForCert.diagnoses?.[0]?.diagnosisName || selectedVisitForCert.complaint || "Febris / Gangguan Kesehatan"}</span>
                  </div>
                </div>

                <p className="pt-2">
                  Berhubung sedang dalam keadaan sakit dan memerlukan pemulihan kesehatan, pasien tersebut di atas perlu beristirahat selama{" "}
                  <strong>{restDays} ({restDays === 1 ? "satu" : restDays === 2 ? "dua" : restDays === 3 ? "tiga" : restDays}) hari</strong>, terhitung mulai tanggal{" "}
                  <strong>{new Date(startDate).toLocaleDateString("id-ID", { dateStyle: "long" })}</strong> sampai dengan tanggal{" "}
                  <strong>{new Date(endDate).toLocaleDateString("id-ID", { dateStyle: "long" })}</strong>.
                </p>

                <p className="italic text-slate-600">
                  Demikian surat keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
                </p>
              </div>

              {/* Signature */}
              <div className="pt-8 grid grid-cols-2 text-xs font-sans items-end">
                <div></div>
                <div className="text-center">
                  <p className="text-slate-600 text-xs mb-14">
                    Jakarta, {new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}<br />
                    Dokter Pemeriksa,
                  </p>
                  <p className="font-bold underline text-slate-900">
                    ({selectedVisitForCert.doctor?.name || "Dr. Pemeriksa"})
                  </p>
                  <span className="text-[10px] text-slate-500">SIP: 503/SIP.DU/2024/09</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => setSelectedVisitForCert(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
              >
                <Printer size={15} /> Cetak Surat Sakit (Print)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
