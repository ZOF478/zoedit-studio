import type { CSSProperties } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Plus } from "lucide-react";
import { SceneSfx } from "../components/SceneSfx";
import { SmartIcon } from "../components/SmartIcon";
import type { GeneratedSceneProps } from "./index";

type Props = GeneratedSceneProps;

const FONT = "'Cairo', 'Noto Sans', 'Noto Sans Arabic', system-ui, sans-serif";

export const Scene2 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const exit = interpolate(
    frame,
    [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const head = spring({ frame: frame - 2, fps, config: { damping: 200 } });
  const leftIn = spring({ frame: frame - 8, fps, config: { damping: 200, mass: 0.8 } });
  const rightIn = spring({ frame: frame - 20, fps, config: { damping: 200, mass: 0.8 } });
  const arcP = interpolate(frame, [20, 115], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const measureP = spring({ frame: frame - 118, fps, config: { damping: 200 } });
  const dotT = (frame % 150) / 150;
  const theta = Math.PI + dotT * (Math.PI / 2);
  const dotX = 280 + 150 * Math.cos(theta);
  const dotY = 300 + 150 * Math.sin(theta);
  const active = Math.floor(frame / 26) % 20;

  const panel: CSSProperties = {
    position: "absolute",
    top: "27%",
    height: "44%",
    width: "42%",
    display: "flex",
    flexDirection: "column",
    padding: 26,
    borderRadius: 24,
    backgroundColor: props.surfaceColor,
    border: `1px solid ${props.secondaryColor}66`,
    boxShadow: "0 18px 48px rgba(0,0,0,0.35)",
    boxSizing: "border-box",
    fontFamily: FONT,
    direction: "ltr",
    textAlign: "left",
  };

  return (
    <AbsoluteFill style={{ backgroundColor: props.bgColor, overflow: "hidden", direction: "ltr" }}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="s2fade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={props.secondaryColor} stopOpacity={0.22} />
            <stop offset="100%" stopColor={props.secondaryColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <rect x={0} y={0} width={1920} height={1080} fill="url(#s2fade)" />
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={i}
            x1={i * 160}
            y1={0}
            x2={i * 160 - 200}
            y2={1080}
            stroke={props.secondaryColor}
            strokeWidth={1}
            opacity={0.08}
          />
        ))}
        <line x1={0} y1={780} x2={1920} y2={780} stroke={props.accentColor} strokeWidth={1} opacity={0.2} />
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
          Rez-de-chaussée
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 52,
            fontWeight: 800,
            lineHeight: 1.12,
            color: props.textColor,
            opacity: head,
            transform: `translateY(${(1 - head) * 24}px)`,
          }}
        >
          Le plan courbe libère l’espace
        </div>
      </div>

      <div
        style={{
          ...panel,
          left: "5%",
          opacity: exit * leftIn,
          transform: `translateY(${(1 - leftIn) * 42}px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: props.accentColor }}>01</span>
            <span style={{ fontSize: 24, fontWeight: 800, color: props.textColor }}>Plan courbe vitré</span>
          </div>
          <SmartIcon query="car" size={30} color={props.accentColor} />
        </div>
        <div
          style={{
            fontSize: 14,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: props.mutedColor,
            marginTop: 6,
          }}
        >
          Rayon de braquage des voitures
        </div>

        <div style={{ flex: 1, minHeight: 0, marginTop: 6 }}>
          <svg width="100%" height="100%" viewBox="0 0 460 380" style={{ direction: "ltr" }}>
            {[190, 150, 110].map((r, i) => (
              <path
                key={r}
                d={`M ${280 - r} 300 A ${r} ${r} 0 0 1 280 ${300 - r}`}
                fill="none"
                stroke={i === 1 ? props.accentColor : props.secondaryColor}
                strokeWidth={i === 1 ? 3.5 : 2}
                opacity={1 - i * 0.16}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - arcP}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            <circle cx={280} cy={300} r={4} fill={props.secondaryColor} />
            <circle cx={dotX} cy={dotY} r={11} fill={props.accentColor} opacity={0.22 + Math.sin(frame / 8) * 0.12} />
            <circle cx={dotX} cy={dotY} r={6} fill={props.accentColor} />
            <g opacity={measureP}>
              <line x1={130} y1={330} x2={280} y2={330} stroke={props.textColor} strokeWidth={1.5} />
              <line x1={130} y1={323} x2={130} y2={337} stroke={props.textColor} strokeWidth={1.5} />
              <line x1={280} y1={323} x2={280} y2={337} stroke={props.textColor} strokeWidth={1.5} />
              <text
                x={205}
                y={358}
                fill={props.mutedColor}
                fontFamily={FONT}
                fontSize={16}
                fontWeight={700}
                textAnchor="middle"
              >
                ≈ 12 m
              </text>
            </g>
            <text x={40} y={50} fill={props.mutedColor} fontFamily={FONT} fontSize={14} letterSpacing={2}>
              PLAN MASSE
            </text>
          </svg>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 14px",
            borderRadius: 999,
            backgroundColor: props.surfaceAltColor,
            border: `1px solid ${props.secondaryColor}55`,
            alignSelf: "flex-start",
          }}
        >
          <div style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: props.accentColor }} />
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.4, color: props.textColor }}>
            VERRE · COURBE · FLUIDITÉ
          </span>
        </div>
      </div>

      <div
        style={{
          ...panel,
          right: "5%",
          opacity: exit * rightIn,
          transform: `translateY(${(1 - rightIn) * 42}px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: props.accentColor }}>02</span>
            <span style={{ fontSize: 24, fontWeight: 800, color: props.textColor }}>Grille de pilotis</span>
          </div>
          <SmartIcon query="column" size={30} color={props.accentColor} />
        </div>
        <div
          style={{
            fontSize: 14,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: props.mutedColor,
            marginTop: 6,
          }}
        >
          Béton armé · trame régulière
        </div>

        <div style={{ flex: 1, minHeight: 0, marginTop: 6 }}>
          <svg width="100%" height="100%" viewBox="0 0 460 380" style={{ direction: "ltr" }}>
            <g opacity={0.16}>
              {Array.from({ length: 5 }).map((_, i) => (
                <line key={`c${i}`} x1={100 + i * 68} y1={64} x2={100 + i * 68} y2={330} stroke={props.secondaryColor} strokeWidth={1} />
              ))}
              {Array.from({ length: 4 }).map((_, i) => (
                <line key={`r${i}`} x1={70} y1={90 + i * 70} x2={372} y2={90 + i * 70} stroke={props.secondaryColor} strokeWidth={1} />
              ))}
            </g>
            {Array.from({ length: 20 }).map((_, i) => {
              const col = i % 5;
              const row = Math.floor(i / 5);
              const s = spring({ frame: frame - 26 - i * 6, fps, config: { damping: 14, mass: 0.6 } });
              return (
                <g key={i} transform={`translate(${100 + col * 68} ${90 + row * 70}) scale(${s})`}>
                  <circle
                    r={active === i ? 17 : 14}
                    fill={props.surfaceAltColor}
                    stroke={active === i ? props.accentColor : props.secondaryColor}
                    strokeWidth={2}
                  />
                  <circle r={4} fill={props.accentColor} />
                  {active === i && (
                    <circle
                      r={22 + Math.sin(frame / 6) * 3}
                      fill="none"
                      stroke={props.accentColor}
                      strokeWidth={1.4}
                      opacity={0.6}
                    />
                  )}
                </g>
              );
            })}
            <text x={40} y={50} fill={props.mutedColor} fontFamily={FONT} fontSize={14} letterSpacing={2}>
              TRAME 7,5 m
            </text>
          </svg>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 14px",
            borderRadius: 999,
            backgroundColor: props.surfaceAltColor,
            border: `1px solid ${props.secondaryColor}55`,
            alignSelf: "flex-start",
          }}
        >
          <div style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: props.accentColor }} />
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.4, color: props.textColor }}>
            PORTEURS · RÉGULIERS · LIBRES
          </span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "46%",
          width: 54,
          height: 54,
          borderRadius: 999,
          transform: `translate(-50%, -50%) scale(${spring({ frame: frame - 34, fps, config: { damping: 14 } })})`,
          backgroundColor: props.surfaceColor,
          border: `1px solid ${props.accentColor}88`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
        }}
      >
        <Plus size={26} color={props.accentColor} />
      </div>

      <SceneSfx name="whoosh-fast" frame={5} volume={0.18} />
      <SceneSfx name="pop-soft" frame={28} volume={0.18} />
      <SceneSfx name="click-subtle" frame={120} volume={0.18} />
      <SceneSfx name="type-tick" frame={16} volume={0.18} />
    </AbsoluteFill>
  );
};
