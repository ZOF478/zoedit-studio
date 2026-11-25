import { continueRender, delayRender } from "remotion";
import { getInfo as getCairoInfo } from "@remotion/google-fonts/Cairo";
import { getInfo as getNotoSansInfo } from "@remotion/google-fonts/NotoSans";
import { getInfo as getNotoSansArabicInfo } from "@remotion/google-fonts/NotoSansArabic";
import { getInfo as getNotoSansHebrewInfo } from "@remotion/google-fonts/NotoSansHebrew";
import { getInfo as getNotoSansDevanagariInfo } from "@remotion/google-fonts/NotoSansDevanagari";
import { getInfo as getNotoSansBengaliInfo } from "@remotion/google-fonts/NotoSansBengali";
import { getInfo as getNotoSansGurmukhiInfo } from "@remotion/google-fonts/NotoSansGurmukhi";
import { getInfo as getNotoSansGujaratiInfo } from "@remotion/google-fonts/NotoSansGujarati";
import { getInfo as getNotoSansTamilInfo } from "@remotion/google-fonts/NotoSansTamil";
import { getInfo as getNotoSansTeluguInfo } from "@remotion/google-fonts/NotoSansTelugu";
import { getInfo as getNotoSansKannadaInfo } from "@remotion/google-fonts/NotoSansKannada";
import { getInfo as getNotoSansMalayalamInfo } from "@remotion/google-fonts/NotoSansMalayalam";
import { getInfo as getNotoSansSinhalaInfo } from "@remotion/google-fonts/NotoSansSinhala";
import { getInfo as getNotoSansThaiInfo } from "@remotion/google-fonts/NotoSansThai";
import { getInfo as getNotoSansKhmerInfo } from "@remotion/google-fonts/NotoSansKhmer";
import { getInfo as getNotoSansMyanmarInfo } from "@remotion/google-fonts/NotoSansMyanmar";
import { getInfo as getNotoSansEthiopicInfo } from "@remotion/google-fonts/NotoSansEthiopic";
import { getInfo as getNotoSansArmenianInfo } from "@remotion/google-fonts/NotoSansArmenian";
import { getInfo as getNotoSansGeorgianInfo } from "@remotion/google-fonts/NotoSansGeorgian";
import { getInfo as getNotoSansJPInfo } from "@remotion/google-fonts/NotoSansJP";
import { getInfo as getNotoSansKRInfo } from "@remotion/google-fonts/NotoSansKR";
import { getInfo as getNotoSansSCInfo } from "@remotion/google-fonts/NotoSansSC";
import { getInfo as getNotoSansTCInfo } from "@remotion/google-fonts/NotoSansTC";

type FontInfo = {
  fontFamily: string;
  unicodeRanges: Record<string, string>;
  fonts: {
    normal?: Record<string, Record<string, string> | undefined>;
  };
};

type FontSource = {
  family: string;
  info: FontInfo;
  weights: readonly string[];
  subsets: readonly string[];
  allSubsets?: boolean;
};

const LATIN_SUBSETS = ["latin", "latin-ext"] as const;
const EURO_SUBSETS = [
  "latin",
  "latin-ext",
  "cyrillic",
  "cyrillic-ext",
  "greek",
  "greek-ext",
  "vietnamese",
] as const;
const CORE_WEIGHTS = ["400", "500", "600", "700", "800", "900"] as const;
const HERO_WEIGHTS = ["400", "600", "700", "800", "900"] as const;

const fontSource = (
  family: string,
  info: unknown,
  weights: readonly string[],
  subsets: readonly string[],
  allSubsets = false,
): FontSource => ({
  family,
  info: info as FontInfo,
  weights,
  subsets,
  allSubsets,
});

