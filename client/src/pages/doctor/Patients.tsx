import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import { clinic, unwrap } from "../../services/clinicService";
export default function Patients() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    clinic.patients().then((r) => setRows(unwrap(r)));
  }, []);
  return (
    <>
      <PageHeader
        title="Patients"
        subtitle="Quick access to patient records and medical history."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                {p.name[0]}
              </div>
              <div>
                <p className="font-bold">{p.name}</p>
                <p className="text-xs text-slate-500">
                  {p.age} · {p.gender}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-500">{p.phone}</p>
            <p className="mt-1 text-sm text-slate-500">{p.address}</p>
          </div>
        ))}
      </div>
    </>
  );
}
