import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "../src/constants/theme";
import { RealtimeProvider } from "../src/context/RealtimeContext";
import { SessionProvider, useSession } from "../src/context/SessionContext";

function Navigation() {
  const { user, isHydrating } = useSession();
  if (isHydrating) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.teal} />
        <Text style={styles.loadingText}>Memulihkan sesi AssistDoc...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: styles.content }}>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(user)}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="registration"
            options={{
              headerShown: true,
              title: "Pendaftaran Antrean",
              headerTintColor: colors.navy,
              headerShadowVisible: false
            }}
          />
          <Stack.Screen
            name="profile"
            options={{
              headerShown: true,
              title: "Profil Pasien",
              headerTintColor: colors.navy,
              headerShadowVisible: false
            }}
          />
          <Stack.Screen
            name="visit/[id]"
            options={{
              headerShown: true,
              title: "Detail Rekam Medis",
              headerTintColor: colors.navy,
              headerShadowVisible: false
            }}
          />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <RealtimeProvider>
        <Navigation />
      </RealtimeProvider>
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: colors.cream },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream
  },
  loadingText: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 12
  }
});
