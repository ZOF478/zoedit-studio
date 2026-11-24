import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneSfx } from "../components/SceneSfx";
import { SmartIcon } from "../components/SmartIcon";

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

const SURFACE = "#162033";
const BARS = [0.92, 0.55, 0.78, 0.34, 0.66, 0.42];
const CODE = [
  "<AbsoluteFill>",
  "  const frame = useCurrentFrame();",
  "  const s = spring({ frame, fps });",
  "  return <Scene style={{ scale: s }} />;",
  "</AbsoluteFill>",
];

export const Scene2 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();
  const exit = interpolate(
    frame,
    [Math.max(0, durationInFrames - 10), Math.max(1, durationInFrames - 1)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const switchBeat = interpolate(frame, [80, 130], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const spin = frame * (8 + switchBeat * 22);
  const titleSize = Math.min(width * 0.08, 84);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: props.bgColor,
        overflow: "hidden",
        direction: props.isRtl ? "rtl" : "ltr",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(90deg, ${props.mutedColor}18 0%, transparent 48%, ${props.accentColor}20 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.05,
          backgroundImage: `radial-gradient(${props.textColor} 1px, transparent 1px)`,
          backgroundSize: "42px 42px",
        }}
      />

      <div
        style={{
          opacity: exit,
          transform: `translateY(${(1 - exit) * 20}px) scale(${0.985 + exit * 0.015})`,
          height: "100%",
          width: "100%",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "8%",
            left: 48,
            right: 48,
            direction: "ltr",
            textAlign: "left",
          }}
        >
          <div
            style={{
              color: props.accentColor,
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: 5,
              marginBottom: 16,
            }}
          >
            THE OLD WORKFLOW IS OVER
          </div>
          <div
            style={{
              color: props.textColor,
              fontSize: titleSize,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: -2,
              maxWidth: "84%",
            }}
          >
            Forget rigid templates
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: "29%",
            left: "7.5%",
            right: "7.5%",
            display: "flex",
            gap: 20,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              flex: 1,
              backgroundColor: SURFACE,
              borderRadius: 26,
              border: `1px solid ${props.mutedColor}55`,
              padding: 24,
              opacity: 1 - switchBeat * 0.62,
              transform: `translateX(${-switchBeat * 18}px) rotate(${-1 - switchBeat * 2}deg)`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <SmartIcon query="clock" size={36} color={props.mutedColor} />
              <div
                style={{
                  color: props.mutedColor,
                  fontSize: 18,
                  fontWeight: 900,
                  letterSpacing: 3,
                }}
              >
                TRADITIONAL
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                marginTop: 22,
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: "50%",
                  border: `3px solid ${props.mutedColor}44`,
                  borderTopColor: props.mutedColor,
                  transform: `rotate(${spin}deg)`,
                  flexShrink: 0,
                }}
              />
              <div>
                <div
                  style={{
                    color: props.textColor,
                    fontSize: 44,
                    fontWeight: 900,
                    lineHeight: 1,
                  }}
                >
                  6+ hrs
                </div>
                <div
                  style={{
                    color: props.mutedColor,
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: 2,
                    marginTop: 4,
                  }}
                >
                  MANUAL KEYFRAMES
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
              {BARS.map((value, i) => {
                const enter = spring({
                  frame: frame - i * 12,
                  fps,
                  config: { damping: 200, stiffness: 120 },
                });
                return (
                  <div
                    key={i}
                    style={{
                      height: 12,
                      width: `${value * 100 * enter}%`,
                      borderRadius: 6,
                      backgroundColor: i % 2 === 0 ? `${props.mutedColor}88` : `${props.accentColor}33`,
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              backgroundColor: SURFACE,
              borderRadius: 26,
              border: `2px solid ${props.accentColor}`,
              padding: 24,
              boxShadow: `0 0 ${28 + switchBeat * 34}px ${props.accentColor}55`,
              transform: `translateY(${-switchBeat * 8}px) scale(${1 + switchBeat * 0.03}) rotate(${1 + switchBeat * 1.5}deg)`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <SmartIcon query="code" size={34} color={props.accentColor} />
                <div
                  style={{
                    color: props.accentColor,
                    fontSize: 18,
                    fontWeight: 900,
                    letterSpacing: 3,
                  }}
                >
                  ZOF STUDIO
                </div>
              </div>
              <div
                style={{
                  color: props.accentColor,
                  fontSize: 13,
                  fontWeight: 900,
                  letterSpacing: 1,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: `1px solid ${props.accentColor}66`,
                  opacity: interpolate(frame, [95, 125], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                }}
              >
                60 FPS
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
              {CODE.map((line, i) => {
                const enter = spring({
                  frame: frame - 24 - i * 12,
                  fps,
                  config: { damping: 200, stiffness: 130 },
                });
                return (
                  <div
                    key={line}
                    style={{
                      color: i === 2 ? props.accentColor : props.textColor,
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      fontSize: 13.5,
                      lineHeight: 1.35,
                      whiteSpace: "pre",
                      opacity: enter,
                      transform: `translateX(${(1 - enter) * 16}px)`,
                    }}
                  >
                    {line}
                  </div>
                );
              })}
            </div>
            <div
              style={{
                marginTop: 20,
                height: 8,
                borderRadius: 4,
                backgroundColor: `${props.textColor}18`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${30 + 66 * switchBeat}%`,
                  background: `linear-gradient(90deg, ${props.accentColor}, ${props.textColor})`,
                  borderRadius: 4,
                }}
              />
            </div>
            <div
              style={{
                color: props.mutedColor,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 2,
                marginTop: 10,
              }}
            >
              REAL CODE · REAL MOTION
            </div>
          </div>
        </div>
      </div>

      <SceneSfx name="whoosh" frame={90} volume={0.18} />
    </AbsoluteFill>
  );
};
