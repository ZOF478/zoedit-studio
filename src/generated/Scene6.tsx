import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { evolvePath } from "@remotion/paths";
import { noise2D } from "@remotion/noise";
import { TrendingDown } from "lucide-react";
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

const AROMA_PATH =
  "M 120 100 C 240 108, 358 168, 468 258 S 646 386, 770 424";
const BITTER_PATH =
  "M 120 410 C 262 396, 402 360, 520 288 S 682 158, 770 104";

export const Scene6 = (props: Props) => {
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
  const aromaDraw = interpolate(frame, [30, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bitterDraw = interpolate(frame, [58, 200], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const aromaDash = evolvePath(aromaDraw, AROMA_PATH);
  const bitterDash = evolvePath(bitterDraw, BITTER_PATH);
  const cross = spring({
    frame,
    fps,
    delay: 186,
    config: { damping: 11, stiffness: 150 },
  });
  const pulse = interpolate(frame, [186, 250], [0, 1], {
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
            "radial-gradient(circle at 10% 20%, rgba(13,55,69,0.09), transparent 42%), radial-gradient(circle at 90% 62%, rgba(190,37,35,0.10), transparent 44%)",
        }}
      >
        {[0, 1, 2].map((i) => {
          const drift = noise2D("scene6-float", i * 2.1, frame / 65);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${18 + i * 30}%`,
                top: `${24 + i * 17}%`,
                width: 5 + i * 3,
                height: 5 + i * 3,
                borderRadius: "50%",
                background: i === 1 ? "rgba(190,37,35,0.3)" : "rgba(13,55,69,0.22)",
                transform: `translate(${drift * 18}px, ${Math.sin(frame / 34 + i) * 9}px)`,
              }}
            />
          );
        })}

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
              THE COST
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
            Aroma drains away{" "}
            <span style={{ color: spice }}>and bitterness wins</span>
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
            What long boiling takes from the pot.
          </p>
        </div>

        <div
          style={{
            position: "absolute",
            top: "27%",
            left: "6%",
            right: "6%",
            height: "44%",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            opacity: enter(1),
            transform: `translateY(${(1 - enter(1)) * 24}px)`,
          }}
        >
          <div
            style={{
              flex: 1,
              borderRadius: 34,
              padding: "20px 24px 12px",
              background:
                "linear-gradient(160deg, rgba(255,255,255,0.98), rgba(13,55,69,0.055))",
              border: "1px solid rgba(13,55,69,0.14)",
              boxShadow: "0 24px 54px rgba(13,55,69,0.12)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                direction: "ltr",
                opacity: enter(3),
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: accent,
                  fontSize: 17,
                  fontWeight: 800,
                  letterSpacing: 1,
                }}
              >
                <span style={{ width: 26, height: 5, borderRadius: 9, background: accent }} />
                AROMA
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: spice,
                  fontSize: 17,
                  fontWeight: 800,
                  letterSpacing: 1,
                }}
              >
                <span style={{ width: 26, height: 5, borderRadius: 9, background: spice }} />
                BITTERNESS
              </span>
            </div>

            <svg
              viewBox="0 0 820 560"
              preserveAspectRatio="xMidYMid meet"
              style={{ width: "100%", flex: 1, marginTop: 4 }}
            >
              {[0, 1, 2, 3, 4].map((i) => {
                const y = 70 + i * 90;
                return (
                  <g key={i}>
                    <line
                      x1="120"
                      y1={y}
                      x2="770"
                      y2={y}
                      stroke="rgba(13,55,69,0.10)"
                      strokeWidth="1.5"
                    />
                    <text
                      x={106}
                      y={y + 6}
                      textAnchor="end"
                      fill="rgba(16,13,5,0.55)"
                      fontSize="18"
                      fontWeight="600"
                    >
                      {100 - i * 25}%
                    </text>
                  </g>
                );
              })}
              <line x1="120" y1="70" x2="120" y2="430" stroke="rgba(13,55,69,0.45)" strokeWidth="3" />
              <line x1="120" y1="430" x2="770" y2="430" stroke="rgba(13,55,69,0.45)" strokeWidth="3" />
              {[0, 1, 2, 3].map((i) => {
                const x = 120 + i * 216.6;
                return (
                  <text
                    key={i}
                    x={x}
                    y="462"
                    textAnchor="middle"
                    fill="rgba(16,13,5,0.55)"
                    fontSize="18"
                    fontWeight="600"
                  >
                    {i * 10}m
                  </text>
                );
              })}
              <text
                x="445"
                y="520"
                textAnchor="middle"
                fill="rgba(16,13,5,0.45)"
                fontSize="16"
                fontWeight="800"
                letterSpacing="3"
              >
                TIME SIMMERING
              </text>
              <path
                d={AROMA_PATH}
                fill="none"
                stroke={accent}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={aromaDash.strokeDasharray}
                strokeDashoffset={aromaDash.strokeDashoffset}
              />
              <path
                d={BITTER_PATH}
                fill="none"
                stroke={spice}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={bitterDash.strokeDasharray}
                strokeDashoffset={bitterDash.strokeDashoffset}
              />
              <circle
                cx="520"
                cy="288"
                r={10 + pulse * 8}
                fill="none"
                stroke={spice}
                strokeWidth="2"
                opacity={cross * (0.7 - pulse * 0.5)}
              />
              <circle
                cx="520"
                cy="288"
                r={8 * cross}
                fill={spice}
                stroke="#FFFFFF"
                strokeWidth="3"
              />
              <line
                x1="520"
                y1="288"
                x2="520"
                y2="430"
                stroke={spice}
                strokeWidth="2"
                strokeDasharray="6 8"
                opacity={cross * 0.5}
              />
            </svg>
          </div>

          <div
            style={{
              alignSelf: "center",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "11px 22px",
              borderRadius: 999,
              background: "rgba(190,37,35,0.10)",
              border: "1px solid rgba(190,37,35,0.24)",
              color: spice,
              fontSize: 22,
              fontWeight: 750,
              opacity: cross,
              transform: `translateY(${(1 - cross) * 14}px)`,
              direction: "ltr",
            }}
          >
            <TrendingDown size={22} />
            Bitterness takes over
          </div>
        </div>

        <SceneSfx name="pop" frame={12} volume={0.18} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
