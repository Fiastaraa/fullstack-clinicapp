import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/dashboard/StatCard";
import { clinic, unwrap } from "../../services/clinicService";
import {
  Users,
  Wallet,
  Calendar,
  Printer,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Stethoscope,
  Activity,
  CreditCard,
  Building2,
  CheckCircle2,
  Clock,
  Search,
  FileSpreadsheet,
} from "lucide-react";

type ChartItem = {
  date: string;
  formattedDate: string;
  visits: number;
  revenue: number;
};

type PoliItem = {
  name: string;
  count: number;
  percentage: number;
};

type DiagnosisItem = {
  name: string;
  count: number;
  percentage: number;
};

type PaymentItem = {
  method: string;
  label: string;
  count: number;
  total: number;
};

type DetailedVisit = {
  id: number;
  queueNumber: string;
  visitDate: string;
  patientName: string;
  patientAge?: number | null;
  patientGender?: string | null;
  doctorName: string;
  poliName: string;
  primaryDiagnosis: string;
  status: string;
  totalBill: number;
  invoiceStatus: string;
  paymentMethod: string;
};

type ReportData = {
  range: string;
  startDate: string;
  endDate: string;
  totalVisits: number;
  completedVisits: number;
  inProgressVisits: number;
  totalRevenue: number;
  averageBill: number;
  executiveSummary: {
    periodLabel: string;
    peakDayText: string;
    topPoliText: string;
    topDiagnosisText: string;
    financialHealth: string;
  };
  chart: ChartItem[];
  poliBreakdown: PoliItem[];
  topDiagnoses: DiagnosisItem[];
  paymentBreakdown: PaymentItem[];
  detailedVisits: DetailedVisit[];
};

