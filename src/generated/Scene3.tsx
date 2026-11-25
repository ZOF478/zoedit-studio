import type { CSSProperties } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { DepthStage, SpatialCard } from "../components/Depth25D";
import { SceneSfx } from "../components/SceneSfx";
import { SmartIcon } from "../components/SmartIcon";
import {
  Activity,
  ArrowLeft,
  Film,
  Music2,
  Palette,
  Play,
  Scissors,
} from "lucide-react";

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
const CURVE = "M 24 140 C 90 136 112 46 180 62 S 292 148 376 48";
const KEYS: [number, number][] = [
  [24, 140],
  [180, 62],
  [376, 48],
];
const TOOLS = [Film, Scissors, Music2, Palette];

export const Scene3 = (props: Props) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const k = Math.min(width, height) / 1080;
  const f = (n: number) => Math.round(n * k);
  const dir = props.isRtl ? "rtl" : "ltr";
  const align = props.isRtl ? "right" : "left";

  const exit = interpolate(
    frame,
    [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)],
    [1, 0],
    CLAMP,
  );
  const orbit = interpolate(frame, [0, 500], [0, 1], CLAMP);
  const motion = interpolate(frame, [150, 380], [0, 1], CLAMP);

  const viewW = width * 0.78;
  const boardW = width * 0.56;
  const gap = width * 0.05;
  const step = boardW + gap;
  const startPan = viewW / 2 - boardW / 2;
  const endPan = viewW / 2 - (2 * step + boardW / 2);
  const pan =
    interpolate(frame, [40, 520], [startPan, endPan], { ...CLAMP, easing: Easing.inOut(Easing.cubic) }) +
    Math.sin(frame * 0.012) * f(3) * interpolate(frame, [80, 160], [0, 1], CLAMP);

  const board: CSSProperties = {
    width: "100%",
    background: props.surfaceColor,
    border: `1px solid ${props.accentColor}44`,
    borderRadius: f(30),
    padding: f(26),
    direction: dir,
    textAlign: align,
    boxSizing: "border-box",
    boxShadow: `0 22px 60px ${props.bgColor}CC`,
  };

  const chip: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: `${f(7)}px ${f(16)}px`,
    borderRadius: 999,
    background: props.secondaryColor,
    border: `1px solid ${props.accentColor}55`,
    color: props.accentColor,
    fontSize: f(20),
    fontWeight: 800,
  };

  const slot: CSSProperties = {
    position: "absolute",
    top: 0,
    width: boardW,
    height: "100%",
    display: "flex",
    alignItems: "center",
  };

  return (
    <AbsoluteFill style={{ backgroundColor: props.bgColor, overflow: "hidden", direction: dir, fontFamily: FONT }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 78% 22%, ${props.accentColor}24, transparent 46%), radial-gradient(circle at 20% 84%, ${props.secondaryColor}, transparent 58%)` }} />
      <div
        style={{
          position: "absolute",
          top: "7%",
          left: "-10%",
          right: "-10%",
          textAlign: "center",
          fontSize: f(238),
          fontWeight: 900,
          lineHeight: 1,
          color: props.secondaryColor,
          opacity: 0.6,
          transform: `translateX(${pan * 0.12}px)`,
          whiteSpace: "nowrap",
        }}
      >
        استوديو
      </div>
      <div style={{ position: "absolute", width: f(700), height: f(700), borderRadius: "50%", border: `1px solid ${props.accentColor}1F`, top: "20%", left: "10%", transform: `scale(${1 + Math.sin(frame * 0.018) * 0.03})` }} />
      <div style={{ position: "absolute", width: f(420), height: f(420), borderRadius: "50%", border: `1px solid ${props.textColor}12`, bottom: "14%", right: "4%", transform: `scale(${1 + Math.cos(frame * 0.022) * 0.04})` }} />

      <svg viewBox="0 0 1080 1920" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", direction: "ltr" }}>
        <path
          d="M -40 1520 C 260 1260 420 1560 700 1240 S 1040 940 1160 1080"
          fill="none"
          stroke={props.accentColor}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.16}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - orbit}
        />
      </svg>

      {Array.from({ length: 14 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: `${(i * 41) % 100}%`,
            left: `${(i * 59) % 100}%`,
            width: f(3 + (i % 2) * 2),
            height: f(3 + (i % 2) * 2),
            borderRadius: "50%",
            background: i % 3 === 0 ? props.textColor : props.accentColor,
            opacity: 0.2,
            transform: `translateY(${Math.sin(frame * 0.016 + i) * f(14)}px)`,
          }}
        />
      ))}

      <div style={{ position: "absolute", inset: 0, opacity: exit, transform: `translateY(${(1 - exit) * -20}px) scale(${0.986 + 0.014 * exit})` }}>
        <div style={{ position: "absolute", top: "12%", left: "6%", right: "16%", display: "flex", justifyContent: "space-between", alignItems: "center", direction: dir, gap: f(10) }}>
          <span style={chip}>الفصل ٠٣</span>
          <span style={{ fontSize: f(21), color: props.textColor, opacity: 0.8, lineHeight: 1.4 }}>جولة داخل الاستوديو</span>
        </div>

        <div
          style={{
            position: "absolute",
            top: "22%",
            left: "6%",
            right: "16%",
            bottom: "28%",
            borderRadius: f(34),
            overflow: "hidden",
            border: `1px solid ${props.accentColor}33`,
            background: props.surfaceAltColor,
            boxShadow: `0 30px 80px ${props.bgColor}CC`,
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 18%, ${props.accentColor}1F, transparent 62%)` }} />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.16, direction: "ltr" }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <line key={i} x1={(i * 100) / 8} y1={0} x2={(i * 100) / 8} y2={100} stroke={props.textColor} strokeWidth={0.12} />
            ))}
          </svg>

          <DepthStage style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: 3 * boardW + 2 * gap, transform: `translateX(${pan}px)` }}>
              <div style={{ ...slot, left: 0 }}>
                <SpatialCard enterFrame={0} recedeFrame={230} tiltX={-5} tiltY={props.isRtl ? 4 : -4} shadowColor={`${props.bgColor}DD`}>
                  <div style={board}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", direction: dir, marginBottom: f(14) }}>
                      <span style={chip}>معاينة</span>
                      <Film size={f(26)} color={props.accentColor} />
                    </div>
                    <div style={{ fontSize: f(32), fontWeight: 800, lineHeight: 1.3, color: props.textColor }}>فيديو تعريفي</div>
                    <div style={{ position: "relative", marginTop: f(16), height: f(300), borderRadius: f(20), background: `linear-gradient(150deg, ${props.secondaryColor}, ${props.bgColor})`, border: `1px solid ${props.accentColor}33`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 0%, ${props.accentColor}33, transparent 65%)` }} />
                      <span style={{ width: f(90), height: f(90), borderRadius: "50%", background: props.accentColor, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 44px ${props.accentColor}88` }}>
                        <Play size={f(40)} color={props.secondaryColor} fill={props.secondaryColor} />
                      </span>
                      <div style={{ position: "absolute", left: f(18), right: f(18), bottom: f(16), height: f(6), borderRadius: 99, background: `${props.textColor}22` }}>
                        <div style={{ width: `${30 + Math.sin(frame * 0.05) * 25}%`, height: "100%", borderRadius: 99, background: props.accentColor }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: f(14), direction: dir, fontSize: f(19), color: props.textColor, opacity: 0.82 }}>
                      <span>المدة ٠:٣٠</span>
                      <span>دقة عالية</span>
                    </div>
                  </div>
                </SpatialCard>
              </div>

              <div style={{ ...slot, left: step }}>
                <SpatialCard enterFrame={80} recedeFrame={470} tiltX={4} tiltY={props.isRtl ? -4 : 4} shadowColor={`${props.bgColor}DD`}>
                  <div style={board}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", direction: dir, marginBottom: f(14) }}>
                      <span style={chip}>الحركة</span>
                      <Activity size={f(26)} color={props.accentColor} />
                    </div>
                    <div style={{ fontSize: f(32), fontWeight: 800, lineHeight: 1.3, color: props.textColor }}>مسار حركة سلس</div>
                    <svg viewBox="0 0 400 180" style={{ width: "100%", height: f(190), direction: "ltr", overflow: "visible", marginTop: f(8) }}>
                      <line x1={24} y1={150} x2={376} y2={150} stroke={props.textColor} strokeWidth={2} opacity={0.14} />
                      <path
                        d={CURVE}
                        fill="none"
                        stroke={props.accentColor}
                        strokeWidth={5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        pathLength={1}
                        strokeDasharray={1}
                        strokeDashoffset={1 - motion}
                        style={{ filter: `drop-shadow(0 0 8px ${props.accentColor}88)` }}
                      />
                      {KEYS.map(([x, y], i) => {
                        const p = Math.min(1, Math.max(0, spring({ frame: frame - (180 + i * 12), fps, config: { damping: 12, mass: 0.6, stiffness: 140 } })));
                        return <circle key={i} cx={x} cy={y} r={f(4) + p * f(3)} fill={props.accentColor} stroke={props.bgColor} strokeWidth={2} />;
                      })}
                      <text x={24} y={174} textAnchor="middle" direction="rtl" style={{ fontFamily: FONT, fontSize: f(16), fill: props.textColor, opacity: 0.8 }}>البداية</text>
                      <text x={376} y={174} textAnchor="middle" direction="rtl" style={{ fontFamily: FONT, fontSize: f(16), fill: props.textColor, opacity: 0.8 }}>النهاية</text>
                    </svg>
                    <div style={{ display: "flex", gap: f(10), marginTop: f(12), direction: dir, flexWrap: "wrap" }}>
                      {["سهولة", "دقة", "تحكم"].map((tag) => (
                        <span key={tag} style={{ padding: `${f(7)}px ${f(14)}px`, borderRadius: 999, background: props.surfaceAltColor, border: `1px solid ${props.accentColor}44`, color: props.textColor, fontSize: f(19), fontWeight: 700 }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </SpatialCard>
              </div>

              <div style={{ ...slot, left: step * 2 }}>
                <SpatialCard enterFrame={280} tiltX={-3} tiltY={props.isRtl ? 3 : -3} shadowColor={`${props.bgColor}DD`}>
                  <div style={{ ...board, textAlign: "center" }}>
                    <span style={chip}>الهوية البصرية</span>
                    <div style={{ display: "flex", justifyContent: "center", marginTop: f(14) }}>
                      <span style={{ width: f(84), height: f(84), borderRadius: f(26), background: props.bgColor, border: `1px solid ${props.accentColor}66`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <SmartIcon query="sparkles" size={f(44)} color={props.accentColor} />
                      </span>
                    </div>
                    <div style={{ marginTop: f(12), fontSize: f(62), fontWeight: 900, lineHeight: 1.2, color: props.textColor }}>
                      استوديو <span style={{ color: props.accentColor }}>ZoEdit</span>
                    </div>
                    <div style={{ marginTop: f(8), fontSize: f(26), lineHeight: 1.5, color: props.textColor, opacity: 0.88 }}>
                      كل أدواتك في مكان واحد
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", gap: f(12), marginTop: f(16), direction: dir }}>
                      {TOOLS.map((Icon, i) => {
                        const p = Math.min(1, Math.max(0, spring({ frame: frame - (300 + i * 12), fps, config: { damping: 15, mass: 0.7, stiffness: 130 } })));
                        return (
                          <span key={i} style={{ width: f(44), height: f(44), borderRadius: f(14), background: props.surfaceAltColor, border: `1px solid ${props.accentColor}33`, display: "flex", alignItems: "center", justifyContent: "center", opacity: p, transform: `scale(${0.7 + 0.3 * p})` }}>
                            <Icon size={f(22)} color={props.accentColor} />
                          </span>
                        );
                      })}
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: f(10), marginTop: f(16), background: props.accentColor, color: props.secondaryColor, borderRadius: 999, padding: `${f(12)}px ${f(24)}px`, fontSize: f(23), fontWeight: 800 }}>
                      ابدأ الإبداع الآن
                      <ArrowLeft size={f(21)} color={props.secondaryColor} />
                    </div>
                  </div>
                </SpatialCard>
              </div>
            </div>
          </DepthStage>
        </div>
      </div>

      <SceneSfx name="pop" frame={440} volume={0.18} />
    </AbsoluteFill>
  );
};
