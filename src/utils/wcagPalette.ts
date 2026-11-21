import { colord, extend } from "colord";
import a11yPlugin from "colord/plugins/a11y";
import mixPlugin from "colord/plugins/mix";

extend([a11yPlugin, mixPlugin]);

export type WcagPalette = {
  isDark: boolean;
  nightMood: boolean;
  bgColor: string;
  backgroundAlt: string;
  surfaceCardBg: string;
  surfaceBorder: string;
  primaryText: string;
  headlineText: string;
  secondaryText: string;
  mutedText: string;
  safeAccent: string;
  accentOnSurface: string;
  captionBg: string;
  captionText: string;
  captionHighlight: string;
  captionHighlightText: string;
  glow: string;
  contrast: {
    headlineOnBg: number;
    accentOnBg: number;
    accentOnSurface: number;
    secondaryOnSurface: number;
  };
  cssVariables: Record<string, string>;
  promptBlock: string;
};

export type WcagPaletteInput = {
  bgColor?: string;
  accentColor?: string;
  secondaryColor?: string;
  moodText?: string;
  surfaceColor?: string;
};

const NIGHT_MOOD =
  /(ليلاً|ليل|ليلة|ظلام|مظلم|غرفة مظلمة|غرفة معتمة|منتصف الليل|night|dark|midnight|dim|noir)/i;

export const isNightMoodText = (text: string): boolean => NIGHT_MOOD.test(text);

const safeColor = (value: string | undefined, fallback: string): string => {
  if (!value) return fallback;
  const parsed = colord(value);
  return parsed.isValid() ? parsed.toHex() : fallback;
};

const isDarkColor = (value: string): boolean => colord(value).isDark();

const contrast = (foreground: string, background: string): number => {
  const ratio = colord(foreground).contrast(background);
  return Number.isFinite(ratio) ? ratio : 0;
};

const ensureContrast = (
  foreground: string,
  backgrounds: string[],
  minimum: number,
  fallback: string,
): string => {
  if (backgrounds.length === 0) return foreground;
  const passes = (candidate: string): boolean =>
    backgrounds.every((background) => contrast(candidate, background) >= minimum);

  if (passes(foreground)) return foreground;

  const reference = colord(backgrounds[0]);
  const lighten = reference.isDark();
  let candidate = colord(foreground);

  for (let step = 0; step < 40; step += 1) {
    candidate = lighten ? candidate.lighten(0.035) : candidate.darken(0.035);
    if (passes(candidate.toHex())) return candidate.toHex();
  }

  return passes(fallback) ? fallback : lighten ? "#FFFFFF" : "#000000";
};

const mix = (a: string, b: string, amount: number): string =>
  colord(a)
    .mix(b, Math.min(1, Math.max(0, amount)))
    .toHex();

const rgba = (hex: string, alpha: number): string =>
  colord(hex)
    .alpha(Math.min(1, Math.max(0, alpha)))
    .toRgbString();

const buildPromptBlock = (
  palette: Omit<WcagPalette, "promptBlock" | "cssVariables">,
): string => {
  const vars = Object.entries({
    "--zof-bg": palette.bgColor,
    "--zof-bg-alt": palette.backgroundAlt,
    "--zof-card-bg": palette.surfaceCardBg,
    "--zof-card-border": palette.surfaceBorder,
    "--zof-text": palette.primaryText,
    "--zof-headline": palette.headlineText,
    "--zof-text-muted": palette.secondaryText,
    "--zof-accent": palette.safeAccent,
    "--zof-accent-on-surface": palette.accentOnSurface,
    "--zof-caption-bg": palette.captionBg,
    "--zof-caption-text": palette.captionText,
  })
    .map(([key, value]) => `${key}: ${value};`)
    .join("\n");

  return [
    "WCAG HARMONY CONTRACT (mandatory):",
    "Use these exact CSS variables and never invent low-contrast greys or blue-greys:",
    vars,
    `Background is ${palette.isDark ? "DARK" : "LIGHT"}. Headline contrast must stay >= 7:1 against --zof-bg.`,
    `Body/secondary text must stay >= 4.5:1 against --zof-card-bg (current ratio: ${palette.contrast.secondaryOnSurface.toFixed(2)}:1).`,
    `Accent must stay >= 4.5:1 against both --zof-bg and --zof-card-bg (current ratios: ${palette.contrast.accentOnBg.toFixed(2)}:1 / ${palette.contrast.accentOnSurface.toFixed(2)}:1).`,
    palette.nightMood
      ? "Night/dark mood is explicitly requested: keep a rich deep dark base and use light text; never place faint blue/grey text on dark cards."
      : "Keep cards clearly separated from the background using --zof-card-bg and --zof-card-border.",
    "Mobile typography at 1080x1920: headline 54px-68px bold (lineHeight 1.2); card body/comparison/axis labels 30px-36px semibold. Never use text below 26px.",
    "Reserve the bottom 220px as a strict safe zone for AnimatedCaption. Never place cards, characters, or controls there.",
  ].join("\n");
};

