import api from "./api";

type VisitScope = "today" | "history" | "all";
type VisitStatus = "WAITING" | "CALLED" | "IN_CONSULTATION" | "COMPLETED" | "PAID";
type PrescriptionStatus = "PENDING" | "READY";
type PaymentMethod = "CASH" | "TRANSFER" | "E_WALLET";
type ReminderStatus = "PENDING" | "SENT" | "COMPLETED" | "HANGUS";

export const clinic = {
  patients: async (q = "") =>
    (await api.get(`/patients${q ? `?search=${encodeURIComponent(q)}` : ""}`))
      .data,
  patient: async (id: number) => (await api.get(`/patients/${id}`)).data,
  createPatient: async (data: unknown) => (await api.post("/patients", data)).data,
  doctors: async () => (await api.get("/doctors")).data,
  visits: async (scope: VisitScope = "today") =>
    (await api.get(`/visits?scope=${scope}`)).data,
  visit: async (id: number) => (await api.get(`/visits/${id}`)).data,
  createVisit: async (data: unknown) => (await api.post("/visits", data)).data,
  status: async (id: number, status: VisitStatus) =>
    (await api.patch(`/visits/${id}/status`, { status })).data,
  vitals: async (id: number, data: unknown) =>
    (await api.patch(`/visits/${id}/vitals`, data)).data,
  notes: async (id: number, notes: string) =>
    (await api.patch(`/visits/${id}/notes`, { notes })).data,
  diagnosis: async (data: unknown) => (await api.post("/diagnoses", data)).data,
  medicines: async (search = "") =>
    (await api.get(`/medicines${search ? `?search=${encodeURIComponent(search)}` : ""}`)).data,
  createMedicine: async (data: unknown) =>
    (await api.post("/medicines", data)).data,
  updateMedicine: async (id: number, data: unknown) =>
    (await api.patch(`/medicines/${id}`, data)).data,
  adjustMedicineStock: async (id: number, adjustment: number) =>
    (await api.patch(`/medicines/${id}/stock`, { adjustment })).data,
  deleteMedicine: async (id: number) =>
    (await api.delete(`/medicines/${id}`)).data,
  prescription: async (data: unknown) =>
    (await api.post("/prescriptions", data)).data,
  prescriptionStatus: async (id: number, status: PrescriptionStatus) =>
    (await api.patch(`/prescriptions/${id}/status`, { status })).data,
  reports: async (range = "weekly") =>
    (await api.get(`/invoices/reports?range=${range}`)).data,
  users: async () => (await api.get("/users")).data,
  payInvoice: async (id: number, method: PaymentMethod = "CASH") =>
    (await api.patch(`/invoices/${id}/pay`, { method })).data,
  polis: async () => (await api.get("/polis")).data,
  createPoli: async (data: unknown) => (await api.post("/polis", data)).data,
  reminders: async () => (await api.get("/reminders")).data,
  createReminder: async (data: unknown) => (await api.post("/reminders", data)).data,
  rescheduleReminder: async (id: number, date: string, notes?: string) =>
    (await api.patch(`/reminders/${id}/reschedule`, { date, notes })).data,
  updateReminderStatus: async (id: number, status: ReminderStatus) =>
    (await api.patch(`/reminders/${id}`, { status })).data,
};

export function unwrap<T>(response: T | { data: T }): T {
  if (typeof response === "object" && response !== null && "data" in response) {
    return (response as { data: T }).data;
  }
  return response as T;
}
