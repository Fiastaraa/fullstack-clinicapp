import { useEffect, useState, type FormEvent } from "react";
import PageHeader from "../../components/common/PageHeader";
import { clinic, unwrap } from "../../services/clinicService";
import { CheckCircle2 } from "lucide-react";

export default function RegistrationPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [polis, setPolis] = useState<any[]>([]);
  const [existing, setExisting] = useState("");
  const [selectedPoliId, setSelectedPoliId] = useState("");

  const [form, setForm] = useState({
    name: "",
    nik: "",
    birthDate: "",
    gender: "Female",
    age: "",
    phone: "",
    address: "",
  });

  const [doctorId, setDoctorId] = useState("");
  const [complaint, setComplaint] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    Promise.all([clinic.patients(), clinic.doctors(), clinic.polis()]).then(([p, d, po]) => {
      setPatients(unwrap(p));
      const docList = unwrap(d);
      const poliList = unwrap(po);
      setDoctors(docList);
      setPolis(poliList);

      if (poliList.length > 0) {
        setSelectedPoliId(String(poliList[0].id));
      }
    });
  }, []);

  const filteredDoctors = doctors.filter((doc) => {
    if (!selectedPoliId) return true;
    return doc.poliId === Number(selectedPoliId) || !doc.poliId;
  });

  useEffect(() => {
    if (filteredDoctors.length > 0) {
      setDoctorId(String(filteredDoctors[0].id));
    } else {
      setDoctorId("");
    }
  }, [selectedPoliId, doctors]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      let patientId = Number(existing);
      if (!patientId) {
        patientId = unwrap(
          await clinic.createPatient({
            name: form.name,
            nik: form.nik || undefined,
            birthDate: form.birthDate || undefined,
            gender: form.gender,
            age: Number(form.age),
            phone: form.phone,
            address: form.address,
          })
        ).id;
      }

      const visitRes = unwrap(
        await clinic.createVisit({
          patientId,
          doctorId: Number(doctorId),
          poliId: Number(selectedPoliId),
          complaint,
        })
      );

      setMsg(`Pendaftaran Berhasil! Pasien masuk antrean dengan Nomor ${visitRes.queueNumber || `A0${visitRes.id}`}.`);
      setExisting("");
      setForm({ name: "", nik: "", birthDate: "", gender: "Female", age: "", phone: "", address: "" });
      setComplaint("");
    } catch (e: any) {
      setMsg(e?.response?.data?.message || "Pendaftaran gagal.");
    }
  }

  return (
    <>
      <PageHeader
        title="Registrasi Pasien Klinik"
        subtitle="Pendaftaran pasien baru / lama dan penetapan antrean Poli."
      />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <form
          onSubmit={submit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {/* TAB MODE PASIEN LAMA VS BARU */}
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                if (patients.length > 0) setExisting(String(patients[0].id));
              }}
              className={`rounded-lg py-2 text-xs font-black transition ${
                existing ? "bg-white text-[#168c9b] shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Option 1: Pasien Lama (Terdaftar)
            </button>

            <button
              type="button"
              onClick={() => {
                setExisting("");
              }}
              className={`rounded-lg py-2 text-xs font-black transition ${
                !existing ? "bg-white text-[#168c9b] shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Option 2: Pasien Baru (Pendaftaran)
            </button>
          </div>

          {existing ? (
            <div className="mb-4 rounded-xl bg-cyan-50 border border-cyan-200 p-3 text-xs font-bold text-cyan-900">
              📌 Mode Pasien Lama: Memilih pasien terdaftar dari database klinik.
            </div>
          ) : (
            <div className="mb-4 rounded-xl bg-indigo-50 border border-indigo-200 p-3 text-xs font-bold text-indigo-900">
              🆕 Mode Pasien Baru: Menginput data diri pasien baru untuk pertama kali.
            </div>
          )}

          {existing && (
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-700">Pilih Pasien Terdaftar (Pasien Lama)</label>
              <select
                value={existing}
                onChange={(e) => setExisting(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.phone} {p.nik ? `(NIK: ${p.nik})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="my-5 h-px bg-slate-100" />

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Nama Lengkap"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              disabled={!!existing}
            />
            <Field
              label="NIK (16 Digit)"
              value={form.nik}
              onChange={(v) => setForm((f) => ({ ...f, nik: v }))}
              disabled={!!existing}
            />
            <div>
              <label className="text-sm font-semibold">Tanggal Lahir</label>
              <input
                type="date"
                disabled={!!existing}
                value={form.birthDate}
                onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm disabled:bg-slate-50"
              />
            </div>
            <Field
              label="Umur (Tahun)"
              value={form.age}
              onChange={(v) => setForm((f) => ({ ...f, age: v }))}
              type="number"
              disabled={!!existing}
            />
            <Field
              label="Nomor HP"
              value={form.phone}
              onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
              disabled={!!existing}
            />
            <div>
              <label className="text-sm font-semibold">Jenis Kelamin</label>
              <select
                disabled={!!existing}
                value={form.gender}
                onChange={(e) =>
                  setForm((f) => ({ ...f, gender: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm disabled:bg-slate-50"
              >
                <option value="Female">Perempuan</option>
                <option value="Male">Laki-laki</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold">Alamat</label>
            <textarea
              disabled={!!existing}
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
              className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm disabled:bg-slate-50"
            />
          </div>

          <div className="my-5 h-px bg-slate-100" />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">Pilihan Poli</label>
              <select
                value={selectedPoliId}
                onChange={(e) => setSelectedPoliId(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold"
              >
                {polis.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold">Dokter Periksa</label>
              <select
                required
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold"
              >
                {filteredDoctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.specialization}
                  </option>
                ))}
                {filteredDoctors.length === 0 && <option value="">Tidak ada dokter di Poli ini</option>}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold">Keluhan Awal</label>
            <input
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
              placeholder="Demam, pusing, batuk..."
            />
          </div>

          <button className="mt-6 w-full rounded-xl bg-[#168c9b] py-3 text-sm font-bold text-white shadow-lg hover:bg-[#12727f] transition">
            Check-in & Terbitkan Antrean Poli
          </button>

          {msg && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 font-semibold">
              <CheckCircle2 size={18} />
              {msg}
            </div>
          )}
        </form>

        <div className="rounded-2xl bg-[#101a3d] p-6 text-white h-fit">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#22a5b2]">
            AssistDoc Outpatient Workflow
          </p>
          <h2 className="mt-2 text-2xl font-bold">Alur Pendaftaran Klinik</h2>
          <ol className="mt-6 space-y-4 text-sm text-slate-200">
            <li className="flex items-center gap-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#168c9b] text-xs font-bold text-white">1</span>
              <span>Cari Pasien Terdaftar atau isi Pasien Baru</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#168c9b] text-xs font-bold text-white">2</span>
              <span>Pilih Poli Klinik & Dokter Spesialis</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#168c9b] text-xs font-bold text-white">3</span>
              <span>Sistem menerbitkan **Nomor Antrean (e.g. A023)**</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#168c9b] text-xs font-bold text-white">4</span>
              <span>Perawat melakukan Pemeriksaan Vital Signs</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#168c9b] text-xs font-bold text-white">5</span>
              <span>Dokter melakukan Diagnosa & Resep</span>
            </li>
          </ol>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-semibold">{label}</label>
      <input
        disabled={disabled}
        required={!disabled}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm disabled:bg-slate-50"
      />
    </div>
  );
}
