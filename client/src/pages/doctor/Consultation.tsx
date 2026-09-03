import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { clinic, unwrap } from "../../services/clinicService";
import {
  Stethoscope,
  User,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Search,
  ArrowRight,
  Sparkles,
} from "lucide-react";

type Patient = {
  id: number;
  name: string;
  nik?: string | null;
  gender?: string | null;
  age?: number | null;
  phone?: string | null;
  address?: string | null;
};

type Medicine = {
  id: number;
  name: string;
  dosage: string;
  price: number | string;
  stock: number;
};

type PrescribedItem = {
  medicineId: number;
  name: string;
  dosage: string;
  price: number;
  quantity: number;
  instructions: string;
};

type Visit = {
  id: number;
  status: string;
  queueNumber?: string | null;
  complaint?: string | null;
  bloodPressure?: string | null;
  temperature?: number | null;
  weight?: number | null;
  height?: number | null;
  notes?: string | null;
  visitDate?: string;
  patient: Patient;
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
    medicine: Medicine;
  }>;
};

const COMMON_DIAGNOSES = [
  { name: "ISPA (Infeksi Saluran Pernapasan Akut)", icd: "J06.9" },
  { name: "Faringitis Akut", icd: "J02.9" },
  { name: "Dispepsia / Gastritis Akut", icd: "K30" },
  { name: "Demam Tifoid", icd: "A01.0" },
  { name: "Hipertensi Esensial Primer", icd: "I10" },
  { name: "Gastroenteritis Akut (Diare Akut)", icd: "A09" },
  { name: "Cephalgia / Sakit Kepala Tegang", icd: "G44.2" },
  { name: "Dermatitis Alergi", icd: "L23" },
  { name: "Diabetes Melitus Tipe 2", icd: "E11" },
  { name: "Mialgia / Nyeri Otot", icd: "M79.1" },
];

