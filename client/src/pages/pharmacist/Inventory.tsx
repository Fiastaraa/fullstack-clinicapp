import { useEffect, useMemo, useState } from "react";
import {
  Pill,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  PackagePlus,
  Printer,
  X,
  Layers,
  ArrowUpDown,
  Coins,
  ShieldAlert,
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

export default function Inventory() {
  const [rows, setRows] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"ALL" | "SAFE" | "LOW" | "OUT">("ALL");
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "stock_asc" | "stock_desc" | "price_desc" | "price_asc">("name_asc");

  // Notifications
  const [msg, setMsg] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [restockMedicine, setRestockMedicine] = useState<Medicine | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(10);
  const [restockType, setRestockType] = useState<"add" | "subtract">("add");
  const [showPrintReport, setShowPrintReport] = useState(false);

  // Form states for Add / Edit
  const [formData, setFormData] = useState({
    name: "",
    dosage: "",
    price: "",
    stock: "",
  });

  async function loadMedicines() {
    setLoading(true);
    try {
      const res = await clinic.medicines();
      setRows((unwrap(res) as Medicine[]) || []);
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal memuat inventaris obat.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMedicines();
  }, []);

  // Stats calculation
  const totalSKUs = rows.length;
  const totalStockUnits = useMemo(
    () => rows.reduce((sum, m) => sum + (Number(m.stock) || 0), 0),
    [rows]
  );
  const lowStockCount = useMemo(
    () => rows.filter((m) => m.stock > 0 && m.stock < 20).length,
    [rows]
  );
  const outOfStockCount = useMemo(
    () => rows.filter((m) => m.stock === 0).length,
    [rows]
  );
  const totalValuation = useMemo(
    () => rows.reduce((sum, m) => sum + Number(m.price || 0) * (Number(m.stock) || 0), 0),
    [rows]
  );

  // Filtering & Sorting
  const filteredRows = useMemo(() => {
    return rows
      .filter((m) => {
        // Stock Filter
        if (stockFilter === "SAFE" && m.stock < 20) return false;
        if (stockFilter === "LOW" && (m.stock === 0 || m.stock >= 20)) return false;
        if (stockFilter === "OUT" && m.stock > 0) return false;

        // Search Query
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.dosage.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === "name_asc") return a.name.localeCompare(b.name);
        if (sortBy === "name_desc") return b.name.localeCompare(a.name);
        if (sortBy === "stock_asc") return a.stock - b.stock;
        if (sortBy === "stock_desc") return b.stock - a.stock;
        if (sortBy === "price_desc") return Number(b.price) - Number(a.price);
        if (sortBy === "price_asc") return Number(a.price) - Number(b.price);
        return 0;
      });
  }, [rows, stockFilter, searchQuery, sortBy]);

  // Handle Add Medicine Submit
  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim() || !formData.dosage.trim()) {
      setMsg({ type: "error", text: "Nama dan dosis obat wajib diisi." });
      return;
    }

    try {
      setLoading(true);
      await clinic.createMedicine({
        name: formData.name.trim(),
        dosage: formData.dosage.trim(),
        price: Number(formData.price) || 0,
        stock: Number(formData.stock) || 0,
      });

      setMsg({
        type: "success",
        text: `Obat "${formData.name}" berhasil ditambahkan ke inventaris.`,
      });
      setShowAddModal(false);
      setFormData({ name: "", dosage: "", price: "", stock: "" });
      loadMedicines();
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal menambahkan obat baru.",
      });
      setLoading(false);
    }
  }

  // Handle Edit Submit
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMedicine) return;

    try {
      setLoading(true);
      await clinic.updateMedicine(editingMedicine.id, {
        name: formData.name.trim(),
        dosage: formData.dosage.trim(),
        price: Number(formData.price) || 0,
        stock: Number(formData.stock) || 0,
      });

      setMsg({
        type: "success",
        text: `Data obat "${formData.name}" berhasil diperbarui.`,
      });
      setEditingMedicine(null);
      loadMedicines();
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal memperbarui data obat.",
      });
      setLoading(false);
    }
  }

  // Handle Quick Restock Submit
  async function handleRestockSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!restockMedicine || restockAmount <= 0) return;

    const adjustment = restockType === "add" ? restockAmount : -restockAmount;

    try {
      setLoading(true);
      await clinic.adjustMedicineStock(restockMedicine.id, adjustment);
      setMsg({
        type: "success",
        text: `Stok "${restockMedicine.name}" berhasil disesuaikan (${adjustment > 0 ? `+${adjustment}` : adjustment}).`,
      });
      setRestockMedicine(null);
      loadMedicines();
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal menyesuaikan stok obat.",
      });
      setLoading(false);
    }
  }

  // Handle Delete
  async function handleDelete(m: Medicine) {
    if (
      !window.confirm(
        `Yakin ingin menghapus obat "${m.name}" (${m.dosage}) dari inventaris?`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      await clinic.deleteMedicine(m.id);
      setMsg({
        type: "success",
        text: `Obat "${m.name}" berhasil dihapus dari inventaris.`,
      });
      loadMedicines();
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal menghapus obat.",
      });
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Inventaris Obat & Farmasi"
        subtitle="Kelola ketersediaan obat, penyesuaian stok, pembaruan harga, dan pelaporan aset farmasi."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setFormData({ name: "", dosage: "", price: "", stock: "0" });
                setShowAddModal(true);
              }}
              className="ad-btn ad-btn-primary shadow-xs"
            >
              <Plus size={16} /> Tambah Obat Baru
            </button>
            <button
              onClick={() => setShowPrintReport(true)}
              className="ad-btn border border-[#dfe3ea] bg-white text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <Printer size={15} /> Cetak Laporan
            </button>
            <button
              onClick={loadMedicines}
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
          label="Total Jenis Obat"
          value={totalSKUs}
          icon={Pill}
          tone="indigo"
          hint="SKU Obat Aktif"
        />
        <StatCard
          label="Total Fisik Unit"
          value={totalStockUnits.toLocaleString("id-ID")}
          icon={Layers}
          tone="cyan"
          hint="Unit siap diserahkan"
        />
        <StatCard
          label="Stok Menipis (<20)"
          value={lowStockCount}
          icon={ShieldAlert}
          tone="amber"
          hint="Perlu segera restock"
        />
        <StatCard
          label="Stok Kosong (0)"
          value={outOfStockCount}
          icon={AlertTriangle}
          tone="rose"
          hint="Tidak dapat diresepkan"
        />
        <StatCard
          label="Estimasi Nilai Aset"
          value={`Rp ${(totalValuation / 1000).toFixed(0)}k`}
          icon={Coins}
          tone="emerald"
          hint={`Total: Rp ${totalValuation.toLocaleString("id-ID")}`}
        />
      </div>

      {/* FILTER, SEARCH & SORT CONTROLS */}
      <div className="mt-6 rounded-2xl border border-[#dfe3ea] bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Stock Filter Tabs */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Status Stok:</span>
            <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100 p-1">
              <button
                onClick={() => setStockFilter("ALL")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  stockFilter === "ALL"
                    ? "bg-white text-[#1B3C53] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua ({rows.length})
              </button>
              <button
                onClick={() => setStockFilter("SAFE")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  stockFilter === "SAFE"
                    ? "bg-[#21704b] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Stok Aman ({rows.filter((m) => m.stock >= 20).length})
              </button>
              <button
                onClick={() => setStockFilter("LOW")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  stockFilter === "LOW"
                    ? "bg-[#806a1b] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Menipis ({lowStockCount})
              </button>
              <button
                onClick={() => setStockFilter("OUT")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  stockFilter === "OUT"
                    ? "bg-[#a13e34] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Kosong ({outOfStockCount})
              </button>
            </div>
          </div>

          {/* Sorting Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <ArrowUpDown size={13} /> Urutkan:
            </span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="rounded-xl border border-[#dfe3ea] bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-[#1B3C53]"
            >
              <option value="name_asc">Nama (A - Z)</option>
              <option value="name_desc">Nama (Z - A)</option>
              <option value="stock_asc">Stok Terendah &uarr;</option>
              <option value="stock_desc">Stok Tertinggi &darr;</option>
              <option value="price_desc">Harga Tertinggi</option>
              <option value="price_asc">Harga Terendah</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama obat atau bentuk dosis (misal: Paracetamol, Amoxicillin, 500mg, Sirup)..."
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

      {/* MEDICINE INVENTORY TABLE */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-[#dfe3ea] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1B3C53] text-white font-extrabold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4">No & Nama Obat</th>
                <th className="py-4">Bentuk / Dosis</th>
                <th className="py-4">Harga Satuan</th>
                <th className="py-4">Sisa Stok Fisik</th>
                <th className="py-4">Valuasi Item</th>
                <th className="py-4 text-center">Resep Terkait</th>
                <th className="px-5 py-4 text-right">Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((m, idx) => {
                const isOutOfStock = m.stock === 0;
                const isLowStock = m.stock > 0 && m.stock < 20;
                const itemValuation = Number(m.price || 0) * m.stock;

                return (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-4 font-bold text-[#1B3C53]">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-slate-400 font-normal">
                          #{String(idx + 1).padStart(2, "0")}
                        </span>
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-teal-50 text-[#1B3C53]">
                          <Pill size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-[#1B3C53]">
                            {m.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-normal">
                            SKU-MED-{m.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 font-semibold text-slate-700">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700 font-bold">
                        {m.dosage}
                      </span>
                    </td>
                    <td className="py-4 font-extrabold text-[#1B3C53] text-sm">
                      Rp {Number(m.price).toLocaleString("id-ID")}
                    </td>
                    <td className="py-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-black text-sm ${
                              isOutOfStock
                                ? "text-rose-600"
                                : isLowStock
                                ? "text-amber-600"
                                : "text-emerald-700"
                            }`}
                          >
                            {m.stock} unit
                          </span>
                          <Badge
                            tone={
                              isOutOfStock ? "rose" : isLowStock ? "amber" : "emerald"
                            }
                          >
                            {isOutOfStock
                              ? "HABIS"
                              : isLowStock
                              ? "MENIPIS"
                              : "AMAN"}
                          </Badge>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-1.5 w-28 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isOutOfStock
                                ? "bg-rose-500 w-0"
                                : isLowStock
                                ? "bg-amber-500"
                                : "bg-[#1B3C53]"
                            }`}
                            style={{ width: `${Math.min(100, (m.stock / 100) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 font-bold text-slate-800">
                      Rp {itemValuation.toLocaleString("id-ID")}
                    </td>
                    <td className="py-4 text-center">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                        {m._count?.prescriptions || 0}x
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Quick Restock Button */}
                        <button
                          onClick={() => {
                            setRestockMedicine(m);
                            setRestockAmount(10);
                            setRestockType("add");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-bold text-[#1B3C53] hover:bg-teal-100 transition"
                          title="Restock atau Sesuaikan Stok"
                        >
                          <PackagePlus size={13} /> Restock
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => {
                            setEditingMedicine(m);
                            setFormData({
                              name: m.name,
                              dosage: m.dosage,
                              price: String(m.price),
                              stock: String(m.stock),
                            });
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                          title="Edit Informasi Obat"
                        >
                          <Edit2 size={13} /> Edit
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(m)}
                          className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 transition"
                          title="Hapus Obat"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && filteredRows.length === 0 && (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Pill size={36} className="mx-auto text-slate-300" />
            <p className="font-bold text-slate-600 text-base">
              Tidak Ada Obat Ditemukan
            </p>
            <p className="text-xs">
              Silakan sesuaikan kata kunci pencarian atau filter status stok.
            </p>
          </div>
        )}

        {/* Footer Summary */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-500 font-semibold">
          <span>Menampilkan {filteredRows.length} dari total {rows.length} jenis obat</span>
          <span className="font-bold text-[#1B3C53]">
            Total Valuasi Aset Terdaftar:{" "}
            <span className="text-[#1B3C53] font-black">
              Rp {totalValuation.toLocaleString("id-ID")}
            </span>
          </span>
        </div>
      </div>

      {/* MODAL: TAMBAH OBAT BARU */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="ad-card w-full max-w-lg p-6 bg-white space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#1B3C53] text-lg">
                  Tambah Obat Baru ke Inventaris
                </h3>
                <p className="text-xs text-slate-500">
                  Masukkan identitas obat, dosis resmi, harga satuan, dan stok awal.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Obat <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Contoh: Paracetamol, Amoxicillin, Antasida"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="ad-input"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Bentuk Sediaan & Dosis <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Contoh: 500 mg Tablet, Sirup 60 ml, Salep 10 g"
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  className="ad-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Harga Jual Satuan (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    placeholder="Contoh: 15000"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="ad-input font-bold text-[#1B3C53]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Stok Awal Fisik <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    placeholder="Contoh: 100"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="ad-input font-bold text-[#1B3C53]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="ad-btn border border-[#dfe3ea] bg-white text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="ad-btn ad-btn-primary"
                >
                  <Plus size={16} /> Simpan Obat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT OBAT */}
      {editingMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="ad-card w-full max-w-lg p-6 bg-white space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#1B3C53] text-lg">
                  Edit Informasi Obat
                </h3>
                <p className="text-xs text-slate-500">
                  Perbarui nama, dosis, harga atau jumlah stok obat #{editingMedicine.id}.
                </p>
              </div>
              <button
                onClick={() => setEditingMedicine(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Obat
                </label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="ad-input"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Bentuk Sediaan & Dosis
                </label>
                <input
                  required
                  type="text"
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  className="ad-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Harga Jual Satuan (Rp)
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="ad-input font-bold text-[#1B3C53]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Stok Fisik
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="ad-input font-bold text-[#1B3C53]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMedicine(null)}
                  className="ad-btn border border-[#dfe3ea] bg-white text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="ad-btn ad-btn-primary"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUICK RESTOCK / SESUAIKAN STOK */}
      {restockMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="ad-card w-full max-w-md p-6 bg-white space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#1B3C53] text-lg">
                  Sesuaikan Stok Obat
                </h3>
                <p className="text-xs text-slate-500">
                  {restockMedicine.name} ({restockMedicine.dosage})
                </p>
              </div>
              <button
                onClick={() => setRestockMedicine(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Sisa Stok Saat Ini:</span>
                <span className="text-xl font-black text-[#1B3C53]">
                  {restockMedicine.stock} unit
                </span>
              </div>

              {/* Restock type */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Jenis Penyesuaian
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRestockType("add")}
                    className={`rounded-xl py-2 font-bold text-xs transition border ${
                      restockType === "add"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    + Tambah Stok Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestockType("subtract")}
                    className={`rounded-xl py-2 font-bold text-xs transition border ${
                      restockType === "subtract"
                        ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    - Catat Pengurangan
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Jumlah Penyesuaian (Unit)
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(Math.max(1, parseInt(e.target.value) || 0))}
                  className="ad-input font-bold text-lg text-[#1B3C53]"
                />
              </div>

              {/* Preview */}
              <div className="rounded-xl bg-teal-50/60 p-3 border border-teal-100 flex items-center justify-between">
                <span className="font-semibold text-teal-900">Perkiraan Stok Akhir:</span>
                <span className="font-black text-teal-800 text-base">
                  {restockType === "add"
                    ? restockMedicine.stock + restockAmount
                    : Math.max(0, restockMedicine.stock - restockAmount)}{" "}
                  unit
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRestockMedicine(null)}
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

      {/* MODAL: CETAK LAPORAN INVENTARIS */}
      {showPrintReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="ad-card w-full max-w-2xl p-6 bg-white space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#1B3C53] text-lg">
                  Laporan Resmi Stok Inventaris Obat
                </h3>
                <p className="text-xs text-slate-500">
                  Ringkasan resmi untuk audit dan pembukuan apotek.
                </p>
              </div>
              <button
                onClick={() => setShowPrintReport(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Printable Report View */}
            <div className="rounded-2xl border-2 border-dashed border-slate-300 p-6 bg-amber-50/20 space-y-4">
              <div className="border-b border-slate-200 pb-3 text-center">
                <h4 className="font-black text-lg text-[#1B3C53] uppercase tracking-wider">
                  LAPORAN INVENTARIS FARMASI ASSISTDOC
                </h4>
                <p className="text-xs text-slate-500">
                  Dicetak pada:{" "}
                  {new Date().toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs border-b border-slate-200 pb-3">
                <div>
                  <span className="text-slate-400 block text-[10px]">Total SKU Obat:</span>
                  <span className="font-bold text-[#1B3C53]">{totalSKUs} Jenis</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Fisik Unit:</span>
                  <span className="font-bold text-[#1B3C53]">{totalStockUnits} Unit</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Valuasi Aset:</span>
                  <span className="font-bold text-[#1B3C53]">
                    Rp {totalValuation.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-2">No.</th>
                    <th className="py-2">Nama Obat</th>
                    <th className="py-2">Dosis</th>
                    <th className="py-2">Harga Satuan</th>
                    <th className="py-2">Stok</th>
                    <th className="py-2 text-right">Subtotal Aset</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((m, i) => (
                    <tr key={m.id}>
                      <td className="py-1.5">{i + 1}</td>
                      <td className="py-1.5 font-bold text-[#1B3C53]">{m.name}</td>
                      <td className="py-1.5">{m.dosage}</td>
                      <td className="py-1.5">Rp {Number(m.price).toLocaleString("id-ID")}</td>
                      <td className="py-1.5 font-bold">{m.stock}</td>
                      <td className="py-1.5 text-right font-bold">
                        Rp {(Number(m.price) * m.stock).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-6 border-t border-slate-200">
                <div>
                  <p>Petugas Inventaris Farmasi</p>
                  <p className="mt-8 font-bold text-[#1B3C53]">( ................................ )</p>
                </div>
                <div className="text-right">
                  <p>Penanggung Jawab Apotek</p>
                  <p className="mt-8 font-bold text-[#1B3C53]">( Apt. Farmasis AssistDoc )</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPrintReport(false)}
                className="ad-btn border border-[#dfe3ea] bg-white text-slate-700"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="ad-btn ad-btn-primary"
              >
                <Printer size={16} /> Cetak Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
