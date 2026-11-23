import { colord } from 'colord';

export type WcagLevel = 'AAA' | 'AA' | 'AA Large' | 'Fail';

export type WcagResult = {
  ratio: number;
  level: WcagLevel;
  tone: 'pass' | 'warn' | 'fail';
};

export type Palette = {
  bgColor: string;
  textColor: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
};

export type PalettePreset = {
  id: string;
  labelAr: string;
  labelEn: string;
  colors: Palette;
};

export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: 'zof-sunrise',
    labelAr: 'شروق زوف',
    labelEn: 'Zof Sunrise',
    colors: {
      bgColor: '#1D150C',
      textColor: '#FFF7ED',
      primaryColor: '#E77B40',
      secondaryColor: '#FBBF24',
      accentColor: '#F97316',
    },
  },
  {
    id: 'midnight-sky',
    labelAr: 'سماء منتصف الليل',
    labelEn: 'Midnight Sky',
    colors: {
      bgColor: '#0B0F17',
      textColor: '#F8FAFC',
      primaryColor: '#38BDF8',
      secondaryColor: '#FBBF24',
      accentColor: '#E77B40',
    },
  },
  {
    id: 'emerald-focus',
    labelAr: 'تركيز زمردي',
    labelEn: 'Emerald Focus',
    colors: {
      bgColor: '#06140F',
      textColor: '#ECFDF5',
      primaryColor: '#10B981',
      secondaryColor: '#A7F3D0',
      accentColor: '#34D399',
    },
  },
  {
    id: 'royal-violet',
    labelAr: 'بنفسجي ملكي',
    labelEn: 'Royal Violet',
    colors: {
      bgColor: '#0F0A1E',
      textColor: '#F5F3FF',
      primaryColor: '#8B5CF6',
      secondaryColor: '#F0ABFC',
      accentColor: '#C084FC',
    },
  },
  {
    id: 'editorial-paper',
    labelAr: 'ورق تحريري',
    labelEn: 'Editorial Paper',
    colors: {
      bgColor: '#F4F3EF',
      textColor: '#1F2937',
      primaryColor: '#1A85D1',
      secondaryColor: '#B45309',
      accentColor: '#E77B40',
    },
  },
  {
    id: 'crimson-pulse',
    labelAr: 'نبض قرمزي',
    labelEn: 'Crimson Pulse',
    colors: {
      bgColor: '#16080C',
      textColor: '#FFF1F2',
      primaryColor: '#F43F5E',
      secondaryColor: '#FBBF24',
      accentColor: '#FB7185',
    },
  },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const channelLuminance = (value: number): number => {
  const channel = value / 255;
  return channel <= 0.03928
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
};

export function relativeLuminance(color: string): number | null {
  const parsed = colord(color);
  if (!parsed.isValid()) return null;
  const { r, g, b } = parsed.toRgb();
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

export function contrastRatio(foreground: string, background: string): number {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  if (fg === null || bg === null) return 0;
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function wcagResult(ratio: number, largeText = false): WcagResult {
  if (largeText) {
    if (ratio >= 4.5) return { ratio, level: 'AAA', tone: 'pass' };
    if (ratio >= 3) return { ratio, level: 'AA Large', tone: 'pass' };
    return { ratio, level: 'Fail', tone: 'fail' };
  }
  if (ratio >= 7) return { ratio, level: 'AAA', tone: 'pass' };
  if (ratio >= 4.5) return { ratio, level: 'AA', tone: 'pass' };
  return { ratio, level: 'Fail', tone: 'fail' };
}

export function wcagToneClasses(tone: WcagResult['tone']): string {
  if (tone === 'pass') return 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200';
  if (tone === 'warn') return 'border-amber-400/40 bg-amber-500/15 text-amber-200';
  return 'border-red-500/40 bg-red-500/15 text-red-200';
}

const toHex = (h: number, s: number, l: number): string =>
  colord({ h: ((h % 360) + 360) % 360, s: clamp(s, 0, 100), l: clamp(l, 0, 100) })
    .toHex()
    .toUpperCase();

export function randomHarmonyPalette(): Palette {
  const baseHue = Math.round(Math.random() * 360);
  const isDark = Math.random() > 0.32;
  const mode = Math.floor(Math.random() * 3);
  const primaryHue = (baseHue + (mode === 1 ? 120 : 32)) % 360;
  const accentHue = (baseHue + (mode === 2 ? 180 : 300)) % 360;
  const secondaryHue = (baseHue + 68) % 360;

  return {
    bgColor: toHex(baseHue, isDark ? 36 : 24, isDark ? 7 : 96),
    textColor: isDark ? '#F8FAFC' : '#0B0F17',
    primaryColor: toHex(primaryHue, 72, isDark ? 64 : 44),
    secondaryColor: toHex(secondaryHue, 74, isDark ? 68 : 46),
    accentColor: toHex(accentHue, 78, isDark ? 62 : 46),
  };
}

export function normalizeHex(value: string, fallback: string): string {
  const parsed = colord(value);
  return parsed.isValid() ? parsed.toHex().toUpperCase() : fallback;
}
