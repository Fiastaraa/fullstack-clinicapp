import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import { clinic, unwrap } from "../../services/clinicService";
import {
  CheckSquare,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Calendar,
  AlertCircle,
  FileText,
  Zap,
  Edit3,
  Bookmark,
  Bell,
} from "lucide-react";

type Visit = {
  id: number;
  status: string;
  queueNumber?: string | null;
  complaint?: string | null;
  notes?: string | null;
  bloodPressure?: string | null;
  temperature?: number | null;
  visitDate?: string;
  patient: {
    id: number;
    name: string;
    nik?: string | null;
    gender?: string | null;
    age?: number | null;
    phone?: string | null;
  };
  doctor?: {
    name: string;
    specialization?: string | null;
  } | null;
  poli?: {
    name: string;
  } | null;
};

type Task = {
  id: string;
  title: string;
  subtitle?: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  category: "TTV" | "MEDICATION" | "ROOM" | "PATIENT_CARE" | "OTHER";
  completed: boolean;
  dueDate?: string;
  patientName?: string;
  createdAt: string;
};

type Reminder = {
  id: number;
  patientId: number;
  type: "KONTROL" | "VAKSINASI" | "CEK_LAB";
  title: string;
  date: string;
  notes?: string | null;
  status: "PENDING" | "SENT" | "COMPLETED";
  patient?: {
    id: number;
    name: string;
    phone?: string | null;
  };
};

const DEFAULT_TASKS: Task[] = [
  {
    id: "task-1",
    title: "Cek Tanda-Tanda Vital Ulang Pasien Ruang 2",
    subtitle: "Evaluasi suhu tubuh pasien febris setelah 30 menit",
    priority: "HIGH",
    category: "TTV",
    completed: false,
    dueDate: "Hari ini, 15:00",
    createdAt: new Date().toISOString(),
  },
  {
    id: "task-2",
    title: "Koordinasi Resep Obat Khusus dengan Farmasi",
    subtitle: "Konfirmasi ketersediaan sirup antibiotik amoksisilin",
    priority: "MEDIUM",
    category: "MEDICATION",
    completed: true,
    dueDate: "Hari ini",
    createdAt: new Date().toISOString(),
  },
  {
    id: "task-3",
    title: "Sterilisasi & Penataan Alat Stasiun Triase",
    subtitle: "Pembersihan tensimeter, thermometer, & timbangan",
    priority: "LOW",
    category: "ROOM",
    completed: false,
    dueDate: "Sebelum pergantian shift",
    createdAt: new Date().toISOString(),
  },
];

