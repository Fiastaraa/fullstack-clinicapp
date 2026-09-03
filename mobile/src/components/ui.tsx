import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, shadow } from "../constants/theme";

export function Screen({
  children,
  scroll = true
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  const content = <View style={styles.content}>{children}</View>;
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function Card({
  children,
  style
}: {
  children: ReactNode;
  style?: object;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#94A3B8"
        {...props}
        style={[styles.input, props.multiline && styles.multiline, props.style]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function Button({
  label,
  onPress,
  disabled,
  variant = "primary"
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        (disabled || pressed) && styles.buttonPressed
      ]}
    >
      {disabled ? (
        <ActivityIndicator color={variant === "secondary" ? colors.navy : colors.white} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === "secondary" && styles.buttonSecondaryText
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const statusMap: Record<string, { background: string; color: string; label: string }> = {
  WAITING: { background: colors.warningSoft, color: colors.warning, label: "Menunggu" },
  CALLED: { background: colors.infoSoft, color: colors.tealDark, label: "Dipanggil" },
  IN_CONSULTATION: { background: colors.infoSoft, color: colors.tealDark, label: "Konsultasi" },
  COMPLETED: { background: colors.successSoft, color: colors.success, label: "Selesai" },
  PAID: { background: colors.successSoft, color: colors.success, label: "Lunas" },
  UNPAID: { background: colors.warningSoft, color: colors.warning, label: "Belum Bayar" },
  PENDING: { background: colors.warningSoft, color: colors.warning, label: "Menunggu" },
  SENT: { background: colors.infoSoft, color: colors.tealDark, label: "Terkirim" },
  READY: { background: colors.successSoft, color: colors.success, label: "Siap" }
};

export function StatusPill({ status }: { status: string }) {
  const tone = statusMap[status] || {
    background: colors.surface,
    color: colors.muted,
    label: status
  };
  return (
    <View style={[styles.pill, { backgroundColor: tone.background }]}>
      <Text style={[styles.pillText, { color: tone.color }]}>{tone.label}</Text>
    </View>
  );
}

export function LoadingState({ label = "Memuat data..." }: { label?: string }) {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator color={colors.teal} size="large" />
      <Text style={styles.centerText}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <Card style={styles.centerState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.centerText}>{description}</Text>
    </Card>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  return (
    <View style={styles.errorNotice}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export const uiStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10
  },
  body: { color: colors.ink, fontSize: 14, lineHeight: 21 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  strong: { color: colors.navy, fontSize: 14, fontWeight: "800" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  gap: { gap: 12 }
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 28 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20
  },
  headerText: { flex: 1 },
  eyebrow: {
    color: colors.teal,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 4
  },
  title: { color: colors.navy, fontSize: 27, fontWeight: "900", lineHeight: 32 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
    ...shadow
  },
  fieldWrap: { marginBottom: 14 },
  label: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 7
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
    color: colors.ink,
    fontSize: 14
  },
  multiline: { minHeight: 92, paddingTop: 13, textAlignVertical: "top" },
  fieldError: { color: colors.danger, fontSize: 11, marginTop: 5 },
  button: {
    minHeight: 48,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: colors.teal
  },
  buttonSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border
  },
  buttonDanger: { backgroundColor: colors.danger },
  buttonPressed: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: 14, fontWeight: "800" },
  buttonSecondaryText: { color: colors.navy },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  centerState: {
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    padding: 22
  },
  centerText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 8
  },
  emptyTitle: { color: colors.navy, fontSize: 16, fontWeight: "900" },
  errorNotice: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#FECDD3",
    backgroundColor: colors.dangerSoft,
    padding: 12,
    marginBottom: 14
  },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: "700", lineHeight: 18 }
});
