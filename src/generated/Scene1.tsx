import type { CSSProperties } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AlarmClock, Moon, Sunrise } from "lucide-react";
import { DepthStage, SpatialCard } from "../components/Depth25D";
import { SceneSfx } from "../components/SceneSfx";

type Props = {
  accentColor: string; bgColor: string; textColor: string; mutedColor: string;
  characterBody: string; characterFace: string; characterAccent: string; characterShadow: string;
  isRtl: boolean; language: string; title?: string; text?: string; keywords?: string[];
  data?: Record<string, unknown>; durationInFrames: number; showCharacter?: boolean;
};

const CRIMSON = "#DC2626";
const EMERALD = "#10B981";
const CLAMP = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export const Scene1 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const s = Math.min(width, height);
  const exit = interpolate(
    frame,
    [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)],
    [1, 0],
    CLAMP,
  );
  const flip = interpolate(frame, [92, 118], [0, 1], CLAMP);
  const badge = spring({ frame: frame - 18, fps, config: { damping: 14, stiffness: 140 } });
  const ring = frame * 0.6;
  const cardStyle: CSSProperties = {
    position: "absolute" as const,
    inset: 0,
    margin: "auto",
    width: "86%",
    height: "82%",
    borderRadius: s * 0.045,
    padding: s * 0.04,
    boxSizing: "border-box" as const,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: s * 0.022,
    border: `1px solid ${CRIMSON}66`,
    overflow: "hidden",
    background: `linear-gradient(160deg, ${CRIMSON}22, ${props.bgColor} 62%)`,
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: props.bgColor,
        overflow: "hidden",
        direction: props.isRtl ? "rtl" : "ltr",
      }}
    >
      <SceneSfx name="check" frame={96} volume={0.18} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: exit,
          transform: `translateY(${(1 - exit) * s * 0.012}px) scale(${0.985 + exit * 0.015})`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at 50% 46%, ${CRIMSON}2A, transparent 62%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: s * 0.9,
            height: s * 0.9,
            marginLeft: -s * 0.45,
            marginTop: -s * 0.45,
            borderRadius: "50%",
            border: `1px dashed ${CRIMSON}33`,
            transform: `rotate(${ring}deg)`,
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
            alignItems: "stretch",
            padding: "0 48px",
            boxSizing: "border-box",
            textAlign: props.isRtl ? "right" : "left",
            gap: s * 0.004,
          }}
        >
          <div style={{ fontSize: s * 0.06, fontWeight: 900, color: props.textColor, lineHeight: 1.4 }}>
            حلقة واحدة بس
          </div>
          <div style={{ fontSize: s * 0.034, fontWeight: 800, color: props.accentColor, lineHeight: 1.4 }}>
            قبل النوم
          </div>
        </div>

        <div style={{ position: "absolute", top: "22%", height: "50%", left: 0, right: 0 }}>
          <DepthStage>
            <SpatialCard
              enterFrame={0}
              recedeFrame={12}
              style={{ ...cardStyle, background: "transparent", border: "none", boxShadow: "none", padding: 0 }}
            >
              <svg viewBox="0 0 400 400" style={{ width: "100%", height: "100%", opacity: 0.7 }}>
                <g transform={`rotate(${ring} 200 200)`}>
                  <circle cx="200" cy="200" r="150" fill="none" stroke={`${CRIMSON}33`} strokeWidth="1" strokeDasharray="4 10" />
                  <circle cx="200" cy="200" r="110" fill="none" stroke={`${props.textColor}22`} strokeWidth="1" />
                  <circle cx="200" cy="50" r="5" fill={CRIMSON} />
                  <circle cx="350" cy="200" r="3" fill={props.accentColor} />
                </g>
              </svg>
            </SpatialCard>

            <SpatialCard enterFrame={12} recedeFrame={96} tiltX={-4} tiltY={props.isRtl ? 6 : -6} style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: s * 0.015, color: props.mutedColor, fontSize: s * 0.022, fontWeight: 700 }}>
                <Moon size={s * 0.03} color={props.accentColor} />
                <span>السهرة تبدأ</span>
              </div>
              <div
                dir="ltr"
                style={{
                  fontSize: s * 0.13,
                  fontWeight: 900,
                  color: CRIMSON,
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                  textShadow: `0 0 40px ${CRIMSON}55`,
                  transform: `scale(${1 + Math.sin(frame / 20) * 0.01})`,
                }}
              >
                11:30 <span style={{ fontSize: s * 0.045 }}>م</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: s * 0.012,
                  padding: `${s * 0.012}px ${s * 0.03}px`,
                  borderRadius: 999,
                  background: `${props.accentColor}1A`,
                  color: props.accentColor,
                  fontSize: s * 0.024,
                  fontWeight: 800,
                  transform: `scale(${badge})`,
                }}
              >
                <AlarmClock size={s * 0.028} color={props.accentColor} />
                <span>حلقة واحدة فقط</span>
              </div>
            </SpatialCard>

            <SpatialCard enterFrame={96} tiltX={-3} tiltY={props.isRtl ? -5 : 5} style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: s * 0.015, color: props.mutedColor, fontSize: s * 0.022, fontWeight: 700, opacity: 0.75 }}>
                <Sunrise size={s * 0.03} color={EMERALD} />
                <span>الفجر يضيع</span>
              </div>
              <div
                dir="ltr"
                style={{
                  fontSize: s * 0.14,
                  fontWeight: 900,
                  color: CRIMSON,
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                  textShadow: `0 0 50px ${CRIMSON}77`,
                  opacity: flip,
                  transform: `scale(${0.9 + flip * 0.1})`,
                }}
              >
                04:45 <span style={{ fontSize: s * 0.045 }}>ص</span>
              </div>
              <div style={{ fontSize: s * 0.026, fontWeight: 800, color: props.textColor }}>
                السهرة أخذت ليلك
              </div>
            </SpatialCard>
          </DepthStage>
        </div>

        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${[2, 91, 89][i]}%`,
              top: `${[30, 34, 66][i]}%`,
              fontSize: s * 0.06,
              fontWeight: 900,
              color: props.accentColor,
              opacity: (1 - flip) * 0.8,
              transform: `translateY(${Math.sin(frame / 14 + i) * 8}px) rotate(${Math.sin(frame / 18 + i) * 10}deg)`,
              pointerEvents: "none",
            }}
          >
            ؟
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
