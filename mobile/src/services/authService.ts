import type {
  ApiResponse,
  Patient,
  RegisterPatientInput,
  User
} from "../types";
import { apiRequest } from "./api";

export function login(email: string, password: string) {
  return apiRequest<ApiResponse<{ token: string; user: User }>>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), password })
  });
}

export function register(input: RegisterPatientInput) {
  return apiRequest<ApiResponse<User>>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function currentUser() {
  return apiRequest<ApiResponse<{ user: User }>>("/auth/me");
}

export function myProfile() {
  return apiRequest<ApiResponse<Patient>>("/patients/me");
}

export function updateMyProfile(input: Partial<Patient>) {
  return apiRequest<ApiResponse<Patient>>("/patients/me", {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}
