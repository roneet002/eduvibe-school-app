import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type ContentEntry, type LeaveItem } from "@/src/api/school";
import { useAuth } from "@/src/auth/auth-context";
import { useLanguage } from "@/src/i18n/language";
import { makeStyles, useTheme } from "@/src/theme";
import type { DashboardData, ModuleItem } from "@/src/types/school";

type Props = { module: ModuleItem | null; data: DashboardData | null; onClose: () => void };

export function ModuleDetail({ module, data, onClose }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const open = Boolean(module);

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView testID="module-detail" style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {module ? (
          <>
            <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
              <Pressable onPress={onClose} testID="module-detail-close" style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
                <Ionicons name="chevron-down" size={24} color={colors.onSurface} />
              </Pressable>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Text style={styles.title}>{module.title}</Text>
                <Text style={styles.subtitle}>{module.hi}</Text>
              </View>
              <View style={styles.markIcon}><Ionicons name={module.icon as never} size={22} color={colors.brandPrimary} /></View>
            </View>
            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
              <ModuleBody moduleKey={module.key} data={data} />
            </ScrollView>
          </>
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );

  // ergonomic helper (not used; keeps diff small)
  function noop() { return t("", ""); }
}

function ModuleBody({ moduleKey, data }: { moduleKey: string; data: DashboardData | null }) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = useStyles();

  const { data: content, isLoading } = useQuery({
    queryKey: ["content", moduleKey],
    queryFn: () => api.content(moduleKey),
  });

  if (moduleKey === "leaves") return <LeaveSection />;
  if (moduleKey === "profile") return <ProfileSection />;
  if (moduleKey === "attendance") return <AttendanceSection data={data} entries={content?.entries ?? []} />;
  if (moduleKey.startsWith("fee_")) return <FeeSection moduleKey={moduleKey} entries={content?.entries ?? []} data={data} />;

  if (isLoading) {
    return (
      <View style={{ paddingVertical: 40, alignItems: "center" }}>
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }
  const entries = content?.entries ?? [];
  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyBubble}><Ionicons name="file-tray-outline" size={28} color={colors.brandPrimary} /></View>
        <Text style={styles.emptyTitle}>{t("No entries yet", "कोई प्रविष्टि नहीं")}</Text>
        <Text style={styles.emptyText}>{t("Content will appear here when admin adds it.", "एडमिन द्वारा सामग्री जोड़ने पर यहाँ दिखेगी।")}</Text>
      </View>
    );
  }
  return <>{entries.map((e) => <DetailRow key={e.id} entry={e} />)}</>;
}

function DetailRow({ entry }: { entry: ContentEntry }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.row} testID={`row-${entry.id}`}>
      <View style={styles.rowDot}><Ionicons name="chevron-forward" size={14} color={colors.brandPrimary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{entry.title}</Text>
        {entry.subtitle ? <Text style={styles.rowSub}>{entry.subtitle}</Text> : null}
      </View>
      {entry.value ? <Text style={styles.rowValue} numberOfLines={1}>{entry.value}</Text> : null}
    </View>
  );
}

function AttendanceSection({ data, entries }: { data: DashboardData | null; entries: ContentEntry[] }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const pct = data?.stats.attendance ?? 94.2;
  const present = entries.filter((e) => (e.value || "").toLowerCase() === "present").length;
  const absent = entries.filter((e) => (e.value || "").toLowerCase() === "absent").length;
  return (
    <>
      <View style={styles.heroCard} testID="attendance-hero">
        <View style={{ flex: 1 }}>
          <Text style={styles.heroEyebrow}>{t("ATTENDANCE", "उपस्थिति")}</Text>
          <Text style={styles.heroValue}>{pct}%</Text>
          <Text style={styles.heroSub}>{t(`${present} present · ${absent} absent`, `${present} उपस्थित · ${absent} अनुपस्थित`)}</Text>
        </View>
        <View style={styles.heroEmoji}><Text style={{ fontSize: 36 }}>📘</Text></View>
      </View>
      <SectionLabel text={t("Recent days", "हाल के दिन")} />
      {entries.map((e) => <DetailRow key={e.id} entry={e} />)}
    </>
  );
}

