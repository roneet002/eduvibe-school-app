import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api/school";
import { useAuth } from "@/src/auth/auth-context";
import { useLanguage } from "@/src/i18n/language";
import { makeStyles, useTheme } from "@/src/theme";

const ADMIN_MODULES = [
  { key: "circulars", title: "Circulars", icon: "document-text-outline" },
  { key: "homework", title: "Homework", icon: "book-outline" },
  { key: "live_class", title: "Live Class", icon: "videocam-outline" },
  { key: "exam_schedule", title: "Exam Schedule", icon: "clipboard-outline" },
  { key: "exam_report", title: "Exam Report", icon: "bar-chart-outline" },
  { key: "timetable", title: "Time Table", icon: "grid-outline" },
  { key: "syllabus", title: "Syllabus", icon: "list-outline" },
  { key: "teachers", title: "Teachers", icon: "people-outline" },
  { key: "projects", title: "Projects", icon: "construct-outline" },
  { key: "activity", title: "Activity", icon: "walk-outline" },
  { key: "events", title: "Events", icon: "sparkles-outline" },
  { key: "news_events", title: "News", icon: "newspaper-outline" },
  { key: "birthdays", title: "Birthdays", icon: "gift-outline" },
  { key: "notifications", title: "Notifications", icon: "notifications-outline" },
  { key: "book_search", title: "Books", icon: "search-outline" },
  { key: "new_books", title: "New Books", icon: "library-outline" },
  { key: "books_history", title: "Books History", icon: "time-outline" },
  { key: "book_request", title: "Book Requests", icon: "add-circle-outline" },
  { key: "fee_summary", title: "Fee Summary", icon: "wallet-outline" },
  { key: "fee_paid", title: "Fee Paid", icon: "receipt-outline" },
  { key: "fee_due", title: "Fee Due", icon: "alert-circle-outline" },
  { key: "fee_payment", title: "Fee Payment", icon: "card-outline" },
  { key: "transport", title: "Transport", icon: "bus-outline" },
  { key: "messages", title: "Messages", icon: "chatbubble-ellipses-outline" },
  { key: "sms_history", title: "SMS History", icon: "chatbox-outline" },
  { key: "diary", title: "Diary", icon: "journal-outline" },
  { key: "attendance", title: "Attendance", icon: "calendar-outline" },
  { key: "profile", title: "Profile", icon: "person-outline" },
  { key: "help", title: "Help", icon: "help-circle-outline" },
];

