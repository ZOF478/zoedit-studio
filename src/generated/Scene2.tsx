import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Code2, Layers, Music2, Shapes } from "lucide-react";
import { DepthStage, SpatialCard } from "../components/Depth25D";
import { SceneSfx } from "../components/SceneSfx";

type Props = {
  accentColor: string;
  bgColor: string;
  textColor: string;
  mutedColor: string;
  characterBody: string;
  characterFace: string;
  characterAccent: string;
  characterShadow: string;
  isRtl: boolean;
  language: string;
  title?: string;
  text?: string;
  keywords?: string[];
  data?: Record<string, unknown>;
  durationInFrames: number;
  showCharacter?: boolean;
};

const CLAMP = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const LAYERS: { title: string; tag: string }[] = [
  { title: "Chart scene", tag: "scene.tsx" },
  { title: "Voice waveform", tag: "audio.wav" },
  { title: "Vector layers", tag: "motion.tsx" },
];

export const Scene2 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const unit = Math.min(width, height);
  const dur = props.durationInFrames;
  const exit = interpolate(
    frame,
    [Math.max(0, dur - 10), Math.max(1, dur - 1)],
    [1, 0],
    CLAMP,
  );
  const drift = Math.sin(frame / 36) * 8;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: props.bgColor,
        overflow: "hidden",
        direction: props.isRtl ? "rtl" : "ltr",
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 22% 32%, ${props.accentColor}20, transparent 55%), radial-gradient(circle at 80% 70%, #255C9926, transparent 55%)`,
        }}
      />
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0, opacity: 0.1 }}
      >
        {Array.from({ length: 18 }).map((_, i) => (
          <line
            key={`d${i}`}
            x1={(i * width) / 17}
            y1={0}
            x2={(i * width) / 17 + Math.sin(frame / 60 + i) * 10}
            y2={height}
            stroke={props.accentColor}
            strokeWidth={1}
            strokeDasharray="2 16"
          />
        ))}
      </svg>
      {["<div />", "spring()", "useCurrentFrame()"].map((code, i) => (
        <span
          key={code}
          style={{
            position: "absolute",
            top: `${22 + i * 24}%`,
            left: i === 1 ? undefined : `${8 + i * 4}%`,
            right: i === 1 ? "6%" : undefined,
            fontFamily: "monospace",
            fontSize: unit * 0.016,
            color: props.accentColor,
            opacity: 0.22,
            transform: `translateY(${Math.sin(frame / 34 + i * 2) * 14}px)`,
          }}
        >
          {code}
        </span>
      ))}

      <div
        style={{
          position: "absolute",
          top: "8%",
          left: 0,
          right: 0,
          padding: "0 48px",
          maxWidth: "88%",
          direction: "ltr",
          textAlign: "left",
          opacity: exit,
          transform: `translateY(${(1 - exit) * -16}px)`,
        }}
      >
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 15,
            letterSpacing: 4,
            color: props.accentColor,
            marginBottom: 12,
          }}
        >
          ONE PROMPT → REACT + REMOTION
        </div>
        <div
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 900,
            fontSize: unit * 0.06,
            lineHeight: 1.12,
            letterSpacing: -1.5,
            color: props.textColor,
          }}
        >
          Zof Studio turns <span style={{ color: props.accentColor }}>one prompt</span>
        </div>
        <div style={{ fontSize: unit * 0.022, color: props.mutedColor, marginTop: 10, lineHeight: 1.4 }}>
          into real, custom-coded motion graphics.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: "24%",
          bottom: "27%",
          left: "6%",
          right: "6%",
          opacity: exit,
          transform: `translateY(${(1 - exit) * 16}px)`,
        }}
      >
        <DepthStage>
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              gap: "4%",
            }}
          >
            <SpatialCard
              enterFrame={8}
              recedeFrame={96}
              tiltY={props.isRtl ? 8 : -8}
              shadowColor="rgba(2,6,23,0.6)"
              style={{
                width: "42%",
                borderRadius: 22,
                padding: "20px 18px",
                background: "rgba(240,248,255,0.05)",
                border: `1px solid ${props.accentColor}55`,
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Code2 size={18} color={props.accentColor} />
                <span style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: 2, color: props.accentColor }}>
                  PROMPT
                </span>
              </div>
              <div style={{ fontFamily: "monospace", fontSize: unit * 0.014, lineHeight: 1.6, color: props.textColor }}>
                Turn my launch into a <span style={{ color: props.accentColor }}>30s kinetic film</span>
                <span style={{ opacity: Math.sin(frame / 8) > 0 ? 1 : 0, color: props.accentColor }}>▌</span>
              </div>
              <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 99,
                    background: "rgba(240,248,255,0.14)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${interpolate(frame, [30, 90], [0, 100], CLAMP)}%`,
                      height: "100%",
                      background: props.accentColor,
                    }}
                  />
                </div>
                <span style={{ fontFamily: "monospace", fontSize: 10, color: props.mutedColor }}>BUILD</span>
              </div>
            </SpatialCard>

            <div
              style={{
                width: "54%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 12,
              }}
            >
              {LAYERS.map((layer, i) => (
                <SpatialCard
                  key={layer.title}
                  enterFrame={96 + i * 12}
                  tiltY={props.isRtl ? -6 : 6}
                  shadowColor="rgba(2,6,23,0.55)"
                  style={{
                    width: "100%",
                    borderRadius: 18,
                    padding: "14px 16px",
                    background: "rgba(37,92,153,0.26)",
                    border: `1px solid ${props.accentColor}55`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    {i === 0 ? (
                      <Layers size={16} color={props.accentColor} />
                    ) : i === 1 ? (
                      <Music2 size={16} color={props.accentColor} />
                    ) : (
                      <Shapes size={16} color={props.accentColor} />
                    )}
                    <span style={{ fontSize: unit * 0.014, fontWeight: 700, color: props.textColor }}>{layer.title}</span>
                    <span style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: 10, color: props.mutedColor }}>
                      {layer.tag}
                    </span>
                  </div>
                  {i === 0 && (
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 34 }}>
                      {[0, 1, 2, 3, 4, 5].map((b) => (
                        <div
                          key={b}
                          style={{
                            flex: 1,
                            height: 10 + Math.abs(Math.sin(frame / 13 + b)) * 24,
                            borderRadius: 4,
                            background: b === 4 ? props.accentColor : "rgba(240,248,255,0.28)",
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {i === 1 && (
                    <svg viewBox="0 0 288 40" style={{ width: "100%", height: 34, display: "block" }}>
                      <polyline
                        points={Array.from({ length: 32 })
                          .map((_, j) => `${j * 9},${20 + Math.sin(frame / 6 + j * 0.7) * 14}`)
                          .join(" ")}
                        fill="none"
                        stroke={props.accentColor}
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  {i === 2 && (
                    <div style={{ position: "relative", height: 34 }}>
                      {[0, 1, 2].map((s) => (
                        <div
                          key={s}
                          style={{
                            position: "absolute",
                            left: s * 22 + Math.sin(frame / 25 + s) * 6,
                            top: s * 6,
                            width: 90,
                            height: 18,
                            borderRadius: 6,
                            border: `1px solid ${props.accentColor}88`,
                            background: s === 2 ? "rgba(90,169,230,0.3)" : "rgba(240,248,255,0.08)",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </SpatialCard>
              ))}
            </div>
          </div>
        </DepthStage>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "30%",
          left: "8%",
          right: "8%",
          display: "flex",
          justifyContent: "center",
          gap: 10,
          opacity: exit,
          transform: `translateY(${drift * 0.4}px)`,
        }}
      >
        {["LIVE LAYERS", "REAL CODE", "ZERO TEMPLATES"].map((label, i) => {
          const s = spring({
            frame: frame - 160 - i * 12,
            fps,
            config: { damping: 15, stiffness: 120 },
          });
          return (
            <span
              key={label}
              style={{
                opacity: s * 0.9,
                transform: `translateY(${interpolate(s, [0, 1], [14, 0], CLAMP)}px)`,
                fontFamily: "monospace",
                fontSize: 11,
                letterSpacing: 1.5,
                color: props.textColor,
                padding: "7px 11px",
                borderRadius: 99,
                background: "rgba(5,22,42,0.7)",
                border: `1px solid ${props.accentColor}44`,
              }}
            >
              {label}
            </span>
          );
        })}
      </div>

      <SceneSfx name="pop" frame={96} volume={0.18} />
    </AbsoluteFill>
  );
};