function FeeSection({ moduleKey, entries, data }: { moduleKey: string; entries: ContentEntry[]; data: DashboardData | null }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const due = data?.stats.fees_due ?? 0;
  const paidAmount = data?.stats.fees_paid ?? 0;

  const payLater = () => {
    setPaying(true);
    setTimeout(() => { setPaying(false); setPaid(true); }, 900);
  };

  return (
    <>
      <View style={styles.heroCard} testID="fee-hero">
        <View style={{ flex: 1 }}>
          <Text style={styles.heroEyebrow}>{t("TOTAL DUE", "कुल बकाया")}</Text>
          <Text style={styles.heroValue}>₹{due.toLocaleString("en-IN")}</Text>
          <Text style={styles.heroSub}>{t(`Paid ₹${paidAmount.toLocaleString("en-IN")} this term`, `इस टर्म में ₹${paidAmount.toLocaleString("en-IN")} भुगतान`)}</Text>
        </View>
        <View style={styles.heroEmoji}><Ionicons name="shield-checkmark-outline" size={28} color={colors.brandPrimary} /></View>
      </View>
      <SectionLabel text={t("Fee ledger", "फीस खाता")} />
      {entries.map((e) => <DetailRow key={e.id} entry={e} />)}
      {moduleKey === "fee_payment" || moduleKey === "fee_due" ? (
        <>
          <Pressable testID="fee-pay" onPress={payLater} disabled={paying || paid} style={({ pressed }) => [styles.primary, pressed && styles.pressed, (paying || paid) && styles.disabled]}>
            {paying ? <ActivityIndicator color={colors.onBrandPrimary} /> : (
              <>
                <Ionicons name={paid ? "checkmark-circle-outline" : "card-outline"} size={18} color={colors.onBrandPrimary} />
                <Text style={styles.primaryText}>{paid ? t("Payment preview done", "भुगतान पूर्वावलोकन पूर्ण") : t("Pay due fee (demo)", "फीस भरें (डेमो)")}</Text>
              </>
            )}
          </Pressable>
          <Text style={styles.note}>{t("Real payment gateway (Stripe/Razorpay) connects after admin setup.", "रीयल भुगतान गेटवे एडमिन सेटअप के बाद जुड़ेगा।")}</Text>
        </>
      ) : null}
    </>
  );
}

function ProfileSection() {
  const styles = useStyles();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const profile = (user?.student_profile || {}) as Record<string, string>;
  return (
    <>
      <View style={styles.profileHero}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>{(user?.name || "ST").split(" ").map((p) => p[0]).slice(0, 2).join("")}</Text>
        </View>
        <Text style={styles.profileName}>{user?.name}</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
      </View>
      <SectionLabel text={t("Academic details", "शैक्षिक विवरण")} />
      {[
        { label: t("Class", "कक्षा"), value: profile.class_name || "Class 10-A" },
        { label: t("Roll no", "रोल नं"), value: profile.roll_no || "—" },
        { label: t("House", "सदन"), value: profile.house || "—" },
        { label: t("School", "विद्यालय"), value: profile.school || "EduVibe" },
      ].map((r) => (
        <View key={r.label} style={styles.row}>
          <View style={styles.rowDot}><Ionicons name="chevron-forward" size={14} color={colors.brandPrimary} /></View>
          <Text style={[styles.rowTitle, { flex: 1 }]}>{r.label}</Text>
          <Text style={styles.rowValue}>{r.value}</Text>
        </View>
      ))}
      <Pressable testID="profile-logout" onPress={() => void logout()} style={({ pressed }) => [styles.danger, pressed && styles.pressed]}>
        <Ionicons name="log-out-outline" size={18} color={colors.error} />
        <Text style={styles.dangerText}>{t("Sign out", "साइन आउट")}</Text>
      </Pressable>
    </>
  );
}

