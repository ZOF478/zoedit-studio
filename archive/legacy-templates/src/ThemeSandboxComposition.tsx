import { MainComposition } from "./Composition";
import type {
  BackgroundPresetId,
  CaptionAnimationStyle,
  Scene,
  StyleId,
  VideoData,
  WatermarkPosition,
  WordsPerScreen,
} from "./types";

export type SandboxScriptLanguage = "ar" | "en";

export type ThemeSandboxProps = {
  bgColor: string;
  accentColor: string;
  visualStyle: string;
  backgroundPreset: BackgroundPresetId;
  captionAnimationStyle: CaptionAnimationStyle;
  wordsPerScreen: WordsPerScreen;
  captionsEnabled: boolean;
  aspectRatio: "9:16" | "16:9" | "1:1";
  scriptLanguage: SandboxScriptLanguage;
  uiLanguage?: SandboxScriptLanguage;
  fps: number;
  watermark?: string;
  watermarkEnabled?: boolean;
  watermarkPosition?: WatermarkPosition;
};

export const THEME_SANDBOX_SECONDS = 7;

const mapStyle = (style: string): StyleId => {
  if (style === "modern-dark" || style === "modern_dark") return "modern_dark";
  if (style === "editorial-clean" || style === "editorial_clean") {
    return "editorial_clean";
  }
  if (style === "smart-mix" || style === "smart_mix") return "smart_mix";
  return "stickman";
};

const dimensions = (aspectRatio: ThemeSandboxProps["aspectRatio"]) => {
  if (aspectRatio === "16:9") return { width: 1920, height: 1080 };
  if (aspectRatio === "1:1") return { width: 1080, height: 1080 };
  return { width: 1080, height: 1920 };
};

const captionStyle = (style: CaptionAnimationStyle): CaptionAnimationStyle => style;

type SandboxCopy = {
  heroKicker: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCaption: string;
  heroBadge: string;
  heroElementKicker: string;
  heroElementSubtitle: string;
  chartKicker: string;
  chartTitle: string;
  chartSubtitle: string;
  chartCaption: string;
  chartElementTitle: string;
  chartLabels: string[];
  statKicker: string;
  statTitle: string;
  statSubtitle: string;
  statCaption: string;
  statLabel: string;
  compareKicker: string;
  compareTitle: string;
  compareSubtitle: string;
  compareCaption: string;
  compareElementTitle: string;
  compareLeftTitle: string;
  compareLeftSubtitle: string;
  compareLeftPoints: string[];
  compareRightTitle: string;
  compareRightSubtitle: string;
  compareRightPoints: string[];
};

const COPY: Record<SandboxScriptLanguage, SandboxCopy> = {
  ar: {
    heroKicker: "ستايل حي",
    heroTitle: "هوية بصرية متوازنة",
    heroSubtitle: "نفس الألوان على خلفية متحركة وكابشن متزامن",
    heroCaption: "هكذا يبدو الستايل والألوان قبل توليد السكربت",
    heroBadge: "زويد ستوديو",
    heroElementKicker: "ستايل حي",
    heroElementSubtitle: "هوية العلامة والخلفية المتحركة",
    chartKicker: "حركة",
    chartTitle: "مخطط حي بتباين واضح",
    chartSubtitle: "الألوان والكابشن يتحدثان فوراً",
    chartCaption: "كل تغيير في اللون أو الخلفية يظهر مباشرة",
    chartElementTitle: "تباين حي",
    chartLabels: ["اللون", "الخلفية", "النص", "الكابشن"],
    statKicker: "بيانات",
    statTitle: "أرقام تُقرأ من أول نظرة",
    statSubtitle: "حجم متوازن على كل مقاس",
    statCaption: "نفس الرقم يتكيف مع 9:16 و16:9 و1:1",
    statLabel: "تباين آمن",
    compareKicker: "تباين",
    compareTitle: "مقارنة بصرية واضحة",
    compareSubtitle: "بطاقات جانبية تتبدل تلقائياً حسب المقاس",
    compareCaption: "المقارنة تبقى واضحة في كل الاتجاهات",
    compareElementTitle: "تحويل الهوية",
    compareLeftTitle: "قبل",
    compareLeftSubtitle: "تشتت بصري",
    compareLeftPoints: ["ألوان متضاربة", "نص غير مقروء", "تخطيط مزدحم"],
    compareRightTitle: "بعد",
    compareRightSubtitle: "هوية متوازنة",
    compareRightPoints: ["تباين مدروس", "نص واضح", "تخطيط منظم"],
  },
  en: {
    heroKicker: "LIVE THEME",
    heroTitle: "A balanced visual identity",
    heroSubtitle: "The same palette across motion and synced captions",
    heroCaption: "This is how style and color feel before the script is generated",
    heroBadge: "ZOEDIT STUDIO",
    heroElementKicker: "Live theme sandbox",
    heroElementSubtitle: "Brand Kit + Animated Background",
    chartKicker: "MOTION",
    chartTitle: "Live chart, crisp contrast",
    chartSubtitle: "Colors and captions update instantly",
    chartCaption: "Every color or background change appears live",
    chartElementTitle: "Live contrast",
    chartLabels: ["Accent", "Surface", "Text", "Caption"],
    statKicker: "DATA",
    statTitle: "Numbers readable at a glance",
    statSubtitle: "Balanced scale on every frame",
    statCaption: "The same figure adapts to 9:16, 16:9, and 1:1",
    statLabel: "Safe contrast",
    compareKicker: "CONTRAST",
    compareTitle: "A clear visual comparison",
    compareSubtitle: "Side cards reflow automatically by aspect",
    compareCaption: "The comparison stays legible in every orientation",
    compareElementTitle: "Identity shift",
    compareLeftTitle: "Before",
    compareLeftSubtitle: "Visual noise",
    compareLeftPoints: ["Clashing colors", "Unreadable text", "Crowded layout"],
    compareRightTitle: "After",
    compareRightSubtitle: "Balanced identity",
    compareRightPoints: ["Measured contrast", "Clear type", "Organized layout"],
  },
};

