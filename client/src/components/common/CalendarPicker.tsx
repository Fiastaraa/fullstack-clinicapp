import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

interface CalendarPickerProps {
  value: string; // YYYY-MM-DD or ISO string
  onChange: (dateStr: string) => void;
  minDate?: string; // YYYY-MM-DD
  label?: string;
  className?: string;
}

const DAYS_OF_WEEK = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function CalendarPicker({
  value,
  onChange,
  minDate,
  label = "Pilih Tanggal Kontrol",
  className = "",
}: CalendarPickerProps) {
  // Normalize initial date
  const parsedValue = useMemo(() => {
    if (!value) return new Date();
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [value]);

  const [currentMonth, setCurrentMonth] = useState<number>(parsedValue.getMonth());
  const [currentYear, setCurrentYear] = useState<number>(parsedValue.getFullYear());

  const todayStr = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }, []);

  const selectedStr = useMemo(() => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, [value]);

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isDisabled: boolean;
      isSelected: boolean;
      isToday: boolean;
    }> = [];

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = totalDaysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;

      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isDisabled: Boolean(minDate && dateStr < minDate),
        isSelected: dateStr === selectedStr,
        isToday: dateStr === todayStr,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isDisabled: Boolean(minDate && dateStr < minDate),
        isSelected: dateStr === selectedStr,
        isToday: dateStr === todayStr,
      });
    }

    // Next month padding to fill a 35 or 42 grid
    const remainingSlots = 42 - days.length;
    if (remainingSlots > 0 && remainingSlots < 7) {
      for (let n = 1; n <= remainingSlots; n++) {
        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
        const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`;

        days.push({
          dateStr,
          dayNumber: n,
          isCurrentMonth: false,
          isDisabled: Boolean(minDate && dateStr < minDate),
          isSelected: dateStr === selectedStr,
          isToday: dateStr === todayStr,
        });
      }
    }

    return days;
  }, [currentMonth, currentYear, selectedStr, todayStr, minDate]);

  function handlePrevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  function handleSelectDate(dateStr: string) {
    onChange(dateStr);
    const d = new Date(dateStr);
    setCurrentMonth(d.getMonth());
    setCurrentYear(d.getFullYear());
  }

  function handleQuickPreset(daysAhead: number) {
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    const targetStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
    handleSelectDate(targetStr);
  }

  const formattedSelected = useMemo(() => {
    if (!selectedStr) return "Belum memilih tanggal";
    const d = new Date(selectedStr);
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [selectedStr]);

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {/* Header Label & Selected Date Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            {label}
          </span>
          <div className="flex items-center gap-1.5 text-xs font-black text-indigo-700 mt-0.5">
            <CalendarIcon size={14} className="text-indigo-600" />
            <span>{formattedSelected}</span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => handleQuickPreset(3)}
            className="rounded-lg bg-indigo-50 hover:bg-indigo-100 px-2 py-1 text-[10px] font-bold text-indigo-700 transition"
          >
            +3 Hari
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset(7)}
            className="rounded-lg bg-indigo-50 hover:bg-indigo-100 px-2 py-1 text-[10px] font-bold text-indigo-700 transition"
          >
            +1 Minggu
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset(14)}
            className="rounded-lg bg-indigo-50 hover:bg-indigo-100 px-2 py-1 text-[10px] font-bold text-indigo-700 transition"
          >
            +2 Minggu
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset(30)}
            className="rounded-lg bg-indigo-50 hover:bg-indigo-100 px-2 py-1 text-[10px] font-bold text-indigo-700 transition"
          >
            +1 Bulan
          </button>
        </div>
      </div>

      {/* Month / Year Navigator */}
      <div className="flex items-center justify-between py-2.5">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
          title="Bulan sebelumnya"
        >
          <ChevronLeft size={16} />
        </button>

        <span className="text-xs font-bold text-[#101a3d]">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </span>

        <button
          type="button"
          onClick={handleNextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
          title="Bulan berikutnya"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center border-b border-slate-100 pb-1.5 mb-1.5">
        {DAYS_OF_WEEK.map((day, idx) => (
          <span
            key={day}
            className={`text-[10px] font-bold ${idx === 0 ? "text-rose-500" : "text-slate-400"}`}
          >
            {day}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          const isCurrentMonth = day.isCurrentMonth;
          const isSelected = day.isSelected;
          const isToday = day.isToday;
          const isDisabled = day.isDisabled;

          return (
            <button
              key={idx}
              type="button"
              disabled={isDisabled}
              onClick={() => handleSelectDate(day.dateStr)}
              className={`flex h-8 w-full items-center justify-center rounded-xl text-xs font-bold transition ${
                isSelected
                  ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300"
                  : isToday
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  : !isCurrentMonth
                  ? "text-slate-300 hover:text-slate-500"
                  : isDisabled
                  ? "text-slate-300 cursor-not-allowed"
                  : "text-slate-700 hover:bg-slate-100 hover:text-[#101a3d]"
              }`}
            >
              {day.dayNumber}
            </button>
          );
        })}
      </div>
    </div>
  );
}
