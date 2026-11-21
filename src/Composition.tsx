import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "./components/Background";
import { Scene } from "./components/Scene";
import type { MainProps } from "./config";
import type { VideoData } from "./types";
import { getSceneTimings, getVideoSettings } from "./config";
import { getLayout } from "./layout";
import { DEFAULT_SFX_VOLUME } from "./sfx";
import { alpha, createTheme, type Theme } from "./theme";
import { ensureCairoFont } from "./fonts";

const ProgressLine = ({ theme }: { theme: Theme }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  const height = Math.max(4, Math.round((width / 1920) * 7));

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height,
        background: alpha(theme.colors.text, 0.06),
        zIndex: 50,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${interpolate(
            frame,
            [0, Math.max(1, durationInFrames - 1)],
            [0, 100],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            },
          )}%`,
          background: `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.secondary}, ${theme.colors.accent})`,
          boxShadow: `0 0 ${height * 5}px ${theme.colors.glow}`,
        }}
      />
    </div>
  );
};


const Watermark = ({
  data,
  theme,
}: {
  data: VideoData;
  theme: Theme;
}) => {
  const text = data.brand_kit?.watermark?.trim();
  if (!text || data.brand_kit?.watermark_enabled === false) return null;

  const position = data.brand_kit?.watermark_position ?? "top-left";
  const horizontal = Math.round(theme.radius * 1.4);
  const topOffset = Math.round(theme.radius * 1.1);
  const bottomOffset = Math.max(
    Math.round(theme.radius * 3.2),
    Math.round(topOffset + theme.radius * 1.4),
  );
  const isBottom = position === "bottom-left" || position === "bottom-right";
  const isLeft = position === "top-left" || position === "bottom-left";

  return (
    <div
      style={{
        position: "absolute",
        ...(isBottom ? { bottom: bottomOffset } : { top: topOffset }),
        ...(isLeft ? { left: horizontal } : { right: horizontal }),
        zIndex: 40,
        fontFamily: theme.fontFamily,
        fontSize: Math.max(26, Math.round(theme.radius * 0.62)),
        fontWeight: 700,
        letterSpacing: "0.04em",
        color: alpha(theme.colors.text, 0.6),
        background: alpha(theme.colors.background, 0.35),
        border: `1px solid ${alpha(theme.colors.text, 0.12)}`,
        borderRadius: 999,
        padding: `${Math.round(theme.radius * 0.22)}px ${Math.round(
          theme.radius * 0.7,
        )}px`,
        direction: "ltr",
        pointerEvents: "none",
      }}
    >
      {text}
    </div>
  );
};

export const MainComposition = ({ data }: MainProps) => {
  ensureCairoFont();
  const settings = getVideoSettings(data);
  const layout = getLayout(settings.width, settings.height, settings.fps);
  const theme = createTheme(settings.style, data.brand_kit);
  const timings = getSceneTimings(data, settings.fps);
  const rawSfxVolume = data.sfx?.volume;
  const sfxVolume =
    data.sfx?.enabled === false
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

  return (
    <AbsoluteFill
      style={{
        background: theme.colors.background,
        fontFamily: theme.fontFamily,
        color: theme.colors.text,
        direction: settings.isRtl ? "rtl" : "ltr",
      }}
    >
      <Background theme={theme} />

      {data.scenes.map((scene, index) => {
        const timing = timings[index];
        return (
          <Sequence
            key={scene.id ?? `scene-${index}`}
            from={timing.from}
            durationInFrames={timing.durationInFrames}
            name={scene.id ?? `Scene ${index + 1}`}
            premountFor={settings.fps}
          >
            <Scene
              scene={scene}
              index={index}
              theme={theme}
              layout={layout}
              durationInFrames={timing.durationInFrames}
              isRtl={settings.isRtl}
              language={settings.language}
              sfxVolume={sfxVolume}
              style={settings.style}
              captionConfig={data.caption}
            />
          </Sequence>
        );
      })}

      <Watermark data={data} theme={theme} />
      <ProgressLine theme={theme} />
    </AbsoluteFill>
  );
};
