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

export const Scene4 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const exit = interpolate(
    frame,
    [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const h = spring({ frame: frame - 2, fps, config: { damping: 14, stiffness: 120, mass: 0.7 } });
  const ring1 = interpolate(frame, [0, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ring2 = interpolate(frame, [15, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cx = width / 2;
  const cy = height * 0.5;
  const r1 = Math.min(width, height) * 0.3;
  const r2 = Math.min(width, height) * 0.37;
  const ringPath = (r: number) =>
    `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;

  const cards = [
    { icon: "mdi:code-braces", title: "100% Open-Source", detail: "MIT licensed - fork it, own it.", tag: "MIT" },
    { icon: "mdi:shield-lock", title: "Local-First Privacy", detail: "Your media never leaves your machine.", tag: "OFFLINE" },
    { icon: "mdi:cash-multiple", title: "$0.00 Render Cost", detail: "No subscriptions. No credit meter.", tag: "FREE" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: props.bgColor, overflow: "hidden", direction: "ltr" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 48%, ${props.secondaryColor}AA 0%, transparent 54%), radial-gradient(circle at 50% 10%, ${props.accentColor}1f 0%, transparent 42%)`,
        }}
      />
      <AbsoluteFill
        style={{
          inset: "-10% 0",
          backgroundImage: `linear-gradient(${props.accentColor}0d 1px, transparent 1px), linear-gradient(90deg, ${props.accentColor}0d 1px, transparent 1px)`,
          backgroundSize: "68px 68px",
          transform: `translateY(${interpolate(frame, [0, props.durationInFrames], [0, 34])}px)`,
        }}
      />

      <svg viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", inset: 0, direction: "ltr" }}>
        <path
          d={ringPath(r1)}
          fill="none"
          stroke={`${props.accentColor}2e`}
          strokeWidth={2}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - ring1}
        />
        <path
          d={ringPath(r2)}
          fill="none"
          stroke={`${props.textColor}18`}
          strokeWidth={2}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - ring2}
        />
        <g transform={`rotate(${frame * 0.6} ${cx} ${cy})`}>
          <circle cx={cx + r2} cy={cy} r={7 * u} fill={props.accentColor} opacity={0.85} />
        </g>
        <g transform={`rotate(${-frame * 0.9} ${cx} ${cy})`}>
          <circle cx={cx + r1} cy={cy} r={4 * u} fill={props.textColor} opacity={0.6} />
        </g>
        <g transform={`rotate(${frame * 0.35 + 120} ${cx} ${cy})`}>
          <circle cx={cx + r1} cy={cy} r={3 * u} fill={props.accentColor} opacity={0.5} />
        </g>
      </svg>

      <div
        style={{
          position: "absolute",
          top: "5%",
          left: "5.5%",
          right: "5.5%",
          bottom: "29%",
          display: "flex",
          flexDirection: "column",
          opacity: exit,
          transform: `translateY(${(1 - exit) * 16}px)`,
        }}
      >
        <div style={{ opacity: h, transform: `translateY(${(1 - h) * 20}px)` }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10 * u,
              marginBottom: 10 * u,
              fontFamily: FONT,
              fontSize: 18 * u,
              fontWeight: 800,
              letterSpacing: 3,
              color: props.accentColor,
            }}
          >
            <SmartIcon query="mdi:shield-check" size={20 * u} color={props.accentColor} />
            ZERO COST. FULL CONTROL.
          </div>
          <div style={{ fontFamily: FONT, fontSize: 56 * u, fontWeight: 900, lineHeight: 1.15, letterSpacing: -1, color: props.textColor }}>
            Everything runs local
          </div>
          <div style={{ fontFamily: FONT, fontSize: 56 * u, fontWeight: 900, lineHeight: 1.15, letterSpacing: -1, color: props.accentColor }}>
            with zero render cost.
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 * u }}>
          {cards.map((c, i) => {
            const s = spring({ frame: frame - (10 + i * 12), fps, config: { damping: 13, stiffness: 140, mass: 0.7 } });
            return (
              <div
                key={c.title}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18 * u,
                  padding: `${20 * u}px ${22 * u}px`,
                  borderRadius: 24 * u,
                  background: props.surfaceColor,
                  border: `1px solid ${props.accentColor}55`,
                  boxShadow: "0 18px 48px rgba(0,0,0,0.35)",
                  opacity: s,
                  transform: `translateY(${(1 - s) * 36 + Math.sin(frame / 24 + i * 1.7) * 4}px) scale(${0.95 + s * 0.05})`,
                }}
              >
                <div
                  style={{
                    width: 78 * u,
                    height: 78 * u,
                    borderRadius: 20 * u,
                    background: props.surfaceAltColor,
                    border: `1px solid ${props.accentColor}44`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: `0 0 24px ${props.accentColor}22`,
                  }}
                >
                  <SmartIcon query={c.icon} size={38 * u} color={props.accentColor} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT, fontSize: 30 * u, fontWeight: 800, color: props.textColor, lineHeight: 1.25 }}>
                    {c.title}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 18 * u, color: props.mutedColor, lineHeight: 1.45 }}>{c.detail}</div>
                </div>
                <div
                  style={{
                    padding: `${7 * u}px ${13 * u}px`,
                    borderRadius: 999,
                    background: `${props.accentColor}1f`,
                    border: `1px solid ${props.accentColor}66`,
                    fontFamily: FONT,
                    fontSize: 16 * u,
                    fontWeight: 800,
                    color: props.textColor,
                    letterSpacing: 1,
                  }}
                >
                  {c.tag}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SceneSfx name="pop-soft" frame={10} volume={0.18} />
      <SceneSfx name="pop-soft" frame={22} volume={0.18} />
      <SceneSfx name="toggle-soft" frame={30} volume={0.18} />
      <SceneSfx name="cash-register" frame={36} volume={0.18} />
      <SceneSfx name="type-tick" frame={52} volume={0.18} />
      <SceneSfx name="click-subtle" frame={70} volume={0.18} />
    </AbsoluteFill>
  );
};
