import { Fragment } from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  TransitionSeries,
  springTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import {
  getSceneSequenceDurationInFrames,
  getSceneTimings,
  getVideoSettings,
  TRANSITION_DURATION_IN_FRAMES,
  type MainProps,
  type SceneTiming,
} from "./config";
import { GENERATED_SCENES } from "./generated";
import { GeneratedSceneBoundary } from "./components/GeneratedSceneBoundary";
import {
  SceneSfx,
  SceneSfxEnabledContext,
  SceneSfxVolumeContext,
} from "./components/SceneSfx";
import {
  DEFAULT_SFX_CUE_VOLUME,
  DEFAULT_SFX_VOLUME,
  MAX_SCENE_SFX_VOLUME,
  SFX_CUE_FILES,
} from "./sfx";
import type { CaptionConfig, Scene, SceneElement, SfxCue } from "./types";
import { ensureSceneFonts, FONT_FAMILY } from "./fonts";

type CustomTsxElement = Extract<SceneElement, { type: "custom_tsx" }>;

type ScenePalette = {
  background: string;
  accent: string;
  secondary: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  characterBody: string;
  characterFace: string;
  characterAccent: string;
  characterShadow: string;
};

const FALLBACK_ACCENT = "#E77B40";
const FALLBACK_BACKGROUND = "#0B0F17";

const transitionTiming = () =>
  springTiming({
    config: { damping: 200 },
    durationInFrames: TRANSITION_DURATION_IN_FRAMES,
  });

const renderSceneTransition = (index: number) => {
  const key = `transition-${index}`;
  const timing = transitionTiming();

  switch (index % 6) {
    case 0:
      return (
        <TransitionSeries.Transition
          key={key}
          presentation={slide({ direction: "from-left" })}
          timing={timing}
        />
      );
    case 1:
      return (
        <TransitionSeries.Transition
          key={key}
          presentation={fade()}
          timing={timing}
        />
      );
    case 2:
      return (
        <TransitionSeries.Transition
          key={key}
          presentation={wipe({ direction: "from-bottom" })}
          timing={timing}
        />
      );
    case 3:
      return (
        <TransitionSeries.Transition
          key={key}
          presentation={slide({ direction: "from-right" })}
          timing={timing}
        />
      );
    case 4:
      return (
        <TransitionSeries.Transition
          key={key}
          presentation={wipe({ direction: "from-left" })}
          timing={timing}
        />
      );
    default:
      return (
        <TransitionSeries.Transition
          key={key}
          presentation={slide({ direction: "from-bottom" })}
          timing={timing}
        />
      );
  }
};

const safeHex = (value: unknown, fallback: string): string => {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim())
    ? value.trim()
    : fallback;
};