export default function Notes() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem("assistdoc_nurse_tasks");
      return saved ? JSON.parse(saved) : DEFAULT_TASKS;
    } catch {
      return DEFAULT_TASKS;
    }
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"NOTES" | "TASKS" | "REMINDERS">("NOTES");
  const [searchQuery, setSearchQuery] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Edit / Add Note Modal
  const [selectedVisitForNote, setSelectedVisitForNote] = useState<Visit | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // New Task Form
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskSubtitle, setNewTaskSubtitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");
  const [newTaskCategory, setNewTaskCategory] = useState<"TTV" | "MEDICATION" | "ROOM" | "PATIENT_CARE" | "OTHER">("PATIENT_CARE");
  const [newTaskPatient, setNewTaskPatient] = useState("");

  // New Reminder Form
  const [showNewReminderModal, setShowNewReminderModal] = useState(false);
  const [reminderPatientId, setReminderPatientId] = useState<number | "">("");
  const [reminderType, setReminderType] = useState<"KONTROL" | "VAKSINASI" | "CEK_LAB">("KONTROL");
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState(new Date().toISOString().split("T")[0]);
  const [reminderNotes, setReminderNotes] = useState("");
  const [savingReminder, setSavingReminder] = useState(false);

  // Save tasks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("assistdoc_nurse_tasks", JSON.stringify(tasks));
    } catch (e) {
      console.error(e);
    }
  }, [tasks]);

  // Load visits and reminders
  async function loadData() {
    try {
      setLoading(true);
      const [visitsRes, remindersRes] = await Promise.all([
        clinic.visits("all"),
        clinic.reminders(),
      ]);
      setVisits((unwrap(visitsRes) as Visit[]) || []);
      setReminders((unwrap(remindersRes) as Reminder[]) || []);
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal memuat data catatan perawat.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Save / Update Patient Note
  async function handleSaveNote() {
    if (!selectedVisitForNote) return;
    try {
      setSavingNote(true);
      await clinic.notes(selectedVisitForNote.id, noteContent);

      setVisits((prev) =>
        prev.map((v) =>
          v.id === selectedVisitForNote.id ? { ...v, notes: noteContent } : v
        )
      );

      setMsg({
        type: "success",
        text: `Catatan perawat untuk ${selectedVisitForNote.patient.name} berhasil diperbarui!`,
      });
      setSelectedVisitForNote(null);
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal menyimpan catatan.",
      });
    } finally {
      setSavingNote(false);
    }
  }

  // Insert SBAR Handover Template
  function insertSBARTemplate() {
    const sbarTemplate =
`[SBAR HANDOVER KEPERAWATAN]
• Situation: Pasien datang dengan keluhan ${selectedVisitForNote?.complaint || "demam / nyeri"}.
• Background: Riwayat penyakit terdahulu -, tanda vital stabil.
• Assessment: TTV TD: ${selectedVisitForNote?.bloodPressure || "120/80"}, Suhu: ${selectedVisitForNote?.temperature || "36.8"}°C.
• Recommendation: Lanjutkan observasi keluhan dan tunggu arahan dokter pemeriksa.`;
    setNoteContent(sbarTemplate);
  }

  // Add Task
  function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      subtitle: newTaskSubtitle.trim() || undefined,
      priority: newTaskPriority,
      category: newTaskCategory,
      completed: false,
      patientName: newTaskPatient.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    setTasks((prev) => [newTask, ...prev]);
    setNewTaskTitle("");
    setNewTaskSubtitle("");
    setNewTaskPatient("");
    setShowNewTaskModal(false);
    setMsg({ type: "success", text: "Tugas keperawatan baru berhasil ditambahkan!" });
  }

  // Toggle Task
  function handleToggleTask(id: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }

  // Delete Task
  function handleDeleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  // Create Reminder
  async function handleCreateReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!reminderPatientId || !reminderTitle.trim()) return;

    try {
      setSavingReminder(true);
      const res = await clinic.createReminder({
        patientId: Number(reminderPatientId),
        type: reminderType,
        title: reminderTitle.trim(),
        date: new Date(reminderDate).toISOString(),
        notes: reminderNotes.trim() || undefined,
      });

      const newRem = unwrap(res) as Reminder;
      setReminders((prev) => [newRem, ...prev]);
      setShowNewReminderModal(false);
      setReminderTitle("");
      setReminderNotes("");
      setReminderPatientId("");
      setMsg({ type: "success", text: "Jadwal pengingat pasien berhasil dibuat!" });
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal membuat pengingat pasien.",
      });
    } finally {
      setSavingReminder(false);
    }
  }

  // Toggle Reminder Status
  async function handleUpdateReminderStatus(id: number, currentStatus: string) {
    const nextStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    try {
      await clinic.updateReminderStatus(id, nextStatus);
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: nextStatus } : r))
      );
      setMsg({ type: "info", text: `Status pengingat diperbarui menjadi ${nextStatus}.` });
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Gagal memperbarui status pengingat.",
      });
    }
  }

  // Filtered visits for Notes
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const pName = v.patient?.name?.toLowerCase() || "";
      const qNum = v.queueNumber?.toLowerCase() || "";
      const notes = v.notes?.toLowerCase() || "";
      const complaint = v.complaint?.toLowerCase() || "";
      return pName.includes(q) || qNum.includes(q) || notes.includes(q) || complaint.includes(q);
    });
  }, [visits, searchQuery]);

  return (
    <>
      <PageHeader
        title="Catatan Klinis & Tugas Keperawatan (Notes & Tasks)"
        subtitle="Manajemen catatan perkembangan pasien (CPPT/SBAR), daftar tindakan keperawatan, dan jadwal pengingat tindak lanjut."
      />

      {/* ALERT BANNER */}
      {msg && (
        <div
          className={`mb-6 flex items-center justify-between rounded-2xl border p-4 text-sm font-semibold shadow-sm transition ${
            msg.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : msg.type === "error"
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-cyan-200 bg-cyan-50 text-cyan-900"
          }`}
        >
          <div className="flex items-center gap-3">
            {msg.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : msg.type === "error" ? (
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            ) : (
              <Zap className="h-5 w-5 text-cyan-600 shrink-0" />
            )}
            <span>{msg.text}</span>
          </div>
          <button
            onClick={() => setMsg(null)}
            className="text-xs opacity-60 hover:opacity-100 transition px-2 py-1"
          >
            Tutup
          </button>
        </div>
      )}

      {/* NAVIGATION TABS & ACTION BUTTONS */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        {/* TABS */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("NOTES")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-xs ${
              activeTab === "NOTES"
                ? "bg-[#168c9b] text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <FileText size={15} /> Catatan Pasien ({visits.length})
          </button>

          <button
            onClick={() => setActiveTab("TASKS")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-xs ${
              activeTab === "TASKS"
                ? "bg-[#168c9b] text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <CheckSquare size={15} /> Checklist Tindakan ({tasks.filter((t) => !t.completed).length} aktif)
          </button>

          <button
            onClick={() => setActiveTab("REMINDERS")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-xs ${
              activeTab === "REMINDERS"
                ? "bg-[#168c9b] text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Bell size={15} /> Pengingat Pasien ({reminders.length})
          </button>
        </div>

        {/* RIGHT ACTIONS */}
        <div className="flex items-center gap-2.5">
          {activeTab === "TASKS" && (
            <button
              onClick={() => setShowNewTaskModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#168c9b] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#12727f] transition"
            >
              <Plus size={15} /> Tambah Tugas Baru
            </button>
          )}

          {activeTab === "REMINDERS" && (
            <button
              onClick={() => setShowNewReminderModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#168c9b] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#12727f] transition"
            >
              <Plus size={15} /> Buat Jadwal Kontrol / Pengingat
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: CATATAN PASIEN (NOTES) */}
      {activeTab === "NOTES" && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
            <Search className="text-slate-400 shrink-0 ml-1" size={16} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari catatan berdasarkan nama pasien, nomor antrean, atau kata kunci keluhan..."
              className="w-full text-xs font-medium focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-slate-400 hover:text-slate-600 px-2"
              >
                Clear
              </button>
            )}
          </div>

          {/* Cards Grid */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              [1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-100 border border-slate-200" />
              ))
            ) : filteredVisits.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
                <FileText size={36} className="mx-auto mb-2 opacity-40" />
                <p className="font-bold text-[#101a3d]">Tidak Ada Catatan Pasien</p>
                <p className="text-xs text-slate-400 mt-1">
                  Pasien yang terdaftar akan muncul di sini bersama catatan perkembangannya.
                </p>
              </div>
            ) : (
              filteredVisits.map((v) => (
                <div
                  key={v.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-[#168c9b]/50 transition group"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-[#168c9b] bg-[#168c9b]/10 px-2 py-0.5 rounded-lg">
                          {v.queueNumber || `V-${v.id}`}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500">
                          Poli: {v.poli?.name || "Umum"}
                        </span>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {v.status}
                      </span>
                    </div>

                    {/* Patient Name & Doctor */}
                    <div className="mt-3">
                      <h4 className="font-bold text-sm text-[#101a3d] group-hover:text-[#168c9b] transition">
                        {v.patient?.name || "Pasien Anonim"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {v.patient?.age ? `${v.patient.age} thn` : ""} {v.patient?.gender ? `· ${v.patient.gender}` : ""}{" "}
                        {v.doctor?.name ? `· Dokter: ${v.doctor.name}` : ""}
                      </p>
                    </div>

                    {/* Complaint & Vitals summary */}
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                      {v.complaint && (
                        <span className="rounded-lg bg-amber-50 px-2 py-1 font-semibold text-amber-800 border border-amber-200/60">
                          Keluhan: {v.complaint}
                        </span>
                      )}
                      {v.bloodPressure && (
                        <span className="rounded-lg bg-slate-50 px-2 py-1 font-semibold text-slate-700 border border-slate-200">
                          TD: {v.bloodPressure}
                        </span>
                      )}
                      {v.temperature && (
                        <span className="rounded-lg bg-slate-50 px-2 py-1 font-semibold text-slate-700 border border-slate-200">
                          Suhu: {v.temperature}°C
                        </span>
                      )}
                    </div>

                    {/* Note Content */}
                    <div className="mt-3.5 rounded-xl bg-slate-50/80 p-3 text-xs text-slate-700 border border-slate-200/60 min-h-[64px]">
                      <span className="font-bold text-[10px] uppercase text-slate-400 block mb-1">
                        Catatan Perkembangan / CPPT:
                      </span>
                      {v.notes ? (
                        <p className="whitespace-pre-line line-clamp-4 text-slate-800 font-medium">
                          {v.notes}
                        </p>
                      ) : (
                        <span className="italic text-slate-400">Belum ada catatan keperawatan.</span>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock size={11} /> {v.visitDate ? new Date(v.visitDate).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "Hari ini"}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedVisitForNote(v);
                        setNoteContent(v.notes || "");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#168c9b]/10 hover:bg-[#168c9b] text-[#168c9b] hover:text-white px-3 py-1.5 text-xs font-bold transition shadow-xs"
                    >
                      <Edit3 size={13} /> {v.notes ? "Edit Catatan" : "Tambah Catatan"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CHECKLIST TUGAS KEPERAWATAN (TASKS) */}
      {activeTab === "TASKS" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Main Tasks List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#101a3d] text-base">Checklist Tindakan & Asuhan Keperawatan</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftar prioritas tugas harian perawat untuk memastikan kelancaran alur pelayanan pasien.
                </p>
              </div>
              <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                {tasks.filter((t) => t.completed).length} / {tasks.length} Selesai
              </span>
            </div>

            <div className="space-y-2.5">
              {tasks.map((task) => {
                const isHigh = task.priority === "HIGH";
                const isMed = task.priority === "MEDIUM";

                return (
                  <div
                    key={task.id}
                    className={`flex items-start justify-between gap-3 rounded-2xl border p-4 transition ${
                      task.completed
                        ? "border-slate-200 bg-slate-50/60 opacity-60"
                        : "border-slate-200 bg-white shadow-xs hover:border-[#168c9b]/40"
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleToggleTask(task.id)}
                        className="mt-1 h-5 w-5 rounded-md border-slate-300 text-[#168c9b] focus:ring-[#168c9b] cursor-pointer"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4
                            className={`text-sm font-bold text-[#101a3d] ${
                              task.completed ? "line-through text-slate-400" : ""
                            }`}
                          >
                            {task.title}
                          </h4>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                              isHigh
                                ? "bg-red-100 text-red-800 border border-red-200"
                                : isMed
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {task.priority === "HIGH" ? "Prioritas Tinggi" : task.priority === "MEDIUM" ? "Sedang" : "Rendah"}
                          </span>
                          <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-800">
                            {task.category}
                          </span>
                        </div>

                        {task.subtitle && (
                          <p className="mt-1 text-xs text-slate-600 font-medium">{task.subtitle}</p>
                        )}

                        <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                          {task.patientName && (
                            <span className="text-[#168c9b] font-semibold">
                              Pasien: {task.patientName}
                            </span>
                          )}
                          {task.dueDate && <span>Deadline: {task.dueDate}</span>}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-slate-300 hover:text-red-500 p-1 transition"
                      title="Hapus Tugas"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Action / Predefined Task Sidebar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 h-fit">
            <h4 className="font-bold text-sm text-[#101a3d] flex items-center gap-2">
              <Zap size={16} className="text-amber-500" /> Template Tindakan Cepat
            </h4>
            <p className="text-xs text-slate-500">
              Klik untuk langsung menambahkan tugas rutin keperawatan:
            </p>

            <div className="space-y-2">
              {[
                { title: "Evaluasi TTV Ulang Pasien Febris", cat: "TTV", prio: "HIGH" as const },
                { title: "Pengambilan Sampel Darah Laboratorium", cat: "PATIENT_CARE", prio: "HIGH" as const },
                { title: "Ganti Cairan Infus & Cek Jalur IV", cat: "PATIENT_CARE", prio: "HIGH" as const },
                { title: "Pemberian Terapi Nebulizer Inhalasi", cat: "PATIENT_CARE", prio: "MEDIUM" as const },
                { title: "Edukasi & Konseling Pasien Pasca Periksa", cat: "OTHER", prio: "LOW" as const },
                { title: "Pembersihan & Restock Disposable Stasiun", cat: "ROOM", prio: "LOW" as const },
              ].map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const newTask: Task = {
                      id: `task-${Date.now()}-${idx}`,
                      title: template.title,
                      priority: template.prio,
                      category: template.cat as any,
                      completed: false,
                      dueDate: "Hari ini",
                      createdAt: new Date().toISOString(),
                    };
                    setTasks((prev) => [newTask, ...prev]);
                    setMsg({ type: "success", text: `Tugas "${template.title}" berhasil ditambahkan!` });
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-left text-xs font-bold text-slate-700 hover:border-[#168c9b] hover:bg-[#168c9b]/5 transition flex items-center justify-between"
                >
                  <span>{template.title}</span>
                  <Plus size={14} className="text-[#168c9b]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PENGINGAT PASIEN (REMINDERS) */}
      {activeTab === "REMINDERS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#101a3d] text-base">Jadwal Kontrol & Pengingat Pasien</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengingat otomatis untuk kontrol ulang, vaksinasi, atau pemeriksaan laboratorium lanjutan.
              </p>
            </div>
            <span className="rounded-xl bg-cyan-50 px-3 py-1.5 text-xs font-bold text-[#168c9b]">
              Total {reminders.length} Jadwal
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100 border border-slate-200" />
              ))
            ) : reminders.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
                <Bell size={36} className="mx-auto mb-2 opacity-40" />
                <p className="font-bold text-[#101a3d]">Belum Ada Pengingat Pasien</p>
                <p className="text-xs text-slate-400 mt-1">
                  Gunakan tombol "Buat Jadwal Kontrol / Pengingat" di atas untuk menambahkan jadwal.
                </p>
              </div>
            ) : (
              reminders.map((rem) => {
                const isCompleted = rem.status === "COMPLETED";
                const isSent = rem.status === "SENT";

                return (
                  <div
                    key={rem.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="font-bold text-xs text-[#168c9b] bg-[#168c9b]/10 px-2 py-0.5 rounded-md">
                          {rem.type}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isCompleted
                              ? "bg-emerald-100 text-emerald-800"
                              : isSent
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {rem.status}
                        </span>
                      </div>

                      <div className="mt-3">
                        <h4 className="font-bold text-sm text-[#101a3d]">{rem.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Pasien: <strong className="text-slate-800">{rem.patient?.name || `#ID: ${rem.patientId}`}</strong>
                        </p>
                      </div>

                      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600 font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <Calendar size={14} className="text-[#168c9b]" />
                        <span>Tanggal: {new Date(rem.date).toLocaleDateString("id-ID", { dateStyle: "long" })}</span>
                      </div>

                      {rem.notes && (
                        <p className="mt-2.5 text-xs text-slate-600 italic bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                          Catatan: {rem.notes}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Telp: {rem.patient?.phone || "-"}
                      </span>
                      <button
                        onClick={() => handleUpdateReminderStatus(rem.id, rem.status)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                          isCompleted
                            ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                        }`}
                      >
                        {isCompleted ? "Tandai Belum" : "Selesaikan Jadwal"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL: EDIT / ADD PATIENT NOTE */}
      {selectedVisitForNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#101a3d]">
                  Catatan Asuhan Keperawatan (CPPT / SBAR)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pasien: <strong>{selectedVisitForNote.patient?.name}</strong> (Antrean #{selectedVisitForNote.queueNumber || selectedVisitForNote.id})
                </p>
              </div>
              <button
                onClick={() => setSelectedVisitForNote(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick SBAR Template button */}
            <div className="flex items-center justify-between bg-cyan-50/70 p-3 rounded-xl border border-cyan-100 text-xs">
              <span className="text-cyan-950 font-medium">Gunakan template standar operan perawat:</span>
              <button
                type="button"
                onClick={insertSBARTemplate}
                className="inline-flex items-center gap-1 font-bold text-white bg-[#168c9b] px-3 py-1.5 rounded-lg shadow-xs hover:bg-[#12727f] transition"
              >
                <Bookmark size={13} /> Sisipkan SBAR
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Isi Catatan Klinis / Observasi
              </label>
              <textarea
                rows={6}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Tuliskan catatan perkembangan kondisi pasien, tindakan yang sudah diberikan, respon terapi..."
                className="w-full rounded-xl border border-slate-200 p-3.5 text-xs focus:border-[#168c9b] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedVisitForNote(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={savingNote}
                className="rounded-xl bg-[#168c9b] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#12727f] transition disabled:opacity-50"
              >
                {savingNote ? "Menyimpan..." : "Simpan Catatan Pasien"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW TASK */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#101a3d] border-b border-slate-100 pb-3">
              Tambah Tindakan / Tugas Keperawatan Baru
            </h3>

            <form onSubmit={handleAddTask} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Judul Tindakan / Tugas *</label>
                <input
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Contoh: Pasang infus NaCl 0.9%"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-medium focus:border-[#168c9b] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Deskripsi Tambahan</label>
                <input
                  value={newTaskSubtitle}
                  onChange={(e) => setNewTaskSubtitle(e.target.value)}
                  placeholder="Contoh: Kecepatan 20 tpm, pantau phlebitis"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-medium focus:border-[#168c9b] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tingkat Prioritas</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-bold focus:border-[#168c9b] focus:outline-none"
                  >
                    <option value="HIGH">Tinggi (Mendesak)</option>
                    <option value="MEDIUM">Sedang</option>
                    <option value="LOW">Rendah</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-bold focus:border-[#168c9b] focus:outline-none"
                  >
                    <option value="TTV">Pemeriksaan TTV</option>
                    <option value="PATIENT_CARE">Asuhan / Tindakan</option>
                    <option value="MEDICATION">Pemberian Obat</option>
                    <option value="ROOM">Ruangan / Alat</option>
                    <option value="OTHER">Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Pasien Terkait (Opsional)</label>
                <input
                  value={newTaskPatient}
                  onChange={(e) => setNewTaskPatient(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-medium focus:border-[#168c9b] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#168c9b] px-5 py-2.5 text-white font-bold shadow-md hover:bg-[#12727f]"
                >
                  Simpan Tugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW REMINDER */}
      {showNewReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#101a3d] border-b border-slate-100 pb-3">
              Buat Jadwal Kontrol / Pengingat Pasien
            </h3>

            <form onSubmit={handleCreateReminder} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Pasien *</label>
                <select
                  required
                  value={reminderPatientId}
                  onChange={(e) => setReminderPatientId(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-bold focus:border-[#168c9b] focus:outline-none"
                >
                  <option value="">-- Pilih Pasien --</option>
                  {visits.map((v) => (
                    <option key={v.patient.id} value={v.patient.id}>
                      {v.patient.name} (Antrean: {v.queueNumber || v.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tipe Pengingat</label>
                  <select
                    value={reminderType}
                    onChange={(e) => setReminderType(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-bold focus:border-[#168c9b] focus:outline-none"
                  >
                    <option value="KONTROL">Kontrol Ulang Dokter</option>
                    <option value="VAKSINASI">Jadwal Vaksinasi</option>
                    <option value="CEK_LAB">Pemeriksaan Lab</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Kontrol</label>
                  <input
                    type="date"
                    required
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-bold focus:border-[#168c9b] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Judul / Keperluan Kontrol *</label>
                <input
                  required
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  placeholder="Contoh: Kontrol evaluasi demam & cek darah rutin"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-medium focus:border-[#168c9b] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Tambahan (Instruksi Pasien)</label>
                <input
                  value={reminderNotes}
                  onChange={(e) => setReminderNotes(e.target.value)}
                  placeholder="Contoh: Puasa 8 jam sebelum cek darah"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-medium focus:border-[#168c9b] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewReminderModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingReminder}
                  className="rounded-xl bg-[#168c9b] px-5 py-2.5 text-white font-bold shadow-md hover:bg-[#12727f] disabled:opacity-50"
                >
                  {savingReminder ? "Menyimpan..." : "Simpan Pengingat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