export default function ReportsPage() {
  const [range, setRange] = useState("weekly");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartMetric, setChartMetric] = useState<"visits" | "revenue">("visits");
  const [tableSearch, setTableSearch] = useState("");

  async function loadReports() {
    try {
      setLoading(true);
      const res = await clinic.reports(range);
      setData(unwrap(res));
    } catch (err) {
      console.error("Gagal memuat laporan:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, [range]);

  // Max value for chart scale
  const maxVisits = useMemo(() => {
    return Math.max(...(data?.chart || []).map((x) => x.visits), 1);
  }, [data?.chart]);

  const maxRevenue = useMemo(() => {
    return Math.max(...(data?.chart || []).map((x) => x.revenue), 1000);
  }, [data?.chart]);

  // Filtered detailed visits for table
  const filteredVisits = useMemo(() => {
    if (!data?.detailedVisits) return [];
    if (!tableSearch.trim()) return data.detailedVisits;
    const q = tableSearch.toLowerCase();
    return data.detailedVisits.filter((v) => {
      return (
        v.patientName.toLowerCase().includes(q) ||
        v.doctorName.toLowerCase().includes(q) ||
        v.poliName.toLowerCase().includes(q) ||
        v.primaryDiagnosis.toLowerCase().includes(q) ||
        v.queueNumber.toLowerCase().includes(q)
      );
    });
  }, [data?.detailedVisits, tableSearch]);

  // Export table to CSV
  function exportCSV() {
    if (!data?.detailedVisits || data.detailedVisits.length === 0) return;
    const headers = [
      "No. Antrean",
      "Tanggal & Waktu",
      "Nama Pasien",
      "Usia",
      "Jenis Kelamin",
      "Poliklinik",
      "Dokter Pemeriksa",
      "Diagnosis Utama",
      "Status Kunjungan",
      "Total Biaya (Rp)",
      "Status Tagihan",
      "Metode Pembayaran",
    ];

    const rows = data.detailedVisits.map((v) => [
      v.queueNumber,
      `"${new Date(v.visitDate).toLocaleString("id-ID")}"`,
      `"${v.patientName.replace(/"/g, '""')}"`,
      v.patientAge || "-",
      v.patientGender || "-",
      `"${v.poliName}"`,
      `"${v.doctorName.replace(/"/g, '""')}"`,
      `"${v.primaryDiagnosis.replace(/"/g, '""')}"`,
      v.status,
      v.totalBill,
      v.invoiceStatus,
      v.paymentMethod,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `laporan_klinik_assistdoc_${range}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Print report
  function handlePrint() {
    window.print();
  }

  const completionRate = useMemo(() => {
    if (!data || data.totalVisits === 0) return 0;
    return Math.round((data.completedVisits / data.totalVisits) * 100);
  }, [data]);

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="Laporan & Analitik Operasional Klinik"
          subtitle="Pantau performa layanan medis, tren kunjungan pasien, morbiditas diagnosa, dan arus kas pendapatan klinik secara humanis dan komprehensif."
          action={
            <div className="flex flex-wrap items-center gap-2">
              {/* Range Selector */}
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
                <Calendar size={14} className="ml-2 text-indigo-600" />
                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  className="bg-transparent pr-3 py-1.5 text-xs font-bold text-[#101a3d] focus:outline-none cursor-pointer"
                >
                  <option value="daily">Hari Ini (Daily)</option>
                  <option value="weekly">7 Hari Terakhir (Weekly)</option>
                  <option value="monthly">Bulan Ini (Monthly)</option>
                  <option value="yearly">Tahun Ini (Yearly)</option>
                  <option value="all">Semua Data (All-Time)</option>
                </select>
              </div>

              {/* Action Buttons */}
              <button
                onClick={exportCSV}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 shadow-xs transition"
                title="Unduh rekap laporan ke format spreadsheet"
              >
                <FileSpreadsheet size={14} /> Ekspor Excel / CSV
              </button>

              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition"
                title="Cetak format cetak resmi klinik"
              >
                <Printer size={14} /> Cetak Laporan
              </button>

              <button
                onClick={loadReports}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          }
        />
      </div>

      {/* PRINT HEADER ONLY VISIBLE WHEN PRINTING */}
      <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-4 text-center">
        <h1 className="text-2xl font-black text-slate-950 uppercase tracking-wide">
          AssistDoc Medical Center
        </h1>
        <p className="text-xs text-slate-600">
          Laporan Resmi Rekapitulasi Pelayanan Pasien & Arus Pendapatan Klinik
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          Periode: {data?.executiveSummary?.periodLabel || range} · Dicetak pada:{" "}
          {new Date().toLocaleString("id-ID")}
        </p>
      </div>

      {/* 1. EXECUTIVE SMART SUMMARY CARD (HUMANIZED AI INSIGHT) */}
      <div className="mb-6 rounded-2xl border border-indigo-100 bg-gradient-to-r from-[#0d1636] via-[#131e48] to-[#1c2b66] p-5 text-white shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/20 text-cyan-300">
                <Sparkles size={16} />
              </span>
              <h3 className="font-extrabold text-sm text-cyan-300 uppercase tracking-wider">
                Ringkasan Eksekutif Klinik ({data?.executiveSummary?.periodLabel || "Periode Berjalan"})
              </h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-200">
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs border border-white/10">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">
                  📅 Hari Puncak Kunjungan
                </span>
                <p className="font-bold text-white text-sm">
                  {data?.executiveSummary?.peakDayText || "Sedang memuat data..."}
                </p>
              </div>

              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs border border-white/10">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">
                  🏥 Poliklinik Paling Banyak Dikunjungi
                </span>
                <p className="font-bold text-cyan-300 text-sm">
                  {data?.executiveSummary?.topPoliText || "Sedang memuat data..."}
                </p>
              </div>

              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs border border-white/10">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">
                  🩺 Diagnosis Morbiditas Utama
                </span>
                <p className="font-bold text-amber-300 text-sm">
                  {data?.executiveSummary?.topDiagnosisText || "Sedang memuat data..."}
                </p>
              </div>

              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs border border-white/10">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">
                  💳 Kesehatan Finansial & Transaksi
                </span>
                <p className="font-medium text-emerald-300 text-xs">
                  {data?.executiveSummary?.financialHealth || "Sedang memuat data..."}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white/10 p-4 text-center border border-white/10 shrink-0 sm:min-w-44">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
              Efisiensi Layanan
            </span>
            <span className="text-3xl font-black text-cyan-300 block mt-1">
              {completionRate}%
            </span>
            <span className="text-[11px] text-slate-300 block mt-1">
              Pasien Selesai Ditangani
            </span>
          </div>
        </div>
      </div>

      {/* 2. CORE KPI METRICS (HUMANIZED & MEANINGFUL CLINICAL STATS) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          label="Total Pasien Terlayani"
          value={data?.totalVisits ?? 0}
          icon={Users}
          hint={`${data?.completedVisits ?? 0} selesai diperiksa · ${data?.inProgressVisits ?? 0} antrean`}
        />
        <StatCard
          label="Total Penerimaan Kasir"
          value={`Rp ${(data?.totalRevenue ?? 0).toLocaleString("id-ID")}`}
          icon={Wallet}
          tone="emerald"
          hint="Akumulasi tagihan invoice lunas"
        />
        <StatCard
          label="Rata-rata Tagihan / Pasien"
          value={`Rp ${(data?.averageBill ?? 0).toLocaleString("id-ID")}`}
          icon={CreditCard}
          tone="cyan"
          hint="Biaya medis & obat per kunjungan"
        />
        <StatCard
          label="Tingkat Keterisian Layanan"
          value={`${data?.poliBreakdown?.length ?? 0} Poli`}
          icon={Building2}
          tone="violet"
          hint="Poliklinik aktif menerima kunjungan"
        />
      </div>

      {/* 3. INTERACTIVE VISIT & REVENUE TREND CHART */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-black text-sm text-[#101a3d] flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-600" />
              Tren Aktivitas Pelayanan & Arus Pendapatan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Grafik fluktuasi kedatangan pasien dan penerimaan kas klinik per hari.
            </p>
          </div>

          {/* Metric Toggle */}
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
            <button
              onClick={() => setChartMetric("visits")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                chartMetric === "visits"
                  ? "bg-white text-indigo-700 shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users size={13} />
              Kunjungan Pasien (Orang)
            </button>
            <button
              onClick={() => setChartMetric("revenue")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                chartMetric === "revenue"
                  ? "bg-white text-emerald-700 shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Wallet size={13} />
              Pendapatan (Rupiah)
            </button>
          </div>
        </div>

        {/* Visual Bar Graph */}
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <RefreshCw size={24} className="animate-spin text-indigo-600" />
          </div>
        ) : (data?.chart || []).length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Activity size={36} className="mx-auto mb-2 opacity-30" />
            <p className="font-bold text-xs">Belum ada aktivitas pada rentang waktu ini.</p>
          </div>
        ) : (
          <div className="mt-4 flex h-64 items-end gap-3 sm:gap-6 overflow-x-auto pb-2 px-2">
            {(data?.chart || []).map((x) => {
              const isRevenue = chartMetric === "revenue";
              const currentVal = isRevenue ? x.revenue : x.visits;
              const maxVal = isRevenue ? maxRevenue : maxVisits;
              const heightPercent = Math.max(8, (currentVal / maxVal) * 190);

              return (
                <div
                  key={x.date}
                  className="group relative flex min-w-12 sm:min-w-16 flex-1 flex-col items-center justify-end gap-2"
                >
                  {/* Tooltip & Value above bar */}
                  <span
                    className={`font-black text-[11px] transition duration-150 ${
                      currentVal > 0
                        ? isRevenue
                          ? "text-emerald-700 font-mono"
                          : "text-indigo-700"
                        : "text-slate-300"
                    }`}
                  >
                    {isRevenue
                      ? currentVal > 0
                        ? `Rp ${Math.round(currentVal / 1000)}k`
                        : "0"
                      : currentVal}
                  </span>

                  {/* Visual Bar */}
                  <div
                    className={`w-full max-w-10 rounded-t-xl transition-all duration-300 shadow-xs ${
                      isRevenue
                        ? "bg-gradient-to-t from-emerald-600 to-teal-400 group-hover:from-emerald-500 group-hover:to-teal-300"
                        : "bg-gradient-to-t from-indigo-700 to-cyan-500 group-hover:from-indigo-600 group-hover:to-cyan-400"
                    }`}
                    style={{ height: `${heightPercent}px` }}
                  />

                  {/* X-Axis Date Label */}
                  <div className="text-center pt-1 border-t border-slate-100 w-full">
                    <span className="block text-[11px] font-bold text-slate-700 truncate">
                      {x.formattedDate.split(",")[0]}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono">
                      {x.date.slice(5)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. CLINICAL INSIGHTS GRID: POLIKLINIK, TOP DIAGNOSIS, & METODE PEMBAYARAN */}
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* POLIKLINIK BREAKDOWN */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h4 className="font-extrabold text-xs text-[#101a3d] flex items-center gap-2">
              <Building2 size={15} className="text-indigo-600" />
              Distribusi Kunjungan Poliklinik
            </h4>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
              {data?.poliBreakdown?.length || 0} Poli
            </span>
          </div>

          <div className="space-y-3">
            {(!data?.poliBreakdown || data.poliBreakdown.length === 0) ? (
              <p className="text-center text-xs text-slate-400 py-6">Belum ada kunjungan poli.</p>
            ) : (
              data.poliBreakdown.map((p, idx) => (
                <div key={p.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-800">
                      {idx + 1}. {p.name}
                    </span>
                    <span className="text-[#101a3d] font-bold">
                      {p.count} pasien ({p.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all"
                      style={{ width: `${p.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 10 BESAR DIAGNOSIS / PENYAKIT (TOP MORBIDITY) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h4 className="font-extrabold text-xs text-[#101a3d] flex items-center gap-2">
              <Stethoscope size={15} className="text-indigo-600" />
              10 Diagnosis Terbanyak (Morbiditas)
            </h4>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
              ICD-10
            </span>
          </div>

          <div className="space-y-3">
            {(!data?.topDiagnoses || data.topDiagnoses.length === 0) ? (
              <p className="text-center text-xs text-slate-400 py-6">Belum ada diagnosa tercatat.</p>
            ) : (
              data.topDiagnoses.map((d, idx) => (
                <div key={d.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-800 truncate max-w-[200px]" title={d.name}>
                      {idx + 1}. {d.name}
                    </span>
                    <span className="text-[#101a3d] font-bold shrink-0">
                      {d.count} kasus
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-cyan-500 transition-all"
                      style={{ width: `${d.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* METODE PEMBAYARAN & FINANSIAL */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h4 className="font-extrabold text-xs text-[#101a3d] flex items-center gap-2">
              <CreditCard size={15} className="text-indigo-600" />
              Komposisi Metode Pembayaran Kasir
            </h4>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              Lunas
            </span>
          </div>

          <div className="space-y-3.5">
            {(!data?.paymentBreakdown || data.paymentBreakdown.length === 0) ? (
              <p className="text-center text-xs text-slate-400 py-6">Belum ada transaksi pembayaran.</p>
            ) : (
              data.paymentBreakdown.map((pm) => (
                <div
                  key={pm.method}
                  className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 flex items-center justify-between"
                >
                  <div>
                    <span className="font-extrabold text-xs text-[#101a3d] block">
                      {pm.label}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {pm.count} transaksi berhasil
                    </span>
                  </div>
                  <span className="font-mono font-bold text-xs text-emerald-700">
                    Rp {pm.total.toLocaleString("id-ID")}
                  </span>
                </div>
              ))
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-black text-[#101a3d]">
              <span>Total Penerimaan Lunas:</span>
              <span className="text-emerald-700 font-mono">
                Rp {(data?.totalRevenue ?? 0).toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. DETAILED AUDIT RECAP TABLE (REKAPITULASI PELAYANAN PASIEN) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h3 className="font-black text-sm text-[#101a3d] flex items-center gap-2">
              <Users size={16} className="text-indigo-600" />
              Rincian Kunjungan & Riwayat Rekapitulasi Pelayanan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar rekam pelayanan pasien selama periode terpilih ({filteredVisits.length} data).
            </p>
          </div>

          {/* Search Table */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Cari pasien, dokter, diagnosa..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111a3a] text-white">
              <tr>
                <th className="py-3.5 px-4">No. Antrean</th>
                <th className="py-3.5 px-4">Waktu Kunjungan</th>
                <th className="py-3.5 px-4">Nama Pasien</th>
                <th className="py-3.5 px-4">Poliklinik & Dokter</th>
                <th className="py-3.5 px-4">Diagnosis Utama</th>
                <th className="py-3.5 px-4 text-center">Status Layanan</th>
                <th className="py-3.5 px-4 text-right">Biaya / Tagihan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredVisits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Tidak ada riwayat kunjungan yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredVisits.map((v) => {
                  const isDone = v.status === "COMPLETED" || v.status === "PAID";

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                        {v.queueNumber}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(v.visitDate).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#101a3d]">
                        {v.patientName}
                        {v.patientAge ? (
                          <span className="text-[11px] font-normal text-slate-400 ml-1">
                            ({v.patientAge} thn)
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#101a3d] block">{v.poliName}</span>
                        <span className="text-[11px] text-slate-400 block">{v.doctorName}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-medium">
                        {v.primaryDiagnosis}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isDone
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isDone ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                          {v.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#101a3d]">
                        {v.totalBill > 0
                          ? `Rp ${v.totalBill.toLocaleString("id-ID")}`
                          : "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
