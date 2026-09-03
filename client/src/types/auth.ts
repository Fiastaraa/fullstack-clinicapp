export type UserRole = "ADMIN" | "DOCTOR" | "NURSE" | "PHARMACIST";
export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}
export interface LoginRequest {
  email: string;
  password: string;
}
export interface LoginResponse {
  success: boolean;
  message: string;
  data: { token: string; user: User };
}
