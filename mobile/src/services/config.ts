const rawApiUrl =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001/api";

export const API_URL = rawApiUrl.replace(/\/$/, "");
export const SOCKET_URL = (
  process.env.EXPO_PUBLIC_SOCKET_URL || API_URL.replace(/\/api$/, "")
).replace(/\/$/, "");
