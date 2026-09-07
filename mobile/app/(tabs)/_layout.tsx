import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../src/constants/theme";

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "home-outline",
  queue: "time-outline",
  history: "document-text-outline",
  invoices: "receipt-outline",
  schedule: "calendar-outline"
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }: { route: { name: string } }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          height: 66,
          paddingTop: 6,
          paddingBottom: 8,
          borderTopColor: colors.border,
          backgroundColor: colors.white
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "800" },
        tabBarIcon: ({ color, size }: { color: any; size: number }) => (
          <Ionicons name={icons[route.name]} color={color} size={size} />
        )
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Beranda" }} />
      <Tabs.Screen name="queue" options={{ title: "Antrean" }} />
      <Tabs.Screen name="history" options={{ title: "Riwayat" }} />
      <Tabs.Screen name="invoices" options={{ title: "Tagihan" }} />
      <Tabs.Screen name="schedule" options={{ title: "Jadwal" }} />
    </Tabs>
  );
}
