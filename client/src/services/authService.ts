import api from "./api";
import type {
  LoginRequest,
  LoginResponse,
} from "../types/auth";
export async function login(data: LoginRequest) {
  return (await api.post<LoginResponse>("/auth/login", data)).data;
}
