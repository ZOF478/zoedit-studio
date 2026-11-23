import type { CSSProperties } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { DepthStage, SpatialCard } from "../components/Depth25D";
import { SceneSfx } from "../components/SceneSfx";

type Props = {
  accentColor: string; bgColor: string; textColor: string; mutedColor: string;
  characterBody: string; characterFace: string; characterAccent: string; characterShadow: string;
  isRtl: boolean; language: string; title?: string; text?: string; keywords?: string[];
  data?: Record<string, unknown>; durationInFrames: number; showCharacter?: boolean;
};

type Kind = "reincarnation" | "death" | "charms";
type Belief = { title: string; sub: string; kind: Kind; fracture: number; recede?: number; tilt: number };

const CRIMSON = "#DC2626";
const BLUE = "#1E3A8A";
const CLAMP = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const EASE = Easing.inOut(Easing.cubic);

const beliefs: Belief[] = [
  { title: "تناسخ الأرواح", sub: "دوران لا ينتهي", kind: "reincarnation", fracture: 50, recede: 280, tilt: 5 },
  { title: "آلهة الموت", sub: "قوى تُستدعى", kind: "death", fracture: 280, recede: 540, tilt: 0 },
  { title: "التعاويذ", sub: "توسل محرم", kind: "charms", fracture: 540, tilt: -5 },
];

const Seal = ({ kind, frac, spin, color, accent }: { kind: Kind; frac: number; spin: number; color: string; accent: string }) => {
  const shift = frac * 26;
  return (
    <svg viewBox="0 0 240 240" style={{ width: "100%", height: "100%" }}>
      <g transform={`rotate(${spin} 120 120)`}>
        <circle cx="120" cy="120" r="102" fill="none" stroke={`${accent}55`} strokeWidth="1.5" strokeDasharray="3 9" />
        <circle cx="120" cy="120" r="86" fill="none" stroke={`${color}22`} strokeWidth="1" />
        <g transform={`translate(${-shift} 0)`}>
          <circle cx="88" cy="120" r="42" fill="none" stroke={accent} strokeWidth="2.5" />
          <circle cx="88" cy="120" r="8" fill={accent} />
        </g>
        <g transform={`translate(${shift} 0)`}>
          <circle cx="152" cy="120" r="42" fill="none" stroke={color} strokeWidth="2.5" />
          <circle cx="152" cy="120" r="8" fill={color} />
        </g>
        {kind === "reincarnation" && (
          <circle cx="120" cy="120" r="22" fill="none" stroke={`${accent}AA`} strokeWidth="2" strokeDasharray="5 5" />
        )}
        {kind === "death" && (
          <path d="M120 76 L158 152 L82 152 Z" fill="none" stroke={accent} strokeWidth="2" opacity={0.8} />
        )}
        {kind === "charms" && (
          <>
            <rect x="92" y="92" width="56" height="56" fill="none" stroke={accent} strokeWidth="2" transform="rotate(45 120 120)" />
            <rect x="104" y="104" width="32" height="32" fill="none" stroke={color} strokeWidth="2" transform="rotate(45 120 120)" />
          </>
        )}
        <path
          d={`M120 34 L${116 - frac * 10} 92 L124 120 L${118 + frac * 10} 168 L120 206`}
          fill="none"
          stroke={accent}
          strokeWidth={frac * 2.5}
          opacity={frac}
        />
      </g>
    </svg>
  );
};

