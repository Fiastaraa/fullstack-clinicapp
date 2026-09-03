import PageHeader from "../../components/common/PageHeader";
import WorkspaceCard from "../../components/common/WorkspaceCard";
export default function Schedule() {
  return (
    <>
      <PageHeader
        title="Nurse Schedule"
        subtitle="Today's triage and nursing activities."
      />
      <WorkspaceCard title="Today's Schedule">
        <div className="space-y-2">
          {[
            ["08:00 AM", "Triage Room"],
            ["10:00 AM", "Dr. Andi Assist"],
            ["01:00 PM", "Inventory Check"],
            ["03:00 PM", "Follow-up Check"],
          ].map(([t, x]) => (
            <div
              key={t}
              className="flex items-center justify-between border-b border-[#eeeae2] py-4"
            >
              <div>
                <b>{t}</b>
                <p className="text-sm text-[#7b8497]">{x}</p>
              </div>
              <span className="rounded-lg bg-[#168c9b] px-3 py-2 text-xs font-black text-white">
                Shift
              </span>
            </div>
          ))}
        </div>
      </WorkspaceCard>
    </>
  );
}
