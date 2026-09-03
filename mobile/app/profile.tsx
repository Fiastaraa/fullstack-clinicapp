import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Button,
  Card,
  ErrorNotice,
  Field,
  PageHeader,
  Screen
} from "../src/components/ui";
import { colors } from "../src/constants/theme";
import { useSession } from "../src/context/SessionContext";
import { messageFromError } from "../src/utils/format";

type ProfileForm = {
  name: string;
  nik: string;
  birthDate: string;
  gender: "Male" | "Female";
  phone: string;
  address: string;
};

export default function ProfileScreen() {
  const { patient, updateProfile } = useSession();
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    nik: "",
    birthDate: "",
    gender: "Male",
    phone: "",
    address: ""
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patient) return;
    setForm({
      name: patient.name,
      nik: patient.nik || "",
      birthDate: patient.birthDate?.slice(0, 10) || "",
      gender: patient.gender,
      phone: patient.phone,
      address: patient.address
    });
  }, [patient]);

  function update<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateProfile({
        name: form.name,
        nik: form.nik || null,
        birthDate: form.birthDate || null,
        gender: form.gender,
        phone: form.phone,
        address: form.address
      });
      setMessage("Profil pasien berhasil diperbarui.");
    } catch (requestError) {
      setError(messageFromError(requestError, "Profil gagal diperbarui."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <PageHeader
        eyebrow={"Patient #" + (patient?.id || "-")}
        title="Profil pasien"
        subtitle="Perubahan data akan langsung tersedia untuk staf klinik."
      />
      {error ? <ErrorNotice message={error} /> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}
      <Card>
        <Field
          label="Nama lengkap"
          value={form.name}
          onChangeText={(value) => update("name", value)}
        />
        <Field
          label="NIK"
          value={form.nik}
          onChangeText={(value) => update("nik", value.replace(/\D/g, ""))}
          keyboardType="number-pad"
          maxLength={16}
        />
        <Field
          label="Tanggal lahir (YYYY-MM-DD)"
          value={form.birthDate}
          onChangeText={(value) => update("birthDate", value)}
        />
        <Text style={styles.label}>Jenis kelamin</Text>
        <View style={styles.genderRow}>
          {(["Male", "Female"] as const).map((gender) => (
            <Pressable
              key={gender}
              onPress={() => update("gender", gender)}
              style={[
                styles.genderButton,
                form.gender === gender && styles.genderButtonActive
              ]}
            >
              <Text
                style={[
                  styles.genderText,
                  form.gender === gender && styles.genderTextActive
                ]}
              >
                {gender === "Male" ? "Laki-laki" : "Perempuan"}
              </Text>
            </Pressable>
          ))}
        </View>
        <Field
          label="Nomor HP"
          value={form.phone}
          onChangeText={(value) => update("phone", value)}
          keyboardType="phone-pad"
        />
        <Field
          label="Alamat"
          value={form.address}
          onChangeText={(value) => update("address", value)}
          multiline
        />
        <Button label="Simpan perubahan" onPress={save} disabled={saving} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  success: {
    color: colors.success,
    backgroundColor: colors.successSoft,
    borderRadius: 12,
    padding: 12,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 12
  },
  label: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 7
  },
  genderRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  genderButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    paddingVertical: 13,
    alignItems: "center"
  },
  genderButtonActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  genderText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  genderTextActive: { color: colors.white }
});
