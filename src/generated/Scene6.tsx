import type { CSSProperties } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Gem, Scale, ShieldCheck } from "lucide-react";
import { DepthStage, SpatialCard } from "../components/Depth25D";
import { SceneSfx } from "../components/SceneSfx";

type Props = {
  accentColor: string; bgColor: string; textColor: string; mutedColor: string;
  characterBody: string; characterFace: string; characterAccent: string; characterShadow: string;
  isRtl: boolean; language: string; title?: string; text?: string; keywords?: string[];
  data?: Record<string, unknown>; durationInFrames: number; showCharacter?: boolean;
};

const CRIMSON = "#DC2626";
const CLAMP = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export const Scene6 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const s = Math.min(width, height);
  const exit = interpolate(
    frame,
    [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)],
    [1, 0],
    CLAMP,
  );
  const fade = interpolate(frame, [140, 190], [1, 0], CLAMP);
  const glow = interpolate(frame, [220, 260], [0, 1], CLAMP);
  const tagSpring = (i: number) =>
    spring({ frame: frame - (100 + i * 12), fps, config: { damping: 15, stiffness: 140 } });
  const cardStyle: CSSProperties = {
    position: "absolute" as const,
    inset: 0,
    margin: "auto",
    width: "86%",
    height: "80%",
    borderRadius: s * 0.05,
    padding: s * 0.045,
    boxSizing: "border-box" as const,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: s * 0.03,
    background: `radial-gradient(circle at 50% 42%, ${props.accentColor}18, ${props.bgColor} 70%)`,
    border: `1px solid ${props.accentColor}33`,
    overflow: "hidden",
  };
  const tags = [
    { label: "عقيدة ووقت", style: { top: "20%", right: "6%" }, opacity: 1 },
    { label: "قيمة باقية", style: { bottom: "18%", right: "8%" }, opacity: 1 },
    { label: "خيال زائل", style: { top: "22%", left: "4%" }, opacity: fade },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: props.bgColor,
        overflow: "hidden",
        direction: props.isRtl ? "rtl" : "ltr",
      }}
    >
      <SceneSfx name="pop" frame={220} volume={0.18} />
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
            background: `radial-gradient(circle at 50% 44%, ${props.accentColor}20, transparent 62%)`,
          }}
        />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${(i * 41) % 100}%`,
              top: `${(i * 59) % 100}%`,
              width: s * 0.006,
              height: s * 0.006,
              borderRadius: "50%",
              background: i % 2 ? props.accentColor : props.textColor,
              opacity: 0.2 + 0.2 * Math.sin(frame / 24 + i),
              transform: `translateY(${Math.sin(frame / 36 + i) * 12}px)`,
            }}
          />
        ))}

        <div style={{ position: "absolute", top: "22%", height: "50%", left: 0, right: 0 }}>
          <DepthStage>
            <SpatialCard
              enterFrame={0}
              recedeFrame={100}
              tiltX={-3}
              tiltY={props.isRtl ? 5 : -5}
              style={{ ...cardStyle, width: "84%", height: "78%" }}
            >
              <Gem size={s * 0.1} color={props.accentColor} />
              <div style={{ fontSize: s * 0.08, fontWeight: 900, color: props.textColor, textAlign: "center", lineHeight: 1.3 }}>
                المسلم أغلى
              </div>
              <div style={{ fontSize: s * 0.036, fontWeight: 800, color: props.accentColor }}>من أن يُباع</div>
              <div
                style={{
                  fontSize: s * 0.02,
                  fontWeight: 700,
                  color: props.mutedColor,
                  border: `1px solid ${props.accentColor}44`,
                  padding: `${s * 0.008}px ${s * 0.02}px`,
                  borderRadius: 999,
                }}
              >
                قيمة لا تُقدّر
              </div>
            </SpatialCard>

            <SpatialCard
              enterFrame={100}
              recedeFrame={220}
              tiltX={-2}
              tiltY={props.isRtl ? -4 : 4}
              style={cardStyle}
            >
              <div
                style={{
                  position: "absolute",
                  top: s * 0.035,
                  right: s * 0.035,
                  display: "flex",
                  alignItems: "center",
                  gap: s * 0.01,
                  color: props.accentColor,
                  fontSize: s * 0.02,
                  fontWeight: 800,
                }}
              >
                <Scale size={s * 0.028} color={props.accentColor} />
                <span>ميزان القيمة</span>
              </div>
              <div style={{ position: "absolute", left: "50%", top: "52%", transform: "translate(-50%, -50%)" }}>
                <svg
                  viewBox="0 0 300 300"
                  style={{
                    width: s * 0.36,
                    height: s * 0.36,
                    overflow: "visible",
                    filter: `drop-shadow(0 0 ${s * 0.03}px ${props.accentColor}66)`,
                    transform: `scale(${1 + Math.sin(frame / 14) * 0.02})`,
                  }}
                >
                  <defs>
                    <linearGradient id="gemGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={props.textColor} />
                      <stop offset="55%" stopColor={props.accentColor} />
                      <stop offset="100%" stopColor={CRIMSON} />
                    </linearGradient>
                  </defs>
                  <g transform={`rotate(${frame * 0.15} 150 150)`} opacity={0.35}>
                    {[0, 45, 90, 135].map((a) => (
                      <line
                        key={a}
                        x1="150"
                        y1="150"
                        x2="150"
                        y2="10"
                        transform={`rotate(${a} 150 150)`}
                        stroke={props.accentColor}
                        strokeWidth="1"
                      />
                    ))}
                  </g>
                  <polygon points="150,30 236,110 150,270 64,110" fill="url(#gemGrad)" stroke={props.textColor} strokeWidth="2" />
                  <polygon points="150,30 190,110 150,150 110,110" fill={`${props.textColor}55`} />
                  <polygon points="64,110 110,110 150,150 150,270" fill={`${props.bgColor}44`} />
                  <polygon points="236,110 190,110 150,150 150,270" fill={`${props.bgColor}22`} />
                </svg>
              </div>
              {tags.map((tag, i) => {
                const e = tagSpring(i);
                return (
                  <div
                    key={tag.label}
                    style={{
                      position: "absolute",
                      ...tag.style,
                      opacity: e * tag.opacity,
                      transform: `translateY(${(1 - e) * s * 0.015}px)`,
                      padding: `${s * 0.01}px ${s * 0.02}px`,
                      borderRadius: 999,
                      border: `1px solid ${props.textColor}33`,
                      background: `${props.bgColor}CC`,
                      color: props.textColor,
                      fontSize: s * 0.02,
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tag.label}
                  </div>
                );
              })}
            </SpatialCard>

            <SpatialCard
              enterFrame={220}
              tiltX={-2}
              tiltY={props.isRtl ? -5 : 5}
              style={{ ...cardStyle, width: "74%", height: "68%" }}
            >
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div
                  style={{
                    position: "absolute",
                    width: s * 0.22,
                    height: s * 0.22,
                    borderRadius: "50%",
                    border: `2px solid ${props.accentColor}66`,
                    opacity: glow,
                    transform: `scale(${0.8 + glow * 0.4})`,
                  }}
                />
                <ShieldCheck size={s * 0.13} color={props.accentColor} />
              </div>
              <div style={{ fontSize: s * 0.07, fontWeight: 900, color: props.textColor }}>لا يُباع</div>
              <div style={{ fontSize: s * 0.03, fontWeight: 800, color: props.accentColor }}>قيمتك أعلى</div>
              <div style={{ fontSize: s * 0.02, fontWeight: 700, color: props.mutedColor }}>اختر ما يبقى</div>
            </SpatialCard>
          </DepthStage>
        </div>
      </div>
    </AbsoluteFill>
  );
};