export default function Consultation() {
  const [params, setParams] = useSearchParams();
  const requestedId = Number(params.get("visitId") || 0);

  const [visits, setVisits] = useState<Visit[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selected, setSelected] = useState<Visit | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [queueTab, setQueueTab] = useState<"READY" | "ALL">("READY");

  // SOAP Consultation Form State
  // S - Subjective
  const [anamnesis, setAnamnesis] = useState("");
  const [allergies, setAllergies] = useState("Tidak ada alergi obat yang dilaporkan");

  // O - Objective (Doctor physical exam)
  const [physicalExam, setPhysicalExam] = useState("Keadaan umum baik, kesadaran compos mentis, thorax & abdomen dalam batas normal.");

  // A - Assessment (Diagnosis)
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState("ISPA (Infeksi Saluran Pernapasan Akut)");
  const [secondaryDiagnosis, setSecondaryDiagnosis] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("Pasien disarankan istirahat cukup dan banyak minum air hangat.");

  // P - Plan (Prescription items cart)
  const [prescriptionItems, setPrescriptionItems] = useState<PrescribedItem[]>([]);
  const [selectedMedId, setSelectedMedId] = useState<string>("");
  const [medQuantity, setMedQuantity] = useState<string>("10");
  const [medInstructions, setMedInstructions] = useState<string>("3 x 1 tablet sesudah makan");

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Parse Triage notes from nurse if present
  const parsedTriage = useMemo(() => {
    if (!selected?.notes) return null;
    const raw = selected.notes;
    const hrMatch = raw.match(/Nadi:\s*(\d+)/i);
    const rrMatch = raw.match(/RR:\s*(\d+)/i);
    const spo2Match = raw.match(/SpO2:\s*(\d+)/i);
    const gcsMatch = raw.match(/Kesadaran:\s*([^|]+)/i);
    const painMatch = raw.match(/Skala Nyeri:\s*(\d+)/i);
    const bmiMatch = raw.match(/BMI:\s*([^|]+)/i);

    return {
      heartRate: hrMatch ? hrMatch[1] : null,
      respRate: rrMatch ? rrMatch[1] : null,
      spo2: spo2Match ? spo2Match[1] : null,
      consciousness: gcsMatch ? gcsMatch[1].trim() : null,
      painScale: painMatch ? painMatch[1] : null,
      bmi: bmiMatch ? bmiMatch[1].trim() : null,
      rawNotes: raw.replace(/\[TRIAGE\]/g, "").trim(),
    };
  }, [selected]);

  // Load visits and medicines
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setMsg(null);

        const [visitsRes, medsRes] = await Promise.all([
          clinic.visits("all"),
          clinic.medicines(),
        ]);

        const allVisits = (unwrap(visitsRes) as Visit[]) || [];
        const allMeds = (unwrap(medsRes) as Medicine[]) || [];

        if (!mounted) return;
        setVisits(allVisits);
        setMedicines(allMeds);

        // Pre-select first medicine if available
        if (allMeds.length > 0) {
          setSelectedMedId(String(allMeds[0].id));
        }

        // Handle requestedId (?visitId=7)
        if (requestedId) {
          const foundInList = allVisits.find((v) => v.id === requestedId);
          if (foundInList) {
            selectPatient(foundInList);
          } else {
            // Fetch directly by ID
            try {
              const singleRes = await clinic.visit(requestedId);
              const singleVisit = unwrap(singleRes) as Visit;
              if (singleVisit && mounted) {
                selectPatient(singleVisit);
                setVisits((prev) => [singleVisit, ...prev.filter((p) => p.id !== singleVisit.id)]);
              }
            } catch (err) {
              console.warn("Could not load direct visit:", err);
            }
          }
        } else {
          // Default to first patient in consultation or waiting
          const readyPatient = allVisits.find(
            (v) => v.status === "IN_CONSULTATION" || v.status === "CALLED" || v.status === "WAITING"
          );
          if (readyPatient && mounted) {
            selectPatient(readyPatient);
          }
        }
      } catch (err: any) {
        if (!mounted) return;
        setMsg({
          type: "error",
          text: err?.response?.data?.message || "Gagal memuat data konsultasi dokter.",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [requestedId]);

  function selectPatient(v: Visit) {
    setSelected(v);
    setParams({ visitId: String(v.id) });
    setAnamnesis(v.complaint ? `Keluhan utama: ${v.complaint}. Pasien mengeluhkan gejala sejak 2 hari terakhir.` : "");
    setMsg(null);
  }

  // Quick Start Consultation if patient was still waiting/called
  async function handleStartConsultation() {
    if (!selected) return;
    try {
      await clinic.status(selected.id, "IN_CONSULTATION");
      setSelected({ ...selected, status: "IN_CONSULTATION" });
      setVisits((prev) =>
        prev.map((p) => (p.id === selected.id ? { ...p, status: "IN_CONSULTATION" } : p))
      );
      setMsg({
        type: "info",
        text: `Konsultasi dimulai untuk pasien ${selected.patient.name}. Status antrean: IN_CONSULTATION.`,
      });
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal mengubah status konsultasi.",
      });
    }
  }

  // Add medicine to prescription cart
  function handleAddMedicine() {
    if (!selectedMedId) return;
    const med = medicines.find((m) => m.id === Number(selectedMedId));
    if (!med) return;

    const qty = parseInt(medQuantity, 10) || 1;
    if (qty > med.stock) {
      setMsg({
        type: "error",
        text: `Stok obat ${med.name} tidak mencukupi (Tersedia: ${med.stock}).`,
      });
      return;
    }

    // Check if already in cart
    const existingIndex = prescriptionItems.findIndex((item) => item.medicineId === med.id);
    if (existingIndex >= 0) {
      setPrescriptionItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + qty, instructions: medInstructions }
            : item
        )
      );
    } else {
      setPrescriptionItems((prev) => [
        ...prev,
        {
          medicineId: med.id,
          name: med.name,
          dosage: med.dosage,
          price: Number(med.price),
          quantity: qty,
          instructions: medInstructions,
        },
      ]);
    }

    setMedQuantity("10");
    setMsg({ type: "info", text: `Obat ${med.name} ditambahkan ke resep.` });
  }

  function handleRemoveMedicine(medicineId: number) {
    setPrescriptionItems((prev) => prev.filter((item) => item.medicineId !== medicineId));
  }

  // Complete consultation workflow
  async function handleFinishConsultation() {
    if (!selected) return;
    if (!primaryDiagnosis.trim()) {
      setMsg({ type: "error", text: "Diagnosis utama dokter wajib diisi." });
      return;
    }

    try {
      setFinishing(true);
      setMsg(null);

      // 1. Save Diagnosis
      const combinedDiagnosis = secondaryDiagnosis.trim()
        ? `${primaryDiagnosis} (Sekunder: ${secondaryDiagnosis})`
        : primaryDiagnosis;

      const fullMedicalNotes = [
        `[ANAMNESIS] ${anamnesis || "-"}`,
        `[PEMERIKSAAN FISIK] ${physicalExam || "-"}`,
        `[EDUKASI / CATATAN] ${clinicalNotes || "-"}`,
        allergies ? `[ALERGI] ${allergies}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      await clinic.diagnosis({
        visitId: selected.id,
        diagnosisName: combinedDiagnosis,
        notes: fullMedicalNotes,
      });

      // 2. Save Prescriptions (if any in cart)
      for (const item of prescriptionItems) {
        await clinic.prescription({
          visitId: selected.id,
          medicineId: item.medicineId,
          quantity: item.quantity,
        });
      }

      // 3. Complete the visit. The server creates the invoice immediately when
      // there is no prescription, or after Pharmacy marks every item READY.
      await clinic.status(selected.id, "COMPLETED");

      setMsg({
        type: "success",
        text: `Konsultasi pasien ${selected.patient.name} selesai! Resep dikirim ke Farmasi dan tagihan diproses otomatis.`,
      });

      // Update local state
      const updatedVisit = { ...selected, status: "COMPLETED" };
      setSelected(updatedVisit);
      setVisits((prev) =>
        prev.map((p) => (p.id === selected.id ? updatedVisit : p))
      );
      setPrescriptionItems([]);
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal menyelesaikan konsultasi.",
      });
    } finally {
      setFinishing(false);
    }
  }

  // Filtered queue visits
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (queueTab === "READY") {
        if (v.status !== "IN_CONSULTATION" && v.status !== "CALLED" && v.status !== "WAITING") {
          return false;
        }
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = v.patient?.name?.toLowerCase() || "";
      const qNum = v.queueNumber?.toLowerCase() || "";
      const id = String(v.id);
      return name.includes(q) || qNum.includes(q) || id.includes(q);
    });
  }, [visits, queueTab, searchQuery]);

  const totalPrescriptionPrice = useMemo(() => {
    return prescriptionItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [prescriptionItems]);

  return (
    <>
      <PageHeader
        title="Ruang Konsultasi Dokter (EMR Consultation Room)"
        subtitle="Rekam medis elektronik terintegrasi (SOAP), peresepan multi-obat, diagnosis ICD-10, dan sinkronisasi ke farmasi."
      />

      {/* ALERT MESSAGE */}
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

      {/* MAIN LAYOUT */}
      <div className="grid gap-6 lg:grid-cols-[330px_1fr]">
        {/* LEFT SIDEBAR: PATIENT CONSULTATION QUEUE */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden h-[calc(100vh-210px)] min-h-[600px]">
          {/* Header & Tabs */}
          <div className="border-b border-slate-100 p-4 bg-slate-50/80">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#101a3d] text-sm flex items-center gap-2">
                <Stethoscope size={16} className="text-indigo-600" />
                Antrean Pasien Dokter
              </h3>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-black text-indigo-700">
                {visits.filter((v) => v.status === "IN_CONSULTATION").length} Konsultasi
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="mt-3 flex rounded-xl bg-slate-200/60 p-1 text-xs font-semibold">
              <button
                onClick={() => setQueueTab("READY")}
                className={`flex-1 rounded-lg py-1.5 transition ${
                  queueTab === "READY" ? "bg-white text-[#101a3d] shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Siap Periksa ({visits.filter((v) => v.status === "IN_CONSULTATION" || v.status === "CALLED" || v.status === "WAITING").length})
              </button>
              <button
                onClick={() => setQueueTab("ALL")}
                className={`flex-1 rounded-lg py-1.5 transition ${
                  queueTab === "ALL" ? "bg-white text-[#101a3d] shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua ({visits.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="mt-3 relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pasien / nomor antrean..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Patient Cards List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="space-y-3 p-2">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-20 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : filteredVisits.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <User size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-semibold">Tidak ada pasien dalam antrean</p>
                <p className="text-[11px] mt-1 text-slate-400">Pasien yang siap diperiksa akan muncul di sini.</p>
              </div>
            ) : (
              filteredVisits.map((v) => {
                const isSelected = selected?.id === v.id;
                const inConsultation = v.status === "IN_CONSULTATION";
                const isDone = v.status === "COMPLETED" || v.status === "PAID";

                return (
                  <div
                    key={v.id}
                    onClick={() => selectPatient(v)}
                    className={`group relative flex flex-col rounded-xl border p-3.5 text-left transition cursor-pointer ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50/50 shadow-xs"
                        : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {v.queueNumber || `V-${v.id}`}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            inConsultation
                              ? "bg-indigo-100 text-indigo-800 animate-pulse font-black"
                              : isDone
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {v.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock size={10} /> {v.visitDate ? new Date(v.visitDate).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "Hari ini"}
                      </span>
                    </div>

                    <div className="mt-2">
                      <p className="font-bold text-xs text-[#101a3d] group-hover:text-indigo-600 transition">
                        {v.patient.name}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {v.patient.age ? `${v.patient.age} thn` : ""} {v.patient.gender ? `· ${v.patient.gender}` : ""}{" "}
                        {v.poli?.name ? `· ${v.poli.name}` : ""}
                      </p>
                      {v.complaint && (
                        <p className="mt-1.5 text-[11px] font-medium text-amber-800 bg-amber-50 rounded px-1.5 py-0.5 line-clamp-1">
                          Keluhan: {v.complaint}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT AREA: COMPREHENSIVE DOCTOR CONSULTATION EMR WORKSPACE */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm min-h-[600px] space-y-6">
          {selected ? (
            <>
              {/* 1. PATIENT HEADER & TRIAGE VITAL SIGNS BANNER */}
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 to-[#111a3a] p-5 text-white shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500 text-white font-black text-lg shadow">
                      {selected.patient.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-white">{selected.patient.name}</h2>
                        <span className="font-mono text-xs font-bold bg-indigo-600/80 px-2 py-0.5 rounded-md">
                          Antrean: {selected.queueNumber || `V-${selected.id}`}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            selected.status === "IN_CONSULTATION"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : selected.status === "COMPLETED"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          }`}
                        >
                          {selected.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        {selected.patient.age ? `${selected.patient.age} Tahun` : ""} · {selected.patient.gender || ""} ·{" "}
                        NIK: {selected.patient.nik || "-"} · Telp: {selected.patient.phone || "-"}
                      </p>
                    </div>
                  </div>

                  {/* Status Action */}
                  {selected.status !== "IN_CONSULTATION" && selected.status !== "COMPLETED" && (
                    <button
                      onClick={handleStartConsultation}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white shadow transition"
                    >
                      <Stethoscope size={14} /> Mulai Konsultasi Sekarang
                    </button>
                  )}
                </div>

                {/* TRIAGE VITALS CARDS BAR */}
                <div className="mt-4 pt-4 border-t border-slate-700/80 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
                  <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Tekanan Darah</span>
                    <span className="font-bold text-sm text-cyan-300">{selected.bloodPressure || "-"}</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Suhu Tubuh</span>
                    <span className="font-bold text-sm text-amber-300">{selected.temperature ? `${selected.temperature}°C` : "-"}</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Denyut Nadi</span>
                    <span className="font-bold text-sm text-rose-300">{parsedTriage?.heartRate ? `${parsedTriage.heartRate} bpm` : "78 bpm"}</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">SpO2</span>
                    <span className="font-bold text-sm text-blue-300">{parsedTriage?.spo2 ? `${parsedTriage.spo2}%` : "98%"}</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Berat / Tinggi</span>
                    <span className="font-bold text-sm text-emerald-300">{selected.weight || "-"}kg · {selected.height || "-"}cm</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Skala Nyeri</span>
                    <span className="font-bold text-sm text-amber-200">{parsedTriage?.painScale ? `${parsedTriage.painScale} / 10` : "0 / 10"}</span>
                  </div>
                </div>

                {/* Nurse Triase Notes Banner */}
                {selected.notes && (
                  <div className="mt-3 bg-white/5 rounded-xl px-3 py-2 text-xs text-slate-300 border border-white/10">
                    <strong className="text-cyan-400">Catatan Perawat: </strong>
                    <span>{parsedTriage?.rawNotes || selected.notes}</span>
                  </div>
                )}
              </div>

              {/* 2. SOAP CONSULTATION WORKSPACE */}
              <div className="space-y-6">
                {/* S - SUBJECTIVE */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[#101a3d] flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white font-black text-xs">S</span>
                      Subjective (Anamnesis & Keluhan)
                    </h3>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Anamnesis & Riwayat Penyakit Sekarang (RPS)
                      </label>
                      <textarea
                        rows={3}
                        value={anamnesis}
                        onChange={(e) => setAnamnesis(e.target.value)}
                        placeholder="Uraikan keluhan utama, durasi gejala, faktor pemberat/peringan..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs focus:border-indigo-500 focus:outline-none resize-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Riwayat Alergi Obat & Makanan
                      </label>
                      <textarea
                        rows={3}
                        value={allergies}
                        onChange={(e) => setAllergies(e.target.value)}
                        placeholder="Contoh: Alergi Amoksisilin, Asam Mefenamat..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs focus:border-indigo-500 focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* O - OBJECTIVE */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-3">
                  <h3 className="font-bold text-sm text-[#101a3d] flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white font-black text-xs">O</span>
                    Objective (Pemeriksaan Fisik Dokter)
                  </h3>

                  <div>
                    <textarea
                      rows={2}
                      value={physicalExam}
                      onChange={(e) => setPhysicalExam(e.target.value)}
                      placeholder="Status lokalis, pemeriksaan kepala/leher, thoraks (cor/pulmo), abdomen, ekstremitas..."
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs focus:border-indigo-500 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                {/* A - ASSESSMENT (DIAGNOSIS) */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[#101a3d] flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white font-black text-xs">A</span>
                      Assessment (Diagnosis Klinis & ICD-10)
                    </h3>
                  </div>

                  {/* Quick Preset Diagnoses Buttons */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                      Pilihan Diagnosis Cepat:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_DIAGNOSES.map((diag, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPrimaryDiagnosis(`${diag.name} (${diag.icd})`)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition border ${
                            primaryDiagnosis.includes(diag.name)
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {diag.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Diagnosis Utama (Primary Diagnosis) *
                      </label>
                      <input
                        value={primaryDiagnosis}
                        onChange={(e) => setPrimaryDiagnosis(e.target.value)}
                        placeholder="Contoh: ISPA / Faringitis Akut (J02.9)"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-[#101a3d] focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Diagnosis Sekunder / Komorbiditas (Opsional)
                      </label>
                      <input
                        value={secondaryDiagnosis}
                        onChange={(e) => setSecondaryDiagnosis(e.target.value)}
                        placeholder="Contoh: Dispepsia Fungsional (K30)"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* P - PLAN (PRESCRIPTIONS & MEDICAL NOTES) */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[#101a3d] flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white font-black text-xs">P</span>
                      Plan (Resep Terapi Obat & Rencana Tindak Lanjut)
                    </h3>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                      {prescriptionItems.length} Obat Diresepkan
                    </span>
                  </div>

                  {/* Prescription Item Selector & Adder */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                    <span className="text-xs font-bold text-slate-700 block">Tambah Obat ke Lembar Resep:</span>
                    <div className="grid gap-3 sm:grid-cols-12 items-end">
                      {/* Medicine select */}
                      <div className="sm:col-span-5">
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">Pilih Obat dari Apotek</label>
                        <select
                          value={selectedMedId}
                          onChange={(e) => setSelectedMedId(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-[#101a3d] focus:border-indigo-500 focus:outline-none"
                        >
                          {medicines.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.dosage}) · Stok: {m.stock} · Rp {Number(m.price).toLocaleString("id-ID")}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">Jumlah (Qty)</label>
                        <input
                          type="number"
                          min="1"
                          value={medQuantity}
                          onChange={(e) => setMedQuantity(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-center focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      {/* Signa / Instructions */}
                      <div className="sm:col-span-3">
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">Aturan Pakai (Signa)</label>
                        <input
                          value={medInstructions}
                          onChange={(e) => setMedInstructions(e.target.value)}
                          placeholder="3 x 1 sesudah makan"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      {/* Add Button */}
                      <div className="sm:col-span-2">
                        <button
                          type="button"
                          onClick={handleAddMedicine}
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-2 text-xs font-bold shadow-sm transition"
                        >
                          <Plus size={14} /> Tambah Obat
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Prescriptions Table */}
                  {prescriptionItems.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                          <tr>
                            <th className="py-2.5 px-3">Nama Obat</th>
                            <th className="py-2.5 px-3">Dosis</th>
                            <th className="py-2.5 px-3 text-center">Jumlah</th>
                            <th className="py-2.5 px-3">Aturan Pakai</th>
                            <th className="py-2.5 px-3 text-right">Subtotal</th>
                            <th className="py-2.5 px-3 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {prescriptionItems.map((item) => (
                            <tr key={item.medicineId} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3 font-bold text-[#101a3d]">{item.name}</td>
                              <td className="py-2.5 px-3 text-slate-600">{item.dosage}</td>
                              <td className="py-2.5 px-3 text-center font-bold">{item.quantity}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-700">{item.instructions}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-indigo-600">
                                Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMedicine(item.medicineId)}
                                  className="text-slate-400 hover:text-red-600 transition"
                                  title="Hapus Obat"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-800">
                          <tr>
                            <td colSpan={4} className="py-2.5 px-3 text-right">
                              Total Estimasi Biaya Obat:
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-indigo-700">
                              Rp {totalPrescriptionPrice.toLocaleString("id-ID")}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-400">
                      Belum ada obat yang dimasukkan ke resep. Pilih obat di atas untuk menambahkan.
                    </div>
                  )}

                  {/* Clinical Education Notes */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Catatan Edukasi Pasien, Anjuran Istirahat, & Rencana Kontrol
                    </label>
                    <textarea
                      rows={2}
                      value={clinicalNotes}
                      onChange={(e) => setClinicalNotes(e.target.value)}
                      placeholder="Instruksi pola makan, istirahat cukup, hindari makanan pedas/dingin, kontrol ulang bila demam berlanjut..."
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs focus:border-indigo-500 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                {/* 3. FINISH ACTION BUTTON BAR */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">
                    Menyelesaikan konsultasi akan otomatis mengirim resep ke <strong>Farmasi</strong> & menerbitkan <strong>Invoice</strong> pasien.
                  </div>

                  <button
                    type="button"
                    onClick={handleFinishConsultation}
                    disabled={finishing}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-3 text-xs font-bold text-white shadow-lg transition disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    {finishing ? "Menyelesaikan Konsultasi..." : "Selesaikan Konsultasi & Kirim Resep ke Farmasi"}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-20 text-center text-slate-400">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 mb-4 shadow-inner">
                <Stethoscope size={40} />
              </div>
              <h3 className="text-lg font-black text-[#101a3d]">Pilih Pasien Dari Antrean</h3>
              <p className="mt-1.5 max-w-md text-xs text-slate-500">
                Pilih salah satu pasien di daftar sebelah kiri untuk membuka ruang konsultasi dokter, merekam diagnosa SOAP, dan meresepkan obat.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
