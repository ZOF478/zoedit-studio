import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { noise2D } from "@remotion/noise";
import { CheckCircle2, Sparkles } from "lucide-react";
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

const NOTES = [
  { label: "Aroma", value: 0.88 },
  { label: "Depth", value: 0.93 },
  { label: "Warmth", value: 0.97 },
];

export const Scene4 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = props.accentColor;
  const spice = "#BE2523";
  const enter = (i: number) =>
    spring({
      frame,
      fps,
      delay: i * 12,
      config: { damping: 15, stiffness: 112, mass: 0.8 },
    });
  const exit = interpolate(
    frame,
    [
      Math.max(0, props.durationInFrames - 10),
      Math.max(1, props.durationInFrames - 1),
    ],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const checkFrame = 170;
  const check = spring({
    frame,
    fps,
    delay: checkFrame,
    config: { damping: 12, stiffness: 155 },
  });

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
          opacity: exit,
          transform: `translateY(${(1 - exit) * 18}px) scale(${1 - (1 - exit) * 0.012})`,
          backgroundImage:
            "radial-gradient(circle at 12% 24%, rgba(190,37,35,0.09), transparent 42%), radial-gradient(circle at 88% 68%, rgba(13,55,69,0.09), transparent 44%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "6%",
            left: 0,
            right: 0,
            padding: "0 6%",
            direction: "ltr",
            textAlign: "left",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 14,
              opacity: enter(0),
              transform: `translateY(${(1 - enter(0)) * 16}px)`,
            }}
          >
            <span style={{ width: 38, height: 3, background: spice, borderRadius: 2 }} />
            <span
              style={{
                color: accent,
                fontSize: 19,
                letterSpacing: 4,
                fontWeight: 800,
              }}
            >
              THE BLOOM
            </span>
          </div>
          <h1
            style={{
              margin: 0,
              color: props.textColor,
              fontSize: 66,
              lineHeight: 1.04,
              letterSpacing: -1.2,
              fontWeight: 800,
              maxWidth: "95%",
              opacity: enter(1),
              transform: `translateY(${(1 - enter(1)) * 20}px)`,
            }}
          >
            The quick bloom builds{" "}
            <span style={{ color: spice }}>deep, warm flavor</span>
          </h1>
          <p
            style={{
              margin: "12px 0 0",
              color: props.mutedColor,
              fontSize: 24,
              lineHeight: 1.35,
              fontWeight: 500,
              opacity: enter(2),
            }}
          >
            All before the liquid ever goes in.
          </p>
        </div>

        <div
          style={{
            position: "absolute",
            top: "27%",
            left: "6%",
            right: "6%",
            height: "44%",
            opacity: enter(1),
            transform: `translateY(${(1 - enter(1)) * 24}px)`,
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              borderRadius: 36,
              overflow: "hidden",
              background:
                "linear-gradient(160deg, rgba(255,255,255,0.95), rgba(13,55,69,0.06))",
              border: "1px solid rgba(13,55,69,0.14)",
              boxShadow: "0 24px 54px rgba(13,55,69,0.12)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "4.5%",
                left: "6%",
                right: "6%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                direction: "ltr",
              }}
            >
              <div
                style={{
                  padding: "11px 20px",
                  borderRadius: 999,
                  background: "rgba(190,37,35,0.10)",
                  color: spice,
                  fontSize: 23,
                  fontWeight: 750,
                  opacity: enter(3),
                  transform: `scale(${0.86 + enter(3) * 0.14})`,
                }}
              >
                Deep flavor, fast
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "10px 15px",
                  borderRadius: 999,
                  background: accent,
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontWeight: 700,
                  opacity: check,
                  transform: `translateX(${(1 - check) * 14}px)`,
                }}
              >
                <CheckCircle2 size={19} color="#F4C27A" />
                Bloom complete
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                top: "11%",
                left: "50%",
                width: "82%",
                height: "54%",
                transform: `translateX(-50%) translateY(${Math.sin(frame / 30) * 4}px)`,
              }}
            >
              <svg
                viewBox="0 0 600 320"
                preserveAspectRatio="xMidYMid meet"
                style={{ width: "100%", height: "100%" }}
              >
                <circle
                  cx="300"
                  cy="170"
                  r="146"
                  fill="none"
                  stroke="rgba(190,37,35,0.14)"
                  strokeWidth="2"
                  strokeDasharray="7 13"
                  transform={`rotate(${frame * 0.35} 300 170)`}
                />
                <circle
                  cx="300"
                  cy="170"
                  r="124"
                  fill="none"
                  stroke="rgba(13,55,69,0.12)"
                  strokeWidth="12"
                  opacity={0.35 + 0.15 * Math.abs(noise2D("scene4-halo", 0, frame / 60))}
                />
                <path
                  d="M150 165 Q168 288 300 294 Q432 288 450 165 Z"
                  fill={accent}
                />
                <ellipse cx="300" cy="165" rx="150" ry="34" fill="#0A2E3A" />
                <ellipse cx="300" cy="165" rx="128" ry="23" fill={spice} opacity="0.65" />
                {[0, 1, 2].map((i) => {
                  const sway = noise2D("scene4-steam", i * 1.4, frame / 45) * 17;
                  return (
                    <path
                      key={i}
                      d={`M${244 + i * 56} 140 C ${224 + i * 56 + sway} 108, ${272 + i * 56 + sway} 84, ${250 + i * 56} 48`}
                      stroke="rgba(13,55,69,0.28)"
                      strokeWidth="7"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray="10 16"
                      strokeDashoffset={-frame * 1.7 - i * 10}
                    />
                  );
                })}
                {[0, 1, 2].map((i) => (
                  <circle
                    key={i}
                    cx={274 + i * 26}
                    cy={168 + (i % 2) * 5}
                    r={5 + (i % 2) * 2}
                    fill="#F4C27A"
                    opacity={0.8}
                  />
                ))}
              </svg>
            </div>

            <div
              style={{
                position: "absolute",
                left: "16%",
                top: "27%",
                opacity: interpolate(frame, [150, 174], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                transform: `scale(${0.85 + Math.sin(frame / 18) * 0.15})`,
              }}
            >
              <Sparkles size={30} color={spice} />
            </div>
            <div
              style={{
                position: "absolute",
                right: "16%",
                top: "42%",
                opacity: interpolate(frame, [158, 182], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                transform: `scale(${0.9 + Math.sin(frame / 22 + 2) * 0.12})`,
              }}
            >
              <Sparkles size={24} color={accent} />
            </div>

            <div
              style={{
                position: "absolute",
                left: "7%",
                right: "7%",
                bottom: "5%",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                direction: "ltr",
              }}
            >
              {NOTES.map((note, i) => {
                const grow = interpolate(
                  frame,
                  [56 + i * 16, 116 + i * 16],
                  [0, note.value],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                );
                return (
                  <div
                    key={note.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      opacity: enter(4 + i),
                    }}
                  >
                    <span
                      style={{
                        width: 92,
                        color: props.mutedColor,
                        fontSize: 17,
                        fontWeight: 800,
                        letterSpacing: 1.4,
                        textTransform: "uppercase",
                      }}
                    >
                      {note.label}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 13,
                        borderRadius: 99,
                        background: "rgba(13,55,69,0.09)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${grow * 100}%`,
                          height: "100%",
                          borderRadius: 99,
                          background: i === 2 ? spice : accent,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        width: 50,
                        textAlign: "right",
                        color: props.textColor,
                        fontSize: 18,
                        fontWeight: 800,
                      }}
                    >
                      {Math.round(grow * 100)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <SceneSfx name="pop" frame={12} volume={0.18} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
