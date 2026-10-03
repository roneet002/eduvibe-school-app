import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth/auth-context";
import { useLanguage } from "@/src/i18n/language";
import { makeStyles, useTheme } from "@/src/theme";

export default function RegisterScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { register } = useAuth();
  const { t, language, toggle } = useLanguage();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "admin">("student");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!name || !email || password.length < 6) {
      setError(t("Fill all fields (password 6+ chars)", "सभी फ़ील्ड भरें (पासवर्ड 6+ अक्षर)"));
      return;
    }
    setSubmitting(true);
    try {
      await register({ name: name.trim(), email: email.trim().toLowerCase(), password, role });
      router.replace("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined} testID="register-screen">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]} testID="register-back">
            <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
          </Pressable>
          <Pressable testID="language-toggle" onPress={toggle} style={({ pressed }) => [styles.langPill, pressed && styles.pressed]}>
            <Text style={styles.langText}>{language === "EN" ? "A/अ" : "अ/A"}</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>{t("Create your account", "अपना खाता बनाएँ")}</Text>
        <Text style={styles.subtitle}>{t("Join EduVibe as a student or admin", "छात्र या एडमिन के रूप में शामिल हों")}</Text>

        <View style={styles.roleRow}>
          <Pressable
            testID="role-student"
            onPress={() => setRole("student")}
            style={({ pressed }) => [styles.roleChip, role === "student" && styles.roleActive, pressed && styles.pressed]}
          >
            <Ionicons name="school-outline" size={16} color={role === "student" ? colors.onBrandPrimary : colors.brandPrimary} />
            <Text style={[styles.roleText, role === "student" && styles.roleTextActive]}>{t("Student", "छात्र")}</Text>
          </Pressable>
          <Pressable
            testID="role-admin"
            onPress={() => setRole("admin")}
            style={({ pressed }) => [styles.roleChip, role === "admin" && styles.roleActive, pressed && styles.pressed]}
          >
            <Ionicons name="shield-checkmark-outline" size={16} color={role === "admin" ? colors.onBrandPrimary : colors.brandPrimary} />
            <Text style={[styles.roleText, role === "admin" && styles.roleTextActive]}>{t("Admin", "एडमिन")}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t("Full name", "पूरा नाम")}</Text>
          <TextInput testID="reg-name" value={name} onChangeText={setName} placeholder={t("Your name", "आपका नाम")} placeholderTextColor={colors.muted} style={styles.input} />
          <Text style={styles.label}>{t("Email", "ईमेल")}</Text>
          <TextInput testID="reg-email" value={email} onChangeText={setEmail} placeholder="you@school.com" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="email-address" style={styles.input} />
          <Text style={styles.label}>{t("Password", "पासवर्ड")}</Text>
          <TextInput testID="reg-password" value={password} onChangeText={setPassword} placeholder="••••••" placeholderTextColor={colors.muted} secureTextEntry style={styles.input} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable testID="reg-submit" onPress={onSubmit} disabled={submitting} style={({ pressed }) => [styles.primary, pressed && styles.pressed, submitting && styles.disabled]}>
            {submitting ? <ActivityIndicator color={colors.onBrandPrimary} /> : (
              <>
                <Ionicons name="person-add-outline" size={18} color={colors.onBrandPrimary} />
                <Text style={styles.primaryText}>{t("Create account", "खाता बनाएँ")}</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t("Already have an account?", "पहले से खाता है?")} </Text>
          <Link href="/login" testID="go-login"><Text style={styles.footerLink}>{t("Sign in", "साइन इन")}</Text></Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    content: { paddingHorizontal: 20, gap: 14 },
    topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
    langPill: { minWidth: 48, height: 36, borderRadius: 18, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
    langText: { color: colors.onBrandTertiary, fontSize: 13, fontWeight: "600" },
    title: { color: colors.onSurface, fontSize: 24, fontWeight: "700", marginTop: 8 },
    subtitle: { color: colors.muted, fontSize: 13 },
    roleRow: { flexDirection: "row", gap: 10, marginTop: 4 },
    roleChip: { flex: 1, minHeight: 48, borderRadius: 999, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
    roleActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
    roleText: { color: colors.brandPrimary, fontWeight: "600" },
    roleTextActive: { color: colors.onBrandPrimary },
    card: { backgroundColor: colors.surfaceSecondary, borderRadius: 24, padding: 20, gap: 10, borderWidth: 1, borderColor: colors.border },
    label: { color: colors.onSurface, fontSize: 13, fontWeight: "600", marginTop: 6 },
    input: { minHeight: 52, borderRadius: 16, backgroundColor: colors.surfaceTertiary, paddingHorizontal: 16, color: colors.onSurface, fontSize: 15 },
    primary: { minHeight: 52, borderRadius: 999, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 14 },
    primaryText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "700" },
    error: { color: colors.error, fontSize: 13, marginTop: 6 },
    footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 10 },
    footerText: { color: colors.muted, fontSize: 13 },
    footerLink: { color: colors.brandPrimary, fontSize: 13, fontWeight: "700" },
    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.6 },
  }),
);
