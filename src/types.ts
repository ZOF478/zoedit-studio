export type StyleId =
  | "stickman"
  | "modern_dark"
  | "editorial_clean"
  | "smart_mix";

export type WatermarkPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type CaptionAnimationStyle =
  | "auto"
  | "word_by_word"
  | "karaoke"
  | "static"
  | "word_pop_glow"
  | "dynamic_karaoke"
  | "smooth_chunk_slide"
  | "kinetic_typewriter";

export type WordsPerScreen = "auto" | 2 | 3 | 4 | 5;

export type WordTiming = {
  word: string;
  start: number;
  end: number;
};

export type UserAssetRole = "logo" | "screenshot";

export type UserAsset = {
  id: string;
  filename: string;
  src: string;
  url?: string;
  role: UserAssetRole;
  note?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  aspectRatio?: number;
  createdAt?: number;
};


export type CaptionColors = {
  background?: string;
  text?: string;
  highlight?: string;
};

export type CaptionConfig = {
  animation_style?: CaptionAnimationStyle;
  words_per_screen?: WordsPerScreen;
  lead_in?: number;
  colors?: CaptionColors;
  bottom_offset?: number;
  enabled?: boolean;
};

export type ScriptPacing = "fast" | "balanced" | "auto";

export type BackgroundPresetId =
  | "animated-mesh"
  | "kinetic-grid"
  | "floating-orbs"
  | "deep-wave"
  | "particle-field"
  | "editorial-paper"
  | "neon-cyber"
  | "ai-free";

export type GenerativeMotif =
  | "orbit"
  | "network"
  | "flow"
  | "funnel"
  | "cycle"
  | "constellation";

export type Pose =
  | "idle"
  | "walking"
  | "explaining"
  | "thinking"
  | "shocked"
  | "happy"
  | "sad"
  | "pointing"
  | "celebrating"
  | "idea"
  | "facepalm";

export type SceneLayout = "split" | "stacked" | "overlay" | "centered";

export type CharacterLayout = "side-by-side" | "top-bottom";

export type AmbientEnvironment =
  | "none"
  | "night-room"
  | "desk-lamp"
  | "rain-window"
  | "clock"
  | "phone-notifications"
  | "cozy-desk";

export type CameraMove =
  | "slow-zoom-in"
  | "slow-zoom-out"
  | "pan-left"
  | "pan-right"
  | "push-in"
  | "static";

export type IconName =
  | "money"
  | "chart"
  | "heart"
  | "clock"
  | "brain"
  | "shield"
  | "rocket"
  | "target"
  | "wallet"
  | "piggybank"
  | "trend"
  | "alert"
  | "check"
  | "x"
  | "lock"
  | "book"
  | "bulb"
  | "calendar"
  | "coin"
  | "home"
  | "car"
  | "trophy"
  | "globe"
  | "users"
  | "phone"
  | "star"
  | "arrow"
  | "spark"
  | "scale"
  | "bank"
  | "graduation"
  | "coffee"
  | "briefcase"
  | "key"
  | "cloud";

export type BrandKit = {
  name?: string;
  logo?: string;
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  background_alt?: string;
  surface?: string;
  surface_alt?: string;
  text?: string;
  muted?: string;
  border?: string;
  success?: string;
  danger?: string;
  glow?: string;
  caption_background?: string;
  caption_text?: string;
  caption_highlight?: string;
  caption_highlight_text?: string;
  font_headline?: string;
  font_body?: string;
  radius?: number;
  watermark?: string;
  watermark_enabled?: boolean;
  watermark_position?: WatermarkPosition;
};

export type CharacterConfig = {
  pose?: Pose;
  side?: "auto" | "left" | "right";
  accessory?: "none" | "tie" | "badge";
  scale?: number;
  enabled?: boolean;
  label?: string;
};

export type ComparisonSide = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  points?: string[];
  tone?: "positive" | "negative" | "neutral";
};

export type GridNode = {
  icon?: IconName;
  label: string;
  caption?: string;
  value?: string;
};

export type ChartItem = {
  label: string;
  value: number;
  caption?: string;
};

export type TimelineStep = {
  label: string;
  caption?: string;
  value?: string;
};

