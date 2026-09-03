import { useState, useEffect } from "react";
import {
  Building2,
  Receipt,
  Sliders,
  ShieldCheck,
  Save,
  Download,
  CheckCircle2,
  Clock,
  CreditCard,
  Volume2,
  Lock,
  Phone,
  Mail,
  MapPin,
  FileCheck,
  Database,
  Info,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";

type ClinicProfile = {
  name: string;
  legalEntity: string;
  licenseNumber: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  openHourWeekday: string;
  closeHourWeekday: string;
  openHourWeekend: string;
  closeHourWeekend: string;
  emergencyOpen: boolean;
};

type TariffConfig = {
  consultationFee: number;
  adminFee: number;
  taxPercent: number;
  emergencyFee: number;
  enableCash: boolean;
  enableQris: boolean;
  enableTransfer: boolean;
  enableInsurance: boolean;
};

type WorkflowConfig = {
  enableAudioCall: boolean;
  audioLanguage: string;
  maxWaitTimeAlertMinutes: number;
  autoReadyPrescription: boolean;
  sendWaReminder: boolean;
  requireVitalsBeforeConsult: boolean;
};

type SecurityConfig = {
  sessionTimeoutMinutes: number;
  twoFactorAuth: boolean;
  autoBackupDaily: boolean;
  auditLogRetentionDays: number;
};

const STORAGE_KEY = "assistdoc_clinic_settings_v1";

const defaultProfile: ClinicProfile = {
  name: "Klinik Pratama AssistDoc Medical Center",
  legalEntity: "PT Medika Digital Nusantara",
  licenseNumber: "445/092/DINKES/SIP-KLINIK/2024",
  phone: "(021) 7892-1200",
  email: "operasional@assistdoc.clinic",
  address: "Jl. Kesehatan Medika Raya No. 45, Kebayoran Baru",
  city: "Jakarta Selatan",
  postalCode: "12160",
  openHourWeekday: "08:00",
  closeHourWeekday: "21:00",
  openHourWeekend: "08:00",
  closeHourWeekend: "15:00",
  emergencyOpen: true,
};

const defaultTariff: TariffConfig = {
  consultationFee: 30000,
  adminFee: 5000,
  taxPercent: 11,
  emergencyFee: 25000,
  enableCash: true,
  enableQris: true,
  enableTransfer: true,
  enableInsurance: true,
};

const defaultWorkflow: WorkflowConfig = {
  enableAudioCall: true,
  audioLanguage: "id-ID",
  maxWaitTimeAlertMinutes: 30,
  autoReadyPrescription: false,
  sendWaReminder: true,
  requireVitalsBeforeConsult: true,
};

const defaultSecurity: SecurityConfig = {
  sessionTimeoutMinutes: 60,
  twoFactorAuth: false,
  autoBackupDaily: true,
  auditLogRetentionDays: 90,
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "tariff" | "workflow" | "security">("profile");

  const [profile, setProfile] = useState<ClinicProfile>(defaultProfile);
  const [tariff, setTariff] = useState<TariffConfig>(defaultTariff);
  const [workflow, setWorkflow] = useState<WorkflowConfig>(defaultWorkflow);
  const [security, setSecurity] = useState<SecurityConfig>(defaultSecurity);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.profile) setProfile(parsed.profile);
        if (parsed.tariff) setTariff(parsed.tariff);
        if (parsed.workflow) setWorkflow(parsed.workflow);
        if (parsed.security) setSecurity(parsed.security);
      }
    } catch (err) {
      console.error("Failed to load settings from storage", err);
    }
  }, []);

  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const data = { profile, tariff, workflow, security, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      console.error("Save error", err);
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      system: "AssistDoc Clinic Management System",
      exportDate: new Date().toISOString(),
      profile,
      tariff,
      workflow,
      security,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assistdoc_config_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Pengaturan Klinik & Konfigurasi Sistem"
        subtitle="Kelola profil fasilitas kesehatan, standarisasi tarif tindakan & konsultasi, alur layanan operasional, dan parameter keamanan."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBackup}
              type="button"
              className="ad-btn border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs text-xs font-bold"
              title="Unduh file konfigurasi JSON"
            >
              <Download size={14} /> Cadangkan Konfigurasi
            </button>
            <button
              onClick={() => handleSaveAll()}
              type="button"
              className="ad-btn ad-btn-primary text-xs font-bold shadow-xs"
            >
              <Save size={14} /> Simpan Perubahan
            </button>
          </div>
        }
      />

      {/* SUCCESS BANNER */}
      {savedSuccess && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 shadow-xs transition">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>Konfigurasi klinik berhasil disimpan dan langsung diterapkan pada alur sistem operasional!</span>
          </div>
          <button
            onClick={() => setSavedSuccess(false)}
            className="text-emerald-700 hover:text-emerald-900 font-extrabold"
          >
            Tutup
          </button>
        </div>
      )}

      {/* NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition border ${
            activeTab === "profile"
              ? "bg-[#1B3C53] text-white border-[#1B3C53] shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
          }`}
        >
          <Building2 size={15} /> Profil Fasilitas & Jam Kerja
        </button>
        <button
          onClick={() => setActiveTab("tariff")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition border ${
            activeTab === "tariff"
              ? "bg-[#1B3C53] text-white border-[#1B3C53] shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
          }`}
        >
          <Receipt size={15} /> Tarif Layanan & Keuangan
        </button>
        <button
          onClick={() => setActiveTab("workflow")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition border ${
            activeTab === "workflow"
              ? "bg-[#1B3C53] text-white border-[#1B3C53] shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
          }`}
        >
          <Sliders size={15} /> Alur Pelayanan & Otomasi
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition border ${
            activeTab === "security"
              ? "bg-[#1B3C53] text-white border-[#1B3C53] shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
          }`}
        >
          <ShieldCheck size={15} /> Keamanan & Integrasi SatuSehat
        </button>
      </div>

      {/* TAB CONTENT PANELS */}
      <form onSubmit={handleSaveAll} className="mt-6 space-y-6">
        {/* ================= TAB 1: CLINIC PROFILE ================= */}
        {activeTab === "profile" && (
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            {/* Left Column: Form Fields */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-base text-[#1B3C53]">Identitas Resmi Fasilitas Kesehatan</h3>
                <p className="text-xs text-slate-500">Informasi ini dicetak pada kop resep, etiket obat, kuitansi, dan resume medis.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Nama Fasilitas / Klinik</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="ad-input font-bold text-[#1B3C53]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Badan Hukum Penyelenggara</label>
                  <input
                    type="text"
                    value={profile.legalEntity}
                    onChange={(e) => setProfile({ ...profile, legalEntity: e.target.value })}
                    className="ad-input"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. Surat Izin Operasional Klinik (SIP)</label>
                  <input
                    type="text"
                    value={profile.licenseNumber}
                    onChange={(e) => setProfile({ ...profile, licenseNumber: e.target.value })}
                    className="ad-input font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Telepon Layanan</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="ad-input pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Resmi Administrasi</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="ad-input pl-9"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Alamat Lengkap</label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={profile.address}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      className="ad-input pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kota / Kabupaten</label>
                  <input
                    type="text"
                    value={profile.city}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    className="ad-input"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kode Pos</label>
                  <input
                    type="text"
                    value={profile.postalCode}
                    onChange={(e) => setProfile({ ...profile, postalCode: e.target.value })}
                    className="ad-input font-mono"
                  />
                </div>
              </div>

              {/* Operating Hours */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="font-extrabold text-sm text-[#1B3C53] flex items-center gap-1.5">
                  <Clock size={15} className="text-[#1B3C53]" /> Jam Layanan Poliklinik Rawat Jalan
                </h4>

                <div className="grid gap-4 sm:grid-cols-2 text-xs">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                    <span className="font-bold text-slate-700 block">Hari Kerja (Senin - Jumat)</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={profile.openHourWeekday}
                        onChange={(e) => setProfile({ ...profile, openHourWeekday: e.target.value })}
                        className="ad-input py-1.5 text-center font-bold"
                      />
                      <span className="text-slate-400 font-bold">-</span>
                      <input
                        type="time"
                        value={profile.closeHourWeekday}
                        onChange={(e) => setProfile({ ...profile, closeHourWeekday: e.target.value })}
                        className="ad-input py-1.5 text-center font-bold"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                    <span className="font-bold text-slate-700 block">Akhir Pekan (Sabtu - Minggu)</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={profile.openHourWeekend}
                        onChange={(e) => setProfile({ ...profile, openHourWeekend: e.target.value })}
                        className="ad-input py-1.5 text-center font-bold"
                      />
                      <span className="text-slate-400 font-bold">-</span>
                      <input
                        type="time"
                        value={profile.closeHourWeekend}
                        onChange={(e) => setProfile({ ...profile, closeHourWeekend: e.target.value })}
                        className="ad-input py-1.5 text-center font-bold"
                      />
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={profile.emergencyOpen}
                    onChange={(e) => setProfile({ ...profile, emergencyOpen: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-[#1B3C53] focus:ring-[#1B3C53]"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    Buka Instalasi Gawat Darurat (IGD) & Triase 24 Jam
                  </span>
                </label>
              </div>
            </div>

            {/* Right Column: Information Card */}
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-[#1B3C53] font-bold text-sm">
                  <FileCheck size={18} />
                  <span>Kepatuhan Rekam Medis (RME)</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  AssistDoc telah mengadopsi standar regulasi <b>Permenkes No. 24 Tahun 2022</b> mengenai kewajiban penyelenggaraan Rekam Medis Elektronik (RME) di seluruh fasilitas pelayanan kesehatan.
                </p>
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 text-[11px] space-y-1">
                  <p className="font-bold text-[#1B3C53]">Status Akreditasi:</p>
                  <p className="text-slate-600">Paripurna (Kemenkes RI)</p>
                  <p className="font-bold text-[#1B3C53] pt-1">Integrasi SatuSehat Platform:</p>
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 font-bold text-[10px]">
                    <CheckCircle2 size={11} /> Terhubung Aktif
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-[#DCD7C9] bg-[#DCD7C9]/20 p-5 text-xs text-[#1B3C53] space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-sm">
                  <Info size={16} /> Pratinjau Stempel Resmi
                </p>
                <p className="text-slate-700 leading-relaxed">
                  Setiap etiket obat dan kuitansi pembayaran pasien akan mencantumkan nomor izin resmi <b>{profile.licenseNumber}</b> beserta stempel digital klinik.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: TARIFF & BILLING ================= */}
        {activeTab === "tariff" && (
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-base text-[#1B3C53]">Standarisasi Tarif Layanan Medis</h3>
                <p className="text-xs text-slate-500">Biaya dasar yang dihitung otomatis saat kasir menerbitkan tagihan / invoice pasien.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jasa Konsultasi Dokter Umum (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={tariff.consultationFee}
                    onChange={(e) => setTariff({ ...tariff, consultationFee: Math.max(0, Number(e.target.value) || 0) })}
                    className="ad-input font-bold text-[#1B3C53]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Format: Rp {tariff.consultationFee.toLocaleString("id-ID")}
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Biaya Pendaftaran & Administrasi (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={tariff.adminFee}
                    onChange={(e) => setTariff({ ...tariff, adminFee: Math.max(0, Number(e.target.value) || 0) })}
                    className="ad-input font-bold text-[#1B3C53]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Format: Rp {tariff.adminFee.toLocaleString("id-ID")}
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pajak Pertambahan Nilai / PPh (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={tariff.taxPercent}
                    onChange={(e) => setTariff({ ...tariff, taxPercent: Math.max(0, Number(e.target.value) || 0) })}
                    className="ad-input font-bold text-[#1B3C53]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Standar tarif PPN saat ini: {tariff.taxPercent}%
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Surcharge Tindakan Khusus / IGD (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={tariff.emergencyFee}
                    onChange={(e) => setTariff({ ...tariff, emergencyFee: Math.max(0, Number(e.target.value) || 0) })}
                    className="ad-input font-bold text-[#1B3C53]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Format: Rp {tariff.emergencyFee.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="font-extrabold text-sm text-[#1B3C53] flex items-center gap-1.5">
                  <CreditCard size={15} className="text-[#1B3C53]" /> Metode Pembayaran Kasir yang Diizinkan
                </h4>

                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 bg-slate-50/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tariff.enableCash}
                      onChange={(e) => setTariff({ ...tariff, enableCash: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-[#1B3C53] focus:ring-[#1B3C53]"
                    />
                    <div>
                      <p className="font-bold text-[#1B3C53]">Tunai (Cash)</p>
                      <p className="text-[10px] text-slate-500">Menerima pembayaran fisik di loket kasir</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 bg-slate-50/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tariff.enableQris}
                      onChange={(e) => setTariff({ ...tariff, enableQris: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-[#1B3C53] focus:ring-[#1B3C53]"
                    />
                    <div>
                      <p className="font-bold text-[#1B3C53]">QRIS Dinamis / Statis</p>
                      <p className="text-[10px] text-slate-500">GoPay, OVO, Dana, ShopeePay, BCA Mobile</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 bg-slate-50/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tariff.enableTransfer}
                      onChange={(e) => setTariff({ ...tariff, enableTransfer: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-[#1B3C53] focus:ring-[#1B3C53]"
                    />
                    <div>
                      <p className="font-bold text-[#1B3C53]">Transfer Virtual Account</p>
                      <p className="text-[10px] text-slate-500">Integrasi perbankan Mandiri, BCA, BNI, BRI</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 bg-slate-50/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tariff.enableInsurance}
                      onChange={(e) => setTariff({ ...tariff, enableInsurance: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-[#1B3C53] focus:ring-[#1B3C53]"
                    />
                    <div>
                      <p className="font-bold text-[#1B3C53]">Asuransi & BPJS Kesehatan</p>
                      <p className="text-[10px] text-slate-500">Bridging klaim BPJS P-Care & AdMedika</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Simulation Preview */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 h-fit">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-sm text-[#1B3C53]">Simulasi Kuitansi Pasien Rawat Jalan</h4>
                <p className="text-[11px] text-slate-500">Contoh perhitungan invoice otomatis dengan tarif aktif.</p>
              </div>

              <div className="space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex justify-between py-1 text-slate-600">
                  <span>Konsultasi Dokter</span>
                  <span className="font-bold text-slate-800">Rp {tariff.consultationFee.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-600">
                  <span>Administrasi & RM</span>
                  <span className="font-bold text-slate-800">Rp {tariff.adminFee.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-600">
                  <span>Pajak Layanan ({tariff.taxPercent}%)</span>
                  <span className="font-bold text-slate-800">
                    Rp {Math.round((tariff.consultationFee + tariff.adminFee) * (tariff.taxPercent / 100)).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between pt-2 text-sm font-extrabold text-[#1B3C53]">
                  <span>Total Tagihan Dasar</span>
                  <span className="text-base text-[#1B3C53]">
                    Rp {Math.round(
                      (tariff.consultationFee + tariff.adminFee) * (1 + tariff.taxPercent / 100)
                    ).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500 border border-slate-200">
                <p>Harga obat resep dokter dihitung terpisah secara akurat sesuai stok item inventaris farmasi.</p>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: WORKFLOW & AUTOMATION ================= */}
        {activeTab === "workflow" && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-[#1B3C53]">Alur Standar Pelayanan Pasien (SOP)</h3>
              <p className="text-xs text-slate-500">Pengaturan otomasi sistem antrean, panggilan audio, dan batasan operasional.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-[#1B3C53] flex items-center gap-2">
                    <Volume2 size={16} /> Pemanggilan Suara Otomatis (Audio Caller)
                  </span>
                  <input
                    type="checkbox"
                    checked={workflow.enableAudioCall}
                    onChange={(e) => setWorkflow({ ...workflow, enableAudioCall: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-[#1B3C53] focus:ring-[#1B3C53]"
                  />
                </div>
                <p className="text-slate-600">
                  Mengaktifkan panggilan audio sintesis suara (Web Speech API) saat memanggil nomor antrean pasien ke loket triase, poli dokter, atau kasir.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-[#1B3C53] flex items-center gap-2">
                    <FileCheck size={16} /> Wajib Triase TTV Sebelum Dokter
                  </span>
                  <input
                    type="checkbox"
                    checked={workflow.requireVitalsBeforeConsult}
                    onChange={(e) => setWorkflow({ ...workflow, requireVitalsBeforeConsult: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-[#1B3C53] focus:ring-[#1B3C53]"
                  />
                </div>
                <p className="text-slate-600">
                  Mencegah pemanggilan konsultasi dokter jika pasien belum diperiksa tekanan darah & suhu tubuh oleh perawat jaga.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-[#1B3C53] flex items-center gap-2">
                    <Clock size={16} /> Batas Peringatan Antrean (SLA)
                  </span>
                  <span className="font-bold text-[#1B3C53]">{workflow.maxWaitTimeAlertMinutes} Menit</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={workflow.maxWaitTimeAlertMinutes}
                  onChange={(e) => setWorkflow({ ...workflow, maxWaitTimeAlertMinutes: Number(e.target.value) })}
                  className="w-full accent-[#1B3C53]"
                />
                <p className="text-slate-500 text-[11px]">
                  Tampilkan badge peringatan merah pada dashboard perawat jika pasien telah menunggu lebih dari durasi ini.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-[#1B3C53] flex items-center gap-2">
                    <Mail size={16} /> Pengingat Kontrol Pasien (Reminder Gateway)
                  </span>
                  <input
                    type="checkbox"
                    checked={workflow.sendWaReminder}
                    onChange={(e) => setWorkflow({ ...workflow, sendWaReminder: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-[#1B3C53] focus:ring-[#1B3C53]"
                  />
                </div>
                <p className="text-slate-600">
                  Kirim notifikasi pesan otomatis H-1 sebelum jadwal kontrol ulang kronis ke nomor kontak pasien.
                </p>
              </div>
            </div>

            {/* Diagram Alur Visual */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h4 className="font-extrabold text-sm text-[#1B3C53]">Diagram Alur Pelayanan Pasien AssistDoc</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-xs">
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-[10px] text-slate-600 block mb-1">Tahap 1</span>
                  <p className="font-bold text-[#1B3C53]">Pendaftaran</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Loket / Pasien Online</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-[10px] text-slate-600 block mb-1">Tahap 2</span>
                  <p className="font-bold text-[#1B3C53]">Triase Perawat</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">TTV, Keluhan & BB/TB</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-[10px] text-slate-600 block mb-1">Tahap 3</span>
                  <p className="font-bold text-[#1B3C53]">Dokter Spesialis/Umum</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Konsultasi, ICD-10, Resep</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-[10px] text-slate-600 block mb-1">Tahap 4</span>
                  <p className="font-bold text-[#1B3C53]">Apotek Farmasi</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Racik, Etiket & PIO</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-[10px] text-slate-600 block mb-1">Tahap 5</span>
                  <p className="font-bold text-[#1B3C53]">Kasir & Selesai</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Kuitansi Lunas</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: SECURITY & BACKUP ================= */}
        {activeTab === "security" && (
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-base text-[#1B3C53]">Keamanan Sesi & Hak Akses Berbasis Peran</h3>
                <p className="text-xs text-slate-500">Kebijakan autentikasi untuk memproteksi kerahasiaan data rekam medis pasien.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Durasi Sesi Login Sebelum Auto-Logout (Menit)</label>
                  <input
                    type="number"
                    min="15"
                    max="480"
                    step="15"
                    value={security.sessionTimeoutMinutes}
                    onChange={(e) => setSecurity({ ...security, sessionTimeoutMinutes: Number(e.target.value) })}
                    className="ad-input font-bold text-[#1B3C53]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Sesi akan kedaluwarsa jika komputer idle selama waktu ini.</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Retensi Log Audit Aktivitas (Hari)</label>
                  <input
                    type="number"
                    min="30"
                    max="365"
                    step="30"
                    value={security.auditLogRetentionDays}
                    onChange={(e) => setSecurity({ ...security, auditLogRetentionDays: Number(e.target.value) })}
                    className="ad-input font-bold text-[#1B3C53]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Riwayat login & perubahan data disimpan selama {security.auditLogRetentionDays} hari.</p>
                </div>

                <div className="sm:col-span-2 pt-2 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={security.twoFactorAuth}
                      onChange={(e) => setSecurity({ ...security, twoFactorAuth: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-[#1B3C53] focus:ring-[#1B3C53]"
                    />
                    <div>
                      <span className="font-bold text-slate-700 block">Wajibkan Verifikasi 2 Langkah (2FA OTP) untuk Dokter & Admin</span>
                      <span className="text-[11px] text-slate-500">Mengharuskan kode verifikasi setiap kali login dari perangkat baru.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={security.autoBackupDaily}
                      onChange={(e) => setSecurity({ ...security, autoBackupDaily: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-[#1B3C53] focus:ring-[#1B3C53]"
                    />
                    <div>
                      <span className="font-bold text-slate-700 block">Pencadangan Otomatis Harian Database (Pukul 02:00 WIB)</span>
                      <span className="text-[11px] text-slate-500">Snapshot terenkripsi disimpan pada penyimpanan awan sekunder yang aman.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Data Export / Backup Action */}
              <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-sm text-[#1B3C53] flex items-center gap-1.5">
                    <Database size={15} className="text-[#1B3C53]" /> Cadangan Data Master Fasilitas
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">Unduh arsip lengkap konfigurasi sistem dalam format JSON.</p>
                </div>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="ad-btn border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold"
                >
                  <Download size={14} /> Unduh Snapshot JSON
                </button>
              </div>
            </div>

            {/* System Info Cards */}
            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Informasi Server</span>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 font-bold text-[10px]">
                    ONLINE
                  </span>
                </div>
                <div className="space-y-1.5 divide-y divide-slate-100">
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Versi AssistDoc CMS:</span>
                    <span className="font-mono font-bold text-[#1B3C53]">v2.4.1 Enterprise</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Mesin Database:</span>
                    <span className="font-mono font-bold text-[#1B3C53]">SQLite 3 / Prisma ORM</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Protokol Enkripsi:</span>
                    <span className="font-mono font-bold text-emerald-700">AES-256 GCM</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Latensi API:</span>
                    <span className="font-mono font-bold text-slate-700">~18 ms</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-slate-600 space-y-1.5">
                <p className="font-bold text-[#1B3C53] flex items-center gap-1.5">
                  <Lock size={13} /> Perlindungan Privasi Medis
                </p>
                <p className="text-[11px] leading-relaxed">
                  Data kunjungan, riwayat rekam medis, dan catatan diagnosa dilindungi oleh enkripsi pada level penyimpanan dan transmisi jaringan.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleExportBackup}
            className="ad-btn border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold"
          >
            <Download size={14} /> Cadangkan Konfigurasi
          </button>
          <button
            type="submit"
            className="ad-btn ad-btn-primary text-xs font-bold shadow-xs"
          >
            <Save size={14} /> Simpan Semua Perubahan
          </button>
        </div>
      </form>
    </>
  );
}
