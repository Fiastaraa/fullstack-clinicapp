import api from "./api";
export interface AdminDashboardData {
  todayVisits: number;
  waiting: number;
  inConsultation: number;
  completed: number;
  paid: number;
  unpaidInvoices: number;
  todayRevenue: number;
  queue: any[];
}
export async function getAdminDashboard() {
  return (await api.get("/admin/dashboard")).data as {
    success: boolean;
    data: AdminDashboardData;
  };
}