const CAIRO = fontSource(
  "Cairo",
  getCairoInfo(),
  CORE_WEIGHTS,
  ["arabic", ...LATIN_SUBSETS],
);
const NOTO_SANS = fontSource(
  "Noto Sans",
  getNotoSansInfo(),
  CORE_WEIGHTS,
  EURO_SUBSETS,
);
const NOTO_SANS_ARABIC = fontSource(
  "Noto Sans Arabic",
  getNotoSansArabicInfo(),
  CORE_WEIGHTS,
  ["arabic", ...LATIN_SUBSETS],
);
const NOTO_SANS_HEBREW = fontSource(
  "Noto Sans Hebrew",
  getNotoSansHebrewInfo(),
  CORE_WEIGHTS,
  ["hebrew", ...LATIN_SUBSETS],
);
const NOTO_SANS_DEVANAGARI = fontSource(
  "Noto Sans Devanagari",
  getNotoSansDevanagariInfo(),
  CORE_WEIGHTS,
  ["devanagari", ...LATIN_SUBSETS],
);
const NOTO_SANS_BENGALI = fontSource(
  "Noto Sans Bengali",
  getNotoSansBengaliInfo(),
  CORE_WEIGHTS,
  ["bengali", ...LATIN_SUBSETS],
);
const NOTO_SANS_GURMUKHI = fontSource(
  "Noto Sans Gurmukhi",
  getNotoSansGurmukhiInfo(),
  CORE_WEIGHTS,
  ["gurmukhi", ...LATIN_SUBSETS],
);
const NOTO_SANS_GUJARATI = fontSource(
  "Noto Sans Gujarati",
  getNotoSansGujaratiInfo(),
  CORE_WEIGHTS,
  ["gujarati", ...LATIN_SUBSETS],
);
const NOTO_SANS_TAMIL = fontSource(
  "Noto Sans Tamil",
  getNotoSansTamilInfo(),
  CORE_WEIGHTS,
  ["tamil", ...LATIN_SUBSETS],
);
const NOTO_SANS_TELUGU = fontSource(
  "Noto Sans Telugu",
  getNotoSansTeluguInfo(),
  CORE_WEIGHTS,
  ["telugu", ...LATIN_SUBSETS],
);
const NOTO_SANS_KANNADA = fontSource(
  "Noto Sans Kannada",
  getNotoSansKannadaInfo(),
  CORE_WEIGHTS,
  ["kannada", ...LATIN_SUBSETS],
);
const NOTO_SANS_MALAYALAM = fontSource(
  "Noto Sans Malayalam",
  getNotoSansMalayalamInfo(),
  CORE_WEIGHTS,
  ["malayalam", ...LATIN_SUBSETS],
);
const NOTO_SANS_SINHALA = fontSource(
  "Noto Sans Sinhala",
  getNotoSansSinhalaInfo(),
  CORE_WEIGHTS,
  ["sinhala", ...LATIN_SUBSETS],
);
const NOTO_SANS_THAI = fontSource(
  "Noto Sans Thai",
  getNotoSansThaiInfo(),
  CORE_WEIGHTS,
  ["thai", ...LATIN_SUBSETS],
);
const NOTO_SANS_KHMER = fontSource(
  "Noto Sans Khmer",
  getNotoSansKhmerInfo(),
  CORE_WEIGHTS,
  ["khmer", ...LATIN_SUBSETS],
);
const NOTO_SANS_MYANMAR = fontSource(
  "Noto Sans Myanmar",
  getNotoSansMyanmarInfo(),
  CORE_WEIGHTS,
  ["myanmar", ...LATIN_SUBSETS],
);
const NOTO_SANS_ETHIOPIC = fontSource(
  "Noto Sans Ethiopic",
  getNotoSansEthiopicInfo(),
  CORE_WEIGHTS,
  ["ethiopic", ...LATIN_SUBSETS],
);
const NOTO_SANS_ARMENIAN = fontSource(
  "Noto Sans Armenian",
  getNotoSansArmenianInfo(),
  CORE_WEIGHTS,
  ["armenian", ...LATIN_SUBSETS],
);
const NOTO_SANS_GEORGIAN = fontSource(
  "Noto Sans Georgian",
  getNotoSansGeorgianInfo(),
  CORE_WEIGHTS,
  ["georgian", ...LATIN_SUBSETS],
);
const NOTO_SANS_JP = fontSource(
  "Noto Sans JP",
  getNotoSansJPInfo(),
  HERO_WEIGHTS,
  [],
  true,
);
const NOTO_SANS_KR = fontSource(
  "Noto Sans KR",
  getNotoSansKRInfo(),
  HERO_WEIGHTS,
  [],
  true,
);
const NOTO_SANS_SC = fontSource(
  "Noto Sans SC",
  getNotoSansSCInfo(),
  HERO_WEIGHTS,
  [],
  true,
);
const NOTO_SANS_TC = fontSource(
  "Noto Sans TC",
  getNotoSansTCInfo(),
  HERO_WEIGHTS,
  [],
  true,
);

