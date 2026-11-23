import type { CSSProperties } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Clock3, MoonStar, ShieldCheck } from "lucide-react";
import { DepthStage, SpatialCard } from "../components/Depth25D";
import { SceneSfx } from "../components/SceneSfx";
import { Stickman } from "../components/Stickman";

type Props = {
  accentColor: string; bgColor: string; textColor: string; mutedColor: string;
  characterBody: string; characterFace: string; characterAccent: string; characterShadow: string;
  isRtl: boolean; language: string; title?: string; text?: string; keywords?: string[];
  data?: Record<string, unknown>; durationInFrames: number; showCharacter?: boolean;
};

const CRIMSON = "#DC2626";
const EMERALD = "#10B981";
const PRAYERS = ["الفجر", "الظهر", "العصر", "المغرب", "العشاء"];
const CLAMP = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export const Scene7 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const s = Math.min(width, height);
  const exit = interpolate(
    frame,
    [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)],
    [1, 0],
    CLAMP,
  );
  const red = interpolate(frame, [100, 160], [0, 1], CLAMP);
  const marker = interpolate(frame, [20, 120], [4, 52], CLAMP);
  const calm = interpolate(frame, [240, 320], [0, 1], CLAMP);
  const clockTick = interpolate(frame, [150, 175], [0, 18], CLAMP);
  const secondAngle = 210 + clockTick;
  const minuteAngle = 60 + clockTick / 12;
  const hourAngle = 120 + clockTick / 60;
  const nodeSpring = (i: number) =>
    spring({ frame: frame - i * 12, fps, config: { damping: 14, stiffness: 150 } });
  const cardStyle: CSSProperties = {
    position: "absolute" as const,
    inset: 0,
    margin: "auto",
    width: "94%",
    height: "84%",
    borderRadius: s * 0.045,
    padding: s * 0.035,
    boxSizing: "border-box" as const,
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "center",
    gap: s * 0.02,
    background: `linear-gradient(165deg, ${props.bgColor}, ${CRIMSON}18)`,
    border: `1px solid ${CRIMSON}55`,
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
      <SceneSfx name="pop" frame={120} volume={0.18} />
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
            background: `radial-gradient(circle at 40% 50%, ${CRIMSON}18, transparent 60%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: calm,
            background: `radial-gradient(circle at 50% 58%, ${EMERALD}26, transparent 62%)`,
          }}
        />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${(i * 43) % 100}%`,
              top: `${(i * 57) % 100}%`,
              width: s * 0.005,
              height: s * 0.005,
              borderRadius: "50%",
              background: i % 3 === 0 ? EMERALD : props.accentColor,
              opacity: 0.18 + 0.2 * Math.sin(frame / 26 + i),
              transform: `translateY(${Math.sin(frame / 34 + i) * 10}px)`,
            }}
          />
        ))}

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
          <div style={{ fontSize: s * 0.056, fontWeight: 900, color: props.textColor, lineHeight: 1.4 }}>
            صلاتك خط أحمر
          </div>
          <div style={{ fontSize: s * 0.03, fontWeight: 800, color: EMERALD, lineHeight: 1.4 }}>
            ولا تسمح لترفيه
          </div>
          <div style={{ width: s * 0.2, height: 4, background: CRIMSON, borderRadius: 999 }} />
        </div>

        <div
          style={{
            position: "absolute",
            top: "22%",
            height: "50%",
            left: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            gap: s * 0.02,
            padding: "0 40px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ flex: 1, minWidth: 0, height: "100%" }}>
            <DepthStage>
              <SpatialCard enterFrame={0} recedeFrame={150} tiltX={-3} tiltY={props.isRtl ? 5 : -5} style={cardStyle}>
                <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", opacity: 0.07 }}>
                  <MoonStar size={s * 0.2} color={props.textColor} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: s * 0.01, color: props.accentColor, fontSize: s * 0.02, fontWeight: 800, position: "relative" }}>
                  <MoonStar size={s * 0.028} color={props.accentColor} />
                  <span>الصلوات الخمس</span>
                </div>
                <div style={{ position: "absolute", top: s * 0.025, left: s * 0.03, color: props.mutedColor, fontSize: s * 0.018, fontWeight: 800, opacity: 0.8 * (1 - red) }}>
                  الوقت يمضي
                </div>
                <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: s * 0.015 }}>
                  <div style={{ position: "absolute", top: s * 0.011, left: 0, right: 0, height: 2, background: `${props.textColor}22` }} />
                  <div style={{ position: "absolute", top: s * 0.009, right: 0, height: s * 0.006, width: `${red * 100}%`, background: CRIMSON, borderRadius: 999, boxShadow: `0 0 18px ${CRIMSON}88` }} />
                  <div style={{ position: "absolute", top: 0, right: `${marker}%`, width: s * 0.022, height: s * 0.022, borderRadius: "50%", background: props.textColor, boxShadow: `0 0 16px ${CRIMSON}`, transform: "translateX(50%)" }} />
                  {PRAYERS.map((name, i) => {
                    const n = nodeSpring(i);
                    return (
                      <div
                        key={name}
                        style={{
                          width: "18%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: s * 0.008,
                          position: "relative",
                          opacity: n,
                          transform: `scale(${0.8 + n * 0.2})`,
                        }}
                      >
                        <div
                          style={{
                            width: s * 0.022,
                            height: s * 0.022,
                            borderRadius: "50%",
                            background: i === 0 ? CRIMSON : props.accentColor,
                            boxShadow: `0 0 14px ${i === 0 ? CRIMSON : props.accentColor}66`,
                          }}
                        />
                        <div style={{ fontSize: s * 0.016, fontWeight: 700, color: props.mutedColor, textAlign: "center" }}>{name}</div>
                      </div>
                    );
                  })}
                </div>
              </SpatialCard>

              <SpatialCard enterFrame={150} recedeFrame={260} tiltX={-3} tiltY={props.isRtl ? -4 : 4} style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: s * 0.01, color: CRIMSON, fontSize: s * 0.02, fontWeight: 800 }}>
                  <Clock3 size={s * 0.028} color={CRIMSON} />
                  <span>توقّف العدّ</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: s * 0.03, width: "100%" }}>
                  <svg viewBox="0 0 200 200" style={{ width: s * 0.22, height: s * 0.22 }}>
                    <circle cx="100" cy="100" r="82" fill="none" stroke={`${props.textColor}33`} strokeWidth="4" />
                    {[0, 30, 60, 90, 120, 150].map((a) => (
                      <line key={a} x1="100" y1="24" x2="100" y2="34" transform={`rotate(${a} 100 100)`} stroke={`${props.textColor}55`} strokeWidth="2" />
                    ))}
                    <line x1="100" y1="100" x2="100" y2="48" transform={`rotate(${hourAngle} 100 100)`} stroke={props.textColor} strokeWidth="5" strokeLinecap="round" />
                    <line x1="100" y1="100" x2="100" y2="34" transform={`rotate(${minuteAngle} 100 100)`} stroke={props.accentColor} strokeWidth="3" strokeLinecap="round" />
                    <line x1="100" y1="100" x2="100" y2="30" transform={`rotate(${secondAngle} 100 100)`} stroke={CRIMSON} strokeWidth="2" strokeLinecap="round" />
                    <circle cx="100" cy="100" r="6" fill={CRIMSON} />
                  </svg>
                  <div style={{ display: "flex", flexDirection: "column", gap: s * 0.008, textAlign: props.isRtl ? "right" : "left" }}>
                    <div style={{ fontSize: s * 0.045, fontWeight: 900, color: props.textColor, lineHeight: 1.3 }}>أوقف السهرة</div>
                    <div style={{ fontSize: s * 0.022, fontWeight: 700, color: props.mutedColor }}>قبل الفجر</div>
                  </div>
                </div>
              </SpatialCard>

              <SpatialCard
                enterFrame={260}
                tiltX={-2}
                tiltY={props.isRtl ? -4 : 4}
                style={{ ...cardStyle, border: `1px solid ${EMERALD}55`, background: `linear-gradient(165deg, ${props.bgColor}, ${EMERALD}22)` }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: s * 0.02, width: "100%", height: "100%" }}>
                  <ShieldCheck size={s * 0.12} color={EMERALD} />
                  <div style={{ fontSize: s * 0.06, fontWeight: 900, color: props.textColor }}>حافظ عليها</div>
                  <div style={{ fontSize: s * 0.025, fontWeight: 800, color: EMERALD }}>صلاتك أولاً</div>
                </div>
              </SpatialCard>
            </DepthStage>
          </div>

          <div style={{ width: Math.round(s * 0.3), height: Math.round(s * 0.43), position: "relative", flexShrink: 0 }}>
            <Stickman
              pose="pointing"
              color={props.characterBody}
              faceColor={props.characterFace}
              accent={props.characterAccent}
              shadow={props.characterShadow}
              delay={0}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
