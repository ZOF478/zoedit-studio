import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneSfx } from "../components/SceneSfx";
import { SmartIcon } from "../components/SmartIcon";

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
const COMMAND = "$ zofstudio";
const URL_LINE = "> launching http://localhost:4789";
const STATS = [
  { icon: "code", value: "100%", label: "OPEN SOURCE" },
  { icon: "lock", value: "LOCAL", label: "PRIVATE BY DEFAULT" },
  { icon: "coins", value: "$0", label: "FREE MODELS" },
];

export const Scene5 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();
  const exit = interpolate(
    frame,
    [Math.max(0, durationInFrames - 10), Math.max(1, durationInFrames - 1)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const typedCmd = COMMAND.slice(
    0,
    Math.round(
      interpolate(frame, [15, 70], [0, COMMAND.length], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    ),
  );
  const typedUrl = URL_LINE.slice(
    0,
    Math.round(
      interpolate(frame, [105, 175], [0, URL_LINE.length], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    ),
  );
  const live = interpolate(frame, [180, 225], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const badge = spring({ frame: frame - 190, fps, config: { damping: 14, stiffness: 140 } });
  const titleSize = Math.min(width * 0.078, 82);
  const readyLine = spring({ frame: frame - 190, fps, config: { damping: 200, stiffness: 120 } });

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
          background: `radial-gradient(circle at 50% 38%, ${props.accentColor}1c, transparent 62%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.05,
          backgroundImage: `linear-gradient(${props.textColor} 1px, transparent 1px), linear-gradient(90deg, ${props.textColor} 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${(i * 59) % 100}%`,
            top: `${(i * 41) % 100}%`,
            width: 3,
            height: 3,
            borderRadius: "50%",
            backgroundColor: props.accentColor,
            opacity: 0.15 + 0.14 * Math.sin(frame / 24 + i),
            transform: `translateY(${Math.sin(frame / 40 + i) * 16}px)`,
          }}
        />
      ))}

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
            top: "8%",
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
            100% OPEN SOURCE
          </div>
          <div
            style={{
              color: props.textColor,
              fontSize: titleSize,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: -2,
              maxWidth: "90%",
            }}
          >
            Your studio. Your machine.
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: "24%",
            left: "8%",
            right: "8%",
            backgroundColor: SURFACE,
            borderRadius: 22,
            border: `1px solid ${props.mutedColor}55`,
            overflow: "hidden",
            boxShadow: `0 22px 60px #00000066, 0 0 30px ${props.accentColor}1f`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 18px",
              borderBottom: `1px solid ${props.mutedColor}33`,
            }}
          >
            {[0, 1, 2].map((dot) => (
              <div
                key={dot}
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  backgroundColor: dot === 0 ? props.accentColor : `${props.mutedColor}88`,
                }}
              />
            ))}
            <div
              style={{
                color: props.mutedColor,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 2,
                marginLeft: 8,
              }}
            >
              zofstudio — local
            </div>
          </div>
          <div style={{ padding: "20px 22px 22px" }}>
            <div
              style={{
                color: props.textColor,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 21,
                fontWeight: 700,
                lineHeight: 1.7,
                whiteSpace: "pre",
              }}
            >
              {typedCmd}
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 20,
                  marginLeft: 4,
                  backgroundColor: props.accentColor,
                  opacity: Math.sin(frame / 5) > 0 ? 1 : 0,
                  verticalAlign: "middle",
                }}
              />
            </div>
            <div
              style={{
                color: props.accentColor,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 18,
                fontWeight: 700,
                lineHeight: 1.7,
                whiteSpace: "pre",
                minHeight: 31,
              }}
            >
              {typedUrl}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
                color: props.textColor,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 15,
                fontWeight: 600,
                opacity: readyLine,
                transform: `translateX(${(1 - readyLine) * 14}px)`,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: props.accentColor,
                  boxShadow: `0 0 10px ${props.accentColor}`,
                }}
              />
              ready · local · private
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: "43%",
            left: "8%",
            right: "8%",
            display: "flex",
            gap: 14,
          }}
        >
          {STATS.map((stat, i) => {
            const enter = spring({
              frame: frame - i * 12,
              fps,
              config: { damping: 200, stiffness: 120 },
            });
            return (
              <div
                key={stat.label}
                style={{
                  flex: 1,
                  backgroundColor: SURFACE,
                  borderRadius: 18,
                  border: `1px solid ${props.accentColor}33`,
                  padding: 16,
                  opacity: enter,
                  transform: `translateY(${(1 - enter) * 24}px)`,
                  minWidth: 0,
                }}
              >
                <SmartIcon query={stat.icon} size={26} color={props.accentColor} />
                <div
                  style={{
                    color: props.textColor,
                    fontSize: 34,
                    fontWeight: 900,
                    lineHeight: 1,
                    marginTop: 14,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    color: props.mutedColor,
                    fontSize: 11.5,
                    fontWeight: 800,
                    letterSpacing: 1,
                    marginTop: 8,
                    lineHeight: 1.35,
                  }}
                >
                  {stat.label}
                </div>
                <div
                  style={{
                    height: 7,
                    borderRadius: 999,
                    backgroundColor: `${props.textColor}18`,
                    marginTop: 14,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${live * 100}%`,
                      borderRadius: 999,
                      background: `linear-gradient(90deg, ${props.accentColor}, ${props.textColor})`,
                    }}
                  />
                </div>
              </div>
            );
          })}
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
              padding: "14px 20px",
              borderRadius: 999,
              backgroundColor: SURFACE,
              border: `2px solid ${props.accentColor}`,
              boxShadow: `0 0 ${18 + live * 20}px ${props.accentColor}44`,
              opacity: badge,
              transform: `scale(${0.85 + badge * 0.15})`,
              maxWidth: "100%",
            }}
          >
            <SmartIcon query="shield check" size={26} color={props.accentColor} />
            <div
              style={{
                color: props.textColor,
                fontSize: 14.5,
                fontWeight: 800,
                letterSpacing: 0.6,
                lineHeight: 1.35,
                textAlign: "left",
              }}
            >
              100% Open Source • Local-First • Free Models Supported
            </div>
          </div>
        </div>
      </div>

      <SceneSfx name="pop" frame={190} volume={0.18} />
    </AbsoluteFill>
  );
};
