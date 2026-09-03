export default function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between border-b border-slate-200 pb-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          AssistDoc Medical Center
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#1B3C53]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-xs font-medium text-slate-600">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
