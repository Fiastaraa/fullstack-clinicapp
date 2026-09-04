import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import {
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  LoadingState,
  PageHeader,
  Screen,
  StatusPill,
  uiStyles
} from "../../src/components/ui";
import { colors } from "../../src/constants/theme";
import { useRealtimeRefresh } from "../../src/hooks/useRealtimeRefresh";
import { clinicService } from "../../src/services/clinicService";
import {
  confirmInvoicePayment,
  startInvoicePayment,
  syncInvoicePaymentStatus
} from "../../src/services/paymentService";
import type { Visit } from "../../src/types";
import { formatCurrency, formatDate, messageFromError } from "../../src/utils/format";

export default function InvoicesScreen() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [error, setError] = useState("");

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

  async function pay(invoiceId: number) {
    Alert.alert(
      "Pembayaran Tagihan",
      "Pilih metode penyelesaian pembayaran:",
      [
        {
          text: "Bayar Lunas Sekarang",
          onPress: async () => {
            setPayingId(invoiceId);
            setError("");
            try {
              await confirmInvoicePayment(invoiceId);
              Alert.alert(
                "Pembayaran Berhasil",
                "Tagihan telah terverifikasi lunas! Resep obat Anda kini dapat segera diproses dan diserahkan oleh Farmasi."
              );
              await load(false);
            } catch (confirmError) {
              setError(messageFromError(confirmError, "Gagal memproses pembayaran."));
            } finally {
              setPayingId(null);
            }
          },
        },
        {
          text: "Buka Gateway Midtrans",
          onPress: async () => {
            setPayingId(invoiceId);
            setError("");
            try {
              const result = await startInvoicePayment(invoiceId);
              if (result.mode === "mock") {
                Alert.alert("Pembayaran Berhasil", "Tagihan Anda telah terverifikasi lunas!");
                await load(false);
              }
            } catch (requestError) {
              setError(messageFromError(requestError, "Pembayaran gagal diproses."));
            } finally {
              setPayingId(null);
            }
          },
        },
        {
          text: "Batal",
          style: "cancel",
        },
      ]
    );
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
                <Button
                  label="Bayar melalui Midtrans"
                  onPress={() => pay(invoice.id)}
                  disabled={payingId === invoice.id}
                />
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
  }
});
