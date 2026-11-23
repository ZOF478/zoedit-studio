import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  Camera,
  Music2,
  ShieldCheck,
  Smartphone,
  Volume2,
  Video,
} from "lucide-react";
import { DepthStage, SpatialCard } from "../components/Depth25D";
import { SceneSfx } from "../components/SceneSfx";

type Props = {
  accentColor: string;
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

const CLAMP = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const PLATFORMS = [
  { label: "TikTok", icon: Music2 },
  { label: "Reels", icon: Camera },
  { label: "Shorts", icon: Video },
];

const CAPTION_WORDS = ["SMART", "SAFE", "ZONES"];

export const Scene4 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const unit = Math.min(width, height);
  const dur = props.durationInFrames;
  const exit = interpolate(
    frame,
    [Math.max(0, dur - 10), Math.max(1, dur - 1)],
    [1, 0],
    CLAMP,
  );
  const phoneH = Math.min(height * 0.43, (width * 0.42 * 16) / 9);
  const phoneW = (phoneH * 9) / 16;
  const safe = spring({ frame: frame - 50, fps, config: { damping: 18, stiffness: 90 } });
  const activeWord = Math.floor(Math.max(0, frame - 70) / 34) % CAPTION_WORDS.length;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: props.bgColor,
        overflow: "hidden",
        direction: props.isRtl ? "rtl" : "ltr",
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 34%, ${props.accentColor}1e, transparent 58%), radial-gradient(circle at 18% 72%, #255C9930, transparent 55%)`,
        }}
      />
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: 0.12 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <circle
            key={`c${i}`}
            cx={width * (0.1 + i * 0.14)}
            cy={height * (0.32 + ((i * 7) % 5) * 0.1)}
            r={unit * (0.03 + (i % 3) * 0.02)}
            fill="none"
            stroke={props.accentColor}
            strokeWidth={1.5}
            strokeDasharray="4 10"
          />
        ))}
      </svg>
      {[0, 1, 2].map((i) => (
        <div
          key={`pulse${i}`}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: phoneW + 80 + i * 70,
            height: phoneW + 80 + i * 70,
            marginLeft: -(phoneW + 80 + i * 70) / 2,
            marginTop: -(phoneW + 80 + i * 70) / 2,
            borderRadius: "50%",
            border: `1px solid ${props.accentColor}22`,
            transform: `scale(${1 + 0.04 * Math.sin(frame / 30 + i)})`,
          }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          top: "7%",
          left: 0,
          right: 0,
          padding: "0 48px",
          maxWidth: "88%",
          direction: "ltr",
          textAlign: "left",
          opacity: exit,
          transform: `translateY(${(1 - exit) * -14}px)`,
        }}
      >
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 15,
            letterSpacing: 4,
            color: props.accentColor,
            marginBottom: 12,
          }}
        >
          SMART SOCIAL SAFE ZONES
        </div>
        <div
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 900,
            fontSize: unit * 0.056,
            lineHeight: 1.12,
            letterSpacing: -1.5,
            color: props.textColor,
          }}
        >
          Smart safe zones keep your{" "}
          <span style={{ color: props.accentColor }}>captions framed</span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: "23%",
          bottom: "27%",
          left: "6%",
          right: "6%",
          opacity: exit,
          transform: `translateY(${(1 - exit) * 16}px)`,
        }}
      >
        <DepthStage>
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", gap: "5%" }}>
            <div
              style={{
                width: "44%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SpatialCard
                enterFrame={4}
                recedeFrame={250}
                tiltY={props.isRtl ? -6 : 6}
                shadowColor="rgba(2,6,23,0.7)"
                style={{
                  width: phoneW,
                  height: phoneH,
                  borderRadius: 34,
                  padding: 9,
                  background: "rgba(240,248,255,0.07)",
                  border: `2px solid ${props.accentColor}77`,
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    borderRadius: 26,
                    overflow: "hidden",
                    background: `linear-gradient(180deg, #255C9950, ${props.bgColor})`,
                    border: `1px solid ${props.accentColor}33`,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 9,
                      left: "50%",
                      width: "30%",
                      height: 7,
                      marginLeft: "-15%",
                      borderRadius: 99,
                      background: "rgba(240,248,255,0.35)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "8%",
                      bottom: "18%",
                      left: "8%",
                      right: "8%",
                      borderRadius: 16,
                      border: `2px dashed ${props.accentColor}`,
                      opacity: safe * 0.75,
                      transform: `scale(${interpolate(safe, [0, 1], [0.94, 1], CLAMP)})`,
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: -9,
                        left: 10,
                        padding: "2px 7px",
                        borderRadius: 6,
                        background: props.bgColor,
                        fontFamily: "monospace",
                        fontSize: 9,
                        letterSpacing: 1.5,
                        color: props.accentColor,
                      }}
                    >
                      SAFE ZONE
                    </span>
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      right: 7,
                      top: "42%",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      opacity: 0.28,
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <div key={i} style={{ width: 16, height: 16, borderRadius: "50%", background: props.textColor }} />
                    ))}
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      left: "8%",
                      right: "8%",
                      bottom: "21%",
                      display: "flex",
                      justifyContent: "center",
                      gap: 5,
                      padding: "8px 6px",
                      borderRadius: 12,
                      background: "rgba(5,22,42,0.82)",
                      border: `1px solid ${props.accentColor}44`,
                    }}
                  >
                    {CAPTION_WORDS.map((word, i) => (
                      <span
                        key={word}
                        style={{
                          fontFamily: "Inter, system-ui, sans-serif",
                          fontWeight: 800,
                          fontSize: phoneW * 0.055,
                          padding: "3px 4px",
                          borderRadius: 5,
                          color: i === activeWord ? props.bgColor : props.textColor,
                          background: i === activeWord ? props.accentColor : "transparent",
                          opacity: i === activeWord ? 1 : 0.72,
                        }}
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      left: 10,
                      bottom: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      opacity: 0.55,
                    }}
                  >
                    <Smartphone size={12} color={props.accentColor} />
                    <span style={{ fontFamily: "monospace", fontSize: 9, color: props.textColor }}>9:16</span>
                  </div>
                </div>
              </SpatialCard>
            </div>

            <div
              style={{
                flex: 1,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: unit * 0.018,
              }}
            >
              {PLATFORMS.map((platform, i) => {
                const s = spring({ frame: frame - 40 - i * 12, fps, config: { damping: 14, stiffness: 130 } });
                return (
                  <div
                    key={platform.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: `${unit * 0.012}px ${unit * 0.016}px`,
                      borderRadius: 14,
                      background: "rgba(240,248,255,0.05)",
                      border: `1px solid ${props.accentColor}44`,
                      opacity: s,
                      transform: `translateX(${interpolate(s, [0, 1], [26, 0], CLAMP)}px)`,
                    }}
                  >
                    <platform.icon size={Math.round(unit * 0.024)} color={props.accentColor} />
                    <span style={{ fontSize: unit * 0.016, fontWeight: 700, color: props.textColor }}>
                      {platform.label}
                    </span>
                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
                      <ShieldCheck size={Math.round(unit * 0.018)} color="#BAE6FD" />
                      <span style={{ fontFamily: "monospace", fontSize: unit * 0.011, color: props.mutedColor }}>SAFE</span>
                    </div>
                  </div>
                );
              })}

              <SpatialCard
                enterFrame={210}
                tiltY={props.isRtl ? 6 : -6}
                shadowColor="rgba(2,6,23,0.6)"
                style={{
                  width: "100%",
                  borderRadius: 18,
                  padding: `${unit * 0.014}px ${unit * 0.016}px`,
                  background: "rgba(37,92,153,0.3)",
                  border: `1px solid ${props.accentColor}66`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Volume2 size={Math.round(unit * 0.018)} color={props.accentColor} />
                  <span style={{ fontSize: unit * 0.012, fontWeight: 700, letterSpacing: 1.5, color: props.textColor }}>
                    ELEVENLABS VOICEOVER
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 3, height: unit * 0.05 }}>
                  {Array.from({ length: 18 }).map((_, b) => (
                    <div
                      key={b}
                      style={{
                        flex: 1,
                        height: `${18 + Math.abs(Math.sin(frame / 7 + b * 0.8)) * 82}%`,
                        borderRadius: 99,
                        background: b % 4 === 0 ? "#BAE6FD" : props.accentColor,
                        opacity: 0.85,
                      }}
                    />
                  ))}
                </div>
                <div style={{ marginTop: 6, fontFamily: "monospace", fontSize: unit * 0.01, letterSpacing: 1.5, color: props.mutedColor }}>
                  SYNCED TO EVERY BEAT
                </div>
              </SpatialCard>
            </div>
          </div>
        </DepthStage>
      </div>

      <SceneSfx name="check" frame={210} volume={0.18} />
    </AbsoluteFill>
  );
};
