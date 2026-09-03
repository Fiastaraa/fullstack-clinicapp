import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import Badge from "../../components/common/Badge";
import { clinic, unwrap } from "../../services/clinicService";
export default function UsersPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    clinic.users().then((r) => setRows(unwrap(r)));
  }, []);
  return (
    <>
      <PageHeader
        title="User Management"
        subtitle="Clinic staff accounts and role access."
      />
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#111a3a] text-white">
            <tr>
              <th className="px-5 py-4">Name</th>
              <th>Role</th>
              <th>Email</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-5 py-4 font-semibold">{u.name}</td>
                <td>
                  <Badge tone="violet">{u.role}</Badge>
                </td>
                <td>{u.email}</td>
                <td>{new Date(u.createdAt).toLocaleDateString("id-ID")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
