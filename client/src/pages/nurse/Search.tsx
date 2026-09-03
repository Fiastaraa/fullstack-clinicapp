import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import { clinic, unwrap } from "../../services/clinicService";
export default function SearchPage() {
  const [rows, setRows] = useState<any[]>([]),
    [q, setQ] = useState("");
  useEffect(() => {
    clinic.patients().then((r) => setRows(unwrap(r)));
  }, []);
  const f = rows.filter((p) =>
    `${p.name} ${p.phone}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title="Patient Search"
        subtitle="Find patient before initial assessment."
      />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 rounded-xl border p-3">
          <Search size={18} className="text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search patient..."
            className="w-full outline-none"
          />
        </div>
        <div className="mt-5 space-y-2">
          {f.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl border p-4"
            >
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs text-slate-500">
                  {p.age} · {p.gender} · {p.phone}
                </p>
              </div>
              <button className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white">
                View
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
