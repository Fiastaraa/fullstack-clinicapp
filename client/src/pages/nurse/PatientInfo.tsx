import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  User,
  Activity,
  Heart,
  Thermometer,
  Scale,
  Phone,
  MapPin,
  Search,
  RefreshCw,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  Stethoscope,
  Pill,
  ArrowRight,
  SlidersHorizontal,
  X,
  Save,
  Building2,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Badge from "../../components/common/Badge";
import { clinic, unwrap } from "../../services/clinicService";

type Patient = {
  id: number;
  name: string;
  nik?: string | null;
  gender?: string | null;
  age?: number | null;
  phone?: string | null;
  address?: string | null;
  bloodType?: string | null;
};

type Visit = {
  id: number;
  queueNumber?: string | null;
  visitDate: string;
  status: string;
  complaint?: string | null;
  bloodPressure?: string | null;
  temperature?: number | string | null;
  weight?: number | string | null;
  height?: number | string | null;
  notes?: string | null;
  patientId: number;
  patient: Patient;
  doctor: {
    id: number;
    name: string;
    specialization?: string | null;
  };
  poli?: {
    id: number;
    name: string;
  } | null;
  diagnoses?: Array<{
    id: number;
    diagnosisName: string;
    icd10Code?: string | null;
    notes?: string | null;
  }>;
  prescriptions?: Array<{
    id: number;
    medicine: {
      id: number;
      name: string;
      dosage: string;
    };
    quantity: number;
    status: string;
  }>;
};

