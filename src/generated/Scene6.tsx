import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneSfx } from "../components/SceneSfx";
import type { GeneratedSceneProps } from "./index";

type Props = GeneratedSceneProps;

const FONT = "'Cairo', 'Noto Sans', 'Noto Sans Arabic', system-ui, sans-serif";

export const Scene6 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const exit = interpolate(
    frame,
    [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const head = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  const sub = spring({ frame: frame - 24, fps, config: { damping: 200 } });
  const chip = spring({ frame: frame - 150, fps, config: { damping: 200 } });
  const rise = interpolate(frame, [0, props.durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.sin),
  });
  const sunX = 520 + 880 * rise;
  const sunY = 640 - Math.sin(rise * Math.PI) * 400;
  const draw = interpolate(frame, [20, 130], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const drift = Math.sin(frame / 52);
  const horizonGlow = interpolate(frame, [0, 180], [0.18, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: props.bgColor, overflow: "hidden", direction: "ltr" }}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="s6sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={props.bgColor} />
            <stop offset="55%" stopColor={props.bgColor} />
            <stop offset="100%" stopColor={props.secondaryColor} stopOpacity={0.42} />
          </linearGradient>
          <radialGradient id="s6sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={props.accentColor} stopOpacity={0.85} />
            <stop offset="35%" stopColor={props.accentColor} stopOpacity={0.28} />
            <stop offset="100%" stopColor={props.accentColor} stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect x={0} y={0} width={1920} height={1080} fill="url(#s6sky)" />

        <path d="M 0 700 C 300 620 520 660 760 640 C 980 620 1200 600 1420 650 C 1600 690 1780 660 1920 620 L 1920 1080 L 0 1080 Z" fill={props.secondaryColor} opacity={0.12} transform={`translate(${drift * -16} 0)`} />
        <path d="M 0 740 C 260 690 560 700 820 680 C 1060 660 1320 690 1560 650 C 1720 625 1840 640 1920 665 L 1920 1080 L 0 1080 Z" fill={props.secondaryColor} opacity={0.08} transform={`translate(${drift * -8} 0)`} />

        <g transform={`translate(${drift * 22} 0)`} opacity={0.16}>
          {[
            [260, 300, 150],
            [560, 380, 110],
            [1180, 250, 170],
            [1520, 340, 130],
          ].map(([x, y, rx], i) => (
            <ellipse key={i} cx={x} cy={y} rx={rx} ry={14} fill={props.textColor} />
          ))}
        </g>

        <path d="M 520 640 Q 960 220 1400 640" fill="none" stroke={props.secondaryColor} strokeWidth={2} opacity={0.22} />
        <circle cx={sunX} cy={sunY} r={190} fill="url(#s6sun)" opacity={0.9} />
        <circle cx={sunX} cy={sunY} r={46} fill={props.accentColor} opacity={0.95} />
        <line x1={0} y1={640} x2={1920} y2={640} stroke={props.accentColor} strokeWidth={1.5} opacity={horizonGlow} />

        <g transform={`translate(0 ${drift * 6})`}>
          <path d="M 380 710 C 560 560 820 520 1080 600 C 1220 642 1360 620 1500 540" fill="none" stroke={props.surfaceColor} strokeWidth={30} strokeLinecap="round" opacity={0.22} transform="translate(0 12)" />
          <path d="M 380 710 C 560 560 820 520 1080 600 C 1220 642 1360 620 1500 540" fill="none" stroke={props.surfaceColor} strokeWidth={26} strokeLinecap="round" />
          <path
            d="M 400 720 C 580 575 830 535 1085 612 C 1225 655 1360 632 1500 552"
            fill="none"
            stroke={props.accentColor}
            strokeWidth={3}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - draw}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
          />
          <path d="M 520 705 C 720 625 960 605 1180 665 C 1320 705 1440 685 1540 625" fill="none" stroke={props.surfaceColor} strokeWidth={13} strokeLinecap="round" opacity={0.95} />
          <path d="M 520 706 C 760 656 1120 656 1380 706 C 1240 746 700 750 520 706 Z" fill={props.surfaceColor} fillOpacity={0.92} stroke={props.accentColor} strokeWidth={2} />
          <path
            d="M 600 704 C 760 674 920 724 1080 684 C 1200 654 1300 664 1360 704"
            fill="none"
            stroke={props.accentColor}
            strokeWidth={4}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - draw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={1360} cy={704} r={7} fill={props.accentColor} />
          <circle cx={1360} cy={704} r={16 + Math.sin(frame / 9) * 4} fill="none" stroke={props.accentColor} strokeWidth={1.5} opacity={0.5} />
        </g>

        {Array.from({ length: 18 }).map((_, i) => (
          <circle
            key={i}
            cx={(i * 173) % 1920}
            cy={220 + ((i * 97) % 420)}
            r={1.5 + (i % 3)}
            fill={props.accentColor}
            opacity={0.18 + Math.sin(frame / 20 + i) * 0.12}
          />
        ))}
      </svg>

      <div
        style={{
          position: "absolute",
          left: "6%",
          top: "9%",
          width: "56%",
          fontFamily: FONT,
          opacity: exit,
          transform: `translateY(${(1 - exit) * 16}px)`,
        }}
      >
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
          Toit-terrasse · Solarium
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: Math.min(72, width * 0.0375),
            fontWeight: 800,
            lineHeight: 1.06,
            color: props.textColor,
            opacity: head,
            transform: `translateY(${(1 - head) * 24}px)`,
          }}
        >
          Le solarium
        </div>
        <div style={{ marginTop: 4, fontSize: 30, color: props.mutedColor, opacity: sub, transform: `translateY(${(1 - sub) * 14}px)` }}>
          Dialogue avec l’horizon
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: "6%",
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
        PLEIN CIEL · FORMES COURBES
      </div>

      <div
        style={{
          position: "absolute",
          left: "6%",
          top: "62%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 20px",
          borderRadius: 999,
          backgroundColor: props.surfaceColor,
          border: `1px solid ${props.secondaryColor}66`,
          boxShadow: "0 18px 48px rgba(0,0,0,0.32)",
          fontFamily: FONT,
          opacity: exit * chip,
          transform: `translateY(${(1 - chip) * 18}px)`,
        }}
      >
        <div style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: props.accentColor }} />
        <span style={{ fontSize: 19, fontWeight: 700, color: props.textColor }}>La promenade couronne l’édifice</span>
      </div>

      <SceneSfx name="whoosh-soft" frame={6} volume={0.18} />
      <SceneSfx name="pop-soft" frame={34} volume={0.18} />
      <SceneSfx name="type-tick" frame={26} volume={0.18} />
      <SceneSfx name="click-subtle" frame={152} volume={0.18} />
      <SceneSfx name="whoosh-fast" frame={220} volume={0.18} />
    </AbsoluteFill>
  );
};
