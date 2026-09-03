import "dotenv/config";
import crypto from "crypto";

export interface ItemDetail {
  id: string;
  price: number;
  quantity: number;
  name: string;
}

export interface CustomerDetail {
  first_name: string;
  email?: string;
  phone?: string;
}

export interface SnapTransactionPayload {
  transaction_details: {
    order_id: string;
    gross_amount: number;
  };
  customer_details?: CustomerDetail;
  item_details?: ItemDetail[];
}

export interface SnapTransactionResponse {
  token: string;
  redirect_url: string;
}

export interface MidtransNotificationPayload {
  transaction_time?: string;
  transaction_status: string;
  transaction_id?: string;
  status_message?: string;
  status_code: string;
  signature_key: string;
  payment_type: string;
  order_id: string;
  merchant_id?: string;
  gross_amount: string;
  fraud_status?: string;
  currency?: string;
  [key: string]: any;
}

export class MidtransService {
  public get serverKey(): string {
    return process.env.MIDTRANS_SERVER_KEY || "";
  }

  public get clientKey(): string {
    return process.env.MIDTRANS_CLIENT_KEY || "";
  }

  public get isProduction(): boolean {
    return process.env.MIDTRANS_IS_PRODUCTION === "true";
  }

  public get isConfigured(): boolean {
    const s = this.serverKey.trim();
    const c = this.clientKey.trim();
    return (
      Boolean(s) &&
      !s.includes("YOUR_SERVER_KEY_HERE") &&
      Boolean(c) &&
      !c.includes("YOUR_CLIENT_KEY_HERE")
    );
  }

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.serverKey}:`).toString("base64")}`;
  }

  private getSnapBaseUrl(): string {
    return this.isProduction
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";
  }

  private getCoreBaseUrl(): string {
    return this.isProduction
      ? "https://api.midtrans.com/v2"
      : "https://api.sandbox.midtrans.com/v2";
  }

  public getSnapScriptUrl(): string {
    return this.isProduction
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";
  }

  public getConfig() {
    return {
      clientKey: this.clientKey,
      isProduction: this.isProduction,
      snapScriptUrl: this.getSnapScriptUrl(),
      isConfigured: this.isConfigured,
    };
  }

  /**
   * Create Snap payment token and redirect URL
   */
  public async createSnapTransaction(
    payload: SnapTransactionPayload,
  ): Promise<SnapTransactionResponse> {
    // If real keys are not yet configured in .env, provide simulated sandbox token
    if (!this.isConfigured) {
      const orderId = payload.transaction_details.order_id;
      return {
        token: `mock-snap-${orderId}`,
        redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/simulated-${orderId}`,
      };
    }

    const response = await fetch(this.getSnapBaseUrl(), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: this.getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as any;

    if (!response.ok) {
      const errorMsg =
        (data?.error_messages && data.error_messages.join(", ")) ||
        data?.message ||
        "Failed to create Midtrans Snap transaction";
      throw new Error(errorMsg);
    }

    return {
      token: data.token,
      redirect_url: data.redirect_url,
    };
  }

  /**
   * Check transaction status directly via Midtrans Core API
   */
  public async checkTransactionStatus(orderId: string): Promise<any> {
    if (!this.serverKey) {
      throw new Error("MIDTRANS_SERVER_KEY is not configured in .env");
    }

    const response = await fetch(`${this.getCoreBaseUrl()}/${orderId}/status`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: this.getAuthHeader(),
      },
    });

    const data = (await response.json()) as any;

    if (!response.ok) {
      throw new Error(
        data?.status_message || "Failed to fetch Midtrans transaction status",
      );
    }

    return data;
  }

  /**
   * Verify signature_key sent in webhook notification using SHA-512
   * Formula: SHA512(order_id + status_code + gross_amount + ServerKey)
   */
  public verifySignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    signatureKey: string,
  ): boolean {
    if (!this.serverKey || !signatureKey) {
      return false;
    }

    const payload = `${orderId}${statusCode}${grossAmount}${this.serverKey}`;
    const hash = crypto.createHash("sha512").update(payload).digest("hex");

    return hash === signatureKey;
  }

  /**
   * Map Midtrans payment_type to Prisma PaymentMethod enum (CASH, TRANSFER, E_WALLET)
   */
  public mapPaymentMethod(
    paymentType: string = "",
  ): "TRANSFER" | "E_WALLET" | "CASH" {
    const pt = paymentType.toLowerCase();

    if (
      pt.includes("qris") ||
      pt.includes("gopay") ||
      pt.includes("shopeepay") ||
      pt.includes("ovo") ||
      pt.includes("dana") ||
      pt.includes("wallet")
    ) {
      return "E_WALLET";
    }

    if (
      pt.includes("bank_transfer") ||
      pt.includes("echannel") ||
      pt.includes("va") ||
      pt.includes("cstore") ||
      pt.includes("credit_card") ||
      pt.includes("bca") ||
      pt.includes("bni") ||
      pt.includes("bri") ||
      pt.includes("mandiri") ||
      pt.includes("permata")
    ) {
      return "TRANSFER";
    }

    return "TRANSFER";
  }
}

export const midtransService = new MidtransService();
