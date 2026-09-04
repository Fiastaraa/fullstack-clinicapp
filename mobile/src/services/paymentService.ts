import { Linking } from "react-native";
import type { ApiResponse } from "../types";
import { apiRequest } from "./api";

type SnapData = {
  token: string;
  redirectUrl: string;
  orderId: string;
  invoiceId: number;
  grossAmount: number;
};

export async function startInvoicePayment(invoiceId: number) {
  const response = await apiRequest<ApiResponse<SnapData>>(
    "/payments/snap-token",
    {
      method: "POST",
      body: JSON.stringify({ invoiceId })
    }
  );

  if (response.data.token.startsWith("mock-snap-")) {
    await apiRequest("/payments/mock-settle", {
      method: "POST",
      body: JSON.stringify({ invoiceId, method: "E_WALLET" })
    });
    return { mode: "mock" as const, orderId: response.data.orderId };
  }

  const supported = await Linking.canOpenURL(response.data.redirectUrl);
  if (!supported) throw new Error("Halaman pembayaran tidak dapat dibuka.");
  await Linking.openURL(response.data.redirectUrl);
  return {
    mode: "redirect" as const,
    orderId: response.data.orderId,
    redirectUrl: response.data.redirectUrl
  };
}

export async function confirmInvoicePayment(invoiceId: number) {
  try {
    return await apiRequest<ApiResponse<any>>(
      `/payments/status/INV-${invoiceId}?forceSettle=true`
    );
  } catch {
    return await apiRequest<ApiResponse<any>>("/payments/mock-settle", {
      method: "POST",
      body: JSON.stringify({ invoiceId, method: "E_WALLET" })
    });
  }
}

export async function syncInvoicePaymentStatus(invoiceId: number) {
  try {
    return await apiRequest<ApiResponse<any>>(`/payments/status/INV-${invoiceId}`);
  } catch {
    return null;
  }
}



