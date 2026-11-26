import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneSfx } from "../components/SceneSfx";
import type { GeneratedSceneProps } from "./index";

type Props = GeneratedSceneProps;

const FONT = "'Cairo', 'Noto Sans', 'Noto Sans Arabic', system-ui, sans-serif";

const OUTER =
  "M 260 80 L 2050 80 C 2100 80 2120 110 2120 160 L 2120 420 C 2120 470 2090 500 2040 500 L 260 500 C 180 500 140 440 160 360 C 180 280 150 160 260 80 Z";
const CIRC =
  "M 320 430 C 430 430 480 360 600 360 L 900 360 C 1010 360 1040 330 1120 330 L 1420 330 C 1510 330 1540 300 1620 300 C 1660 300 1680 300 1700 300";
const SPIRAL = (() => {
  const pts: string[] = [];
  for (let i = 0; i <= 140; i++) {
    const t = i / 140;
    const a = t * Math.PI * 4.6;
    const r = 26 + t * 82;
    pts.push(`${i === 0 ? "M" : "L"} ${(1700 + Math.cos(a) * r).toFixed(1)} ${(300 + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(" ");
})();

export const Scene3 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const exit = interpolate(
    frame,
    [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const head = spring({ frame: frame - 2, fps, config: { damping: 200 } });
  const cam = interpolate(frame, [0, props.durationInFrames], [0, -430], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.sin),
  });
  const circP = interpolate(frame, [16, 250], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const planIn = spring({ frame: frame - 6, fps, config: { damping: 200, mass: 0.9 } });
  const spiralP = spring({ frame: frame - 140, fps, config: { damping: 200, mass: 0.9 } });
  const pulse = 0.5 + Math.sin(frame / 14) * 0.2;
  const focuses = [
    { label: "HALL", x: 470, y: 150, at: 18 },
    { label: "RAMPE", x: 1120, y: 200, at: 128 },
    { label: "ESCALIER", x: 1700, y: 96, at: 256 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: props.bgColor, overflow: "hidden", direction: "ltr" }}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="s3glow" cx="55%" cy="52%" r="58%">
            <stop offset="0%" stopColor={props.secondaryColor} stopOpacity={0.24} />
            <stop offset="100%" stopColor={props.secondaryColor} stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect x={0} y={0} width={1920} height={1080} fill="url(#s3glow)" />
        <line x1={0} y1={778} x2={1920} y2={778} stroke={props.accentColor} strokeWidth={1} opacity={0.18} />
      </svg>

      <div style={{ position: "absolute", left: "5%", top: "8%", width: "58%", fontFamily: FONT }}>
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
          Promenade architecturale
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: Math.min(52, width * 0.027),
            fontWeight: 800,
            lineHeight: 1.12,
            color: props.textColor,
            opacity: head,
            transform: `translateY(${(1 - head) * 24}px)`,
          }}
        >
          Hall, rampe, escalier
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 24,
            color: props.mutedColor,
            opacity: head,
          }}
        >
          Un parcours continu vers la lumière.
        </div>
      </div>

      <div style={{ position: "absolute", right: "5%", top: "8%", width: 220, fontFamily: FONT, borderLeft: `2px solid ${props.secondaryColor}66`, paddingLeft: 16 }}>
        <div style={{ fontSize: 13, letterSpacing: 3, color: props.mutedColor }}>PLAN 01</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: props.textColor, marginTop: 4 }}>REZ-DE-CHAUSSÉE</div>
      </div>

      <div style={{ position: "absolute", top: 250, left: 0, width: "100%", height: 520, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: 2300, height: 520, transform: `translateX(${cam * 0.35}px)`, opacity: 0.5 }}>
          <svg width="2300" height="520" viewBox="0 0 2300 520">
            {Array.from({ length: 20 }).map((_, i) => (
              <line key={i} x1={i * 120} y1={0} x2={i * 120} y2={520} stroke={props.secondaryColor} strokeWidth={1} opacity={0.08} />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <line key={`h${i}`} x1={0} y1={i * 100} x2={2300} y2={i * 100} stroke={props.secondaryColor} strokeWidth={1} opacity={0.06} />
            ))}
          </svg>
        </div>

        <div style={{ position: "absolute", top: 0, left: 0, width: 2300, height: 520, transform: `translateX(${cam}px)`, opacity: exit * planIn }}>
          <svg width="2300" height="520" viewBox="0 0 2300 520" style={{ direction: "ltr" }}>
            <path d={OUTER} fill={props.surfaceColor} fillOpacity={0.9} stroke={props.secondaryColor} strokeWidth={3} opacity={0.9} />
            {[
              "M 300 120 L 300 480",
              "M 300 250 L 620 250",
              "M 620 80 L 620 460",
              "M 660 180 L 880 180",
              "M 660 420 L 880 420",
              "M 900 300 L 1450 300",
              "M 900 380 L 1450 380",
              "M 1500 80 L 1500 460",
            ].map((d) => (
              <path key={d} d={d} fill="none" stroke={props.secondaryColor} strokeWidth={2} opacity={0.45} />
            ))}
            {Array.from({ length: 36 }).map((_, i) => {
              const col = i % 9;
              const row = Math.floor(i / 9);
              const x = 340 + col * 190;
              const y = 160 + row * 100;
              return <circle key={i} cx={x} cy={y} r={6} fill={props.accentColor} opacity={0.55} />;
            })}
            <circle cx={1700} cy={300} r={130} fill="none" stroke={props.secondaryColor} strokeWidth={2.5} opacity={0.7} />
            <path
              d={SPIRAL}
              fill="none"
              stroke={props.accentColor}
              strokeWidth={3}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - spiralP}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={CIRC}
              fill="none"
              stroke={props.accentColor}
              strokeWidth={7}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - circP}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.95}
            />
            <path
              d={CIRC}
              fill="none"
              stroke={props.accentColor}
              strokeWidth={18}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - circP}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.18}
            />
            {focuses.map((f) => (
              <g key={f.label} opacity={interpolate(frame, [f.at, f.at + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>
                <line x1={f.x} y1={f.y + 36} x2={f.x} y2={f.y + 84} stroke={props.secondaryColor} strokeWidth={1.5} />
                <rect x={f.x - 62} y={f.y} width={124} height={36} rx={18} fill={props.surfaceColor} stroke={`${props.accentColor}88`} strokeWidth={1.5} />
                <text x={f.x} y={f.y + 24} textAnchor="middle" fill={props.textColor} fontFamily={FONT} fontSize={15} fontWeight={800} letterSpacing={2}>
                  {f.label}
                </text>
                <circle cx={f.x} cy={f.y + 84} r={5} fill={props.accentColor} />
                <circle cx={f.x} cy={f.y + 84} r={12 + Math.sin(frame / 7) * 3} fill="none" stroke={props.accentColor} strokeWidth={1.5} opacity={pulse} />
              </g>
            ))}
            <text x={320} y={360} fill={props.textColor} fontFamily={FONT} fontSize={18} fontWeight={700} opacity={0.6}>
              ENTRÉE
            </text>
          </svg>
        </div>
      </div>

      <SceneSfx name="whoosh-deep" frame={5} volume={0.18} />
      <SceneSfx name="click-subtle" frame={20} volume={0.18} />
      <SceneSfx name="click-subtle" frame={130} volume={0.18} />
      <SceneSfx name="click-subtle" frame={258} volume={0.18} />
      <SceneSfx name="type-tick" frame={150} volume={0.18} />
    </AbsoluteFill>
  );
};