const buildSandboxData = (props: ThemeSandboxProps): VideoData => {
  const { width, height } = dimensions(props.aspectRatio);
  const style = mapStyle(props.visualStyle);
  const language = props.uiLanguage ?? props.scriptLanguage;
  const copy = COPY[language];
  const isLandscape = props.aspectRatio === "16:9";
  const isSquare = props.aspectRatio === "1:1";
  const sceneSeconds = THEME_SANDBOX_SECONDS / 4;
  const sceneLayout = (
    portrait: Scene["layout"],
    landscape: Scene["layout"],
    square: Scene["layout"],
  ): Scene["layout"] => (isLandscape ? landscape : isSquare ? square : portrait);
  const allowCharacter = style === "stickman" || style === "smart_mix";
  const character = (
    pose: "explaining" | "pointing" | "thinking" | "celebrating",
    side: "left" | "right",
    accessory: "badge" | "tie" | "none",
  ) =>
    allowCharacter
      ? {
          pose,
          side,
          accessory,
          enabled: true,
        }
      : undefined;
  const scenes: Scene[] = [
    {
      id: "theme-sandbox-hero",
      kicker: copy.heroKicker,
      title: copy.heroTitle,
      subtitle: copy.heroSubtitle,
      caption: copy.heroCaption,
      duration: sceneSeconds,
      layout: sceneLayout("centered", "split", "split"),
      camera: "slow-zoom-in",
      backgroundPreset: props.backgroundPreset,
      character: character("explaining", "right", "badge"),
      elements: [
        {
          type: "hero_title",
          title: copy.heroTitle,
          subtitle: copy.heroElementSubtitle,
          kicker: copy.heroElementKicker,
          badge: copy.heroBadge,
        },
      ],
    },
    {
      id: "theme-sandbox-chart",
      kicker: copy.chartKicker,
      title: copy.chartTitle,
      subtitle: copy.chartSubtitle,
      caption: copy.chartCaption,
      duration: sceneSeconds,
      layout: sceneLayout("stacked", "split", "split"),
      camera: "push-in",
      backgroundPreset: props.backgroundPreset,
      character: character("pointing", "left", "tie"),
      elements: [
        {
          type: "bar_chart",
          title: copy.chartElementTitle,
          items: [
            { label: copy.chartLabels[0], value: 82 },
            { label: copy.chartLabels[1], value: 64 },
            { label: copy.chartLabels[2], value: 96 },
            { label: copy.chartLabels[3], value: 74 },
          ],
          suffix: "%",
        },
      ],
    },
    {
      id: "theme-sandbox-stat",
      kicker: copy.statKicker,
      title: copy.statTitle,
      subtitle: copy.statSubtitle,
      caption: copy.statCaption,
      duration: sceneSeconds,
      layout: sceneLayout("centered", "split", "split"),
      camera: "slow-zoom-out",
      backgroundPreset: props.backgroundPreset,
      character: character("thinking", "right", "none"),
      elements: [
        {
          type: "stat_number",
          value: 96,
          label: copy.statLabel,
          suffix: "%",
          icon: "shield",
        },
      ],
    },
    {
      id: "theme-sandbox-compare",
      kicker: copy.compareKicker,
      title: copy.compareTitle,
      subtitle: copy.compareSubtitle,
      caption: copy.compareCaption,
      duration: sceneSeconds,
      layout: sceneLayout("centered", "split", "centered"),
      camera: "pan-left",
      backgroundPreset: props.backgroundPreset,
      elements: [
        {
          type: "comparison_box",
          title: copy.compareElementTitle,
          left: {
            title: copy.compareLeftTitle,
            subtitle: copy.compareLeftSubtitle,
            icon: "x",
            tone: "negative",
            points: copy.compareLeftPoints,
          },
          right: {
            title: copy.compareRightTitle,
            subtitle: copy.compareRightSubtitle,
            icon: "check",
            tone: "positive",
            points: copy.compareRightPoints,
          },
        },
      ],
    },
  ];

  return {
    meta: {
      title: "Zoedit Studio Theme Sandbox",
      topic: "live-theme-sandbox",
      description: "Instant brand, background, style and caption preview",
    },
    width,
    height,
    fps: props.fps,
    style,
    script_language: language,
    caption: {
      animation_style: captionStyle(props.captionAnimationStyle),
      words_per_screen: props.wordsPerScreen,
      lead_in: 0.2,
      enabled: props.captionsEnabled,
    },
    brand_kit: {
      name: "ZOEDIT",
      primary: props.accentColor,
      accent: props.accentColor,
      secondary: props.accentColor,
      background: props.bgColor,
      watermark:
        typeof props.watermark === "string"
          ? props.watermark.trim().slice(0, 60)
          : "@ZoeditStudio",
      watermark_enabled: props.watermarkEnabled !== false,
      watermark_position: props.watermarkPosition ?? "top-left",
    },
    sfx: { enabled: false, volume: 0 },
    scenes,
  };
};

export const ThemeSandboxComposition = (props: ThemeSandboxProps) => {
  return <MainComposition data={buildSandboxData(props)} />;
};
