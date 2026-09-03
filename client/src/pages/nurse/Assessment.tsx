import { useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck,
  User,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Save,
  Search,
  RefreshCw,
  Volume2,
  Smile,
  Meh,
  Frown,
  ShieldAlert,
  Send,
  Check,
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
};

export default function Assessment() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"WAITING" | "IN_CONSULTATION" | "ALL">("WAITING");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Form State
  const [complaint, setComplaint] = useState("");
  const [historyOfIllness, setHistoryOfIllness] = useState("");
  const [allergyNotes, setAllergyNotes] = useState("Tidak Ada Alergi Diketahui (NKDA)");
  const [comorbidities, setComorbidities] = useState<string[]>([]);

  // Vitals State
  const [bp, setBp] = useState("120/80");
  const [temp, setTemp] = useState("36.5");
  const [pulse, setPulse] = useState("80");
  const [rr, setRr] = useState("18");
  const [spo2, setSpo2] = useState("98");
  const [weight, setWeight] = useState("60");
  const [height, setHeight] = useState("165");

  // Safety & Triage State
  const [painScale, setPainScale] = useState<number>(0);
  const [fallRisk, setFallRisk] = useState<"RENDAH" | "SEDANG" | "TINGGI">("RENDAH");
  const [consciousness, setConsciousness] = useState<"COMPOS_MENTIS" | "APATIS" | "SOMNOLEN" | "SOPOR">("COMPOS_MENTIS");
  const [triageCategory, setTriageCategory] = useState<"HIJAU" | "KUNING" | "MERAH">("HIJAU");

  // Nursing Plan
  const [nursingDiagnosis, setNursingDiagnosis] = useState("Kondisi Umum Pasien Baik / Stabil");
  const [nursingIntervention, setNursingIntervention] = useState("Observasi tanda vital, posisikan nyaman, anjurkan istirahat.");

  const loadVisits = async () => {
    setLoading(true);
    try {
      const res = await clinic.visits("today");
      const list: Visit[] = unwrap(res) || [];
      list.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
      setVisits(list);

      if (list.length > 0 && !selectedVisitId) {
        const firstWaiting = list.find((v) => v.status === "WAITING") || list[0];
        setSelectedVisitId(firstWaiting.id);
      }
    } catch (err) {
      console.error("Failed to load visits for assessment", err);
      setMsg({ type: "error", text: "Gagal memuat antrean kunjungan hari ini." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVisits();
  }, []);

  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (filterStatus !== "ALL" && v.status !== filterStatus) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const pName = v.patient.name.toLowerCase();
      const qNum = (v.queueNumber || `A0${v.id}`).toLowerCase();
      const docName = v.doctor.name.toLowerCase();
      return pName.includes(q) || qNum.includes(q) || docName.includes(q);
    });
  }, [visits, filterStatus, searchQuery]);

  const selectedVisit = useMemo(() => {
    if (!selectedVisitId) return filteredVisits[0] || null;
    return visits.find((v) => v.id === selectedVisitId) || filteredVisits[0] || null;
  }, [visits, selectedVisitId, filteredVisits]);

  // Sync Form with Selected Patient
  useEffect(() => {
    if (selectedVisit) {
      setComplaint(selectedVisit.complaint || "");
      setBp(selectedVisit.bloodPressure || "120/80");
      setTemp(String(selectedVisit.temperature || "36.6"));
      setWeight(String(selectedVisit.weight || "60"));
      setHeight(String(selectedVisit.height || "165"));

      // Parse existing notes if any
      if (selectedVisit.notes) {
        setNursingIntervention(selectedVisit.notes);
      } else {
        setNursingIntervention("Posisikan pasien senyaman mungkin, observasi berkala, siapkan rekam medis dokter.");
      }
    }
  }, [selectedVisit]);

  // BMI Calculation
  const bmiInfo = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;
    if (isNaN(w) || isNaN(h) || h <= 0) return null;
    const val = Number((w / (h * h)).toFixed(1));
    let cat = "Normal";
    if (val < 18.5) cat = "Underweight";
    else if (val >= 25 && val < 29.9) cat = "Overweight";
    else if (val >= 30) cat = "Obesitas";
    return { val, cat };
  }, [weight, height]);

  // Voice Announce
  const announcePatient = (qNum: string, name: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `Panggilan untuk nomor antrean ${qNum}, atas nama pasien ${name}, silakan masuk ke ruang asesmen perawat. Terima kasih.`
    );
    utterance.lang = "id-ID";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
    setMsg({ type: "info", text: `Memanggil nomor ${qNum} (${name}) melalui pengeras suara...` });
  };

  // Toggle Comorbidity
  const toggleComorbidity = (item: string) => {
    setComorbidities((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  // Submit Assessment
  const handleSubmitAssessment = async (advanceToDoctor = false) => {
    if (!selectedVisit) return;
    setSaving(true);
    try {
      const compiledNotes = [
        `[ASESMEN AWAL PERAWAT]`,
        `Keluhan: ${complaint || "-"}`,
        historyOfIllness ? `RPS: ${historyOfIllness}` : null,
        `Alergi: ${allergyNotes}`,
        comorbidities.length > 0 ? `Komorbid: ${comorbidities.join(", ")}` : null,
        `Triase: ${triageCategory} | Nyeri: ${painScale}/10 | Risiko Jatuh: ${fallRisk} | Kesadaran: ${consciousness}`,
        `Nadi: ${pulse} bpm | RR: ${rr} x/mnt | SpO2: ${spo2}%`,
        `Dx Kep: ${nursingDiagnosis}`,
        `Rencana: ${nursingIntervention}`,
      ]
        .filter(Boolean)
        .join(" | ");

      const payload = {
        bloodPressure: bp,
        temperature: parseFloat(temp) || 36.5,
        weight: parseFloat(weight) || 60,
        height: parseFloat(height) || 165,
        complaint: complaint.trim(),
        notes: compiledNotes,
      };

      await clinic.vitals(selectedVisit.id, payload);

      if (advanceToDoctor) {
        await clinic.status(selectedVisit.id, "IN_CONSULTATION");
        setMsg({
          type: "success",
          text: `Asesmen pasien ${selectedVisit.patient.name} selesai! Pasien berhasil dialihkan ke antrean ruang konsultasi dokter.`,
        });
        setVisits((prev) =>
          prev.map((v) =>
            v.id === selectedVisit.id
              ? { ...v, status: "IN_CONSULTATION", ...payload, complaint }
              : v
          )
        );
      } else {
        setMsg({
          type: "success",
          text: `Draf asesmen awal keperawatan untuk ${selectedVisit.patient.name} berhasil disimpan.`,
        });
        setVisits((prev) =>
          prev.map((v) =>
            v.id === selectedVisit.id ? { ...v, ...payload, complaint } : v
          )
        );
      }
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal menyimpan data asesmen keperawatan.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Asesmen Awal Keperawatan & Triase Klinis"
        subtitle="Pengkajian anamnesis pra-konsultasi, tanda-tanda vital, riwayat alergi, skrining risiko jatuh, dan skala nyeri pasien."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              disabled={!selectedVisit}
              className="ad-btn border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs text-xs font-bold"
            >
              <Printer size={15} /> Cetak Lembar Asesmen
            </button>
            <button
              onClick={loadVisits}
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

      {/* TWO COLUMN MASTER-DETAIL WORKSPACE */}
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* ================= LEFT COLUMN: PATIENT QUEUE ================= */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col h-[calc(100vh-210px)] min-h-[600px]">
          {/* Header & Filters */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-[#1B3C53] text-sm flex items-center gap-2">
                <ClipboardCheck size={16} className="text-[#1B3C53]" />
                Antrean Asesmen ({filteredVisits.length})
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Klinik Hari Ini
              </span>
            </div>

            {/* Status Filter Tabs */}
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 text-[11px] font-bold">
              <button
                onClick={() => setFilterStatus("WAITING")}
                className={`rounded-md py-1.5 transition ${
                  filterStatus === "WAITING"
                    ? "bg-white text-[#1B3C53] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Menunggu
              </button>
              <button
                onClick={() => setFilterStatus("IN_CONSULTATION")}
                className={`rounded-md py-1.5 transition ${
                  filterStatus === "IN_CONSULTATION"
                    ? "bg-white text-[#1B3C53] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Di Dokter
              </button>
              <button
                onClick={() => setFilterStatus("ALL")}
                className={`rounded-md py-1.5 transition ${
                  filterStatus === "ALL"
                    ? "bg-white text-[#1B3C53] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pasien, antrean, dokter..."
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

          {/* Queue Patient Cards */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3 h-20 animate-pulse bg-slate-50 rounded-xl" />
              ))
            ) : filteredVisits.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Tidak ada pasien dalam daftar antrean asesmen.
              </div>
            ) : (
              filteredVisits.map((v) => {
                const isSelected = selectedVisit?.id === v.id;
                const qNum = v.queueNumber || `A0${v.id}`;
                const hasVitals = Boolean(v.bloodPressure);

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
                        <h4 className="font-extrabold text-[#1B3C53] text-sm truncate max-w-[140px]">
                          {v.patient.name}
                        </h4>
                      </div>
                      <Badge
                        tone={
                          v.status === "WAITING"
                            ? hasVitals
                              ? "emerald"
                              : "amber"
                            : "cyan"
                        }
                      >
                        {v.status === "WAITING" ? (hasVitals ? "TTV READY" : "ANTRE TRIASE") : "DI DOKTER"}
                      </Badge>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>
                        {v.patient.age} thn · {v.patient.gender}
                      </span>
                      <span className="truncate max-w-[130px] font-semibold text-slate-600">
                        Dr. {v.doctor.name}
                      </span>
                    </div>

                    {v.complaint && (
                      <p className="mt-1.5 text-[11px] text-slate-600 line-clamp-1 italic">
                        "{v.complaint}"
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: CLINICAL ASSESSMENT WORKSPACE ================= */}
        <div className="space-y-6">
          {selectedVisit ? (
            <div className="space-y-6">
              {/* PATIENT SUMMARY BANNER */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#1B3C53] text-white font-mono text-base font-extrabold">
                    {selectedVisit.queueNumber || `A0${selectedVisit.id}`}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-[#1B3C53] tracking-tight">
                        {selectedVisit.patient.name}
                      </h3>
                      <span className="rounded-md bg-[#DCD7C9]/40 px-2 py-0.5 text-xs font-bold text-[#1B3C53] border border-[#DCD7C9]">
                        RM-000{selectedVisit.patient.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {selectedVisit.patient.age} tahun · {selectedVisit.patient.gender} · Dokter Tujuan:{" "}
                      <b className="text-[#1B3C53]">Dr. {selectedVisit.doctor.name}</b>{" "}
                      {selectedVisit.poli ? `(${selectedVisit.poli.name})` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      announcePatient(
                        selectedVisit.queueNumber || `A0${selectedVisit.id}`,
                        selectedVisit.patient.name
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 shadow-xs transition"
                  >
                    <Volume2 size={14} /> Panggil Pasien
                  </button>
                  <Badge tone={selectedVisit.status === "WAITING" ? "amber" : "cyan"}>
                    {selectedVisit.status.replaceAll("_", " ")}
                  </Badge>
                </div>
              </div>

              {/* SECTION 1: ANAMNESIS & KELUHAN PASIEN */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h4 className="font-extrabold text-base text-[#1B3C53] flex items-center gap-2">
                    <User size={17} className="text-[#1B3C53]" />
                    1. Pengkajian Anamnesis & Keluhan Pasien (Subjective)
                  </h4>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Anamnesis Keperawatan</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Keluhan Utama Saat Datang *
                    </label>
                    <input
                      type="text"
                      required
                      value={complaint}
                      onChange={(e) => setComplaint(e.target.value)}
                      placeholder="Contoh: Demam sejak 3 hari, batuk kering, tenggorokan sakit..."
                      className="ad-input font-bold text-[#1B3C53]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Riwayat Penyakit Sekarang (RPS) & Onset
                    </label>
                    <textarea
                      rows={2}
                      value={historyOfIllness}
                      onChange={(e) => setHistoryOfIllness(e.target.value)}
                      placeholder="Uraikan perkembangan gejala, faktor pemicu, atau obat yang sudah diminum mandiri..."
                      className="ad-input resize-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Riwayat Alergi Obat / Makanan
                    </label>
                    <textarea
                      rows={2}
                      value={allergyNotes}
                      onChange={(e) => setAllergyNotes(e.target.value)}
                      placeholder="Misal: Alergi Penisilin, Paracetamol, Seafood, atau NKDA..."
                      className="ad-input resize-none font-semibold text-rose-700"
                    />
                  </div>

                  {/* Comorbidity Multi-Chips */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Riwayat Penyakit Penyerta (Komorbiditas Pasien)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["Hipertensi", "Diabetes Mellitus", "Asma / PPOK", "Jantung", "Ginjal", "Lambung / Maag"].map(
                        (c) => {
                          const active = comorbidities.includes(c);
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => toggleComorbidity(c)}
                              className={`rounded-lg px-3 py-1 text-xs font-bold transition border ${
                                active
                                  ? "bg-[#1B3C53] text-white border-[#1B3C53] shadow-xs"
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {active && <Check size={12} className="inline mr-1" />}
                              {c}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: TANDA-TANDA VITAL & PENGUKURAN FISIK */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h4 className="font-extrabold text-base text-[#1B3C53] flex items-center gap-2">
                    <Activity size={17} className="text-[#1B3C53]" />
                    2. Pemeriksaan Tanda-Tanda Vital & Antropometri (Objective)
                  </h4>
                  {bmiInfo && (
                    <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 border border-slate-200">
                      BMI: {bmiInfo.val} ({bmiInfo.cat})
                    </span>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tekanan Darah (mmHg)</label>
                    <input
                      type="text"
                      value={bp}
                      onChange={(e) => setBp(e.target.value)}
                      placeholder="120/80"
                      className="ad-input font-bold text-[#1B3C53]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Suhu Tubuh (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={temp}
                      onChange={(e) => setTemp(e.target.value)}
                      placeholder="36.5"
                      className="ad-input font-bold text-[#1B3C53]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Denyut Nadi (x/mnt)</label>
                    <input
                      type="number"
                      value={pulse}
                      onChange={(e) => setPulse(e.target.value)}
                      placeholder="80"
                      className="ad-input font-bold text-[#1B3C53]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Laju Nafas / RR (x/mnt)</label>
                    <input
                      type="number"
                      value={rr}
                      onChange={(e) => setRr(e.target.value)}
                      placeholder="18"
                      className="ad-input font-bold text-[#1B3C53]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Saturasi Oksigen / SpO2 (%)</label>
                    <input
                      type="number"
                      value={spo2}
                      onChange={(e) => setSpo2(e.target.value)}
                      placeholder="98"
                      className="ad-input font-bold text-[#1B3C53]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Berat Badan (kg)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="60"
                      className="ad-input font-bold text-[#1B3C53]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tinggi Badan (cm)</label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="165"
                      className="ad-input font-bold text-[#1B3C53]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kategori Triase</label>
                    <select
                      value={triageCategory}
                      onChange={(e: any) => setTriageCategory(e.target.value)}
                      className={`ad-input font-bold ${
                        triageCategory === "MERAH"
                          ? "text-rose-700 bg-rose-50"
                          : triageCategory === "KUNING"
                          ? "text-amber-700 bg-amber-50"
                          : "text-emerald-700 bg-emerald-50"
                      }`}
                    >
                      <option value="HIJAU">HIJAU - Non-Urgent (Poliklinik)</option>
                      <option value="KUNING">KUNING - Urgent (Prioritas)</option>
                      <option value="MERAH">MERAH - Gawat Darurat (Segera)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: SKRINING KESELAMATAN PASIEN */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h4 className="font-extrabold text-base text-[#1B3C53] flex items-center gap-2">
                    <ShieldAlert size={17} className="text-[#1B3C53]" />
                    3. Skrining Keselamatan Pasien (Patient Safety & Skala Nyeri)
                  </h4>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Standar Akreditasi Kemenkes</span>
                </div>

                <div className="grid gap-5 md:grid-cols-3 text-xs">
                  {/* Pain Scale (VAS) */}
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Skala Nyeri (VAS 0 - 10)</span>
                      <span className="font-black text-sm text-[#1B3C53]">{painScale} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={painScale}
                      onChange={(e) => setPainScale(Number(e.target.value))}
                      className="w-full accent-[#1B3C53]"
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                      <span className="flex items-center gap-1 text-emerald-600"><Smile size={12} /> 0 Tidak Nyeri</span>
                      <span className="flex items-center gap-1 text-amber-600"><Meh size={12} /> 5 Sedang</span>
                      <span className="flex items-center gap-1 text-rose-600"><Frown size={12} /> 10 Berat</span>
                    </div>
                  </div>

                  {/* Fall Risk Screening */}
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60 space-y-2">
                    <span className="font-bold text-slate-700 block">Skrining Risiko Jatuh (Morse)</span>
                    <div className="grid grid-cols-3 gap-1">
                      {(["RENDAH", "SEDANG", "TINGGI"] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setFallRisk(r)}
                          className={`rounded-lg py-1.5 font-bold text-[11px] transition border ${
                            fallRisk === r
                              ? r === "TINGGI"
                                ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                                : r === "SEDANG"
                                ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                                : "bg-[#1B3C53] text-white border-[#1B3C53] shadow-xs"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {fallRisk === "TINGGI"
                        ? "Wajib pasang gelang kuning & dampingi saat mobilisasi"
                        : "Edukasi keluarga dan kunci roda tempat tidur"}
                    </p>
                  </div>

                  {/* Level of Consciousness */}
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60 space-y-2">
                    <span className="font-bold text-slate-700 block">Tingkat Kesadaran (GCS)</span>
                    <select
                      value={consciousness}
                      onChange={(e: any) => setConsciousness(e.target.value)}
                      className="ad-input font-bold text-[#1B3C53]"
                    >
                      <option value="COMPOS_MENTIS">Compos Mentis (Sadar Penuh)</option>
                      <option value="APATIS">Apatis (Acuh / Lambat Respon)</option>
                      <option value="SOMNOLEN">Somnolen (Mengantuk Berat)</option>
                      <option value="SOPOR">Sopor (Respon Rangsang Nyeri)</option>
                    </select>
                    <p className="text-[10px] text-slate-500">
                      Respon verbal dan motorik sesuai stimulasi klinis
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 4: RENCANA ASUHAN & INSTRUKSI PERAWAT */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h4 className="font-extrabold text-base text-[#1B3C53] flex items-center gap-2">
                    <ClipboardCheck size={17} className="text-[#1B3C53]" />
                    4. Masalah Keperawatan & Rencana Asuhan (Plan)
                  </h4>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Nursing Care Plan</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Identifikasi Masalah Keperawatan Terkini
                    </label>
                    <input
                      type="text"
                      value={nursingDiagnosis}
                      onChange={(e) => setNursingDiagnosis(e.target.value)}
                      placeholder="Contoh: Gangguan rasa nyaman (nyeri), Hipertermia, Risiko jatuh..."
                      className="ad-input font-bold text-[#1B3C53]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Rencana Tindakan Mandiri & Observasi Keperawatan
                    </label>
                    <input
                      type="text"
                      value={nursingIntervention}
                      onChange={(e) => setNursingIntervention(e.target.value)}
                      placeholder="Contoh: Tirah baring, relaksasi nafas dalam, observasi tanda vital..."
                      className="ad-input font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* BOTTOM ACTION BUTTONS */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500 font-medium">
                  Pastikan seluruh data keluhan & tanda vital telah diverifikasi sebelum dialihkan ke ruang konsultasi dokter.
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSubmitAssessment(false)}
                    className="ad-btn border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs shadow-xs"
                  >
                    <Save size={15} /> Simpan Draf
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSubmitAssessment(true)}
                    className="ad-btn ad-btn-primary font-bold text-xs shadow-xs"
                  >
                    <Send size={15} /> {saving ? "Menyimpan..." : "Selesai Triase & Alihkan ke Dokter"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-xs shadow-xs">
              <User size={36} className="mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="font-bold text-[#1B3C53] text-sm">Pilih Pasien Dari Antrean</p>
              <p className="text-xs text-slate-500 mt-1">
                Pilih pasien dari daftar antrean di sebelah kiri untuk memulai pengkajian dan asesmen awal keperawatan.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
