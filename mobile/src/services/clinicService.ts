import type {
  ApiResponse,
  Doctor,
  Poli,
  Reminder,
  Visit
} from "../types";
import { apiRequest } from "./api";

export const clinicService = {
  visits(scope: "today" | "history" | "all" = "today") {
    return apiRequest<ApiResponse<Visit[]>>("/visits?scope=" + scope);
  },
  visit(id: number) {
    return apiRequest<ApiResponse<Visit>>("/visits/" + id);
  },
  createVisit(input: {
    doctorId: number;
    poliId?: number;
    complaint?: string;
  }) {
    return apiRequest<ApiResponse<Visit>>("/visits", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  doctors() {
    return apiRequest<ApiResponse<Doctor[]>>("/doctors");
  },
  polis() {
    return apiRequest<ApiResponse<Poli[]>>("/polis");
  },
  reminders() {
    return apiRequest<ApiResponse<Reminder[]>>("/reminders");
  },
  createReminder(input: {
    type: Reminder["type"];
    title: string;
    date: string;
    notes?: string;
  }) {
    return apiRequest<ApiResponse<Reminder>>("/reminders", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  updateReminderStatus(id: number, status: Reminder["status"]) {
    return apiRequest<ApiResponse<Reminder>>("/reminders/" + id, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  }
};
