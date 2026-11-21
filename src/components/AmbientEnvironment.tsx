import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { alpha, type Theme } from "../theme";
import type { AmbientEnvironment as AmbientEnvironmentId } from "../types";

type AmbientEnvironmentProps = {
  variant: AmbientEnvironmentId;
  theme: Theme;
  seed?: number;
};

const RainStreaks = ({
  theme,
  density = 26,
  seed = 1,
}: {
  theme: Theme;
  density?: number;
  seed?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const time = frame / fps;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {Array.from({ length: density }, (_, index) => {
        const x = ((index * 53 + seed * 17) % 100) + Math.sin(time + index) * 1.5;
        const speed = 72 + ((index * 29) % 46);
        const y = ((time * speed + index * 41) % (height + 160)) - 80;
        const length = 24 + ((index * 13) % 42);
        return (
          <span
            key={`rain-${index}`}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: y,
              width: 2,
              height: length,
              borderRadius: 999,
              background: `linear-gradient(180deg, transparent, ${alpha(
                theme.colors.accent,
                0.55,
              )})`,
              opacity: 0.4 + ((index % 5) / 10),
              transform: `rotate(${8 + (index % 4)}deg)`,
            }}
          />
        );
      })}
    </div>
  );
};

export const AmbientEnvironment = ({
  variant,
  theme,
  seed = 3,
}: AmbientEnvironmentProps) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const time = frame / fps;
  if (variant === "none") {
    return null;
  }

  const primary = theme.colors.primary;
  const accent = theme.colors.accent;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 1,
      }}
    >
      {variant === "night-room" || variant === "cozy-desk" ? (
        <>
          <div
            style={{
              position: "absolute",
              left: "6%",
              top: "8%",
              width: "34%",
              height: "42%",
              borderRadius: 18,
              border: `2px solid ${alpha(theme.colors.text, 0.16)}`,
              background: `linear-gradient(180deg, ${alpha(
                "#0B1220",
                0.72,
              )} 0%, ${alpha(accent, 0.08)} 100%)`,
              boxShadow: `inset 0 0 60px ${alpha(primary, 0.18)}`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                right: "16%",
                top: "16%",
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: alpha("#FDE68A", 0.85),
                boxShadow: `0 0 48px ${alpha("#FDE68A", 0.45)}`,
              }}
            />
            <svg
              viewBox="0 0 200 120"
              preserveAspectRatio="none"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            >
              {Array.from({ length: 9 }, (_, index) => {
                const buildingHeight = 20 + ((index * 17 + seed * 7) % 58);
                const x = index * 24 - 6;
                return (
                  <rect
                    key={`building-${index}`}
                    x={x}
                    y={120 - buildingHeight}
                    width={18}
                    height={buildingHeight}
                    fill={alpha(theme.colors.text, 0.18)}
                  />
                );
              })}
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(120deg, ${alpha(
                  "#FDE68A",
                  0.08,
                )} 0%, transparent 45%)`,
                transform: `translateX(${Math.sin(time * 0.6) * 8}px)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: 0,
                bottom: 0,
                width: 2,
                background: alpha(theme.colors.text, 0.14),
              }}
            />
          </div>
          <RainStreaks theme={theme} density={18} seed={seed} />
        </>
      ) : null}

      {variant === "desk-lamp" || variant === "cozy-desk" ? (
        <>
          <div
            style={{
              position: "absolute",
              right: "12%",
              bottom: "12%",
              width: "34%",
              height: "46%",
              background: `conic-gradient(from 200deg at 80% 10%, ${alpha(
                primary,
                0.32,
              )} 0deg, transparent 58deg)`,
              filter: "blur(2px)",
              opacity: 0.8 + Math.sin(time * 1.8) * 0.04,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: "18%",
              bottom: "20%",
              width: 10,
              height: "26%",
              borderRadius: 999,
              background: alpha(theme.colors.text, 0.4),
            }}
          />
          <div
            style={{
              position: "absolute",
              right: "14%",
              bottom: "44%",
              width: 58,
              height: 34,
              borderRadius: "28px 28px 8px 8px",
              background: `linear-gradient(180deg, ${primary}, ${alpha(
                primary,
                0.6,
              )})`,
              boxShadow: `0 0 40px ${alpha(primary, 0.55)}`,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: "16%",
              bottom: "17%",
              width: "18%",
              height: 10,
              borderRadius: 999,
              background: alpha(theme.colors.text, 0.28),
            }}
          />
        </>
      ) : null}

      {variant === "rain-window" ? (
        <>
          <div
            style={{
              position: "absolute",
              inset: "6% 8%",
              borderRadius: 22,
              border: `2px solid ${alpha(theme.colors.text, 0.16)}`,
              background: `linear-gradient(160deg, ${alpha(
                "#0B1220",
                0.7,
              )} 0%, ${alpha(accent, 0.1)} 100%)`,
            }}
          />
          <RainStreaks theme={theme} density={38} seed={seed} />
        </>
      ) : null}

      {variant === "clock" ? (
        <div
          style={{
            position: "absolute",
            right: "8%",
            top: "8%",
            width: 140,
            height: 140,
            borderRadius: "50%",
            border: `3px solid ${alpha(theme.colors.text, 0.24)}`,
            background: alpha(theme.colors.background, 0.45),
            boxShadow: `0 0 30px ${alpha(primary, 0.2)}`,
          }}
        >
          {Array.from({ length: 12 }, (_, index) => (
            <span
              key={`tick-${index}`}
              style={{
                position: "absolute",
                left: "50%",
                top: 8,
                width: 2,
                height: 10,
                background: alpha(theme.colors.text, 0.5),
                transformOrigin: "50% 62px",
                transform: `translateX(-50%) rotate(${index * 30}deg)`,
              }}
            />
          ))}
          <span
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 3,
              height: 38,
              background: primary,
              transformOrigin: "50% 100%",
              transform: `translate(-50%, -100%) rotate(${time * 6}deg)`,
              borderRadius: 999,
            }}
          />
          <span
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 5,
              height: 28,
              background: accent,
              transformOrigin: "50% 100%",
              transform: `translate(-50%, -100%) rotate(${time * 36}deg)`,
              borderRadius: 999,
            }}
          />
        </div>
      ) : null}

      {variant === "phone-notifications" ? (
        <div
          style={{
            position: "absolute",
            right: "10%",
            bottom: "14%",
            width: Math.min(150, width * 0.16),
            height: Math.min(300, height * 0.34),
            borderRadius: 26,
            border: `2px solid ${alpha(theme.colors.text, 0.22)}`,
            background: alpha(theme.colors.background, 0.55),
            boxShadow: `0 16px 50px ${alpha("#000000", 0.4)}`,
            overflow: "hidden",
            transform: `translateY(${Math.sin(time * 1.1) * 6}px)`,
          }}
        >
          {[0, 1, 2].map((index) => {
            const appear = interpolate(
              (time + index * 0.8) % 3.2,
              [0, 0.4, 2.4, 3.2],
              [0, 1, 1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            return (
              <div
                key={`notification-${index}`}
                style={{
                  position: "absolute",
                  left: 10,
                  right: 10,
                  top: 20 + index * 54,
                  borderRadius: 12,
                  padding: "8px 10px",
                  background: alpha(theme.colors.surface, 0.9),
                  border: `1px solid ${alpha(accent, 0.4)}`,
                  opacity: appear,
                  transform: `translateY(${(1 - appear) * 14}px)`,
                }}
              >
                <div
                  style={{
                    width: "58%",
                    height: 6,
                    borderRadius: 999,
                    background: alpha(theme.colors.text, 0.55),
                  }}
                />
                <div
                  style={{
                    marginTop: 6,
                    width: "82%",
                    height: 4,
                    borderRadius: 999,
                    background: alpha(theme.colors.muted, 0.55),
                  }}
                />
              </div>
            );
          })}
        </div>
      ) : null}

      {variant === "cozy-desk" ? (
        <div
          style={{
            position: "absolute",
            left: "10%",
            bottom: "12%",
            width: 70,
            height: 84,
            borderRadius: "12px 12px 18px 18px",
            background: alpha(theme.colors.text, 0.2),
            border: `2px solid ${alpha(theme.colors.text, 0.28)}`,
          }}
        >
          {[0, 1, 2].map((index) => (
            <span
              key={`steam-${index}`}
              style={{
                position: "absolute",
                left: 18 + index * 16,
                top: -22,
                width: 6,
                height: 24,
                borderRadius: 999,
                background: alpha("#FFFFFF", 0.16),
                transform: `translateY(${Math.sin(time * 2 + index) * 6}px) scaleX(${
                  0.7 + Math.sin(time * 1.4 + index) * 0.3
                })`,
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};
