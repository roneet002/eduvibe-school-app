import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type LeaveItem } from "@/src/api/school";
import { useAuth } from "@/src/auth/auth-context";
import { useLanguage } from "@/src/i18n/language";
import { makeStyles, useTheme } from "@/src/theme";

export default function AdminLeaves() {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { status, user } = useAuth();
  const { t } = useLanguage();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-leaves"],
    queryFn: () => api.adminLeaves(),
    enabled: status === "authenticated" && user?.role === "admin",
  });

  const updateMut = useMutation({
    mutationFn: (p: { id: string; status: string }) => api.adminUpdateLeave(p.id, p.status),
    onSuccess: () => { void refetch(); void qc.invalidateQueries({ queryKey: ["admin-stats"] }); },
  });

  if (status !== "authenticated") return <Redirect href="/" />;
  if (user?.role !== "admin") return <Redirect href="/student" />;

  return (
    <View style={styles.root} testID="admin-leaves-screen">
      <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} testID="back-button" style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.topEyebrow}>{t("REVIEW", "समीक्षा")}</Text>
          <Text style={styles.topTitle}>{t("Leave Requests", "अवकाश अनुरोध")}</Text>
        </View>
      </View>
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}>
          {(data?.leaves ?? []).length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="airplane-outline" size={32} color={colors.muted} />
              <Text style={styles.emptyText}>{t("No leave requests yet", "अभी तक कोई अवकाश अनुरोध नहीं")}</Text>
            </View>
          ) : (
            (data?.leaves ?? []).map((leave: LeaveItem) => (
              <View key={leave.id} testID={`leave-${leave.id}`} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.name}>{leave.student_name || leave.user_id}</Text>
                  <View style={[styles.badge, leave.status === "Approved" && styles.badgeApproved, leave.status === "Rejected" && styles.badgeRejected]}>
                    <Text style={[styles.badgeText, leave.status === "Approved" && styles.badgeTextApproved, leave.status === "Rejected" && styles.badgeTextRejected]}>{leave.status}</Text>
                  </View>
                </View>
                <Text style={styles.meta}>{leave.start_date} → {leave.end_date}</Text>
                <Text style={styles.reason}>{leave.reason}</Text>
                {leave.status === "Pending" ? (
                  <View style={styles.actions}>
                    <Pressable testID={`approve-${leave.id}`} onPress={() => updateMut.mutate({ id: leave.id, status: "Approved" })} style={({ pressed }) => [styles.approve, pressed && styles.pressed]}>
                      <Ionicons name="checkmark" size={16} color={colors.onSuccess} />
                      <Text style={styles.approveText}>{t("Approve", "स्वीकृत")}</Text>
                    </Pressable>
                    <Pressable testID={`reject-${leave.id}`} onPress={() => updateMut.mutate({ id: leave.id, status: "Rejected" })} style={({ pressed }) => [styles.reject, pressed && styles.pressed]}>
                      <Ionicons name="close" size={16} color={colors.onError} />
                      <Text style={styles.rejectText}>{t("Reject", "अस्वीकृत")}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    top: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
    back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
    topEyebrow: { color: colors.muted, fontSize: 10, letterSpacing: 1, fontWeight: "700" },
    topTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "700" },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    list: { padding: 16, gap: 10 },
    empty: { alignItems: "center", paddingVertical: 48, gap: 10 },
    emptyText: { color: colors.muted, fontSize: 14 },
    card: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 14, gap: 6 },
    rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    name: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
    meta: { color: colors.muted, fontSize: 12 },
    reason: { color: colors.onSurface, fontSize: 13, marginTop: 4 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.warning },
    badgeApproved: { backgroundColor: colors.success },
    badgeRejected: { backgroundColor: colors.error },
    badgeText: { color: colors.onWarning, fontSize: 10, fontWeight: "700" },
    badgeTextApproved: { color: colors.onSuccess },
    badgeTextRejected: { color: colors.onError },
    actions: { flexDirection: "row", gap: 8, marginTop: 10 },
    approve: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.success, paddingVertical: 10, borderRadius: 999 },
    approveText: { color: colors.onSuccess, fontSize: 13, fontWeight: "700" },
    reject: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.error, paddingVertical: 10, borderRadius: 999 },
    rejectText: { color: colors.onError, fontSize: 13, fontWeight: "700" },
    pressed: { opacity: 0.75 },
  }),
);
