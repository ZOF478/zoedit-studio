import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { noise2D } from "@remotion/noise";
import { CheckCircle2, Flame, Timer } from "lucide-react";
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

export const Scene7 = (props: Props) => {
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
  const stepTwo = spring({
    frame,
    fps,
    delay: 112,
    config: { damping: 14, stiffness: 120 },
  });
  const checkFrame = 200;
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
            "radial-gradient(circle at 88% 18%, rgba(190,37,35,0.11), transparent 42%), radial-gradient(circle at 10% 70%, rgba(13,55,69,0.10), transparent 44%)",
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
              THE METHOD
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
            Bloom fast, then{" "}
            <span style={{ color: spice }}>simmer low and slow</span>
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
            Two moves. One better pot.
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
                  "radial-gradient(circle at 50% 40%, rgba(244,194,122,0.14), transparent 46%), radial-gradient(circle at 12% 8%, rgba(255,255,255,0.13), transparent 38%)",
              }}
            />
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const drift = noise2D("scene7-ember", i * 1.4, frame / 58);
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${12 + i * 15}%`,
                    top: `${22 + ((i * 29) % 58)}%`,
                    width: 4 + (i % 3) * 2,
                    height: 4 + (i % 3) * 2,
                    borderRadius: "50%",
                    background: "#F4C27A",
                    opacity: 0.2 + Math.abs(drift) * 0.35,
                    transform: `translate(${drift * 16}px, ${Math.sin(frame / 28 + i) * 12}px)`,
                  }}
                />
              );
            })}

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
                }}
              >
                Fast bloom, low simmer
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
                2 STEPS
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                top: "18%",
                left: "7%",
                right: "7%",
                bottom: "6%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                direction: "ltr",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "20px 22px",
                  borderRadius: 24,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  opacity: enter(4),
                  transform: `translateX(${(1 - enter(4)) * -22}px)`,
                }}
              >
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: "50%",
                    background: "rgba(244,194,122,0.16)",
                    border: "1px solid rgba(244,194,122,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#F4C27A",
                    fontSize: 18,
                    fontWeight: 800,
                  }}
                >
                  01
                </div>
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 18,
                    background: "rgba(190,37,35,0.26)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: `scale(${1 + Math.sin(frame / 18) * 0.06})`,
                  }}
                >
                  <Flame size={28} color="#FFD9D7" />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      color: "#FFFFFF",
                      fontSize: 29,
                      fontWeight: 800,
                      letterSpacing: 0.4,
                    }}
                  >
                    BLOOM FAST
                  </div>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.66)",
                      fontSize: 18,
                      fontWeight: 500,
                      marginTop: 3,
                    }}
                  >
                    20 seconds · medium heat
                  </div>
                </div>
              </div>

              <svg
                width="40"
                height="88"
                viewBox="0 0 40 88"
                style={{ marginLeft: 34, flexShrink: 0 }}
              >
                <line
                  x1="20"
                  y1="4"
                  x2="20"
                  y2="58"
                  stroke="#F4C27A"
                  strokeWidth="3"
                  strokeDasharray="7 8"
                  strokeDashoffset={-frame * 1.6}
                  opacity="0.72"
                />
                <path
                  d="M9 56 L20 76 L31 56"
                  fill="none"
                  stroke="#F4C27A"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.5 + stepTwo * 0.5}
                />
              </svg>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "20px 22px",
                  borderRadius: 24,
                  background:
                    stepTwo > 0.25
                      ? "rgba(244,194,122,0.14)"
                      : "rgba(255,255,255,0.08)",
                  border:
                    stepTwo > 0.25
                      ? "1px solid rgba(244,194,122,0.5)"
                      : "1px solid rgba(255,255,255,0.18)",
                  opacity: enter(5),
                  transform: `translateX(${(1 - enter(5)) * -22}px)`,
                }}
              >
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: "50%",
                    background: "rgba(244,194,122,0.16)",
                    border: "1px solid rgba(244,194,122,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#F4C27A",
                    fontSize: 18,
                    fontWeight: 800,
                  }}
                >
                  02
                </div>
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: `rotate(${Math.sin(frame / 24) * 4}deg)`,
                  }}
                >
                  <Timer size={27} color="#F4C27A" />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      color: "#FFFFFF",
                      fontSize: 29,
                      fontWeight: 800,
                      letterSpacing: 0.4,
                    }}
                  >
                    SIMMER LOW
                  </div>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.66)",
                      fontSize: 18,
                      fontWeight: 500,
                      marginTop: 3,
                    }}
                  >
                    Low heat · give it time
                  </div>
                </div>
                <div
                  style={{
                    opacity: check,
                    transform: `scale(${0.6 + check * 0.4})`,
                  }}
                >
                  <CheckCircle2 size={34} color="#F4C27A" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <SceneSfx name="pop" frame={12} volume={0.18} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
