import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth/auth-context";
import { makeStyles, useTheme } from "@/src/theme";

export default function Index() {
  const { status, user } = useAuth();
  const { colors } = useTheme();
  const styles = useStyles();

  if (status === "loading") {
    return (
      <View style={styles.center} testID="auth-loading">
        <ActivityIndicator color={colors.brandPrimary} size="large" />
        <Text style={styles.hint}>Loading your school…</Text>
      </View>
    );
  }
  if (status === "unauthenticated" || !user) return <Redirect href="/login" />;
  if (user.role === "admin") return <Redirect href="/admin" />;
  return <Redirect href="/student" />;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", gap: 12 },
    hint: { color: colors.muted, fontSize: 14 },
  }),
);