function LeaveSection() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const qc = useQueryClient();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const { data } = useQuery({ queryKey: ["my-leaves"], queryFn: () => api.myLeaves() });
  const submitMut = useMutation({
    mutationFn: () => api.submitLeave({ start_date: startDate, end_date: endDate, reason }),
    onSuccess: () => {
      setStartDate(""); setEndDate(""); setReason("");
      void qc.invalidateQueries({ queryKey: ["my-leaves"] });
    },
  });

  const canSubmit = startDate && endDate && reason;

  return (
    <>
      <SectionLabel text={t("Your leave history", "आपका अवकाश इतिहास")} />
      {(data?.leaves ?? []).length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyBubble}><Ionicons name="airplane-outline" size={24} color={colors.brandPrimary} /></View>
          <Text style={styles.emptyTitle}>{t("No requests yet", "कोई अनुरोध नहीं")}</Text>
        </View>
      ) : (
        (data?.leaves ?? []).map((l: LeaveItem) => (
          <View key={l.id} testID={`leave-${l.id}`} style={styles.row}>
            <View style={styles.rowDot}><Ionicons name="airplane-outline" size={14} color={colors.brandPrimary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{l.start_date} → {l.end_date}</Text>
              <Text style={styles.rowSub}>{l.reason}</Text>
            </View>
            <Text style={[styles.rowValue, l.status === "Approved" && { color: colors.success }, l.status === "Rejected" && { color: colors.error }]}>{l.status}</Text>
          </View>
        ))
      )}
      <SectionLabel text={t("Apply for leave", "अवकाश के लिए आवेदन")} />
      <TextInput testID="leave-start" value={startDate} onChangeText={setStartDate} placeholder={t("Start date (e.g. 05 Feb)", "शुरू दिनांक")} placeholderTextColor={colors.muted} style={styles.input} />
      <TextInput testID="leave-end" value={endDate} onChangeText={setEndDate} placeholder={t("End date (e.g. 06 Feb)", "अंतिम दिनांक")} placeholderTextColor={colors.muted} style={styles.input} />
      <TextInput testID="leave-reason" value={reason} onChangeText={setReason} placeholder={t("Reason", "कारण")} placeholderTextColor={colors.muted} multiline style={[styles.input, { minHeight: 90, textAlignVertical: "top", paddingTop: 14 }]} />
      <Pressable testID="leave-submit" disabled={!canSubmit || submitMut.isPending} onPress={() => submitMut.mutate()} style={({ pressed }) => [styles.primary, pressed && styles.pressed, (!canSubmit || submitMut.isPending) && styles.disabled]}>
        {submitMut.isPending ? <ActivityIndicator color={colors.onBrandPrimary} /> : (
          <>
            <Ionicons name="send-outline" size={18} color={colors.onBrandPrimary} />
            <Text style={styles.primaryText}>{t("Submit request", "अनुरोध भेजें")}</Text>
          </>
        )}
      </Pressable>
      {submitMut.isSuccess ? <Text style={styles.success}>{t("Leave request submitted!", "अनुरोध भेजा गया!")}</Text> : null}
      {submitMut.isError ? <Text style={styles.error}>{(submitMut.error as Error).message}</Text> : null}
    </>
  );
}

function SectionLabel({ text }: { text: string }) {
  const styles = useStyles();
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    top: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
    close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    title: { color: colors.onSurface, fontSize: 20, fontWeight: "700" },
    subtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
    markIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
    scroll: { padding: 20, gap: 10 },

    heroCard: { backgroundColor: colors.brandPrimary, borderRadius: 22, padding: 20, flexDirection: "row", alignItems: "center", gap: 14 },
    heroEyebrow: { color: colors.onBrandPrimary, fontSize: 11, letterSpacing: 1, fontWeight: "600", opacity: 0.9 },
    heroValue: { color: colors.onBrandPrimary, fontSize: 32, fontWeight: "700", marginTop: 4 },
    heroSub: { color: colors.onBrandPrimary, fontSize: 12, marginTop: 4, opacity: 0.9 },
    heroEmoji: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },

    sectionLabel: { color: colors.onSurface, fontSize: 15, fontWeight: "700", marginTop: 16, marginBottom: 4 },

    row: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12 },
    rowDot: { width: 32, height: 32, borderRadius: 12, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
    rowTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "600" },
    rowSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
    rowValue: { color: colors.brandPrimary, fontSize: 12, fontWeight: "700", maxWidth: 120, textAlign: "right" },

    empty: { alignItems: "center", paddingVertical: 32, gap: 8 },
    emptyBubble: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
    emptyTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
    emptyText: { color: colors.muted, fontSize: 12, textAlign: "center", maxWidth: 260 },

    input: { minHeight: 52, borderRadius: 16, backgroundColor: colors.surfaceTertiary, paddingHorizontal: 16, color: colors.onSurface, fontSize: 14 },
    primary: { minHeight: 52, borderRadius: 999, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 12 },
    primaryText: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: "700" },
    danger: { minHeight: 48, borderRadius: 999, borderWidth: 1, borderColor: colors.error, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 16 },
    dangerText: { color: colors.error, fontSize: 13, fontWeight: "700" },
    success: { color: colors.success, textAlign: "center", marginTop: 10, fontSize: 13 },
    error: { color: colors.error, textAlign: "center", marginTop: 10, fontSize: 13 },
    note: { color: colors.muted, fontSize: 11, textAlign: "center", marginTop: 10 },

    profileHero: { alignItems: "center", gap: 8, paddingVertical: 16, backgroundColor: colors.brandTertiary, borderRadius: 22 },
    profileAvatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
    profileAvatarText: { color: colors.onBrandPrimary, fontSize: 24, fontWeight: "700" },
    profileName: { color: colors.onBrandTertiary, fontSize: 18, fontWeight: "700" },
    profileEmail: { color: colors.muted, fontSize: 12 },

    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.6 },
  }),
);
