import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ArrowUpRight, Code2, Terminal } from "lucide-react";
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

const NODES = [
  [12, 24],
  [26, 44],
  [44, 22],
  [58, 50],
  [72, 26],
  [84, 46],
  [38, 68],
  [66, 70],
];

const COMMAND = "npx zofstudio";

export const Scene5 = (props: Props) => {
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
  const typed = COMMAND.slice(
    0,
    Math.max(0, Math.floor(interpolate(frame, [158, 200], [0, COMMAND.length], CLAMP))),
  );
  const axisX = 58;
  const baseY = 190;
  const ticks = [0, 20, 40, 60];

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
          background: `radial-gradient(circle at 76% 24%, ${props.accentColor}22, transparent 56%), radial-gradient(circle at 20% 76%, #255C9933, transparent 55%)`,
        }}
      />
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: 0.2 }}>
        {NODES.map(([x, y], i) =>
          NODES.slice(i + 1).map(([x2, y2], j) => (
            <line
              key={`l${i}-${j}`}
              x1={(x / 100) * width}
              y1={(y / 100) * height}
              x2={(x2 / 100) * width}
              y2={(y2 / 100) * height}
              stroke={props.accentColor}
              strokeWidth={1}
              strokeDasharray="4 10"
              strokeDashoffset={-(frame * 0.7) % 14}
            />
          )),
        )}
        {NODES.map(([x, y], i) => (
          <circle
            key={`n${i}`}
            cx={(x / 100) * width}
            cy={(y / 100) * height}
            r={4 + Math.abs(Math.sin(frame / 36 + i)) * 3}
            fill={props.accentColor}
            opacity={0.6}
          />
        ))}
      </svg>

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
          OPEN SOURCE · FOREVER FREE
        </div>
        <div
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 900,
            fontSize: unit * 0.06,
            lineHeight: 1.12,
            letterSpacing: -1.8,
            color: props.textColor,
          }}
        >
          Zof Studio is free and{" "}
          <span style={{ color: props.accentColor }}>open source.</span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: "23%",
          bottom: "27%",
          left: "6%",
          right: "6%",
          opacity: exit,
          transform: `translateY(${(1 - exit) * 16}px)`,
        }}
      >
        <DepthStage style={{ flexDirection: "column", gap: unit * 0.02 }}>
          <SpatialCard
            enterFrame={8}
            recedeFrame={150}
            tiltY={props.isRtl ? -7 : 7}
            shadowColor="rgba(2,6,23,0.65)"
            style={{
              width: "90%",
              maxWidth: 660,
              height: "56%",
              borderRadius: 24,
              padding: "16px 20px",
              background: "rgba(240,248,255,0.05)",
              border: `1px solid ${props.accentColor}55`,
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontFamily: "monospace", fontSize: 12, letterSpacing: 2.5, color: props.textColor }}>
                COST TO LAUNCH
              </span>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 10,
                  letterSpacing: 1.5,
                  color: props.accentColor,
                  padding: "4px 8px",
                  borderRadius: 99,
                  border: `1px solid ${props.accentColor}55`,
                }}
              >
                MIT LICENSE
              </span>
            </div>
            <svg viewBox="0 0 560 230" style={{ width: "100%", height: "auto", display: "block" }}>
              <line x1={axisX} y1={16} x2={axisX} y2={baseY} stroke={props.accentColor} strokeWidth={1.5} opacity={0.45} />
              <line x1={axisX} y1={baseY} x2={530} y2={baseY} stroke={props.accentColor} strokeWidth={1.5} opacity={0.45} />
              {ticks.map((tick) => {
                const y = baseY - (tick / 60) * 150;
                return (
                  <g key={tick}>
                    <line x1={axisX} y1={y} x2={530} y2={y} stroke={props.accentColor} strokeWidth={1} strokeDasharray="3 9" opacity={0.18} />
                    <text x={axisX - 14} y={y + 4} textAnchor="end" fontSize={11} fill={props.mutedColor} fontFamily="monospace">
                      ${tick}
                    </text>
                  </g>
                );
              })}
              {[
                { label: "Template tools", value: 49, x: 118, color: "rgba(240,248,255,0.3)", caption: "$49 / mo" },
                { label: "Zof Studio", value: 0, x: 308, color: props.accentColor, caption: "FREE" },
              ].map((bar, i) => {
                const s = spring({ frame: frame - 24 - i * 12, fps, config: { damping: 16, stiffness: 105 } });
                const h = bar.value === 0 ? 5 * s : (bar.value / 60) * 150 * s;
                return (
                  <g key={bar.label}>
                    <rect x={bar.x} y={baseY - h} width={104} height={h} rx={7} fill={bar.color} />
                    <text x={bar.x + 52} y={baseY - h - 10} textAnchor="middle" fontSize={14} fontWeight={800} fill={props.textColor} fontFamily="monospace">
                      {bar.caption}
                    </text>
                    <text x={bar.x + 52} y={baseY + 22} textAnchor="middle" fontSize={12} fill={props.mutedColor} fontFamily="monospace">
                      {bar.label}
                    </text>
                  </g>
                );
              })}
              <text x={axisX} y={16} fontSize={10} fill={props.mutedColor} fontFamily="monospace">
                USD / MONTH
              </text>
            </svg>
          </SpatialCard>

          <SpatialCard
            enterFrame={150}
            tiltY={props.isRtl ? 5 : -5}
            shadowColor="rgba(0,0,0,0.7)"
            style={{
              width: "90%",
              maxWidth: 620,
              borderRadius: 20,
              padding: "14px 18px",
              background: "rgba(5,22,42,0.96)",
              border: `1px solid ${props.accentColor}88`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5AA9E6" }} />
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#BAE6FD", opacity: 0.7 }} />
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#255C99" }} />
              <Terminal size={14} color={props.mutedColor} style={{ marginLeft: 6 }} />
              <span style={{ fontFamily: "monospace", fontSize: 10, color: props.mutedColor, letterSpacing: 1 }}>bash · zof-studio</span>
            </div>
            <div style={{ fontFamily: "monospace", fontSize: unit * 0.03, color: props.textColor, letterSpacing: 0.5 }}>
              <span style={{ color: props.accentColor, marginRight: 8 }}>$</span>
              {typed}
              <span style={{ color: props.accentColor, opacity: Math.sin(frame / 7) > 0 ? 1 : 0 }}>▌</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <ArrowUpRight size={Math.round(unit * 0.022)} color={props.accentColor} />
              <span style={{ fontSize: unit * 0.02, fontWeight: 800, color: props.textColor }}>studio.zoedit.com</span>
              <span style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: unit * 0.011, color: props.mutedColor }}>
                TRY IT FREE
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
              {["OPEN SOURCE", "ZERO COST", "COMMUNITY"].map((chip, i) => {
                const s = spring({ frame: frame - 220 - i * 12, fps, config: { damping: 14, stiffness: 130 } });
                return (
                  <span
                    key={chip}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      opacity: s,
                      transform: `translateY(${interpolate(s, [0, 1], [10, 0], CLAMP)}px)`,
                      fontFamily: "monospace",
                      fontSize: 10,
                      letterSpacing: 1,
                      color: props.textColor,
                      padding: "5px 9px",
                      borderRadius: 99,
                      border: `1px solid ${props.accentColor}44`,
                      background: "rgba(90,169,230,0.1)",
                    }}
                  >
                    {i === 0 && <Code2 size={11} color={props.accentColor} />}
                    {chip}
                  </span>
                );
              })}
            </div>
          </SpatialCard>
        </DepthStage>
      </div>

      <SceneSfx name="pop" frame={150} volume={0.18} />
    </AbsoluteFill>
  );
};
