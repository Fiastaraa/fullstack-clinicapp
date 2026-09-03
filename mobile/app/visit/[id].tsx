import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import {
  Card,
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
import type { Visit } from "../../src/types";
import { formatCurrency, formatDate, messageFromError } from "../../src/utils/format";

export default function VisitDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const visitId = Number(params.id);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!Number.isInteger(visitId) || visitId <= 0) {
      setError("ID kunjungan tidak valid.");
      setLoading(false);
      return;
    }
    try {
      setError("");
      const response = await clinicService.visit(visitId);
      setVisit(response.data);
    } catch (requestError) {
      setError(messageFromError(requestError, "Rekam medis gagal dimuat."));
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtimeRefresh(["visits", "prescriptions", "invoices"], load);

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader
        eyebrow={formatDate(visit?.visitDate)}
        title="Detail rekam medis"
        subtitle="Informasi klinis hanya berasal dari kunjungan milik akun ini."
        action={visit ? <StatusPill status={visit.status} /> : undefined}
      />
      {error ? <ErrorNotice message={error} /> : null}
      {visit ? (
        <>
          <Card>
            <Text style={uiStyles.sectionTitle}>Kunjungan</Text>
            <Info label="Dokter" value={visit.doctor.name} />
            <Info
              label="Poli"
              value={visit.poli?.name || visit.doctor.specialization}
            />
            <Info label="Keluhan" value={visit.complaint || "-"} />
            <Info label="Catatan" value={visit.notes || "-"} />
          </Card>

          <Card>
            <Text style={uiStyles.sectionTitle}>Tanda vital</Text>
            <View style={styles.grid}>
              <Vital label="Tekanan darah" value={visit.bloodPressure || "-"} />
              <Vital
                label="Suhu"
                value={visit.temperature ? visit.temperature + " °C" : "-"}
              />
              <Vital label="Berat" value={visit.weight ? visit.weight + " kg" : "-"} />
              <Vital label="Tinggi" value={visit.height ? visit.height + " cm" : "-"} />
            </View>
          </Card>

          <Card>
            <Text style={uiStyles.sectionTitle}>Diagnosis</Text>
            {visit.diagnoses.length === 0 ? (
              <Text style={uiStyles.muted}>Belum ada diagnosis.</Text>
            ) : (
              visit.diagnoses.map((diagnosis) => (
                <View key={diagnosis.id} style={styles.item}>
                  <Text style={uiStyles.strong}>{diagnosis.diagnosisName}</Text>
                  {diagnosis.notes ? (
                    <Text style={uiStyles.muted}>{diagnosis.notes}</Text>
                  ) : null}
                </View>
              ))
            )}
          </Card>

          <Card>
            <Text style={uiStyles.sectionTitle}>Resep obat</Text>
            {visit.prescriptions.length === 0 ? (
              <Text style={uiStyles.muted}>Tidak ada resep obat.</Text>
            ) : (
              visit.prescriptions.map((prescription) => (
                <View key={prescription.id} style={styles.prescription}>
                  <View style={styles.flex}>
                    <Text style={uiStyles.strong}>{prescription.medicine.name}</Text>
                    <Text style={uiStyles.muted}>
                      {prescription.medicine.dosage} · {prescription.quantity} item
                    </Text>
                  </View>
                  <StatusPill status={prescription.status} />
                </View>
              ))
            )}
          </Card>

          {visit.invoice ? (
            <Card>
              <View style={uiStyles.rowBetween}>
                <Text style={uiStyles.sectionTitle}>Tagihan</Text>
                <StatusPill status={visit.invoice.status} />
              </View>
              <Text style={styles.total}>{formatCurrency(visit.invoice.total)}</Text>
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={uiStyles.muted}>{label}</Text>
      <Text style={uiStyles.body}>{value}</Text>
    </View>
  );
}

function Vital({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.vital}>
      <Text style={uiStyles.muted}>{label}</Text>
      <Text style={uiStyles.strong}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  info: { gap: 3, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  vital: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: 13,
    padding: 12,
    gap: 5
  },
  item: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
    gap: 4
  },
  prescription: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 11
  },
  flex: { flex: 1 },
  total: { color: colors.tealDark, fontSize: 25, fontWeight: "900" }
});
