import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Bell,
  Stethoscope,
  ClipboardList,
  Search,
  Volume2,
  CheckCircle2,
  HeartPulse,
} from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Badge from "../../components/common/Badge";
import { clinic, unwrap } from "../../services/clinicService";

type Visit = {
  id: number;
  queueNumber?: string | null;
  status: string;
  complaint?: string | null;
  temperature?: number | null;
  bloodPressure?: string | null;
  weight?: number | null;
  visitDate: string;
  createdAt: string;
  patient: {
    id: number;
    name: string;
    phone?: string | null;
    gender?: string | null;
    age?: number | null;
  };
  doctor: {
    id: number;
    name: string;
    specialization?: string | null;
  };
  poli?: {
    id: number;
    name: string;
    code?: string;
  } | null;
};

export default function QueuePage({ role }: { role: string }) {
  const [rows, setRows] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "success" | "info" | "error"; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPoli, setSelectedPoli] = useState<string>("ALL");

  async function load() {
    setLoading(true);
    try {
      const res = await clinic.visits("all");
      setRows((unwrap(res) as Visit[]) || []);
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal memuat antrean kunjungan.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Voice Announcement
  function announcePatient(queueNumber: string, patientName: string, poliName?: string) {
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const text = `Nomor antrean ${queueNumber}, atas nama ${patientName}, silakan menuju ruang pemeriksaan ${poliName || "poli"}.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "id-ID";
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("Speech synthesis error:", e);
      }
    }
  }

  // Call Patient
  async function callPatient(v: Visit) {
    const qNum = v.queueNumber || `A0${v.id}`;
    try {
      await clinic.status(v.id, "CALLED");
      announcePatient(qNum, v.patient.name, v.poli?.name);
      setMsg({
        type: "info",
        text: `Memanggil nomor antrean ${qNum} (${v.patient.name}). Pengeras suara aktif.`,
      });
      load();
    } catch (e: any) {
      setMsg({
        type: "error",
        text: e?.response?.data?.message || "Gagal memanggil antrean.",
      });
    }
  }

  // List of distinct Poli
  const poliList = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      if (r.poli?.name) {
        map.set(r.poli.name, r.poli.name);
      }
    });
    return Array.from(map.values());
  }, [rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((v) => {
      // Poli filter
      if (selectedPoli !== "ALL" && v.poli?.name !== selectedPoli) {
        return false;
      }

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = v.patient?.name?.toLowerCase() || "";
      const qNum = v.queueNumber?.toLowerCase() || "";
      const docName = v.doctor?.name?.toLowerCase() || "";
      const complaint = v.complaint?.toLowerCase() || "";

      return name.includes(q) || qNum.includes(q) || docName.includes(q) || complaint.includes(q);
    });
  }, [rows, selectedPoli, searchQuery]);

  const groups = [
    { key: "WAITING", title: "MENUNGGU", tone: "amber" as const, desc: "Pasien di ruang tunggu" },
    { key: "CALLED", title: "DIPANGGIL", tone: "cyan" as const, desc: "Menuju stasiun perawat" },
    { key: "IN_CONSULTATION", title: "SEDANG DIPERIKSA", tone: "violet" as const, desc: "Di ruang konsultasi dokter" },
    { key: "COMPLETED", title: "SELESAI", tone: "emerald" as const, desc: "Pelayanan medis selesai" },
  ];

  return (
    <>
      <PageHeader
        title={role === "NURSE" ? "Antrean Triase & Pasien Poli" : "Antrean Digital Klinik"}
        subtitle="Pemantauan alur antrean pasien real-time dengan pengeras suara pemanggilan otomatis."
        action={
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh Antrean
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
              <Bell className="h-5 w-5 text-red-600 shrink-0" />
            ) : (
              <Volume2 className="h-5 w-5 text-cyan-600 shrink-0" />
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

      {/* FILTER & SEARCH BAR */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Poli Select */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Filter Poli:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedPoli("ALL")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  selectedPoli === "ALL"
                    ? "bg-[#168c9b] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Semua Poli ({rows.length})
              </button>
              {poliList.map((poli) => (
                <button
                  key={poli}
                  onClick={() => setSelectedPoli(poli)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    selectedPoli === poli
                      ? "bg-[#168c9b] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {poli} ({rows.filter((r) => r.poli?.name === poli).length})
                </button>
              ))}
            </div>
          </div>

          <span className="text-xs font-semibold text-slate-400">
            Menampilkan {filteredRows.length} dari {rows.length} pasien
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama pasien, nomor antrean, nama dokter, atau keluhan..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-xs font-medium focus:border-[#168c9b] focus:bg-white focus:outline-none"
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

      {/* KANBAN / 4-COLUMN QUEUE COLUMNS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {groups.map((g) => {
          const groupRows = filteredRows.filter((v) => v.status === g.key);

          return (
            <div
              key={g.key}
              className="rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col min-h-[500px]"
            >
              {/* Column Header */}
              <div className="border-b border-slate-100 p-4 bg-slate-50/60 rounded-t-2xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[#101a3d] text-sm">{g.title}</p>
                    <span className="rounded-full bg-[#168c9b]/10 text-[#168c9b] font-black text-xs px-2 py-0.5">
                      {groupRows.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{g.desc}</p>
                </div>
                <Badge tone={g.tone}>{g.title}</Badge>
              </div>

              {/* Patient Cards */}
              <div className="space-y-3 p-3.5 flex-1 overflow-y-auto max-h-[calc(100vh-320px)]">
                {groupRows.map((v) => {
                  const hasVitals = Boolean(v.temperature || v.bloodPressure);
                  const qNum = v.queueNumber || `A0${v.id}`;

                  return (
                    <div
                      key={v.id}
                      className="rounded-xl border border-slate-200 p-3.5 hover:border-[#168c9b] transition bg-white shadow-xs space-y-2.5 flex flex-col justify-between"
                    >
                      <div>
                        {/* Queue Number & Poli Badge */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <span className="font-mono text-sm font-black text-[#168c9b] bg-[#168c9b]/10 px-2 py-0.5 rounded-lg">
                            {qNum}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">
                            {v.poli?.name || "Poli Umum"}
                          </span>
                        </div>

                        {/* Patient & Doctor */}
                        <div className="mt-2.5">
                          <h4 className="font-bold text-[#101a3d] text-sm">{v.patient?.name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {v.patient.age ? `${v.patient.age} thn` : ""} {v.patient.gender ? `· ${v.patient.gender}` : ""}{" "}
                            · Dr. {v.doctor?.name}
                          </p>
                          {v.complaint && (
                            <p className="text-xs font-medium text-amber-800 bg-amber-50 rounded px-2 py-1 mt-1.5 border border-amber-100">
                              Keluhan: {v.complaint}
                            </p>
                          )}
                        </div>

                        {/* Triage / Vitals Indicator */}
                        <div className="mt-2.5">
                          {hasVitals ? (
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-800 bg-cyan-50 rounded-lg p-1.5 border border-cyan-100">
                              <HeartPulse size={12} className="text-[#168c9b] shrink-0" />
                              <span>
                                {v.bloodPressure ? `TD: ${v.bloodPressure}` : ""} {v.temperature ? `· ${v.temperature}°C` : ""}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 rounded-lg p-1.5 border border-rose-100">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping"></span>
                              <span>Belum Pemeriksaan TTV</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        {/* WAITING Actions */}
                        {g.key === "WAITING" && (
                          <>
                            <button
                              onClick={() => callPatient(v)}
                              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-2 text-xs font-bold text-white shadow-xs transition"
                            >
                              <Volume2 size={13} /> Panggil Pasien (Audio)
                            </button>
                            <Link
                              to={`/dashboard/nurse/vitals?visitId=${v.id}`}
                              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#168c9b] hover:bg-[#12727f] px-3 py-2 text-xs font-bold text-white shadow-xs transition"
                            >
                              <ClipboardList size={13} /> Pemeriksaan Vital Signs
                            </Link>
                          </>
                        )}

                        {/* CALLED Actions */}
                        {g.key === "CALLED" && (
                          <>
                            <button
                              onClick={() => announcePatient(qNum, v.patient.name, v.poli?.name)}
                              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900 transition"
                            >
                              <Volume2 size={13} /> Panggil Ulang Audio
                            </button>
                            <Link
                              to={`/dashboard/nurse/vitals?visitId=${v.id}`}
                              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#168c9b] hover:bg-[#12727f] px-3 py-2 text-xs font-bold text-white shadow-xs transition"
                            >
                              <ClipboardList size={13} /> Input / Lengkapi TTV
                            </Link>
                          </>
                        )}

                        {/* IN_CONSULTATION Actions */}
                        {g.key === "IN_CONSULTATION" && (
                          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1 py-1">
                            <span className="flex items-center gap-1 text-indigo-600 font-bold">
                              <Stethoscope size={13} /> Di Ruang Konsultasi
                            </span>
                            <Link
                              to={`/dashboard/doctor/consultation?visitId=${v.id}`}
                              className="text-xs text-indigo-600 hover:underline font-bold"
                            >
                              Lihat &rarr;
                            </Link>
                          </div>
                        )}

                        {/* COMPLETED Actions */}
                        {g.key === "COMPLETED" && (
                          <div className="flex items-center justify-center gap-1 text-xs text-emerald-700 font-bold py-1 bg-emerald-50 rounded-lg">
                            <CheckCircle2 size={13} /> Selesai Diperiksa
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {!loading && groupRows.length === 0 && (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Tidak ada pasien dalam antrean ini
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
