import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneSfx } from "../components/SceneSfx";
import { SmartIcon } from "../components/SmartIcon";
import { Stickman } from "../components/Stickman";

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
const LINKS = [
  { icon: "github", brand: true, label: "GITHUB", value: "github.com/ZOF478/zofstudio" },
  { icon: "globe", brand: false, label: "WEBSITE", value: "studio.zoedit.com" },
];

export const Scene7 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();
  const exit = interpolate(
    frame,
    [Math.max(0, durationInFrames - 10), Math.max(1, durationInFrames - 1)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const callout = 1 + 0.035 * Math.sin(frame / 7);
  const badge = spring({ frame: frame - 80, fps, config: { damping: 13, stiffness: 150 } });
  const glow = 0.5 + 0.5 * Math.sin(frame / 12);
  const brand = spring({ frame, fps, config: { damping: 15, stiffness: 120 } });
  const titleSize = Math.min(width * 0.07, 74);

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
          background: `radial-gradient(circle at 42% 48%, ${props.accentColor}26, transparent 60%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.05,
          backgroundImage: `linear-gradient(${props.textColor} 1px, transparent 1px), linear-gradient(90deg, ${props.textColor} 1px, transparent 1px)`,
          backgroundSize: "100px 100px",
        }}
      />
      {Array.from({ length: 14 }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${(i * 53) % 100}%`,
            top: `${(i * 29) % 100}%`,
            width: 3,
            height: 3,
            borderRadius: "50%",
            backgroundColor: props.accentColor,
            opacity: 0.16 + 0.14 * Math.sin(frame / 22 + i),
            transform: `translateY(${Math.sin(frame / 38 + i) * 18}px)`,
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
            top: "7%",
            left: 48,
            right: 48,
            display: "flex",
            alignItems: "center",
            gap: 16,
            direction: "ltr",
            textAlign: "left",
            opacity: brand,
            transform: `translateY(${(1 - brand) * 24}px)`,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              backgroundColor: props.accentColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: props.bgColor,
              fontSize: 36,
              fontWeight: 900,
              boxShadow: `0 0 ${20 + glow * 18}px ${props.accentColor}88`,
              flexShrink: 0,
            }}
          >
            Z
          </div>
          <div>
            <div
              style={{
                color: props.textColor,
                fontSize: titleSize,
                fontWeight: 900,
                letterSpacing: -1,
                lineHeight: 1,
              }}
            >
              ZOF STUDIO
            </div>
            <div
              style={{
                color: props.accentColor,
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: 3,
                marginTop: 8,
              }}
            >
              LINK IN BIO + GITHUB
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: "25%",
            left: 48,
            width: "58%",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {LINKS.map((link, i) => {
            const enter = spring({
              frame: frame - i * 12,
              fps,
              config: { damping: 200, stiffness: 120 },
            });
            return (
              <div
                key={link.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "18px 20px",
                  borderRadius: 20,
                  backgroundColor: SURFACE,
                  border: `1px solid ${props.accentColor}55`,
                  boxShadow: `0 12px 34px #00000055`,
                  opacity: enter,
                  transform: `translateX(${(1 - enter) * -26}px)`,
                }}
              >
                <SmartIcon
                  query={link.icon}
                  brand={link.brand}
                  size={34}
                  color={props.accentColor}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      color: props.mutedColor,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 2,
                    }}
                  >
                    {link.label}
                  </div>
                  <div
                    style={{
                      color: props.textColor,
                      fontSize: 19,
                      fontWeight: 800,
                      marginTop: 5,
                      letterSpacing: -0.4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {link.value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: "absolute",
            top: "44%",
            left: 48,
            width: "58%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 16px",
              borderRadius: 999,
              border: `1px solid ${props.accentColor}77`,
              backgroundColor: `${props.accentColor}12`,
              opacity: badge,
              transform: `translateY(${(1 - badge) * 18}px)`,
            }}
          >
            <SmartIcon query="sparkles" size={20} color={props.accentColor} />
            <div
              style={{
                color: props.accentColor,
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: 1.5,
              }}
            >
              FREE & OPEN SOURCE
            </div>
          </div>
          <div
            style={{
              color: props.textColor,
              fontSize: Math.min(width * 0.065, 68),
              fontWeight: 900,
              lineHeight: 1.08,
              letterSpacing: -1.5,
              transform: `scale(${callout})`,
              transformOrigin: "left center",
              textShadow: `0 0 ${24 + glow * 16}px ${props.accentColor}66`,
            }}
          >
            What are you
            <br />
            waiting for?
          </div>
          <div
            style={{
              color: props.mutedColor,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            Clone it. Run it. Render it.
          </div>
        </div>

        {props.showCharacter !== false && (
          <div
            style={{
              position: "absolute",
              right: 40,
              bottom: "30%",
              width: 260,
              height: 380,
            }}
          >
            <Stickman
              pose="celebrating"
              color={props.characterBody}
              faceColor={props.characterFace}
              accent={props.characterAccent}
              shadow={props.characterShadow}
              accessory="badge"
              delay={12}
            />
          </div>
        )}
      </div>

      <SceneSfx name="pop" frame={80} volume={0.18} />
    </AbsoluteFill>
  );
};
