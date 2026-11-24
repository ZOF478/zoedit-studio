import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneSfx } from "../components/SceneSfx";
import { SmartIcon } from "../components/SmartIcon";
import { Play } from "lucide-react";

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

const SURFACE = "#162033";
const TRACKS = [
  { name: "V1", clips: [18, 34, 22] },
  { name: "A1", clips: [40, 28, 16] },
  { name: "CC", clips: [24, 52, 12] },
];
const TICKS = Array.from({ length: 17 }, (_, i) => i);

export const Scene6 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();
  const exit = interpolate(
    frame,
    [Math.max(0, durationInFrames - 10), Math.max(1, durationInFrames - 1)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const reveal = spring({ frame: frame - 80, fps, config: { damping: 18, stiffness: 90 } });
  const zoom = 1.42 - 0.42 * reveal;
  const badge = spring({ frame: frame - 250, fps, config: { damping: 13, stiffness: 150 } });
  const playhead = (frame / durationInFrames) * 100;
  const titleSize = Math.min(width * 0.08, 84);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: props.bgColor,
        overflow: "hidden",
        direction: props.isRtl ? "rtl" : "ltr",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 44%, ${props.accentColor}22, transparent 64%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.05,
          backgroundImage: `radial-gradient(${props.textColor} 1px, transparent 1px)`,
          backgroundSize: "38px 38px",
        }}
      />

      <div
        style={{
          opacity: exit,
          transform: `translateY(${(1 - exit) * 20}px) scale(${0.985 + exit * 0.015})`,
          height: "100%",
          width: "100%",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "7.5%",
            left: 48,
            right: 48,
            direction: "ltr",
            textAlign: "left",
          }}
        >
          <div
            style={{
              color: props.accentColor,
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: 5,
              marginBottom: 16,
            }}
          >
            THE META REVEAL
          </div>
          <div
            style={{
              color: props.textColor,
              fontSize: titleSize,
              fontWeight: 900,
              lineHeight: 1.08,
              letterSpacing: -2,
              maxWidth: "92%",
            }}
          >
            This video made itself.
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: "26%",
            left: "7%",
            right: "7%",
            height: 540,
            transform: `scale(${zoom})`,
            transformOrigin: "58% 34%",
          }}
        >
          <div
            style={{
              height: "100%",
              backgroundColor: SURFACE,
              borderRadius: 22,
              border: `1px solid ${props.accentColor}55`,
              overflow: "hidden",
              boxShadow: `0 30px 80px #00000088, 0 0 44px ${props.accentColor}22`,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                height: 44,
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "0 16px",
                borderBottom: `1px solid ${props.mutedColor}33`,
                flexShrink: 0,
              }}
            >
              {[0, 1, 2].map((dot) => (
                <div
                  key={dot}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: dot === 0 ? props.accentColor : `${props.mutedColor}88`,
                  }}
                />
              ))}
              <div
                style={{
                  color: props.mutedColor,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  marginLeft: 6,
                }}
              >
                zofstudio — remotion timeline
              </div>
              <div style={{ flex: 1 }} />
              <SmartIcon query="react" brand size={18} color={props.accentColor} />
              <SmartIcon query="remotion" brand size={18} color={props.accentColor} />
            </div>

            <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
              <div
                style={{
                  flex: 1.6,
                  position: "relative",
                  backgroundColor: props.bgColor,
                  overflow: "hidden",
                  borderRight: `1px solid ${props.mutedColor}33`,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: "10% 14%",
                    borderRadius: 14,
                    border: `1px solid ${props.accentColor}44`,
                    background: `radial-gradient(circle at 50% 46%, ${props.accentColor}33, transparent 62%)`,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "46%",
                      width: 150,
                      height: 150,
                      marginLeft: -75,
                      marginTop: -75,
                      borderRadius: "50%",
                      border: `2px solid ${props.accentColor}`,
                      transform: `scale(${0.86 + 0.08 * Math.sin(frame / 14)})`,
                      opacity: 0.7,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "46%",
                      width: 80,
                      height: 80,
                      marginLeft: -40,
                      marginTop: -40,
                      borderRadius: "50%",
                      backgroundColor: props.accentColor,
                      filter: "blur(14px)",
                      opacity: 0.65,
                      transform: `scale(${1 + 0.08 * Math.sin(frame / 10)})`,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: "16%",
                      right: "16%",
                      bottom: 18,
                      display: "flex",
                      gap: 6,
                      alignItems: "flex-end",
                      height: 54,
                    }}
                  >
                    {Array.from({ length: 9 }, (_, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 12 + 34 * Math.abs(Math.sin(frame / 13 + i)),
                          borderRadius: 4,
                          backgroundColor: i % 2 ? `${props.accentColor}88` : `${props.textColor}66`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: 14,
                    top: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: props.textColor,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 1.5,
                  }}
                >
                  <Play size={12} color={props.accentColor} />
                  PREVIEW · 60 FPS
                </div>
              </div>

              <div style={{ flex: 1, padding: 16 }}>
                <div
                  style={{
                    color: props.accentColor,
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 2,
                    marginBottom: 14,
                  }}
                >
                  EXPORT
                </div>
                {[
                  ["RESOLUTION", "1080 × 1920"],
                  ["FRAME RATE", "60 FPS"],
                  ["CODEC", "H.264"],
                  ["STATUS", "RENDERING"],
                ].map(([label, value], i) => {
                  const enter = spring({
                    frame: frame - i * 12,
                    fps,
                    config: { damping: 200, stiffness: 120 },
                  });
                  return (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "10px 0",
                        borderBottom: `1px solid ${props.mutedColor}22`,
                        opacity: enter,
                      }}
                    >
                      <div
                        style={{
                          color: props.mutedColor,
                          fontSize: 9.5,
                          fontWeight: 800,
                          letterSpacing: 1,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          color: i === 3 ? props.accentColor : props.textColor,
                          fontSize: 10.5,
                          fontWeight: 800,
                          textAlign: "right",
                        }}
                      >
                        {value}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                height: 196,
                borderTop: `1px solid ${props.mutedColor}33`,
                padding: "12px 16px 16px",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", gap: 12, height: 18 }}>
                {TICKS.map((tick) => (
                  <div
                    key={tick}
                    style={{
                      flex: 1,
                      borderLeft: `1px solid ${props.mutedColor}55`,
                      color: props.mutedColor,
                      fontSize: 7,
                      paddingLeft: 3,
                      fontWeight: 700,
                    }}
                  >
                    {tick * 2}
                  </div>
                ))}
              </div>
              <div style={{ position: "relative", marginTop: 8 }}>
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: `${playhead}%`,
                    width: 2,
                    backgroundColor: props.accentColor,
                    boxShadow: `0 0 12px ${props.accentColor}`,
                    zIndex: 4,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: -5,
                      left: -4,
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      backgroundColor: props.accentColor,
                    }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {TRACKS.map((track, row) => (
                    <div key={track.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 26,
                          color: props.mutedColor,
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: 1,
                        }}
                      >
                        {track.name}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          height: 32,
                          display: "flex",
                          gap: 4,
                          backgroundColor: `${props.textColor}08`,
                          borderRadius: 6,
                          padding: 3,
                        }}
                      >
                        {track.clips.map((clip, i) => (
                          <div
                            key={i}
                            style={{
                              width: `${clip}%`,
                              borderRadius: 4,
                              background: `linear-gradient(90deg, ${props.accentColor}${row === 2 ? "bb" : "66"}, ${props.accentColor}22)`,
                              border: `1px solid ${props.accentColor}55`,
                              opacity: 0.7 + 0.2 * Math.sin(frame / 30 + row + i),
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: "59%",
            left: "8%",
            right: "8%",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "15px 22px",
              borderRadius: 999,
              backgroundColor: SURFACE,
              border: `2px solid ${props.accentColor}`,
              boxShadow: `0 0 30px ${props.accentColor}55`,
              opacity: badge,
              transform: `scale(${0.86 + badge * 0.14})`,
            }}
          >
            <SmartIcon query="sparkles" size={24} color={props.accentColor} />
            <div
              style={{
                color: props.textColor,
                fontSize: 18,
                fontWeight: 900,
                letterSpacing: 0.5,
              }}
            >
              Rendered by Zof Studio itself
            </div>
          </div>
        </div>
      </div>

      <SceneSfx name="whoosh" frame={100} volume={0.18} />
    </AbsoluteFill>
  );
};
