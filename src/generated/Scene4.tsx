import type { CSSProperties } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Brain, EyeOff, Heart, ShieldAlert } from "lucide-react";
import { DepthStage, SpatialCard } from "../components/Depth25D";
import { SceneSfx } from "../components/SceneSfx";

type Props = {
  accentColor: string; bgColor: string; textColor: string; mutedColor: string;
  characterBody: string; characterFace: string; characterAccent: string; characterShadow: string;
  isRtl: boolean; language: string; title?: string; text?: string; keywords?: string[];
  data?: Record<string, unknown>; durationInFrames: number; showCharacter?: boolean;
};

type Stage = { icon: typeof Heart; label: string; caption: string; enter: number; recede?: number; tone: string };

const CRIMSON = "#DC2626";
const CLAMP = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const Tendrils = ({ frame, color }: { frame: number; color: string }) => (
  <svg viewBox="0 0 300 300" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.65 }}>
    {[
      "M150 250 C90 220 70 170 105 120 C130 85 120 50 150 20",
      "M150 260 C210 230 235 180 200 130 C175 95 190 60 160 20",
      "M40 150 C90 120 100 80 150 90 C200 100 220 70 260 90",
    ].map((d, i) => (
      <path
        key={i}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray="5 9"
        strokeDashoffset={-frame * (0.7 + i * 0.2)}
        opacity={0.5}
      />
    ))}
  </svg>
);

export const Scene4 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const s = Math.min(width, height);
  const exit = interpolate(
    frame,
    [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)],
    [1, 0],
    CLAMP,
  );
  const stages: Stage[] = [
    { icon: Heart, label: "تسلل إلى القلب", caption: "القلب", enter: 0, recede: 110, tone: props.accentColor },
    { icon: Brain, label: "غفلة عن الدين", caption: "العقل", enter: 110, recede: 230, tone: props.textColor },
    { icon: EyeOff, label: "دون حذر", caption: "الغفلة", enter: 230, tone: CRIMSON },
  ];
  const cardStyle: CSSProperties = {
    position: "absolute" as const,
    inset: 0,
    margin: "auto",
    width: "80%",
    height: "80%",
    borderRadius: s * 0.05,
    padding: s * 0.04,
    boxSizing: "border-box" as const,
    background: `linear-gradient(170deg, ${CRIMSON}18, ${props.bgColor} 65%)`,
    border: `1px solid ${CRIMSON}44`,
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
      <SceneSfx name="check" frame={110} volume={0.18} />
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
            background: `radial-gradient(circle at 50% 54%, ${CRIMSON}20, transparent 58%)`,
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
            transform: `rotate(${frame * 0.25}deg)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: s * 0.62,
            height: s * 0.62,
            marginLeft: -s * 0.31,
            marginTop: -s * 0.31,
            borderRadius: "50%",
            border: `1px solid ${props.accentColor}22`,
            transform: `rotate(${-frame * 0.18}deg)`,
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
            gap: s * 0.004,
          }}
        >
          <div style={{ fontSize: s * 0.052, fontWeight: 900, color: props.textColor, lineHeight: 1.4 }}>
            شركيات تتسلل
          </div>
          <div style={{ fontSize: s * 0.036, fontWeight: 800, color: CRIMSON, lineHeight: 1.4 }}>
            لقلبك وعقلك
          </div>
        </div>

        <div style={{ position: "absolute", top: "22%", height: "50%", left: 0, right: 0 }}>
          <DepthStage>
            {stages.map((stage, i) => {
              const Icon = stage.icon;
              const pop = spring({ frame: frame - (stage.enter + 8), fps, config: { damping: 12, stiffness: 150 } });
              return (
                <SpatialCard
                  key={stage.caption}
                  enterFrame={stage.enter}
                  recedeFrame={stage.recede}
                  tiltX={-3}
                  tiltY={i === 0 ? 5 : i === 1 ? 0 : -5}
                  style={cardStyle}
                >
                  <div style={{ position: "absolute", inset: s * 0.03 }}>
                    <Tendrils frame={frame} color={stage.tone} />
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: s * 0.02,
                    }}
                  >
                    <div
                      style={{
                        width: s * 0.22,
                        height: s * 0.22,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: `2px solid ${stage.tone}66`,
                        background: `radial-gradient(circle, ${stage.tone}22, transparent 70%)`,
                        boxShadow: `0 0 60px ${stage.tone}33`,
                        transform: `scale(${0.8 + pop * 0.2})`,
                        opacity: pop,
                        position: "relative",
                      }}
                    >
                      <Icon size={s * 0.11} color={stage.tone} strokeWidth={1.5} />
                    </div>
                    <div style={{ textAlign: "center", transform: `translateY(${(1 - pop) * s * 0.02}px)`, opacity: pop, position: "relative" }}>
                      <div style={{ fontSize: s * 0.028, fontWeight: 900, color: props.textColor }}>{stage.label}</div>
                      <div style={{ fontSize: s * 0.018, fontWeight: 700, color: props.mutedColor }}>{stage.caption}</div>
                    </div>
                    <div style={{ display: "flex", gap: s * 0.012, position: "relative" }}>
                      {[0, 1, 2].map((j) => {
                        const b = spring({ frame: frame - j * 12, fps, config: { damping: 14, stiffness: 140 } });
                        const active = j === i;
                        return (
                          <div
                            key={j}
                            style={{
                              opacity: b,
                              transform: `scale(${0.8 + b * 0.2})`,
                              fontSize: s * 0.016,
                              fontWeight: 800,
                              color: active ? stage.tone : props.mutedColor,
                              border: `1px solid ${active ? stage.tone : props.textColor}44`,
                              padding: `${s * 0.008}px ${s * 0.014}px`,
                              borderRadius: 999,
                              background: active ? `${stage.tone}18` : "transparent",
                            }}
                          >
                            {["قلب", "عقل", "غفلة"][j] ?? ""}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: s * 0.008, color: CRIMSON, fontSize: s * 0.018, fontWeight: 800, position: "relative", opacity: 0.9 }}>
                      <ShieldAlert size={s * 0.024} color={CRIMSON} />
                      <span>خطر خفي</span>
                    </div>
                  </div>
                </SpatialCard>
              );
            })}
          </DepthStage>
        </div>
      </div>
    </AbsoluteFill>
  );
};
