import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneSfx } from "../components/SceneSfx";
import { AudioLines, Check } from "lucide-react";

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
const BARS = Array.from({ length: 14 }, (_, i) => i);
const WORDS = ["Your", "words", "land", "on", "every", "beat"];

export const Scene4 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();
  const exit = interpolate(
    frame,
    [Math.max(0, durationInFrames - 10), Math.max(1, durationInFrames - 1)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const badge = spring({ frame: frame - 100, fps, config: { damping: 13, stiffness: 150 } });
  const pulse = 1 + 0.018 * Math.sin(frame / 9);
  const titleSize = Math.min(width * 0.078, 82);
  const active = Math.floor(frame / 14) % WORDS.length;
  const ring = (frame % 120) / 120;

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
          background: `radial-gradient(circle at 50% 40%, ${props.accentColor}20, transparent 62%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.05,
          backgroundImage: `repeating-linear-gradient(90deg, ${props.textColor} 0 1px, transparent 1px 110px)`,
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
            AUTOMATIC SYNC
          </div>
          <div
            style={{
              color: props.textColor,
              fontSize: titleSize,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: -2,
              maxWidth: "90%",
            }}
          >
            Perfect sync, every frame
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: "28%",
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 10,
              width: 360,
              height: 360,
              borderRadius: "50%",
              border: `1px solid ${props.accentColor}`,
              opacity: (1 - ring) * 0.35,
              transform: `scale(${0.7 + ring * 0.8})`,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 10,
              width: 360,
              height: 360,
              borderRadius: "50%",
              border: `2px solid ${props.accentColor}`,
              opacity: (1 - ((ring + 0.5) % 1)) * 0.28,
              transform: `scale(${0.7 + ((ring + 0.5) % 1) * 0.8})`,
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 12,
              transform: `scale(${pulse})`,
              textShadow: `0 0 40px ${props.accentColor}88`,
            }}
          >
            <div
              style={{
                color: props.textColor,
                fontSize: Math.min(width * 0.28, 280),
                fontWeight: 900,
                lineHeight: 0.85,
                letterSpacing: -10,
              }}
            >
              60
            </div>
            <div
              style={{
                color: props.accentColor,
                fontSize: 52,
                fontWeight: 900,
                letterSpacing: 2,
                marginBottom: 34,
              }}
            >
              FPS
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 4,
              padding: "10px 18px",
              borderRadius: 999,
              backgroundColor: SURFACE,
              border: `1px solid ${props.accentColor}aa`,
              opacity: badge,
              transform: `translateY(${(1 - badge) * 16}px) scale(${0.9 + badge * 0.1})`,
            }}
          >
            <Check size={20} color={props.accentColor} />
            <div
              style={{
                color: props.textColor,
                fontSize: 15,
                fontWeight: 900,
                letterSpacing: 2,
              }}
            >
              SYNCED
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: "53%",
            left: "10%",
            right: "10%",
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <AudioLines size={30} color={props.accentColor} />
          <div
            style={{
              flex: 1,
              height: 120,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 5,
            }}
          >
            {BARS.map((bar) => {
              const enter = spring({
                frame: frame - bar * 12,
                fps,
                config: { damping: 200, stiffness: 120 },
              });
              const height = 16 + 84 * Math.abs(Math.sin(frame / 11 + bar * 0.65));
              return (
                <div
                  key={bar}
                  style={{
                    flex: 1,
                    height: height * enter,
                    borderRadius: 999,
                    backgroundColor: bar % 3 === 0 ? props.accentColor : `${props.accentColor}77`,
                    opacity: 0.55 + 0.45 * enter,
                    transform: "translateY(0)",
                  }}
                />
              );
            })}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: "64%",
            left: "10%",
            right: "10%",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 12,
              padding: "16px 22px",
              borderRadius: 18,
              backgroundColor: SURFACE,
              border: `1px solid ${props.mutedColor}66`,
              maxWidth: "100%",
            }}
          >
            {WORDS.map((word, i) => {
              const enter = spring({
                frame: frame - i * 12,
                fps,
                config: { damping: 200, stiffness: 120 },
              });
              const isActive = i === active;
              return (
                <div
                  key={word}
                  style={{
                    color: isActive ? props.accentColor : props.textColor,
                    fontSize: 24,
                    fontWeight: 800,
                    letterSpacing: -0.5,
                    opacity: enter,
                    transform: `translateY(${(1 - enter) * 12}px) scale(${isActive ? 1.08 : 1})`,
                    textShadow: isActive ? `0 0 18px ${props.accentColor}` : "none",
                  }}
                >
                  {word}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <SceneSfx name="check" frame={100} volume={0.18} />
    </AbsoluteFill>
  );
};
