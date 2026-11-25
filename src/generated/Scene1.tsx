import type { CSSProperties } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { DepthStage, SpatialCard } from "../components/Depth25D";
import { SceneSfx } from "../components/SceneSfx";
import { Film, Play, Sparkles } from "lucide-react";

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
const CLAMP = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};
const NODES = [30, 277, 523, 770];
const NODE_LABELS = ["الفكرة", "المشهد", "الحركة", "النشر"];

export const Scene1 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const k = Math.min(width, height) / 1080;
  const f = (n: number) => Math.round(n * k);
  const dir = props.isRtl ? "rtl" : "ltr";

  const exit = interpolate(
    frame,
    [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)],
    [1, 0],
    CLAMP,
  );
  const grow = interpolate(frame, [30, 380], [0, 1], CLAMP);
  const recA = Math.min(1, Math.max(0, spring({ frame: frame - 250, fps, config: { damping: 200, mass: 0.9, stiffness: 90 } })));
  const recB = Math.min(1, Math.max(0, spring({ frame: frame - 470, fps, config: { damping: 200, mass: 0.9, stiffness: 90 } })));

  const card = (extra?: CSSProperties): CSSProperties => ({
    background: props.surfaceColor,
    border: `1px solid ${props.accentColor}55`,
    borderRadius: f(32),
    padding: `${f(28)}px ${f(34)}px`,
    direction: dir,
    textAlign: "center",
    maxWidth: "100%",
    boxSizing: "border-box",
    ...extra,
  });

  const chip: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: `${f(8)}px ${f(16)}px`,
    borderRadius: 999,
    background: props.secondaryColor,
    border: `1px solid ${props.accentColor}55`,
    color: props.accentColor,
    fontSize: f(22),
    fontWeight: 800,
  };

  const wrap: CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    padding: `0 ${f(12)}px`,
    transform: "translate(-50%, -50%)",
    boxSizing: "border-box",
  };

  return (
    <AbsoluteFill style={{ backgroundColor: props.bgColor, overflow: "hidden", direction: dir, fontFamily: FONT }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 72% 24%, ${props.accentColor}26 0%, transparent 46%), radial-gradient(circle at 22% 80%, ${props.secondaryColor} 0%, transparent 58%)` }} />
      <div style={{ position: "absolute", inset: "-12%", background: `radial-gradient(circle at 50% 50%, ${props.accentColor}0F 0%, transparent 62%)`, transform: `translate(${Math.sin(frame * 0.008) * 26}px, ${Math.cos(frame * 0.01) * 20}px)` }} />

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.16, direction: "ltr" }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={`v${i}`} x1={(i * 100) / 11} y1={0} x2={(i * 100) / 11} y2={100} stroke={props.secondaryColor} strokeWidth={0.15} />
        ))}
        {Array.from({ length: 18 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={(i * 100) / 17} x2={100} y2={(i * 100) / 17} stroke={props.secondaryColor} strokeWidth={0.15} />
        ))}
      </svg>

      {Array.from({ length: 16 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: `${(i * 37) % 100}%`,
            left: `${(i * 61) % 100}%`,
            width: f(3 + (i % 3) * 2),
            height: f(3 + (i % 3) * 2),
            borderRadius: "50%",
            background: i % 2 === 0 ? props.accentColor : props.textColor,
            opacity: 0.24,
            transform: `translateY(${Math.sin(frame * 0.02 + i) * f(18)}px)`,
          }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          top: "12%",
          left: "6%",
          right: "16%",
          bottom: "28%",
          display: "flex",
          flexDirection: "column",
          gap: f(16),
          opacity: exit,
          transform: `translateY(${(1 - exit) * -20}px) scale(${0.985 + 0.015 * exit})`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: f(14), direction: dir, minHeight: f(40) }}>
          <span style={chip}>٠١</span>
          <span style={{ fontSize: f(24), color: props.textColor, opacity: 0.82, lineHeight: 1.4 }}>تعريف سريع</span>
          <span style={{ flex: 1, height: 1, background: `${props.textColor}20`, minWidth: f(20) }} />
          <Film size={f(26)} color={props.accentColor} />
        </div>

        <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
          <DepthStage style={{ position: "absolute", inset: 0 }}>
            <div
              style={{
                ...wrap,
                transform: `translate(-50%, -50%) translate(${(props.isRtl ? -1 : 1) * f(90) * recA}px, ${-f(34) * recA}px)`,
                visibility: frame > 372 ? "hidden" : "visible",
              }}
            >
              <SpatialCard enterFrame={0} recedeFrame={250} tiltX={-7} tiltY={props.isRtl ? 5 : -5} shadowColor={`${props.bgColor}CC`}>
                <div style={card({ padding: `${f(40)}px ${f(40)}px` })}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: f(20), direction: dir, flexWrap: "wrap" }}>
                    <span style={{ width: f(78), height: f(78), borderRadius: f(24), background: props.bgColor, border: `1px solid ${props.accentColor}66`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Play size={f(38)} color={props.accentColor} fill={props.accentColor} />
                    </span>
                    <div style={{ fontSize: f(94), fontWeight: 900, lineHeight: 1.18, color: props.textColor }}>
                      فيديو <span style={{ color: props.accentColor }}>حول</span>
                    </div>
                  </div>
                  <div style={{ marginTop: f(18), fontSize: f(30), lineHeight: 1.5, color: props.textColor, opacity: 0.88 }}>
                    كل فكرة تستحق أن تُرى
                  </div>
                </div>
              </SpatialCard>
            </div>

            <div
              style={{
                ...wrap,
                transform: `translate(-50%, -50%) translate(${(props.isRtl ? 1 : -1) * f(80) * recB}px, ${-f(28) * recB}px)`,
                visibility: frame > 592 ? "hidden" : "visible",
              }}
            >
              <SpatialCard enterFrame={310} recedeFrame={470} tiltX={5} tiltY={props.isRtl ? -4 : 4} shadowColor={`${props.bgColor}CC`}>
                <div style={card()}>
                  <div style={{ fontSize: f(24), color: props.accentColor, fontWeight: 800, marginBottom: f(10) }}>ثلاث طبقات</div>
                  <div style={{ fontSize: f(54), fontWeight: 900, lineHeight: 1.25, color: props.textColor }}>حركة ولون وصوت</div>
                  <div style={{ display: "flex", gap: f(10), justifyContent: "center", marginTop: f(20), direction: dir, flexWrap: "wrap" }}>
                    {["حركة", "لون", "صوت"].map((tag, i) => {
                      const p = Math.min(1, Math.max(0, spring({ frame: frame - (340 + i * 12), fps, config: { damping: 16, mass: 0.7, stiffness: 130 } })));
                      return (
                        <span key={tag} style={{ padding: `${f(10)}px ${f(20)}px`, borderRadius: 999, background: props.bgColor, border: `1px solid ${props.accentColor}55`, color: props.textColor, fontSize: f(24), fontWeight: 700, opacity: 0.4 + 0.6 * p, transform: `translateY(${(1 - p) * f(12)}px)` }}>
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </SpatialCard>
            </div>

            <div style={wrap}>
              <SpatialCard enterFrame={530} tiltX={-4} tiltY={props.isRtl ? 4 : -4} shadowColor={`${props.bgColor}CC`}>
                <div style={card({ border: `1px solid ${props.accentColor}88` })}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: f(16), direction: dir, flexWrap: "wrap" }}>
                    <span style={{ width: f(64), height: f(64), borderRadius: f(20), background: props.bgColor, border: `1px solid ${props.accentColor}66`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Sparkles size={f(32)} color={props.accentColor} />
                    </span>
                    <div style={{ fontSize: f(56), fontWeight: 900, lineHeight: 1.25, color: props.textColor }}>فيديو يصنع الفرق</div>
                  </div>
                  <div style={{ marginTop: f(16), fontSize: f(26), lineHeight: 1.5, color: props.textColor, opacity: 0.85 }}>
                    استوديو ZoEdit — من الفكرة إلى الشاشة
                  </div>
                </div>
              </SpatialCard>
            </div>
          </DepthStage>
        </div>

        <div style={{ background: props.surfaceAltColor, border: `1px solid ${props.textColor}22`, borderRadius: f(26), padding: `${f(20)}px ${f(24)}px`, direction: dir }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", direction: dir, marginBottom: f(6) }}>
            <span style={{ fontSize: f(26), fontWeight: 800, color: props.textColor, lineHeight: 1.4 }}>من الفكرة إلى النشر</span>
            <span style={{ fontSize: f(20), color: props.accentColor, fontWeight: 700 }}>خط زمني</span>
          </div>
          <svg viewBox="0 0 800 120" style={{ width: "100%", height: f(122), direction: "ltr", overflow: "visible" }}>
            <path d="M 30 40 H 770" fill="none" stroke={props.secondaryColor} strokeWidth={8} strokeLinecap="round" />
            <path
              d="M 30 40 H 770"
              fill="none"
              stroke={props.accentColor}
              strokeWidth={8}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - grow}
              style={{ filter: `drop-shadow(0 0 10px ${props.accentColor}AA)` }}
            />
            {NODES.map((x, i) => {
              const p = Math.min(1, Math.max(0, spring({ frame: frame - (40 + i * 12), fps, config: { damping: 12, mass: 0.6, stiffness: 140 } })));
              const reached = 30 + 740 * grow >= x;
              return (
                <g key={x}>
                  <circle cx={x} cy={40} r={f(7) + p * f(3)} fill={reached ? props.accentColor : props.surfaceColor} stroke={props.accentColor} strokeWidth={3} />
                  <text x={x} y={92} textAnchor="middle" direction="rtl" style={{ fontFamily: FONT, fontSize: f(20), fill: props.textColor, opacity: 0.85 }}>
                    {NODE_LABELS[i]}
                  </text>
                </g>
              );
            })}
            <circle cx={30 + 740 * grow} cy={40} r={f(9) + Math.sin(frame * 0.14) * 2} fill={props.accentColor} style={{ filter: `drop-shadow(0 0 12px ${props.accentColor})` }} />
          </svg>
        </div>
      </div>

      <SceneSfx name="pop" frame={310} volume={0.18} />
    </AbsoluteFill>
  );
};
