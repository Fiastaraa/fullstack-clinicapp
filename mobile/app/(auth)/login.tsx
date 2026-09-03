import { useState } from "react";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, ErrorNotice, Field, Screen } from "../../src/components/ui";
import { colors } from "../../src/constants/theme";
import { useSession } from "../../src/context/SessionContext";
import { messageFromError } from "../../src/utils/format";

export default function LoginScreen() {
  const { login } = useSession();
  const [email, setEmail] = useState("patient@assistdoc.com");
  const [password, setPassword] = useState("Admin12345");
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch (requestError) {
      setError(messageFromError(requestError, "Login pasien gagal."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Ionicons name="medkit" size={34} color={colors.teal} />
        </View>
        <Text style={styles.brandName}>AssistDoc</Text>
        <Text style={styles.brandCaption}>APLIKASI PASIEN KLINIK</Text>
      </View>

      <Card>
        <Text style={styles.title}>Selamat datang</Text>
        <Text style={styles.subtitle}>
          Masuk untuk melihat antrean, rekam medis, tagihan, dan jadwal kontrol Anda.
        </Text>
        {error ? <ErrorNotice message={error} /> : null}
        <Field
          label="Alamat email pasien"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <View>
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={secure}
            autoCapitalize="none"
          />
          <Pressable
            onPress={() => setSecure((current) => !current)}
            style={styles.eye}
            accessibilityLabel={secure ? "Tampilkan password" : "Sembunyikan password"}
          >
            <Ionicons
              name={secure ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={colors.muted}
            />
          </Pressable>
        </View>
        <Button label="Masuk ke AssistDoc" onPress={submit} disabled={loading} />
        <Text style={styles.registerText}>
          Belum punya akun?{" "}
          <Link href="/register" style={styles.link}>
            Daftar pasien baru
          </Link>
        </Text>
      </Card>

      <Text style={styles.demo}>
        Akun demo: patient@assistdoc.com / Admin12345
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: "center", paddingTop: 28, paddingBottom: 24 },
  logo: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center"
  },
  brandName: {
    color: colors.navy,
    fontSize: 31,
    fontWeight: "900",
    marginTop: 11
  },
  brandCaption: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: 3
  },
  title: { color: colors.navy, fontSize: 22, fontWeight: "900" },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    marginBottom: 18
  },
  eye: { position: "absolute", right: 14, top: 38, padding: 6 },
  registerText: {
    color: colors.muted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 18
  },
  link: { color: colors.teal, fontWeight: "900" },
  demo: { color: colors.muted, fontSize: 11, textAlign: "center", marginTop: 4 }
});
