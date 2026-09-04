import { useState } from "react";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Card, ErrorNotice, Field, PageHeader, Screen } from "../../src/components/ui";
import { colors } from "../../src/constants/theme";
import { useSession } from "../../src/context/SessionContext";
import type { RegisterPatientInput } from "../../src/types";
import { messageFromError } from "../../src/utils/format";

const initialForm: RegisterPatientInput = {
  name: "",
  email: "",
  password: "",
  nik: "",
  birthDate: "",
  gender: "Male",
  phone: "",
  address: ""
};

export default function RegisterScreen() {
  const { register } = useSession();
  const [form, setForm] = useState(initialForm);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof RegisterPatientInput>(
    key: K,
    value: RegisterPatientInput[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    if (!form.name.trim() || form.name.trim().length < 2) {
      setError("Nama lengkap minimal 2 karakter.");
      return;
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Format email tidak valid.");
      return;
    }
    if (form.nik && form.nik.trim().length !== 16) {
      setError("NIK harus tepat 16 digit angka (atau kosongkan jika opsional).");
      return;
    }
    if (!form.birthDate.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(form.birthDate.trim())) {
      setError("Format tanggal lahir harus YYYY-MM-DD (contoh: 2000-10-16).");
      return;
    }
    if (!form.phone.trim() || !/^\+?[0-9]{8,15}$/.test(form.phone.trim())) {
      setError("Nomor HP harus terdiri dari 8 hingga 15 digit angka.");
      return;
    }
    if (!form.address.trim() || form.address.trim().length < 5) {
      setError("Alamat minimal 5 karakter.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    if (form.password !== confirmPassword) {
      setError("Konfirmasi password tidak sama.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register({ ...form, nik: form.nik || undefined });
    } catch (requestError) {
      setError(messageFromError(requestError, "Pendaftaran pasien gagal."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Akun pribadi"
        title="Daftar pasien baru"
        subtitle="Data ini terhubung langsung ke profil pasien di klinik."
      />
      <Card>
        {error ? <ErrorNotice message={error} /> : null}
        <Field
          label="Nama lengkap"
          value={form.name}
          onChangeText={(value) => update("name", value)}
          autoCapitalize="words"
        />
        <Field
          label="Email"
          value={form.email}
          onChangeText={(value) => update("email", value)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="NIK (opsional, 16 digit)"
          value={form.nik}
          onChangeText={(value) => update("nik", value.replace(/\D/g, ""))}
          keyboardType="number-pad"
          maxLength={16}
        />
        <Field
          label="Tanggal lahir (YYYY-MM-DD)"
          value={form.birthDate}
          onChangeText={(value) => update("birthDate", value)}
          placeholder="1995-04-23"
          autoCapitalize="none"
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
          placeholder="081234567890"
        />
        <Field
          label="Alamat"
          value={form.address}
          onChangeText={(value) => update("address", value)}
          multiline
        />
        <Field
          label="Password (minimal 8 karakter)"
          value={form.password}
          onChangeText={(value) => update("password", value)}
          secureTextEntry
        />
        <Field
          label="Konfirmasi password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        <Button label="Buat akun pasien" onPress={submit} disabled={loading} />
        <Text style={styles.loginText}>
          Sudah punya akun?{" "}
          <Link href="/login" style={styles.link}>
            Kembali ke login
          </Link>
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  genderTextActive: { color: colors.white },
  loginText: {
    color: colors.muted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 18
  },
  link: { color: colors.teal, fontWeight: "900" }
});