export const resolveWcagPalette = (
  input: WcagPaletteInput = {},
): WcagPalette => {
  const requestedBg = safeColor(input.bgColor, "#0B0F17");
  const accentSeed = safeColor(input.accentColor, "#E77B40");
  const moodText = input.moodText ?? "";
  const nightMood = NIGHT_MOOD.test(moodText);

  let bgColor = requestedBg;
  if (nightMood && !isDarkColor(requestedBg)) {
    bgColor = "#0B0F17";
  } else if (nightMood && isDarkColor(requestedBg)) {
    bgColor = colord(requestedBg).darken(0.08).toHex();
  }

  const isDark = isDarkColor(bgColor);
  const surfaceBase = input.surfaceColor
    ? safeColor(input.surfaceColor, bgColor)
    : bgColor;
  const surfaceCardBg = isDark
    ? mix(mix(surfaceBase, "#FFFFFF", 0.075), accentSeed, 0.035)
    : mix(mix(surfaceBase, "#FFFFFF", 0.72), accentSeed, 0.025);
  const backgroundAlt = isDark
    ? mix(bgColor, accentSeed, 0.09)
    : mix(bgColor, accentSeed, 0.06);

  const primarySeed = isDark ? "#F8FAFC" : "#0F172A";
  const primaryText = ensureContrast(primarySeed, [bgColor], 7, primarySeed);
  const headlineText = ensureContrast(primarySeed, [bgColor], 7, primarySeed);
  const secondarySeedText = mix(
    primaryText,
    isDark ? bgColor : surfaceCardBg,
    isDark ? 0.42 : 0.5,
  );
  const secondaryText = ensureContrast(
    secondarySeedText,
    [surfaceCardBg, bgColor],
    4.5,
    mix(primaryText, surfaceCardBg, 0.18),
  );
  const mutedText = ensureContrast(
    mix(secondaryText, surfaceCardBg, 0.22),
    [surfaceCardBg, bgColor],
    4.5,
    secondaryText,
  );
  const safeAccent = ensureContrast(
    accentSeed,
    [bgColor, surfaceCardBg],
    4.5,
    primaryText,
  );
  const accentOnSurface = ensureContrast(
    safeAccent,
    [surfaceCardBg],
    4.5,
    primaryText,
  );
  const surfaceBorder = mix(
    mix(surfaceCardBg, primaryText, isDark ? 0.2 : 0.16),
    accentSeed,
    0.14,
  );

  const captionBg = rgba(
    mix(bgColor, "#000000", isDark ? 0.24 : 0.1),
    0.92,
  );
  const captionText = ensureContrast(primaryText, [captionBg], 4.5, primaryText);
  const captionHighlight = ensureContrast(
    isDark ? colord(safeAccent).lighten(0.08).toHex() : safeAccent,
    [captionBg],
    4.5,
    safeAccent,
  );
  const captionHighlightText = isDarkColor(captionHighlight)
    ? "#FFFFFF"
    : "#0B0F17";

  const contrastStats = {
    headlineOnBg: contrast(headlineText, bgColor),
    accentOnBg: contrast(safeAccent, bgColor),
    accentOnSurface: contrast(accentOnSurface, surfaceCardBg),
    secondaryOnSurface: contrast(secondaryText, surfaceCardBg),
  };

  const base = {
    isDark,
    nightMood,
    bgColor,
    backgroundAlt,
    surfaceCardBg,
    surfaceBorder,
    primaryText,
    headlineText,
    secondaryText,
    mutedText,
    safeAccent,
    accentOnSurface,
    captionBg,
    captionText,
    captionHighlight,
    captionHighlightText,
    glow: rgba(safeAccent, 0.35),
    contrast: contrastStats,
  };

  return {
    ...base,
    cssVariables: {
      "--zof-bg": bgColor,
      "--zof-bg-alt": backgroundAlt,
      "--zof-card-bg": surfaceCardBg,
      "--zof-card-border": surfaceBorder,
      "--zof-text": primaryText,
      "--zof-headline": headlineText,
      "--zof-text-muted": secondaryText,
      "--zof-accent": safeAccent,
      "--zof-accent-on-surface": accentOnSurface,
      "--zof-caption-bg": captionBg,
      "--zof-caption-text": captionText,
    },
    promptBlock: buildPromptBlock(base),
  };
};

export const wcagCssVariableBlock = (palette: WcagPalette): string =>
  Object.entries(palette.cssVariables)
    .map(([key, value]) => `${key}: ${value};`)
    .join("\n");
