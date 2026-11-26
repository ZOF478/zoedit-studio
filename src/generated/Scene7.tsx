import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneSfx } from "../components/SceneSfx";
import { SmartIcon } from "../components/SmartIcon";
import type { GeneratedSceneProps } from "./index";

type Props = GeneratedSceneProps;

const FONT = "'Cairo', 'Noto Sans', 'Noto Sans Arabic', system-ui, sans-serif";

const NODES = [
  { x: 260, label: "Pilotis", sub: "La maison sur colonnes", icon: "column" },
  { x: 600, label: "Toit-jardin", sub: "La nature sur le toit", icon: "green roof" },
  { x: 940, label: "Plan libre", sub: "Des espaces fluides", icon: "floor plan" },
  { x: 1280, label: "Fenêtre-bandeau", sub: "La lumière continue", icon: "window" },
  { x: 1620, label: "Façade libre", sub: "Une peau indépendante", icon: "wall" },
];

const nodeY = (x: number) => 540 + Math.sin(((x - 150) / 1600) * Math.PI * 2) * 26;
const TIMELINE = Array.from({ length: 81 }, (_, i) => {
  const x = 150 + i * 20;
  return `${i === 0 ? "M" : "L"} ${x} ${nodeY(x).toFixed(1)}`;
}).join(" ");

export const Scene7 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const exit = interpolate(
    frame,
    [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const head = spring({ frame: frame - 2, fps, config: { damping: 200 } });
  const pathP = interpolate(frame, [10, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const activeIdx = frame > 100 ? Math.floor((frame - 100) / 75) % 5 : -1;
  const dotP = ((frame % 130) / 130) * 1600 + 150;
  const pill = spring({ frame: frame - 120, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill style={{ backgroundColor: props.bgColor, overflow: "hidden", direction: "ltr" }}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="s7glow" cx="50%" cy="52%" r="52%">
            <stop offset="0%" stopColor={props.accentColor} stopOpacity={0.14} />
            <stop offset="100%" stopColor={props.accentColor} stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect x={0} y={0} width={1920} height={1080} fill="url(#s7glow)" />
        {Array.from({ length: 16 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 120} y1={0} x2={i * 120 - 80} y2={1080} stroke={props.secondaryColor} strokeWidth={1} opacity={0.05} />
        ))}
        <line x1={0} y1={580} x2={1920} y2={580} stroke={props.secondaryColor} strokeWidth={1} opacity={0.12} />
      </svg>

      <div style={{ position: "absolute", left: "5%", top: "8%", width: "64%", fontFamily: FONT }}>
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
          Synthèse · 1928 — 1931
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 48,
            fontWeight: 800,
            lineHeight: 1.14,
            color: props.textColor,
            opacity: head,
            transform: `translateY(${(1 - head) * 24}px)`,
          }}
        >
          Les cinq points de l’architecture moderne
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: "5%",
          top: "9%",
          padding: "10px 18px",
          borderRadius: 999,
          backgroundColor: props.surfaceColor,
          border: `1px solid ${props.secondaryColor}66`,
          boxShadow: "0 12px 32px rgba(0,0,0,0.3)",
          fontFamily: FONT,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: 2,
          color: props.textColor,
          opacity: exit * head,
        }}
      >
        5 POINTS · 5 NIVEAUX DE LECTURE
      </div>

      <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0, direction: "ltr", opacity: exit }}>
        <path
          d={TIMELINE}
          fill="none"
          stroke={props.secondaryColor}
          strokeWidth={3}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - pathP}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.8}
        />
        <circle cx={dotP} cy={nodeY(dotP)} r={16} fill={props.accentColor} opacity={0.16 + Math.sin(frame / 6) * 0.08} />
        <circle cx={dotP} cy={nodeY(dotP)} r={6} fill={props.accentColor} />

        {NODES.map((n, i) => {
          const ny = nodeY(n.x);
          const ns = spring({ frame: frame - (30 + i * 12), fps, config: { damping: 14, mass: 0.6 } });
          const cs = spring({ frame: frame - (46 + i * 12), fps, config: { damping: 16, mass: 0.7 } });
          const isActive = activeIdx === i;
          return (
            <g key={n.label}>
              <line x1={n.x} y1={480} x2={n.x} y2={ny - 26} stroke={props.secondaryColor} strokeWidth={1.5} opacity={cs * 0.6} />
              <g opacity={ns} transform={`translate(${n.x} ${ny}) scale(${ns})`}>
                <circle r={27} fill={props.surfaceColor} stroke={isActive ? props.accentColor : props.secondaryColor} strokeWidth={isActive ? 3 : 2} />
                <text x={0} y={6} textAnchor="middle" fill={isActive ? props.accentColor : props.textColor} fontFamily={FONT} fontSize={15} fontWeight={800}>
                  0{i + 1}
                </text>
                <circle r={36 + Math.sin(frame / 10 + i) * 4} fill="none" stroke={props.accentColor} strokeWidth={1.4} opacity={isActive ? 0.6 : 0.18} />
              </g>

              <g opacity={cs} transform={`translate(0 ${(1 - cs) * 22})`}>
                <rect
                  x={n.x - 145}
                  y={330}
                  width={290}
                  height={150}
                  rx={18}
                  fill={props.surfaceColor}
                  stroke={isActive ? props.accentColor : `${props.secondaryColor}66`}
                  strokeWidth={isActive ? 2 : 1}
                  style={{ filter: isActive ? "drop-shadow(0 0 18px rgba(0,0,0,0.0))" : undefined }}
                />
                <rect x={n.x - 145} y={330} width={290} height={4} rx={2} fill={props.accentColor} opacity={isActive ? 1 : 0.35} />
                <foreignObject x={n.x - 127} y={350} width={254} height={112}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, fontFamily: FONT, direction: "ltr", textAlign: "left" }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: props.surfaceAltColor,
                        border: `1px solid ${props.accentColor}55`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <SmartIcon query={n.icon} size={24} color={props.accentColor} />
                    </div>
                    <div>
                      <div style={{ fontSize: 19, fontWeight: 800, color: props.textColor, lineHeight: 1.2 }}>{n.label}</div>
                      <div style={{ fontSize: 13, color: props.mutedColor, marginTop: 6, lineHeight: 1.4 }}>{n.sub}</div>
                    </div>
                  </div>
                </foreignObject>
              </g>
            </g>
          );
        })}
      </svg>

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "61%",
          transform: `translate(-50%, 0) scale(${0.9 + pill * 0.1})`,
          padding: "11px 22px",
          borderRadius: 999,
          backgroundColor: props.surfaceColor,
          border: `1px solid ${props.secondaryColor}66`,
          boxShadow: "0 18px 48px rgba(0,0,0,0.32)",
          fontFamily: FONT,
          fontSize: 18,
          fontWeight: 700,
          color: props.textColor,
          letterSpacing: 0.5,
          opacity: exit * pill,
          whiteSpace: "nowrap",
        }}
      >
        Cinq points, un manifeste
      </div>

      <SceneSfx name="whoosh-soft" frame={5} volume={0.18} />
      <SceneSfx name="type-tick" frame={14} volume={0.18} />
      {[0, 1, 2, 3, 4].map((i) => (
        <SceneSfx key={i} name="pop-soft" frame={32 + i * 12} volume={0.18} />
      ))}
      <SceneSfx name="click-subtle" frame={102} volume={0.18} />
    </AbsoluteFill>
  );
};
