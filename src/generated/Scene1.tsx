import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneSfx } from "../components/SceneSfx";
import { SmartIcon } from "../components/SmartIcon";

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
const DOTS = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 47) % 100,
  top: (i * 31) % 100,
  size: 2 + (i % 4),
}));

const PILLS = [
  { icon: "clock", label: "Hours of keyframes", value: "OLD WAY" },
  { icon: "bolt", label: "One prompt", value: "ZOF STUDIO" },
];

export const Scene1 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();
  const exit = interpolate(
    frame,
    [Math.max(0, durationInFrames - 10), Math.max(1, durationInFrames - 1)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const slam = spring({ frame: frame - 20, fps, config: { damping: 12, stiffness: 140 } });
  const wave = interpolate(frame, [90, 150], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleSize = Math.min(width * 0.085, 90);
  const priceSize = Math.min(width * 0.25, 250);

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
          background: `radial-gradient(circle at 50% 42%, ${props.accentColor}26, transparent 58%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.06,
          backgroundImage: `linear-gradient(${props.textColor} 1px, transparent 1px), linear-gradient(90deg, ${props.textColor} 1px, transparent 1px)`,
          backgroundSize: "90px 90px",
        }}
      />
      {DOTS.map((dot, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${dot.left}%`,
            top: `${dot.top}%`,
            width: dot.size,
            height: dot.size,
            borderRadius: "50%",
            backgroundColor: props.accentColor,
            opacity: 0.2 + 0.16 * Math.sin(frame / 28 + i),
            transform: `translateY(${Math.sin(frame / 40 + i) * 14}px)`,
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
              letterSpacing: 6,
              marginBottom: 18,
            }}
          >
            AI-DIRECTED MOTION STUDIO
          </div>
          <div
            style={{
              color: props.textColor,
              fontSize: titleSize,
              fontWeight: 900,
              lineHeight: 1.12,
              letterSpacing: -2,
              maxWidth: "88%",
            }}
          >
            Create pro motion graphics today
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: "32%",
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 520,
              height: 520,
              borderRadius: "50%",
              border: `2px solid ${props.accentColor}`,
              opacity: (1 - wave) * 0.5,
              transform: `scale(${0.6 + wave * 1.5})`,
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 520,
              height: 520,
              borderRadius: "50%",
              border: `1px solid ${props.accentColor}`,
              opacity: (1 - wave) * 0.35,
              transform: `scale(${0.7 + wave * 1.8})`,
            }}
          />
          <div
            style={{
              color: props.accentColor,
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 10,
              opacity: interpolate(frame, [10, 40], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            FOR JUST
          </div>
          <div
            style={{
              color: props.textColor,
              fontSize: priceSize,
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: -8,
              textShadow: `0 0 ${44 * slam}px ${props.accentColor}`,
              transform: `scale(${slam})`,
            }}
          >
            $0.01
          </div>
          <div
            style={{
              color: props.mutedColor,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 4,
            }}
          >
            PER PROFESSIONAL VIDEO
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: "57%",
            left: 0,
            right: 0,
            display: "flex",
            gap: 18,
            justifyContent: "center",
            padding: "0 24px",
          }}
        >
          {PILLS.map((pill, i) => {
            const enter = spring({
              frame: frame - i * 12,
              fps,
              config: { damping: 200, stiffness: 120 },
            });
            const active = i === 1;
            return (
              <div
                key={pill.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "16px 22px",
                  borderRadius: 999,
                  backgroundColor: SURFACE,
                  border: `1px solid ${active ? props.accentColor : props.mutedColor}66`,
                  opacity: enter,
                  transform: `translateY(${(1 - enter) * 24}px)`,
                }}
              >
                <SmartIcon
                  query={pill.icon}
                  size={26}
                  color={active ? props.accentColor : props.mutedColor}
                />
                <div>
                  <div
                    style={{
                      color: active ? props.accentColor : props.mutedColor,
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: 2,
                    }}
                  >
                    {pill.value}
                  </div>
                  <div style={{ color: props.textColor, fontSize: 17, fontWeight: 700 }}>
                    {pill.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SceneSfx name="pop" frame={100} volume={0.18} />
    </AbsoluteFill>
  );
};
