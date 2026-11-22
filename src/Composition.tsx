import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { getSceneTimings, getVideoSettings, type MainProps } from "./config";
import { GENERATED_SCENES } from "./generated";
import { GeneratedSceneBoundary } from "./components/GeneratedSceneBoundary";
import {
  DEFAULT_SFX_CUE_VOLUME,
  DEFAULT_SFX_VOLUME,
  SFX_CUE_FILES,
} from "./sfx";
import type { Scene, SceneElement, SfxCue } from "./types";
import { ensureCairoFont, FONT_FAMILY } from "./fonts";

type CustomTsxElement = Extract<SceneElement, { type: "custom_tsx" }>;

type ScenePalette = {
  background: string;
  accent: string;
  text: string;
  muted: string;
  characterBody: string;
  characterFace: string;
  characterAccent: string;
  characterShadow: string;
};

const FALLBACK_ACCENT = "#E77B40";
const FALLBACK_BACKGROUND = "#0B0F17";

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

const buildPalette = (scene: Scene, brand: Record<string, unknown>): ScenePalette => {
  const background = safeHex(brand.background, FALLBACK_BACKGROUND);
  const accent = safeHex(brand.accent ?? brand.primary, FALLBACK_ACCENT);
  const isDark = hexLuminance(background) < 0.4;
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
  const title = scene.title?.trim() || "Zof Studio";
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
          ZOF STUDIO
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
          <Audio src={staticFile(scene.sfxSrc)} volume={sfxVolume} />
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

const Watermark = ({
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
        zIndex: 40,
        fontFamily: FONT_FAMILY,
        fontSize: 28,
        fontWeight: 700,
        letterSpacing: "0.04em",
        color: withAlpha(palette.text, 0.64),
        background: withAlpha(palette.background, 0.38),
        border: `1px solid ${withAlpha(palette.text, 0.14)}`,
        borderRadius: 999,
        padding: "8px 22px",
        direction: "ltr",
        pointerEvents: "none",
      }}
    >
      {text}
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
}: {
  scene: Scene;
  index: number;
  durationInFrames: number;
  isRtl: boolean;
  language: string;
  brandKit: Record<string, unknown>;
  sfxEnabled: boolean;
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
    <GeneratedSceneBoundary fallback={fallback}>
      <GeneratedComponent
        accentColor={palette.accent}
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
        }}
        durationInFrames={durationInFrames}
        showCharacter={scene.character?.enabled !== false}
      />
    </GeneratedSceneBoundary>
  );
};

export const MainComposition = ({ data }: MainProps) => {
  ensureCairoFont();
  const settings = getVideoSettings(data);
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
  const watermarkText =
    typeof brandKit.watermark === "string" ? brandKit.watermark : "";
  const watermarkEnabled = brandKit.watermark_enabled !== false;
  const watermarkPosition =
    typeof brandKit.watermark_position === "string"
      ? brandKit.watermark_position
      : "top-left";

  return (
    <AbsoluteFill
      style={{
        background: palette.background,
        fontFamily: FONT_FAMILY,
        color: palette.text,
        direction: settings.isRtl ? "rtl" : "ltr",
      }}
    >
      {data.scenes.map((scene, index) => {
        const timing = timings[index];
        if (!timing) return null;
        return (
          <Sequence
            key={scene.id ?? `scene-${index}`}
            from={timing.from}
            durationInFrames={timing.durationInFrames}
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
              durationInFrames={timing.durationInFrames}
              isRtl={settings.isRtl}
              language={settings.language}
              brandKit={brandKit}
              sfxEnabled={sfxEnabled}
            />
          </Sequence>
        );
      })}

      {watermarkEnabled ? (
        <Watermark
          text={watermarkText}
          palette={palette}
          position={watermarkPosition}
        />
      ) : null}
      <ProgressLine palette={palette} />
    </AbsoluteFill>
  );
};
