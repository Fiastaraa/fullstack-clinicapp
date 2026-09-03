import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Pill,
  DollarSign,
  Package,
  Printer,
  RefreshCw,
  Building2,
  CheckCircle2,
  X,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/dashboard/StatCard";
import Badge from "../../components/common/Badge";
import { clinic, unwrap } from "../../services/clinicService";

export default function Reports() {
  const [visits, setVisits] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"all" | "month" | "week" | "today">("all");
  const [showPrintModal, setShowPrintModal] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [vRes, mRes] = await Promise.all([
        clinic.visits("all"),
        clinic.medicines(),
      ]);
      setVisits(unwrap(vRes) || []);
      setMedicines(unwrap(mRes) || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filter visits based on selected time range
  const filteredVisits = useMemo(() => {
    if (timeRange === "all") return visits;

    const now = new Date();
    return visits.filter((v) => {
      const vDate = new Date(v.visitDate || v.createdAt);
      if (timeRange === "today") {
        return (
          vDate.getDate() === now.getDate() &&
          vDate.getMonth() === now.getMonth() &&
          vDate.getFullYear() === now.getFullYear()
        );
      }
      if (timeRange === "week") {
        const diffTime = Math.abs(now.getTime() - vDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }
      if (timeRange === "month") {
        return (
          vDate.getMonth() === now.getMonth() &&
          vDate.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });
  }, [visits, timeRange]);

  // Extract all prescriptions from filtered visits
  const allFilteredRx = useMemo(() => {
    return filteredVisits.flatMap((v) =>
      (v.prescriptions || []).map((p: any) => ({
        ...p,
        visitDate: v.visitDate || v.createdAt,
        poliName: v.poli?.name || "Poli Umum",
        doctorName: v.doctor?.name || "Dokter",
        patientName: v.patient?.name || "Pasien",
      }))
    );
  }, [filteredVisits]);

  // Key Metrics
  const totalPrescriptions = allFilteredRx.length;

  const totalRevenue = useMemo(() => {
    return allFilteredRx.reduce(
      (sum, r) => sum + Number(r.medicine?.price || 0) * (r.quantity || 1),
      0
    );
  }, [allFilteredRx]);

  const totalInventoryValuation = useMemo(() => {
    return medicines.reduce(
      (sum, m) => sum + Number(m.price || 0) * (Number(m.stock) || 0),
      0
    );
  }, [medicines]);

  const readyPercentage = useMemo(() => {
    if (totalPrescriptions === 0) return 100;
    const readyCount = allFilteredRx.filter((r) => r.status === "READY").length;
    return Math.round((readyCount / totalPrescriptions) * 100);
  }, [allFilteredRx, totalPrescriptions]);

  // Medicine Usage Aggregation (Table & Top 5)
  const medicineUsageList = useMemo(() => {
    const map = new Map<
      number,
      {
        id: number;
        name: string;
        dosage: string;
        unitPrice: number;
        currentStock: number;
        totalQty: number;
        prescriptionCount: number;
        totalRevenue: number;
      }
    >();

    // Seed from catalog
    medicines.forEach((m) => {
      map.set(m.id, {
        id: m.id,
        name: m.name,
        dosage: m.dosage,
        unitPrice: Number(m.price) || 0,
        currentStock: m.stock,
        totalQty: 0,
        prescriptionCount: 0,
        totalRevenue: 0,
      });
    });

    // Accumulate from filtered prescriptions
    allFilteredRx.forEach((r) => {
      const mId = r.medicineId || r.medicine?.id;
      if (mId && map.has(mId)) {
        const item = map.get(mId)!;
        item.totalQty += r.quantity || 1;
        item.prescriptionCount += 1;
        item.totalRevenue += (Number(r.medicine?.price) || item.unitPrice) * (r.quantity || 1);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty);
  }, [medicines, allFilteredRx]);

  const top5Medicines = useMemo(() => {
    return medicineUsageList.slice(0, 5);
  }, [medicineUsageList]);

  const maxTopQty = useMemo(() => {
    return Math.max(...top5Medicines.map((m) => m.totalQty), 1);
  }, [top5Medicines]);

  // Distribution by Poli
  const poliDistribution = useMemo(() => {
    const map = new Map<string, number>();
    allFilteredRx.forEach((r) => {
      const p = r.poliName || "Poli Umum";
      map.set(p, (map.get(p) || 0) + 1);
    });
    return Array.from(map.entries()).map(([poli, count]) => ({
      poli,
      count,
      percentage: totalPrescriptions > 0 ? Math.round((count / totalPrescriptions) * 100) : 0,
    }));
  }, [allFilteredRx, totalPrescriptions]);

  // Daily Trend aggregation
  const dailyTrend = useMemo(() => {
    const map = new Map<string, { date: string; label: string; count: number; revenue: number }>();

    // Generate last 7 days keys
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" });
      days.push(key);
      map.set(key, { date: key, label, count: 0, revenue: 0 });
    }

    allFilteredRx.forEach((r) => {
      const key = (r.visitDate ? new Date(r.visitDate).toISOString() : new Date().toISOString()).split("T")[0];
      if (map.has(key)) {
        const item = map.get(key)!;
        item.count += 1;
        item.revenue += Number(r.medicine?.price || 0) * (r.quantity || 1);
      }
    });

    return days.map((key) => map.get(key)!);
  }, [allFilteredRx]);

  const maxTrendCount = useMemo(() => {
    return Math.max(...dailyTrend.map((d) => d.count), 1);
  }, [dailyTrend]);

  return (
    <>
      <PageHeader
        title="Laporan & Analitik Farmasi"
        subtitle="Evaluasi perputaran obat, estimasi pendapatan farmasi, trend pemakaian, dan analisis beban poli."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Time range selector */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
              <button
                onClick={() => setTimeRange("all")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  timeRange === "all"
                    ? "bg-[#1B3C53] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setTimeRange("month")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  timeRange === "month"
                    ? "bg-[#1B3C53] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Bulan Ini
              </button>
              <button
                onClick={() => setTimeRange("week")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  timeRange === "week"
                    ? "bg-[#1B3C53] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                7 Hari
              </button>
              <button
                onClick={() => setTimeRange("today")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  timeRange === "today"
                    ? "bg-[#1B3C53] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Hari Ini
              </button>
            </div>

            <button
              onClick={() => setShowPrintModal(true)}
              className="ad-btn ad-btn-primary shadow-xs"
            >
              <Printer size={15} /> Cetak Laporan Eksekutif
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="ad-btn border border-[#dfe3ea] bg-white text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        }
      />

      {/* STAT CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Resep Dilayani"
          value={totalPrescriptions}
          icon={Pill}
          tone="indigo"
          hint={`Dari ${filteredVisits.length} kunjungan pasien`}
        />
        <StatCard
          label="Estimasi Pendapatan Obat"
          value={`Rp ${totalRevenue.toLocaleString("id-ID")}`}
          icon={DollarSign}
          tone="emerald"
          hint="Total penjualan resep"
        />
        <StatCard
          label="Valuasi Total Aset Obat"
          value={`Rp ${totalInventoryValuation.toLocaleString("id-ID")}`}
          icon={Package}
          tone="cyan"
          hint="Nilai sisa stok inventaris"
        />
        <StatCard
          label="Kesiapan Penyerahan"
          value={`${readyPercentage}%`}
          icon={CheckCircle2}
          tone="amber"
          hint="Persentase status READY"
        />
      </div>

      {/* CHARTS GRID */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* CHART 1: DAILY PRESCRIPTIONS TREND */}
        <div className="ad-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-[#1B3C53] text-base flex items-center gap-2">
                <BarChart3 size={18} className="text-[#1B3C53]" />
                Trend Pengeluaran Resep 7 Hari Terakhir
              </h3>
              <p className="text-xs text-slate-500">
                Frekuensi item resep obat yang diracik dan diserahkan harian.
              </p>
            </div>
            <Badge tone="cyan">7 HARI TERAKHIR</Badge>
          </div>

          {/* Bar Chart Visualization */}
          <div className="flex h-52 items-end gap-3 pt-6 px-2">
            {dailyTrend.map((d) => {
              const heightPct = Math.max(10, Math.round((d.count / maxTrendCount) * 100));

              return (
                <div
                  key={d.date}
                  className="flex-1 flex flex-col items-center justify-end gap-2 group relative"
                >
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition absolute -top-8 bg-[#1B3C53] text-white text-[10px] py-1 px-2 rounded-lg font-bold whitespace-nowrap shadow-md pointer-events-none z-10">
                    {d.count} resep · Rp {d.revenue.toLocaleString("id-ID")}
                  </div>

                  <span className="text-[11px] font-extrabold text-[#1B3C53]">
                    {d.count > 0 ? d.count : ""}
                  </span>

                  <div
                    className="w-full rounded-t-xl bg-gradient-to-t from-[#1B3C53] to-[#56c6d0] group-hover:opacity-90 transition-all duration-300"
                    style={{ height: `${heightPct}%` }}
                  />

                  <span className="text-[10px] font-bold text-slate-500 truncate w-full text-center">
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 font-medium">
            <span>Rata-rata: ~{Math.round(totalPrescriptions / 7)} resep/hari</span>
            <span className="font-bold text-[#1B3C53]">
              Total 7 Hari: {dailyTrend.reduce((acc, d) => acc + d.count, 0)} item
            </span>
          </div>
        </div>

        {/* CHART 2: TOP 5 FAST-MOVING DRUGS */}
        <div className="ad-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-[#1B3C53] text-base flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-600" />
                Top 5 Obat Paling Banyak Diresepkan (Fast-Moving)
              </h3>
              <p className="text-xs text-slate-500">
                Peringkat obat dengan tingkat pemakaian tertinggi.
              </p>
            </div>
            <Badge tone="emerald">FAST MOVING</Badge>
          </div>

          <div className="space-y-3.5 pt-2">
            {top5Medicines.map((m, idx) => {
              const widthPct = Math.max(8, Math.round((m.totalQty / maxTopQty) * 100));

              return (
                <div key={m.id} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#1B3C53]">
                      #{idx + 1} {m.name} ({m.dosage})
                    </span>
                    <span className="font-bold text-slate-700">
                      {m.totalQty} unit{" "}
                      <span className="text-[11px] text-slate-400 font-normal">
                        ({m.prescriptionCount}x resep)
                      </span>
                    </span>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-600 to-[#1B3C53] transition-all duration-500"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Sisa stok: {m.currentStock} unit</span>
                    <span>Valuasi keluar: Rp {m.totalRevenue.toLocaleString("id-ID")}</span>
                  </div>
                </div>
              );
            })}

            {top5Medicines.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs">
                Belum ada data pemakaian obat pada periode ini.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* POLI DISTRIBUTION & DETAILED MEDICINE USAGE TABLE */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[360px_1fr]">
        {/* POLI BREAKDOWN */}
        <div className="ad-card p-5 space-y-4 h-fit">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-[#1B3C53] text-sm flex items-center gap-2">
              <Building2 size={16} className="text-[#1B3C53]" />
              Distribusi Resep per Poli
            </h3>
            <p className="text-xs text-slate-500">
              Asal ruangan dokter penulis resep.
            </p>
          </div>

          <div className="space-y-3">
            {poliDistribution.map((p) => (
              <div
                key={p.poli}
                className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 space-y-2 text-xs"
              >
                <div className="flex justify-between items-center font-bold">
                  <span className="text-[#1B3C53]">{p.poli}</span>
                  <span className="font-extrabold text-[#1B3C53]">{p.count} Resep</span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#1B3C53]"
                    style={{ width: `${p.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Kontribusi</span>
                  <span>{p.percentage}% dari total resep</span>
                </div>
              </div>
            ))}

            {poliDistribution.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                Tidak ada data poli tercatat
              </div>
            )}
          </div>
        </div>

        {/* DETAILED USAGE TABLE */}
        <div className="ad-card overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-[#1B3C53] text-base">
                Rincian Pemakaian & Omset Per Jenis Obat
              </h3>
              <p className="text-xs text-slate-500">
                Laporan komprehensif perputaran dan nilai transaksi obat.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {medicineUsageList.length} jenis obat terdata
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1B3C53] text-white uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Nama Obat & Dosis</th>
                  <th className="py-3.5">Harga Satuan</th>
                  <th className="py-3.5 text-center">Frekuensi Diresepkan</th>
                  <th className="py-3.5 text-center">Total Unit Keluar</th>
                  <th className="py-3.5 text-center">Sisa Stok</th>
                  <th className="py-3.5 text-right">Total Nilai Omset</th>
                  <th className="px-5 py-3.5 text-center">Kategori Putar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medicineUsageList.map((m) => {
                  const isFastMoving = m.totalQty >= 10;
                  const isMediumMoving = m.totalQty > 0 && m.totalQty < 10;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5 font-bold text-[#1B3C53]">
                        <p className="font-extrabold text-[#1B3C53] text-sm">{m.name}</p>
                        <p className="text-[11px] text-slate-500 font-normal">
                          Dosis: {m.dosage}
                        </p>
                      </td>
                      <td className="py-3.5 font-medium text-slate-700">
                        Rp {m.unitPrice.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3.5 text-center font-bold text-slate-800">
                        {m.prescriptionCount}x
                      </td>
                      <td className="py-3.5 text-center font-extrabold text-[#1B3C53] text-sm">
                        {m.totalQty} unit
                      </td>
                      <td className="py-3.5 text-center">
                        <span
                          className={`font-black ${
                            m.currentStock === 0
                              ? "text-rose-600"
                              : m.currentStock < 20
                              ? "text-amber-600"
                              : "text-emerald-700"
                          }`}
                        >
                          {m.currentStock}
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-bold text-slate-900">
                        Rp {m.totalRevenue.toLocaleString("id-ID")}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <Badge
                          tone={
                            isFastMoving
                              ? "emerald"
                              : isMediumMoving
                              ? "cyan"
                              : "slate"
                          }
                        >
                          {isFastMoving
                            ? "FAST"
                            : isMediumMoving
                            ? "MEDIUM"
                            : "SLOW"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-500 font-semibold">
            <span>Total Pendapatan Terakumulasi:</span>
            <span className="font-black text-sm text-[#1B3C53]">
              Rp {totalRevenue.toLocaleString("id-ID")}
            </span>
          </div>
        </div>
      </div>

      {/* MODAL: CETAK LAPORAN EKSEKUTIF */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="ad-card w-full max-w-3xl p-6 bg-white space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#1B3C53] text-lg">
                  Laporan Eksekutif Kinerja Farmasi
                </h3>
                <p className="text-xs text-slate-500">
                  Ringkasan resmi pengeluaran obat, pendapatan, dan efisiensi pelayanan.
                </p>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Printable Report View */}
            <div className="rounded-2xl border-2 border-dashed border-slate-300 p-6 bg-slate-50/40 space-y-4">
              <div className="border-b border-slate-200 pb-3 text-center">
                <h4 className="font-black text-lg text-[#1B3C53] uppercase tracking-wider">
                  LAPORAN KINERJA & PEMAKAIAN OBAT FARMASI
                </h4>
                <p className="text-xs text-slate-500">
                  AssistDoc Medical Center · Periode: {timeRange.toUpperCase()} · Dicetak pada:{" "}
                  {new Date().toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-4 gap-2 text-xs border-b border-slate-200 pb-3 text-center">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Total Resep</span>
                  <span className="font-black text-sm text-[#1B3C53]">{totalPrescriptions} item</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Total Pendapatan</span>
                  <span className="font-black text-sm text-[#1B3C53]">Rp {totalRevenue.toLocaleString("id-ID")}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Valuasi Aset Stok</span>
                  <span className="font-black text-sm text-emerald-700">Rp {totalInventoryValuation.toLocaleString("id-ID")}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Kesiapan Resep</span>
                  <span className="font-black text-sm text-amber-700">{readyPercentage}%</span>
                </div>
              </div>

              {/* Top 5 list */}
              <div className="space-y-2 text-xs">
                <h5 className="font-bold text-[#1B3C53] uppercase text-[11px]">
                  5 Obat Paling Banyak Keluar (Fast Moving):
                </h5>
                <table className="w-full text-left text-[11px] border border-slate-200 bg-white">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-1.5">No</th>
                      <th className="p-1.5">Nama Obat</th>
                      <th className="p-1.5">Dosis</th>
                      <th className="p-1.5 text-center">Unit Keluar</th>
                      <th className="p-1.5 text-right">Total Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top5Medicines.map((m, i) => (
                      <tr key={m.id} className="border-t border-slate-100">
                        <td className="p-1.5">{i + 1}</td>
                        <td className="p-1.5 font-bold">{m.name}</td>
                        <td className="p-1.5">{m.dosage}</td>
                        <td className="p-1.5 text-center font-bold">{m.totalQty}</td>
                        <td className="p-1.5 text-right">Rp {m.totalRevenue.toLocaleString("id-ID")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-8 border-t border-slate-200">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-bold text-slate-700">Kepala Bagian Keuangan Klinik</p>
                  <p className="mt-10 font-bold text-[#1B3C53]">( ........................................ )</p>
                </div>
                <div className="text-right">
                  <p>Penanggung Jawab Pelaporan,</p>
                  <p className="font-bold text-slate-700">Apoteker Penanggung Jawab</p>
                  <p className="mt-10 font-bold text-[#1B3C53]">( Apt. Farmasis AssistDoc )</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPrintModal(false)}
                className="ad-btn border border-[#dfe3ea] bg-white text-slate-700"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="ad-btn ad-btn-primary"
              >
                <Printer size={16} /> Cetak Laporan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