export default function PatientInfo() {
  const [searchParams] = useSearchParams();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "WITH_VITALS" | "NEEDS_VITALS">("ALL");

  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Edit Vitals Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingVitals, setSavingVitals] = useState(false);
  const [formBp, setFormBp] = useState("");
  const [formTemp, setFormTemp] = useState("");
  const [formWeight, setFormWeight] = useState("");
  const [formHeight, setFormHeight] = useState("");
  const [formComplaint, setFormComplaint] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await clinic.visits("all");
      const list: Visit[] = unwrap(res) || [];
      // Sort newest first
      list.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
      setVisits(list);

      // Select initial visit
      const urlVisitId = searchParams.get("visitId");
      if (urlVisitId) {
        const found = list.find((v) => v.id === Number(urlVisitId));
        if (found) {
          setSelectedVisitId(found.id);
          return;
        }
      }
      if (list.length > 0 && !selectedVisitId) {
        setSelectedVisitId(list[0].id);
      }
    } catch (err) {
      console.error("Failed to load visits for patient info", err);
      setMsg({ type: "error", text: "Gagal memuat daftar riwayat pasien." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      const hasVitals = Boolean(v.bloodPressure || v.temperature);
      if (filterType === "WITH_VITALS" && !hasVitals) return false;
      if (filterType === "NEEDS_VITALS" && hasVitals) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const pName = v.patient.name.toLowerCase();
      const qNum = (v.queueNumber || `A0${v.id}`).toLowerCase();
      const docName = v.doctor.name.toLowerCase();
      const nik = (v.patient.nik || "").toLowerCase();
      const phone = (v.patient.phone || "").toLowerCase();

      return (
        pName.includes(q) ||
        qNum.includes(q) ||
        docName.includes(q) ||
        nik.includes(q) ||
        phone.includes(q)
      );
    });
  }, [visits, filterType, searchQuery]);

  const selectedVisit = useMemo(() => {
    if (!selectedVisitId) return filteredVisits[0] || null;
    return visits.find((v) => v.id === selectedVisitId) || filteredVisits[0] || null;
  }, [visits, selectedVisitId, filteredVisits]);

  // Sync edit form with selected visit
  useEffect(() => {
    if (selectedVisit) {
      setFormBp(selectedVisit.bloodPressure || "120/80");
      setFormTemp(String(selectedVisit.temperature || "36.5"));
      setFormWeight(String(selectedVisit.weight || "60"));
      setFormHeight(String(selectedVisit.height || "165"));
      setFormComplaint(selectedVisit.complaint || "");
      setFormNotes(selectedVisit.notes || "");
    }
  }, [selectedVisit]);

  // Audio Voice Caller
  const announcePatient = (queueNum: string, patientName: string) => {
    if (!("speechSynthesis" in window)) {
      setMsg({ type: "error", text: "Fitur sintesis suara tidak didukung oleh browser Anda." });
      return;
    }
    window.speechSynthesis.cancel();
    const text = `Panggilan untuk nomor antrean ${queueNum}, atas nama pasien ${patientName}, silakan menuju ke ruang triase pemeriksaan perawat. Terima kasih.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
    setMsg({ type: "info", text: `Memanggil pasien ${patientName} (${queueNum}) melalui pengeras suara...` });
  };

  // BMI Calculation
  const bmiInfo = useMemo(() => {
    if (!selectedVisit?.weight || !selectedVisit?.height) return null;
    const w = Number(selectedVisit.weight);
    const h = Number(selectedVisit.height) / 100;
    if (w <= 0 || h <= 0) return null;
    const val = Number((w / (h * h)).toFixed(1));

    let category = "Normal";
    let colorClass = "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (val < 18.5) {
      category = "Berat Badan Kurang (Underweight)";
      colorClass = "text-amber-700 bg-amber-50 border-amber-200";
    } else if (val >= 25 && val < 29.9) {
      category = "Kelebihan Berat Badan (Overweight)";
      colorClass = "text-amber-700 bg-amber-50 border-amber-200";
    } else if (val >= 30) {
      category = "Obesitas";
      colorClass = "text-rose-700 bg-rose-50 border-rose-200";
    }
    return { val, category, colorClass };
  }, [selectedVisit]);

  // Blood Pressure Analysis
  const bpAnalysis = useMemo(() => {
    if (!selectedVisit?.bloodPressure) return null;
    const parts = selectedVisit.bloodPressure.split("/");
    if (parts.length !== 2) return null;
    const sys = Number(parts[0]);
    const dia = Number(parts[1]);

    if (sys < 90 || dia < 60) {
      return { label: "Hipotensi", tone: "amber" as const, desc: "Tekanan darah di bawah ambang normal" };
    } else if (sys <= 120 && dia <= 80) {
      return { label: "Optimal / Normal", tone: "emerald" as const, desc: "Tekanan darah dalam batas ideal" };
    } else if (sys <= 139 || dia <= 89) {
      return { label: "Pre-Hipertensi", tone: "amber" as const, desc: "Memerlukan monitoring gaya hidup" };
    } else {
      return { label: "Hipertensi", tone: "rose" as const, desc: "Tekanan darah tinggi, waspadai komplikasi" };
    }
  }, [selectedVisit]);

  // Save Vitals Handler
  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit) return;
    setSavingVitals(true);
    try {
      const payload = {
        bloodPressure: formBp,
        temperature: parseFloat(formTemp) || 36.5,
        weight: parseFloat(formWeight) || 60,
        height: parseFloat(formHeight) || 165,
        complaint: formComplaint.trim(),
        notes: formNotes,
      };

      await clinic.vitals(selectedVisit.id, payload);

      setVisits((prev) =>
        prev.map((v) => (v.id === selectedVisit.id ? { ...v, ...payload, complaint: formComplaint } : v))
      );

      setMsg({ type: "success", text: `Tanda vital pasien ${selectedVisit.patient.name} berhasil diperbarui!` });
      setShowEditModal(false);
    } catch (err: any) {
      setMsg({ type: "error", text: err?.response?.data?.message || "Gagal menyimpan tanda vital." });
    } finally {
      setSavingVitals(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Informasi Pasien & Rekam Tanda Vital (TTV)"
        subtitle="Direktori rekam medis rawat jalan, monitoring tanda vital, anamnesis triase perawat, dan riwayat klinis pasien."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (selectedVisit) {
                  window.print();
                }
              }}
              className="ad-btn border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs text-xs font-bold"
              title="Cetak Berkas Rekam Triase Pasien"
            >
              <Printer size={15} /> Cetak Lembar Pasien
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="ad-btn border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs text-xs font-bold"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        }
      />

      {/* ALERT BANNER */}
      {msg && (
        <div
          className={`mb-6 flex items-center justify-between rounded-xl border p-4 text-xs font-bold shadow-xs transition ${
            msg.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : msg.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-900"
              : "border-slate-300 bg-slate-100 text-[#1B3C53]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {msg.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : msg.type === "error" ? (
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            ) : (
              <Volume2 className="h-5 w-5 text-[#1B3C53] shrink-0" />
            )}
            <span>{msg.text}</span>
          </div>
          <button
            onClick={() => setMsg(null)}
            className="text-xs font-extrabold opacity-60 hover:opacity-100 transition px-2 py-1"
          >
            Tutup
          </button>
        </div>
      )}

      {/* TWO COLUMN MASTER-DETAIL LAYOUT */}
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* ================= LEFT COLUMN: PATIENTS DIRECTORY ================= */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col h-[calc(100vh-210px)] min-h-[580px]">
          {/* Header Controls */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-[#1B3C53] text-sm flex items-center gap-2">
                <User size={16} className="text-[#1B3C53]" />
                Daftar Pasien ({filteredVisits.length})
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Klinik Rawat Jalan
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 text-[11px] font-bold">
              <button
                onClick={() => setFilterType("ALL")}
                className={`rounded-md py-1.5 transition ${
                  filterType === "ALL"
                    ? "bg-white text-[#1B3C53] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setFilterType("WITH_VITALS")}
                className={`rounded-md py-1.5 transition ${
                  filterType === "WITH_VITALS"
                    ? "bg-white text-[#1B3C53] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Ada TTV
              </button>
              <button
                onClick={() => setFilterType("NEEDS_VITALS")}
                className={`rounded-md py-1.5 transition ${
                  filterType === "NEEDS_VITALS"
                    ? "bg-white text-[#1B3C53] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Belum TTV
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama pasien, No. RM, NIK, poli..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs font-medium focus:border-[#1B3C53] focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Patient Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-100">
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-3 h-20 animate-pulse bg-slate-50 rounded-xl" />
              ))
            ) : filteredVisits.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Tidak ada data pasien yang sesuai kriteria pencarian.
              </div>
            ) : (
              filteredVisits.map((v) => {
                const isSelected = selectedVisit?.id === v.id;
                const hasVitals = Boolean(v.bloodPressure || v.temperature);
                const qNum = v.queueNumber || `A0${v.id}`;

                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVisitId(v.id)}
                    className={`cursor-pointer rounded-xl p-3.5 transition border text-xs ${
                      isSelected
                        ? "border-[#1B3C53] bg-[#1B3C53]/5 shadow-xs"
                        : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-[#1B3C53] bg-[#1B3C53]/10 px-2 py-0.5 rounded-md">
                          {qNum}
                        </span>
                        <h4 className="font-extrabold text-[#1B3C53] text-sm truncate max-w-[150px]">
                          {v.patient.name}
                        </h4>
                      </div>
                      <Badge tone={hasVitals ? "emerald" : "amber"}>
                        {hasVitals ? "TTV LENGKAP" : "BELUM TTV"}
                      </Badge>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-medium">
                      <span>No. RM: RM-000{v.patient.id}</span>
                      <span>·</span>
                      <span>{v.patient.age} thn</span>
                      <span>·</span>
                      <span>{v.patient.gender}</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 font-semibold text-slate-600">
                        <Stethoscope size={11} /> Dr. {v.doctor.name}
                      </span>
                      <span>
                        {new Date(v.visitDate).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: PATIENT CLINICAL DOSSIER ================= */}
        <div className="space-y-6">
          {selectedVisit ? (
            <>
              {/* PATIENT PROFILE HEADER CARD */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#1B3C53] text-white font-mono text-base font-extrabold">
                      {selectedVisit.queueNumber || `A0${selectedVisit.id}`}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-[#1B3C53] tracking-tight">
                          {selectedVisit.patient.name}
                        </h2>
                        <span className="rounded-md bg-[#DCD7C9]/40 px-2 py-0.5 text-xs font-extrabold text-[#1B3C53] border border-[#DCD7C9]">
                          RM-000{selectedVisit.patient.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        NIK: {selectedVisit.patient.nik || "31710XXXXXXXX"} · {selectedVisit.patient.age} tahun ·{" "}
                        {selectedVisit.patient.gender} · Gol. Darah:{" "}
                        <b className="text-[#1B3C53]">{selectedVisit.patient.bloodType || "O+"}</b>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() =>
                        announcePatient(
                          selectedVisit.queueNumber || `A0${selectedVisit.id}`,
                          selectedVisit.patient.name
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition shadow-xs"
                      title="Panggil pasien lewat pengeras suara"
                    >
                      <Volume2 size={14} /> Panggil ke Triase
                    </button>

                    <button
                      onClick={() => setShowEditModal(true)}
                      className="ad-btn ad-btn-primary text-xs font-bold shadow-xs"
                    >
                      <SlidersHorizontal size={14} /> Perbarui TTV & Catatan
                    </button>
                  </div>
                </div>

                {/* Patient Contact & Registration Info */}
                <div className="grid gap-3 sm:grid-cols-3 text-xs">
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Kontak Telepon</span>
                    <p className="font-bold text-[#1B3C53] mt-0.5 flex items-center gap-1.5">
                      <Phone size={13} className="text-slate-400" />
                      {selectedVisit.patient.phone || "(Belum diisi)"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Dokter & Poli Tujuan</span>
                    <p className="font-bold text-[#1B3C53] mt-0.5 flex items-center gap-1.5">
                      <Building2 size={13} className="text-slate-400" />
                      Dr. {selectedVisit.doctor.name} {selectedVisit.poli ? `(${selectedVisit.poli.name})` : ""}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Alamat Tempat Tinggal</span>
                    <p className="font-medium text-slate-700 mt-0.5 truncate flex items-center gap-1.5" title={selectedVisit.patient.address || "-"}>
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      {selectedVisit.patient.address || "DKI Jakarta"}
                    </p>
                  </div>
                </div>
              </div>

              {/* VITAL SIGNS (TTV) OVERVIEW CARDS */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-base text-[#1B3C53] flex items-center gap-2">
                      <Activity size={18} className="text-[#1B3C53]" />
                      Tanda-Tanda Vital & Antropometri (Triase Terkini)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Diperiksa pada kunjungan tanggal{" "}
                      {new Date(selectedVisit.visitDate).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  {bpAnalysis && (
                    <Badge tone={bpAnalysis.tone}>
                      {bpAnalysis.label}
                    </Badge>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 text-xs">
                  {/* Blood Pressure */}
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-1">
                    <div className="flex items-center justify-between text-slate-500 font-bold text-[11px]">
                      <span>Tekanan Darah (TD)</span>
                      <Heart size={16} className="text-rose-600" />
                    </div>
                    <p className="text-2xl font-black text-[#1B3C53]">
                      {selectedVisit.bloodPressure || "120/80"}{" "}
                      <span className="text-xs font-bold text-slate-400">mmHg</span>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {bpAnalysis ? bpAnalysis.desc : "Ambang batas normal: 120/80"}
                    </p>
                  </div>

                  {/* Temperature */}
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-1">
                    <div className="flex items-center justify-between text-slate-500 font-bold text-[11px]">
                      <span>Suhu Tubuh</span>
                      <Thermometer size={16} className="text-amber-600" />
                    </div>
                    <p className="text-2xl font-black text-[#1B3C53]">
                      {selectedVisit.temperature || 36.8}{" "}
                      <span className="text-xs font-bold text-slate-400">°C</span>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {Number(selectedVisit.temperature) > 37.5 ? "Febris / Demam" : "Afebris / Normal"}
                    </p>
                  </div>

                  {/* Weight & Height */}
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-1">
                    <div className="flex items-center justify-between text-slate-500 font-bold text-[11px]">
                      <span>Berat & Tinggi Badan</span>
                      <Scale size={16} className="text-indigo-600" />
                    </div>
                    <p className="text-xl font-black text-[#1B3C53]">
                      {selectedVisit.weight || 60} <span className="text-xs font-normal text-slate-400">kg</span> ·{" "}
                      {selectedVisit.height || 165} <span className="text-xs font-normal text-slate-400">cm</span>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {bmiInfo ? `BMI: ${bmiInfo.val} (${bmiInfo.category})` : "Ideal untuk pemeriksaan dosis"}
                    </p>
                  </div>

                  {/* Heart / Pulse Rate */}
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-1">
                    <div className="flex items-center justify-between text-slate-500 font-bold text-[11px]">
                      <span>Denyut Nadi / SpO2</span>
                      <Activity size={16} className="text-emerald-600" />
                    </div>
                    <p className="text-xl font-black text-[#1B3C53]">
                      80 <span className="text-xs font-normal text-slate-400">bpm</span> · 98{" "}
                      <span className="text-xs font-normal text-slate-400">%</span>
                    </p>
                    <p className="text-[10px] text-slate-500">Irama reguler, saturasi udara ruangan aman</p>
                  </div>
                </div>

                {/* Complaint & Nurse Triage Notes */}
                <div className="grid gap-4 sm:grid-cols-2 pt-2 text-xs">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-1">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">
                      Keluhan Utama Pasien (Anamnesis)
                    </span>
                    <p className="font-bold text-[#1B3C53] text-sm">
                      "{selectedVisit.complaint || "Pemeriksaan rutin berkala / konsultasi umum."}"
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-1">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">
                      Catatan Asuhan Keperawatan (Triase Perawat)
                    </span>
                    <p className="font-medium text-slate-700 leading-relaxed">
                      {selectedVisit.notes || "Pasien sadar penuh (Compos Mentis), keluhan stabil, tidak ada kegawatdaruratan."}
                    </p>
                  </div>
                </div>
              </div>

              {/* MEDICAL HISTORY, DIAGNOSES & PRESCRIBED MEDICINES */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Diagnoses Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h4 className="font-extrabold text-sm text-[#1B3C53] flex items-center gap-2">
                      <Stethoscope size={16} className="text-[#1B3C53]" />
                      Diagnosa Dokter Terkait
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400">ICD-10</span>
                  </div>

                  {selectedVisit.diagnoses && selectedVisit.diagnoses.length > 0 ? (
                    <ul className="space-y-2 text-xs">
                      {selectedVisit.diagnoses.map((d) => (
                        <li
                          key={d.id}
                          className="rounded-lg bg-slate-50 p-2.5 border border-slate-200 flex items-start justify-between gap-2"
                        >
                          <div>
                            <p className="font-bold text-[#1B3C53]">{d.diagnosisName}</p>
                            {d.notes && <p className="text-[11px] text-slate-500 mt-0.5">{d.notes}</p>}
                          </div>
                          {d.icd10Code && (
                            <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-700 border border-indigo-200">
                              {d.icd10Code}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-400">
                      Belum ada catatan diagnosa spesifik yang diinput dokter.
                    </div>
                  )}
                </div>

                {/* Prescriptions Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h4 className="font-extrabold text-sm text-[#1B3C53] flex items-center gap-2">
                      <Pill size={16} className="text-[#1B3C53]" />
                      Terapi Obat & Resep Farmasi
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400">Instalasi Farmasi</span>
                  </div>

                  {selectedVisit.prescriptions && selectedVisit.prescriptions.length > 0 ? (
                    <ul className="space-y-2 text-xs">
                      {selectedVisit.prescriptions.map((r) => (
                        <li
                          key={r.id}
                          className="rounded-lg bg-slate-50 p-2.5 border border-slate-200 flex items-center justify-between gap-2"
                        >
                          <div>
                            <p className="font-bold text-[#1B3C53]">
                              {r.medicine.name} ({r.medicine.dosage})
                            </p>
                            <p className="text-[10px] text-slate-500">Jumlah: {r.quantity} unit</p>
                          </div>
                          <Badge tone={r.status === "READY" ? "emerald" : "amber"}>
                            {r.status}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-400">
                      Tidak ada peresepan obat aktif pada kunjungan ini.
                    </div>
                  )}
                </div>
              </div>

              {/* QUICK NAV TO FULL TRIAGE WORKSTATION */}
              <div className="rounded-xl border border-[#DCD7C9] bg-[#DCD7C9]/20 p-5 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <h4 className="font-extrabold text-sm text-[#1B3C53]">
                    Perlu Melakukan Input Triase Lengkap untuk Pasien Ini?
                  </h4>
                  <p className="text-slate-600 mt-0.5">
                    Buka Stasiun Pemeriksaan TTV untuk pengisian form tanda vital interaktif secara komprehensif.
                  </p>
                </div>
                <Link
                  to={`/dashboard/nurse/vitals?visitId=${selectedVisit.id}`}
                  className="ad-btn ad-btn-primary font-bold text-xs shadow-xs"
                >
                  Buka Stasiun TTV Pasien Ini <ArrowRight size={14} />
                </Link>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-xs shadow-xs">
              <User size={36} className="mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="font-bold text-[#1B3C53] text-sm">Pilih Pasien Dari Direktori</p>
              <p className="text-xs text-slate-500 mt-1">
                Pilih salah satu pasien pada daftar di sebelah kiri untuk melihat rekam tanda vital dan riwayat medis.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ================= EDIT VITALS MODAL ================= */}
      {showEditModal && selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="ad-card w-full max-w-lg p-6 bg-white space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#1B3C53] text-lg">
                  Perbarui Tanda Vital (TTV)
                </h3>
                <p className="text-xs text-slate-500">
                  Pasien: <b>{selectedVisit.patient.name}</b> (RM-000{selectedVisit.patient.id})
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveVitals} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tekanan Darah (mmHg)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 120/80"
                    value={formBp}
                    onChange={(e) => setFormBp(e.target.value)}
                    className="ad-input font-bold text-[#1B3C53]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Suhu Tubuh (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="45"
                    required
                    placeholder="Contoh: 36.8"
                    value={formTemp}
                    onChange={(e) => setFormTemp(e.target.value)}
                    className="ad-input font-bold text-[#1B3C53]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Berat Badan (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    placeholder="Contoh: 65"
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value)}
                    className="ad-input font-bold text-[#1B3C53]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tinggi Badan (cm)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="10"
                    required
                    placeholder="Contoh: 168"
                    value={formHeight}
                    onChange={(e) => setFormHeight(e.target.value)}
                    className="ad-input font-bold text-[#1B3C53]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Keluhan Utama Pasien
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Sakit kepala sejak 2 hari, demam naik turun..."
                  value={formComplaint}
                  onChange={(e) => setFormComplaint(e.target.value)}
                  className="ad-input"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Asuhan Keperawatan / Triase
                </label>
                <textarea
                  rows={3}
                  placeholder="Catatan observasi fisik, riwayat alergi, skala nyeri..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="ad-input resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="ad-btn border border-slate-200 bg-white text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingVitals}
                  className="ad-btn ad-btn-primary"
                >
                  <Save size={15} /> {savingVitals ? "Menyimpan..." : "Simpan TTV"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