const hexLuminance = (hex: string): number => {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(value.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const withAlpha = (hex: string, alpha: number): string => {
  const value = hex.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  const clamped = Math.min(1, Math.max(0, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
};

const mixHex = (a: string, b: string, amount: number): string => {
  const parse = (hex: string) => {
    const value = hex.replace("#", "");
    return [0, 2, 4].map((offset) =>
      Number.parseInt(value.slice(offset, offset + 2), 16),
    );
  };
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const ratio = Math.min(1, Math.max(0, amount));
  const channel = (from: number, to: number) =>
    Math.round(from + (to - from) * ratio)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r1, r2)}${channel(g1, g2)}${channel(b1, b2)}`;
};

const buildPalette = (scene: Scene, brand: Record<string, unknown>): ScenePalette => {
  const background = safeHex(brand.background, FALLBACK_BACKGROUND);
  const accent = safeHex(brand.accent ?? brand.primary, FALLBACK_ACCENT);
  const secondary = safeHex(brand.secondary, accent);
  const isDark = hexLuminance(background) < 0.4;
  const surface = mixHex(secondary, background, isDark ? 0.16 : 0.24);
  const surfaceAlt = mixHex(secondary, background, isDark ? 0.3 : 0.4);
  const text = safeHex(
    brand.text,
    isDark ? "#F8FAFC" : "#0F172A",
  );
  const muted = safeHex(
    brand.muted,
    isDark ? "rgba(226, 232, 240, 0.72)" : "rgba(15, 23, 42, 0.68)",
  );
  return {
    background,
    accent,
    secondary,
    surface,
    surfaceAlt,
    text,
    muted,
    characterBody: isDark ? "#E2E8F0" : "#111827",
    characterFace: isDark ? "#CBD5E1" : "#1F2937",
    characterAccent: accent,
    characterShadow: withAlpha(accent, 0.28),
  };
};

const findCustomElement = (scene: Scene): CustomTsxElement | undefined => {
  if (!scene.elements) return undefined;
  return scene.elements.find(
    (element): element is CustomTsxElement => element.type === "custom_tsx",
  );
};

const keywordsFor = (scene: Scene, element?: CustomTsxElement): string[] => {
  if (element?.keywords && element.keywords.length > 0) {
    return element.keywords.slice(0, 5);
  }
  const source = `${scene.title ?? ""} ${scene.caption ?? ""}`.trim();
  const words = source.split(/\s+/).filter((word) => word.length > 2);
  return words.slice(0, 4);
};

const FallbackScene = ({
  scene,
  palette,
  durationInFrames,
  isRtl,
}: {
  scene: Scene;
  palette: ScenePalette;
  durationInFrames: number;
  isRtl: boolean;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = interpolate(
    frame,
    [0, Math.max(1, durationInFrames - 1)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const rise = interpolate(progress, [0, 0.22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const drift = Math.sin((frame / Math.max(1, fps)) * 1.2) * 8;
  const exit = interpolate(
    frame,
    [
      Math.max(0, durationInFrames - 10),
      Math.max(1, durationInFrames - 1),
    ],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const title = scene.title?.trim() || "Zoedit Studio";
  const caption = scene.caption?.trim() || "";

  return (
    <AbsoluteFill
      style={{
        background: palette.background,
        color: palette.text,
        fontFamily: FONT_FAMILY,
        direction: isRtl ? "rtl" : "ltr",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: exit,
          transform: `translateY(${(1 - exit) * -8}px)`,
        }}
      >
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 18%, ${withAlpha(
            palette.accent,
            0.28,
          )} 0%, transparent 58%)`,
          opacity: 0.9,
        }}
      />
      <svg
        viewBox="0 0 1080 1920"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <path
          d={`M 120 ${900 + drift} C 360 ${620 - drift}, 720 ${
            1180 + drift
          }, 960 ${760 + drift}`}
          fill="none"
          stroke={palette.accent}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray="1600"
          strokeDashoffset={1600 * (1 - progress)}
          opacity={0.7}
        />
        <circle
          cx={540 + drift * 2}
          cy={820}
          r={220 + Math.sin(progress * Math.PI) * 26}
          fill="none"
          stroke={withAlpha(palette.accent, 0.35)}
          strokeWidth={3}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 28,
          padding: "0 10%",
          textAlign: isRtl ? "right" : "left",
          transform: `translateY(${(1 - rise) * 42}px)`,
          opacity: rise,
        }}
      >
        <div
          style={{
            alignSelf: isRtl ? "flex-end" : "flex-start",
            padding: "10px 20px",
            borderRadius: 999,
            border: `1px solid ${withAlpha(palette.accent, 0.5)}`,
            background: withAlpha(palette.accent, 0.14),
            color: palette.accent,
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "0.06em",
          }}
        >
          ZOEDIT STUDIO
        </div>
        <div style={{ fontSize: 84, fontWeight: 900, lineHeight: 1.1 }}>
          {title}
        </div>
        {caption ? (
          <div
            style={{
              fontSize: 38,
              fontWeight: 600,
              lineHeight: 1.5,
              color: palette.muted,
              maxWidth: "86%",
            }}
          >
            {caption}
          </div>
        ) : null}
      </div>
      </div>
    </AbsoluteFill>
  );
};

const SceneAudio = ({
  scene,
  sfxEnabled,
  sfxVolume,
}: {
  scene: Scene;
  sfxEnabled: boolean;
  sfxVolume: number;
}) => {
  const { fps } = useVideoConfig();
  const cues: SfxCue[] = sfxEnabled && scene.sfxCues ? scene.sfxCues : [];

  return (
    <>
      {scene.audioSrc ? <Audio src={staticFile(scene.audioSrc)} /> : null}
      {sfxEnabled && scene.sfxSrc ? (
        <Sequence
          from={Math.max(0, Math.round((scene.sfxAt ?? 0.15) * fps))}
          durationInFrames={Math.max(1, Math.round(fps * 1.4))}
        >
          <Audio src={staticFile(scene.sfxSrc)} volume={Math.min(MAX_SCENE_SFX_VOLUME, sfxVolume)} />
        </Sequence>
      ) : null}
      {cues.map((cue, index) => {
        const cueFile = SFX_CUE_FILES[cue.sound];
        if (!cueFile) return null;
        const from = Math.max(0, Math.round(cue.frameOffset));
        const masterGain = Math.min(1, sfxVolume / DEFAULT_SFX_VOLUME);
        const volume = Math.min(
          1,
          Math.max(0, (cue.volume ?? DEFAULT_SFX_CUE_VOLUME) * masterGain),
        );
        return (
          <Sequence key={`cue-${index}`} from={from} durationInFrames={Math.max(1, Math.round(fps))}>
            <Audio src={staticFile(`sfx/${cueFile}`)} volume={volume} />
          </Sequence>
        );
      })}
    </>
  );
};

