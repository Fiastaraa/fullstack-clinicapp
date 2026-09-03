import { useCallback, useState } from "react";
import { Link, useFocusEffect } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
import { colors } from "../../src/constants/theme";
import { useRealtimeRefresh } from "../../src/hooks/useRealtimeRefresh";
import { clinicService } from "../../src/services/clinicService";
import type { Visit } from "../../src/types";
import { formatDate, messageFromError } from "../../src/utils/format";

export default function HistoryScreen() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const response = await clinicService.visits("all");
      setVisits(
        response.data
          .filter((visit) => ["COMPLETED", "PAID"].includes(visit.status))
          .sort(
            (left, right) =>
              new Date(right.visitDate).getTime() -
              new Date(left.visitDate).getTime()
          )
      );
    } catch (requestError) {
      setError(messageFromError(requestError, "Riwayat medis gagal dimuat."));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));
  useRealtimeRefresh(["visits", "prescriptions"], load);

  return (
    <Screen>
      <PageHeader
        eyebrow="Rahasia & pribadi"
        title="Riwayat medis"
        subtitle="Hanya rekam medis yang terhubung ke akun pasien ini yang ditampilkan."
      />
      {error ? <ErrorNotice message={error} /> : null}
      {loading ? (
        <LoadingState />
      ) : visits.length === 0 ? (
        <EmptyState
          title="Belum ada riwayat kunjungan"
          description="Rekam medis muncul setelah konsultasi selesai."
        />
      ) : (
        visits.map((visit) => (
          <Link
            key={visit.id}
            href={{ pathname: "/visit/[id]", params: { id: String(visit.id) } }}
            asChild
          >
            <Pressable>
              <Card>
                <View style={uiStyles.rowBetween}>
                  <Text style={styles.date}>{formatDate(visit.visitDate)}</Text>
                  <StatusPill status={visit.status} />
                </View>
                <Text style={[uiStyles.strong, styles.doctor]}>
                  {visit.doctor.name}
                </Text>
                <Text style={uiStyles.muted}>
                  {visit.poli?.name || visit.doctor.specialization}
                </Text>
                <View style={uiStyles.divider} />
                <Text style={uiStyles.body}>
                  Diagnosis: {visit.diagnoses[0]?.diagnosisName || "Belum dicatat"}
                </Text>
                <Text style={styles.detail}>Lihat detail rekam medis →</Text>
              </Card>
            </Pressable>
          </Link>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  date: { color: colors.tealDark, fontSize: 12, fontWeight: "900" },
  doctor: { marginTop: 14 },
  detail: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 12
  }
});