export const Scene3 = (props: Props) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const s = Math.min(width, height);
  const exit = interpolate(
    frame,
    [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)],
    [1, 0],
    CLAMP,
  );
  const camA = interpolate(frame, [120, 260], [29, 0], { ...CLAMP, easing: EASE });
  const camB = interpolate(frame, [380, 520], [0, -29], { ...CLAMP, easing: EASE });
  const cameraX = camA + camB + Math.sin(frame / 60) * 0.5;
  const camScale = 1 + Math.sin(frame / 50) * 0.012;

  const cardStyle: CSSProperties = {
    position: "relative" as const,
    width: "26%",
    height: "88%",
    flex: "0 0 auto" as const,
    borderRadius: s * 0.04,
    padding: s * 0.028,
    boxSizing: "border-box" as const,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: s * 0.014,
    border: `1px solid ${CRIMSON}55`,
    background: `linear-gradient(170deg, ${BLUE}33, ${props.bgColor} 70%)`,
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
      <SceneSfx name="pop" frame={50} volume={0.18} />
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
            background: `radial-gradient(circle at ${70 + Math.sin(frame / 80) * 4}% 30%, ${CRIMSON}22, transparent 55%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.32,
            backgroundImage: `linear-gradient(${props.textColor}0D 1px, transparent 1px), linear-gradient(90deg, ${props.textColor}0D 1px, transparent 1px)`,
            backgroundSize: `${s * 0.09}px ${s * 0.09}px`,
            transform: `translateY(${(frame * 0.12) % (s * 0.09)}px)`,
          }}
        />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              width: s * 0.006,
              height: s * 0.006,
              borderRadius: "50%",
              background: i % 2 ? props.accentColor : CRIMSON,
              opacity: 0.35 + 0.25 * Math.sin(frame / 20 + i),
              transform: `translateY(${Math.sin(frame / 30 + i) * 10}px)`,
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
            gap: s * 0.008,
          }}
        >
          <div style={{ fontSize: s * 0.048, fontWeight: 900, color: props.textColor, lineHeight: 1.4 }}>
            في أعمال مثل ناروتو
          </div>
          <div style={{ fontSize: s * 0.032, fontWeight: 800, color: props.accentColor, lineHeight: 1.4 }}>
            الأمر لا يقف عند الحماس
          </div>
          <div style={{ width: s * 0.18, height: 4, background: CRIMSON, borderRadius: 999 }} />
        </div>

        <div style={{ position: "absolute", top: "22%", height: "50%", left: 0, right: 0, overflow: "hidden" }}>
          <DepthStage>
            <div
              style={{
                position: "absolute",
                width: "300%",
                height: "100%",
                left: "-100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "3%",
                transform: `translateX(${cameraX}%) scale(${camScale})`,
                transformStyle: "preserve-3d",
              }}
            >
              {beliefs.map((b, i) => {
                const frac = interpolate(frame, [b.fracture, b.fracture + 50], [0, 1], CLAMP);
                return (
                  <SpatialCard
                    key={b.title}
                    enterFrame={i * 12}
                    recedeFrame={b.recede}
                    tiltX={-3}
                    tiltY={b.tilt}
                    style={cardStyle}
                  >
                    <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: s * 0.01, color: props.accentColor, fontSize: s * 0.016, fontWeight: 800 }}>
                      <span>{["٠١", "٠٢", "٠٣"][i] ?? ""}</span>
                      <span>عقيدة خفية</span>
                    </div>
                    <div style={{ width: "100%", flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Seal kind={b.kind} frac={frac} spin={frame * (0.5 + i * 0.1) + i * 40} color={props.textColor} accent={CRIMSON} />
                    </div>
                    <div style={{ textAlign: "center", opacity: Math.min(1, frac * 1.4), transform: `translateY(${(1 - frac) * s * 0.015}px)` }}>
                      <div style={{ fontSize: s * 0.026, fontWeight: 900, color: props.textColor, lineHeight: 1.3 }}>{b.title}</div>
                      <div style={{ fontSize: s * 0.017, fontWeight: 700, color: props.mutedColor }}>{b.sub}</div>
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        top: s * 0.02,
                        right: s * 0.02,
                        width: s * 0.012,
                        height: s * 0.012,
                        borderRadius: "50%",
                        background: frac > 0.5 ? CRIMSON : `${props.accentColor}77`,
                        boxShadow: `0 0 18px ${CRIMSON}88`,
                      }}
                    />
                  </SpatialCard>
                );
              })}
            </div>
          </DepthStage>
        </div>
      </div>
    </AbsoluteFill>
  );
};
