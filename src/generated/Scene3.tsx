import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Film, Play, Sparkles, TrendingUp } from "lucide-react";
import { DepthStage, SpatialCard } from "../components/Depth25D";
import { SceneSfx } from "../components/SceneSfx";

type Props = {
  accentColor: string;
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

const CLAMP = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const STATIONS = [
  { title: "LIVE CHARTS", tag: "01 · DATA" },
  { title: "CINEMATIC B-ROLL", tag: "02 · FOOTAGE" },
  { title: "VECTOR MOTION", tag: "03 · DESIGNED" },
];

export const Scene3 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const unit = Math.min(width, height);
  const dur = props.durationInFrames;
  const exit = interpolate(
    frame,
    [Math.max(0, dur - 10), Math.max(1, dur - 1)],
    [1, 0],
    CLAMP,
  );
  const pad = width * 0.06;
  const gap = width * 0.05;
  const stationW = width * 0.7;
  const trackWidth = pad * 2 + stationW * 3 + gap * 2;
  const panMax = Math.max(0, pad + (stationW + gap) * 2 - (width - stationW) / 2);
  const pan = interpolate(frame, [40, dur - 30], [0, panMax], {
    ...CLAMP,
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: props.bgColor,
        overflow: "hidden",
        direction: props.isRtl ? "rtl" : "ltr",
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 70% 30%, ${props.accentColor}1f, transparent 60%)`,
        }}
      />
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${-pan * 0.22}px)`, opacity: 0.16 }}>
        <svg width={width * 2} height={height}>
          {Array.from({ length: 22 }).map((_, i) => (
            <line
              key={`bgv${i}`}
              x1={i * 110}
              y1={0}
              x2={i * 110}
              y2={height}
              stroke={props.accentColor}
              strokeWidth={1}
              strokeDasharray="3 14"
            />
          ))}
          {Array.from({ length: 12 }).map((_, i) => (
            <line
              key={`bgh${i}`}
              x1={0}
              y1={i * 180}
              x2={width * 2}
              y2={i * 180}
              stroke={props.accentColor}
              strokeWidth={1}
              strokeDasharray="3 14"
            />
          ))}
        </svg>
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={`dot${i}`}
          style={{
            position: "absolute",
            left: `${14 + i * 22}%`,
            top: `${24 + (i % 3) * 21}%`,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: props.accentColor,
            opacity: 0.35,
            transform: `translateY(${Math.sin(frame / 30 + i * 1.7) * 22}px)`,
          }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          top: "7%",
          left: 0,
          right: 0,
          padding: "0 48px",
          maxWidth: "88%",
          direction: "ltr",
          textAlign: "left",
          opacity: exit,
          transform: `translateY(${(1 - exit) * -14}px)`,
        }}
      >
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 15,
            letterSpacing: 4,
            color: props.accentColor,
            marginBottom: 12,
          }}
        >
          TRUE CREATIVE VARIETY
        </div>
        <div
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 900,
            fontSize: unit * 0.058,
            lineHeight: 1.12,
            letterSpacing: -1.5,
            color: props.textColor,
          }}
        >
          No rigid templates —{" "}
          <span style={{ color: props.accentColor }}>just charts, B-roll & motion</span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: "25%",
          height: "50%",
          left: 0,
          right: 0,
          overflow: "hidden",
          opacity: exit,
          transform: `translateY(${(1 - exit) * 14}px)`,
        }}
      >
        <DepthStage
          style={{
            width: trackWidth,
            height: "100%",
            justifyContent: "flex-start",
            alignItems: "center",
            gap,
            paddingLeft: pad,
            paddingRight: pad,
            transform: `translateX(${-pan}px)`,
          }}
        >
          {STATIONS.map((station, i) => (
            <SpatialCard
              key={station.title}
              enterFrame={i * 12}
              recedeFrame={i === 0 ? 130 : i === 1 ? 260 : undefined}
              tiltY={props.isRtl ? 7 : -7}
              shadowColor="rgba(2,6,23,0.6)"
              style={{
                width: stationW,
                height: "78%",
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                borderRadius: 24,
                padding: "18px 20px",
                background: "linear-gradient(155deg, rgba(37,92,153,0.3), rgba(5,22,42,0.92))",
                border: `1px solid ${props.accentColor}55`,
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                {i === 0 ? (
                  <TrendingUp size={20} color={props.accentColor} />
                ) : i === 1 ? (
                  <Film size={20} color={props.accentColor} />
                ) : (
                  <Sparkles size={20} color={props.accentColor} />
                )}
                <span style={{ fontSize: unit * 0.02, fontWeight: 800, color: props.textColor, letterSpacing: 0.5 }}>
                  {station.title}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontFamily: "monospace",
                    fontSize: 10,
                    letterSpacing: 1.5,
                    color: props.mutedColor,
                  }}
                >
                  {station.tag}
                </span>
              </div>

              {i === 0 && (
                <svg viewBox="0 0 360 210" style={{ width: "100%", flex: 1, minHeight: 0 }}>
                  <line x1={58} y1={16} x2={58} y2={180} stroke={props.accentColor} strokeWidth={1.5} opacity={0.5} />
                  <line x1={58} y1={180} x2={340} y2={180} stroke={props.accentColor} strokeWidth={1.5} opacity={0.5} />
                  {[0, 20, 40, 60].map((tick) => {
                    const y = 180 - (tick / 80) * 150;
                    return (
                      <g key={tick}>
                        <line x1={58} y1={y} x2={340} y2={y} stroke={props.accentColor} strokeWidth={1} strokeDasharray="3 8" opacity={0.2} />
                        <text x={44} y={y + 4} textAnchor="end" fontSize={11} fill={props.mutedColor} fontFamily="monospace">
                          {tick}
                        </text>
                      </g>
                    );
                  })}
                  {[30, 55, 42, 75, 60].map((value, b) => {
                    const s = spring({
                      frame: frame - 24 - b * 12,
                      fps,
                      config: { damping: 16, stiffness: 110 },
                    });
                    const barH = (value / 80) * 150 * s;
                    return (
                      <rect
                        key={b}
                        x={78 + b * 52}
                        y={180 - barH}
                        width={32}
                        height={barH}
                        rx={6}
                        fill={b === 3 ? props.accentColor : b === 1 ? "#BAE6FD" : "rgba(240,248,255,0.28)"}
                      />
                    );
                  })}
                  <text x={58} y={200} fontSize={10} fill={props.mutedColor} fontFamily="monospace">
                    ENGAGEMENT · LAST 5 LAUNCHES
                  </text>
                </svg>
              )}

              {i === 1 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, flex: 1, minHeight: 0 }}>
                  {[0, 1, 2, 3].map((tile) => (
                    <div
                      key={tile}
                      style={{
                        width: "calc(50% - 5px)",
                        height: "calc(50% - 5px)",
                        borderRadius: 12,
                        background:
                          tile % 2 === 0
                            ? "linear-gradient(140deg, rgba(90,169,230,0.35), rgba(5,22,42,0.9))"
                            : "linear-gradient(140deg, rgba(186,230,253,0.25), rgba(5,22,42,0.9))",
                        border: `1px solid ${props.accentColor}44`,
                        position: "relative",
                        overflow: "hidden",
                        transform: `translateY(${Math.sin(frame / 34 + tile) * 4}px)`,
                      }}
                    >
                      {tile === 0 && (
                        <svg viewBox="0 0 120 70" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                          <polygon points="0,70 36,26 62,58 84,34 120,70" fill={props.accentColor} opacity={0.55} />
                          <circle cx={94} cy={18} r={8} fill="#BAE6FD" opacity={0.9} />
                        </svg>
                      )}
                      {tile === 1 && (
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Play size={26} color={props.textColor} fill={props.textColor} />
                        </div>
                      )}
                      {tile === 2 && (
                        <svg viewBox="0 0 120 70" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                          {[0, 1, 2].map((k) => (
                            <path
                              key={k}
                              d={`M0 ${44 + k * 8} Q 30 ${30 + k * 6 + Math.sin(frame / 18 + k) * 5}, 60 ${40 + k * 6} T 120 ${38 + k * 6}`}
                              fill="none"
                              stroke={props.accentColor}
                              strokeWidth={2}
                              opacity={0.7 - k * 0.15}
                            />
                          ))}
                        </svg>
                      )}
                      {tile === 3 && (
                        <span
                          style={{
                            position: "absolute",
                            bottom: 8,
                            left: 10,
                            fontFamily: "monospace",
                            fontSize: 10,
                            color: props.textColor,
                            opacity: 0.75,
                          }}
                        >
                          4K CLIP
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {i === 2 && (
                <>
                  <svg viewBox="0 0 360 210" style={{ width: "100%", flex: 1, minHeight: 0 }}>
                    <ellipse cx={180} cy={100} rx={120} ry={44} fill="none" stroke={props.accentColor} strokeWidth={1.2} opacity={0.4} transform="rotate(-14 180 100)" />
                    <ellipse cx={180} cy={100} rx={120} ry={44} fill="none" stroke="#BAE6FD" strokeWidth={1.2} opacity={0.25} transform="rotate(34 180 100)" />
                    <path
                      d={`M60 140 C 110 ${70 + Math.sin(frame / 22) * 12}, 200 150, 300 62`}
                      fill="none"
                      stroke={props.accentColor}
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeDasharray="320"
                      strokeDashoffset={320 - ((frame * 2.2) % 320)}
                    />
                    <circle cx={180} cy={100} r={26} fill="rgba(90,169,230,0.18)" stroke={props.accentColor} strokeWidth={2} />
                    {[0, 1, 2].map((dot) => {
                      const a = frame / 26 + (dot * Math.PI * 2) / 3;
                      return <circle key={dot} cx={180 + Math.cos(a) * 120} cy={100 + Math.sin(a) * 44} r={6} fill={props.accentColor} />;
                    })}
                  </svg>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["SPRING PHYSICS", "MASKING", "BEZIER"].map((label, k) => {
                      const s = spring({ frame: frame - 160 - k * 12, fps, config: { damping: 15, stiffness: 120 } });
                      return (
                        <span
                          key={label}
                          style={{
                            opacity: s,
                            transform: `translateY(${interpolate(s, [0, 1], [12, 0], CLAMP)}px)`,
                            fontFamily: "monospace",
                            fontSize: 10,
                            letterSpacing: 1,
                            color: props.textColor,
                            padding: "6px 9px",
                            borderRadius: 99,
                            border: `1px solid ${props.accentColor}55`,
                          }}
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </>
              )}
            </SpatialCard>
          ))}
        </DepthStage>
      </div>

      <SceneSfx name="whoosh" frame={130} volume={0.18} />
    </AbsoluteFill>
  );
};
