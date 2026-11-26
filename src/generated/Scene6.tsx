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

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 53 + 7) % 100,
  y: (i * 41 + 11) % 100,
  size: 2 + (i % 3),
  speed: 0.25 + (i % 4) * 0.1,
}));

export const Scene6 = (props: Props) => {
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
  const logoIn = spring({ frame: frame - 8, fps, config: { damping: 11, stiffness: 110, mass: 0.8 } });
  const badge = spring({ frame: frame - 170, fps, config: { damping: 13, stiffness: 150, mass: 0.7 } });
  const pulse = 1 + Math.sin(frame / 12) * 0.025;
  const halo = 0.4 + Math.sin(frame / 10) * 0.15;
  const gridY = interpolate(frame, [0, props.durationInFrames], [0, 60]);

  const chips = [
    { icon: "github", brand: true, label: "github.com/ZOF478/zoedit-studio" },
    { icon: "mdi:web", brand: false, label: "studio.zoedit.com" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: props.bgColor, overflow: "hidden", direction: "ltr" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 34%, ${props.accentColor}26 0%, transparent 46%), radial-gradient(circle at 50% 82%, ${props.secondaryColor}99 0%, transparent 52%)`,
        }}
      />
      <AbsoluteFill
        style={{
          inset: "-10% 0",
          backgroundImage: `linear-gradient(${props.accentColor}0f 1px, transparent 1px), linear-gradient(90deg, ${props.accentColor}0f 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          transform: `translateY(${gridY}px)`,
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
            transform: `translate(${Math.sin(frame / 24 + i) * 12}px, ${-frame * p.speed}px)`,
          }}
        />
      ))}

      <div style={{ position: "absolute", inset: 0, opacity: exit, transform: `translateY(${(1 - exit) * -18}px)` }}>
        <div
          style={{
            position: "absolute",
            top: "6%",
            left: "6%",
            right: "6%",
            textAlign: "center",
            opacity: head,
            transform: `translateY(${(1 - head) * 24}px)`,
            direction: "ltr",
          }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontSize: 70 * u,
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: -1.5,
              color: props.textColor,
              maxWidth: "100%",
            }}
          >
            Build motion graphics
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 72 * u,
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: -1.5,
              color: props.accentColor,
              maxWidth: "100%",
            }}
          >
            at prompt speed
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: "20%",
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6 * u,
          }}
        >
          <div style={{ position: "relative", width: 300 * u, height: 300 * u, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {[0, 1, 2].map((i) => {
              const t = ((frame + i * 40) % 120) / 120;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    width: 300 * u,
                    height: 300 * u,
                    borderRadius: "50%",
                    border: `2px solid ${props.accentColor}`,
                    opacity: (1 - t) * 0.3,
                    transform: `scale(${1 + t * 0.85})`,
                  }}
                />
              );
            })}
            <div
              style={{
                position: "absolute",
                inset: -40 * u,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${props.accentColor}55 0%, transparent 66%)`,
                opacity: halo,
              }}
            />
            <Img
              src={staticFile("user-assets/be285670-7eeb-4008-9a96-fdbe807d3a31.png")}
              style={{
                width: "78%",
                height: "78%",
                objectFit: "contain",
                opacity: logoIn,
                transform: `scale(${logoIn * pulse}) rotate(${(1 - logoIn) * -12}deg)`,
                filter: `drop-shadow(0 0 30px ${props.accentColor}77)`,
              }}
            />
          </div>
          <div style={{ fontFamily: FONT, fontSize: 20 * u, fontWeight: 700, letterSpacing: 6, color: props.mutedColor }}>
            ZOEDIT STUDIO
          </div>
        </div>

        <div style={{ position: "absolute", top: "50%", left: "6%", right: "6%", display: "flex", flexDirection: "column", gap: 14 * u }}>
          {chips.map((c, i) => {
            const s = spring({ frame: frame - (36 + i * 12), fps, config: { damping: 14, stiffness: 130, mass: 0.7 } });
            return (
              <div
                key={c.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16 * u,
                  padding: `${16 * u}px ${20 * u}px`,
                  borderRadius: 20 * u,
                  background: props.surfaceColor,
                  border: `1px solid ${props.accentColor}55`,
                  boxShadow: "0 18px 48px rgba(0,0,0,0.35)",
                  opacity: s,
                  transform: `translateY(${(1 - s) * 26}px)`,
                }}
              >
                <div
                  style={{
                    width: 50 * u,
                    height: 50 * u,
                    borderRadius: 14 * u,
                    background: props.surfaceAltColor,
                    border: `1px solid ${props.accentColor}44`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <SmartIcon query={c.icon} brand={c.brand} size={28 * u} color={props.textColor} />
                </div>
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontFamily: FONT,
                    fontSize: 26 * u,
                    fontWeight: 700,
                    color: props.textColor,
                    letterSpacing: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.label}
                </div>
                <SmartIcon query="mdi:arrow-top-right" size={24 * u} color={props.accentColor} />
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: "absolute",
            top: "63%",
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            opacity: badge,
            transform: `translateY(${(1 - badge) * 20}px)`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10 * u,
              padding: `${10 * u}px ${18 * u}px`,
              borderRadius: 999,
              background: props.surfaceAltColor,
              border: `1px solid ${props.accentColor}55`,
              fontFamily: FONT,
              fontSize: 18 * u,
              fontWeight: 700,
              color: props.textColor,
              letterSpacing: 1,
            }}
          >
            <SmartIcon query="mdi:license" size={20 * u} color={props.accentColor} />
            OPEN SOURCE - MIT
          </div>
        </div>
      </div>

      <SceneSfx name="pop-soft" frame={8} volume={0.18} />
      <SceneSfx name="whoosh-soft" frame={20} volume={0.18} />
      <SceneSfx name="type-tick" frame={40} volume={0.18} />
      <SceneSfx name="click-subtle" frame={52} volume={0.18} />
      <SceneSfx name="toggle-soft" frame={170} volume={0.18} />
      <SceneSfx name="slide" frame={182} volume={0.18} />
    </AbsoluteFill>
  );
};
