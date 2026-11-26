import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneSfx } from "../components/SceneSfx";
import { SmartIcon } from "../components/SmartIcon";
import type { GeneratedSceneProps } from "./index";

type Props = GeneratedSceneProps;

const FONT = "'Cairo', 'Noto Sans', 'Noto Sans Arabic', system-ui, sans-serif";
const L_PLAN = "M 60 40 L 460 40 L 460 280 L 280 280 L 280 480 L 60 480 Z";

const BEATS = [
  { icon: "wall", label: "Murs porteurs", sub: "structure libérée" },
  { icon: "layout", label: "Plan libre", sub: "espaces fluides" },
  { icon: "tree", label: "Jardin suspendu", sub: "patio planté" },
];

export const Scene4 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const exit = interpolate(
    frame,
    [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const head = spring({ frame: frame - 2, fps, config: { damping: 200 } });
  const planIn = spring({ frame: frame - 10, fps, config: { damping: 200, mass: 0.9 } });
  const planP = interpolate(frame, [18, 118], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const wallFade = interpolate(frame, [86, 150], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const gardenP = spring({ frame: frame - 104, fps, config: { damping: 14, mass: 0.7 } });
  const breathe = 1 + Math.sin(frame / 44) * 0.012;
  const glow = 0.35 + Math.sin(frame / 18) * 0.18;

  return (
    <AbsoluteFill style={{ backgroundColor: props.bgColor, overflow: "hidden", direction: "ltr" }}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="s4glow" cx="62%" cy="48%" r="42%">
            <stop offset="0%" stopColor={props.accentColor} stopOpacity={0.18} />
            <stop offset="100%" stopColor={props.accentColor} stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect x={0} y={0} width={1920} height={1080} fill="url(#s4glow)" />
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={i} x1={0} y1={200 + i * 70} x2={1920} y2={200 + i * 70} stroke={props.secondaryColor} strokeWidth={1} opacity={0.05} />
        ))}
      </svg>

      <div
        style={{
          position: "absolute",
          right: "1%",
          top: "20%",
          fontFamily: FONT,
          fontSize: Math.min(470, width * 0.24),
          fontWeight: 800,
          lineHeight: 1,
          color: props.accentColor,
          opacity: 0.05,
          transform: `translateY(${Math.sin(frame / 50) * 8}px)`,
        }}
      >
        L
      </div>

      <div style={{ position: "absolute", left: "5%", top: "8%", width: "56%", fontFamily: FONT }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            opacity: head,
            transform: `translateY(${(1 - head) * 16}px)`,
            color: props.accentColor,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          <div style={{ width: 30, height: 2, backgroundColor: props.accentColor }} />
          Premier étage · Piano nobile
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 54,
            fontWeight: 800,
            lineHeight: 1.12,
            color: props.textColor,
            opacity: head,
            transform: `translateY(${(1 - head) * 24}px)`,
          }}
        >
          Le plan libre en L
        </div>
        <div style={{ marginTop: 8, fontSize: 24, color: props.mutedColor, opacity: head }}>
          Dégagé des murs porteurs, organisé autour du jardin suspendu.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: "5%",
          top: "29%",
          width: "27%",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          fontFamily: FONT,
          opacity: exit,
        }}
      >
        {BEATS.map((b, i) => {
          const s = spring({ frame: frame - (24 + i * 12), fps, config: { damping: 16, mass: 0.7 } });
          return (
            <div
              key={b.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: 18,
                borderRadius: 18,
                backgroundColor: props.surfaceColor,
                border: `1px solid ${props.secondaryColor}66`,
                boxShadow: "0 18px 48px rgba(0,0,0,0.32)",
                transform: `translateX(${(1 - s) * -36}px)`,
                opacity: s,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  backgroundColor: props.surfaceAltColor,
                  border: `1px solid ${props.accentColor}55`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <SmartIcon query={b.icon} size={28} color={props.accentColor} />
              </div>
              <div>
                <div style={{ fontSize: 21, fontWeight: 800, color: props.textColor }}>{b.label}</div>
                <div style={{ fontSize: 14, color: props.mutedColor, marginTop: 3, letterSpacing: 1 }}>
                  {b.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: "38%",
          top: "25%",
          width: "34%",
          maxWidth: 500,
          aspectRatio: "1 / 1",
          opacity: exit * planIn,
          transform: `translateY(${(1 - planIn) * 30}px) scale(${breathe})`,
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 520 520" style={{ direction: "ltr" }}>
          <path d={L_PLAN} fill={props.surfaceColor} fillOpacity={0.95 * planP} />
          <path
            d={L_PLAN}
            fill="none"
            stroke={props.accentColor}
            strokeWidth={3}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - planP}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <g opacity={wallFade}>
            {["M 200 48 L 200 272", "M 68 200 L 272 200", "M 360 288 L 452 288", "M 160 288 L 160 472"].map((d) => (
              <path key={d} d={d} fill="none" stroke={props.secondaryColor} strokeWidth={12} strokeLinecap="round" opacity={0.75} />
            ))}
          </g>
          <g transform={`translate(380 380) scale(${0.6 + gardenP * 0.4}) translate(-380 -380)`} opacity={gardenP}>
            <rect x={296} y={296} width={168} height={168} rx={14} fill={props.surfaceAltColor} stroke={props.accentColor} strokeWidth={2.5} />
            <rect x={316} y={316} width={128} height={128} rx={8} fill="none" stroke={props.accentColor} strokeWidth={1} opacity={0.4} />
          </g>
          {[
            [80, 60],
            [440, 60],
            [80, 460],
            [260, 460],
            [440, 280],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={7} fill={props.accentColor} opacity={0.8} />
          ))}
          <path d="M 120 440 L 220 440" fill="none" stroke={props.accentColor} strokeWidth={2} opacity={0.5} />
        </svg>

        <div
          style={{
            position: "absolute",
            left: "73%",
            top: "73%",
            width: 62,
            height: 62,
            marginLeft: -31,
            marginTop: -31,
            borderRadius: 16,
            backgroundColor: props.surfaceAltColor,
            border: `1px solid ${props.accentColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: gardenP,
            transform: `scale(${0.7 + gardenP * 0.3})`,
            boxShadow: `0 0 30px ${props.accentColor}55`,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: -10,
              borderRadius: 20,
              border: `1px solid ${props.accentColor}`,
              opacity: glow,
            }}
          />
          <SmartIcon query="tree" size={34} color={props.accentColor} />
        </div>

        <div
          style={{
            position: "absolute",
            left: "73%",
            top: "89%",
            transform: "translateX(-50%)",
            fontFamily: FONT,
            fontSize: 12,
            letterSpacing: 1.5,
            fontWeight: 700,
            color: props.mutedColor,
            whiteSpace: "nowrap",
          }}
        >
          JARDIN SUSPENDU
        </div>
        <div
          style={{
            position: "absolute",
            left: "16%",
            top: "30%",
            fontFamily: FONT,
            fontSize: 12,
            letterSpacing: 2,
            fontWeight: 700,
            color: props.mutedColor,
          }}
        >
          SÉJOUR
        </div>
        <div
          style={{
            position: "absolute",
            left: "20%",
            top: "82%",
            fontFamily: FONT,
            fontSize: 12,
            letterSpacing: 2,
            fontWeight: 700,
            color: props.mutedColor,
          }}
        >
          CHAMBRES
        </div>
      </div>

      <SceneSfx name="whoosh-soft" frame={6} volume={0.18} />
      <SceneSfx name="pop-soft" frame={26} volume={0.18} />
      <SceneSfx name="type-tick" frame={90} volume={0.18} />
      <SceneSfx name="pop-bubble" frame={108} volume={0.18} />
    </AbsoluteFill>
  );
};
