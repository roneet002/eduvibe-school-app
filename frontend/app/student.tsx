import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api/school";
import { useAuth } from "@/src/auth/auth-context";
import { ModuleDetail } from "@/src/components/module-detail";
import { useLanguage } from "@/src/i18n/language";
import { makeStyles, useTheme } from "@/src/theme";
import type { DashboardData, ModuleItem } from "@/src/types/school";

const CATEGORY_LABELS: Record<string, { en: string; hi: string; icon: string }> = {
  quick: { en: "Quick tasks", hi: "झटपट काम", icon: "flash-outline" },
  academics: { en: "Academics", hi: "शैक्षिक", icon: "school-outline" },
  library: { en: "Library", hi: "पुस्तकालय", icon: "library-outline" },
  updates: { en: "School updates", hi: "स्कूल अपडेट", icon: "megaphone-outline" },
  account: { en: "My account", hi: "मेरा खाता", icon: "person-outline" },
};

const CATEGORY_ORDER = ["quick", "academics", "library", "updates", "account"];

export default function StudentHome() {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, status, logout } = useAuth();
  const { t, language, toggle } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState<ModuleItem | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["student-dashboard"],
    queryFn: () => api.dashboard(),
    enabled: status === "authenticated" && user?.role === "student",
  });

  const grouped = useMemo(() => {
    if (!data) return {} as Record<string, ModuleItem[]>;
    const q = search.trim().toLowerCase();
    const map: Record<string, ModuleItem[]> = {};
    for (const m of data.modules) {
      if (q && !`${m.title} ${m.hi}`.toLowerCase().includes(q)) continue;
      const cat = (m.category && CATEGORY_LABELS[m.category]) ? m.category : "account";
      (map[cat] ||= []).push(m);
    }
    return map;
  }, [data, search]);

  if (status !== "authenticated") return <Redirect href="/" />;
  if (user?.role === "admin") return <Redirect href="/admin" />;

  if (isLoading) {
    return (
      <View style={styles.center} testID="student-loading">
        <ActivityIndicator color={colors.brandPrimary} size="large" />
        <Text style={styles.hint}>{t("Preparing your school day…", "आपका स्कूल दिन तैयार हो रहा है…")}</Text>
      </View>
    );
  }
  if (isError || !data) {
    return (
      <View style={styles.center} testID="student-error">
        <Ionicons name="cloud-offline-outline" size={42} color={colors.muted} />
        <Text style={styles.errorTitle}>{t("Couldn't load dashboard", "डैशबोर्ड लोड नहीं हुआ")}</Text>
        <Pressable onPress={() => void refetch()} style={styles.retry} testID="student-retry">
          <Text style={styles.retryText}>{t("Try again", "फिर कोशिश करें")}</Text>
        </Pressable>
      </View>
    );
  }

  const open = (m: ModuleItem) => setSelectedModule(m);
  const firstName = (user?.name || data.student.name || "Student").split(" ")[0];

  return (
    <View style={styles.root} testID="student-dashboard">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{data.student.initials}</Text>
            </View>
            <View>
              <Text style={styles.eyebrow}>{data.student.class_name}</Text>
              <Text style={styles.greeting}>{t(`Hi, ${firstName}!`, `नमस्ते, ${firstName}!`)}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable testID="language-toggle" onPress={toggle} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
              <Text style={styles.langText}>{language === "EN" ? "A/अ" : "अ/A"}</Text>
            </Pressable>
            <Pressable testID="logout-button" onPress={() => void logout()} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
              <Ionicons name="log-out-outline" size={20} color={colors.brandPrimary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.hero} testID="hero-card">
          <View style={styles.heroDeco1} />
          <View style={styles.heroDeco2} />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroOverline}>{t(`NEXT · IN ${data.upcoming_class.minutes_left} MIN`, `अगला · ${data.upcoming_class.minutes_left} मिनट में`)}</Text>
            <Text style={styles.heroTitle}>{data.upcoming_class.subject}</Text>
            <Text style={styles.heroMeta}>{data.upcoming_class.teacher} · {data.upcoming_class.room}</Text>
            <Pressable testID="hero-join" onPress={() => open(data.modules.find((m) => m.key === "live_class")!)} style={({ pressed }) => [styles.heroCta, pressed && styles.pressed]}>
              <Text style={styles.heroCtaText}>{t("View class", "कक्षा देखें")}</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.brandPrimary} />
            </Pressable>
          </View>
          <View style={styles.heroEmoji}><Text style={{ fontSize: 48 }}>🚀</Text></View>
        </View>

        <View style={styles.statRow}>
          <StatCard icon="calendar-outline" label={t("Attendance", "उपस्थिति")} value={`${data.stats.attendance}%`} color={colors.success} />
          <StatCard icon="wallet-outline" label={t("Fees due", "फीस बकाया")} value={`₹${(data.stats.fees_due || 0).toLocaleString("en-IN")}`} color={colors.warning} />
          <StatCard icon="book-outline" label={t("Homework", "गृहकार्य")} value={`${data.stats.homework_due}`} color={colors.brandPrimary} />
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            testID="search-modules"
            value={search}
            onChangeText={setSearch}
            placeholder={t("Search modules", "मॉड्यूल खोजें")}
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
        </View>

        {CATEGORY_ORDER.map((cat) => {
          const items = grouped[cat];
          if (!items || items.length === 0) return null;
          const label = CATEGORY_LABELS[cat];
          return (
            <View key={cat} style={styles.section}>
              <View style={styles.sectionHead}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionIcon}><Ionicons name={label.icon as never} size={16} color={colors.brandPrimary} /></View>
                  <Text style={styles.sectionTitle}>{t(label.en, label.hi)}</Text>
                </View>
                <Text style={styles.sectionCount}>{items.length}</Text>
              </View>
              <View style={styles.grid}>
                {items.map((m) => (
                  <Pressable
                    key={m.key}
                    testID={`module-${m.key}`}
                    onPress={() => open(m)}
                    style={({ pressed }) => [styles.moduleCard, pressed && styles.cardPressed]}
                  >
                    <View style={styles.moduleIconWrap}>
                      <Ionicons name={m.icon as never} size={22} color={colors.brandPrimary} />
                      {m.badge ? <View style={styles.badge}><Text style={styles.badgeText}>{m.badge}</Text></View> : null}
                    </View>
                    <Text style={styles.moduleTitle} numberOfLines={2}>{language === "EN" ? m.title : m.hi}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}

        {Object.keys(grouped).length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={32} color={colors.muted} />
            <Text style={styles.emptyText}>{t("No modules found", "कोई मॉड्यूल नहीं मिला")}</Text>
          </View>
        ) : null}
      </ScrollView>

      <ModuleDetail module={selectedModule} data={data} onClose={() => setSelectedModule(null)} />
    </View>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const styles = useStyles();
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon as never} size={18} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    content: { paddingHorizontal: 20, gap: 18 },
    center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", gap: 12 },
    hint: { color: colors.muted, fontSize: 14 },
    errorTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "600" },
    retry: { backgroundColor: colors.brandPrimary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999, marginTop: 10 },
    retryText: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: "600" },

    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
    avatarText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "700" },
    eyebrow: { color: colors.muted, fontSize: 11, letterSpacing: 0.8, fontWeight: "500" },
    greeting: { color: colors.onSurface, fontSize: 22, fontWeight: "700", marginTop: 2 },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    iconBtn: { minWidth: 44, height: 40, paddingHorizontal: 12, borderRadius: 20, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
    langText: { color: colors.onBrandTertiary, fontSize: 12, fontWeight: "700" },

    hero: { backgroundColor: colors.brandPrimary, borderRadius: 24, padding: 20, flexDirection: "row", alignItems: "center", gap: 12, overflow: "hidden", position: "relative" },
    heroDeco1: { position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: colors.brandSecondary, opacity: 0.4 },
    heroDeco2: { position: "absolute", bottom: -50, left: -20, width: 110, height: 110, borderRadius: 55, backgroundColor: colors.brand, opacity: 0.4 },
    heroOverline: { color: colors.onBrandPrimary, fontSize: 11, letterSpacing: 1.2, fontWeight: "600", opacity: 0.9 },
    heroTitle: { color: colors.onBrandPrimary, fontSize: 24, fontWeight: "700", marginTop: 4 },
    heroMeta: { color: colors.onBrandPrimary, fontSize: 12, opacity: 0.9, marginTop: 4 },
    heroCta: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surfaceSecondary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, marginTop: 14 },
    heroCtaText: { color: colors.brandPrimary, fontSize: 13, fontWeight: "700" },
    heroEmoji: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },

    statRow: { flexDirection: "row", gap: 10 },
    statCard: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 4 },
    statValue: { color: colors.onSurface, fontSize: 16, fontWeight: "700", marginTop: 4 },
    statLabel: { color: colors.muted, fontSize: 11 },

    searchBox: { height: 52, backgroundColor: colors.surfaceSecondary, borderRadius: 16, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 8, borderWidth: 1, borderColor: colors.border },
    searchInput: { flex: 1, color: colors.onSurface, fontSize: 15 },

    section: { gap: 10 },
    sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    sectionIcon: { width: 28, height: 28, borderRadius: 10, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
    sectionTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
    sectionCount: { color: colors.muted, fontSize: 12, fontWeight: "600" },

    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    moduleCard: { width: "31%", minHeight: 112, borderRadius: 20, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 10 },
    moduleIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", position: "relative" },
    badge: { position: "absolute", right: -4, top: -4, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
    badgeText: { color: colors.onBrandPrimary, fontSize: 9, fontWeight: "700" },
    moduleTitle: { color: colors.onSurface, fontSize: 12, fontWeight: "600", lineHeight: 16 },

    empty: { alignItems: "center", paddingVertical: 32, gap: 8 },
    emptyText: { color: colors.muted, fontSize: 14 },

    pressed: { opacity: 0.75 },
    cardPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  }),
);
