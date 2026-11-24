import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneSfx } from "../components/SceneSfx";
import { SmartIcon } from "../components/SmartIcon";
import { Send } from "lucide-react";

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
const PROMPT = "Create a 60fps motion graphics promo for Zof Studio";
const STEPS = [
  { icon: "code", label: "AI Scene Coding", detail: "Real TSX. Real React.", colorIndex: 0 },
  { icon: "microphone", label: "ElevenLabs Voiceover", detail: "Natural narration.", colorIndex: 1 },
  { icon: "subtitles", label: "Synced Captions", detail: "Karaoke-perfect timing.", colorIndex: 2 },
];

export const Scene3 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();
  const exit = interpolate(
    frame,
    [Math.max(0, durationInFrames - 10), Math.max(1, durationInFrames - 1)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const typed = PROMPT.slice(
    0,
    Math.round(
      interpolate(frame, [30, 170], [0, PROMPT.length], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    ),
  );
  const active = interpolate(frame, [170, 205], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ready = spring({ frame: frame - 300, fps, config: { damping: 14, stiffness: 130 } });
  const titleSize = Math.min(width * 0.088, 92);
  const panX = Math.sin(frame / 70) * 14 + (frame / durationInFrames - 0.5) * 24;
  const panY = Math.sin(frame / 110) * 8;

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
          background: `radial-gradient(circle at 50% 48%, ${props.accentColor}1f, transparent 65%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.05,
          backgroundImage: `linear-gradient(${props.textColor} 1px, transparent 1px), linear-gradient(90deg, ${props.textColor} 1px, transparent 1px)`,
          backgroundSize: "120px 120px",
        }}
      />
      {Array.from({ length: 12 }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${(i * 61) % 100}%`,
            top: `${(i * 37) % 100}%`,
            width: 3,
            height: 3,
            borderRadius: "50%",
            backgroundColor: props.accentColor,
            opacity: 0.2 + 0.15 * Math.sin(frame / 25 + i),
            transform: `translateY(${Math.sin(frame / 45 + i) * 18}px)`,
          }}
        />
      ))}

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
            top: "7.5%",
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
            WITH ZOF STUDIO
          </div>
          <div
            style={{
              color: props.textColor,
              fontSize: titleSize,
              fontWeight: 900,
              lineHeight: 1.08,
              letterSpacing: -2,
              maxWidth: "90%",
            }}
          >
            One prompt. Full video.
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translateX(${panX}px) translateY(${panY}px) scale(1.015)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "25.5%",
              left: "8%",
              right: "8%",
              backgroundColor: SURFACE,
              borderRadius: 24,
              border: `2px solid ${active > 0.5 ? props.accentColor : props.mutedColor}77`,
              boxShadow: `0 0 ${10 + active * 34}px ${props.accentColor}44`,
              padding: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <SmartIcon query="brain" size={30} color={props.accentColor} />
                <div
                  style={{
                    color: props.textColor,
                    fontSize: 17,
                    fontWeight: 900,
                    letterSpacing: 2,
                  }}
                >
                  MASTER MIND
                </div>
              </div>
              <div
                style={{
                  color: props.mutedColor,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 2,
                }}
              >
                ONE SINGLE PROMPT
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginTop: 18,
              }}
            >
              <div
                style={{
                  flex: 1,
                  minHeight: 54,
                  color: props.textColor,
                  fontSize: 24,
                  fontWeight: 600,
                  lineHeight: 1.35,
                  direction: "ltr",
                  textAlign: "left",
                }}
              >
                {typed}
                <span
                  style={{
                    display: "inline-block",
                    width: 2,
                    height: 24,
                    marginLeft: 3,
                    backgroundColor: props.accentColor,
                    opacity: Math.sin(frame / 5) > 0 ? 1 : 0,
                    verticalAlign: "middle",
                  }}
                />
              </div>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: props.accentColor,
                  transform: `scale(${0.9 + active * 0.1})`,
                  flexShrink: 0,
                }}
              >
                <Send size={22} color={props.bgColor} />
              </div>
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              top: "45%",
              left: "8%",
              right: "8%",
              display: "flex",
              gap: 16,
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "10%",
                right: "10%",
                top: 50,
                height: 2,
                background: `linear-gradient(90deg, ${props.accentColor}22, ${props.accentColor}aa, ${props.accentColor}22)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 45,
                left: `${12 + ((frame / 4) % 76)}%`,
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: props.accentColor,
                boxShadow: `0 0 14px ${props.accentColor}`,
              }}
            />
            {STEPS.map((step, i) => {
              const enter = spring({
                frame: frame - 190 - i * 12,
                fps,
                config: { damping: 16, stiffness: 120 },
              });
              const lit = i / 2 <= active;
              return (
                <div
                  key={step.label}
                  style={{
                    flex: 1,
                    backgroundColor: SURFACE,
                    borderRadius: 20,
                    border: `1.5px solid ${lit ? props.accentColor : props.mutedColor}55`,
                    padding: 18,
                    opacity: enter,
                    transform: `translateY(${(1 - enter) * 30}px) scale(${0.96 + enter * 0.04})`,
                    boxShadow: lit ? `0 0 24px ${props.accentColor}33` : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <SmartIcon query={step.icon} size={32} color={props.accentColor} />
                    <div
                      style={{
                        color: `${props.accentColor}cc`,
                        fontSize: 13,
                        fontWeight: 900,
                        letterSpacing: 1,
                      }}
                    >
                      0{i + 1}
                    </div>
                  </div>
                  <div
                    style={{
                      color: props.textColor,
                      fontSize: 17,
                      fontWeight: 800,
                      lineHeight: 1.25,
                      marginTop: 18,
                    }}
                  >
                    {step.label}
                  </div>
                  <div
                    style={{
                      color: props.mutedColor,
                      fontSize: 12.5,
                      fontWeight: 600,
                      marginTop: 8,
                      lineHeight: 1.4,
                    }}
                  >
                    {step.detail}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: "66%",
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 22px",
              borderRadius: 999,
              backgroundColor: SURFACE,
              border: `1px solid ${props.accentColor}aa`,
              color: props.textColor,
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: 1,
              opacity: ready,
              transform: `scale(${0.9 + ready * 0.1})`,
              boxShadow: `0 0 24px ${props.accentColor}44`,
            }}
          >
            <SmartIcon query="check" size={20} color={props.accentColor} />
            RENDER PIPELINE READY · 60 FPS
          </div>
        </div>
      </div>

      <SceneSfx name="pop" frame={300} volume={0.18} />
    </AbsoluteFill>
  );
};
