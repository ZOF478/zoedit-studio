import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { noise2D } from "@remotion/noise";
import { CheckCircle2, Flame, Sparkles } from "lucide-react";
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

const point = (angle: number, radius: number) => {
  const rad = (angle * Math.PI) / 180;
  return [300 + Math.cos(rad) * radius, 300 + Math.sin(rad) * radius] as const;
};

const SWEET_ARC_START = point(250, 210);
const SWEET_ARC_END = point(290, 210);
const SWEET_ARC = `M ${SWEET_ARC_START[0]} ${SWEET_ARC_START[1]} A 210 210 0 0 1 ${SWEET_ARC_END[0]} ${SWEET_ARC_END[1]}`;

export const Scene8 = (props: Props) => {
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
  const sweep = spring({
    frame,
    fps,
    delay: 36,
    config: { damping: 14, stiffness: 55, mass: 1 },
  });
  const needleAngle = 180 + sweep * 90;
  const glow = interpolate(frame, [112, 178], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const checkFrame = 200;
  const check = spring({
    frame,
    fps,
    delay: checkFrame,
    config: { damping: 12, stiffness: 155 },
  });
  const needleTip = point(needleAngle, 166);
  const sparkle = interpolate(frame, [196, 220], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
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
            "radial-gradient(circle at 14% 20%, rgba(190,37,35,0.10), transparent 42%), radial-gradient(circle at 86% 66%, rgba(13,55,69,0.10), transparent 44%)",
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
              THE SWEET SPOT
            </span>
          </div>
          <h1
            style={{
              margin: 0,
              color: props.textColor,
              fontSize: 66,
              lineHeight: 1.04,
              letterSpacing: -1.3,
              fontWeight: 800,
              maxWidth: "95%",
              opacity: enter(1),
              transform: `translateY(${(1 - enter(1)) * 20}px)`,
            }}
          >
            The sweet spot where{" "}
            <span style={{ color: spice }}>flavor survives</span>
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
            Bloom fast. Simmer low. Keep the flavor.
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
              background: accent,
              boxShadow: "0 28px 64px rgba(13,55,69,0.24)",
            }}
          >
            <AbsoluteFill
              style={{
                backgroundImage:
                  "radial-gradient(circle at 50% 46%, rgba(190,37,35,0.28), transparent 46%), radial-gradient(circle at 12% 8%, rgba(255,255,255,0.14), transparent 38%)",
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
                Right in the sweet spot
              </div>
              <div
                style={{
                  color: "#F4C27A",
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: 2,
                  opacity: enter(4),
                }}
              >
                20s → LOW
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                top: "12%",
                left: "5%",
                right: "5%",
                height: "66%",
                transform: `translateY(${Math.sin(frame / 32) * 3}px)`,
              }}
            >
              <svg
                viewBox="0 0 600 380"
                preserveAspectRatio="xMidYMid meet"
                style={{ width: "100%", height: "100%" }}
              >
                <path
                  d="M 90 300 A 210 210 0 0 1 510 300"
                  fill="none"
                  stroke="rgba(255,255,255,0.14)"
                  strokeWidth="26"
                  strokeLinecap="round"
                />
                <path
                  d={SWEET_ARC}
                  fill="none"
                  stroke={spice}
                  strokeWidth="48"
                  strokeLinecap="round"
                  opacity={0.16 * glow}
                />
                <path
                  d={SWEET_ARC}
                  fill="none"
                  stroke={spice}
                  strokeWidth="16"
                  strokeLinecap="round"
                  opacity={0.34 + glow * 0.66}
                />
                {Array.from({ length: 17 }).map((_, i) => {
                  const angle = 180 + (i / 16) * 180;
                  const outer = point(angle, 238);
                  const inner = point(angle, 224);
                  const sweet = angle > 248 && angle < 292;
                  return (
                    <line
                      key={i}
                      x1={inner[0]}
                      y1={inner[1]}
                      x2={outer[0]}
                      y2={outer[1]}
                      stroke={sweet ? "#F4C27A" : "rgba(255,255,255,0.28)"}
                      strokeWidth={sweet ? 5 : 3}
                      strokeLinecap="round"
                      opacity={sweet ? 0.55 + glow * 0.45 : 0.6}
                    />
                  );
                })}
                <text x="90" y="340" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="16" fontWeight="800" letterSpacing="2">
                  UNDER
                </text>
                <text x="510" y="340" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="16" fontWeight="800" letterSpacing="2">
                  BITTER
                </text>
                <text x="300" y="340" textAnchor="middle" fill="#F4C27A" fontSize="16" fontWeight="800" letterSpacing="2" opacity={0.4 + glow * 0.6}>
                  SWEET SPOT
                </text>
                <line
                  x1="300"
                  y1="300"
                  x2={needleTip[0]}
                  y2={needleTip[1]}
                  stroke="#FFFFFF"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <circle cx="300" cy="300" r="22" fill={spice} stroke="#FFFFFF" strokeWidth="5" />
                <circle cx="300" cy="300" r="8" fill="#F4C27A" />
                <circle
                  cx={needleTip[0]}
                  cy={needleTip[1]}
                  r={7 + Math.sin(frame / 14) * 1.5}
                  fill="#F4C27A"
                />
              </svg>
            </div>

            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: "10.5%",
                transform: `translateX(-50%) translateY(${(1 - check) * 16}px)`,
                opacity: check,
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "10px 19px",
                borderRadius: 999,
                background: "rgba(244,194,122,0.16)",
                border: "1px solid rgba(244,194,122,0.44)",
                color: "#FFFFFF",
                fontSize: 19,
                fontWeight: 700,
                whiteSpace: "nowrap",
                direction: "ltr",
              }}
            >
              <CheckCircle2 size={22} color="#F4C27A" />
              Saves flavor · No bitterness
            </div>
            <div
              style={{
                position: "absolute",
                left: "7%",
                right: "7%",
                bottom: "3%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "rgba(255,255,255,0.7)",
                fontSize: 17,
                fontWeight: 600,
                direction: "ltr",
                opacity: enter(5),
              }}
            >
              <Flame size={19} color="#F4C27A" />
              Bloom 20s · Simmer low
            </div>
            <div
              style={{
                position: "absolute",
                left: "15%",
                top: "21%",
                opacity: sparkle,
                transform: `scale(${0.8 + Math.sin(frame / 16) * 0.16})`,
              }}
            >
              <Sparkles size={30} color="#F4C27A" />
            </div>
            <div
              style={{
                position: "absolute",
                right: "15%",
                top: "27%",
                opacity: sparkle,
                transform: `scale(${0.85 + Math.sin(frame / 19 + 2) * 0.14})`,
              }}
            >
              <Sparkles size={24} color="#F4C27A" />
            </div>
            {[0, 1, 2].map((i) => {
              const drift = noise2D("scene8-float", i * 1.9, frame / 60);
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${20 + i * 28}%`,
                    top: `${18 + ((i * 21) % 44)}%`,
                    width: 4 + i * 2,
                    height: 4 + i * 2,
                    borderRadius: "50%",
                    background: "#F4C27A",
                    opacity: 0.25 + Math.abs(drift) * 0.4,
                    transform: `translate(${drift * 14}px, ${Math.sin(frame / 29 + i) * 10}px)`,
                  }}
                />
              );
            })}
          </div>
        </div>

        <SceneSfx name="pop" frame={12} volume={0.18} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
