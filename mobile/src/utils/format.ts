export function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function formatCurrency(value?: number | string | null) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export function messageFromError(error: unknown, fallback: string) {
  if (error && typeof error === "object") {
    const err = error as { message?: string; details?: Array<{ message?: string; path?: (string | number)[] }> };
    if (Array.isArray(err.details) && err.details.length > 0) {
      const messages = err.details
        .map((item) => item.message)
        .filter(Boolean);
      if (messages.length > 0) {
        return messages.join("\n");
      }
    }
    if (err.message) return err.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
