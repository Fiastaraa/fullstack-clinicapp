import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import AuthLayout from "../../layouts/AuthLayout";
import { login } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../types/auth";

const staffRoles: [UserRole, string, string][] = [
  ["ADMIN", "Admin Klinik", "admin@assistdoc.com"],
  ["DOCTOR", "Dokter", "doctor@assistdoc.com"],
  ["NURSE", "Perawat", "nurse@assistdoc.com"],
  ["PHARMACIST", "Apoteker", "pharmacist@assistdoc.com"],
];

const staffHome: Record<UserRole, string> = {
  ADMIN: "/dashboard/admin",
  DOCTOR: "/dashboard/doctor",
  NURSE: "/dashboard/nurse",
  PHARMACIST: "/dashboard/pharmacist",
};

function isStaffRole(role: string): role is UserRole {
  return ["ADMIN", "DOCTOR", "NURSE", "PHARMACIST"].includes(role);
}

export default function Login() {
  const navigate = useNavigate();
  const { login: saveSession } = useAuth();
  const [role, setRole] = useState<UserRole>("ADMIN");
  const [email, setEmail] = useState("admin@assistdoc.com");
  const [password, setPassword] = useState("Admin12345");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function selectStaff(nextRole: UserRole, nextEmail: string) {
    setRole(nextRole);
    setEmail(nextEmail);
    setPassword("Admin12345");
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await login({ email: email.trim(), password });
      const returnedRole = String(response.data.user.role);
      if (!isStaffRole(returnedRole)) {
        setError("Akun pasien hanya dapat digunakan melalui aplikasi AssistDoc Mobile.");
        return;
      }

      const staffUser = { ...response.data.user, role: returnedRole };
      saveSession(response.data.token, staffUser);
      navigate(staffHome[returnedRole], { replace: true });
    } catch (requestError: any) {
      const serverMessage = requestError?.response?.data?.message;
      if (serverMessage === "Invalid email or password") {
        setError("Email atau password yang Anda masukkan salah. Silakan periksa kembali.");
      } else if (requestError?.code === "ERR_NETWORK" || !requestError?.response) {
        setError("Gagal terhubung ke server backend (Port 3001). Pastikan server aktif.");
      } else {
        setError(serverMessage || "Login gagal. Periksa email dan password Anda.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-[480px]">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-[#101a3d] text-[#22a5b2] shadow-lg">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-3xl font-black text-[#101a3d]">AssistDoc</h2>
          <p className="mt-1 text-xs font-bold text-slate-500 uppercase tracking-widest">
            Clinic Outpatient Management System
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-3xl border border-[#dedbd2] bg-white p-6 shadow-sm sm:p-7"
        >
          <div className="mb-6">
            <label className="mb-2 block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pilih Peran Operasional Klinik
            </label>
            <div className="grid grid-cols-2 gap-2">
              {staffRoles.map(([value, label, demoEmail]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectStaff(value, demoEmail)}
                  className={`rounded-xl border p-2.5 text-left text-xs font-bold transition ${
                    role === value
                      ? "border-[#101a3d] bg-[#101a3d] text-white shadow"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-bold text-rose-800">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-black text-[#101a3d] uppercase tracking-wider">
                Alamat Email Staff
              </label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold focus:border-[#168c9b] focus:outline-none"
                placeholder="staff@assistdoc.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-black text-[#101a3d] uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold pr-12 focus:border-[#168c9b] focus:outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <button
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-[#101a3d] py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-[#0c132d] disabled:opacity-50"
          >
            {loading
              ? "Memproses Login..."
              : `Masuk sebagai ${staffRoles.find((item) => item[0] === role)?.[1]}`}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
