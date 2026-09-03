import { useEffect, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import { clinic, unwrap } from "../../services/clinicService";
import { Link } from "react-router-dom";
export default function PatientsPage() {
  const [q, setQ] = useState(""),
    [rows, setRows] = useState<any[]>([]),
    [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      setRows(unwrap(await clinic.patients(q)));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  const filtered = rows.filter((p) =>
    `${p.name} ${p.phone}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title="Patients"
        subtitle="Search and review registered patient records."
        action={
          <Link
            to="/dashboard/admin/registration"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white"
          >
            <UserPlus size={16} />
            New Registration
          </Link>
        }
      />
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <Search size={18} className="text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or phone..."
          className="w-full outline-none text-sm"
        />
      </div>
      {loading ? (
        <div className="rounded-2xl bg-white p-10 text-center">
          Loading patients...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Patient not found"
          description="Try another name or phone number."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#111a3a] text-white">
              <tr>
                <th className="px-5 py-4">Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Phone</th>
                <th>Address</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-5 py-4 font-semibold">{p.name}</td>
                  <td>{p.age}</td>
                  <td>{p.gender}</td>
                  <td>{p.phone}</td>
                  <td>{p.address}</td>
                  <td>
                    <Link
                      className="font-semibold text-indigo-600"
                      to={`/dashboard/admin/patients/${p.id}`}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
