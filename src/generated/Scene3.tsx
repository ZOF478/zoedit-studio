import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { noise2D } from "@remotion/noise";
import { AlertTriangle, CheckCircle2, Flame } from "lucide-react";
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

const BURN_SPOTS = [
  { x: 300, y: 220, r: 20, delay: 0 },
  { x: 396, y: 270, r: 26, delay: 8 },
  { x: 332, y: 312, r: 16, delay: 16 },
];

export const Scene3 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = props.accentColor;
  const spice = "#BE2523";
  const enter = (i: number) =>
    spring({
      frame,
      fps,
      delay: i * 12,
      config: { damping: 15, stiffness: 110, mass: 0.8 },
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
  const burn = interpolate(frame, [70, 108, 188, 220], [0, 0.92, 0.92, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const warning = interpolate(frame, [66, 88, 196, 216], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const checkFrame = 210;
  const safe = spring({
    frame,
    fps,
    delay: checkFrame,
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
            "radial-gradient(circle at 84% 20%, rgba(190,37,35,0.10), transparent 42%), radial-gradient(circle at 10% 60%, rgba(13,55,69,0.10), transparent 44%)",
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
              THE RISK
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
              maxWidth: "95%",
              opacity: enter(1),
              transform: `translateY(${(1 - enter(1)) * 20}px)`,
            }}
          >
            A single scorch{" "}
            <span style={{ color: spice }}>ruins the pot</span>
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
            Still spices turn bitter in seconds.
          </p>
        </div>

        <div
          style={{
            position: "absolute",
            top: "25%",
            left: "6%",
            right: "6%",
            height: "46%",
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
                  "radial-gradient(circle at 50% 62%, rgba(190,37,35,0.20), transparent 50%), radial-gradient(circle at 12% 8%, rgba(255,255,255,0.14), transparent 38%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "6%",
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
                Keep them moving
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "10px 15px",
                  borderRadius: 999,
                  background: "rgba(190,37,35,0.22)",
                  border: "1px solid rgba(190,37,35,0.5)",
                  color: "#FFD9D7",
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: 1,
                  opacity: warning,
                }}
              >
                <AlertTriangle size={19} />
                SCORCH RISK
              </div>
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "10px 15px",
                  borderRadius: 999,
                  background: "rgba(244,194,122,0.16)",
                  border: "1px solid rgba(244,194,122,0.45)",
                  color: "#F4C27A",
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: 1,
                  opacity: safe,
                  transform: `scale(${0.86 + safe * 0.14})`,
                }}
              >
                <CheckCircle2 size={19} />
                SAFE & MOVING
              </div>
            </div>

            <svg
              viewBox="0 0 700 520"
              preserveAspectRatio="xMidYMid meet"
              style={{
                position: "absolute",
                left: "4%",
                right: "4%",
                top: "15%",
                width: "92%",
                height: "80%",
              }}
            >
              <circle
                cx="350"
                cy="260"
                r="214"
                fill="rgba(255,255,255,0.035)"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="2"
              />
              <circle
                cx="350"
                cy="260"
                r="196"
                fill="#0A2E3A"
                stroke="rgba(255,255,255,0.16)"
                strokeWidth="3"
              />
              <circle
                cx="350"
                cy="260"
                r="170"
                fill="none"
                stroke="rgba(255,255,255,0.10)"
                strokeWidth="2"
                strokeDasharray="8 14"
                transform={`rotate(${frame * 0.45} 350 260)`}
              />
              <rect
                x="530"
                y="236"
                width="154"
                height="48"
                rx="24"
                fill="rgba(255,255,255,0.18)"
              />
              <rect
                x="546"
                y="248"
                width="126"
                height="24"
                rx="12"
                fill="rgba(255,255,255,0.08)"
              />
              {BURN_SPOTS.map((spot) => (
                <circle
                  key={spot.x}
                  cx={spot.x}
                  cy={spot.y}
                  r={spot.r}
                  fill="#6E1918"
                  opacity={burn * 0.8}
                />
              ))}
              {Array.from({ length: 16 }).map((_, i) => {
                const angle = frame / 62 + i * 0.74;
                const radius = 36 + (i % 6) * 22;
                const cx =
                  350 +
                  Math.cos(angle) * radius +
                  noise2D("scene3-x", i * 0.9, frame / 50) * 10;
                const cy =
                  260 +
                  Math.sin(angle) * radius * 0.86 +
                  noise2D("scene3-y", i * 0.9, frame / 55) * 10;
                return (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={4 + (i % 3) * 2}
                    fill={i % 4 === 0 ? "#F4C27A" : "rgba(255,255,255,0.82)"}
                    opacity={0.65 + 0.25 * Math.abs(Math.sin(frame / 25 + i))}
                  />
                );
              })}
              <g transform={`rotate(${frame * 1.5 + 18} 350 260)`}>
                <line
                  x1="350"
                  y1="260"
                  x2="552"
                  y2="260"
                  stroke="#F4C27A"
                  strokeWidth="13"
                  strokeLinecap="round"
                  opacity="0.95"
                />
                <rect
                  x="500"
                  y="236"
                  width="62"
                  height="48"
                  rx="17"
                  fill="#F4C27A"
                  transform="rotate(14 531 260)"
                />
              </g>
              <circle cx="350" cy="260" r="11" fill="#F4C27A" />
            </svg>

            <div
              style={{
                position: "absolute",
                left: "7%",
                bottom: "4%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "rgba(255,255,255,0.72)",
                fontSize: 18,
                fontWeight: 600,
                opacity: enter(4),
              }}
            >
              <Flame size={20} color="#F4C27A" />
              Stir, do not walk away
            </div>
          </div>
        </div>

        <SceneSfx name="pop" frame={12} volume={0.18} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
