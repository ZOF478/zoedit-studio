import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneSfx } from "../components/SceneSfx";

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
const HEAVY_PATH = "M 120 500 L 280 433 L 440 328 L 600 213 L 760 118 L 950 70";
const PROMPT_PATH = "M 120 500 L 260 486 L 420 481 L 950 481";

export const Scene5 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const exit = interpolate(
    frame,
    [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const h1 = spring({ frame, fps, config: { damping: 14, stiffness: 130, mass: 0.7 } });
  const h2 = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 130, mass: 0.7 } });
  const p1 = interpolate(frame, [0, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const p2 = interpolate(frame, [16, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pulse = 1 + Math.sin(frame / 9) * 0.15;
  const scanX = interpolate(frame, [60, props.durationInFrames], [120, 950], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const chartW = Math.min(width * 0.92, 980 * u);
  const legend = [
    { label: "Traditional editor", color: props.mutedColor },
    { label: "ZoEdit prompt", color: props.accentColor },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: props.bgColor, overflow: "hidden", direction: "ltr" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 22%, ${props.accentColor}20 0%, transparent 46%), radial-gradient(circle at 50% 70%, ${props.secondaryColor}88 0%, transparent 50%)`,
        }}
      />
      <AbsoluteFill
        style={{
          inset: "-10% 0",
          backgroundImage: `linear-gradient(${props.accentColor}0d 1px, transparent 1px), linear-gradient(90deg, ${props.accentColor}0d 1px, transparent 1px)`,
          backgroundSize: "62px 62px",
          transform: `translateY(${interpolate(frame, [0, props.durationInFrames], [0, 26])}px)`,
        }}
      />

      <div style={{ position: "absolute", inset: 0, opacity: exit, transform: `translateY(${(1 - exit) * 14}px)` }}>
        <div style={{ position: "absolute", top: "6%", left: "6%", right: "6%" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9 * u,
              fontFamily: FONT,
              fontSize: 18 * u,
              fontWeight: 800,
              letterSpacing: 3,
              color: props.accentColor,
              marginBottom: 8 * u,
            }}
          >
            THE SPEED GAP
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 72 * u,
              fontWeight: 900,
              lineHeight: 1.12,
              letterSpacing: -1.5,
              color: props.textColor,
              opacity: h1,
              transform: `translateY(${(1 - h1) * 24}px)`,
            }}
          >
            So skip the
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 78 * u,
              fontWeight: 900,
              lineHeight: 1.12,
              letterSpacing: -1.5,
              color: props.accentColor,
              opacity: h2,
              transform: `translateY(${(1 - h2) * 24}px)`,
            }}
          >
            slow editors.
          </div>
        </div>

        <div style={{ position: "absolute", top: "22%", left: "6%", right: "6%", display: "flex", gap: 14 * u }}>
          {legend.map((item, i) => {
            const s = spring({ frame: frame - (2 + i * 12), fps, config: { damping: 15, stiffness: 150, mass: 0.6 } });
            return (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10 * u,
                  padding: `${8 * u}px ${14 * u}px`,
                  borderRadius: 999,
                  background: props.surfaceColor,
                  border: `1px solid ${item.color}55`,
                  opacity: s,
                  transform: `translateY(${(1 - s) * 12}px)`,
                  fontFamily: FONT,
                  fontSize: 18 * u,
                  fontWeight: 700,
                  color: props.textColor,
                }}
              >
                <div style={{ width: 14 * u, height: 14 * u, borderRadius: "50%", background: item.color, boxShadow: `0 0 10px ${item.color}` }} />
                {item.label}
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: "absolute",
            top: "26.5%",
            left: "50%",
            width: chartW,
            transform: "translateX(-50%)",
            direction: "ltr",
          }}
        >
          <svg viewBox="0 0 1000 620" style={{ width: "100%", height: "auto", direction: "ltr", overflow: "visible" }}>
            <rect
              x={0}
              y={0}
              width={1000}
              height={620}
              rx={28}
              fill={props.surfaceColor}
              stroke={`${props.accentColor}52`}
              strokeWidth={2}
            />

            {[0, 15, 30, 45].map((v) => {
              const y = 500 - (v / 45) * 430;
              return (
                <g key={v}>
                  <line x1={120} y1={y} x2={950} y2={y} stroke={`${props.textColor}14`} strokeWidth={1.5} />
                  <text x={106} y={y + 8} textAnchor="end" fill={props.mutedColor} fontFamily={FONT} fontSize={22} fontWeight={600}>
                    {v}m
                  </text>
                </g>
              );
            })}

            {[120, 535, 950].map((x, i) => (
              <text key={x} x={x} y={540} textAnchor="middle" fill={props.mutedColor} fontFamily={FONT} fontSize={22} fontWeight={600}>
                {i === 0 ? "0%" : i === 1 ? "50%" : "100%"}
              </text>
            ))}

            <line x1={120} y1={70} x2={120} y2={500} stroke={`${props.textColor}55`} strokeWidth={2} />
            <line x1={120} y1={500} x2={950} y2={500} stroke={`${props.textColor}55`} strokeWidth={2} />
            <text x={120} y={44} textAnchor="start" fill={props.mutedColor} fontFamily={FONT} fontSize={20} fontWeight={700} letterSpacing={2}>
              MINUTES
            </text>
            <text x={535} y={590} textAnchor="middle" fill={props.mutedColor} fontFamily={FONT} fontSize={20} fontWeight={700} letterSpacing={2}>
              PROMPT TO FIRST CUT
            </text>

            <line x1={scanX} y1={70} x2={scanX} y2={500} stroke={`${props.accentColor}22`} strokeWidth={2} />

            <path
              d={HEAVY_PATH}
              fill="none"
              stroke={props.mutedColor}
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - p1}
              opacity={0.9}
            />
            <path
              d={PROMPT_PATH}
              fill="none"
              stroke={props.accentColor}
              strokeWidth={8}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - p2}
              style={{ filter: `drop-shadow(0 0 10px ${props.accentColor}88)` }}
            />

            <circle cx={950} cy={70} r={7 * p1 * pulse} fill={props.mutedColor} opacity={p1} />
            <circle cx={950} cy={481} r={8 * p2 * pulse} fill={props.accentColor} opacity={p2} />

            <text x={930} y={48} textAnchor="end" fill={props.textColor} fontFamily={FONT} fontSize={26} fontWeight={800}>
              45 min
            </text>
            <text x={930} y={445} textAnchor="end" fill={props.textColor} fontFamily={FONT} fontSize={26} fontWeight={800}>
              2 min
            </text>
          </svg>
        </div>
      </div>

      <SceneSfx name="riser-build" frame={2} volume={0.18} />
      <SceneSfx name="whoosh-fast" frame={18} volume={0.18} />
      <SceneSfx name="alert-warning" frame={28} volume={0.18} />
      <SceneSfx name="pop-sharp" frame={54} volume={0.18} />
      <SceneSfx name="click-subtle" frame={72} volume={0.18} />
    </AbsoluteFill>
  );
};