const ALL_FONT_SOURCES = [
  CAIRO,
  NOTO_SANS,
  NOTO_SANS_ARABIC,
  NOTO_SANS_HEBREW,
  NOTO_SANS_DEVANAGARI,
  NOTO_SANS_BENGALI,
  NOTO_SANS_GURMUKHI,
  NOTO_SANS_GUJARATI,
  NOTO_SANS_TAMIL,
  NOTO_SANS_TELUGU,
  NOTO_SANS_KANNADA,
  NOTO_SANS_MALAYALAM,
  NOTO_SANS_SINHALA,
  NOTO_SANS_THAI,
  NOTO_SANS_KHMER,
  NOTO_SANS_MYANMAR,
  NOTO_SANS_ETHIOPIC,
  NOTO_SANS_ARMENIAN,
  NOTO_SANS_GEORGIAN,
  NOTO_SANS_JP,
  NOTO_SANS_KR,
  NOTO_SANS_SC,
  NOTO_SANS_TC,
];

export const FONT_FAMILY = [
  ...ALL_FONT_SOURCES.map((source) => `'${source.family}'`),
  "'Segoe UI'",
  "system-ui",
  "sans-serif",
].join(", ");

const SCRIPT_FONT_BY_LANGUAGE: Record<string, readonly FontSource[]> = {
  ar: [CAIRO, NOTO_SANS_ARABIC],
  fa: [CAIRO, NOTO_SANS_ARABIC],
  ur: [CAIRO, NOTO_SANS_ARABIC],
  ps: [CAIRO, NOTO_SANS_ARABIC],
  sd: [CAIRO, NOTO_SANS_ARABIC],
  ug: [CAIRO, NOTO_SANS_ARABIC],
  ku: [CAIRO, NOTO_SANS_ARABIC],
  ckb: [CAIRO, NOTO_SANS_ARABIC],
  he: [NOTO_SANS_HEBREW],
  yi: [NOTO_SANS_HEBREW],
  hi: [NOTO_SANS_DEVANAGARI],
  mr: [NOTO_SANS_DEVANAGARI],
  ne: [NOTO_SANS_DEVANAGARI],
  bn: [NOTO_SANS_BENGALI],
  pa: [NOTO_SANS_GURMUKHI],
  gu: [NOTO_SANS_GUJARATI],
  ta: [NOTO_SANS_TAMIL],
  te: [NOTO_SANS_TELUGU],
  kn: [NOTO_SANS_KANNADA],
  ml: [NOTO_SANS_MALAYALAM],
  si: [NOTO_SANS_SINHALA],
  th: [NOTO_SANS_THAI],
  km: [NOTO_SANS_KHMER],
  my: [NOTO_SANS_MYANMAR],
  am: [NOTO_SANS_ETHIOPIC],
  hy: [NOTO_SANS_ARMENIAN],
  ka: [NOTO_SANS_GEORGIAN],
  ja: [NOTO_SANS_JP],
  ko: [NOTO_SANS_KR],
  zh: [NOTO_SANS_SC],
  "zh-cn": [NOTO_SANS_SC],
  "zh-tw": [NOTO_SANS_TC],
  "zh-hk": [NOTO_SANS_TC],
};

const STYLE_ID = "zoedit-multilingual-font-faces";
const FONT_SAMPLE_TEXT =
  "أبجد هوز حطي كلمن עברית हिन्दी বাংলা ਪੰਜਾਬੀ ગુજરાતી தமிழ் తెలుగు ಕನ್ನಡ മലയാളം සිංහල ไทย ខ្មែរ မြန်မာ አማርኛ Հայերեն ქართული 日本語 한국어 中文繁體 abc ABC 123";
