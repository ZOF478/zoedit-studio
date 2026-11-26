import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SceneSfx } from "../components/SceneSfx";
import { SmartIcon } from "../components/SmartIcon";

type Props = {
  accentColor: string;
  secondaryColor: string;
  surfaceColor: string;
  surfaceAltColor: string;
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

const FONT = "'Cairo', 'Noto Sans', 'Noto Sans Arabic', system-ui, sans-serif";

const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  x: (i * 61 + 9) % 100,
  y: (i * 37 + 14) % 100,
  size: 2 + (i % 3),
  speed: 0.3 + (i % 5) * 0.1,
}));

export const Scene1 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const exit = interpolate(
    frame,
    [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const lines = [
    { text: "This entire video", size: 88 * u, accent: false },
    { text: "was made with", size: 76 * u, accent: false },
    { text: "ONE prompt.", size: 132 * u, accent: true },
  ];

  const logoIn = spring({ frame: frame - 38, fps, config: { damping: 11, stiffness: 110, mass: 0.8 } });
  const pulse = 1 + Math.sin(frame / 11) * 0.022;
  const glow = 0.42 + Math.sin(frame / 9) * 0.14;
  const gridY = interpolate(frame, [0, props.durationInFrames], [0, 44]);

  return (
    <AbsoluteFill style={{ backgroundColor: props.bgColor, overflow: "hidden", direction: "ltr" }}>
      <AbsoluteFill
        style={{
          inset: "-10% 0",
          backgroundImage: `linear-gradient(${props.accentColor}14 1px, transparent 1px), linear-gradient(90deg, ${props.accentColor}14 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
          transform: `translateY(${gridY}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 780,
          height: 780,
          left: "50%",
          top: "34%",
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, ${props.accentColor}2e 0%, transparent 66%)`,
        }}
      />
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: props.accentColor,
            opacity: 0.35,
            transform: `translateY(${Math.sin(frame / 20 + i) * 16 - frame * p.speed}px)`,
          }}
        />
      ))}

      <div style={{ position: "absolute", inset: 0, opacity: exit, transform: `translateY(${(1 - exit) * -18}px)` }}>
        <div style={{ position: "absolute", top: "6.5%", left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 22px",
              borderRadius: 999,
              background: props.surfaceColor,
              border: `1px solid ${props.accentColor}66`,
              boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
              fontFamily: FONT,
              color: props.textColor,
              fontSize: 24 * u,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            <SmartIcon query="sparkles" size={26 * u} color={props.accentColor} />
            MADE IN ZOEDIT STUDIO
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: "18%",
            left: "7%",
            right: "7%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 2 * u,
          }}
        >
          {lines.map((line, i) => {
            const s = spring({ frame: frame - i * 12, fps, config: { damping: 13, stiffness: 160, mass: 0.6 } });
            return (
              <div
                key={line.text}
                style={{
                  fontFamily: FONT,
                  fontSize: line.size,
                  lineHeight: 1.18,
                  fontWeight: 900,
                  letterSpacing: -2,
                  color: line.accent ? props.accentColor : props.textColor,
                  opacity: s,
                  transform: `translateY(${(1 - s) * 46}px) scale(${1.08 - s * 0.08})`,
                  textShadow: line.accent ? `0 0 36px ${props.accentColor}66` : "none",
                  direction: "ltr",
                  textAlign: "left",
                  maxWidth: "100%",
                }}
              >
                {line.text}
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: "absolute",
            top: "49%",
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10 * u,
          }}
        >
          <div style={{ position: "relative", width: 300 * u, height: 300 * u, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div
              style={{
                position: "absolute",
                inset: -70 * u,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${props.accentColor}55 0%, transparent 66%)`,
                opacity: glow,
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 16 * u,
                borderRadius: "50%",
                border: `2px solid ${props.accentColor}55`,
                transform: `scale(${pulse})`,
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 48 * u,
                borderRadius: "50%",
                border: `1px solid ${props.textColor}22`,
                transform: `scale(${2 - pulse})`,
              }}
            />
            <Img
              src={staticFile("user-assets/be285670-7eeb-4008-9a96-fdbe807d3a31.png")}
              style={{
                width: "82%",
                height: "82%",
                objectFit: "contain",
                opacity: logoIn,
                transform: `scale(${logoIn * pulse}) rotate(${(1 - logoIn) * -14}deg)`,
                filter: `drop-shadow(0 0 34px ${props.accentColor}77)`,
              }}
            />
          </div>
          <div style={{ fontFamily: FONT, fontSize: 22 * u, fontWeight: 700, letterSpacing: 5, color: props.mutedColor }}>
            ZOEDIT STUDIO
          </div>
        </div>
      </div>

      <SceneSfx name="impact-soft" frame={1} volume={0.18} />
      <SceneSfx name="type-tick" frame={10} volume={0.18} />
      <SceneSfx name="impact-soft" frame={13} volume={0.18} />
      <SceneSfx name="impact-soft" frame={25} volume={0.18} />
      <SceneSfx name="pop-sharp" frame={38} volume={0.18} />
      <SceneSfx name="whoosh-soft" frame={82} volume={0.18} />
    </AbsoluteFill>
  );
};
