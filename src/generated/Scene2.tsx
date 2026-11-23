import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { noise2D } from "@remotion/noise";
import { CheckCircle2, Flame, Sparkles, Timer } from "lucide-react";
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

export const Scene2 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = props.accentColor;
  const spice = "#BE2523";
  const enter = (i: number) =>
    spring({
      frame,
      fps,
      delay: i * 12,
      config: { damping: 15, stiffness: 115, mass: 0.8 },
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
  const progress = interpolate(frame, [20, 170], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const checkFrame = 168;
  const check = spring({
    frame,
    fps,
    delay: checkFrame,
    config: { damping: 12, stiffness: 155 },
  });
  const count = Math.max(0, 20 - Math.floor(progress * 20));
  const circumference = 2 * Math.PI * 150;

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
            "radial-gradient(circle at 14% 22%, rgba(13,55,69,0.09), transparent 42%), radial-gradient(circle at 88% 58%, rgba(190,37,35,0.10), transparent 44%)",
        }}
      >
        {[0, 1, 2, 3].map((i) => {
          const drift = noise2D("scene2-float", i * 1.7, frame / 70);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${12 + i * 24}%`,
                top: `${16 + ((i * 23) % 54)}%`,
                width: 7 + (i % 3) * 5,
                height: 7 + (i % 3) * 5,
                borderRadius: "50%",
                background: i % 2 === 0 ? "rgba(190,37,35,0.35)" : "rgba(13,55,69,0.25)",
                transform: `translate(${drift * 20}px, ${Math.sin(frame / 32 + i) * 10}px)`,
              }}
            />
          );
        })}

        <div
          style={{
            position: "absolute",
            top: "6.5%",
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
              marginBottom: 16,
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
              fontSize: 74,
              lineHeight: 1.04,
              letterSpacing: -1.5,
              fontWeight: 800,
              maxWidth: "94%",
              opacity: enter(1),
              transform: `translateY(${(1 - enter(1)) * 20}px)`,
            }}
          >
            Twenty seconds on{" "}
            <span style={{ color: spice }}>medium heat</span>
          </h1>
          <p
            style={{
              margin: "14px 0 0",
              color: props.mutedColor,
              fontSize: 25,
              lineHeight: 1.35,
              fontWeight: 500,
              opacity: enter(2),
            }}
          >
            That is all it takes to wake up the oils.
          </p>
        </div>

        <div
          style={{
            position: "absolute",
            top: "26%",
            left: "6%",
            right: "6%",
            height: "45%",
            display: "flex",
            opacity: enter(1),
            transform: `translateY(${(1 - enter(1)) * 24}px)`,
          }}
        >
          <div
            style={{
              position: "relative",
              flex: 1,
              borderRadius: 36,
              overflow: "hidden",
              background:
                "linear-gradient(155deg, rgba(13,55,69,0.055), rgba(255,255,255,0.9))",
              border: "1px solid rgba(13,55,69,0.14)",
              boxShadow: "0 24px 54px rgba(13,55,69,0.12)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "5%",
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
                  transform: `translateX(${(1 - enter(3)) * -18}px)`,
                }}
              >
                Wake up the oils
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  borderRadius: 999,
                  background: "rgba(13,55,69,0.09)",
                  color: accent,
                  fontSize: 18,
                  fontWeight: 800,
                  letterSpacing: 1,
                  opacity: enter(4),
                }}
              >
                <Timer size={20} />
                20 SEC
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                top: "15%",
                left: "50%",
                width: "min(78%, 520px)",
                aspectRatio: "1",
                transform: `translateX(-50%) scale(${enter(2) * (1 + Math.sin(frame / 42) * 0.01)})`,
              }}
            >
              <svg viewBox="0 0 400 400" style={{ width: "100%", height: "100%" }}>
                <circle
                  cx="200"
                  cy="200"
                  r="150"
                  fill="none"
                  stroke="rgba(13,55,69,0.10)"
                  strokeWidth="18"
                />
                <circle
                  cx="200"
                  cy="200"
                  r="150"
                  fill="none"
                  stroke={accent}
                  strokeWidth="18"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progress)}
                  transform="rotate(-90 200 200)"
                />
                {Array.from({ length: 24 }).map((_, i) => {
                  const angle = (-90 + (i / 24) * 360) * (Math.PI / 180);
                  const lit = progress * 24 > i;
                  return (
                    <line
                      key={i}
                      x1={200 + Math.cos(angle) * 174}
                      y1={200 + Math.sin(angle) * 174}
                      x2={200 + Math.cos(angle) * 186}
                      y2={200 + Math.sin(angle) * 186}
                      stroke={lit ? spice : "rgba(13,55,69,0.16)"}
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: props.textColor,
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                  <span style={{ fontSize: 94, fontWeight: 800, lineHeight: 1 }}>
                    {count}
                  </span>
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      letterSpacing: 2,
                      color: props.mutedColor,
                    }}
                  >
                    SEC
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    fontSize: 17,
                    fontWeight: 800,
                    letterSpacing: 2,
                    color: spice,
                  }}
                >
                  <Flame size={20} />
                  MEDIUM HEAT
                </div>
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: "3.5%",
                transform: `translateX(-50%) translateY(${(1 - check) * 18}px)`,
                opacity: check,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 20px",
                borderRadius: 999,
                background: accent,
                color: "#FFFFFF",
                fontSize: 21,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              <CheckCircle2 size={23} color="#F4C27A" />
              Oils awake
            </div>
            <div
              style={{
                position: "absolute",
                right: "9%",
                top: "16%",
                opacity: interpolate(frame, [166, 186], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                transform: `scale(${0.8 + Math.sin(frame / 17) * 0.14})`,
              }}
            >
              <Sparkles size={30} color={spice} />
            </div>
          </div>
        </div>

        <SceneSfx name="pop" frame={12} volume={0.18} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