type WatermarkSettings = {
  text: string;
  enabled: boolean;
  position: string;
};

const readWatermarkSettings = (
  brandKit: Record<string, unknown>,
): WatermarkSettings => {
  const raw = brandKit.watermark;
  const nested =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  const text =
    typeof nested?.text === "string"
      ? nested.text
      : typeof raw === "string"
        ? raw
        : "";
  const enabled =
    nested?.enabled === false || brandKit.watermark_enabled === false
      ? false
      : Boolean(text.trim());
  const position =
    typeof nested?.position === "string"
      ? nested.position
      : typeof brandKit.watermark_position === "string"
        ? brandKit.watermark_position
        : "top-left";

  return { text: text.trim(), enabled, position };
};

const WatermarkOverlay = ({
  text,
  palette,
  position,
}: {
  text: string;
  palette: ScenePalette;
  position: string;
}) => {
  if (!text.trim()) return null;
  const isBottom = position.startsWith("bottom");
  const isLeft = position.endsWith("left");

  return (
    <div
      style={{
        position: "absolute",
        ...(isBottom ? { bottom: 54 } : { top: 34 }),
        ...(isLeft ? { left: 34 } : { right: 34 }),
        zIndex: 70,
        fontFamily: FONT_FAMILY,
        fontSize: 28,
        fontWeight: 700,
        letterSpacing: "0.04em",
        color: withAlpha(palette.text, 0.7),
        background: withAlpha(palette.background, 0.38),
        border: `1px solid ${withAlpha(palette.text, 0.14)}`,
        borderRadius: 999,
        padding: "8px 22px",
        direction: "ltr",
        opacity: 0.86,
        pointerEvents: "none",
      }}
    >
      {text}
    </div>
  );
};

const captionTextFor = (scene: Scene): string => {
  const caption = scene.caption?.trim();
  if (caption) return caption;
  const element = findCustomElement(scene);
  if (!element) return "";
  const narration = element.data?.narration;
  if (typeof narration === "string" && narration.trim()) {
    return narration.trim();
  }
  return element.text?.trim() ?? "";
};

const normalizeCaptionStyle = (
  value: CaptionConfig["animation_style"],
): "word_by_word" | "karaoke" | "static" => {
  switch (value) {
    case "karaoke":
    case "dynamic_karaoke":
      return "karaoke";
    case "static":
    case "smooth_chunk_slide":
      return "static";
    case "word_by_word":
    case "word_pop_glow":
    case "kinetic_typewriter":
      return "word_by_word";
    default:
      return "word_by_word";
  }
};

