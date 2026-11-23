import type { CSSProperties } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AlarmClockOff, Moon, Sunrise } from "lucide-react";
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

export const Scene2 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const s = Math.min(width, height);
  const exit = interpolate(
    frame,
    [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)],
    [1, 0],
    CLAMP,
  );
  const rise = (i: number) =>
    spring({ frame: frame - (40 + i * 12), fps, config: { damping: 15, stiffness: 130 } });
  const tip = interpolate(frame, [120, 190], [0, -10], CLAMP);
  const drain = interpolate(frame, [130, 230], [72, 6], CLAMP);
  const warn = interpolate(frame, [170, 210], [0, 1], CLAMP);
  const nightPct = 70 + Math.sin(frame / 24) * 4;

  const cardStyle: CSSProperties = {
    position: "absolute" as const,
    inset: 0,
    margin: "auto",
    width: "88%",
    height: "84%",
    borderRadius: s * 0.045,
    padding: s * 0.035,
    boxSizing: "border-box" as const,
    display: "flex",
    flexDirection: "column" as const,
    gap: s * 0.016,
    border: `1px solid ${props.accentColor}44`,
    background: `linear-gradient(165deg, ${props.accentColor}12, ${props.bgColor} 68%)`,
    overflow: "hidden",
  };

  const column = (opts: {
    label: string;
    clock: string;
    suffix: string;
    pct: number;
    color: string;
    side: "night" | "dawn";
    enter: number;
  }) => (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: s * 0.012,
        opacity: opts.enter,
        transform: `translateY(${(1 - opts.enter) * s * 0.02}px)`,
      }}
    >
      <div style={{ color: props.mutedColor, fontSize: s * 0.02, fontWeight: 700 }}>{opts.label}</div>
      <div style={{ color: opts.color, lineHeight: 0 }}>
        {opts.side === "night" ? (
          <Moon size={s * 0.045} color={opts.color} />
        ) : (
          <Sunrise size={s * 0.045} color={opts.color} />
        )}
      </div>
      <div dir="ltr" style={{ color: opts.color, fontSize: s * 0.05, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
        {opts.clock} <span style={{ fontSize: s * 0.022 }}>{opts.suffix}</span>
      </div>
      <div
        style={{
          width: "34%",
          flex: 1,
          minHeight: s * 0.05,
          background: `${props.textColor}12`,
          borderRadius: 999,
          overflow: "hidden",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            width: "100%",
            height: `${Math.max(3, opts.pct)}%`,
            background: opts.color,
            borderRadius: 999,
            boxShadow: `0 0 18px ${opts.color}66`,
          }}
        />
      </div>
    </div>
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: props.bgColor,
        overflow: "hidden",
        direction: props.isRtl ? "rtl" : "ltr",
      }}
    >
      <SceneSfx name="check" frame={160} volume={0.18} />
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
            background: `radial-gradient(circle at 50% 58%, ${props.accentColor}1F, transparent 60%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.25,
            backgroundImage: `linear-gradient(${props.textColor}0D 1px, transparent 1px), linear-gradient(90deg, ${props.textColor}0D 1px, transparent 1px)`,
            backgroundSize: `${s * 0.12}px ${s * 0.12}px`,
            transform: `translateY(${(frame * 0.15) % (s * 0.12)}px)`,
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
          <div style={{ fontSize: s * 0.048, fontWeight: 900, color: props.textColor, lineHeight: 1.4 }}>
            جملة تبدأ بها السهرة
          </div>
          <div style={{ fontSize: s * 0.034, fontWeight: 800, color: CRIMSON, lineHeight: 1.4 }}>
            وتنتهي بضياع الفجر
          </div>
        </div>

        <div style={{ position: "absolute", top: "22%", height: "50%", left: 0, right: 0 }}>
          <DepthStage>
            <SpatialCard
              enterFrame={0}
              recedeFrame={50}
              style={{ ...cardStyle, width: "94%", height: "90%", background: "transparent", border: "none", boxShadow: "none", padding: 0 }}
            >
              <svg viewBox="0 0 400 400" style={{ width: "100%", height: "100%", opacity: 0.55 }}>
                <g transform={`rotate(${frame * 0.2} 200 200)`}>
                  <circle cx="200" cy="200" r="150" fill="none" stroke={`${CRIMSON}33`} strokeWidth="1" strokeDasharray="4 12" />
                  <circle cx="200" cy="200" r="120" fill="none" stroke={`${props.accentColor}33`} strokeWidth="1" />
                  <line x1="200" y1="40" x2="200" y2="82" stroke={CRIMSON} strokeWidth="3" />
                </g>
              </svg>
            </SpatialCard>

            <SpatialCard enterFrame={40} recedeFrame={250} tiltX={-3} tiltY={props.isRtl ? 4 : -4} style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: s * 0.02 }}>
                <div style={{ color: props.accentColor, fontSize: s * 0.022, fontWeight: 800 }}>مقارنة مباشرة</div>
                <div
                  style={{
                    opacity: warn,
                    transform: `scale(${0.85 + warn * 0.15})`,
                    color: CRIMSON,
                    fontSize: s * 0.02,
                    fontWeight: 800,
                    border: `1px solid ${CRIMSON}55`,
                    padding: `${s * 0.008}px ${s * 0.018}px`,
                    borderRadius: 999,
                  }}
                >
                  الوقت ينفد
                </div>
              </div>
              <div style={{ display: "flex", width: "100%", flex: 1, minHeight: 0, gap: s * 0.03, alignItems: "stretch" }}>
                {column({ label: "السهرة", clock: "11:30", suffix: "م", pct: nightPct, color: props.accentColor, side: "night", enter: rise(0) })}
                <div style={{ width: 1, background: `${props.textColor}22` }} />
                {column({ label: "الفجر", clock: "04:45", suffix: "ص", pct: drain, color: CRIMSON, side: "dawn", enter: rise(1) })}
              </div>
              <div style={{ position: "relative", width: "100%", height: s * 0.022, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div
                  style={{
                    height: 2,
                    width: "78%",
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${props.accentColor}, ${CRIMSON})`,
                    transform: `rotate(${tip}deg)`,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    width: s * 0.022,
                    height: s * 0.022,
                    borderRadius: "50%",
                    background: props.textColor,
                    boxShadow: `0 0 18px ${props.accentColor}`,
                  }}
                />
              </div>
            </SpatialCard>

            <SpatialCard enterFrame={250} tiltX={-2} tiltY={props.isRtl ? -4 : 4} style={{ ...cardStyle, width: "78%", height: "66%" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: s * 0.02, width: "100%", height: "100%" }}>
                <AlarmClockOff size={s * 0.12} color={CRIMSON} />
                <div style={{ fontSize: s * 0.07, fontWeight: 900, color: props.textColor }}>يومك يضيع</div>
                <div style={{ fontSize: s * 0.028, fontWeight: 700, color: props.mutedColor }}>ساعة واحدة تكفي</div>
              </div>
            </SpatialCard>
          </DepthStage>
        </div>
      </div>
    </AbsoluteFill>
  );
};
