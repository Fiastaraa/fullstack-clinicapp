import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import VisualCalendar from "../../src/components/VisualCalendar";
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
import type { Reminder } from "../../src/types";
import { formatDate, messageFromError } from "../../src/utils/format";

export default function ScheduleScreen() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const response = await clinicService.reminders();
      setReminders(response.data);
    } catch (requestError) {
      setError(messageFromError(requestError, "Jadwal gagal dimuat."));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));
  useRealtimeRefresh(["reminders"], load);

  async function toggle(reminder: Reminder) {
    // If hangus, do not allow toggling
    if (reminder.effectiveStatus === "HANGUS" || reminder.isHangus) {
      return;
    }
    try {
      await clinicService.updateReminderStatus(
        reminder.id,
        reminder.status === "COMPLETED" ? "PENDING" : "COMPLETED"
      );
      await load();
    } catch (requestError) {
      setError(messageFromError(requestError, "Status pengingat gagal diubah."));
    }
  }

  // Calendar events for VisualCalendar
  const calendarEvents = useMemo(() => {
    return reminders.map((r) => ({
      date: r.date,
      isHangus: r.effectiveStatus === "HANGUS" || r.isHangus,
      isCompleted: r.status === "COMPLETED"
    }));
  }, [reminders]);

  // Filter reminders by selected date if one is selected
  const filteredReminders = useMemo(() => {
    if (!selectedDate) return reminders;
    return reminders.filter((r) => {
      if (!r.date) return false;
      return r.date.substring(0, 10) === selectedDate;
    });
  }, [reminders, selectedDate]);

  return (
    <Screen>
      <PageHeader
        eyebrow="Kontrol Pasien"
        title="Jadwal & Pengingat"
        subtitle="Jadwal kontrol ditetapkan langsung oleh dokter pemeriksa sesuai kondisi klinis Anda."
      />

      {error ? <ErrorNotice message={error} /> : null}

      {/* Info notice about doctor authority & admin reschedule */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoTitle}>📋 Ketentuan Jadwal Kontrol:</Text>
        <Text style={styles.infoText}>
          • Jadwal kontrol baru <Text style={styles.bold}>hanya dapat dibuat oleh Dokter</Text> yang memeriksa.{"\n"}
          • Jika Anda berhalangan hadir, hubungi <Text style={styles.bold}>Admin Klinik</Text> untuk menjadwalkan ulang (Reschedule).{"\n"}
          • Jadwal yang terlewat tanpa kehadiran otomatis dinyatakan <Text style={styles.boldDanger}>HANGUS</Text>.
        </Text>
      </View>

      {/* Visual Calendar Component */}
      <VisualCalendar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        events={calendarEvents}
      />

      {/* List Header */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>
          {selectedDate ? `Jadwal Tanggal: ${formatDate(selectedDate)}` : "Semua Jadwal Kontrol"}
        </Text>
        <Text style={styles.listCount}>{filteredReminders.length} Jadwal</Text>
      </View>

      {loading ? (
        <LoadingState label="Memuat jadwal kontrol..." />
      ) : filteredReminders.length === 0 ? (
        <EmptyState
          title={selectedDate ? "Tidak Ada Jadwal di Tanggal Ini" : "Belum Ada Jadwal Kontrol"}
          description={
            selectedDate
              ? "Tidak ada riwayat kontrol yang dijadwalkan pada tanggal ini."
              : "Jadwal kontrol akan otomatis muncul di sini setelah dokter menyelesaikan konsultasi."
          }
        />
      ) : (
        filteredReminders.map((reminder) => {
          const effectiveStatus = reminder.effectiveStatus || reminder.status;
          const isHangus = effectiveStatus === "HANGUS" || reminder.isHangus;
          const isCompleted = reminder.status === "COMPLETED";

          return (
            <Card
              key={reminder.id}
              style={[
                styles.card,
                isCompleted && styles.completedCard,
                isHangus && styles.hangusCard
              ]}
            >
              <View style={uiStyles.rowBetween}>
                <View style={styles.typeTag}>
                  <Text style={styles.typeLabel}>
                    {reminder.type ? reminder.type.replace("_", " ") : "KONTROL"}
                  </Text>
                </View>
                <StatusPill status={effectiveStatus} />
              </View>

              <Text style={[uiStyles.strong, styles.title, isHangus && styles.hangusText]}>
                {reminder.title}
              </Text>
              <Text style={uiStyles.muted}>📅 {formatDate(reminder.date)}</Text>

              {reminder.notes ? (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>Catatan Dokter:</Text>
                  <Text style={[uiStyles.body, styles.notes]}>{reminder.notes}</Text>
                </View>
              ) : null}

              {/* HANGUS WARNING ALERT */}
              {isHangus ? (
                <View style={styles.hangusAlert}>
                  <Text style={styles.hangusAlertTitle}>⚠️ Jadwal Hangus (Tidak Hadir)</Text>
                  <Text style={styles.hangusAlertText}>
                    Jadwal kontrol ini telah melewati tanggal kunjung dan dinyatakan hangus. Silakan hubungi meja registrasi / Admin klinik jika Anda ingin melakukan penjadwalan ulang.
                  </Text>
                </View>
              ) : (
                <Pressable onPress={() => toggle(reminder)} style={styles.toggle}>
                  <Text style={styles.toggleText}>
                    {isCompleted ? "Tandai Belum Selesai" : "Tandai Sudah Selesai"}
                  </Text>
                </Pressable>
              )}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  infoBanner: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14
  },
  infoTitle: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4
  },
  infoText: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17
  },
  bold: {
    fontWeight: "800",
    color: colors.navy
  },
  boldDanger: {
    fontWeight: "900",
    color: colors.danger
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 2
  },
  listTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.navy
  },
  listCount: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.tealDark
  },
  card: {
    marginBottom: 12
  },
  completedCard: {
    opacity: 0.65
  },
  hangusCard: {
    borderColor: "#FECDD3",
    backgroundColor: "#FFF5F5"
  },
  typeTag: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  typeLabel: {
    color: colors.teal,
    fontSize: 10,
    fontWeight: "900"
  },
  title: {
    marginTop: 10,
    fontSize: 15,
    color: colors.navy
  },
  hangusText: {
    color: colors.danger
  },
  notesContainer: {
    backgroundColor: colors.white,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.muted,
    marginBottom: 2
  },
  notes: {
    fontSize: 12,
    color: colors.ink
  },
  hangusAlert: {
    marginTop: 12,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5"
  },
  hangusAlertTitle: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 2
  },
  hangusAlertText: {
    color: "#991B1B",
    fontSize: 10,
    lineHeight: 15
  },
  toggle: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 14,
    paddingTop: 12
  },
  toggleText: {
    color: colors.tealDark,
    fontSize: 11,
    fontWeight: "900",
    textAlign: "right"
  }
});
