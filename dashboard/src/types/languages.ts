export type VideoLanguageDirection = "rtl" | "ltr";

export interface VideoLanguage {
  code: string;
  name: string;
  native: string;
  dir: VideoLanguageDirection;
}

export const DEFAULT_VIDEO_LANGUAGE = "ar";

export const VIDEO_LANGUAGES: VideoLanguage[] = [
  { code: "ar", name: "Arabic", native: "العربية", dir: "rtl" },
  { code: "en", name: "English", native: "English", dir: "ltr" },
  { code: "fr", name: "French", native: "Français", dir: "ltr" },
  { code: "es", name: "Spanish", native: "Español", dir: "ltr" },
  { code: "de", name: "German", native: "Deutsch", dir: "ltr" },
  { code: "tr", name: "Turkish", native: "Türkçe", dir: "ltr" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia", dir: "ltr" },
  { code: "ur", name: "Urdu", native: "اردو", dir: "rtl" },
  { code: "hi", name: "Hindi", native: "हिन्दी", dir: "ltr" },
  { code: "ru", name: "Russian", native: "Русский", dir: "ltr" },
  { code: "pt", name: "Portuguese", native: "Português", dir: "ltr" },
  { code: "it", name: "Italian", native: "Italiano", dir: "ltr" },
  { code: "ja", name: "Japanese", native: "日本語", dir: "ltr" },
  { code: "ko", name: "Korean", native: "한국어", dir: "ltr" },
  { code: "zh", name: "Chinese", native: "中文", dir: "ltr" },
  { code: "nl", name: "Dutch", native: "Nederlands", dir: "ltr" },
  { code: "pl", name: "Polish", native: "Polski", dir: "ltr" },
  { code: "sv", name: "Swedish", native: "Svenska", dir: "ltr" },
  { code: "fa", name: "Persian", native: "فارسی", dir: "rtl" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu", dir: "ltr" },
  { code: "bn", name: "Bengali", native: "বাংলা", dir: "ltr" },
  { code: "sw", name: "Swahili", native: "Kiswahili", dir: "ltr" },
  { code: "he", name: "Hebrew", native: "עברית", dir: "rtl" },
  { code: "th", name: "Thai", native: "ไทย", dir: "ltr" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt", dir: "ltr" },
  { code: "uk", name: "Ukrainian", native: "Українська", dir: "ltr" },
  { code: "ro", name: "Romanian", native: "Română", dir: "ltr" },
  { code: "el", name: "Greek", native: "Ελληνικά", dir: "ltr" },
  { code: "cs", name: "Czech", native: "Čeština", dir: "ltr" },
  { code: "hu", name: "Hungarian", native: "Magyar", dir: "ltr" },
  { code: "fi", name: "Finnish", native: "Suomi", dir: "ltr" },
  { code: "da", name: "Danish", native: "Dansk", dir: "ltr" },
  { code: "no", name: "Norwegian", native: "Norsk", dir: "ltr" },
  { code: "sk", name: "Slovak", native: "Slovenčina", dir: "ltr" },
  { code: "bg", name: "Bulgarian", native: "Български", dir: "ltr" },
  { code: "sr", name: "Serbian", native: "Српски", dir: "ltr" },
  { code: "hr", name: "Croatian", native: "Hrvatski", dir: "ltr" },
  { code: "sl", name: "Slovenian", native: "Slovenščina", dir: "ltr" },
  { code: "lt", name: "Lithuanian", native: "Lietuvių", dir: "ltr" },
  { code: "lv", name: "Latvian", native: "Latviešu", dir: "ltr" },
  { code: "et", name: "Estonian", native: "Eesti", dir: "ltr" },
  { code: "ca", name: "Catalan", native: "Català", dir: "ltr" },
  { code: "eu", name: "Basque", native: "Euskara", dir: "ltr" },
  { code: "gl", name: "Galician", native: "Galego", dir: "ltr" },
  { code: "af", name: "Afrikaans", native: "Afrikaans", dir: "ltr" },
  { code: "am", name: "Amharic", native: "አማርኛ", dir: "ltr" },
  { code: "az", name: "Azerbaijani", native: "Azərbaycan", dir: "ltr" },
  { code: "be", name: "Belarusian", native: "Беларуская", dir: "ltr" },
  { code: "bs", name: "Bosnian", native: "Bosanski", dir: "ltr" },
  { code: "ceb", name: "Cebuano", native: "Cebuano", dir: "ltr" },
  { code: "co", name: "Corsican", native: "Corsu", dir: "ltr" },
  { code: "cy", name: "Welsh", native: "Cymraeg", dir: "ltr" },
  { code: "eo", name: "Esperanto", native: "Esperanto", dir: "ltr" },
  { code: "fy", name: "Frisian", native: "Frysk", dir: "ltr" },
  { code: "ga", name: "Irish", native: "Gaeilge", dir: "ltr" },
  { code: "gd", name: "Scottish Gaelic", native: "Gàidhlig", dir: "ltr" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી", dir: "ltr" },
  { code: "ha", name: "Hausa", native: "Hausa", dir: "ltr" },
  { code: "haw", name: "Hawaiian", native: "ʻŌlelo Hawaiʻi", dir: "ltr" },
  { code: "hmn", name: "Hmong", native: "Hmoob", dir: "ltr" },
  { code: "ht", name: "Haitian Creole", native: "Kreyòl Ayisyen", dir: "ltr" },
  { code: "hy", name: "Armenian", native: "Հայերեն", dir: "ltr" },
  { code: "ig", name: "Igbo", native: "Igbo", dir: "ltr" },
  { code: "is", name: "Icelandic", native: "Íslenska", dir: "ltr" },
  { code: "jv", name: "Javanese", native: "Basa Jawa", dir: "ltr" },
  { code: "ka", name: "Georgian", native: "ქართული", dir: "ltr" },
  { code: "kk", name: "Kazakh", native: "Қазақша", dir: "ltr" },
  { code: "km", name: "Khmer", native: "ខ្មែរ", dir: "ltr" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ", dir: "ltr" },
  { code: "ku", name: "Kurdish", native: "Kurdî", dir: "rtl" },
  { code: "ky", name: "Kyrgyz", native: "Кыргызча", dir: "ltr" },
  { code: "la", name: "Latin", native: "Latina", dir: "ltr" },
  { code: "lb", name: "Luxembourgish", native: "Lëtzebuergesch", dir: "ltr" },
  { code: "lo", name: "Lao", native: "ລາວ", dir: "ltr" },
  { code: "mk", name: "Macedonian", native: "Македонски", dir: "ltr" },
  { code: "ml", name: "Malayalam", native: "മലയാളം", dir: "ltr" },
  { code: "mn", name: "Mongolian", native: "Монгол", dir: "ltr" },
  { code: "mr", name: "Marathi", native: "मराठी", dir: "ltr" },
  { code: "mt", name: "Maltese", native: "Malti", dir: "ltr" },
  { code: "my", name: "Burmese", native: "မြန်မာ", dir: "ltr" },
  { code: "ne", name: "Nepali", native: "नेपाली", dir: "ltr" },
  { code: "ny", name: "Chichewa", native: "Chichewa", dir: "ltr" },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ", dir: "ltr" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ", dir: "ltr" },
  { code: "ps", name: "Pashto", native: "پښتو", dir: "rtl" },
  { code: "rw", name: "Kinyarwanda", native: "Ikinyarwanda", dir: "ltr" },
  { code: "sd", name: "Sindhi", native: "سنڌي", dir: "rtl" },
  { code: "si", name: "Sinhala", native: "සිංහල", dir: "ltr" },
  { code: "sm", name: "Samoan", native: "Gagana Samoa", dir: "ltr" },
  { code: "sn", name: "Shona", native: "ChiShona", dir: "ltr" },
  { code: "so", name: "Somali", native: "Soomaali", dir: "ltr" },
  { code: "sq", name: "Albanian", native: "Shqip", dir: "ltr" },
  { code: "st", name: "Sesotho", native: "Sesotho", dir: "ltr" },
  { code: "su", name: "Sundanese", native: "Basa Sunda", dir: "ltr" },
  { code: "ta", name: "Tamil", native: "தமிழ்", dir: "ltr" },
  { code: "te", name: "Telugu", native: "తెలుగు", dir: "ltr" },
  { code: "tg", name: "Tajik", native: "Тоҷикӣ", dir: "ltr" },
  { code: "tl", name: "Filipino", native: "Filipino", dir: "ltr" },
  { code: "tt", name: "Tatar", native: "Татарча", dir: "ltr" },
  { code: "tk", name: "Turkmen", native: "Türkmençe", dir: "ltr" },
  { code: "ug", name: "Uyghur", native: "ئۇيغۇرچە", dir: "rtl" },
  { code: "uz", name: "Uzbek", native: "Oʻzbek", dir: "ltr" },
  { code: "xh", name: "Xhosa", native: "isiXhosa", dir: "ltr" },
  { code: "yi", name: "Yiddish", native: "ייִדיש", dir: "rtl" },
  { code: "yo", name: "Yoruba", native: "Yorùbá", dir: "ltr" },
  { code: "zu", name: "Zulu", native: "isiZulu", dir: "ltr" },
];

const LANGUAGE_BY_CODE = new Map(
  VIDEO_LANGUAGES.map((language) => [language.code.toLowerCase(), language]),
);

const LANGUAGE_BY_LABEL = new Map<string, VideoLanguage>();
for (const language of VIDEO_LANGUAGES) {
  LANGUAGE_BY_LABEL.set(language.name.toLowerCase(), language);
  LANGUAGE_BY_LABEL.set(language.native.toLowerCase(), language);
}

export function getVideoLanguage(code: string | undefined): VideoLanguage {
  const normalized = (code || "").trim().toLowerCase();
  return (
    LANGUAGE_BY_CODE.get(normalized) ||
    LANGUAGE_BY_LABEL.get(normalized) ||
    LANGUAGE_BY_CODE.get(DEFAULT_VIDEO_LANGUAGE)!
  );
}

export function normalizeVideoLanguage(
  value: unknown,
  fallback: string = DEFAULT_VIDEO_LANGUAGE,
): string {
  const candidate = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!candidate) return fallback;
  const byCode = LANGUAGE_BY_CODE.get(candidate);
  if (byCode) return byCode.code;
  const byLabel = LANGUAGE_BY_LABEL.get(candidate);
  if (byLabel) return byLabel.code;
  return fallback;
}

export function videoLanguageName(code: string | undefined): string {
  return getVideoLanguage(code).name;
}

export function formatVideoLanguageLabel(code: string | undefined): string {
  const language = getVideoLanguage(code);
  return language.native === language.name
    ? language.name
    : `${language.native} - ${language.name}`;
}

export function searchVideoLanguages(query: string): VideoLanguage[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return VIDEO_LANGUAGES;
  return VIDEO_LANGUAGES.filter((language) => {
    return (
      language.code.toLowerCase().includes(needle) ||
      language.name.toLowerCase().includes(needle) ||
      language.native.toLowerCase().includes(needle)
    );
  });
}
