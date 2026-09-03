import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";
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
import { startInvoicePayment } from "../../src/services/paymentService";
import type { Visit } from "../../src/types";
import { formatCurrency, formatDate, messageFromError } from "../../src/utils/format";

export default function InvoicesScreen() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const response = await clinicService.visits("all");
      setVisits(
        response.data
          .filter((visit) => Boolean(visit.invoice))
          .sort(
            (left, right) =>
              new Date(right.visitDate).getTime() -
              new Date(left.visitDate).getTime()
          )
      );
    } catch (requestError) {
      setError(messageFromError(requestError, "Tagihan gagal dimuat."));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));
  useRealtimeRefresh(["invoices", "visits"], load);

  async function pay(invoiceId: number) {
    setPayingId(invoiceId);
    setError("");
    try {
      const result = await startInvoicePayment(invoiceId);
      if (result.mode === "mock") {
        Alert.alert("Pembayaran berhasil", "Simulator menandai tagihan sebagai lunas.");
      } else {
        Alert.alert(
          "Lanjutkan pembayaran",
          "Selesaikan pembayaran pada halaman Midtrans, lalu kembali dan buka ulang tab ini."
        );
      }
      await load();
    } catch (requestError) {
      setError(messageFromError(requestError, "Pembayaran gagal diproses."));
    } finally {
      setPayingId(null);
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
