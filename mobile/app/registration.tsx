import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Button,
  Card,
  ErrorNotice,
  Field,
  LoadingState,
  PageHeader,
  Screen,
  uiStyles
} from "../src/components/ui";
import { colors } from "../src/constants/theme";
import { clinicService } from "../src/services/clinicService";
import type { Doctor, Poli } from "../src/types";
import { messageFromError } from "../src/utils/format";

export default function RegistrationScreen() {
  const router = useRouter();
  const [polis, setPolis] = useState<Poli[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [poliId, setPoliId] = useState<number | null>(null);
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [complaint, setComplaint] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([clinicService.polis(), clinicService.doctors()])
      .then(([poliResponse, doctorResponse]) => {
        setPolis(poliResponse.data);
        setDoctors(doctorResponse.data);
      })
      .catch((requestError) => {
        setError(messageFromError(requestError, "Data poli gagal dimuat."));
      })
      .finally(() => setLoading(false));
  }, []);

  const availableDoctors = useMemo(
    () => doctors.filter((doctor) => !poliId || doctor.poliId === poliId),
    [doctors, poliId]
  );

  async function submit() {
    if (!poliId || !doctorId) {
      setError("Pilih poli dan dokter terlebih dahulu.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await clinicService.createVisit({
        poliId,
        doctorId,
        complaint: complaint.trim() || undefined
      });
      router.replace("/queue");
    } catch (requestError) {
      setError(messageFromError(requestError, "Pendaftaran antrean gagal."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Kunjungan hari ini"
        title="Daftar antrean poli"
        subtitle="Pilih layanan dan dokter. Nomor antrean akan langsung terlihat oleh staf klinik."
      />
      {error ? <ErrorNotice message={error} /> : null}
      {loading ? (
        <LoadingState />
      ) : (
        <Card>
          <Text style={uiStyles.sectionTitle}>1. Pilih poli</Text>
          <View style={styles.options}>
            {polis.map((poli) => (
              <Option
                key={poli.id}
                title={poli.name}
                subtitle={poli.code}
                active={poliId === poli.id}
                onPress={() => {
                  setPoliId(poli.id);
                  setDoctorId(null);
                }}
              />
            ))}
          </View>

          <Text style={[uiStyles.sectionTitle, styles.section]}>
            2. Pilih dokter
          </Text>
          <View style={styles.options}>
            {availableDoctors.length === 0 ? (
              <Text style={uiStyles.muted}>Belum ada dokter pada poli ini.</Text>
            ) : (
              availableDoctors.map((doctor) => (
                <Option
                  key={doctor.id}
                  title={doctor.name}
                  subtitle={doctor.specialization}
                  active={doctorId === doctor.id}
                  onPress={() => setDoctorId(doctor.id)}
                />
              ))
            )}
          </View>

          <View style={styles.section}>
            <Field
              label="Keluhan utama (opsional)"
              value={complaint}
              onChangeText={setComplaint}
              multiline
              placeholder="Jelaskan keluhan singkat yang dirasakan..."
            />
          </View>
          <Button
            label="Ambil nomor antrean"
            onPress={submit}
            disabled={saving}
          />
        </Card>
      )}
    </Screen>
  );
}

function Option({
  title,
  subtitle,
  active,
  onPress
}: {
  title: string;
  subtitle: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.option, active && styles.optionActive]}
    >
      <View style={styles.optionText}>
        <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>
          {title}
        </Text>
        <Text style={[styles.optionSubtitle, active && styles.optionSubtitleActive]}>
          {subtitle}
        </Text>
      </View>
      <View style={[styles.radio, active && styles.radioActive]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  options: { gap: 8 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 13
  },
  optionActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  optionText: { flex: 1 },
  optionTitle: { color: colors.navy, fontSize: 13, fontWeight: "900" },
  optionTitleActive: { color: colors.white },
  optionSubtitle: { color: colors.muted, fontSize: 11, marginTop: 3 },
  optionSubtitleActive: { color: "#CBD5E1" },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border
  },
  radioActive: { borderWidth: 5, borderColor: colors.teal },
  section: { marginTop: 22 }
});
