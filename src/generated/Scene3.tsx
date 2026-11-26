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

const CALLOUTS = [
  { icon: "mdi:robot", label: "Remotion + AI Agents", sub: "Prompt-to-motion workflow", base: 50 },
  { icon: "mdi:microphone", label: "Free & Offline TTS", sub: "On-device voiceover", base: 190 },
  { icon: "mdi:subtitles", label: "Auto-Synced Captions", sub: "Timed to every beat", base: 320 },
];

const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  x: (i * 67 + 12) % 100,
  y: (i * 43 + 8) % 100,
  size: 2 + (i % 4),
  speed: 0.2 + (i % 4) * 0.08,
}));

export const Scene3 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const exit = interpolate(
    frame,
    [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const head = spring({ frame: frame - 2, fps, config: { damping: 14, stiffness: 130, mass: 0.7 } });
  const card = spring({ frame: frame - 6, fps, config: { damping: 15, stiffness: 110, mass: 0.85 } });
  const kb = interpolate(frame, [0, props.durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const camY = interpolate(frame, [0, props.durationInFrames], [10, -10]);
  const shotW = Math.min(width * 0.86, height * 0.56);
  const shotH = (shotW - 20 * u) * (950 / 1920);
  const highlight = 0.35 + Math.sin(frame / 13) * 0.25;
  const ring = 1 + Math.sin(frame / 15) * 0.08;

  return (
    <AbsoluteFill style={{ backgroundColor: props.bgColor, overflow: "hidden", direction: "ltr" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 8%, ${props.accentColor}22 0%, transparent 44%), radial-gradient(circle at 50% 88%, ${props.secondaryColor}66 0%, transparent 48%)`,
        }}
      />
      <AbsoluteFill
        style={{
          inset: "-10% 0",
          backgroundImage: `linear-gradient(${props.accentColor}10 1px, transparent 1px), linear-gradient(90deg, ${props.accentColor}10 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          transform: `translateY(${interpolate(frame, [0, props.durationInFrames], [0, 48])}px)`,
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
            opacity: 0.3,
            transform: `translate(${Math.sin(frame / 26 + i) * 14}px, ${-frame * p.speed}px)`,
          }}
        />
      ))}

      <div style={{ position: "absolute", inset: 0, opacity: exit, transform: `translateY(${(1 - exit) * -16}px)` }}>
        <div style={{ position: "absolute", top: "5.5%", left: "6%", right: "6%", opacity: head, transform: `translateY(${(1 - head) * 26}px)` }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9 * u,
              padding: `${7 * u}px ${14 * u}px`,
              borderRadius: 999,
              background: props.surfaceColor,
              border: `1px solid ${props.accentColor}55`,
              fontFamily: FONT,
              fontSize: 17 * u,
              fontWeight: 800,
              letterSpacing: 2.5,
              color: props.accentColor,
              marginBottom: 8 * u,
            }}
          >
            <SmartIcon query="mdi:play-circle" size={19 * u} color={props.accentColor} />
            LIVE PRODUCT SHOWCASE
          </div>
          <div style={{ fontFamily: FONT, fontSize: 58 * u, fontWeight: 900, lineHeight: 1.12, letterSpacing: -1.5, color: props.textColor }}>
            No heavy timeline-
          </div>
          <div style={{ fontFamily: FONT, fontSize: 62 * u, fontWeight: 900, lineHeight: 1.12, letterSpacing: -1.5, color: props.accentColor }}>
            just type.
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: "24%",
            left: "50%",
            width: shotW,
            transform: `translateX(-50%) translateY(${(1 - card) * 40 + camY}px) scale(${0.96 + card * 0.04})`,
            opacity: card,
          }}
        >
          <div
            style={{
              padding: 10 * u,
              borderRadius: 26 * u,
              background: props.surfaceColor,
              border: `1.5px solid ${props.accentColor}66`,
              boxShadow: `0 26px 70px rgba(0,0,0,0.55), 0 0 60px ${props.accentColor}22`,
              transform: `perspective(1500px) rotateX(4deg) rotateY(${-2 + kb * 3}deg)`,
            }}
          >
            <div style={{ borderRadius: 18 * u, overflow: "hidden", border: `1px solid ${props.textColor}18`, background: props.bgColor }}>
              <div
                style={{
                  height: 42 * u,
                  display: "flex",
                  alignItems: "center",
                  gap: 8 * u,
                  padding: `0 ${14 * u}px`,
                  background: props.surfaceAltColor,
                  borderBottom: `1px solid ${props.textColor}14`,
                }}
              >
                {[props.accentColor, props.mutedColor, `${props.textColor}66`].map((color, i) => (
                  <div key={i} style={{ width: 11 * u, height: 11 * u, borderRadius: "50%", background: color }} />
                ))}
                <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: `0 ${10 * u}px` }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7 * u,
                      padding: `${4 * u}px ${12 * u}px`,
                      borderRadius: 999,
                      background: `${props.textColor}0D`,
                      border: `1px solid ${props.textColor}18`,
                    }}
                  >
                    <SmartIcon query="mdi:lock" size={14 * u} color={props.accentColor} />
                    <span style={{ fontFamily: FONT, fontSize: 14 * u, fontWeight: 600, color: props.mutedColor, letterSpacing: 0.4 }}>
                      studio.zoedit.com
                    </span>
                  </div>
                </div>
                <SmartIcon query="mdi:dots-vertical" size={16 * u} color={props.mutedColor} />
              </div>

              <div style={{ position: "relative", height: shotH, overflow: "hidden" }}>
                <Img
                  src={staticFile("user-assets/126d67c4-2c2d-44a1-ab7e-0ea378785850.png")}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    transform: `scale(${1.03 + kb * 0.08}) translate(${-kb * 10}px, ${-kb * 8}px)`,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: "62%",
                    top: "34%",
                    width: 100 * u,
                    height: 100 * u,
                    border: `2px solid ${props.accentColor}`,
                    borderRadius: "50%",
                    opacity: highlight,
                    transform: `translate(-50%, -50%) scale(${ring})`,
                    boxShadow: `0 0 26px ${props.accentColor}66`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: "54%",
            left: "5.5%",
            right: "5.5%",
            display: "flex",
            flexDirection: "column",
            gap: 12 * u,
          }}
        >
          {CALLOUTS.map((c, i) => {
            const s = spring({ frame: frame - (c.base + i * 12), fps, config: { damping: 14, stiffness: 130, mass: 0.7 } });
            const dir = i % 2 === 0 ? -1 : 1;
            return (
              <div
                key={c.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16 * u,
                  padding: `${14 * u}px ${20 * u}px`,
                  borderRadius: 20 * u,
                  background: props.surfaceColor,
                  border: `1px solid ${props.accentColor}55`,
                  boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
                  opacity: s,
                  transform: `translateX(${(1 - s) * dir * 50}px)`,
                }}
              >
                <div
                  style={{
                    width: 54 * u,
                    height: 54 * u,
                    borderRadius: 14 * u,
                    background: props.surfaceAltColor,
                    border: `1px solid ${props.accentColor}44`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <SmartIcon query={c.icon} size={30 * u} color={props.accentColor} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: FONT, fontSize: 27 * u, fontWeight: 800, color: props.textColor, lineHeight: 1.25 }}>
                    {c.label}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 17 * u, color: props.mutedColor, lineHeight: 1.35 }}>{c.sub}</div>
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    width: 10 * u,
                    height: 10 * u,
                    borderRadius: "50%",
                    background: props.accentColor,
                    opacity: 0.55 + Math.sin(frame / 10 + i) * 0.35,
                    boxShadow: `0 0 12px ${props.accentColor}`,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <SceneSfx name="pop-soft" frame={6} volume={0.18} />
      <SceneSfx name="slide" frame={14} volume={0.18} />
      <SceneSfx name="type-tick" frame={24} volume={0.18} />
      <SceneSfx name="pop-soft" frame={50} volume={0.18} />
      <SceneSfx name="toggle-soft" frame={196} volume={0.18} />
      <SceneSfx name="click-subtle" frame={326} volume={0.18} />
      <SceneSfx name="whoosh-deep" frame={410} volume={0.18} />
    </AbsoluteFill>
  );
};
