import api from "./api";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options?: {
          onSuccess?: (result: any) => void;
          onPending?: (result: any) => void;
          onError?: (result: any) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

export type PaymentConfig = {
  clientKey: string;
  isProduction: boolean;
  snapScriptUrl: string;
  isConfigured: boolean;
};

export type SnapTokenResponse = {
  token: string;
  redirectUrl: string;
  orderId: string;
  grossAmount: number;
  invoiceId: number;
};

let snapScriptPromise: Promise<void> | null = null;

export function loadSnapScript(scriptUrl: string, clientKey: string): Promise<void> {
  if (window.snap) return Promise.resolve();
  if (snapScriptPromise) return snapScriptPromise;

  snapScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = scriptUrl;
    if (clientKey) {
      script.setAttribute("data-client-key", clientKey);
    }
    script.onload = () => resolve();
    script.onerror = () => {
      snapScriptPromise = null;
      reject(new Error("Gagal memuat Midtrans Snap script"));
    };
    document.head.appendChild(script);
  });

  return snapScriptPromise;
}

export const paymentService = {
  async getConfig(): Promise<PaymentConfig> {
    const res = await api.get<{ success: boolean; data: PaymentConfig }>("/payments/config");
    return res.data.data;
  },

  async createSnapToken(invoiceId: number): Promise<SnapTokenResponse> {
    const res = await api.post<{ success: boolean; data: SnapTokenResponse }>(
      "/payments/snap-token",
      { invoiceId },
    );
    return res.data.data;
  },

  async mockSettle(invoiceId: number, method: "E_WALLET" | "TRANSFER" = "E_WALLET"): Promise<void> {
    await api.post("/payments/mock-settle", { invoiceId, method });
  },

  async payInvoiceWithMidtrans(
    invoiceId: number,
    onSuccess?: () => void,
    onPending?: () => void,
    onError?: (errMessage: string) => void,
  ): Promise<void> {
    const [config, snapData] = await Promise.all([
      this.getConfig(),
      this.createSnapToken(invoiceId),
    ]);

    // Simulator / Mock Mode if keys are not configured or returns mock token
    if (snapData.token.startsWith("mock-snap-") || !config.isConfigured) {
      await this.mockSettle(invoiceId);
      if (onSuccess) onSuccess();
      return;
    }

    // Load Midtrans Snap.js script dynamically
    await loadSnapScript(config.snapScriptUrl, config.clientKey);

    if (!window.snap) {
      throw new Error("Midtrans Snap tidak tersedia.");
    }

    window.snap.pay(snapData.token, {
      onSuccess: () => {
        if (onSuccess) onSuccess();
      },
      onPending: () => {
        if (onPending) onPending();
      },
      onError: (result: any) => {
        const msg = result?.status_message || "Pembayaran Midtrans gagal";
        if (onError) onError(msg);
      },
      onClose: () => {
        if (onPending) onPending();
      },
    });
  },
};
