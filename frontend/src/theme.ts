// Design tokens for EduVibe School App — Soft Green / Mint, Tactile Playful LIGHT.
// Keys match the "color" block of /app/design_guidelines.json.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // Surfaces
  surface: "#f0eeee",
  onSurface: "#2D2420",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#2D2420",
  surfaceTertiary: "#FFFFFF",
  onSurfaceTertiary: "#2D2420",
  surfaceInverse: "#2D2420",
  onSurfaceInverse: "#FFFFFF",
  muted: "#8C7C75",

  // Brand (soft green / mint)
  brand: "#047450",
  onBrand: "#FFFFFF",
  brandPrimary: "#047450",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#A7F3D0",
  onBrandSecondary: "#2D2420",
  brandTertiary: "#FFFFFF",
  onBrandTertiary: "#2D2420",

  // Status
  success: "#5EBA7D",
  onSuccess: "#FFFFFF",
  warning: "#FFC247",
  onWarning: "#2D2420",
  error: "#EF6C65",
  onError: "#FFFFFF",
  info: "#50B4E6",
  onInfo: "#FFFFFF",

  // Lines
  border: "#e5e5e5",
  borderStrong: "#e5e5e5",
  divider: "#e5e5e5",
};

export type ThemeColors = typeof light;
export const defaultScheme = "light" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}
setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system === "dark" && themes.dark ? "dark" : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
