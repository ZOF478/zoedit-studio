import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
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
const ROWS = [0, 1, 2];
const CODE = [0, 1, 2, 3];
const CODE_WIDTHS = [72, 90, 58, 66];

export const Scene2 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const exit = interpolate(
    frame,
    [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const h1 = spring({ frame: frame - 2, fps, config: { damping: 14, stiffness: 130, mass: 0.7 } });
  const h2 = spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 130, mass: 0.7 } });
  const left = spring({ frame: frame - 8, fps, config: { damping: 15, stiffness: 120, mass: 0.8 } });
  const right = spring({ frame: frame - 20, fps, config: { damping: 15, stiffness: 120, mass: 0.8 } });
  const vs = spring({ frame: frame - 28, fps, config: { damping: 11, stiffness: 170, mass: 0.6 } });
  const slow = interpolate(frame, [24, props.durationInFrames - 10], [10, 34], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const spin = frame * 7;

  return (
    <AbsoluteFill style={{ backgroundColor: props.bgColor, overflow: "hidden", direction: "ltr" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 16% 44%, ${props.mutedColor}20 0%, transparent 42%), radial-gradient(circle at 84% 56%, ${props.accentColor}24 0%, transparent 44%)`,
        }}
      />
      <AbsoluteFill
        style={{
          inset: "-10% 0",
          backgroundImage: `linear-gradient(${props.accentColor}0f 1px, transparent 1px), linear-gradient(90deg, ${props.accentColor}0f 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          transform: `translateY(${interpolate(frame, [0, props.durationInFrames], [0, 30])}px)`,
        }}
      />

      <div style={{ position: "absolute", inset: 0, opacity: exit, transform: `translateY(${(1 - exit) * 16}px)` }}>
        <div style={{ position: "absolute", top: "5.5%", left: "6%", right: "6%" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9 * u,
              fontFamily: FONT,
              fontSize: 19 * u,
              fontWeight: 800,
              letterSpacing: 3,
              color: props.accentColor,
              marginBottom: 10 * u,
            }}
          >
            <SmartIcon query="mdi:lightning-bolt-outline" size={21 * u} color={props.accentColor} />
            THE PROMPT ADVANTAGE
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 60 * u,
              fontWeight: 900,
              lineHeight: 1.12,
              letterSpacing: -1.5,
              color: props.textColor,
              opacity: h1,
              transform: `translateY(${(1 - h1) * 24}px)`,
            }}
          >
            One prompt inside
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 66 * u,
              fontWeight: 900,
              lineHeight: 1.12,
              letterSpacing: -1.5,
              color: props.accentColor,
              opacity: h2,
              transform: `translateY(${(1 - h2) * 24}px)`,
            }}
          >
            ZoEdit Studio.
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: "24%",
            bottom: "30%",
            left: "5%",
            right: "5%",
            display: "flex",
            gap: 16 * u,
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: 26 * u,
              background: props.surfaceColor,
              border: `1.5px solid ${props.mutedColor}44`,
              boxShadow: "0 18px 48px rgba(0,0,0,0.35)",
              padding: 22 * u,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              opacity: left,
              transform: `translateX(${(1 - left) * -60}px) rotate(-1.5deg)`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 * u }}>
              <div
                style={{
                  width: 56 * u,
                  height: 56 * u,
                  borderRadius: 16 * u,
                  background: props.surfaceAltColor,
                  border: `1px solid ${props.mutedColor}55`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <SmartIcon query="mdi:timer-sand" size={30 * u} color={props.mutedColor} />
              </div>
              <div style={{ fontFamily: FONT, fontSize: 20 * u, fontWeight: 800, letterSpacing: 1.5, color: props.mutedColor }}>
                HEAVY EDITORS
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 * u, margin: `${18 * u}px 0` }}>
              {ROWS.map((i) => (
                <div key={i} style={{ height: 12 * u, borderRadius: 999, background: `${props.textColor}12`, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${slow - i * 3}%`, borderRadius: 999, background: props.mutedColor, opacity: 0.7 }} />
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 10 * u, marginTop: 8 * u }}>
                <div
                  style={{
                    width: 28 * u,
                    height: 28 * u,
                    borderRadius: "50%",
                    border: `3px solid ${props.textColor}22`,
                    borderTopColor: props.mutedColor,
                    transform: `rotate(${spin}deg)`,
                  }}
                />
                <div style={{ fontFamily: FONT, fontSize: 17 * u, color: props.mutedColor, letterSpacing: 1 }}>RENDERING...</div>
              </div>
            </div>

            <div style={{ fontFamily: FONT, fontSize: 42 * u, fontWeight: 900, lineHeight: 1.2, color: props.textColor }}>
              slow you down.
            </div>
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: 26 * u,
              background: props.surfaceColor,
              border: `1.5px solid ${props.accentColor}66`,
              boxShadow: `0 18px 48px rgba(0,0,0,0.35), 0 0 44px ${props.accentColor}18`,
              padding: 22 * u,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              opacity: right,
              transform: `translateX(${(1 - right) * 60}px) rotate(1.5deg)`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 * u }}>
              <div
                style={{
                  width: 56 * u,
                  height: 56 * u,
                  borderRadius: 16 * u,
                  background: props.surfaceAltColor,
                  border: `1px solid ${props.accentColor}66`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <SmartIcon query="mdi:lightning-bolt" size={32 * u} color={props.accentColor} />
              </div>
              <div style={{ fontFamily: FONT, fontSize: 20 * u, fontWeight: 800, letterSpacing: 1.5, color: props.accentColor }}>
                ZOEDIT PROMPT
              </div>
            </div>

            <div
              style={{
                borderRadius: 16 * u,
                background: props.surfaceAltColor,
                border: `1px solid ${props.accentColor}44`,
                padding: 14 * u,
                display: "flex",
                flexDirection: "column",
                gap: 10 * u,
                margin: `${18 * u}px 0`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 * u }}>
                <SmartIcon query="mdi:robot" size={18 * u} color={props.accentColor} />
                <div style={{ fontFamily: FONT, fontSize: 15 * u, fontWeight: 700, letterSpacing: 1, color: props.accentColor }}>
                  AI AGENTS
                </div>
              </div>
              {CODE.map((i) => {
                const s = spring({ frame: frame - (36 + i * 12), fps, config: { damping: 15, stiffness: 180, mass: 0.5 } });
                return (
                  <div
                    key={i}
                    style={{
                      width: `${CODE_WIDTHS[i]}%`,
                      height: 9 * u,
                      borderRadius: 999,
                      background: props.accentColor,
                      opacity: s * 0.85,
                      transform: `translateX(${(1 - s) * -14}px)`,
                    }}
                  />
                );
              })}
              <div style={{ width: 3 * u, height: 16 * u, background: props.accentColor, opacity: Math.sin(frame / 4) > 0 ? 1 : 0.15 }} />
            </div>

            <div style={{ fontFamily: FONT, fontSize: 44 * u, fontWeight: 900, lineHeight: 1.2, color: props.accentColor }}>
              Prompts don't.
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "47%",
            width: 86 * u,
            height: 86 * u,
            borderRadius: "50%",
            background: props.surfaceAltColor,
            border: `2px solid ${props.accentColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT,
            fontSize: 27 * u,
            fontWeight: 900,
            color: props.textColor,
            boxShadow: `0 0 30px ${props.accentColor}55`,
            opacity: vs,
            transform: `translate(-50%, -50%) scale(${0.7 + vs * 0.3})`,
          }}
        >
          VS
        </div>
      </div>

      <SceneSfx name="slide" frame={8} volume={0.18} />
      <SceneSfx name="alert-warning" frame={22} volume={0.18} />
      <SceneSfx name="type-tick" frame={34} volume={0.18} />
      <SceneSfx name="typing-click" frame={46} volume={0.18} />
      <SceneSfx name="whoosh-whip" frame={58} volume={0.18} />
      <SceneSfx name="pop-soft" frame={70} volume={0.18} />
      <SceneSfx name="click-subtle" frame={92} volume={0.18} />
    </AbsoluteFill>
  );
};
