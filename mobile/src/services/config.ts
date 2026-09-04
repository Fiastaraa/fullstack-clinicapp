function sanitizeUrl(
  rawUrl?: string | null,
  fallback: string = "http://192.168.18.158:3001/api"
): string {
  if (!rawUrl || typeof rawUrl !== "string") return fallback;

  let url = rawUrl.trim();

  // Normalize protocol
  url = url.replace(/^http(s)?:\/\/\s*/i, "http$1://");

  // Remove accidental stray characters or letters typed between '://' and the host
  // e.g. "http://h 192.168...", "http:// h 192.168..."
  url = url.replace(/^(https?:\/\/)[a-zA-Z\s]*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|localhost)/i, "$1$2");

  // Remove any remaining spaces in the host:port portion
  const slashIndex = url.indexOf("/", 8);
  if (slashIndex !== -1) {
    const origin = url.slice(0, slashIndex).replace(/\s+/g, "");
    const path = url.slice(slashIndex);
    url = origin + path;
  } else {
    url = url.replace(/\s+/g, "");
  }

  return url.replace(/\/+$/, "");
}

const rawApiUrl = sanitizeUrl(
  process.env.EXPO_PUBLIC_API_URL,
  "http://192.168.18.158:3001/api"
);

export const API_URL = rawApiUrl.replace(/\/$/, "");
export const SOCKET_URL = sanitizeUrl(
  process.env.EXPO_PUBLIC_SOCKET_URL,
  API_URL.replace(/\/api$/, "")
).replace(/\/$/, "");

