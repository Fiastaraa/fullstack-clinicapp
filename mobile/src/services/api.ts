import { API_URL } from "./config";

let accessToken: string | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", "Bearer " + accessToken);

  const url = `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new ApiError(
      "Tidak dapat terhubung ke server. Periksa alamat IP server dan Wi-Fi.",
      0
    );
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      payload?.message || "Permintaan tidak dapat diproses.",
      response.status,
      payload?.errors
    );
  }
  return payload as T;
}
