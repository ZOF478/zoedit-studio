import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneSfx } from "../components/SceneSfx";
import type { GeneratedSceneProps } from "./index";

type Props = GeneratedSceneProps;

const FONT = "'Cairo', 'Noto Sans', 'Noto Sans Arabic', system-ui, sans-serif";

const OUTER =
  "M 120 60 L 400 60 C 460 60 480 100 480 160 L 480 380 C 480 440 440 470 380 470 L 140 470 C 80 470 50 440 50 380 L 50 150 C 50 90 70 60 120 60 Z";
const RAMP =
  "M 150 420 C 150 350 205 330 260 305 C 315 280 315 220 260 200 L 175 172";

export const Scene1 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const exit = interpolate(
    frame,
    [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const head = spring({ frame: frame - 3, fps, config: { damping: 200, mass: 0.8 } });
  const sub = spring({ frame: frame - 22, fps, config: { damping: 200, mass: 0.9 } });
  const pill = spring({ frame: frame - 46, fps, config: { damping: 200 } });
  const planP = interpolate(frame, [8, 92], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const rampP = interpolate(frame, [54, 118], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const drift = Math.sin(frame / 36) * 7;
  const glow = 0.5 + Math.sin(frame / 24) * 0.18;
  const headFont = Math.min(150, width * 0.078);

  return (
    <AbsoluteFill style={{ backgroundColor: props.bgColor, overflow: "hidden", direction: "ltr" }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1920 1080"
        style={{ position: "absolute", inset: 0, direction: "ltr" }}
      >
        <defs>
          <radialGradient id="s1glow" cx="72%" cy="46%" r="46%">
            <stop offset="0%" stopColor={props.accentColor} stopOpacity={glow} />
            <stop offset="100%" stopColor={props.accentColor} stopOpacity={0} />
          </radialGradient>
          <linearGradient id="s1beam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={props.accentColor} stopOpacity={0} />
            <stop offset="50%" stopColor={props.accentColor} stopOpacity={0.5} />
            <stop offset="100%" stopColor={props.accentColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <rect x={0} y={0} width={1920} height={1080} fill="url(#s1glow)" />
        {Array.from({ length: 25 }).map((_, i) => (
          <line
            key={`v${i}`}
            x1={i * 80}
            y1={0}
            x2={i * 80}
            y2={1080}
            stroke={props.secondaryColor}
            strokeWidth={1}
            opacity={0.07}
          />
        ))}
        {Array.from({ length: 15 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={i * 80}
            x2={1920}
            y2={i * 80}
            stroke={props.secondaryColor}
            strokeWidth={1}
            opacity={0.07}
          />
        ))}
        <line x1={0} y1={560} x2={1920} y2={560} stroke="url(#s1beam)" strokeWidth={2} opacity={0.6} />
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: exit,
          transform: `translateY(${(1 - exit) * 18}px)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "5%",
            top: "12%",
            width: "58%",
            fontFamily: FONT,
            direction: "ltr",
            textAlign: "left",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              opacity: head,
              transform: `translateX(${(1 - head) * -40}px)`,
            }}
          >
            <div style={{ width: 46, height: 2, backgroundColor: props.accentColor }} />
            <div
              style={{
                color: props.accentColor,
                fontSize: Math.min(20, width * 0.011),
                letterSpacing: 5,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Poissy · 1928 — 1931
            </div>
          </div>

          <div style={{ overflow: "hidden", marginTop: 14, paddingBottom: 6 }}>
            <div
              style={{
                transform: `translateY(${(1 - head) * 118}%)`,
                fontSize: headFont,
                lineHeight: 0.98,
                fontWeight: 800,
                letterSpacing: -2,
                color: props.textColor,
              }}
            >
              VILLA
            </div>
          </div>
          <div style={{ overflow: "hidden", paddingBottom: 10, marginTop: -6 }}>
            <div
              style={{
                transform: `translateY(${(1 - head) * 118}%)`,
                fontSize: headFont,
                lineHeight: 0.98,
                fontWeight: 800,
                letterSpacing: -2,
                color: props.accentColor,
              }}
            >
              SAVOYE
            </div>
          </div>

          <div
            style={{
              marginTop: 10,
              opacity: sub,
              transform: `translateY(${(1 - sub) * 20}px)`,
              fontSize: Math.min(40, width * 0.021),
              lineHeight: 1.35,
              color: props.mutedColor,
              maxWidth: "92%",
            }}
          >
            Un manifeste de l’architecture moderne signé Le Corbusier.
          </div>

          <div
            style={{
              marginTop: 26,
              opacity: pill,
              transform: `translateY(${(1 - pill) * 16}px) scale(${0.94 + pill * 0.06})`,
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              padding: "13px 24px",
              borderRadius: 999,
              backgroundColor: props.surfaceColor,
              border: `1px solid ${props.secondaryColor}66`,
              boxShadow: "0 18px 48px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: props.accentColor }} />
            <span style={{ fontSize: 22, fontWeight: 700, color: props.textColor, letterSpacing: 1 }}>
              La promenade architecturale
            </span>
          </div>

          <div style={{ marginTop: 30, display: "flex", gap: 40, opacity: pill }}>
            {[
              ["3", "niveaux"],
              ["5", "points modernes"],
              ["1", "parcours"],
            ].map(([n, l]) => (
              <div key={l}>
                <div style={{ fontSize: 30, fontWeight: 800, color: props.textColor, lineHeight: 1 }}>{n}</div>
                <div
                  style={{
                    fontSize: 16,
                    color: props.mutedColor,
                    marginTop: 6,
                    textTransform: "uppercase",
                    letterSpacing: 2,
                  }}
                >
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            right: "4%",
            top: "20%",
            width: "28%",
            maxWidth: 540,
            transform: `translateY(${drift}px)`,
          }}
        >
          <div style={{ position: "absolute", inset: -18, borderRadius: 28, border: `1px solid ${props.secondaryColor}33` }} />
          <svg width="100%" viewBox="0 0 540 540" style={{ display: "block", direction: "ltr" }}>
            <path
              d={OUTER}
              fill={props.surfaceColor}
              fillOpacity={0.94}
              stroke={props.accentColor}
              strokeWidth={2.5}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - planP}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={RAMP}
              fill="none"
              stroke={props.accentColor}
              strokeWidth={3}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - rampP}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <g opacity={rampP}>
              <circle cx={150} cy={420} r={7} fill={props.accentColor} />
              <line x1={150} y1={420} x2={88} y2={470} stroke={props.secondaryColor} strokeWidth={1.5} />
              <text x={80} y={492} fill={props.textColor} fontFamily={FONT} fontSize={17} fontWeight={700} textAnchor="end">
                RAMPE
              </text>
              <circle cx={400} cy={150} r={7} fill={props.accentColor} />
              <line x1={400} y1={150} x2={466} y2={104} stroke={props.secondaryColor} strokeWidth={1.5} />
              <text x={472} y={96} fill={props.textColor} fontFamily={FONT} fontSize={17} fontWeight={700}>
                VERRE
              </text>
            </g>
            {Array.from({ length: 6 }).map((_, i) => (
              <circle key={i} cx={92 + i * 8} cy={112 + i * 52} r={3.5} fill={props.accentColor} opacity={0.7} />
            ))}
          </svg>
        </div>
      </div>

      <SceneSfx name="whoosh-soft" frame={4} volume={0.18} />
      <SceneSfx name="type-tick" frame={24} volume={0.18} />
      <SceneSfx name="click-subtle" frame={58} volume={0.18} />
      <SceneSfx name="pop-soft" frame={96} volume={0.18} />
    </AbsoluteFill>
  );
};
