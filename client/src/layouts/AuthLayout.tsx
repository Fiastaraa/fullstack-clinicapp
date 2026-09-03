import type { ReactNode } from "react";
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f2e8] px-4 py-8 sm:py-12">
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-6xl overflow-hidden rounded-[26px] border border-[#e2dfd7] bg-white shadow-[0_24px_70px_rgba(16,26,61,.12)] lg:grid-cols-[1.05fr_.95fr]">
        <div className="hidden bg-[#101a3d] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#168c9b] text-2xl font-black">
                +
              </div>
              <span className="text-2xl font-black">AssistDoc</span>
            </div>
            <p className="mt-14 text-xs font-black uppercase tracking-[.25em] text-[#56c6d0]">
              Clinic Outpatient Management
            </p>
            <h1 className="mt-5 max-w-lg text-5xl font-black leading-[1.05]">
              One connected flow from patient to payment.
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-7 text-slate-300">
              Digital registration, queue, nurse assessment, doctor
              consultation, pharmacy, invoice and payment — organized by role.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <b className="text-2xl">5</b>
              <p className="mt-1 text-xs text-slate-400">Roles</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <b className="text-2xl">8</b>
              <p className="mt-1 text-xs text-slate-400">Core modules</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <b className="text-2xl">18%</b>
              <p className="mt-1 text-xs text-slate-400">Tax rule</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center p-5 sm:p-10">
          {children}
        </div>
      </div>
    </div>
  );
}
