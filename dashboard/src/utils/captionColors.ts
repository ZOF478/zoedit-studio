import type {
  BrandKit,
  CaptionAnimationStyle,
  CaptionColorSource,
  CaptionColors,
} from '../types/studio';

export const DEFAULT_CAPTION_BOTTOM_OFFSET = 20;

export const CAPTION_COLOR_SOURCES: CaptionColorSource[] = [
  'background',
  'text',
  'primary',
  'secondary',
  'accent',
  'custom',
];

export const DEFAULT_CAPTION_COLORS: CaptionColors = {
  background: '#38BDF8',
  text: '#F8FAFC',
  highlight: '#E77B40',
  backgroundSource: 'primary',
  textSource: 'text',
  highlightSource: 'accent',
};

export const CAPTION_STYLE_OPTIONS: Array<{
  value: CaptionAnimationStyle;
  labelAr: string;
  labelEn: string;
  hintAr: string;
  hintEn: string;
}> = [
  {
    value: 'word-by-word',
    labelAr: 'كلمة بكلمة',
    labelEn: 'Word by word',
    hintAr: 'ظهور كل كلمة بتدرج مع النطق',
    hintEn: 'Each word pops in as it is spoken',
  },
  {
    value: 'karaoke',
    labelAr: 'تلوين متتابع مع النطق',
    labelEn: 'Karaoke highlight',
    hintAr: 'تلوين الكلمة النشطة أثناء النطق',
    hintEn: 'Active word highlight synced to speech',
  },
  {
    value: 'static',
    labelAr: 'ثابتة',
    labelEn: 'Static',
    hintAr: 'كتلة ترجمة نظيفة ثابتة',
    hintEn: 'One clean, readable subtitle block',
  },
];

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function normalizeCaptionColorSource(
  value: unknown,
  fallback: CaptionColorSource,
): CaptionColorSource {
  return typeof value === 'string' &&
    (CAPTION_COLOR_SOURCES as string[]).includes(value)
    ? (value as CaptionColorSource)
    : fallback;
}

export function brandColorForSource(
  source: CaptionColorSource,
  brandKit: BrandKit,
): string {
  switch (source) {
    case 'background':
      return brandKit.bgColor;
    case 'text':
      return brandKit.textColor;
    case 'secondary':
      return brandKit.secondaryColor;
    case 'accent':
      return brandKit.accentColor;
    case 'primary':
    default:
      return brandKit.primaryColor;
  }
}

export function resolveCaptionColor(
  value: string | undefined,
  source: CaptionColorSource | undefined,
  brandKit: BrandKit,
  fallback: string,
): string {
  if (source && source !== 'custom') {
    return brandColorForSource(source, brandKit);
  }
  if (typeof value === 'string' && HEX_COLOR_PATTERN.test(value.trim())) {
    return value.trim().toUpperCase();
  }
  return fallback;
}

export function resolveCaptionColors(
  colors: CaptionColors,
  brandKit: BrandKit,
): { background: string; text: string; highlight: string } {
  return {
    background: resolveCaptionColor(
      colors.background,
      normalizeCaptionColorSource(colors.backgroundSource, 'primary'),
      brandKit,
      brandKit.primaryColor,
    ),
    text: resolveCaptionColor(
      colors.text,
      normalizeCaptionColorSource(colors.textSource, 'text'),
      brandKit,
      brandKit.textColor,
    ),
    highlight: resolveCaptionColor(
      colors.highlight,
      normalizeCaptionColorSource(colors.highlightSource, 'accent'),
      brandKit,
      brandKit.accentColor,
    ),
  };
}

export function normalizeCaptionBottomOffset(
  value: unknown,
  fallback = DEFAULT_CAPTION_BOTTOM_OFFSET,
): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(40, Math.max(10, Math.round(numeric)));
}

export function resolveCaptionStyle(
  value: CaptionAnimationStyle | undefined,
): 'word-by-word' | 'karaoke' | 'static' {
  switch (value) {
    case 'karaoke':
    case 'dynamic-karaoke':
      return 'karaoke';
    case 'static':
    case 'smooth-chunk-slide':
      return 'static';
    case 'word-by-word':
    case 'word-pop-glow':
    case 'kinetic-typewriter':
    default:
      return 'word-by-word';
  }
}
