import { FONT_FAMILY } from "./fonts";
import type { BrandKit, StyleId } from "./types";
import { resolveWcagPalette, type WcagPalette } from "./utils/wcagPalette";

export type Theme = {
  id: StyleId;
  isDark: boolean;
  wcag: WcagPalette;
  colors: {
    background: string;
    backgroundAlt: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    muted: string;
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    danger: string;
    border: string;
    glow: string;
  };
  caption: {
    background: string;
    text: string;
    highlight: string;
    highlightText: string;
  };
  card: {
    background: string;
    border: string;
    radius: number;
    shadow: string;
    backdropFilter?: string;
  };
  character: {
    body: string;
    face: string;
    accent: string;
    shadow: string;
  };
  radius: number;
  fontFamily: string;
  displayFamily: string;
};

const BASE_THEMES: Record<StyleId, Theme> = {
  stickman: {
    id: "stickman",
    isDark: false,
    wcag: resolveWcagPalette({ bgColor: "#FFF7EA", accentColor: "#F97316" }),
    colors: {
      background: "#FFF7EA",
      backgroundAlt: "#FFE9CF",
      surface: "#FFFFFF",
      surfaceAlt: "#FFF1DC",
      text: "#2A2118",
      muted: "#93795F",
      primary: "#F97316",
      secondary: "#FBBF24",
      accent: "#EF4444",
      success: "#16A34A",
      danger: "#DC2626",
      border: "#2A2118",
      glow: "rgba(249, 115, 22, 0.35)",
    },
    caption: {
      background: "rgba(42, 33, 24, 0.94)",
      text: "#FFF7EA",
      highlight: "#FBBF24",
      highlightText: "#2A2118",
    },
    card: {
      background: "#FFFFFF",
      border: "3px solid #2A2118",
      radius: 26,
      shadow: "7px 7px 0 rgba(42, 33, 24, 0.92)",
    },
    character: {
      body: "#2A2118",
      face: "#FFF1DC",
      accent: "#F97316",
      shadow: "rgba(42, 33, 24, 0.18)",
    },
    radius: 26,
    fontFamily: FONT_FAMILY,
    displayFamily: FONT_FAMILY,
  },
  modern_dark: {
    id: "modern_dark",
    isDark: true,
    wcag: resolveWcagPalette({ bgColor: "#070B17", accentColor: "#22D3EE" }),
    colors: {
      background: "#070B17",
      backgroundAlt: "#0E1730",
      surface: "rgba(255, 255, 255, 0.06)",
      surfaceAlt: "rgba(255, 255, 255, 0.1)",
      text: "#F8FAFC",
      muted: "#94A3B8",
      primary: "#22D3EE",
      secondary: "#A78BFA",
      accent: "#F472B6",
      success: "#34D399",
      danger: "#FB7185",
      border: "rgba(255, 255, 255, 0.14)",
      glow: "rgba(34, 211, 238, 0.35)",
    },
    caption: {
      background: "rgba(3, 7, 18, 0.8)",
      text: "#F8FAFC",
      highlight: "#22D3EE",
      highlightText: "#03131A",
    },
    card: {
      background: "rgba(255, 255, 255, 0.065)",
      border: "1px solid rgba(255, 255, 255, 0.14)",
      radius: 24,
      shadow: "0 24px 60px rgba(0, 0, 0, 0.45)",
      backdropFilter: "blur(18px)",
    },
    character: {
      body: "#E2E8F0",
      face: "#0B1220",
      accent: "#22D3EE",
      shadow: "rgba(0, 0, 0, 0.55)",
    },
    radius: 24,
    fontFamily: FONT_FAMILY,
    displayFamily: FONT_FAMILY,
  },
  editorial_clean: {
    id: "editorial_clean",
    isDark: false,
    wcag: resolveWcagPalette({ bgColor: "#F7F6F2", accentColor: "#2563EB" }),
    colors: {
      background: "#F7F6F2",
      backgroundAlt: "#FFFFFF",
      surface: "#FFFFFF",
      surfaceAlt: "#F2F1EC",
      text: "#111111",
      muted: "#6B7280",
      primary: "#2563EB",
      secondary: "#F59E0B",
      accent: "#EF4444",
      success: "#059669",
      danger: "#DC2626",
      border: "#D9D8D2",
      glow: "rgba(37, 99, 235, 0.18)",
    },
    caption: {
      background: "#111111",
      text: "#FFFFFF",
      highlight: "#F59E0B",
      highlightText: "#111111",
    },
    card: {
      background: "#FFFFFF",
      border: "1px solid #E2E1DB",
      radius: 10,
      shadow: "0 18px 40px rgba(17, 17, 17, 0.08)",
    },
    character: {
      body: "#111111",
      face: "#F7F6F2",
      accent: "#2563EB",
      shadow: "rgba(17, 17, 17, 0.16)",
    },
    radius: 10,
    fontFamily: FONT_FAMILY,
    displayFamily: FONT_FAMILY,
  },
  smart_mix: {
    id: "smart_mix",
    isDark: true,
    wcag: resolveWcagPalette({ bgColor: "#080B14", accentColor: "#E77B40" }),
    colors: {
      background: "#080B14",
      backgroundAlt: "#101828",
      surface: "rgba(255, 255, 255, 0.065)",
      surfaceAlt: "rgba(255, 255, 255, 0.11)",
      text: "#F8FAFC",
      muted: "#9AA8BF",
      primary: "#E77B40",
      secondary: "#F2C66D",
      accent: "#5EEAD4",
      success: "#34D399",
      danger: "#FB7185",
      border: "rgba(255, 255, 255, 0.14)",
      glow: "rgba(231, 123, 64, 0.38)",
    },
    caption: {
      background: "rgba(6, 9, 17, 0.72)",
      text: "#F8FAFC",
      highlight: "#E77B40",
      highlightText: "#160A03",
    },
    card: {
      background: "rgba(255, 255, 255, 0.06)",
      border: "1px solid rgba(255, 255, 255, 0.14)",
      radius: 22,
      shadow: "0 24px 60px rgba(0, 0, 0, 0.42)",
      backdropFilter: "blur(18px)",
    },
    character: {
      body: "#E7ECF5",
      face: "#0B1220",
      accent: "#E77B40",
      shadow: "rgba(0, 0, 0, 0.5)",
    },
    radius: 22,
    fontFamily: FONT_FAMILY,
    displayFamily: FONT_FAMILY,
  },
};

