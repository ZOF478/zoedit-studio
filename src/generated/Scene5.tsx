import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { noise2D } from "@remotion/noise";
import { Flame, Timer, TrendingDown } from "lucide-react";
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

const BUBBLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: 245 + ((i * 29) % 112),
  speed: 0.8 + (i % 4) * 0.35,
  size: 4 + (i % 4) * 2,
}));

export const Scene5 = (props: Props) => {
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
  const drain = interpolate(frame, [20, 140], [0.86, 0.18], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bitter = spring({
    frame,
    fps,
    delay: 100,
    config: { damping: 12, stiffness: 150 },
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
            "radial-gradient(circle at 84% 26%, rgba(190,37,35,0.12), transparent 42%), radial-gradient(circle at 10% 68%, rgba(13,55,69,0.10), transparent 44%)",
        }}
      >
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
              THE OPPOSITE
            </span>
          </div>
          <h1
            style={{
              margin: 0,
              color: props.textColor,
              fontSize: 72,
              lineHeight: 1.04,
              letterSpacing: -1.5,
              fontWeight: 800,
              maxWidth: "94%",
              opacity: enter(1),
              transform: `translateY(${(1 - enter(1)) * 20}px)`,
            }}
          >
            Long boiling does the{" "}
            <span style={{ color: spice }}>opposite</span>
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
            Heat that keeps going turns on you.
          </p>
        </div>

        <div
          style={{
            position: "absolute",
            top: "25.5%",
            left: "6%",
            right: "6%",
            height: "45.5%",
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
              background: accent,
              boxShadow: "0 28px 64px rgba(13,55,69,0.24)",
            }}
          >
            <AbsoluteFill
              style={{
                backgroundImage:
                  "radial-gradient(circle at 50% 66%, rgba(190,37,35,0.24), transparent 48%), radial-gradient(circle at 12% 8%, rgba(255,255,255,0.14), transparent 38%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "5.5%",
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
                  padding: "12px 22px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.26)",
                  color: "#FFFFFF",
                  fontSize: 24,
                  fontWeight: 700,
                  opacity: enter(3),
                  transform: `translateX(${(1 - enter(3)) * -16}px)`,
                }}
              >
                Long boiling backfires
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "10px 15px",
                  borderRadius: 999,
                  background: "rgba(190,37,35,0.22)",
                  border: "1px solid rgba(190,37,35,0.48)",
                  color: "#FFD9D7",
                  fontSize: 16,
                  fontWeight: 800,
                  letterSpacing: 1,
                  opacity: enter(4),
                }}
              >
                <Timer size={19} />
                30 MIN
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                right: "7%",
                top: "17%",
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "10px 15px",
                borderRadius: 999,
                background: "rgba(190,37,35,0.28)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: 800,
                opacity: bitter,
                transform: `scale(${0.8 + bitter * 0.2})`,
              }}
            >
              <Flame size={18} color="#FFD9D7" />
              HARSH & BITTER
            </div>

            <svg
              viewBox="0 0 600 360"
              preserveAspectRatio="xMidYMax meet"
              style={{
                position: "absolute",
                left: "8%",
                right: "8%",
                top: "15%",
                width: "84%",
                height: "62%",
              }}
            >
              <ellipse cx="300" cy="318" rx="138" ry="30" fill="rgba(0,0,0,0.28)" />
              <path
                d="M176 205 Q300 238 424 205 L398 300 Q300 342 202 300 Z"
                fill="#082A35"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="3"
              />
              <ellipse
                cx="300"
                cy="205"
                rx="124"
                ry="30"
                fill="#0B2F3B"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="3"
              />
              <ellipse cx="300" cy="205" rx="102" ry="21" fill={spice} opacity="0.72" />
              <path
                d="M176 210 Q138 214 146 246"
                stroke="rgba(255,255,255,0.42)"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M424 210 Q462 214 454 246"
                stroke="rgba(255,255,255,0.42)"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
              />
              {BUBBLES.map((b) => {
                const rise = (frame * b.speed + b.id * 22) % 110;
                const drift = noise2D("scene5-bubble", b.id * 1.1, frame / 40) * 8;
                return (
                  <circle
                    key={b.id}
                    cx={b.x + drift}
                    cy={198 - rise}
                    r={b.size}
                    fill="none"
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth="2"
                    opacity={0.75 - rise / 180}
                  />
                );
              })}
              {[0, 1, 2].map((i) => {
                const sway = noise2D("scene5-steam", i * 1.5, frame / 36) * 26;
                return (
                  <path
                    key={i}
                    d={`M${242 + i * 58} 182 C ${214 + i * 58 + sway} 138, ${280 + i * 58 + sway} 112, ${246 + i * 58} 62`}
                    stroke="rgba(255,255,255,0.36)"
                    strokeWidth="7"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="9 17"
                    strokeDashoffset={-frame * 2 - i * 12}
                  />
                );
              })}
            </svg>

            <div
              style={{
                position: "absolute",
                left: "7%",
                right: "7%",
                bottom: "4%",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                direction: "ltr",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontWeight: 800,
                  letterSpacing: 1.3,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <TrendingDown size={19} color="#FFD9D7" />
                  AROMA
                </span>
                <span style={{ color: "#FFD9D7" }}>{Math.round(drain * 100)}%</span>
              </div>
              <div
                style={{
                  height: 13,
                  borderRadius: 99,
                  background: "rgba(255,255,255,0.14)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${drain * 100}%`,
                    height: "100%",
                    borderRadius: 99,
                    background: spice,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <SceneSfx name="pop" frame={12} volume={0.18} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
