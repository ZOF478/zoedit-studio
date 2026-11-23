import type { CSSProperties } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { HeartCrack, TimerOff } from "lucide-react";
import { DepthStage, SpatialCard } from "../components/Depth25D";
import { SceneSfx } from "../components/SceneSfx";

type Props = {
  accentColor: string; bgColor: string; textColor: string; mutedColor: string;
  characterBody: string; characterFace: string; characterAccent: string; characterShadow: string;
  isRtl: boolean; language: string; title?: string; text?: string; keywords?: string[];
  data?: Record<string, unknown>; durationInFrames: number; showCharacter?: boolean;
};

const CRIMSON = "#DC2626";
const PRAYERS = ["الفجر", "الظهر", "العصر", "المغرب", "العشاء"];
const CLAMP = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export const Scene5 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const s = Math.min(width, height);
  const exit = interpolate(
    frame,
    [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)],
    [1, 0],
    CLAMP,
  );
  const progress = interpolate(frame, [140, 550], [0, 1], CLAMP);
  const barEnter = (i: number) =>
    spring({ frame: frame - (120 + i * 12), fps, config: { damping: 14, stiffness: 140 } });
  const axisX = 150;
  const top = 60;
  const bottom = 350;
  const barW = 56;
  const gap = 44;
  const start = 190;
  const y = (v: number) => bottom - (v / 100) * (bottom - top);
  const cardStyle: CSSProperties = {
    position: "absolute" as const,
    inset: 0,
    margin: "auto",
    borderRadius: s * 0.045,
    padding: s * 0.032,
    boxSizing: "border-box" as const,
    display: "flex",
    flexDirection: "column" as const,
    gap: s * 0.02,
    border: `1px solid ${props.accentColor}44`,
    background: `linear-gradient(165deg, ${props.accentColor}12, ${props.bgColor} 70%)`,
    overflow: "hidden",
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: props.bgColor,
        overflow: "hidden",
        direction: props.isRtl ? "rtl" : "ltr",
      }}
    >
      <SceneSfx name="check" frame={560} volume={0.18} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: exit,
          transform: `translateY(${(1 - exit) * s * 0.012}px)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at 30% 40%, ${CRIMSON}20, transparent 58%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.3,
            backgroundImage: `linear-gradient(${props.textColor}0D 1px, transparent 1px), linear-gradient(90deg, ${props.textColor}0D 1px, transparent 1px)`,
            backgroundSize: `${s * 0.1}px ${s * 0.1}px`,
            transform: `translateY(${(frame * 0.1) % (s * 0.1)}px)`,
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "22%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 48px",
            boxSizing: "border-box",
            textAlign: props.isRtl ? "right" : "left",
            gap: s * 0.006,
          }}
        >
          <div style={{ fontSize: s * 0.044, fontWeight: 900, color: props.textColor, lineHeight: 1.4 }}>
            الخطر لا يقف عند العقيدة
          </div>
          <div style={{ width: s * 0.22, height: 4, background: CRIMSON, borderRadius: 999 }} />
        </div>

        <div style={{ position: "absolute", top: "22%", height: "50%", left: 0, right: 0 }}>
          <DepthStage>
            <SpatialCard
              enterFrame={0}
              recedeFrame={120}
              tiltX={-3}
              tiltY={props.isRtl ? 5 : -5}
              style={{ ...cardStyle, width: "64%", height: "72%" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: s * 0.02, color: CRIMSON }}>
                <TimerOff size={s * 0.07} color={CRIMSON} />
                <span style={{ fontSize: s * 0.022, fontWeight: 800, color: props.mutedColor }}>في عالم خيالي</span>
              </div>
              <div style={{ fontSize: s * 0.16, fontWeight: 900, color: props.textColor, lineHeight: 1 }}>٧٢٠</div>
              <div style={{ fontSize: s * 0.04, fontWeight: 900, color: props.accentColor }}>حلقة</div>
              <div style={{ fontSize: s * 0.024, fontWeight: 700, color: props.mutedColor }}>مئات الساعات</div>
            </SpatialCard>

            <SpatialCard
              enterFrame={120}
              recedeFrame={560}
              tiltX={-2}
              tiltY={props.isRtl ? -4 : 4}
              style={{ ...cardStyle, width: "90%", height: "88%" }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: s * 0.008 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: props.textColor, fontSize: s * 0.02, fontWeight: 800 }}>
                  <span>تقدم الحلقات</span>
                  <span style={{ color: props.accentColor }}>٧٢٠ حلقة</span>
                </div>
                <div style={{ height: s * 0.012, background: `${props.textColor}15`, borderRadius: 999, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.min(100, progress * 100)}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: `linear-gradient(90deg, ${props.accentColor}, ${CRIMSON})`,
                    }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", width: "100%", flex: 1, minHeight: 0 }}>
                <svg viewBox="0 0 700 420" style={{ width: "100%", height: "100%" }}>
                  {[0, 50, 100].map((t) => (
                    <g key={t}>
                      <line x1={axisX} x2={670} y1={y(t)} y2={y(t)} stroke={`${props.textColor}18`} strokeWidth="1" />
                      <text x={axisX - 14} y={y(t) + 5} textAnchor="end" fill={props.mutedColor} fontSize="16">
                        {t}٪
                      </text>
                    </g>
                  ))}
                  <line x1={axisX} x2={axisX} y1={top} y2={bottom} stroke={`${props.textColor}44`} strokeWidth="2" />
                  <text x={axisX} y={36} textAnchor="start" fill={props.mutedColor} fontSize="16">
                    نسبة الالتزام
                  </text>
                  <line x1={axisX} x2={670} y1={y(20)} y2={y(20)} stroke={CRIMSON} strokeWidth="2" strokeDasharray="6 6" opacity={0.7} />
                  <text x={axisX - 14} y={y(20) - 6} textAnchor="end" fill={CRIMSON} fontSize="14">
                    خط الصلاة
                  </text>
                  {PRAYERS.map((name, i) => {
                    const enter = barEnter(i);
                    const h = Math.max(0, (100 - progress * 92) * enter);
                    const x = start + i * (barW + gap);
                    return (
                      <g key={name}>
                        <rect x={x} y={top} width={barW} height={bottom - top} rx={12} fill={`${props.textColor}08`} />
                        <rect
                          x={x}
                          y={y(h)}
                          width={barW}
                          height={y(0) - y(h)}
                          rx={12}
                          fill={i === 4 ? CRIMSON : props.accentColor}
                          opacity={0.88}
                        />
                        <text x={x + barW / 2} y={bottom + 28} textAnchor="middle" fill={props.textColor} fontSize="16">
                          {name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </SpatialCard>

            <SpatialCard
              enterFrame={560}
              tiltX={-2}
              tiltY={props.isRtl ? -5 : 5}
              style={{ ...cardStyle, width: "72%", height: "68%" }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: s * 0.018, width: "100%", height: "100%" }}>
                <HeartCrack size={s * 0.11} color={CRIMSON} />
                <div style={{ fontSize: s * 0.05, fontWeight: 900, color: props.textColor }}>الخشوع يموت</div>
                <div style={{ fontSize: s * 0.026, fontWeight: 800, color: props.mutedColor }}>والصلاة تُؤخّر</div>
                <div style={{ fontSize: s * 0.018, fontWeight: 800, color: CRIMSON, border: `1px solid ${CRIMSON}55`, padding: `${s * 0.008}px ${s * 0.018}px`, borderRadius: 999 }}>
                  النتيجة
                </div>
              </div>
            </SpatialCard>
          </DepthStage>
        </div>
      </div>
    </AbsoluteFill>
  );
};
