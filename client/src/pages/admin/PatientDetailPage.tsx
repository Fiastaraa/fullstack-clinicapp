import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Phone, UserRound } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import Badge from "../../components/common/Badge";
import { clinic, unwrap } from "../../services/clinicService";

type Patient = {
  id: number;
  name: string;
  nik?: string | null;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
  address?: string | null;
  birthDate?: string | null;
  visits?: Visit[];
};

type Visit = {
  id: number;
  patientId?: number;
  visitDate?: string;
  queueNumber?: string | null;
  complaint?: string | null;
  status?: string;
  doctor?: {
    name?: string | null;
  } | null;
  poli?: {
    name?: string | null;
  } | null;
  invoice?: {
    total?: number | null;
    status?: string | null;
  } | null;
  patient?: {
    id?: number;
  } | null;
};

const statusTone: Record<string, "amber" | "cyan" | "emerald" | "slate"> = {
  WAITING: "amber",
  CALLED: "amber",
  IN_CONSULTATION: "cyan",
  COMPLETED: "emerald",
  PAID: "emerald",
};

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("id-ID", {
    dateStyle: "medium",
  });
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function PatientDetailPage() {
  const { patientId } = useParams();
  const resolvedPatientId = Number(patientId || 0);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      if (!resolvedPatientId) {
        setMessage("ID pasien tidak valid.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setMessage("");

        const patientResponse = await clinic.patient(resolvedPatientId);

        if (!active) return;

        const selectedPatient = unwrap<Patient>(patientResponse);
        setPatient(selectedPatient || null);
        setVisits(
          (selectedPatient?.visits || [])
            .sort(
              (left, right) =>
                new Date(right.visitDate || 0).getTime() -
                new Date(left.visitDate || 0).getTime(),
            ),
        );

      } catch (error: any) {
        if (!active) return;

        setMessage(
          error?.response?.data?.message || "Gagal memuat detail pasien.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [resolvedPatientId]);

  return (
    <>
      <PageHeader
        title="Detail Pasien"
        subtitle="Ringkasan profil pasien dan riwayat kunjungan klinik."
        action={
          <Link
            to="/dashboard/admin/patients"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Kembali ke daftar
          </Link>
        }
      />

      {message && (
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700">
          {message}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">
          Memuat detail pasien...
        </div>
      ) : !patient ? (
        <EmptyState
          title="Pasien tidak ditemukan"
          description="Kembali ke daftar pasien lalu pilih data pasien yang tersedia."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-cyan-100 text-lg font-black text-cyan-700">
                {patient.name?.[0]?.toUpperCase() || "P"}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-700">
                  Profil Pasien
                </p>
                <h2 className="mt-1 text-2xl font-black text-[#101a3d]">
                  {patient.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {patient.gender || "-"} · {patient.age ?? "-"} tahun
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <InfoCard
                icon={<UserRound size={16} />}
                label="NIK"
                value={patient.nik || "-"}
              />
              <InfoCard
                icon={<CalendarDays size={16} />}
                label="Tanggal Lahir"
                value={formatDate(patient.birthDate)}
              />
              <InfoCard
                icon={<Phone size={16} />}
                label="Nomor HP"
                value={patient.phone || "-"}
              />
              <InfoCard
                icon={<UserRound size={16} />}
                label="Alamat"
                value={patient.address || "-"}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-700">
                  Riwayat Kunjungan
                </p>
                <h2 className="mt-1 text-xl font-black text-[#101a3d]">
                  {visits.length} kunjungan tercatat
                </h2>
              </div>
              <Badge tone="slate">Patient #{patient.id}</Badge>
            </div>

            {visits.length === 0 ? (
              <div className="mt-5">
                <EmptyState
                  title="Belum ada kunjungan"
                  description="Pasien ini belum memiliki riwayat kunjungan yang tersimpan."
                />
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {visits.map((visit) => (
                  <article
                    key={visit.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-900">
                          {visit.queueNumber || `VISIT-${visit.id}`}
                        </p>
                        <p className="text-sm text-slate-500">
                          {formatDate(visit.visitDate)} ·{" "}
                          {visit.poli?.name || "Poli Umum"} ·{" "}
                          {visit.doctor?.name || "Dokter belum dipilih"}
                        </p>
                      </div>
                      <Badge tone={statusTone[visit.status || ""] || "slate"}>
                        {visit.status || "UNKNOWN"}
                      </Badge>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Keluhan Awal
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {visit.complaint || "Tidak ada keluhan tercatat."}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Status Tagihan
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {visit.invoice
                            ? `${visit.invoice.status || "UNPAID"} • ${formatCurrency(visit.invoice.total)}`
                            : "Invoice belum diterbitkan"}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <p className="text-xs font-black uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
