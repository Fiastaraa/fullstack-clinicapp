import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Clock3,
  Stethoscope,
  HeartPulse,
  ClipboardList,
  Pill,
  Receipt,
  BarChart3,
  CalendarDays,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Package,
  UserRound,
  Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types/auth";

type NavItem = { label: string; path: string; icon: LucideIcon };
type RoleConfig = { label: string; short: string; items: NavItem[] };

const createItems = (
  items: readonly (readonly [string, string, LucideIcon])[],
): NavItem[] => items.map(([label, path, icon]) => ({ label, path, icon }));

const configs: Record<UserRole, RoleConfig> = {
  ADMIN: {
    label: "Administrator",
    short: "Admin",
    items: createItems([
      ["Dashboard", "/dashboard/admin", LayoutDashboard],
      ["Data Pasien", "/dashboard/admin/patients", Users],
      ["Check-in Antrean Poli", "/dashboard/admin/registration", UserPlus],
      ["Antrean Digital", "/dashboard/admin/queue", Clock3],
      ["Jadwal Kontrol", "/dashboard/admin/schedules", CalendarDays],
      ["Invoice & Pembayaran", "/dashboard/admin/invoices", Receipt],
      ["Laporan & Analitik", "/dashboard/admin/reports", BarChart3],
      ["Kelola User", "/dashboard/admin/users", UserRound],
      ["Pengaturan", "/dashboard/admin/settings", Settings],
    ]),
  },
  DOCTOR: {
    label: "Doctor",
    short: "Doctor",
    items: createItems([
      ["Dashboard", "/dashboard/doctor", LayoutDashboard],
      ["Patient Queue", "/dashboard/doctor/queue", Clock3],
      ["Patient Info", "/dashboard/doctor/patients", Users],
      ["Consultation", "/dashboard/doctor/consultation", Stethoscope],
      ["Prescriptions", "/dashboard/doctor/prescriptions", Pill],
      ["Medical Notes", "/dashboard/doctor/notes", FileText],
      ["Schedule", "/dashboard/doctor/schedule", CalendarDays],
    ]),
  },
  NURSE: {
    label: "Nurse",
    short: "Nurse",
    items: createItems([
      ["Dashboard", "/dashboard/nurse", LayoutDashboard],
      ["Patient Queue", "/dashboard/nurse/queue", Clock3],
      ["Patient Search", "/dashboard/nurse/search", Search],
      ["Patient Info & Vitals", "/dashboard/nurse/patient", Users],
      ["Initial Assessment", "/dashboard/nurse/assessment", ClipboardList],
      ["Record Vitals", "/dashboard/nurse/vitals", HeartPulse],
      ["Notes & Tasks", "/dashboard/nurse/notes", FileText],
      ["Schedule", "/dashboard/nurse/schedule", CalendarDays],
    ]),
  },
  PHARMACIST: {
    label: "Pharmacist",
    short: "Pharmacist",
    items: createItems([
      ["Dashboard", "/dashboard/pharmacist", LayoutDashboard],
      ["Prescription Queue", "/dashboard/pharmacist/queue", Clock3],
      ["Medicine Inventory", "/dashboard/pharmacist/inventory", Package],
      ["Prescription Detail", "/dashboard/pharmacist/prescriptions", Pill],
      ["Stock Management", "/dashboard/pharmacist/stock", Package],
      ["Notifications", "/dashboard/pharmacist/notifications", Bell],
      ["Reports & Analytics", "/dashboard/pharmacist/reports", BarChart3],
      ["Schedule", "/dashboard/pharmacist/schedule", CalendarDays],
    ]),
  },
};

export default function RoleLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const cfg = configs[user.role];

  return (
    <div className="ad-shell">
      {open && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col bg-[#1B3C53] text-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-[72px] items-center gap-3 border-b border-white/10 px-5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#DCD7C9] text-base font-black text-[#1B3C53]">
            +
          </div>
          <div>
            <p className="text-base font-extrabold tracking-tight">AssistDoc</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#DCD7C9]">
              {cfg.short} Workspace
            </p>
          </div>
          <button className="ml-auto text-slate-300 hover:text-white lg:hidden" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="px-3 py-4">
          <p className="px-3 pb-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Menu Utama
          </p>
          <nav className="space-y-1">
            {cfg.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === `/dashboard/${user.role.toLowerCase()}`}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition ${
                      isActive
                        ? "bg-white text-[#1B3C53] shadow-xs"
                        : "text-slate-200 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-white/5 p-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#DCD7C9] font-bold text-xs text-[#1B3C53]">
              {user.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">{user.name}</p>
              <p className="truncate text-[10px] text-slate-400">
                {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-rose-300 transition"
          >
            <LogOut size={15} />
            Keluar (Logout)
          </button>
        </div>
      </aside>

      <div className="lg:pl-[250px]">
        <header className="sticky top-0 z-20 flex h-[64px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs md:px-7">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Buka Menu"
            >
              <Menu size={20} />
            </button>
            <div className="hidden items-center gap-2 text-xs font-semibold text-slate-500 sm:flex">
              <span className="font-bold text-[#1B3C53]">AssistDoc</span>
              <span className="text-slate-300">/</span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                {cfg.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-[#1B3C53]">{user.name}</p>
              <p className="text-[10px] font-medium text-slate-500">
                {cfg.label}
              </p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#DCD7C9] font-bold text-xs text-[#1B3C53] border border-slate-200">
              {user.name[0]?.toUpperCase()}
            </div>
          </div>
        </header>
        <main className="min-h-[calc(100vh-64px)] p-4 md:p-6 xl:p-8 bg-[#F8F9FA]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