const CaptionsOverlay = ({
  data,
  timings,
  isRtl,
  palette,
}: {
  data: MainProps["data"];
  timings: SceneTiming[];
  isRtl: boolean;
  palette: ScenePalette;
}) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const caption = data.caption ?? {};
  const activeIndex = timings.findIndex(
    (timing) =>
      frame >= timing.from && frame < timing.from + timing.durationInFrames,
  );
  if (activeIndex < 0) return null;

  const timing = timings[activeIndex];
  const scene = data.scenes[activeIndex];
  const text = scene ? captionTextFor(scene) : "";
  if (!timing || !text) return null;

  const style = normalizeCaptionStyle(caption.animation_style);
  const fontScale = Math.min(1.15, Math.max(0.82, height / 1920));
  const fontSize = Math.round(36 * fontScale);
  const localFrame = frame - timing.from;
  const sceneDuration = Math.max(1, timing.durationInFrames - 1);
  const progress = Math.min(1, Math.max(0, localFrame / sceneDuration));
  const rawOffset = caption.bottom_offset;
  const bottomOffset =
    typeof rawOffset === "number" && Number.isFinite(rawOffset)
      ? Math.min(45, Math.max(6, rawOffset))
      : 20;
  const appear = interpolate(localFrame, [0, Math.min(10, sceneDuration)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const captionColors = caption.colors ?? {};
  const pillBackground = safeHex(
    captionColors.background,
    withAlpha(palette.background, 0.82),
  );
  const baseText = safeHex(captionColors.text, palette.text);
  const highlight = safeHex(captionColors.highlight, palette.accent);
  const words = text.split(/\s+/).filter(Boolean);
  const activeWord = Math.min(
    words.length - 1,
    Math.floor(progress * Math.max(1, words.length)),
  );

  const boxStyle = {
    maxWidth: "88%",
    padding: `${Math.round(14 * fontScale)}px ${Math.round(28 * fontScale)}px`,
    borderRadius: 24,
    background: pillBackground,
    border: `1px solid ${withAlpha(baseText, 0.18)}`,
    boxShadow: "0 14px 42px rgba(0, 0, 0, 0.45)",
    color: baseText,
    fontFamily: FONT_FAMILY,
    fontSize,
    fontWeight: 700,
    lineHeight: 1.4,
    textAlign: "center" as const,
    textShadow: "0 2px 10px rgba(0, 0, 0, 0.35)",
    direction: isRtl ? ("rtl" as const) : ("ltr" as const),
    opacity: appear,
    transform: `translateY(${(1 - appear) * 16}px)`,
  };

  const renderWords = () =>
    words.map((word, index) => {
      if (style === "word_by_word") {
        const startFrame = (index / Math.max(1, words.length)) * sceneDuration * 0.74;
        const wordProgress = interpolate(
          localFrame,
          [startFrame, startFrame + 8],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        const isFresh = localFrame >= startFrame && localFrame < startFrame + 10;
        return (
          <span
            key={`${word}-${index}`}
            style={{
              display: "inline-block",
              marginInlineEnd: "0.26em",
              opacity: wordProgress,
              color: isFresh ? highlight : baseText,
              transform: `translateY(${(1 - wordProgress) * 10}px) scale(${
                0.72 + wordProgress * 0.28
              })`,
            }}
          >
            {word}
          </span>
        );
      }
      const isActive = style === "karaoke" && index === activeWord;
      return (
        <span
          key={`${word}-${index}`}
          style={{
            display: "inline-block",
            marginInlineEnd: "0.26em",
            color: isActive ? highlight : baseText,
            transform: isActive ? "scale(1.06)" : undefined,
            textShadow: isActive
              ? `0 0 18px ${withAlpha(highlight, 0.55)}`
              : undefined,
          }}
        >
          {word}
        </span>
      );
    });

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: `${bottomOffset}%`,
        zIndex: 60,
        display: "flex",
        justifyContent: "center",
        padding: "0 48px",
        pointerEvents: "none",
      }}
    >
      <div style={boxStyle}>{style === "static" ? text : renderWords()}</div>
    </div>
  );
};

