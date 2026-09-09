import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import {
  Card,
  EmptyState,
  ErrorNotice,
  LoadingState,
  PageHeader,
  Screen,
  StatusPill,
  uiStyles
} from "../../src/components/ui";
import { colors, shadow } from "../../src/constants/theme";
import { useRealtimeRefresh } from "../../src/hooks/useRealtimeRefresh";
import { clinicService } from "../../src/services/clinicService";
import {
  confirmInvoicePayment,
  startInvoicePayment,
  syncInvoicePaymentStatus
} from "../../src/services/paymentService";
import type { Visit } from "../../src/types";
import { formatCurrency, formatDate, messageFromError } from "../../src/utils/format";

type SnapSession = {
  token: string;
  redirectUrl: string;
  orderId: string;
  invoiceId: number;
  grossAmount: number;
};

export default function InvoicesScreen() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  // In-App Midtrans Snap WebView State
  const [activeSnap, setActiveSnap] = useState<SnapSession | null>(null);

  const load = useCallback(async (syncUnpaid = false) => {
    try {
      setError("");
      const response = await clinicService.visits("all");
      const currentVisits = response.data
        .filter((visit) => Boolean(visit.invoice))
        .sort(
          (left, right) =>
            new Date(right.visitDate).getTime() -
            new Date(left.visitDate).getTime()
        );

      if (syncUnpaid) {
        const unpaid = currentVisits.filter((v) => v.invoice?.status === "UNPAID");
        if (unpaid.length > 0) {
          await Promise.allSettled(
            unpaid.map((uv) => syncInvoicePaymentStatus(uv.invoice!.id))
          );
          const refreshed = await clinicService.visits("all");
          setVisits(
            refreshed.data
              .filter((visit) => Boolean(visit.invoice))
              .sort(
                (left, right) =>
                  new Date(right.visitDate).getTime() -
                  new Date(left.visitDate).getTime()
              )
          );
          return;
        }
      }

      setVisits(currentVisits);
    } catch (requestError) {
      setError(messageFromError(requestError, "Tagihan gagal dimuat."));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(true), [load]));
  useRealtimeRefresh(["invoices", "visits"], () => void load(false));

  // 1. One-click Pay via Midtrans
  async function handlePayWithMidtrans(invoiceId: number) {
    setPayingId(invoiceId);
    setError("");
    try {
      const snapData = await startInvoicePayment(invoiceId);
      if (!snapData.redirectUrl) {
        throw new Error("Link pembayaran Midtrans tidak ditemukan.");
      }
      setActiveSnap(snapData);
    } catch (err) {
      setError(messageFromError(err, "Gagal membuka pembayaran Midtrans."));
    } finally {
      setPayingId(null);
    }
  }

  // 2. Settlement on Success / Manual Verification
  async function handleConfirmSuccess() {
    if (!activeSnap) return;
    setVerifying(true);
    try {
      await confirmInvoicePayment(activeSnap.invoiceId, "TRANSFER");
      setActiveSnap(null);
      await load(false);
      Alert.alert(
        "Pembayaran Berhasil! 🎉",
        "Tagihan telah terverifikasi lunas. Notifikasi langsung terhubung secara realtime ke sistem klinik dan resep obat siap diserahkan Farmasi."
      );
    } catch (err) {
      Alert.alert(
        "Perhatian",
        "Pembayaran belum terkonfirmasi selesai. Silakan selesaikan pembayaran terlebih dahulu."
      );
    } finally {
      setVerifying(false);
    }
  }

  // 3. Monitor Midtrans WebView URL changes
  function handleNavigationStateChange(navState: { url: string }) {
    const url = (navState.url || "").toLowerCase();
    // Check if user reached Midtrans finish / settlement redirect
    if (
      url.includes("finish") ||
      url.includes("settlement") ||
      url.includes("transaction_status=settlement") ||
      url.includes("status_code=200") ||
      url.includes("status_code=201")
    ) {
      void handleConfirmSuccess();
    }
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Pembayaran"
        title="Tagihan saya"
        subtitle="Rincian biaya konsultasi dan obat dari setiap kunjungan."
      />
      {error ? <ErrorNotice message={error} /> : null}
      {loading ? (
        <LoadingState />
      ) : visits.length === 0 ? (
        <EmptyState
          title="Belum ada tagihan"
          description="Tagihan dibuat setelah pemeriksaan dan resep selesai diproses."
        />
      ) : (
        visits.map((visit) => {
          const invoice = visit.invoice!;
          return (
            <Card key={invoice.id}>
              <View style={uiStyles.rowBetween}>
                <View>
                  <Text style={styles.number}>
                    INV-{String(invoice.id).padStart(5, "0")}
                  </Text>
                  <Text style={uiStyles.muted}>{formatDate(visit.visitDate)}</Text>
                </View>
                <StatusPill status={invoice.status} />
              </View>
              <Text style={[uiStyles.strong, styles.doctor]}>
                {visit.doctor.name}
              </Text>
              <Text style={uiStyles.muted}>
                {visit.poli?.name || visit.doctor.specialization}
              </Text>
              <View style={styles.breakdown}>
                <Line label="Konsultasi" value={formatCurrency(invoice.consultationFee)} />
                <Line label="Obat" value={formatCurrency(invoice.medicineTotal)} />
                <Line label="Administrasi" value={formatCurrency(invoice.adminFee)} />
                <Line label="Pajak" value={formatCurrency(invoice.tax)} />
                <View style={uiStyles.divider} />
                <Line
                  label="Total"
                  value={formatCurrency(invoice.total)}
                  strong
                />
              </View>
              {invoice.status === "UNPAID" ? (
                <Pressable
                  style={[
                    styles.payNowButton,
                    payingId === invoice.id && styles.payNowButtonDisabled
                  ]}
                  onPress={() => handlePayWithMidtrans(invoice.id)}
                  disabled={payingId === invoice.id}
                >
                  {payingId === invoice.id ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Ionicons name="card-outline" size={17} color={colors.white} />
                  )}
                  <Text style={styles.payNowButtonText}>
                    {payingId === invoice.id
                      ? "Menghubungkan ke Midtrans..."
                      : "Bayar via Midtrans"}
                  </Text>
                </Pressable>
              ) : (
                <Text style={styles.paid}>
                  Pembayaran selesai
                  {invoice.payments?.[0]?.method
                    ? " · " + invoice.payments[0].method
                    : ""}
                </Text>
              )}
            </Card>
          );
        })
      )}

      {/* Official Midtrans Snap In-App WebView Modal */}
      <Modal
        visible={Boolean(activeSnap)}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveSnap(null)}
      >
        <SafeAreaView style={styles.snapSafeArea} edges={["top", "bottom"]}>
          {/* Top Bar Navigation */}
          <View style={styles.snapTopBar}>
            <Pressable
              style={styles.snapCloseBtn}
              onPress={() => setActiveSnap(null)}
            >
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>

            <View style={styles.snapTitleWrap}>
              <View style={styles.snapTitleRow}>
                <Text style={styles.snapTitle}>Midtrans Gateway</Text>
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              </View>
              <Text style={styles.snapSubtitle}>
                INV-{String(activeSnap?.invoiceId || 0).padStart(5, "0")} •{" "}
                {activeSnap ? formatCurrency(activeSnap.grossAmount) : ""}
              </Text>
            </View>

            <Pressable
              style={styles.snapFinishBtn}
              onPress={handleConfirmSuccess}
              disabled={verifying}
            >
              {verifying ? (
                <ActivityIndicator size="small" color={colors.teal} />
              ) : (
                <Text style={styles.snapFinishBtnText}>Cek Selesai</Text>
              )}
            </Pressable>
          </View>

          {/* Authentic Midtrans Snap Payment Page */}
          {activeSnap ? (
            <WebView
              source={{ uri: activeSnap.redirectUrl }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.webViewLoading}>
                  <ActivityIndicator size="large" color={colors.teal} />
                  <Text style={styles.webViewLoadingText}>
                    Memuat Gateway Midtrans...
                  </Text>
                </View>
              )}
              onNavigationStateChange={handleNavigationStateChange}
              style={styles.webView}
            />
          ) : null}
        </SafeAreaView>
      </Modal>
    </Screen>
  );
}

