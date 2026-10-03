import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth/auth-context";
import { useGoogleLogin } from "@/src/auth/use-google-login";
import { useLanguage } from "@/src/i18n/language";
import { makeStyles, useTheme } from "@/src/theme";

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loginWithPassword, status } = useAuth();
  const { signIn, loading: googleLoading, error: googleError } = useGoogleLogin();
  const { t, language, toggle } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [securePassword, setSecurePassword] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  const onSubmit = async () => {
    setError(null);
    if (!email || !password) {
      setError(t("Enter email and password", "ईमेल और पासवर्ड दर्ज करें"));
      return;
    }
    setSubmitting(true);
    try {
      await loginWithPassword(email.trim().toLowerCase(), password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (kind: "student" | "admin") => {
    if (kind === "student") {
      setEmail("student@eduvibe.com");
      setPassword("student123");
    } else {
      setEmail("admin@eduvibe.com");
      setPassword("admin123");
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined} testID="login-screen">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Ionicons name="school" size={22} color={colors.onBrandPrimary} />
            </View>
            <Text style={styles.brandText}>EduVibe</Text>
          </View>
          <Pressable testID="language-toggle" onPress={toggle} style={({ pressed }) => [styles.langPill, pressed && styles.pressed]}>
            <Text style={styles.langText}>{language === "EN" ? "A/अ" : "अ/A"}</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroEmoji}>
            <Text style={{ fontSize: 44 }}>🎒</Text>
          </View>
          <Text style={styles.heroTitle}>{t("Welcome back!", "वापसी पर स्वागत है!")}</Text>
          <Text style={styles.heroSub}>{t("Sign in to see your school day", "अपना स्कूल दिन देखने के लिए साइन इन करें")}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t("Email", "ईमेल")}</Text>
          <TextInput
            testID="login-email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@school.com"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <Text style={styles.label}>{t("Password", "पासवर्ड")}</Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              testID="login-password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              secureTextEntry={securePassword}
              style={[styles.input, styles.passwordInput]}
            />
            <Pressable
              testID="login-password-toggle"
              accessibilityRole="button"
              accessibilityLabel={securePassword ? t("Show password", "पासवर्ड दिखाएँ") : t("Hide password", "पासवर्ड छिपाएँ")}
              onPress={() => setSecurePassword((visible) => !visible)}
              style={({ pressed }) => [styles.passwordToggle, pressed && styles.pressed]}
            >
              <Ionicons name={securePassword ? "eye-outline" : "eye-off-outline"} size={20} color={colors.muted} />
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            testID="login-submit"
            onPress={onSubmit}
            disabled={submitting}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, submitting && styles.disabled]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.onBrandPrimary} />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color={colors.onBrandPrimary} />
                <Text style={styles.primaryText}>{t("Sign in", "साइन इन")}</Text>
              </>
            )}
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t("or", "या")}</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            testID="login-google"
            onPress={signIn}
            disabled={googleLoading}
            style={({ pressed }) => [styles.googleButton, pressed && styles.pressed, googleLoading && styles.disabled]}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.onSurface} />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color={colors.brandPrimary} />
                <Text style={styles.googleText}>{t("Continue with Google", "Google से जारी रखें")}</Text>
              </>
            )}
          </Pressable>
          {googleError ? <Text style={styles.error}>{googleError}</Text> : null}
        </View>

        <View style={styles.demoBox}>
          <Text style={styles.demoTitle}>{t("Try demo accounts", "डेमो खाते आज़माएँ")}</Text>
          <View style={styles.demoRow}>
            <Pressable testID="demo-student" onPress={() => fillDemo("student")} style={({ pressed }) => [styles.demoChip, pressed && styles.pressed]}>
              <Ionicons name="person-outline" size={14} color={colors.brandPrimary} />
              <Text style={styles.demoChipText}>{t("Student", "छात्र")}</Text>
            </Pressable>
            <Pressable testID="demo-admin" onPress={() => fillDemo("admin")} style={({ pressed }) => [styles.demoChip, pressed && styles.pressed]}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.brandPrimary} />
              <Text style={styles.demoChipText}>{t("Admin", "एडमिन")}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t("New to EduVibe?", "EduVibe पर नए हैं?")} </Text>
          <Link href="/register" testID="go-register">
            <Text style={styles.footerLink}>{t("Create account", "खाता बनाएँ")}</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    content: { paddingHorizontal: 20, gap: 20 },
    topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    brandMark: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
    brandText: { color: colors.onSurface, fontSize: 18, fontWeight: "700" },
    langPill: { minWidth: 48, height: 36, borderRadius: 18, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
    langText: { color: colors.onBrandTertiary, fontSize: 13, fontWeight: "600" },
    hero: { alignItems: "center", gap: 10, paddingVertical: 8 },
    heroEmoji: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
    heroTitle: { color: colors.onSurface, fontSize: 26, fontWeight: "700" },
    heroSub: { color: colors.muted, fontSize: 14, textAlign: "center" },
    card: { backgroundColor: colors.surfaceSecondary, borderRadius: 24, padding: 20, gap: 10, borderWidth: 1, borderColor: colors.border },
    label: { color: colors.onSurface, fontSize: 13, fontWeight: "600", marginTop: 6 },
    input: { minHeight: 52, borderRadius: 16, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, color: colors.onSurface, fontSize: 15 },
    passwordInputContainer: { minHeight: 52, borderRadius: 16, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center" },
    passwordInput: { flex: 1, minHeight: 50, backgroundColor: "transparent", borderWidth: 0, borderColor: "transparent", borderRadius: 0, paddingHorizontal: 16, paddingRight: 4, color: colors.onSurface, fontSize: 15 },
    passwordToggle: { width: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
    primaryButton: { minHeight: 52, borderRadius: 999, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 14 },
    primaryText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "700" },
    divider: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, marginBottom: 6 },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.divider },
    dividerText: { color: colors.muted, fontSize: 12 },
    googleButton: { minHeight: 52, borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.borderStrong, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
    googleText: { color: colors.onSurface, fontSize: 14, fontWeight: "600" },
    error: { color: colors.error, fontSize: 13, marginTop: 6 },
    demoBox: { backgroundColor: colors.brandTertiary, borderRadius: 20, padding: 14, gap: 10 },
    demoTitle: { color: colors.onBrandTertiary, fontSize: 13, fontWeight: "600" },
    demoRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
    demoChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surfaceSecondary },
    demoChipText: { color: colors.onSurface, fontSize: 12, fontWeight: "600" },
    footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4, marginTop: 6 },
    footerText: { color: colors.muted, fontSize: 13 },
    footerLink: { color: colors.brandPrimary, fontSize: 13, fontWeight: "700" },
    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.6 },
  }),
);
