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

export async function startInvoicePayment(invoiceId: number): Promise<SnapData> {
  const response = await apiRequest<ApiResponse<SnapData>>(
    "/payments/snap-token",
    {
      method: "POST",
      body: JSON.stringify({ invoiceId })
    }
  );

  return response.data;
}

export async function confirmInvoicePayment(
  invoiceId: number,
  method: "E_WALLET" | "TRANSFER" = "E_WALLET"
) {
  try {
    return await apiRequest<ApiResponse<any>>(
      `/payments/status/INV-${invoiceId}?forceSettle=true&method=${method}`
    );
  } catch {
    return await apiRequest<ApiResponse<any>>("/payments/mock-settle", {
      method: "POST",
      body: JSON.stringify({ invoiceId, method })
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



