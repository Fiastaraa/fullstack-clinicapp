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

export default function QueueScreen() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const response = await clinicService.visits("today");
      setVisits(response.data);
    } catch (requestError) {
      setError(messageFromError(requestError, "Antrean gagal dimuat."));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));
  useRealtimeRefresh(["visits"], load);

  return (
    <Screen>
      <PageHeader
        eyebrow="Real-time"
        title="Antrean saya"
        subtitle="Status berubah otomatis saat staf klinik memanggil atau memulai pemeriksaan."
      />
      {error ? <ErrorNotice message={error} /> : null}
      {loading ? (
        <LoadingState />
      ) : visits.length === 0 ? (
        <>
          <EmptyState
            title="Belum ada antrean hari ini"
            description="Silakan daftar poli untuk mengambil nomor antrean."
          />
          <Link href="/registration" asChild>
            <Pressable style={styles.registerButton}>
              <Text style={styles.registerText}>Daftar antrean baru</Text>
            </Pressable>
          </Link>
        </>
      ) : (
        visits.map((visit) => (
          <Card key={visit.id}>
            <View style={uiStyles.rowBetween}>
              <View>
                <Text style={styles.queueLabel}>NOMOR ANTREAN</Text>
                <Text style={styles.queue}>{visit.queueNumber || "-"}</Text>
              </View>
              <StatusPill status={visit.status} />
            </View>
            <View style={uiStyles.divider} />
            <Text style={uiStyles.strong}>{visit.doctor.name}</Text>
            <Text style={uiStyles.muted}>
              {visit.poli?.name || visit.doctor.specialization}
            </Text>
            <Text style={[uiStyles.body, styles.complaint]}>
              Keluhan: {visit.complaint || "-"}
            </Text>
            <View style={styles.metaRow}>
              <Text style={uiStyles.muted}>{formatDate(visit.visitDate)}</Text>
              <Text style={styles.wait}>
                Estimasi {visit.estimatedWaitMinutes || 0} menit
              </Text>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  queueLabel: {
    color: colors.teal,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2
  },
  queue: { color: colors.navy, fontSize: 36, fontWeight: "900" },
  complaint: { marginTop: 12 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14
  },
  wait: { color: colors.tealDark, fontSize: 12, fontWeight: "800" },
  registerButton: {
    backgroundColor: colors.teal,
    borderRadius: 13,
    padding: 14,
    alignItems: "center"
  },
  registerText: { color: colors.white, fontWeight: "800" }
});
