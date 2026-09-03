import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  Field,
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

const initialForm = {
  type: "KONTROL" as Reminder["type"],
  title: "",
  date: "",
  notes: ""
};

export default function ScheduleScreen() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  async function create() {
    if (!form.title.trim() || !form.date.trim()) {
      setError("Judul dan tanggal pengingat wajib diisi.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await clinicService.createReminder(form);
      setForm(initialForm);
      setShowForm(false);
      await load();
    } catch (requestError) {
      setError(messageFromError(requestError, "Pengingat gagal dibuat."));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(reminder: Reminder) {
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

  return (
    <Screen>
      <PageHeader
        eyebrow="Kontrol pasien"
        title="Jadwal & pengingat"
        subtitle="Catat kontrol ulang, vaksinasi, atau pemeriksaan laboratorium."
        action={
          <Pressable onPress={() => setShowForm((current) => !current)}>
            <Text style={styles.add}>{showForm ? "Tutup" : "+ Tambah"}</Text>
          </Pressable>
        }
      />
      {error ? <ErrorNotice message={error} /> : null}
      {showForm ? (
        <Card>
          <Text style={uiStyles.sectionTitle}>Pengingat baru</Text>
          <Text style={styles.label}>Jenis pengingat</Text>
          <View style={styles.types}>
            {(["KONTROL", "VAKSINASI", "CEK_LAB"] as const).map((type) => (
              <Pressable
                key={type}
                onPress={() => setForm((current) => ({ ...current, type }))}
                style={[
                  styles.typeButton,
                  form.type === type && styles.typeButtonActive
                ]}
              >
                <Text
                  style={[
                    styles.typeText,
                    form.type === type && styles.typeTextActive
                  ]}
                >
                  {type.replace("_", " ")}
                </Text>
              </Pressable>
            ))}
          </View>
          <Field
            label="Judul"
            value={form.title}
            onChangeText={(title) => setForm((current) => ({ ...current, title }))}
            placeholder="Kontrol rutin dokter"
          />
          <Field
            label="Tanggal (YYYY-MM-DD)"
            value={form.date}
            onChangeText={(date) => setForm((current) => ({ ...current, date }))}
            placeholder="2026-09-10"
          />
          <Field
            label="Catatan"
            value={form.notes}
            onChangeText={(notes) => setForm((current) => ({ ...current, notes }))}
            multiline
          />
          <Button label="Simpan pengingat" onPress={create} disabled={saving} />
        </Card>
      ) : null}

      {loading ? (
        <LoadingState />
      ) : reminders.length === 0 ? (
        <EmptyState
          title="Belum ada jadwal"
          description="Tambahkan pengingat agar jadwal kontrol tidak terlewat."
        />
      ) : (
        reminders.map((reminder) => (
          <Card
            key={reminder.id}
            style={reminder.status === "COMPLETED" ? styles.completed : undefined}
          >
            <View style={uiStyles.rowBetween}>
              <Text style={styles.typeLabel}>{reminder.type.replace("_", " ")}</Text>
              <StatusPill status={reminder.status} />
            </View>
            <Text style={[uiStyles.strong, styles.title]}>{reminder.title}</Text>
            <Text style={uiStyles.muted}>{formatDate(reminder.date)}</Text>
            {reminder.notes ? (
              <Text style={[uiStyles.body, styles.notes]}>{reminder.notes}</Text>
            ) : null}
            <Pressable onPress={() => toggle(reminder)} style={styles.toggle}>
              <Text style={styles.toggleText}>
                {reminder.status === "COMPLETED"
                  ? "Tandai belum selesai"
                  : "Tandai selesai"}
              </Text>
            </Pressable>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  add: { color: colors.teal, fontSize: 12, fontWeight: "900", paddingTop: 8 },
  label: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 7
  },
  types: { flexDirection: "row", gap: 6, marginBottom: 14 },
  typeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center"
  },
  typeButtonActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  typeText: { color: colors.muted, fontSize: 9, fontWeight: "900" },
  typeTextActive: { color: colors.white },
  typeLabel: { color: colors.teal, fontSize: 10, fontWeight: "900" },
  title: { marginTop: 13 },
  notes: { marginTop: 11 },
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
  },
  completed: { opacity: 0.65 }
});