const injectedFamilies = new Set<string>();
const loadedFamilies = new Set<string>();

const isPlayer = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    (window as Window & { remotion_isPlayer?: boolean }).remotion_isPlayer ===
    true
  );
};

const fontsForLanguage = (language: string | undefined): FontSource[] => {
  const normalized = (language ?? "ar").slice(0, 5).toLowerCase();
  const base = normalized.split("-")[0];
  const scriptFonts =
    SCRIPT_FONT_BY_LANGUAGE[normalized] ??
    SCRIPT_FONT_BY_LANGUAGE[base] ??
    [];
  const sources = [CAIRO, NOTO_SANS, ...scriptFonts];

  return sources.filter(
    (source, index) =>
      sources.findIndex((candidate) => candidate.family === source.family) ===
      index,
  );
};

const activeSubsets = (source: FontSource): string[] =>
  source.allSubsets
    ? Object.keys(source.info.unicodeRanges)
    : [...source.subsets];

const availableWeights = (source: FontSource): string[] => {
  const subsets = activeSubsets(source);
  return source.weights.filter((weight) => {
    const faces = source.info.fonts.normal?.[weight];
    return Boolean(faces && subsets.some((subset) => faces[subset]));
  });
};

const injectFontFaces = (sources: FontSource[]): FontSource[] => {
  const missing = sources.filter(
    (source) => !injectedFamilies.has(source.family),
  );
  if (missing.length === 0) return [];

  let styleElement = document.getElementById(
    STYLE_ID,
  ) as HTMLStyleElement | null;
  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = STYLE_ID;
    document.head.appendChild(styleElement);
  }

  const faces: string[] = [];
  for (const source of missing) {
    const weights = availableWeights(source);
    const subsets = activeSubsets(source);
    for (const weight of weights) {
      const weightFaces = source.info.fonts.normal?.[weight];
      if (!weightFaces) continue;
      for (const subset of subsets) {
        const src = weightFaces[subset];
        if (!src) continue;
        const range = source.info.unicodeRanges[subset];
        faces.push(
          `@font-face{font-family:'${source.family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(${src}) format('woff2');${
            range ? `unicode-range:${range};` : ""
          }}`,
        );
      }
    }
    injectedFamilies.add(source.family);
  }

  if (faces.length > 0) {
    styleElement.textContent = `${styleElement.textContent ?? ""}${faces.join("\n")}`;
  }
  return missing;
};

const loadFontFamilies = (sources: FontSource[]): void => {
  if (isPlayer() || !("fonts" in document)) return;

  const pending = sources.filter((source) => !loadedFamilies.has(source.family));
  if (pending.length === 0) return;
  for (const source of pending) loadedFamilies.add(source.family);

  const handle = delayRender(
    `Loading multilingual fonts (${pending.map((source) => source.family).join(", ")})`,
    { timeoutInMilliseconds: 20000 },
  );
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    continueRender(handle);
  };
  const timeout = setTimeout(release, 15000);

  Promise.all(
    pending.flatMap((source) => {
      const weights = availableWeights(source);
      const sampleWeights = weights.filter((weight) =>
        ["400", "600", "700", "900"].includes(weight),
      );
      return (sampleWeights.length > 0 ? sampleWeights : weights).map((weight) =>
        document.fonts.load(
          `${weight} 64px "${source.family}"`,
          FONT_SAMPLE_TEXT,
        ),
      );
    }),
  )
    .catch(() => undefined)
    .then(() => {
      clearTimeout(timeout);
      release();
    });
};

export const ensureSceneFonts = (language?: string) => {
  if (typeof document === "undefined") return;

  const sources = fontsForLanguage(language);
  const injected = injectFontFaces(sources);
  if (injected.length > 0) {
    loadFontFamilies(injected);
  }
};

export const ensureCairoFont = () => {
  ensureSceneFonts("ar");
};
