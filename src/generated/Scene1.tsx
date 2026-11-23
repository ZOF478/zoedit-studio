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

const SPICES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: 8 + ((i * 31) % 84),
  y: 30 + ((i * 43) % 56),
  size: 2 + ((i * 7) % 6),
}));

const QUESTIONS = [
  { x: 11, y: 22, rot: -12, delay: 0 },
  { x: 79, y: 30, rot: 11, delay: 14 },
  { x: 68, y: 62, rot: -7, delay: 28 },
];

export const Scene1 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spice = "#BE2523";
  const accent = props.accentColor;
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
  const push = interpolate(
    frame,
    [0, Math.max(1, props.durationInFrames)],
    [1, 1.045],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const qFade = interpolate(frame, [0, 16, 84, 112], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const checkFrame = 150;
  const check = spring({
    frame,
    fps,
    delay: checkFrame,
    config: { damping: 12, stiffness: 160 },
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
          transform: `scale(${push}) translateY(${(1 - exit) * 16}px)`,
          backgroundImage:
            "radial-gradient(circle at 86% 14%, rgba(190,37,35,0.12), transparent 40%), radial-gradient(circle at 10% 64%, rgba(13,55,69,0.10), transparent 44%)",
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
            <span
              style={{
                width: 38,
                height: 3,
                background: spice,
                borderRadius: 2,
              }}
            />
            <span
              style={{
                color: accent,
                fontSize: 19,
                letterSpacing: 4,
                fontWeight: 800,
              }}
            >
              SHELFRECIPES · CULINARY TIP
            </span>
          </div>
          <h1
            style={{
              margin: 0,
              color: props.textColor,
              fontSize: 76,
              lineHeight: 1.04,
              letterSpacing: -1.5,
              fontWeight: 800,
              maxWidth: "94%",
              opacity: enter(1),
              transform: `translateY(${(1 - enter(1)) * 20}px)`,
            }}
          >
            The secret to a{" "}
            <span style={{ color: spice }}>richer soup</span>
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
            Toast first. The whole pot tastes deeper.
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
            transform: `translateY(${(1 - enter(1)) * 26}px)`,
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
                  "radial-gradient(circle at 50% 70%, rgba(190,37,35,0.34), transparent 46%), radial-gradient(circle at 12% 10%, rgba(255,255,255,0.16), transparent 38%)",
              }}
            />
            {SPICES.map((s, i) => {
              const drift = noise2D("scene1-spice", i * 0.7, frame / 60);
              const rise = (frame * 0.45 + i * 29) % 130;
              return (
                <div
                  key={s.id}
                  style={{
                    position: "absolute",
                    left: `${s.x}%`,
                    top: `${s.y}%`,
                    width: s.size,
                    height: s.size,
                    borderRadius: "50%",
                    background: i % 3 === 0 ? "#F4C27A" : "rgba(255,255,255,0.8)",
                    opacity: 0.22 + 0.5 * Math.abs(drift),
                    transform: `translate(${drift * 14}px, ${-rise * 0.55}px)`,
                  }}
                />
              );
            })}

            <svg
              viewBox="0 0 600 380"
              preserveAspectRatio="xMidYMax meet"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: "8%",
                width: "100%",
                height: "64%",
              }}
            >
              <defs>
                <linearGradient id="scene1-pot" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#1B5264" />
                  <stop offset="1" stopColor="#082A35" />
                </linearGradient>
              </defs>
              <ellipse cx="300" cy="322" rx="138" ry="32" fill="rgba(0,0,0,0.3)" />
              <path
                d="M176 205 Q300 240 424 205 L398 306 Q300 348 202 306 Z"
                fill="url(#scene1-pot)"
                stroke="rgba(255,255,255,0.22)"
                strokeWidth="3"
              />
              <ellipse
                cx="300"
                cy="205"
                rx="124"
                ry="30"
                fill="#0B2F3B"
                stroke="rgba(255,255,255,0.34)"
                strokeWidth="3"
              />
              <ellipse cx="300" cy="205" rx="96" ry="19" fill={spice} opacity="0.55" />
              <path
                d="M176 210 Q138 214 146 246"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M424 210 Q462 214 454 246"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
              />
              {[0, 1, 2].map((i) => {
                const sway = noise2D("scene1-steam", i * 1.3, frame / 45) * 18;
                return (
                  <path
                    key={i}
                    d={`M${244 + i * 56} 182 C ${222 + i * 56 + sway} 148, ${272 + i * 56 + sway} 124, ${250 + i * 56} 90`}
                    stroke="rgba(255,255,255,0.42)"
                    strokeWidth="7"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="12 18"
                    strokeDashoffset={-frame * 1.6 - i * 12}
                  />
                );
              })}
            </svg>

            {QUESTIONS.map((q) => {
              const qIn = spring({
                frame,
                fps,
                delay: q.delay,
                config: { damping: 11, stiffness: 130 },
              });
              return (
                <div
                  key={q.x}
                  style={{
                    position: "absolute",
                    left: `${q.x}%`,
                    top: `${q.y}%`,
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 58,
                    fontWeight: 800,
                    fontFamily: "Georgia, serif",
                    opacity: qFade * qIn,
                    transform: `translateY(${Math.sin((frame + q.delay) / 22) * 8}px) rotate(${q.rot}deg) scale(${0.8 + qIn * 0.2})`,
                  }}
                >
                  ?
                </div>
              );
            })}
            <div
              style={{
                position: "absolute",
                left: "17%",
                top: "33%",
                opacity: interpolate(frame, [108, 132], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                transform: `scale(${0.85 + Math.sin(frame / 18) * 0.15})`,
              }}
            >
              <Sparkles size={36} color="#F4C27A" />
            </div>
            <div
              style={{
                position: "absolute",
                right: "16%",
                top: "48%",
                opacity: interpolate(frame, [116, 140], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                transform: `scale(${0.9 + Math.sin(frame / 21 + 2) * 0.12})`,
              }}
            >
              <Sparkles size={26} color="#F4C27A" />
            </div>

            <div
              style={{
                position: "absolute",
                top: "7%",
                left: "6%",
                right: "6%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
                direction: "ltr",
              }}
            >
              <div
                style={{
                  width: 94,
                  height: 94,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#F4C27A",
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: 2,
                  transform: `rotate(${Math.sin(frame / 40) * 3}deg) scale(${enter(3)})`,
                }}
              >
                SECRET
              </div>
              <div
                style={{
                  padding: "14px 24px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.28)",
                  color: "#FFFFFF",
                  fontSize: 25,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  opacity: enter(4),
                  transform: `scale(${0.82 + enter(4) * 0.18})`,
                }}
              >
                Toast spices first
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                left: "6%",
                right: "6%",
                bottom: "3.5%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 18px",
                borderRadius: 18,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#FFFFFF",
                opacity: check,
                transform: `translateY(${(1 - check) * 16}px)`,
              }}
            >
              <CheckCircle2 size={24} color="#F4C27A" />
              <span style={{ fontSize: 20, fontWeight: 600 }}>
                20 seconds on medium heat
              </span>
              <Flame size={20} color="#F4C27A" style={{ marginLeft: "auto" }} />
            </div>
          </div>
        </div>

        <SceneSfx name="pop" frame={12} volume={0.18} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