export default function AdminHome() {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, status, logout } = useAuth();
  const { t, language, toggle } = useLanguage();
  const [search, setSearch] = useState("");

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.adminStats(),
    enabled: status === "authenticated" && user?.role === "admin",
  });
  const { data: leaves } = useQuery({
    queryKey: ["admin-leaves"],
    queryFn: () => api.adminLeaves(),
    enabled: status === "authenticated" && user?.role === "admin",
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ADMIN_MODULES.filter((m) => !q || m.title.toLowerCase().includes(q) || m.key.includes(q));
  }, [search]);

  if (status !== "authenticated") return <Redirect href="/" />;
  if (user?.role !== "admin") return <Redirect href="/student" />;

  return (
    <View style={styles.root} testID="admin-dashboard">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}><Ionicons name="shield-checkmark" size={22} color={colors.onBrandPrimary} /></View>
            <View>
              <Text style={styles.eyebrow}>{t("ADMIN PORTAL", "एडमिन पोर्टल")}</Text>
              <Text style={styles.greeting}>{t(`Hi, ${(user?.name || "Admin").split(" ")[0]}`, `नमस्ते, ${(user?.name || "Admin").split(" ")[0]}`)}</Text>
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

        <View style={styles.statsRow}>
          <StatBox icon="people-outline" label={t("Students", "छात्र")} value={`${stats?.students ?? "—"}`} />
          <StatBox icon="shield-checkmark-outline" label={t("Admins", "एडमिन")} value={`${stats?.admins ?? "—"}`} />
          <StatBox icon="airplane-outline" label={t("Pending leaves", "बकाया छुट्टी")} value={`${stats?.pending_leaves ?? 0}`} />
          <StatBox icon="file-tray-stacked-outline" label={t("Entries", "प्रविष्टियाँ")} value={`${stats?.content_entries ?? "—"}`} />
        </View>

        <Pressable testID="admin-leaves" onPress={() => router.push("/admin-leaves")} style={({ pressed }) => [styles.leaveBanner, pressed && styles.pressed]}>
          <View style={styles.leaveIcon}><Ionicons name="airplane-outline" size={22} color={colors.onBrandPrimary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{t("Leave requests", "अवकाश अनुरोध")}</Text>
            <Text style={styles.bannerSub}>{t(`${leaves?.leaves?.length ?? 0} total · ${stats?.pending_leaves ?? 0} pending`, `${leaves?.leaves?.length ?? 0} कुल · ${stats?.pending_leaves ?? 0} बकाया`)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.brandPrimary} />
        </Pressable>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            testID="admin-search"
            value={search}
            onChangeText={setSearch}
            placeholder={t("Search module to manage", "मॉड्यूल खोजें")}
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
        </View>

        <Text style={styles.sectionTitle}>{t("Manage content", "सामग्री प्रबंधित करें")}</Text>
        <View style={styles.grid}>
          {filtered.map((m) => (
            <Pressable
              key={m.key}
              testID={`admin-module-${m.key}`}
              onPress={() => router.push({ pathname: "/admin-module", params: { moduleKey: m.key, title: m.title } })}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.cardIcon}><Ionicons name={m.icon as never} size={22} color={colors.brandPrimary} /></View>
              <Text style={styles.cardTitle} numberOfLines={2}>{m.title}</Text>
              <View style={styles.cardCta}><Text style={styles.cardCtaText}>{t("Manage", "प्रबंधित")}</Text><Ionicons name="arrow-forward" size={12} color={colors.brandPrimary} /></View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function StatBox({ icon, label, value }: { icon: string; label: string; value: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon as never} size={18} color={colors.brandPrimary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    content: { paddingHorizontal: 20, gap: 16 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
    eyebrow: { color: colors.muted, fontSize: 11, letterSpacing: 0.8, fontWeight: "500" },
    greeting: { color: colors.onSurface, fontSize: 22, fontWeight: "700", marginTop: 2 },
    headerActions: { flexDirection: "row", gap: 8 },
    iconBtn: { minWidth: 44, height: 40, paddingHorizontal: 12, borderRadius: 20, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
    langText: { color: colors.onBrandTertiary, fontSize: 12, fontWeight: "700" },

    statsRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
    statBox: { flexBasis: "47%", flexGrow: 1, backgroundColor: colors.surfaceSecondary, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 4 },
    statValue: { color: colors.onSurface, fontSize: 18, fontWeight: "700", marginTop: 4 },
    statLabel: { color: colors.muted, fontSize: 11 },

    leaveBanner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.brandTertiary, borderRadius: 20, padding: 14 },
    leaveIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
    bannerTitle: { color: colors.onBrandTertiary, fontSize: 15, fontWeight: "700" },
    bannerSub: { color: colors.muted, fontSize: 12, marginTop: 2 },

    searchBox: { height: 52, backgroundColor: colors.surfaceSecondary, borderRadius: 16, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 8, borderWidth: 1, borderColor: colors.border },
    searchInput: { flex: 1, color: colors.onSurface, fontSize: 15 },

    sectionTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700", marginTop: 4 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    card: { width: "31%", minHeight: 128, borderRadius: 20, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 8 },
    cardIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
    cardTitle: { color: colors.onSurface, fontSize: 12, fontWeight: "600", lineHeight: 16, flex: 1 },
    cardCta: { flexDirection: "row", alignItems: "center", gap: 4 },
    cardCtaText: { color: colors.brandPrimary, fontSize: 11, fontWeight: "700" },

    pressed: { opacity: 0.75 },
    cardPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  }),
);