export type SfxCueSound =
  | "pop"
  | "tick"
  | "whoosh"
  | "rise"
  | "impact"
  | "chime"
  | "whoosh-soft"
  | "whoosh-whip"
  | "whoosh-fast"
  | "whoosh-deep"
  | "pop-soft"
  | "pop-bubble"
  | "pop-sharp"
  | "click-subtle"
  | "slide"
  | "type-tick"
  | "typing-click"
  | "toggle-soft"
  | "alert-warning"
  | "impact-soft"
  | "cinematic-hit"
  | "bass-drop"
  | "riser-build"
  | "cash-register";

export type SfxCue = {
  frameOffset: number;
  sound: SfxCueSound;
  volume?: number;
};

export type SceneElement =
  | {
      type: "comparison_box";
      title?: string;
      left: ComparisonSide;
      right: ComparisonSide;
    }
  | {
      type: "layer_stack";
      title?: string;
      items: string[];
    }
  | {
      type: "grid_nodes";
      title?: string;
      items: GridNode[];
    }
  | {
      type: "stat_number";
      value: number | string;
      label: string;
      prefix?: string;
      suffix?: string;
      decimals?: number;
      icon?: IconName;
    }
  | {
      type: "progress_bar";
      label: string;
      value: number;
      max?: number;
      suffix?: string;
      icon?: IconName;
    }
  | {
      type: "highlight_card";
      title: string;
      text: string;
      icon?: IconName;
      badge?: string;
    }
  | {
      type: "hero_title";
      title: string;
      subtitle?: string;
      kicker?: string;
      badge?: string;
    }
  | {
      type: "bar_chart";
      title?: string;
      items: ChartItem[];
      max?: number;
      suffix?: string;
    }
  | {
      type: "line_chart";
      title?: string;
      points: number[];
      xLabels?: string[];
      suffix?: string;
      label?: string;
    }
  | {
      type: "circular_gauge";
      title?: string;
      value: number;
      max?: number;
      suffix?: string;
      label?: string;
      icon?: IconName;
    }
  | {
      type: "step_timeline";
      title?: string;
      steps: TimelineStep[];
    }
  | {
      type: "notification_card";
      app?: string;
      title: string;
      message: string;
      time?: string;
      icon?: IconName;
      tone?: "info" | "success" | "warning";
    }
  | {
      type: "warning_card";
      title: string;
      text?: string;
      myth?: string;
      truth?: string;
      badge?: string;
      tone?: "warning" | "danger" | "myth";
    }
  | {
      type: "editorial_quote";
      quote: string;
      author?: string;
      source?: string;
      title?: string;
    }
  | {
      type: "bullet_list";
      title?: string;
      items: string[];
      icon?: IconName;
    }
  | {
      type: "cta";
      title: string;
      subtitle?: string;
      buttonLabel?: string;
      icon?: IconName;
    }
  | {
      type: "custom_visual";
      title: string;
      text?: string;
      prompt?: string;
      svg?: string;
      icon?: IconName;
    }
  | {
      type: "generative_scene";
      title?: string;
      headline: string;
      keywords: string[];
      motif?: GenerativeMotif;
      badge?: string;
    }
  | {
      type: "custom_tsx";
      component: string;
      title?: string;
      text?: string;
      keywords?: string[];
      data?: Record<string, unknown>;
    };

export type Scene = {
  id?: string;
  kicker?: string;
  title?: string;
  subtitle?: string;
  caption?: string;
  duration?: number;
  durationInSeconds?: number;
  durationInFrames?: number;
  background?: string;
  audioSrc?: string;
  audioDuration?: number;
  wordTimings?: WordTiming[];
  sfxSrc?: string;
  sfxAt?: number;
  sfxCues?: SfxCue[];
  layout?: SceneLayout;
  camera?: CameraMove;
  backgroundPreset?: BackgroundPresetId;
  backgroundSeed?: number;
  character?: CharacterConfig;
  characters?: CharacterConfig[];
  characterLayout?: CharacterLayout;
  ambientScene?: AmbientEnvironment;
  generatedComponent?: string;
  elements?: SceneElement[];
};

export type VideoData = {
  meta?: {
    title?: string;
    topic?: string;
    description?: string;
  };
  width?: number;
  height?: number;
  fps?: number;
  style?: StyleId;
  script_language?: string;
  language?: string;
  respect_safe_zone?: boolean;
  brand_kit?: BrandKit;
  caption?: CaptionConfig;
  user_assets?: UserAsset[];
  script_pacing?: ScriptPacing;
  sfx?: {
    enabled?: boolean;
    volume?: number;
  };
  video?: {
    width?: number;
    height?: number;
    fps?: number;
    style?: StyleId;
  };
  scenes: Scene[];
};