const ProgressLine = ({ palette }: { palette: ScenePalette }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const width = interpolate(
    frame,
    [0, Math.max(1, durationInFrames - 1)],
    [0, 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 6,
        background: withAlpha(palette.text, 0.08),
        zIndex: 50,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${width}%`,
          background: `linear-gradient(90deg, ${palette.accent}, ${withAlpha(
            palette.accent,
            0.5,
          )})`,
        }}
      />
    </div>
  );
};

const GeneratedScene = ({
  scene,
  index,
  durationInFrames,
  isRtl,
  language,
  brandKit,
  sfxEnabled,
  sfxVolume,
}: {
  scene: Scene;
  index: number;
  durationInFrames: number;
  isRtl: boolean;
  language: string;
  brandKit: Record<string, unknown>;
  sfxEnabled: boolean;
  sfxVolume: number;
}) => {
  const palette = buildPalette(scene, brandKit);
  const element = findCustomElement(scene);
  const componentName = scene.generatedComponent || element?.component;
  const GeneratedComponent = componentName
    ? GENERATED_SCENES[componentName]
    : undefined;

  const fallback = (
    <FallbackScene
      scene={scene}
      palette={palette}
      durationInFrames={durationInFrames}
      isRtl={isRtl}
    />
  );

  if (!GeneratedComponent) {
    return fallback;
  }

  return (
    <SceneSfxEnabledContext.Provider value={sfxEnabled}>
      <SceneSfxVolumeContext.Provider value={sfxVolume}>
        <GeneratedSceneBoundary fallback={fallback}>
          <GeneratedComponent
            accentColor={palette.accent}
            secondaryColor={palette.secondary}
            surfaceColor={palette.surface}
            surfaceAltColor={palette.surfaceAlt}
            bgColor={palette.background}
            textColor={palette.text}
            mutedColor={palette.muted}
            characterBody={palette.characterBody}
            characterFace={palette.characterFace}
            characterAccent={palette.characterAccent}
            characterShadow={palette.characterShadow}
            isRtl={isRtl}
            language={language}
            title={element?.title ?? scene.title}
            text={element?.text ?? scene.caption}
            keywords={keywordsFor(scene, element)}
            data={{
              narration: scene.caption ?? "",
              sceneIndex: index,
              sfxEnabled,
              sfxVolume,
            }}
            durationInFrames={durationInFrames}
            showCharacter={scene.character?.enabled === true}
          />
        </GeneratedSceneBoundary>
      </SceneSfxVolumeContext.Provider>
    </SceneSfxEnabledContext.Provider>
  );
};

const TransitionWhooshes = ({
  timings,
  sfxEnabled,
  sfxVolume,
}: {
  timings: SceneTiming[];
  sfxEnabled: boolean;
  sfxVolume: number;
}) => {
  if (!sfxEnabled) return null;

  return (
    <SceneSfxEnabledContext.Provider value={sfxEnabled}>
      <SceneSfxVolumeContext.Provider value={sfxVolume}>
        {timings.slice(1).map((timing) => (
          <SceneSfx
            key={`transition-sfx-${timing.from}`}
            name="whoosh"
            frame={timing.from}
            volume={0.18}
          />
        ))}
      </SceneSfxVolumeContext.Provider>
    </SceneSfxEnabledContext.Provider>
  );
};

export const MainComposition = ({ data }: MainProps) => {
  const settings = getVideoSettings(data);
  ensureSceneFonts(settings.language);
  const timings = getSceneTimings(data, settings.fps);
  const brandKit = (data.brand_kit ?? {}) as Record<string, unknown>;
  const palette = buildPalette({}, brandKit);
  const sfxEnabled = data.sfx?.enabled !== false;
  const rawSfxVolume = data.sfx?.volume;
  const sfxVolume =
    !sfxEnabled
      ? 0
      : Math.min(
          1,
          Math.max(
            0,
            typeof rawSfxVolume === "number" && Number.isFinite(rawSfxVolume)
              ? rawSfxVolume
              : DEFAULT_SFX_VOLUME,
          ),
        );
  const watermark = readWatermarkSettings(brandKit);
  const captionsEnabled = data.caption?.enabled === true;

  return (
    <AbsoluteFill
      style={{
        background: palette.background,
        fontFamily: FONT_FAMILY,
        color: palette.text,
        direction: settings.isRtl ? "rtl" : "ltr",
      }}
    >
      <TransitionSeries>
        {data.scenes.map((scene, index) => {
          const timing = timings[index];
          if (!timing) return null;
          const sequenceDurationInFrames = getSceneSequenceDurationInFrames(
            timing.durationInFrames,
            data.scenes.length,
          );
          return (
            <Fragment key={scene.id ?? `scene-${index}`}>
              <TransitionSeries.Sequence
                durationInFrames={sequenceDurationInFrames}
                name={scene.id ?? `Scene ${index + 1}`}
                premountFor={settings.fps}
              >
                <SceneAudio
                  scene={scene}
                  sfxEnabled={sfxEnabled}
                  sfxVolume={sfxVolume}
                />
                <GeneratedScene
                  scene={scene}
                  index={index}
                  durationInFrames={sequenceDurationInFrames}
                  isRtl={settings.isRtl}
                  language={settings.language}
                  brandKit={brandKit}
                  sfxEnabled={sfxEnabled}
                  sfxVolume={sfxVolume}
                />
              </TransitionSeries.Sequence>
              {index < data.scenes.length - 1
                ? renderSceneTransition(index)
                : null}
            </Fragment>
          );
        })}
      </TransitionSeries>

      <TransitionWhooshes
        timings={timings}
        sfxEnabled={sfxEnabled}
        sfxVolume={sfxVolume}
      />

      {captionsEnabled ? (
        <CaptionsOverlay
          data={data}
          timings={timings}
          isRtl={settings.isRtl}
          palette={palette}
        />
      ) : null}

      {watermark.enabled ? (
        <WatermarkOverlay
          text={watermark.text}
          palette={palette}
          position={watermark.position}
        />
      ) : null}
      <ProgressLine palette={palette} />
    </AbsoluteFill>
  );
};
