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
import { SmartIcon } from "../components/SmartIcon";
import { Check, X } from "lucide-react";

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

export const Scene2 = (props: Props) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const dir = props.isRtl ? "rtl" : "ltr";
  const align = props.isRtl ? "right" : "left";
  const k = Math.min(width, height) / 1080;
  const f = (n: number) => Math.round(n * k);

  const exit = interpolate(
    frame,
    [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)],
    [1, 0],
    CLAMP,
  );
  const draw = interpolate(frame, [30, 430], [0, 1], CLAMP);
  const badgeP = Math.min(1, Math.max(0, spring({ frame: frame - 150, fps, config: { damping: 14, mass: 0.7, stiffness: 120 } })));

  const chip: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: `${f(8)}px ${f(16)}px`,
    borderRadius: 999,
    background: props.secondaryColor,
    border: `1px solid ${props.accentColor}55`,
    color: props.accentColor,
    fontSize: f(22),
    fontWeight: 800,
  };

  const column = (good: boolean): CSSProperties => ({
    width: "100%",
    background: good ? props.surfaceColor : props.surfaceAltColor,
    border: `1px solid ${good ? `${props.accentColor}66` : `${props.textColor}26`}`,
    borderRadius: f(30),
    padding: `${f(24)}px ${f(22)}px`,
    direction: dir,
    textAlign: align,
    boxSizing: "border-box",
  });

  const list = (items: string[], good: boolean, base: number) => (
    <div style={{ display: "flex", flexDirection: "column", gap: f(14), marginTop: f(18) }}>
      {items.map((label, i) => {
        const p = Math.min(1, Math.max(0, spring({ frame: frame - (base + i * 12), fps, config: { damping: 16, mass: 0.7, stiffness: 130 } })));
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: f(12), direction: dir, opacity: p, transform: `translateY(${(1 - p) * f(14)}px)` }}>
            <span style={{ width: f(30), height: f(30), borderRadius: f(10), background: good ? props.accentColor : props.bgColor, border: `1px solid ${good ? props.accentColor : `${props.textColor}33`}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {good ? <Check size={f(18)} color={props.secondaryColor} /> : <X size={f(18)} color={props.mutedColor} />}
            </span>
            <span style={{ fontSize: f(24), lineHeight: 1.4, color: props.textColor, opacity: good ? 1 : 0.88 }}>{label}</span>
          </div>
        );
      })}
    </div>
  );

  const header = (good: boolean) => (
    <div style={{ display: "flex", alignItems: "center", gap: f(12), direction: dir }}>
      <span style={{ width: f(58), height: f(58), borderRadius: f(18), background: props.bgColor, border: `1px solid ${good ? `${props.accentColor}66` : `${props.textColor}24`}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {good ? <SmartIcon query="rocket" size={f(34)} color={props.accentColor} /> : <SmartIcon query="hourglass" size={f(34)} color={props.mutedColor} />}
      </span>
      <div>
        <div style={{ fontSize: f(27), fontWeight: 800, color: props.textColor, lineHeight: 1.25 }}>{good ? "مع ZoEdit" : "الطريقة القديمة"}</div>
        <div style={{ fontSize: f(18), color: props.textColor, opacity: 0.8, lineHeight: 1.4 }}>{good ? "كل شيء في مكان واحد" : "أدوات متفرقة"}</div>
      </div>
    </div>
  );

  const footer = (good: boolean) => (
    <div style={{ marginTop: f(22), paddingTop: f(16), borderTop: `1px solid ${props.textColor}1F`, display: "flex", justifyContent: "space-between", alignItems: "baseline", direction: dir, gap: f(8) }}>
      <span style={{ fontSize: f(good ? 38 : 30), fontWeight: 900, color: good ? props.accentColor : props.textColor, opacity: good ? 1 : 0.82 }}>{good ? "أسرع ٣×" : "أبطأ"}</span>
      <span style={{ fontSize: f(18), color: props.textColor, opacity: 0.8 }}>{good ? "إبداع متكامل" : "وقت وتركيز"}</span>
    </div>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: props.bgColor, overflow: "hidden", direction: dir, fontFamily: FONT }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 80% 18%, ${props.accentColor}22, transparent 44%), radial-gradient(circle at 18% 82%, ${props.secondaryColor}, transparent 56%)` }} />
      <div style={{ position: "absolute", width: f(620), height: f(620), borderRadius: "50%", border: `1px solid ${props.accentColor}22`, top: "6%", right: "-12%", transform: `scale(${1 + Math.sin(frame * 0.02) * 0.04})` }} />
      <div style={{ position: "absolute", width: f(380), height: f(380), borderRadius: "50%", border: `1px solid ${props.textColor}12`, bottom: "18%", left: "-8%", transform: `scale(${1 + Math.cos(frame * 0.025) * 0.05})` }} />

      <svg viewBox="0 0 1080 1920" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", direction: "ltr" }}>
        <path
          d="M -60 1380 C 240 1140 360 1440 620 1180 S 980 820 1140 980"
          fill="none"
          stroke={props.accentColor}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.2}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - draw}
          style={{ filter: `drop-shadow(0 0 10px ${props.accentColor}55)` }}
        />
      </svg>

      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: `${(i * 43) % 100}%`,
            left: `${(i * 57) % 100}%`,
            width: f(3 + (i % 2) * 2),
            height: f(3 + (i % 2) * 2),
            borderRadius: "50%",
            background: props.accentColor,
            opacity: 0.18,
            transform: `translateY(${Math.sin(frame * 0.018 + i) * f(16)}px)`,
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
          gap: f(20),
          opacity: exit,
          transform: `translateY(${(1 - exit) * -20}px) scale(${0.986 + 0.014 * exit})`,
        }}
      >
        <div style={{ direction: dir, textAlign: align }}>
          <span style={chip}>مقارنة</span>
          <div style={{ marginTop: f(12), fontSize: f(70), fontWeight: 900, lineHeight: 1.2, color: props.textColor }}>
            منصتنا <span style={{ color: props.accentColor }}>ZoEdit</span>
          </div>
          <div style={{ marginTop: f(6), fontSize: f(26), lineHeight: 1.5, color: props.textColor, opacity: 0.85 }}>
            أدوات أكثر... وخطوات أقل
          </div>
        </div>

        <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
          <DepthStage style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "15%" }}>
              <SpatialCard enterFrame={10} tiltX={-4} tiltY={props.isRtl ? 5 : -5} shadowColor={`${props.bgColor}CC`} style={{ width: "42.5%" }}>
                <div style={column(false)}>
                  {header(false)}
                  {list(["ملفات متفرقة", "خطوات معقّدة", "وقت ضائع"], false, 40)}
                  {footer(false)}
                </div>
              </SpatialCard>

              <span style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(-50%, -50%) scale(${0.7 + 0.3 * badgeP})`, opacity: badgeP, width: f(84), height: f(84), borderRadius: "50%", background: props.bgColor, border: `2px solid ${props.accentColor}88`, boxShadow: `0 0 32px ${props.accentColor}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: f(20), fontWeight: 800, color: props.accentColor }}>مقابل</span>
              </span>

              <SpatialCard enterFrame={40} tiltX={4} tiltY={props.isRtl ? -5 : 5} shadowColor={`${props.bgColor}CC`} style={{ width: "42.5%" }}>
                <div style={column(true)}>
                  {header(true)}
                  {list(["أدوات موحّدة", "سحب وإفلات", "إبداع فوري"], true, 70)}
                  {footer(true)}
                </div>
              </SpatialCard>
            </div>
          </DepthStage>
        </div>
      </div>

      <SceneSfx name="check" frame={140} volume={0.18} />
    </AbsoluteFill>
  );
};
