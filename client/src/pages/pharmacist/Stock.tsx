import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Search,
  Printer,
  CheckCircle2,
  X,
  Layers,
  ShieldAlert,
  ClipboardList,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/dashboard/StatCard";
import Badge from "../../components/common/Badge";
import { clinic, unwrap } from "../../services/clinicService";

type Medicine = {
  id: number;
  name: string;
  dosage: string;
  price: number | string;
  stock: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    prescriptions: number;
  };
};

export default function Stock() {
  const [rows, setRows] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "NEED_RESTOCK" | "OUT" | "SAFE">("ALL");
  const [sortBy, setSortBy] = useState<"stock_asc" | "stock_desc" | "name_asc" | "price_desc">("stock_asc");

  // Notifications
  const [msg, setMsg] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Modals
  const [selectedMedForAdjust, setSelectedMedForAdjust] = useState<Medicine | null>(null);
  const [adjustMode, setAdjustMode] = useState<"delta" | "set_exact">("delta");
  const [adjustDelta, setAdjustDelta] = useState<number>(10);
  const [adjustSign, setAdjustSign] = useState<"+" | "-">("+");
  const [exactStockInput, setExactStockInput] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>("Penerimaan Barang / Restock");
  const [showOpnameSheet, setShowOpnameSheet] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await clinic.medicines();
      setRows(unwrap(r) || []);
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal memuat daftar stok obat.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Inline delta adjustment
  async function quickAdjust(id: number, amount: number, medicineName: string) {
    try {
      await clinic.adjustMedicineStock(id, amount);
      setMsg({
        type: "success",
        text: `Stok "${medicineName}" berhasil diubah (${amount > 0 ? `+${amount}` : amount} unit).`,
      });
      load();
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal memperbarui stok.",
      });
    }
  }

  // Handle detailed adjustment modal submit
  async function handleAdjustSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMedForAdjust) return;

    try {
      setLoading(true);
      if (adjustMode === "delta") {
        const delta = adjustSign === "+" ? adjustDelta : -adjustDelta;
        await clinic.adjustMedicineStock(selectedMedForAdjust.id, delta);
        setMsg({
          type: "success",
          text: `Stok "${selectedMedForAdjust.name}" disesuaikan ${delta > 0 ? `+${delta}` : delta} unit (${adjustReason}).`,
        });
      } else {
        // Exact count from stock opname
        const newStock = Math.max(0, exactStockInput);
        await clinic.updateMedicine(selectedMedForAdjust.id, { stock: newStock });
        setMsg({
          type: "success",
          text: `Stok opname "${selectedMedForAdjust.name}" ditetapkan ke ${newStock} unit (${adjustReason}).`,
        });
      }
      setSelectedMedForAdjust(null);
      load();
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal menyimpan penyesuaian stok.",
      });
      setLoading(false);
    }
  }

  // Summary Metrics
  const totalSKUs = rows.length;
  const totalUnits = useMemo(
    () => rows.reduce((acc, m) => acc + (Number(m.stock) || 0), 0),
    [rows]
  );
  const outOfStock = useMemo(() => rows.filter((m) => m.stock === 0), [rows]);
  const lowStock = useMemo(
    () => rows.filter((m) => m.stock > 0 && m.stock < 20),
    [rows]
  );
  const safeStock = useMemo(() => rows.filter((m) => m.stock >= 20), [rows]);

  const readinessPercent = useMemo(() => {
    if (totalSKUs === 0) return 100;
    return Math.round((safeStock.length / totalSKUs) * 100);
  }, [totalSKUs, safeStock]);

  // Filtered & Sorted Rows
  const filteredRows = useMemo(() => {
    return rows
      .filter((m) => {
        if (filterType === "NEED_RESTOCK" && m.stock >= 20) return false;
        if (filterType === "OUT" && m.stock > 0) return false;
        if (filterType === "SAFE" && m.stock < 20) return false;

        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.dosage.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === "stock_asc") return a.stock - b.stock;
        if (sortBy === "stock_desc") return b.stock - a.stock;
        if (sortBy === "name_asc") return a.name.localeCompare(b.name);
        if (sortBy === "price_desc") return Number(b.price) - Number(a.price);
        return 0;
      });
  }, [rows, filterType, searchQuery, sortBy]);

  return (
    <>
      <PageHeader
        title="Pusat Pemantauan & Penyesuaian Stok (Stock Management)"
        subtitle="Monitoring ketersediaan obat, pelaksanaan Stock Opname fisik, dan penyesuaian unit masuk/keluar."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowOpnameSheet(true)}
              className="ad-btn border border-[#dfe3ea] bg-white text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <ClipboardList size={15} /> Lembar Stock Opname
            </button>
            <Link
              to="/dashboard/pharmacist/inventory"
              className="ad-btn ad-btn-primary shadow-xs"
            >
              <Package size={15} /> Inventaris Lengkap <ArrowRight size={14} />
            </Link>
            <button
              onClick={load}
              disabled={loading}
              className="ad-btn border border-[#dfe3ea] bg-white text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
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
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
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

      {/* STAT CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Fisik Unit"
          value={totalUnits.toLocaleString("id-ID")}
          icon={Layers}
          tone="indigo"
          hint="Unit seluruh obat di rak"
        />
        <StatCard
          label="Stok Aman (≥20)"
          value={safeStock.length}
          icon={ShieldCheck}
          tone="emerald"
          hint="Ketersediaan memadai"
        />
        <StatCard
          label="Perlu Restock (<20)"
          value={lowStock.length}
          icon={ShieldAlert}
          tone="amber"
          hint="Segera pesan distributor"
        />
        <StatCard
          label="Stok Habis (0)"
          value={outOfStock.length}
          icon={AlertTriangle}
          tone="rose"
          hint="Stokout! Perlu tindakan"
        />
        <StatCard
          label="Kesiapan Resep"
          value={`${readinessPercent}%`}
          icon={Package}
          tone="cyan"
          hint="Tingkat ketersediaan"
        />
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="mt-6 rounded-2xl border border-[#dfe3ea] bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Filter Tabs */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Filter Level:</span>
            <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100 p-1">
              <button
                onClick={() => setFilterType("ALL")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  filterType === "ALL"
                    ? "bg-white text-[#1B3C53] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua ({rows.length})
              </button>
              <button
                onClick={() => setFilterType("NEED_RESTOCK")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  filterType === "NEED_RESTOCK"
                    ? "bg-[#806a1b] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Perlu Restock ({lowStock.length + outOfStock.length})
              </button>
              <button
                onClick={() => setFilterType("OUT")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  filterType === "OUT"
                    ? "bg-[#a13e34] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Habis (0)
              </button>
              <button
                onClick={() => setFilterType("SAFE")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  filterType === "SAFE"
                    ? "bg-[#21704b] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Aman ({safeStock.length})
              </button>
            </div>
          </div>

          {/* Sort selection */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <ArrowUpDown size={13} /> Urutan:
            </span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="rounded-xl border border-[#dfe3ea] bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-[#1B3C53]"
            >
              <option value="stock_asc">Stok Terendah &uarr; (Prioritas)</option>
              <option value="stock_desc">Stok Tertinggi &darr;</option>
              <option value="name_asc">Nama Obat (A - Z)</option>
              <option value="price_desc">Harga Tertinggi</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama obat atau dosis untuk verifikasi stok fisik..."
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

      {/* STOCK MANAGEMENT TABLE */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-[#dfe3ea] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1B3C53] text-white font-extrabold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4">Item Obat & Sediaan</th>
                <th className="py-4">Harga Satuan</th>
                <th className="py-4">Level Stok Fisik</th>
                <th className="py-4 text-center">Status</th>
                <th className="py-4 text-center">Aksi Cepat (+ / -)</th>
                <th className="px-5 py-4 text-right">Penyesuaian Resmi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((m) => {
                const isOut = m.stock === 0;
                const isLow = m.stock > 0 && m.stock < 20;

                return (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-4 font-bold text-[#1B3C53]">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-teal-50 text-[#1B3C53] shrink-0">
                          <Package size={16} />
                        </div>
                        <div>
                          <p className="font-extrabold text-[#1B3C53] text-sm">{m.name}</p>
                          <p className="text-[11px] text-slate-500 font-normal">
                            Dosis: {m.dosage} · ID #{m.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 font-extrabold text-slate-800 text-sm">
                      Rp {Number(m.price).toLocaleString("id-ID")}
                    </td>

                    <td className="py-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-black text-sm ${
                              isOut
                                ? "text-rose-600"
                                : isLow
                                ? "text-amber-600"
                                : "text-emerald-700"
                            }`}
                          >
                            {m.stock} unit
                          </span>
                          <span className="text-[10px] text-slate-400">di rak</span>
                        </div>
                        {/* Visual Progress Bar */}
                        <div className="h-1.5 w-32 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isOut
                                ? "bg-rose-500 w-0"
                                : isLow
                                ? "bg-amber-500"
                                : "bg-[#1B3C53]"
                            }`}
                            style={{ width: `${Math.min(100, (m.stock / 100) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-4 text-center">
                      <Badge tone={isOut ? "rose" : isLow ? "amber" : "emerald"}>
                        {isOut ? "HABIS" : isLow ? "MENIPIS" : "AMAN"}
                      </Badge>
                    </td>

                    {/* Quick delta adjustments */}
                    <td className="py-4 text-center">
                      <div className="inline-flex items-center gap-1 rounded-xl bg-slate-50 p-1 border border-slate-200">
                        <button
                          onClick={() => quickAdjust(m.id, -10, m.name)}
                          disabled={m.stock < 10}
                          className="rounded-lg px-2 py-1 font-bold text-[11px] text-rose-700 hover:bg-rose-50 disabled:opacity-30 transition"
                          title="Kurangi 10 unit"
                        >
                          -10
                        </button>
                        <button
                          onClick={() => quickAdjust(m.id, -1, m.name)}
                          disabled={m.stock < 1}
                          className="rounded-lg px-2 py-1 font-bold text-[11px] text-rose-700 hover:bg-rose-50 disabled:opacity-30 transition"
                          title="Kurangi 1 unit"
                        >
                          -1
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          onClick={() => quickAdjust(m.id, 1, m.name)}
                          className="rounded-lg px-2 py-1 font-bold text-[11px] text-emerald-700 hover:bg-emerald-50 transition"
                          title="Tambah 1 unit"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => quickAdjust(m.id, 10, m.name)}
                          className="rounded-lg px-2 py-1 font-bold text-[11px] text-emerald-700 hover:bg-emerald-50 transition"
                          title="Tambah 10 unit"
                        >
                          +10
                        </button>
                        <button
                          onClick={() => quickAdjust(m.id, 50, m.name)}
                          className="rounded-lg px-2 py-1 font-bold text-[11px] text-teal-700 hover:bg-teal-50 transition"
                          title="Tambah 50 unit"
                        >
                          +50
                        </button>
                      </div>
                    </td>

                    {/* Modal stock opname trigger */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedMedForAdjust(m);
                          setAdjustMode("delta");
                          setAdjustDelta(10);
                          setAdjustSign("+");
                          setExactStockInput(m.stock);
                          setAdjustReason("Penerimaan Barang / Restock");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#dfe3ea] bg-white px-3 py-1.5 text-xs font-bold text-[#1B3C53] hover:border-[#1B3C53] hover:bg-teal-50/50 shadow-xs transition"
                      >
                        <SlidersHorizontal size={13} /> Sesuaikan Stok
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && filteredRows.length === 0 && (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Package size={36} className="mx-auto text-slate-300" />
            <p className="font-bold text-slate-600 text-base">
              Tidak Ada Item Stok Sesuai Filter
            </p>
            <p className="text-xs">
              Ubah kata kunci pencarian atau sesuaikan pilihan filter level stok.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-500 font-semibold">
          <span>Menampilkan {filteredRows.length} dari total {rows.length} obat terdaftar</span>
          <span>
            Total stok fisik terpantau:{" "}
            <b className="text-[#1B3C53]">{totalUnits.toLocaleString("id-ID")} unit</b>
          </span>
        </div>
      </div>

      {/* MODAL: STOCK OPNAME & DETAILED ADJUSTMENT */}
      {selectedMedForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="ad-card w-full max-w-md p-6 bg-white space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#1B3C53] text-lg">
                  Penyesuaian Stok Resmi
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedMedForAdjust.name} ({selectedMedForAdjust.dosage})
                </p>
              </div>
              <button
                onClick={() => setSelectedMedForAdjust(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-500 font-bold">Stok Sistem Saat Ini:</span>
                <span className="font-black text-xl text-[#1B3C53]">
                  {selectedMedForAdjust.stock} unit
                </span>
              </div>

              {/* Mode Switcher */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Metode Penyesuaian:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustMode("delta")}
                    className={`rounded-xl py-2 font-bold text-xs transition border ${
                      adjustMode === "delta"
                        ? "bg-[#1B3C53] text-white border-[#1B3C53] shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Tambah / Kurang Unit (+/-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustMode("set_exact")}
                    className={`rounded-xl py-2 font-bold text-xs transition border ${
                      adjustMode === "set_exact"
                        ? "bg-[#1B3C53] text-white border-[#1B3C53] shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Hasil Opname Fisik Rak
                  </button>
                </div>
              </div>

              {adjustMode === "delta" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustSign("+")}
                      className={`rounded-xl py-2 font-bold text-xs transition border ${
                        adjustSign === "+"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      + Tambah Stok Masuk
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustSign("-")}
                      className={`rounded-xl py-2 font-bold text-xs transition border ${
                        adjustSign === "-"
                          ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      - Catat Pengurangan
                    </button>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Jumlah Unit:
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={adjustDelta}
                      onChange={(e) => setAdjustDelta(Math.max(1, parseInt(e.target.value) || 0))}
                      className="ad-input font-bold text-lg text-[#1B3C53]"
                    />
                  </div>

                  <div className="rounded-xl bg-teal-50/70 p-3 border border-teal-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-teal-900">Perkiraan Stok Akhir:</span>
                    <span className="font-black text-teal-800 text-base">
                      {adjustSign === "+"
                        ? selectedMedForAdjust.stock + adjustDelta
                        : Math.max(0, selectedMedForAdjust.stock - adjustDelta)}{" "}
                      unit
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Jumlah Fisik Nyata di Rak (Hasil Hitung):
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={exactStockInput}
                      onChange={(e) => setExactStockInput(Math.max(0, parseInt(e.target.value) || 0))}
                      className="ad-input font-bold text-lg text-[#1B3C53]"
                    />
                  </div>

                  <div className="rounded-xl bg-teal-50/70 p-3 border border-teal-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-teal-900">Selisih Hitung Opname:</span>
                    <span
                      className={`font-black text-base ${
                        exactStockInput - selectedMedForAdjust.stock >= 0
                          ? "text-emerald-700"
                          : "text-rose-700"
                      }`}
                    >
                      {exactStockInput - selectedMedForAdjust.stock > 0 ? "+" : ""}
                      {exactStockInput - selectedMedForAdjust.stock} unit
                    </span>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Alasan / Keterangan Penyesuaian:
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="ad-input text-xs font-semibold"
                >
                  <option value="Penerimaan Barang / Restock">Penerimaan Barang Baru / PO Distributor</option>
                  <option value="Hasil Stock Opname Bulanan">Hasil Stock Opname Fisik Berkala</option>
                  <option value="Koreksi Selisih Rak">Koreksi Selisih Hitung Rak Farmasi</option>
                  <option value="Obat Rusak / Kadaluarsa">Pemusnahan Obat Rusak / Kadaluarsa</option>
                  <option value="Retur ke Distributor">Retur Pengembalian ke Distributor</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedMedForAdjust(null)}
                  className="ad-btn border border-[#dfe3ea] bg-white text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="ad-btn ad-btn-primary"
                >
                  Simpan Penyesuaian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CETAK LEMBAR KERJA STOCK OPNAME */}
      {showOpnameSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="ad-card w-full max-w-3xl p-6 bg-white space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#1B3C53] text-lg">
                  Lembar Audit Fisik Stock Opname
                </h3>
                <p className="text-xs text-slate-500">
                  Formulir pencatatan manual penghitungan stok fisik di rak gudang farmasi.
                </p>
              </div>
              <button
                onClick={() => setShowOpnameSheet(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Printable Opname Sheet */}
            <div className="rounded-2xl border-2 border-dashed border-slate-300 p-6 bg-slate-50/50 space-y-4">
              <div className="border-b border-slate-200 pb-3 text-center">
                <h4 className="font-black text-lg text-[#1B3C53] uppercase tracking-wider">
                  LEMBAR AUDIT STOCK OPNAME OBAT - ASSISTDOC PHARMACY
                </h4>
                <p className="text-xs text-slate-500">
                  Tanggal Pelaksanaan:{" "}
                  {new Date().toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <table className="w-full text-left text-xs border border-slate-200 bg-white">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-bold">
                    <th className="p-2 w-10 text-center">No</th>
                    <th className="p-2">Nama Obat</th>
                    <th className="p-2">Dosis</th>
                    <th className="p-2 text-center w-24">Stok Sistem</th>
                    <th className="p-2 text-center w-28">Fisik Nyata</th>
                    <th className="p-2 text-center w-24">Selisih (+/-)</th>
                    <th className="p-2">Paraf</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((m, i) => (
                    <tr key={m.id}>
                      <td className="p-2 text-center text-slate-400">{i + 1}</td>
                      <td className="p-2 font-bold text-[#1B3C53]">{m.name}</td>
                      <td className="p-2 text-slate-600">{m.dosage}</td>
                      <td className="p-2 text-center font-bold text-slate-800">{m.stock}</td>
                      <td className="p-2 text-center border-l border-r border-slate-200">
                        <span className="text-slate-300">...............</span>
                      </td>
                      <td className="p-2 text-center border-r border-slate-200">
                        <span className="text-slate-300">...............</span>
                      </td>
                      <td className="p-2 text-center">
                        <span className="text-slate-300">........</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-8 border-t border-slate-200">
                <div>
                  <p>Petugas Penghitung Rak</p>
                  <p className="mt-10 font-bold text-[#1B3C53]">( ........................................ )</p>
                </div>
                <div className="text-right">
                  <p>Apoteker Penanggung Jawab</p>
                  <p className="mt-10 font-bold text-[#1B3C53]">( Apt. Farmasis AssistDoc )</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowOpnameSheet(false)}
                className="ad-btn border border-[#dfe3ea] bg-white text-slate-700"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="ad-btn ad-btn-primary"
              >
                <Printer size={16} /> Cetak Formulir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

