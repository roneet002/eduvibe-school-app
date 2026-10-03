import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type ContentEntry } from "@/src/api/school";
import { useAuth } from "@/src/auth/auth-context";
import { useLanguage } from "@/src/i18n/language";
import { makeStyles, useTheme } from "@/src/theme";

export default function AdminModule() {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { status, user } = useAuth();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ moduleKey?: string; title?: string }>();
  const moduleKey = (params.moduleKey as string) || "";
  const title = (params.title as string) || moduleKey;

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ContentEntry | null>(null);
  const [titleField, setTitleField] = useState("");
  const [subtitleField, setSubtitleField] = useState("");
  const [valueField, setValueField] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["content", moduleKey],
    queryFn: () => api.content(moduleKey),
    enabled: !!moduleKey && status === "authenticated",
  });

  const createMut = useMutation({
    mutationFn: (p: { title: string; subtitle?: string; value?: string }) => api.adminCreate(moduleKey, p),
    onSuccess: () => { void refetch(); void qc.invalidateQueries({ queryKey: ["admin-stats"] }); closeEditor(); },
  });
  const updateMut = useMutation({
    mutationFn: (p: { id: string; title: string; subtitle?: string; value?: string }) => api.adminUpdate(moduleKey, p.id, { title: p.title, subtitle: p.subtitle, value: p.value }),
    onSuccess: () => { void refetch(); closeEditor(); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.adminDelete(moduleKey, id),
    onSuccess: () => { void refetch(); void qc.invalidateQueries({ queryKey: ["admin-stats"] }); },
  });

  if (status !== "authenticated") return <Redirect href="/" />;
  if (user?.role !== "admin") return <Redirect href="/student" />;

  const openCreate = () => {
    setEditing(null);
    setTitleField("");
    setSubtitleField("");
    setValueField("");
    setEditorOpen(true);
  };
  const openEdit = (entry: ContentEntry) => {
    setEditing(entry);
    setTitleField(entry.title);
    setSubtitleField(entry.subtitle || "");
    setValueField(entry.value || "");
    setEditorOpen(true);
  };
  const closeEditor = () => setEditorOpen(false);
  const save = () => {
    const payload = { title: titleField.trim(), subtitle: subtitleField.trim(), value: valueField.trim() };
    if (!payload.title) return;
    if (editing) updateMut.mutate({ id: editing.id, ...payload });
    else createMut.mutate(payload);
  };

  return (
    <View style={styles.root} testID="admin-module-screen">
      <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} testID="back-button" style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.topEyebrow}>{t("CMS", "सीएमएस")}</Text>
          <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
        </View>
        <Pressable testID="add-entry" onPress={openCreate} style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}>
          <Ionicons name="add" size={22} color={colors.onBrandPrimary} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 90 }]}>
          {(data?.entries ?? []).length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyBubble}><Ionicons name="file-tray-outline" size={28} color={colors.brandPrimary} /></View>
              <Text style={styles.emptyTitle}>{t("No entries yet", "कोई प्रविष्टि नहीं")}</Text>
              <Text style={styles.emptyText}>{t("Tap + to add your first entry", "पहली प्रविष्टि जोड़ने के लिए + दबाएँ")}</Text>
            </View>
          ) : (
            (data?.entries ?? []).map((entry) => (
              <View key={entry.id} testID={`entry-${entry.id}`} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{entry.title}</Text>
                  {entry.subtitle ? <Text style={styles.cardSub}>{entry.subtitle}</Text> : null}
                  {entry.value ? <Text style={styles.cardValue}>{entry.value}</Text> : null}
                </View>
                <View style={styles.actions}>
                  <Pressable testID={`edit-${entry.id}`} onPress={() => openEdit(entry)} style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}>
                    <Ionicons name="create-outline" size={18} color={colors.brandPrimary} />
                  </Pressable>
                  <Pressable testID={`delete-${entry.id}`} onPress={() => deleteMut.mutate(entry.id)} style={({ pressed }) => [styles.actionBtn, styles.actionDanger, pressed && styles.pressed]}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Pressable testID="fab-add" onPress={openCreate} style={({ pressed }) => [styles.fab, { bottom: insets.bottom + 20 }, pressed && styles.pressed]}>
        <Ionicons name="add" size={24} color={colors.onBrandPrimary} />
      </Pressable>

      <Modal visible={editorOpen} transparent animationType="slide" onRequestClose={closeEditor}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalRoot}>
          <Pressable style={styles.scrim} onPress={closeEditor} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]} testID="entry-editor">
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{editing ? t("Edit entry", "संपादन") : t("New entry", "नई प्रविष्टि")}</Text>
            <KeyboardAwareScrollView
              style={styles.editorScroll}
              contentContainerStyle={styles.editorContent}
              keyboardShouldPersistTaps="handled"
              bottomOffset={24}
              extraKeyboardSpace={24}
              mode="layout"
            >
              <Text style={styles.label}>{t("Title", "शीर्षक")}</Text>
              <TextInput testID="entry-title" value={titleField} onChangeText={setTitleField} placeholder={t("Title", "शीर्षक")} placeholderTextColor={colors.muted} style={styles.input} />
              <Text style={styles.label}>{t("Subtitle (optional)", "उप-शीर्षक")}</Text>
              <TextInput testID="entry-subtitle" value={subtitleField} onChangeText={setSubtitleField} placeholder={t("Short description", "लघु विवरण")} placeholderTextColor={colors.muted} style={styles.input} />
              <Text style={styles.label}>{t("Value / status (optional)", "मूल्य / स्थिति")}</Text>
              <TextInput testID="entry-value" value={valueField} onChangeText={setValueField} placeholder={t("e.g. Pending, ₹500, 09:00", "जैसे Pending, ₹500")} placeholderTextColor={colors.muted} style={styles.input} />
              <Pressable testID="entry-save" onPress={save} disabled={createMut.isPending || updateMut.isPending} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
                {createMut.isPending || updateMut.isPending ? <ActivityIndicator color={colors.onBrandPrimary} /> : (
                  <>
                    <Ionicons name="save-outline" size={18} color={colors.onBrandPrimary} />
                    <Text style={styles.primaryText}>{t("Save", "सहेजें")}</Text>
                  </>
                )}
              </Pressable>
            </KeyboardAwareScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    top: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: colors.surface },
    back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
    topEyebrow: { color: colors.muted, fontSize: 10, letterSpacing: 1, fontWeight: "700" },
    topTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "700" },
    addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },

    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    list: { padding: 16, gap: 10 },
    empty: { alignItems: "center", paddingVertical: 40, gap: 10 },
    emptyBubble: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
    emptyTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
    emptyText: { color: colors.muted, fontSize: 13, textAlign: "center" },

    card: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surfaceSecondary, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 14 },
    cardTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "600" },
    cardSub: { color: colors.muted, fontSize: 12, marginTop: 3 },
    cardValue: { color: colors.brandPrimary, fontSize: 12, fontWeight: "700", marginTop: 4 },
    actions: { flexDirection: "row", gap: 6 },
    actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
    actionDanger: { backgroundColor: "#FDE5E3" },

    fab: { position: "absolute", right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", shadowColor: colors.brand, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },

    modalRoot: { flex: 1, justifyContent: "flex-end" },
    scrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.35)" },
    sheet: { maxHeight: "90%", backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, gap: 8 },
    sheetHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 10 },
    sheetTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "700", marginBottom: 6 },
    editorScroll: { flexShrink: 1 },
    editorContent: { gap: 8, paddingBottom: 8 },
    label: { color: colors.onSurface, fontSize: 13, fontWeight: "600", marginTop: 6 },
    input: { minHeight: 52, borderRadius: 16, backgroundColor: colors.surfaceTertiary, paddingHorizontal: 16, color: colors.onSurface, fontSize: 14 },
    primary: { minHeight: 52, borderRadius: 999, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 14 },
    primaryText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "700" },

    pressed: { opacity: 0.75 },
  }),
);
