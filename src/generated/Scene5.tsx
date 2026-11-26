import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { scaleLinear } from "d3-scale";
import { SceneSfx } from "../components/SceneSfx";
import type { GeneratedSceneProps } from "./index";

type Props = GeneratedSceneProps;

const FONT = "'Cairo', 'Noto Sans', 'Noto Sans Arabic', system-ui, sans-serif";

export const Scene5 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const exit = interpolate(
    frame,
    [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const head = spring({ frame: frame - 2, fps, config: { damping: 200 } });
  const panelIn = spring({ frame: frame - 8, fps, config: { damping: 200, mass: 0.9 } });
  const draw = interpolate(frame, [30, 150], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const vueDraw = interpolate(frame, [60, 180], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bandP = spring({ frame: frame - 120, fps, config: { damping: 200 } });
  const axisP = spring({ frame: frame - 18, fps, config: { damping: 200 } });

  const xScale = scaleLinear().domain([0, 100]).range([110, 1120]);
  const yScale = scaleLinear().domain([0, 100]).range([320, 70]);
  const lum = (x: number) => 34 + 60 * (1 - Math.exp(-x / 24)) + 3.5 * Math.sin(x / 6);
  const vue = (x: number) => 22 + 0.7 * x;
  const pathFor = (fn: (x: number) => number) =>
    Array.from({ length: 61 }, (_, i) => {
      const x = (i / 60) * 100;
      return `${i === 0 ? "M" : "L"} ${xScale(x).toFixed(2)} ${yScale(fn(x)).toFixed(2)}`;
    }).join(" ");
  const lumPath = pathFor(lum);
  const vuePath = pathFor(vue);
  const mp = interpolate(frame, [40, props.durationInFrames - 26], [8, 92], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const markerY = yScale(lum(mp));

  return (
    <AbsoluteFill style={{ backgroundColor: props.bgColor, overflow: "hidden", direction: "ltr" }}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="s5bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={props.secondaryColor} stopOpacity={0.2} />
            <stop offset="100%" stopColor={props.secondaryColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <rect x={0} y={0} width={1920} height={1080} fill="url(#s5bg)" />
        {Array.from({ length: 14 }).map((_, i) => (
          <line key={i} x1={i * 150} y1={0} x2={i * 150} y2={1080} stroke={props.secondaryColor} strokeWidth={1} opacity={0.05} />
        ))}
      </svg>

      <div style={{ position: "absolute", left: "5%", top: "8%", width: "62%", fontFamily: FONT }}>
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
          Fenêtre-bandeau
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
          La lumière devient continue
        </div>
        <div style={{ marginTop: 8, fontSize: 23, color: props.mutedColor, opacity: head }}>
          Une vue panoramique sur tout le paysage.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: "6%",
          top: "26%",
          width: "88%",
          height: "44%",
          borderRadius: 24,
          padding: 24,
          boxSizing: "border-box",
          backgroundColor: props.surfaceColor,
          border: `1px solid ${props.secondaryColor}66`,
          boxShadow: "0 18px 48px rgba(0,0,0,0.35)",
          display: "flex",
          flexDirection: "column",
          fontFamily: FONT,
          direction: "ltr",
          textAlign: "left",
          opacity: exit * panelIn,
          transform: `translateY(${(1 - panelIn) * 28}px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: props.textColor }}>Lumière naturelle le long de la façade</div>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { label: "Lumière (%)", color: props.accentColor },
              { label: "Vue dégagée", color: props.secondaryColor },
            ].map((l) => (
              <div
                key={l.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 12px",
                  borderRadius: 999,
                  backgroundColor: props.surfaceAltColor,
                  border: `1px solid ${props.secondaryColor}55`,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: l.color }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: props.textColor }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, marginTop: 8 }}>
          <svg width="100%" height="100%" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid meet" style={{ direction: "ltr" }}>
            <g opacity={axisP}>
              {[0, 25, 50, 75, 100].map((v) => (
                <g key={v}>
                  <line x1={110} y1={yScale(v)} x2={1120} y2={yScale(v)} stroke={props.secondaryColor} strokeWidth={1} opacity={0.14} />
                  <text x={96} y={yScale(v) + 5} textAnchor="end" fill={props.mutedColor} fontFamily={FONT} fontSize={15}>
                    {v}
                  </text>
                </g>
              ))}
              {[0, 20, 40, 60, 80, 100].map((v) => (
                <text key={v} x={xScale(v)} y={348} textAnchor="middle" fill={props.mutedColor} fontFamily={FONT} fontSize={15}>
                  {v}
                </text>
              ))}
              <line x1={110} y1={320} x2={1120} y2={320} stroke={props.secondaryColor} strokeWidth={2} opacity={0.6} />
              <line x1={110} y1={70} x2={110} y2={320} stroke={props.secondaryColor} strokeWidth={2} opacity={0.6} />
              <text x={615} y={386} textAnchor="middle" fill={props.mutedColor} fontFamily={FONT} fontSize={14} letterSpacing={2}>
                LONGUEUR DE LA FAÇADE (m)
              </text>
              <text transform="rotate(-90 30 200)" x={30} y={200} textAnchor="middle" fill={props.mutedColor} fontFamily={FONT} fontSize={14} letterSpacing={2}>
                LUMIÈRE (%)
              </text>
            </g>

            <rect
              x={xScale(25)}
              y={70}
              width={xScale(80) - xScale(25)}
              height={250}
              fill={props.accentColor}
              opacity={0.08 * bandP}
            />
            <text x={(xScale(25) + xScale(80)) / 2} y={58} textAnchor="middle" fill={props.accentColor} fontFamily={FONT} fontSize={14} fontWeight={700} letterSpacing={1.5} opacity={bandP}>
              LUMIÈRE CONTINUE
            </text>

            <path
              d={vuePath}
              fill="none"
              stroke={props.secondaryColor}
              strokeWidth={3}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - vueDraw}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
            <path
              d={lumPath}
              fill="none"
              stroke={props.accentColor}
              strokeWidth={4}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - draw}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <line x1={xScale(mp)} y1={markerY} x2={xScale(mp)} y2={320} stroke={props.accentColor} strokeWidth={1.5} opacity={0.5} />
            <circle cx={xScale(mp)} cy={markerY} r={16 + Math.sin(frame / 7) * 3} fill={props.accentColor} opacity={0.18} />
            <circle cx={xScale(mp)} cy={markerY} r={6} fill={props.accentColor} />
            <g>
              <rect x={xScale(mp) - 38} y={markerY - 46} width={76} height={28} rx={8} fill={props.surfaceAltColor} stroke={`${props.accentColor}99`} strokeWidth={1.2} />
              <text x={xScale(mp)} y={markerY - 27} textAnchor="middle" fill={props.textColor} fontFamily={FONT} fontSize={14} fontWeight={800}>
                {Math.round(lum(mp))} %
              </text>
            </g>
          </svg>
        </div>
      </div>

      <SceneSfx name="whoosh-soft" frame={6} volume={0.18} />
      <SceneSfx name="type-tick" frame={20} volume={0.18} />
      <SceneSfx name="click-subtle" frame={62} volume={0.18} />
      <SceneSfx name="pop-soft" frame={124} volume={0.18} />
    </AbsoluteFill>
  );
};
