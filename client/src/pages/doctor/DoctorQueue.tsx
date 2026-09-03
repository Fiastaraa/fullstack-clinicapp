import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import Badge from "../../components/common/Badge";
import { clinic, unwrap } from "../../services/clinicService";

export default function DoctorQueue() {
  const [rows, setRows] = useState<any[]>([]);
  const load = async () =>
    setRows(
      unwrap(await clinic.visits()).filter(
        (v: any) => v.status === "IN_CONSULTATION",
      ),
    );
  useEffect(() => {
    load();
  }, []);
  return (
    <>
      <PageHeader
        title="Patient Queue"
        subtitle="Patients who completed nurse assessment and are ready for consultation."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((v) => (
          <div key={v.id} className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-black text-[#101a3d]">
                  {v.patient.name}
                </p>
                <p className="text-sm text-slate-500">
                  {v.patient.age} · {v.patient.gender}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Complaint: {v.complaint || "-"}
                </p>
              </div>
              <Badge tone="cyan">READY</Badge>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-slate-50 p-2">
                <b>BP</b>
                <p>{v.bloodPressure || "-"}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <b>Temp</b>
                <p>{v.temperature ?? "-"}°C</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <b>Weight</b>
                <p>{v.weight ?? "-"} kg</p>
              </div>
            </div>
            <Link
              to={`/dashboard/doctor/consultation?visitId=${v.id}`}
              className="mt-4 block w-full rounded-xl bg-indigo-600 py-3 text-center text-sm font-bold text-white"
            >
              Open Consultation
            </Link>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="col-span-full rounded-2xl border bg-white p-10 text-center text-slate-400">
            No patients ready for consultation.
          </div>
        )}
      </div>
    </>
  );
}
