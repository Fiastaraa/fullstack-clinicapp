import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import { clinic, unwrap } from "../../services/clinicService";
import {
  Filter,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  Download,
  RefreshCw,
  User,
  Shield,
  Stethoscope,
  HeartPulse,
  Pill,
  Check,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";

type UserItem = {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "DOCTOR" | "NURSE" | "PHARMACIST" | "PATIENT";
  createdAt: string;
  patient?: {
    id: number;
    nik?: string | null;
    phone?: string | null;
    gender?: string | null;
    age?: number | null;
  } | null;
  doctor?: {
    id: number;
    specialization?: string | null;
    poli?: {
      id: number;
      name: string;
    } | null;
  } | null;
};

type SortConfig = {
  column: "name" | "role" | "email" | "createdAt" | null;
  direction: "asc" | "desc";
};

const ROLE_CONFIG: Record<
  string,
  { label: string; tone: "indigo" | "emerald" | "amber" | "cyan" | "violet" | "rose"; icon: any }
> = {
  ADMIN: { label: "Administrator", tone: "violet", icon: Shield },
  DOCTOR: { label: "Dokter", tone: "indigo", icon: Stethoscope },
  NURSE: { label: "Perawat", tone: "emerald", icon: HeartPulse },
  PHARMACIST: { label: "Apoteker / Farmasi", tone: "amber", icon: Pill },
  PATIENT: { label: "Pasien", tone: "cyan", icon: User },
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Global search input
  const [globalSearch, setGlobalSearch] = useState("");

  // Quick preset tab: ALL, DOCTOR, PATIENT, STAFF (NURSE/PHARMACIST), ADMIN
  const [quickRoleTab, setQuickRoleTab] = useState<string>("ALL");

  // Excel Column Filters State: columnKey -> Set of selected values
  const [activeColumnFilters, setActiveColumnFilters] = useState<{
    name: Set<string>;
    role: Set<string>;
    email: Set<string>;
    createdAt: Set<string>;
  }>({
    name: new Set(),
    role: new Set(),
    email: new Set(),
    createdAt: new Set(),
  });

  // Open dropdown column key
  const [openFilterCol, setOpenFilterCol] = useState<"name" | "role" | "email" | "createdAt" | null>(null);

  // Search query inside the Excel filter popover
  const [popoverSearch, setPopoverSearch] = useState("");

  // Temporary selection inside the open popover before pressing "Terapkan"
  const [popoverSelection, setPopoverSelection] = useState<Set<string>>(new Set());

  // Sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: "createdAt",
    direction: "desc",
  });

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Popover container ref for click-outside
  const popoverRef = useRef<HTMLDivElement>(null);

  // Load users data
  async function loadData() {
    try {
      setLoading(true);
      const res = await clinic.users();
      setUsers(unwrap(res) || []);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Handle click outside to close popover
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenFilterCol(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Extract unique values for a column (with counts)
  function getUniqueValuesForColumn(col: "name" | "role" | "email" | "createdAt") {
    const valueCountMap = new Map<string, number>();
    users.forEach((u) => {
      let val = "";
      if (col === "createdAt") {
        const d = new Date(u.createdAt);
        val = isNaN(d.getTime())
          ? u.createdAt
          : d.toLocaleDateString("id-ID", { year: "numeric", month: "long" });
      } else {
        val = String(u[col] || "");
      }
      if (val) {
        valueCountMap.set(val, (valueCountMap.get(val) || 0) + 1);
      }
    });

    return Array.from(valueCountMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }

  // Open the Excel filter popover for a specific column
  function handleOpenFilter(col: "name" | "role" | "email" | "createdAt") {
    if (openFilterCol === col) {
      setOpenFilterCol(null);
      return;
    }
    setOpenFilterCol(col);
    setPopoverSearch("");

    // Initialize temporary selection: if filter already active, use it; else select all available
    const existing = activeColumnFilters[col];
    if (existing.size > 0) {
      setPopoverSelection(new Set(existing));
    } else {
      const allVals = getUniqueValuesForColumn(col).map(([val]) => val);
      setPopoverSelection(new Set(allVals));
    }
  }

  // Apply filter from popover
  function applyPopoverFilter() {
    if (!openFilterCol) return;
    const allVals = getUniqueValuesForColumn(openFilterCol).map(([val]) => val);

    // If all items are selected or none are deselected, clear filter
    if (popoverSelection.size === allVals.length) {
      setActiveColumnFilters((prev) => ({
        ...prev,
        [openFilterCol]: new Set(),
      }));
    } else {
      setActiveColumnFilters((prev) => ({
        ...prev,
        [openFilterCol]: new Set(popoverSelection),
      }));
    }
    setOpenFilterCol(null);
    setCurrentPage(1);
  }

  // Clear filter for specific column
  function clearColumnFilter(col: "name" | "role" | "email" | "createdAt") {
    setActiveColumnFilters((prev) => ({
      ...prev,
      [col]: new Set(),
    }));
    if (openFilterCol === col) {
      setOpenFilterCol(null);
    }
    setCurrentPage(1);
  }

  // Clear all filters
  function clearAllFilters() {
    setActiveColumnFilters({
      name: new Set(),
      role: new Set(),
      email: new Set(),
      createdAt: new Set(),
    });
    setGlobalSearch("");
    setQuickRoleTab("ALL");
    setSortConfig({ column: "createdAt", direction: "desc" });
    setCurrentPage(1);
  }

  // Toggle sort from column header or popover
  function handleSort(column: "name" | "role" | "email" | "createdAt", direction?: "asc" | "desc") {
    setSortConfig((prev) => {
      if (direction) {
        return { column, direction };
      }
      if (prev.column === column) {
        return { column, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { column, direction: "asc" };
    });
  }

  // Filtered and Sorted Users
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        // 1. Quick Role Tab
        if (quickRoleTab !== "ALL") {
          if (quickRoleTab === "STAFF") {
            if (u.role !== "NURSE" && u.role !== "PHARMACIST") return false;
          } else if (u.role !== quickRoleTab) {
            return false;
          }
        }

        // 2. Global Search
        if (globalSearch.trim()) {
          const q = globalSearch.toLowerCase();
          const matchName = u.name?.toLowerCase().includes(q);
          const matchEmail = u.email?.toLowerCase().includes(q);
          const matchRole = u.role?.toLowerCase().includes(q);
          const matchSpecialization = u.doctor?.specialization?.toLowerCase().includes(q);
          const matchPoli = u.doctor?.poli?.name?.toLowerCase().includes(q);
          const matchNik = u.patient?.nik?.toLowerCase().includes(q);
          if (!matchName && !matchEmail && !matchRole && !matchSpecialization && !matchPoli && !matchNik) {
            return false;
          }
        }

        // 3. Column: Name
        if (activeColumnFilters.name.size > 0) {
          if (!activeColumnFilters.name.has(u.name)) return false;
        }

        // 4. Column: Role
        if (activeColumnFilters.role.size > 0) {
          if (!activeColumnFilters.role.has(u.role)) return false;
        }

        // 5. Column: Email
        if (activeColumnFilters.email.size > 0) {
          if (!activeColumnFilters.email.has(u.email)) return false;
        }

        // 6. Column: CreatedAt (Grouped by Month/Year)
        if (activeColumnFilters.createdAt.size > 0) {
          const d = new Date(u.createdAt);
          const monthYear = isNaN(d.getTime())
            ? u.createdAt
            : d.toLocaleDateString("id-ID", { year: "numeric", month: "long" });
          if (!activeColumnFilters.createdAt.has(monthYear)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (!sortConfig.column) return 0;
        const col = sortConfig.column;
        let valA: any = a[col];
        let valB: any = b[col];

        if (col === "createdAt") {
          valA = new Date(valA).getTime() || 0;
          valB = new Date(valB).getTime() || 0;
        } else {
          valA = String(valA || "").toLowerCase();
          valB = String(valB || "").toLowerCase();
        }

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
  }, [users, quickRoleTab, globalSearch, activeColumnFilters, sortConfig]);

  // Pagination slice
  const paginatedUsers = useMemo(() => {
    if (pageSize >= filteredUsers.length) return filteredUsers;
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;

  // Active filters count
  const hasActiveFilters = useMemo(() => {
    return (
      globalSearch.trim().length > 0 ||
      quickRoleTab !== "ALL" ||
      activeColumnFilters.name.size > 0 ||
      activeColumnFilters.role.size > 0 ||
      activeColumnFilters.email.size > 0 ||
      activeColumnFilters.createdAt.size > 0
    );
  }, [globalSearch, quickRoleTab, activeColumnFilters]);

  // Export filtered data to CSV
  function exportToCSV() {
    const headers = ["ID", "Nama", "Role", "Email", "Poli / Info Medis", "Tanggal Terdaftar"];
    const rows = filteredUsers.map((u) => {
      let extra = "";
      if (u.role === "DOCTOR") {
        extra = `${u.doctor?.poli?.name || "-"} (${u.doctor?.specialization || "-"})`;
      } else if (u.role === "PATIENT") {
        extra = `NIK: ${u.patient?.nik || "-"} | Telp: ${u.patient?.phone || "-"}`;
      } else {
        extra = "-";
      }

      return [
        u.id,
        `"${(u.name || "").replace(/"/g, '""')}"`,
        u.role,
        `"${u.email}"`,
        `"${extra}"`,
        `"${new Date(u.createdAt).toLocaleDateString("id-ID")}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `assistdoc_users_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Count per role for the tabs
  const roleCounts = useMemo(() => {
    const counts = { ALL: users.length, DOCTOR: 0, PATIENT: 0, STAFF: 0, ADMIN: 0 };
    users.forEach((u) => {
      if (u.role === "DOCTOR") counts.DOCTOR++;
      else if (u.role === "PATIENT") counts.PATIENT++;
      else if (u.role === "ADMIN") counts.ADMIN++;
      else if (u.role === "NURSE" || u.role === "PHARMACIST") counts.STAFF++;
    });
    return counts;
  }, [users]);

  return (
    <>
      <PageHeader
        title="Kelola Akun & Hak Akses Pengguna"
        subtitle="Manajemen akun klinik dengan sistem filter interaktif mirip lembar kerja spreadsheet (Excel-Style Table)."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 shadow-xs transition"
              title="Unduh data tabel yang sedang difilter ke format Excel / CSV"
            >
              <Download size={14} /> Ekspor Excel / CSV
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        }
      />

      {/* QUICK ROLE TABS (SEPERTI TAB SHEET EXCEL) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: "ALL", label: "Semua Akun", count: roleCounts.ALL, icon: SlidersHorizontal },
            { key: "DOCTOR", label: "Dokter", count: roleCounts.DOCTOR, icon: Stethoscope },
            { key: "PATIENT", label: "Pasien", count: roleCounts.PATIENT, icon: User },
            { key: "STAFF", label: "Staf (Perawat & Apotek)", count: roleCounts.STAFF, icon: HeartPulse },
            { key: "ADMIN", label: "Administrator", count: roleCounts.ADMIN, icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = quickRoleTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setQuickRoleTab(tab.key);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  isActive
                    ? "bg-[#111a3a] text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Icon size={14} className={isActive ? "text-cyan-400" : "text-slate-400"} />
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Global Search & Reset */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              value={globalSearch}
              onChange={(e) => {
                setGlobalSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama, email, NIK, poli..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none shadow-xs"
            />
            {globalSearch && (
              <button
                onClick={() => setGlobalSearch("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition shrink-0"
              title="Bersihkan semua filter pencarian dan kolom"
            >
              <RotateCcw size={13} /> Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* ACTIVE FILTERS CHIP BAR */}
      {hasActiveFilters && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-indigo-50/60 p-2.5 text-xs border border-indigo-100">
          <span className="font-bold text-indigo-900 flex items-center gap-1 text-[11px]">
            <Filter size={12} className="text-indigo-600" /> Filter Aktif:
          </span>

          {quickRoleTab !== "ALL" && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-indigo-200 px-2 py-0.5 text-[11px] font-bold text-indigo-800 shadow-2xs">
              Kategori: {quickRoleTab}
              <button onClick={() => setQuickRoleTab("ALL")} className="hover:text-red-500">
                <X size={12} />
              </button>
            </span>
          )}

          {globalSearch && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-indigo-200 px-2 py-0.5 text-[11px] font-bold text-indigo-800 shadow-2xs">
              Pencarian: "{globalSearch}"
              <button onClick={() => setGlobalSearch("")} className="hover:text-red-500">
                <X size={12} />
              </button>
            </span>
          )}

          {activeColumnFilters.name.size > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-indigo-200 px-2 py-0.5 text-[11px] font-bold text-indigo-800 shadow-2xs">
              Nama ({activeColumnFilters.name.size} terpilih)
              <button onClick={() => clearColumnFilter("name")} className="hover:text-red-500">
                <X size={12} />
              </button>
            </span>
          )}

          {activeColumnFilters.role.size > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-indigo-200 px-2 py-0.5 text-[11px] font-bold text-indigo-800 shadow-2xs">
              Role: {Array.from(activeColumnFilters.role).join(", ")}
              <button onClick={() => clearColumnFilter("role")} className="hover:text-red-500">
                <X size={12} />
              </button>
            </span>
          )}

          {activeColumnFilters.email.size > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-indigo-200 px-2 py-0.5 text-[11px] font-bold text-indigo-800 shadow-2xs">
              Email ({activeColumnFilters.email.size} terpilih)
              <button onClick={() => clearColumnFilter("email")} className="hover:text-red-500">
                <X size={12} />
              </button>
            </span>
          )}

          {activeColumnFilters.createdAt.size > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-indigo-200 px-2 py-0.5 text-[11px] font-bold text-indigo-800 shadow-2xs">
              Bulan: {Array.from(activeColumnFilters.createdAt).join(", ")}
              <button onClick={() => clearColumnFilter("createdAt")} className="hover:text-red-500">
                <X size={12} />
              </button>
            </span>
          )}

          <button
            onClick={clearAllFilters}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-900 underline ml-auto"
          >
            Hapus Semua
          </button>
        </div>
      )}

      {/* EXCEL-STYLE SPREADSHEET TABLE CONTAINER */}
      <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-xs border-collapse">
            {/* EXCEL HEADER */}
            <thead className="bg-[#111a3a] text-white select-none sticky top-0 z-10">
              <tr>
                {/* No. Kolom Excel */}
                <th className="w-12 px-3 py-3.5 text-center text-slate-400 font-mono text-[11px] border-r border-slate-800">
                  #
                </th>

                {/* KOLOM NAMA */}
                <th
                  className={`px-4 py-3.5 border-r border-slate-800 font-bold transition ${
                    activeColumnFilters.name.size > 0 ? "bg-indigo-900/80" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      onClick={() => handleSort("name")}
                      className="cursor-pointer hover:text-cyan-300 flex items-center gap-1.5"
                    >
                      Nama Lengkap
                      {sortConfig.column === "name" && (
                        sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-cyan-400" /> : <ArrowDown size={13} className="text-cyan-400" />
                      )}
                    </span>

                    {/* Filter Funnel Trigger */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenFilter("name");
                      }}
                      className={`flex h-6 w-6 items-center justify-center rounded-md transition ${
                        activeColumnFilters.name.size > 0
                          ? "bg-cyan-400 text-[#111a3a] font-black"
                          : "text-slate-400 hover:bg-white/10 hover:text-white"
                      }`}
                      title="Filter kolom Nama (seperti Excel)"
                    >
                      <Filter size={12} />
                    </button>
                  </div>
                </th>

                {/* KOLOM ROLE */}
                <th
                  className={`w-44 px-4 py-3.5 border-r border-slate-800 font-bold transition ${
                    activeColumnFilters.role.size > 0 ? "bg-indigo-900/80" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      onClick={() => handleSort("role")}
                      className="cursor-pointer hover:text-cyan-300 flex items-center gap-1.5"
                    >
                      Role Akses
                      {sortConfig.column === "role" && (
                        sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-cyan-400" /> : <ArrowDown size={13} className="text-cyan-400" />
                      )}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenFilter("role");
                      }}
                      className={`flex h-6 w-6 items-center justify-center rounded-md transition ${
                        activeColumnFilters.role.size > 0
                          ? "bg-cyan-400 text-[#111a3a] font-black"
                          : "text-slate-400 hover:bg-white/10 hover:text-white"
                      }`}
                      title="Filter kolom Role (seperti Excel)"
                    >
                      <Filter size={12} />
                    </button>
                  </div>
                </th>

                {/* KOLOM EMAIL */}
                <th
                  className={`px-4 py-3.5 border-r border-slate-800 font-bold transition ${
                    activeColumnFilters.email.size > 0 ? "bg-indigo-900/80" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      onClick={() => handleSort("email")}
                      className="cursor-pointer hover:text-cyan-300 flex items-center gap-1.5"
                    >
                      Email Autentikasi
                      {sortConfig.column === "email" && (
                        sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-cyan-400" /> : <ArrowDown size={13} className="text-cyan-400" />
                      )}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenFilter("email");
                      }}
                      className={`flex h-6 w-6 items-center justify-center rounded-md transition ${
                        activeColumnFilters.email.size > 0
                          ? "bg-cyan-400 text-[#111a3a] font-black"
                          : "text-slate-400 hover:bg-white/10 hover:text-white"
                      }`}
                      title="Filter kolom Email (seperti Excel)"
                    >
                      <Filter size={12} />
                    </button>
                  </div>
                </th>

                {/* KOLOM DETAIL ENTITAS / INFORMASI TERKAIT */}
                <th className="px-4 py-3.5 border-r border-slate-800 font-bold">
                  Detail Profil Terhubung (Poli / NIK / Spesialis)
                </th>

                {/* KOLOM TANGGAL PEMBUATAN */}
                <th
                  className={`w-44 px-4 py-3.5 font-bold transition ${
                    activeColumnFilters.createdAt.size > 0 ? "bg-indigo-900/80" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      onClick={() => handleSort("createdAt")}
                      className="cursor-pointer hover:text-cyan-300 flex items-center gap-1.5"
                    >
                      Tanggal Daftar
                      {sortConfig.column === "createdAt" && (
                        sortConfig.direction === "asc" ? <ArrowUp size={13} className="text-cyan-400" /> : <ArrowDown size={13} className="text-cyan-400" />
                      )}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenFilter("createdAt");
                      }}
                      className={`flex h-6 w-6 items-center justify-center rounded-md transition ${
                        activeColumnFilters.createdAt.size > 0
                          ? "bg-cyan-400 text-[#111a3a] font-black"
                          : "text-slate-400 hover:bg-white/10 hover:text-white"
                      }`}
                      title="Filter tanggal pembuatan"
                    >
                      <Filter size={12} />
                    </button>
                  </div>
                </th>
              </tr>
            </thead>

            {/* EXCEL BODY */}
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-indigo-600" />
                    Memuat data pengguna klinik...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mx-auto mb-2">
                      <Filter size={20} />
                    </div>
                    <p className="font-bold text-sm text-slate-700">Tidak ada user yang cocok dengan filter saat ini</p>
                    <p className="text-xs mt-1 text-slate-400">
                      Coba ubah kriteria filter kolom atau klik tombol "Reset Filter" di atas.
                    </p>
                    <button
                      onClick={clearAllFilters}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 transition"
                    >
                      <RotateCcw size={12} /> Reset Semua Filter
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u, idx) => {
                  const roleMeta = ROLE_CONFIG[u.role] || { label: u.role, tone: "slate", icon: User };
                  const RoleIcon = roleMeta.icon;
                  const rowNum = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-indigo-50/40 transition duration-75 group border-b border-slate-100"
                    >
                      {/* No Baris */}
                      <td className="px-3 py-3 text-center text-slate-400 font-mono text-[11px] border-r border-slate-100 bg-slate-50/50 group-hover:bg-indigo-50/60">
                        {rowNum}
                      </td>

                      {/* Nama */}
                      <td className="px-4 py-3 font-bold text-[#101a3d] border-r border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 font-black text-xs shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition">
                            {u.name ? u.name.charAt(0).toUpperCase() : "?"}
                          </div>
                          <span>{u.name}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3 border-r border-slate-100">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                            u.role === "ADMIN"
                              ? "bg-purple-100 text-purple-900 border border-purple-200"
                              : u.role === "DOCTOR"
                              ? "bg-indigo-100 text-indigo-900 border border-indigo-200"
                              : u.role === "NURSE"
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                              : u.role === "PHARMACIST"
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : "bg-cyan-100 text-cyan-900 border border-cyan-200"
                          }`}
                        >
                          <RoleIcon size={12} />
                          {u.role}
                        </span>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 font-mono text-slate-600 border-r border-slate-100">
                        {u.email}
                      </td>

                      {/* Detail Profil Terhubung */}
                      <td className="px-4 py-3 text-slate-600 border-r border-slate-100">
                        {u.role === "DOCTOR" ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-[#101a3d] block">
                              {u.doctor?.poli?.name || "Poli Belum Ditugaskan"}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              {u.doctor?.specialization || "Spesialisasi Umum"}
                            </span>
                          </div>
                        ) : u.role === "PATIENT" ? (
                          <div className="space-y-0.5 text-[11px]">
                            <span className="font-medium text-slate-700 block">
                              NIK: <span className="font-mono">{u.patient?.nik || "-"}</span>
                            </span>
                            <span className="text-slate-400 block">
                              {u.patient?.gender || "-"} · {u.patient?.phone || "Tanpa No. HP"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Staf Medis / Administrator</span>
                        )}
                      </td>

                      {/* Tanggal Daftar */}
                      <td className="px-4 py-3 text-slate-500 font-medium">
                        {new Date(u.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* FLOATING EXCEL FILTER POPOVER MODAL */}
        {openFilterCol && (
          <div
            ref={popoverRef}
            className="absolute top-12 z-30 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
            style={{
              left:
                openFilterCol === "name"
                  ? "60px"
                  : openFilterCol === "role"
                  ? "250px"
                  : openFilterCol === "email"
                  ? "420px"
                  : "auto",
              right: openFilterCol === "createdAt" ? "20px" : "auto",
            }}
          >
            {/* Header Popover */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <span className="font-bold text-xs text-[#101a3d] flex items-center gap-1.5">
                <Filter size={13} className="text-indigo-600" />
                Filter Kolom: <span className="capitalize">{openFilterCol}</span>
              </span>
              <button
                onClick={() => setOpenFilterCol(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={14} />
              </button>
            </div>

            {/* Quick Sort Options (Excel Sort) */}
            <div className="space-y-1 mb-3 pb-3 border-b border-slate-100 text-xs">
              <button
                onClick={() => handleSort(openFilterCol, "asc")}
                className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition text-left ${
                  sortConfig.column === openFilterCol && sortConfig.direction === "asc"
                    ? "bg-indigo-50 font-bold text-indigo-800"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <ArrowUp size={13} className="text-indigo-600" />
                <span>Urutkan {openFilterCol === "createdAt" ? "Terlama ke Terbaru" : "A ke Z (Menaik)"}</span>
              </button>

              <button
                onClick={() => handleSort(openFilterCol, "desc")}
                className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition text-left ${
                  sortConfig.column === openFilterCol && sortConfig.direction === "desc"
                    ? "bg-indigo-50 font-bold text-indigo-800"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <ArrowDown size={13} className="text-indigo-600" />
                <span>Urutkan {openFilterCol === "createdAt" ? "Terbaru ke Terlama" : "Z ke A (Menurun)"}</span>
              </button>
            </div>

            {/* Mini Search Inside Values */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2 text-slate-400" size={12} />
              <input
                value={popoverSearch}
                onChange={(e) => setPopoverSearch(e.target.value)}
                placeholder="Cari nilai item..."
                className="w-full rounded-lg border border-slate-200 pl-7 pr-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Checkbox List of Values (Excel Unique Values List) */}
            {(() => {
              const uniqueValues = getUniqueValuesForColumn(openFilterCol);
              const filteredList = uniqueValues.filter(([val]) =>
                val.toLowerCase().includes(popoverSearch.toLowerCase())
              );
              const allFilteredSelected =
                filteredList.length > 0 && filteredList.every(([val]) => popoverSelection.has(val));

              return (
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1 py-1 text-xs">
                  {/* Select All Checkbox */}
                  <label className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-slate-50 cursor-pointer select-none font-bold text-[#101a3d] border-b border-slate-100 pb-1.5 mb-1">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={(e) => {
                        const next = new Set(popoverSelection);
                        if (e.target.checked) {
                          filteredList.forEach(([val]) => next.add(val));
                        } else {
                          filteredList.forEach(([val]) => next.delete(val));
                        }
                        setPopoverSelection(next);
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>(Pilih Semua / Select All)</span>
                  </label>

                  {/* Item Checkboxes */}
                  {filteredList.map(([val, count]) => {
                    const isChecked = popoverSelection.has(val);
                    return (
                      <label
                        key={val}
                        className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-slate-50 cursor-pointer select-none text-slate-700"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const next = new Set(popoverSelection);
                              if (e.target.checked) next.add(val);
                              else next.delete(val);
                              setPopoverSelection(next);
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="truncate">{val}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">({count})</span>
                      </label>
                    );
                  })}

                  {filteredList.length === 0 && (
                    <div className="py-4 text-center text-slate-400 text-xs">
                      Tidak ada nilai yang cocok
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Action Buttons: Apply / Clear */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => clearColumnFilter(openFilterCol)}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1"
              >
                Reset Kolom Ini
              </button>

              <button
                type="button"
                onClick={applyPopoverFilter}
                className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 transition"
              >
                <Check size={13} /> Terapkan Filter
              </button>
            </div>
          </div>
        )}

        {/* EXCEL STATUS BAR / FOOTER */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-600">
          <div className="flex items-center gap-4">
            <span>
              Menampilkan <strong className="text-[#101a3d]">{paginatedUsers.length}</strong> dari{" "}
              <strong className="text-[#101a3d]">{filteredUsers.length}</strong> user
              {filteredUsers.length !== users.length && (
                <span className="text-slate-400 ml-1">(difilter dari total {users.length} akun)</span>
              )}
            </span>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">Tampilkan:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={9999}>Semua</option>
              </select>
            </div>
          </div>

          {/* Pagination Buttons */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                Sebelumnya
              </button>

              <span className="px-2 font-bold text-slate-700">
                Halaman {currentPage} dari {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                Selanjutnya
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