export const withWcagPalette = (theme: Theme, palette: WcagPalette): Theme => {
  const isDark = palette.isDark;
  return {
    ...theme,
    isDark,
    wcag: palette,
    colors: {
      ...theme.colors,
      background: palette.bgColor,
      backgroundAlt: palette.backgroundAlt,
      surface: palette.surfaceCardBg,
      surfaceAlt: palette.surfaceCardBg,
      text: palette.primaryText,
      muted: palette.secondaryText,
      primary: palette.safeAccent,
      accent: palette.safeAccent,
      border: palette.surfaceBorder,
      glow: palette.glow,
    },
    caption: {
      ...theme.caption,
      background: palette.captionBg,
      text: palette.captionText,
      highlight: palette.captionHighlight,
      highlightText: palette.captionHighlightText,
    },
    card: {
      ...theme.card,
      background: palette.surfaceCardBg,
      border: `1px solid ${palette.surfaceBorder}`,
      shadow: isDark
        ? "0 24px 60px rgba(0, 0, 0, 0.5)"
        : "0 18px 44px rgba(15, 23, 42, 0.14)",
      backdropFilter: isDark ? "blur(18px)" : undefined,
    },
    character: {
      ...theme.character,
      body: palette.primaryText,
      face: isDark ? palette.bgColor : palette.surfaceCardBg,
      accent: palette.safeAccent,
      shadow: isDark ? "rgba(0, 0, 0, 0.55)" : "rgba(15, 23, 42, 0.18)",
    },
  };
};

export const createTheme = (style: StyleId, brandKit?: BrandKit): Theme => {
  const normalizedStyle = ((style as string) === "smart-mix"
    ? "smart_mix"
    : style) as StyleId;
  const base = BASE_THEMES[normalizedStyle] ?? BASE_THEMES.stickman;
  const kit = brandKit ?? {};
  const resolvedBackground = kit.background ?? base.colors.background;
  const palette = resolveWcagPalette({
    bgColor: resolvedBackground,
    accentColor: kit.primary ?? kit.accent ?? base.colors.primary,
    moodText: kit.name ?? "",
  });

  const themed = withWcagPalette(base, palette);

  return {
    ...themed,
    id: normalizedStyle,
    isDark: palette.isDark,
    colors: {
      ...themed.colors,
      ...(kit.secondary ? { secondary: kit.secondary } : {}),
      ...(kit.success ? { success: kit.success } : {}),
      ...(kit.danger ? { danger: kit.danger } : {}),
    },
    caption: {
      ...themed.caption,
    },
    card: {
      ...themed.card,
      ...(kit.radius !== undefined ? { radius: kit.radius } : {}),
    },
    character: {
      ...themed.character,
    },
    radius: kit.radius ?? base.radius,
    fontFamily: kit.font_body ?? base.fontFamily,
    displayFamily: kit.font_headline ?? base.displayFamily,
  };
};

export const alpha = (color: string, opacity: number): string => {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((char) => char + char)
            .join("")
        : hex;
    if (full.length === 6) {
      const value = parseInt(full, 16);
      const r = (value >> 16) & 255;
      const g = (value >> 8) & 255;
      const b = value & 255;
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
  }
  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", `, ${opacity})`);
  }
  if (color.startsWith("rgba(")) {
    return color.replace(/rgba\(([^)]+),\s*[\d.]+\)/, `rgba($1, ${opacity})`);
  }
  return color;
};
