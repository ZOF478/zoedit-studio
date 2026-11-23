import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
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

const WORDS = ["STOP", "MAKING", "GENERIC", "AI", "VIDEOS"];

export const Scene1 = (props: Props) => {
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
  const shatter = spring({
    frame: frame - 82,
    fps,
    config: { damping: 15, stiffness: 110 },
  });
  const grid = interpolate(frame, [82, 130], [0, 1], CLAMP);
  const drift = Math.sin(frame / 38) * 9;
  const shardReach = interpolate(shatter, [0, 1], [0, 120], CLAMP);

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
          background: `radial-gradient(circle at 80% 26%, ${props.accentColor}24, transparent 58%)`,
        }}
      />
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0, opacity: 0.14 }}
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <line
            key={`v${i}`}
            x1={((i + 1) * width) / 10}
            y1={0}
            x2={((i + 1) * width) / 10 + Math.sin(frame / 50 + i) * 18}
            y2={height}
            stroke={props.accentColor}
            strokeWidth={1.5}
            strokeDasharray="4 12"
          />
        ))}
        {Array.from({ length: 14 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={((i + 1) * height) / 15}
            x2={width}
            y2={((i + 1) * height) / 15}
            stroke={props.accentColor}
            strokeWidth={1.5}
            strokeDasharray="4 12"
          />
        ))}
      </svg>
      {[0, 1, 2].map((i) => (
        <div
          key={`ring${i}`}
          style={{
            position: "absolute",
            left: `${16 + i * 31}%`,
            top: `${28 + i * 13}%`,
            width: unit * 0.34,
            height: unit * 0.34,
            borderRadius: "50%",
            border: `1px solid ${props.accentColor}33`,
            opacity: 0.45,
            transform: `translateY(${Math.sin(frame / 45 + i) * 16}px) scale(${
              1 + 0.05 * Math.sin(frame / 32 + i)
            })`,
          }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          top: "9%",
          left: 0,
          right: 0,
          padding: "0 48px",
          maxWidth: "88%",
          direction: "ltr",
          textAlign: "left",
          opacity: exit,
          transform: `translateY(${(1 - exit) * -18}px)`,
        }}
      >
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 16,
            letterSpacing: 5,
            color: props.accentColor,
            marginBottom: 14,
          }}
        >
          THE AI VIDEO PROBLEM
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", columnGap: 18, rowGap: 2 }}>
          {WORDS.map((word, i) => {
            const s = spring({
              frame: frame - i * 12,
              fps,
              config: { damping: 13, stiffness: 140 },
            });
            return (
              <span
                key={word}
                style={{
                  display: "inline-block",
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontWeight: 900,
                  fontSize: unit * 0.083,
                  lineHeight: 1.05,
                  letterSpacing: -2,
                  color: i >= 3 ? props.accentColor : props.textColor,
                  opacity: s,
                  transform: `translateY(${interpolate(s, [0, 1], [50, 0], CLAMP)}px) scale(${interpolate(s, [0, 1], [0.78, 1], CLAMP)})`,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>

      {[0, 1].map((i) => (
        <span
          key={`q${i}`}
          style={{
            position: "absolute",
            top: `${27 + i * 34}%`,
            left: i === 0 ? "7%" : undefined,
            right: i === 1 ? "7%" : undefined,
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 900,
            fontSize: unit * 0.06,
            color: props.accentColor,
            opacity: (1 - grid) * 0.6,
            transform: `translateY(${Math.sin(frame / 22 + i * 2) * 10}px)`,
          }}
        >
          ?
        </span>
      ))}

      <div
        style={{
          position: "absolute",
          top: "25%",
          bottom: "28%",
          left: "6%",
          right: "6%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: exit,
          transform: `translateY(${(1 - exit) * 16}px)`,
        }}
      >
        <DepthStage>
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SpatialCard
              enterFrame={0}
              recedeFrame={82}
              tiltY={props.isRtl ? -10 : 10}
              shadowColor="rgba(2,6,23,0.7)"
              style={{
                width: "84%",
                maxWidth: 560,
                borderRadius: 26,
                padding: "24px 26px",
                background: "rgba(240,248,255,0.05)",
                border: "1px solid rgba(240,248,255,0.16)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 13,
                    letterSpacing: 3,
                    color: props.mutedColor,
                  }}
                >
                  TEMPLATE PACK #12
                </span>
                <span style={{ fontFamily: "monospace", fontSize: 11, color: props.textColor, opacity: 0.5 }}>
                  SAME AS EVERYONE
                </span>
              </div>
              {[0, 1, 2].map((i) => (
                <div
                  key={`row${i}`}
                  style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, opacity: 0.55 }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: "rgba(240,248,255,0.14)" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 9, width: "70%", borderRadius: 99, background: "rgba(240,248,255,0.35)" }} />
                    <div
                      style={{
                        height: 7,
                        width: "45%",
                        borderRadius: 99,
                        background: "rgba(240,248,255,0.2)",
                        marginTop: 7,
                      }}
                    />
                  </div>
                </div>
              ))}
            </SpatialCard>

            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SpatialCard
                enterFrame={82}
                tiltY={props.isRtl ? -8 : 8}
                shadowColor="rgba(2,6,23,0.7)"
                style={{
                  width: "88%",
                  maxWidth: 600,
                  borderRadius: 26,
                  padding: "22px 24px",
                  background: "linear-gradient(160deg, rgba(90,169,230,0.18), rgba(5,22,42,0.92))",
                  border: `1px solid ${props.accentColor}66`,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 13,
                    letterSpacing: 3,
                    color: props.accentColor,
                    marginBottom: 12,
                    opacity: grid,
                  }}
                >
                  CUSTOM MOTION ENGINE
                </div>
                <svg viewBox="0 0 480 150" style={{ width: "100%", height: "auto", display: "block" }}>
                  {[0, 1, 2, 3].map((i) => (
                    <line
                      key={`gh${i}`}
                      x1={0}
                      y1={i * 45 + 10}
                      x2={480}
                      y2={i * 45 + 10}
                      stroke={props.accentColor}
                      strokeWidth={1}
                      strokeDasharray="3 9"
                      opacity={0.35 * grid}
                    />
                  ))}
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <line
                      key={`gv${i}`}
                      x1={i * 80 + 10}
                      y1={0}
                      x2={i * 80 + 10}
                      y2={150}
                      stroke={props.accentColor}
                      strokeWidth={1}
                      strokeDasharray="3 9"
                      opacity={0.35 * grid}
                    />
                  ))}
                  <path
                    d={`M10 120 C 90 ${70 + drift * 2}, 180 40, 260 ${90 + drift}, S 400 20, 470 60`}
                    fill="none"
                    stroke={props.accentColor}
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeDasharray="480"
                    strokeDashoffset={480 * (1 - grid)}
                  />
                </svg>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
                  {["CHARTS", "B-ROLL", "3D LAYERS", "VECTORS"].map((label, i) => {
                    const s = spring({
                      frame: frame - 100 - i * 12,
                      fps,
                      config: { damping: 14, stiffness: 130 },
                    });
                    return (
                      <span
                        key={label}
                        style={{
                          opacity: s,
                          transform: `translateY(${interpolate(s, [0, 1], [16, 0], CLAMP)}px)`,
                          fontSize: 13,
                          fontWeight: 700,
                          letterSpacing: 1.5,
                          color: props.textColor,
                          padding: "8px 12px",
                          borderRadius: 99,
                          border: `1px solid ${props.accentColor}66`,
                          background: "rgba(90,169,230,0.12)",
                        }}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              </SpatialCard>
            </div>

            <div style={{ position: "absolute", width: 300, height: 220, pointerEvents: "none" }}>
              {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i / 8) * Math.PI * 2;
                return (
                  <div
                    key={`shard${i}`}
                    style={{
                      position: "absolute",
                      left: 132,
                      top: 96,
                      width: 36,
                      height: 26,
                      borderRadius: 3,
                      background: i % 2 === 0 ? props.accentColor : "#BAE6FD",
                      opacity: (1 - shatter) * 0.6,
                      transform: `translate(${Math.cos(angle) * shardReach}px, ${
                        Math.sin(angle) * shardReach
                      }px) rotate(${angle * 57 + frame * 0.6}deg)`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </DepthStage>
      </div>

      <SceneSfx name="pop" frame={82} volume={0.18} />
    </AbsoluteFill>
  );
};
