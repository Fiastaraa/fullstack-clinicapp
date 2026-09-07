import { useCallback, useState } from "react";
import { Link, useFocusEffect } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
import { useSession } from "../../src/context/SessionContext";
import { useRealtimeRefresh } from "../../src/hooks/useRealtimeRefresh";
import { clinicService } from "../../src/services/clinicService";
import type { Reminder, Visit } from "../../src/types";
import { formatDate, messageFromError } from "../../src/utils/format";

export default function HomeScreen() {
  const { user, patient, logout } = useSession();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const [visitResponse, reminderResponse] = await Promise.all([
        clinicService.visits("today"),
        clinicService.reminders()
      ]);
      setVisits(visitResponse.data);
      setReminders(reminderResponse.data);
    } catch (requestError) {
      setError(messageFromError(requestError, "Data beranda gagal dimuat."));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));
  useRealtimeRefresh(["visits", "reminders", "invoices"], load);

  const activeVisit = visits.find(
    (visit) => !["COMPLETED", "PAID"].includes(visit.status)
  );
  const nextReminder = reminders.find(
    (reminder) =>
      reminder.status !== "COMPLETED" &&
      new Date(reminder.date).getTime() >= Date.now()
  );

  return (
    <Screen>
      <PageHeader
        eyebrow="AssistDoc Patient"
        title={"Halo, " + (patient?.name || user?.name || "Pasien")}
        subtitle="Informasi klinik pribadi Anda tersinkron dengan staf secara real-time."
        action={
          <Link href="/profile" asChild>
            <Pressable style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(patient?.name || "P").charAt(0).toUpperCase()}
              </Text>
            </Pressable>
          </Link>
        }
      />
      {error ? <ErrorNotice message={error} /> : null}
      {loading ? (
        <LoadingState />
      ) : (
        <>
          {activeVisit ? (
            <Card style={styles.queueCard}>
              <View style={uiStyles.rowBetween}>
                <View>
                  <Text style={styles.cardEyebrow}>ANTREAN AKTIF</Text>
                  <Text style={styles.queueNumber}>
                    {activeVisit.queueNumber || "-"}
                  </Text>
                </View>
                <StatusPill status={activeVisit.status} />
              </View>
              <Text style={styles.doctor}>{activeVisit.doctor.name}</Text>
              <Text style={styles.mutedLight}>
                {activeVisit.poli?.name || activeVisit.doctor.specialization}
              </Text>
              <View style={styles.waitRow}>
                <Ionicons name="time-outline" size={18} color={colors.white} />
                <Text style={styles.waitText}>
                  Estimasi {activeVisit.estimatedWaitMinutes || 0} menit
                </Text>
              </View>
            </Card>
          ) : (
            <Card>
              <Text style={uiStyles.sectionTitle}>Belum ada antrean aktif</Text>
              <Text style={uiStyles.muted}>
                Daftar kunjungan untuk mendapatkan nomor antrean poli hari ini.
              </Text>
              <Link href="/registration" asChild>
                <Pressable style={styles.primaryLink}>
                  <Text style={styles.primaryLinkText}>Daftar antrean baru</Text>
                </Pressable>
              </Link>
            </Card>
          )}

          <View style={styles.stats}>
            <Card style={styles.statCard}>
              <Ionicons name="document-text-outline" size={22} color={colors.teal} />
              <Text style={styles.statValue}>{patient?.age ?? "-"}</Text>
              <Text style={uiStyles.muted}>Usia pasien</Text>
            </Card>
            <Card style={styles.statCard}>
              <Ionicons name="calendar-outline" size={22} color={colors.teal} />
              <Text style={styles.statValue}>{reminders.length}</Text>
              <Text style={uiStyles.muted}>Jadwal kontrol</Text>
            </Card>
          </View>

          <Text style={uiStyles.sectionTitle}>Akses cepat</Text>
          <View style={styles.quickGrid}>
            <QuickLink href="/registration" icon="add-circle-outline" label="Daftar Poli" />
            <QuickLink href="/(tabs)/history" icon="folder-open-outline" label="Rekam Medis" />
            <QuickLink href="/(tabs)/invoices" icon="card-outline" label="Tagihan" />
            <QuickLink href="/profile" icon="person-outline" label="Profil" />
          </View>

          <Text style={[uiStyles.sectionTitle, styles.sectionSpacing]}>
            Jadwal terdekat
          </Text>
          {nextReminder ? (
            <Card>
              <View style={uiStyles.rowBetween}>
                <View style={styles.flex}>
                  <Text style={uiStyles.strong}>{nextReminder.title}</Text>
                  <Text style={uiStyles.muted}>
                    {formatDate(nextReminder.date)} · {nextReminder.type}
                  </Text>
                </View>
                <Ionicons name="notifications-outline" size={23} color={colors.teal} />
              </View>
            </Card>
          ) : (
            <Text style={uiStyles.muted}>Belum ada pengingat yang akan datang.</Text>
          )}

          <Pressable onPress={logout} style={styles.logout}>
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={styles.logoutText}>Keluar dari akun</Text>
          </Pressable>
        </>
      )}
    </Screen>
  );
}

function QuickLink({
  href,
  icon,
  label
}: {
  href: "/registration" | "/(tabs)/history" | "/(tabs)/invoices" | "/profile";
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <Link href={href} asChild>
      <Pressable style={styles.quickLink}>
        <View style={styles.quickIcon}>
          <Ionicons name={icon} size={23} color={colors.teal} />
        </View>
        <Text style={styles.quickText}>{label}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: { color: colors.white, fontWeight: "900", fontSize: 17 },
  queueCard: { backgroundColor: colors.navy, borderColor: colors.navy },
  cardEyebrow: {
    color: "#99E6EE",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4
  },
  queueNumber: {
    color: colors.white,
    fontSize: 38,
    fontWeight: "900",
    marginTop: 2
  },
  doctor: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 16
  },
  mutedLight: { color: "#CBD5E1", fontSize: 12, marginTop: 2 },
  waitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 16
  },
  waitText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  primaryLink: {
    backgroundColor: colors.teal,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 15
  },
  primaryLinkText: { color: colors.white, fontWeight: "800", fontSize: 13 },
  stats: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1 },
  statValue: {
    color: colors.navy,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 8
  },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickLink: {
    width: "48%",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.infoSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  quickText: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 10
  },
  sectionSpacing: { marginTop: 22 },
  flex: { flex: 1 },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: 14,
    marginTop: 10
  },
  logoutText: { color: colors.danger, fontSize: 12, fontWeight: "800" }
});