function Line({
  label,
  value,
  strong
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={uiStyles.rowBetween}>
      <Text style={strong ? uiStyles.strong : uiStyles.muted}>{label}</Text>
      <Text style={strong ? styles.total : styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  number: { color: colors.teal, fontSize: 12, fontWeight: "900" },
  doctor: { marginTop: 15 },
  breakdown: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 13,
    gap: 8,
    marginVertical: 15
  },
  value: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  total: { color: colors.tealDark, fontSize: 15, fontWeight: "900" },
  paid: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
    paddingVertical: 10
  },

  // Simplified Card Button
  payNowButton: {
    backgroundColor: colors.teal,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6
  },
  payNowButtonDisabled: {
    opacity: 0.7
  },
  payNowButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800"
  },

  // Midtrans Snap In-App WebView Modal
  snapSafeArea: {
    flex: 1,
    backgroundColor: colors.white
  },
  snapTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white
  },
  snapCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: colors.surface
  },
  snapTitleWrap: {
    alignItems: "center"
  },
  snapTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  snapTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.ink
  },
  liveBadge: {
    backgroundColor: colors.infoSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.tealDark
  },
  snapSubtitle: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2
  },
  snapFinishBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.teal,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10
  },
  snapFinishBtnText: {
    color: colors.tealDark,
    fontSize: 12,
    fontWeight: "800"
  },
  webView: {
    flex: 1,
    backgroundColor: colors.white
  },
  webViewLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.white,
    gap: 12
  },
  webViewLoadingText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted
  }
});
