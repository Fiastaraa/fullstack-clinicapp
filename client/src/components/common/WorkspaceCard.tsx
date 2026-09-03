import type { ReactNode } from "react";
export default function WorkspaceCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
        <div>
          <h2 className="font-extrabold text-base text-[#1B3C53]">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500 font-medium">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
