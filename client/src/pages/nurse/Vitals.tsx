import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { clinic, unwrap } from "../../services/clinicService";
import {
  Activity,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  Scale,
  Ruler,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Search,
  Zap,
  Volume2,
  ArrowRight,
  ShieldAlert,
  Save,
  Smile,
  Meh,
  Frown,
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

type Doctor = {
  id: number;
  name: string;
  specialization?: string | null;
};

type Poli = {
  id: number;
  name: string;
  code?: string | null;
};

type Visit = {
  id: number;
  status: string;
  queueNumber?: string | null;
  estimatedWaitMinutes?: number | null;
  complaint?: string | null;
  bloodPressure?: string | null;
  temperature?: number | null;
  weight?: number | null;
  height?: number | null;
  notes?: string | null;
  visitDate?: string;
  patient?: Patient | null;
  doctor?: Doctor | null;
  poli?: Poli | null;
};

export default function Vitals() {
  const [params, setParams] = useSearchParams();
  const requestedId = Number(params.get("visitId") || 0);

  const [rows, setRows] = useState<Visit[]>([]);
  const [selected, setSelected] = useState<Visit | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"ACTIVE" | "DONE" | "ALL">("ACTIVE");

  // Clinical Vitals Form State
  const [bpSystolic, setBpSystolic] = useState<string>("120");
  const [bpDiastolic, setBpDiastolic] = useState<string>("80");
  const [temperature, setTemperature] = useState<string>("36.8");
  const [heartRate, setHeartRate] = useState<string>("78");
  const [respiratoryRate, setRespiratoryRate] = useState<string>("18");
  const [oxygenSaturation, setOxygenSaturation] = useState<string>("98");
  const [weight, setWeight] = useState<string>("60");
  const [height, setHeight] = useState<string>("165");
  const [consciousness, setConsciousness] = useState<string>("Compos Mentis");
  const [painScale, setPainScale] = useState<number>(0);
  const [clinicalNotes, setClinicalNotes] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [callingPatient, setCallingPatient] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Helper to parse notes if it contains extended triage data
  function populateFormFromVisit(v: Visit) {
    if (v.bloodPressure) {
      const parts = v.bloodPressure.split("/");
      if (parts.length >= 2) {
        setBpSystolic(parts[0].trim());
        setBpDiastolic(parts[1].trim());
      } else {
        setBpSystolic(v.bloodPressure);
      }
    } else {
      setBpSystolic("120");
      setBpDiastolic("80");
    }

    if (v.temperature) setTemperature(String(v.temperature));
    else setTemperature("36.8");

    if (v.weight) setWeight(String(v.weight));
    else setWeight("60");

    if (v.height) setHeight(String(v.height));
    else setHeight("165");

    // Parse extended triage fields from notes if present
    const rawNotes = v.notes || "";
    if (rawNotes.includes("[TRIAGE]")) {
      const hrMatch = rawNotes.match(/Nadi:\s*(\d+)/i);
      if (hrMatch) setHeartRate(hrMatch[1]);
      else setHeartRate("78");

      const rrMatch = rawNotes.match(/RR:\s*(\d+)/i);
      if (rrMatch) setRespiratoryRate(rrMatch[1]);
      else setRespiratoryRate("18");

      const spo2Match = rawNotes.match(/SpO2:\s*(\d+)/i);
      if (spo2Match) setOxygenSaturation(spo2Match[1]);
      else setOxygenSaturation("98");

      const gcsMatch = rawNotes.match(/Kesadaran:\s*([^|]+)/i);
      if (gcsMatch) setConsciousness(gcsMatch[1].trim());
      else setConsciousness("Compos Mentis");

      const painMatch = rawNotes.match(/Skala Nyeri:\s*(\d+)/i);
      if (painMatch) setPainScale(Number(painMatch[1]));
      else setPainScale(0);

      const notesMatch = rawNotes.match(/Catatan:\s*(.*)$/i);
      if (notesMatch) setClinicalNotes(notesMatch[1].trim());
      else setClinicalNotes("");
    } else {
      setClinicalNotes(rawNotes);
      setHeartRate("78");
      setRespiratoryRate("18");
      setOxygenSaturation("98");
      setConsciousness("Compos Mentis");
      setPainScale(0);
    }
  }

  // Load all visits and handle requestedId
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setMsg(null);

        // 1. Fetch visits list (all dates to ensure we don't miss queue visits)
        const visitsRes = await clinic.visits("all");
        const allVisits = (unwrap(visitsRes) as Visit[]) || [];

        if (!mounted) return;
        setRows(allVisits);

        // 2. If requestedId is provided via URL query (?visitId=7)
        if (requestedId) {
          // Check if it's already in the fetched list
          const foundInList = allVisits.find((v) => v.id === requestedId);
          if (foundInList) {
            setSelected(foundInList);
            populateFormFromVisit(foundInList);
          } else {
            // Fetch directly from /visits/:id to guarantee visit 7 is loaded
            try {
              const singleRes = await clinic.visit(requestedId);
              const singleVisit = unwrap(singleRes) as Visit;
              if (singleVisit && mounted) {
                setSelected(singleVisit);
                populateFormFromVisit(singleVisit);
                setRows((prev) => [singleVisit, ...prev.filter((p) => p.id !== singleVisit.id)]);
              }
            } catch (err) {
              console.warn("Direct visit fetch error:", err);
            }
          }
        } else if (allVisits.length > 0) {
          // Select the first waiting or called patient if no ID is specified
          const firstWaiting = allVisits.find((v) => v.status === "WAITING" || v.status === "CALLED");
          if (firstWaiting && mounted) {
            setSelected(firstWaiting);
            populateFormFromVisit(firstWaiting);
          }
        }
      } catch (error: any) {
        if (!mounted) return;
        setMsg({
          type: "error",
          text: error?.response?.data?.message || "Gagal memuat daftar pasien antrean.",
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

  // Handle selecting a patient
  function handleSelectPatient(v: Visit) {
    setSelected(v);
    populateFormFromVisit(v);
    setParams({ visitId: String(v.id) });
    setMsg(null);
  }

  // Quick preset buttons
  function applyNormalPreset() {
    setBpSystolic("120");
    setBpDiastolic("80");
    setTemperature("36.6");
    setHeartRate("76");
    setRespiratoryRate("18");
    setOxygenSaturation("98");
    setConsciousness("Compos Mentis");
    setPainScale(0);
    setClinicalNotes("Kondisi umum baik, tanda-tanda vital dalam batas normal.");
    setMsg({ type: "info", text: "Preset Tanda Vital Normal dewasa telah diterapkan." });
  }

  function applyFeverPreset() {
    setBpSystolic("115");
    setBpDiastolic("75");
    setTemperature("38.5");
    setHeartRate("102");
    setRespiratoryRate("22");
    setOxygenSaturation("97");
    setConsciousness("Compos Mentis");
    setPainScale(2);
    setClinicalNotes("Pasien demam akut, akral teraba hangat, bibir kering. Direkomendasikan evaluasi dokter.");
    setMsg({ type: "info", text: "Preset Kondisi Febris / Demam telah diterapkan." });
  }

  // BMI Calculation
  const bmiInfo = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (!w || !h || h <= 0) return null;
    const hMeters = h / 100;
    const bmiVal = w / (hMeters * hMeters);
    const rounded = parseFloat(bmiVal.toFixed(1));

    let category = "Normal";
    let color = "text-emerald-700 bg-emerald-50 border-emerald-200";

    if (rounded < 18.5) {
      category = "Kurus (Underweight)";
      color = "text-blue-700 bg-blue-50 border-blue-200";
    } else if (rounded <= 22.9) {
      category = "Normal (Ideal)";
      color = "text-emerald-700 bg-emerald-50 border-emerald-200";
    } else if (rounded <= 24.9) {
      category = "Kelebihan Berat (Overweight)";
      color = "text-amber-700 bg-amber-50 border-amber-200";
    } else if (rounded <= 29.9) {
      category = "Obesitas I";
      color = "text-orange-700 bg-orange-50 border-orange-200";
    } else {
      category = "Obesitas II (Severe)";
      color = "text-red-700 bg-red-50 border-red-200";
    }

    return { value: rounded, category, color };
  }, [weight, height]);

  // Blood Pressure Classification
  const bpInfo = useMemo(() => {
    const sys = parseInt(bpSystolic, 10);
    const dia = parseInt(bpDiastolic, 10);
    if (isNaN(sys) || isNaN(dia)) return null;

    if (sys > 180 || dia > 120) {
      return {
        label: "Krisis Hipertensi ⚠️",
        badge: "bg-red-600 text-white font-black animate-pulse",
      };
    }
    if (sys >= 140 || dia >= 90) {
      return {
        label: "Hipertensi Derajat 2",
        badge: "bg-red-100 text-red-800 border-red-200",
      };
    }
    if (sys >= 130 || dia >= 80) {
      return {
        label: "Hipertensi Derajat 1",
        badge: "bg-orange-100 text-orange-800 border-orange-200",
      };
    }
    if (sys >= 120 && dia < 80) {
      return {
        label: "Pra-Hipertensi",
        badge: "bg-amber-100 text-amber-800 border-amber-200",
      };
    }
    if (sys < 90 || dia < 60) {
      return {
        label: "Hipotensi",
        badge: "bg-sky-100 text-sky-800 border-sky-200",
      };
    }
    return {
      label: "Normal",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    };
  }, [bpSystolic, bpDiastolic]);

  // Temperature Classification
  const tempInfo = useMemo(() => {
    const t = parseFloat(temperature);
    if (isNaN(t)) return null;
    if (t >= 38.0) return { label: "Demam / Febris 🔥", badge: "bg-red-100 text-red-800 border-red-200 font-bold" };
    if (t >= 37.3) return { label: "Subfebris (Hangat)", badge: "bg-amber-100 text-amber-800 border-amber-200" };
    if (t < 35.5) return { label: "Hipotermia ❄️", badge: "bg-blue-100 text-blue-800 border-blue-200" };
    return { label: "Normal", badge: "bg-emerald-100 text-emerald-800 border-emerald-200" };
  }, [temperature]);

  // Call patient action
  async function handleCallPatient() {
    if (!selected) return;
    setCallingPatient(true);
    try {
      await clinic.status(selected.id, "CALLED");
      setMsg({ type: "success", text: `Pasien ${selected.patient?.name} (Antrean #${selected.queueNumber || selected.id}) berhasil dipanggil!` });
      setSelected({ ...selected, status: "CALLED" });
      setRows((prev) => prev.map((p) => (p.id === selected.id ? { ...p, status: "CALLED" } : p)));
    } catch (err: any) {
      setMsg({ type: "error", text: err?.response?.data?.message || "Gagal memanggil pasien." });
    } finally {
      setCallingPatient(false);
    }
  }

  // Save Vitals Function
  async function handleSaveVitals(advanceToDoctor = true) {
    if (!selected) {
      setMsg({ type: "error", text: "Silakan pilih pasien terlebih dahulu." });
      return;
    }

    try {
      setSaving(true);
      setMsg(null);

      // Package full clinical triage notes
      const formattedNotes = [
        `[TRIAGE] Nadi: ${heartRate} bpm`,
        `RR: ${respiratoryRate} x/mnt`,
        `SpO2: ${oxygenSaturation}%`,
        `Kesadaran: ${consciousness}`,
        `Skala Nyeri: ${painScale}/10`,
        bmiInfo ? `BMI: ${bmiInfo.value} (${bmiInfo.category})` : null,
        clinicalNotes ? `Catatan: ${clinicalNotes}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const payload = {
        bloodPressure: `${bpSystolic}/${bpDiastolic}`,
        temperature: parseFloat(temperature) || 36.8,
        weight: parseFloat(weight) || 60,
        height: parseFloat(height) || 165,
        notes: formattedNotes,
      };

      await clinic.vitals(selected.id, payload);

      if (advanceToDoctor) {
        await clinic.status(selected.id, "IN_CONSULTATION");
        setMsg({
          type: "success",
          text: `Pemeriksaan vital signs untuk ${selected.patient?.name} berhasil disimpan! Pasien kini berada di ruang antrean dokter (IN_CONSULTATION).`,
        });

        // Update locally
        const updatedStatus = "IN_CONSULTATION";
        setSelected({ ...selected, status: updatedStatus, ...payload });
        setRows((prev) =>
          prev.map((p) => (p.id === selected.id ? { ...p, status: updatedStatus, ...payload } : p))
        );
      } else {
        setMsg({
          type: "success",
          text: `Data vital signs pasien ${selected.patient?.name} tersimpan sebagai draf.`,
        });
      }
    } catch (error: any) {
      setMsg({
        type: "error",
        text: error?.response?.data?.message || "Gagal menyimpan hasil pemeriksaan tanda vital.",
      });
    } finally {
      setSaving(false);
    }
  }

  // Filtered rows for sidebar
  const filteredRows = useMemo(() => {
    return rows.filter((visit) => {
      // Tab filter
      if (filterTab === "ACTIVE") {
        if (visit.status !== "WAITING" && visit.status !== "CALLED") return false;
      } else if (filterTab === "DONE") {
        if (visit.status !== "IN_CONSULTATION" && visit.status !== "COMPLETED" && visit.status !== "PAID") return false;
      }

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = visit.patient?.name?.toLowerCase() || "";
      const queue = visit.queueNumber?.toLowerCase() || "";
      const complaint = visit.complaint?.toLowerCase() || "";
      const id = String(visit.id);
      return name.includes(q) || queue.includes(q) || complaint.includes(q) || id.includes(q);
    });
  }, [rows, filterTab, searchQuery]);

  return (
    <>
      <PageHeader
        title="Stasiun Triase & Pemeriksaan Vital Signs"
        subtitle="Pemeriksaan tanda vital pasien, pemantauan klinis, kalkulasi BMI otomatis, dan pengalihan ke antrean dokter."
      />

      {/* ALERT / MESSAGE BANNER */}
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
              <Zap className="h-5 w-5 text-cyan-600 shrink-0" />
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

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* LEFT COLUMN: QUEUE & PATIENTS LIST */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden h-[calc(100vh-210px)] min-h-[580px]">
          {/* Header & Tabs */}
          <div className="border-b border-slate-100 p-4 bg-slate-50/70">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#101a3d] text-sm flex items-center gap-2">
                <Activity size={16} className="text-[#168c9b]" />
                Antrean Triase Perawat
              </h3>
              <span className="rounded-full bg-[#168c9b]/10 px-2.5 py-0.5 text-xs font-extrabold text-[#168c9b]">
                {rows.filter((r) => r.status === "WAITING" || r.status === "CALLED").length} Menunggu
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="mt-3 flex rounded-xl bg-slate-200/60 p-1 text-xs font-semibold">
              <button
                onClick={() => setFilterTab("ACTIVE")}
                className={`flex-1 rounded-lg py-1.5 transition ${
                  filterTab === "ACTIVE" ? "bg-white text-[#101a3d] shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Menunggu ({rows.filter((r) => r.status === "WAITING" || r.status === "CALLED").length})
              </button>
              <button
                onClick={() => setFilterTab("DONE")}
                className={`flex-1 rounded-lg py-1.5 transition ${
                  filterTab === "DONE" ? "bg-white text-[#101a3d] shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Selesai ({rows.filter((r) => r.status === "IN_CONSULTATION" || r.status === "COMPLETED" || r.status === "PAID").length})
              </button>
              <button
                onClick={() => setFilterTab("ALL")}
                className={`flex-1 rounded-lg py-1.5 transition ${
                  filterTab === "ALL" ? "bg-white text-[#101a3d] shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua
              </button>
            </div>

            {/* Search Input */}
            <div className="mt-3 relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pasien / nomor antrean..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs focus:border-[#168c9b] focus:outline-none"
              />
            </div>
          </div>

          {/* Patients List Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="space-y-3 p-2">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-20 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <User size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-semibold">Tidak ada pasien dalam daftar</p>
                <p className="text-[11px] mt-1 text-slate-400">Pasien antrean baru akan tampil di sini.</p>
              </div>
            ) : (
              filteredRows.map((v) => {
                const isSelected = selected?.id === v.id;
                const isCalled = v.status === "CALLED";
                const isDone = v.status === "IN_CONSULTATION" || v.status === "COMPLETED" || v.status === "PAID";

                return (
                  <div
                    key={v.id}
                    onClick={() => handleSelectPatient(v)}
                    className={`group relative flex flex-col rounded-xl border p-3.5 text-left transition cursor-pointer ${
                      isSelected
                        ? "border-[#168c9b] bg-[#168c9b]/5 shadow-sm"
                        : "border-slate-200 bg-white hover:border-[#168c9b]/50 hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-[#168c9b] bg-[#168c9b]/10 px-2 py-0.5 rounded-md">
                          {v.queueNumber || `V-${v.id}`}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isDone
                              ? "bg-emerald-100 text-emerald-800"
                              : isCalled
                              ? "bg-purple-100 text-purple-800 animate-pulse"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {v.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock size={11} />
                        {v.estimatedWaitMinutes ? `${v.estimatedWaitMinutes}m` : "Est. 15m"}
                      </span>
                    </div>

                    <div className="mt-2">
                      <p className="font-bold text-xs text-[#101a3d] group-hover:text-[#168c9b] transition">
                        {v.patient?.name || "Pasien Anonim"}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {v.patient?.age ? `${v.patient.age} thn` : ""} {v.patient?.gender ? `· ${v.patient.gender}` : ""}{" "}
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

        {/* RIGHT COLUMN: EXAMINATION SUITE & VITALS FORM */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm min-h-[580px]">
          {selected ? (
            <>
              {/* PATIENT PROFILE HEADER CARD */}
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-cyan-50/40 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#168c9b] text-white font-black shadow-md text-lg">
                      {selected.patient?.name?.charAt(0) || "P"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-[#101a3d]">
                          {selected.patient?.name || "Pasien Anonim"}
                        </h2>
                        <span className="font-mono text-xs font-black bg-[#168c9b] text-white px-2 py-0.5 rounded-lg">
                          Antrean: {selected.queueNumber || `V-${selected.id}`}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            selected.status === "IN_CONSULTATION"
                              ? "bg-emerald-100 text-emerald-800"
                              : selected.status === "CALLED"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          Status: {selected.status}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-medium">
                        {selected.patient?.nik && <span>NIK: {selected.patient.nik}</span>}
                        {selected.patient?.gender && <span>Gender: {selected.patient.gender}</span>}
                        {selected.patient?.age && <span>Usia: {selected.patient.age} Tahun</span>}
                        {selected.patient?.phone && <span>Telp: {selected.patient.phone}</span>}
                        <span>Poli: {selected.poli?.name || "Umum"}</span>
                        <span>Dokter: {selected.doctor?.name || "Dr. Jaga"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions in patient header */}
                  <div className="flex items-center gap-2">
                    {selected.status === "WAITING" && (
                      <button
                        type="button"
                        onClick={handleCallPatient}
                        disabled={callingPatient}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-800 hover:bg-purple-100 transition shadow-sm"
                      >
                        <Volume2 size={15} /> {callingPatient ? "Memanggil..." : "Panggil Pasien"}
                      </button>
                    )}

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={applyNormalPreset}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                        title="Terapkan nilai normal standar dewasa"
                      >
                        <CheckCircle2 size={14} className="text-emerald-600" /> Normal Preset
                      </button>
                      <button
                        type="button"
                        onClick={applyFeverPreset}
                        className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 transition"
                        title="Terapkan preset febris/demam"
                      >
                        <Thermometer size={14} className="text-red-500" /> Demam Preset
                      </button>
                    </div>
                  </div>
                </div>

                {/* Chief complaint banner */}
                {selected.complaint && (
                  <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3.5 py-2 text-xs text-amber-900 font-semibold">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                    <span>
                      Keluhan Utama Pasien:{" "}
                      <strong className="underline underline-offset-2">{selected.complaint}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* CLINICAL EXAMINATION FORM */}
              <div className="mt-6 space-y-6">
                {/* 1. VITAL SIGNS PRIMARY GRID */}
                <div>
                  <h3 className="text-sm font-black text-[#101a3d] uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Activity size={16} className="text-[#168c9b]" /> 1. Parameter Tanda-Tanda Vital Utama
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {/* BLOOD PRESSURE */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#168c9b]/40 transition">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Heart size={14} className="text-rose-500" /> Tekanan Darah (mmHg)
                        </label>
                        {bpInfo && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${bpInfo.badge}`}>
                            {bpInfo.label}
                          </span>
                        )}
                      </div>

                      <div className="mt-2.5 flex items-center gap-2">
                        <input
                          type="number"
                          value={bpSystolic}
                          onChange={(e) => setBpSystolic(e.target.value)}
                          placeholder="Sistolik (120)"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-center focus:border-[#168c9b] focus:outline-none"
                        />
                        <span className="text-lg font-black text-slate-400">/</span>
                        <input
                          type="number"
                          value={bpDiastolic}
                          onChange={(e) => setBpDiastolic(e.target.value)}
                          placeholder="Diastolik (80)"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-center focus:border-[#168c9b] focus:outline-none"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5 text-center">Format: Sistolik / Diastolik</p>
                    </div>

                    {/* BODY TEMPERATURE */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#168c9b]/40 transition">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Thermometer size={14} className="text-amber-500" /> Suhu Tubuh (°C)
                        </label>
                        {tempInfo && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${tempInfo.badge}`}>
                            {tempInfo.label}
                          </span>
                        )}
                      </div>

                      <div className="mt-2.5 relative">
                        <input
                          type="number"
                          step="0.1"
                          value={temperature}
                          onChange={(e) => setTemperature(e.target.value)}
                          placeholder="36.5"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-center focus:border-[#168c9b] focus:outline-none"
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">°C</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5 text-center">Normal: 36.1°C – 37.2°C</p>
                    </div>

                    {/* HEART RATE / PULSE */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#168c9b]/40 transition">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Activity size={14} className="text-red-500 animate-pulse" /> Denyut Nadi (bpm)
                        </label>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            parseInt(heartRate, 10) > 100
                              ? "bg-red-50 text-red-700 border-red-200"
                              : parseInt(heartRate, 10) < 60
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {parseInt(heartRate, 10) > 100
                            ? "Takikardia"
                            : parseInt(heartRate, 10) < 60
                            ? "Bradikardia"
                            : "Normal"}
                        </span>
                      </div>

                      <div className="mt-2.5 relative">
                        <input
                          type="number"
                          value={heartRate}
                          onChange={(e) => setHeartRate(e.target.value)}
                          placeholder="75"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-center focus:border-[#168c9b] focus:outline-none"
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">BPM</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5 text-center">Normal: 60 – 100 denyut/mnt</p>
                    </div>

                    {/* RESPIRATORY RATE */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#168c9b]/40 transition">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Wind size={14} className="text-cyan-500" /> Frekuensi Nafas (RR)
                        </label>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            parseInt(respiratoryRate, 10) > 20
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : parseInt(respiratoryRate, 10) < 12
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {parseInt(respiratoryRate, 10) > 20
                            ? "Takipnea"
                            : parseInt(respiratoryRate, 10) < 12
                            ? "Bradipnea"
                            : "Normal"}
                        </span>
                      </div>

                      <div className="mt-2.5 relative">
                        <input
                          type="number"
                          value={respiratoryRate}
                          onChange={(e) => setRespiratoryRate(e.target.value)}
                          placeholder="18"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-center focus:border-[#168c9b] focus:outline-none"
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">x/mnt</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5 text-center">Normal: 12 – 20 x/menit</p>
                    </div>

                    {/* OXYGEN SATURATION */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#168c9b]/40 transition">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Droplets size={14} className="text-blue-500" /> Saturasi Oksigen (SpO2)
                        </label>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            parseInt(oxygenSaturation, 10) < 90
                              ? "bg-red-100 text-red-800 border-red-200 font-bold"
                              : parseInt(oxygenSaturation, 10) < 95
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-emerald-100 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          {parseInt(oxygenSaturation, 10) < 90
                            ? "Hipoksia Berat"
                            : parseInt(oxygenSaturation, 10) < 95
                            ? "Hipoksia Ringan"
                            : "Normal"}
                        </span>
                      </div>

                      <div className="mt-2.5 relative">
                        <input
                          type="number"
                          value={oxygenSaturation}
                          onChange={(e) => setOxygenSaturation(e.target.value)}
                          placeholder="98"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-center focus:border-[#168c9b] focus:outline-none"
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5 text-center">Target Normal: ≥ 95%</p>
                    </div>

                    {/* CONSCIOUSNESS LEVEL */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#168c9b]/40 transition">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <ShieldAlert size={14} className="text-indigo-500" /> Tingkat Kesadaran (GCS)
                      </label>

                      <div className="mt-2.5">
                        <select
                          value={consciousness}
                          onChange={(e) => setConsciousness(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-[#101a3d] focus:border-[#168c9b] focus:outline-none"
                        >
                          <option value="Compos Mentis">Compos Mentis (Sadar Penuh / Normal)</option>
                          <option value="Apatis">Apatis (Acuh / Perhatian Rendah)</option>
                          <option value="Somnolen">Somnolen (Mengantuk / Respon Lambat)</option>
                          <option value="Sopor">Sopor (Hanya Respon Rangsang Nyeri)</option>
                          <option value="Koma">Koma (Tidak Sadar)</option>
                        </select>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5 text-center">Standar Triase AVPU / GCS</p>
                    </div>
                  </div>
                </div>

                {/* 2. ANTHROPOMETRY & LIVE BMI CALCULATOR */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                  <h3 className="text-sm font-black text-[#101a3d] uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Scale size={16} className="text-[#168c9b]" /> 2. Antropometri & Kalkulator BMI Otomatis
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-3 items-center">
                    <div>
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Scale size={13} /> Berat Badan (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="60"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-center focus:border-[#168c9b] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Ruler size={13} /> Tinggi Badan (cm)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="165"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-center focus:border-[#168c9b] focus:outline-none"
                      />
                    </div>

                    {/* LIVE BMI CARD */}
                    <div className="rounded-xl border bg-white p-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase">Indeks Massa Tubuh (BMI)</span>
                        {bmiInfo && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${bmiInfo.color}`}>
                            {bmiInfo.category}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-2xl font-black text-[#101a3d]">
                        {bmiInfo ? `${bmiInfo.value} kg/m²` : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. PAIN SCALE (0 - 10) */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-black text-[#101a3d] flex items-center gap-2">
                      {painScale === 0 ? (
                        <Smile size={18} className="text-emerald-500" />
                      ) : painScale <= 4 ? (
                        <Meh size={18} className="text-amber-500" />
                      ) : (
                        <Frown size={18} className="text-red-500" />
                      )}
                      3. Skala Nyeri Wong-Baker ({painScale} / 10)
                    </label>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        painScale === 0
                          ? "bg-emerald-100 text-emerald-800"
                          : painScale <= 3
                          ? "bg-blue-100 text-blue-800"
                          : painScale <= 6
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800 font-black"
                      }`}
                    >
                      {painScale === 0
                        ? "Bebas Nyeri (0)"
                        : painScale <= 3
                        ? "Nyeri Ringan (1-3)"
                        : painScale <= 6
                        ? "Nyeri Sedang (4-6)"
                        : "Nyeri Berat (7-10)"}
                    </span>
                  </div>

                  <div className="grid grid-cols-11 gap-1 mt-3">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setPainScale(score)}
                        className={`rounded-xl py-2 text-xs font-bold transition flex flex-col items-center justify-center ${
                          painScale === score
                            ? "bg-[#168c9b] text-white shadow-md scale-105"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        <span>{score}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 px-1 font-medium">
                    <span>0: Tidak Nyeri</span>
                    <span>5: Nyeri Sedang</span>
                    <span>10: Nyeri Tak Tertahankan</span>
                  </div>
                </div>

                {/* 4. CLINICAL NOTES & REMARKS */}
                <div>
                  <label className="text-sm font-black text-[#101a3d] mb-1.5 block">
                    4. Catatan Observasi Tambahan Perawat / Alergi
                  </label>
                  <textarea
                    rows={3}
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    placeholder="Contoh: Pasien mengeluh pusing sejak pagi, riwayat alergi amoksisilin, bibir tampak kering, mobilitas mandiri..."
                    className="w-full rounded-xl border border-slate-200 p-3.5 text-xs focus:border-[#168c9b] focus:outline-none resize-none"
                  />
                </div>

                {/* ACTION BUTTONS BAR */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleSaveVitals(false)}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
                  >
                    <Save size={16} /> {saving ? "Menyimpan..." : "Simpan Draf Pemeriksaan"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveVitals(true)}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#168c9b] px-6 py-3 text-xs font-bold text-white shadow-lg hover:bg-[#12727f] transition disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    {saving ? "Memproses..." : "Simpan & Teruskan ke Dokter (Mulai Konsultasi)"}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-cyan-50 text-[#168c9b] mb-4 shadow-inner">
                <Activity size={40} />
              </div>
              <h3 className="text-lg font-black text-[#101a3d]">Pilih Pasien Dari Antrean</h3>
              <p className="mt-1.5 max-w-md text-xs text-slate-500">
                Pilih salah satu pasien di daftar sebelah kiri untuk memulai pemeriksaan tanda-tanda vital (vital signs), triase, dan rekam kondisi klinis.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
