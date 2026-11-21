import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { alpha, type Theme } from "../theme";
import type { BackgroundPresetId } from "../types";

type BackgroundProps = {
  theme: Theme;
  preset?: BackgroundPresetId;
  seed?: number;
};

const AI_PRESET_POOL: BackgroundPresetId[] = [
  "animated-mesh",
  "kinetic-grid",
  "floating-orbs",
  "deep-wave",
  "particle-field",
  "neon-cyber",
  "animated-mesh",
  "deep-wave",
];

const pickAiPreset = (seed: number, style: string): BackgroundPresetId => {
  const base = Math.abs(Math.floor(seed)) + style.length * 7;
  return AI_PRESET_POOL[base % AI_PRESET_POOL.length];
};

const Blob = ({
  color,
  size,
  x,
  y,
  blur,
  opacity,
}: {
  color: string;
  size: number;
  x: string;
  y: string;
  blur: number;
  opacity: number;
}) => {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderRadius: "50%",
        background: `radial-gradient(circle at 40% 35%, ${color}, transparent 70%)`,
        filter: `blur(${blur}px)`,
        opacity,
      }}
    />
  );
};

const PresetBackground = ({
  theme,
  preset,
  seed,
}: {
  theme: Theme;
  preset: BackgroundPresetId;
  seed: number;
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const seconds = frame / fps;
  const minSide = Math.min(width, height);
  const accent = theme.colors.primary;
  const secondary = theme.colors.secondary;
  const third = theme.colors.accent;
  const drift = Math.sin(seconds * 0.32) * minSide * 0.045;
  const driftAlt = Math.cos(seconds * 0.26) * minSide * 0.038;

  if (preset === "animated-mesh") {
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: "-18%",
            background: `conic-gradient(from ${seconds * 18}deg at 50% 50%, ${alpha(
              accent,
              0.4,
            )}, ${alpha(secondary, 0.32)} 28%, ${alpha(third, 0.24)} 48%, ${alpha(
              accent,
              0.36,
            )} 72%, ${alpha(secondary, 0.32)} 100%)`,
            filter: `blur(${Math.round(minSide * 0.13)}px)`,
            opacity: 0.72,
          }}
        />
        <Blob
          color={alpha(theme.colors.backgroundAlt, 0.9)}
          size={minSide * 1.1}
          x={`${50 + Math.sin(seconds * 0.5) * 10}%`}
          y={`${48 + Math.cos(seconds * 0.42) * 8}%`}
          blur={minSide * 0.16}
          opacity={0.45}
        />
        <Blob
          color={alpha(accent, 0.6)}
          size={minSide * 0.62}
          x={`${22 + Math.sin(seconds * 0.6) * 6}%`}
          y={`${28 + Math.cos(seconds * 0.5) * 7}%`}
          blur={minSide * 0.08}
          opacity={0.65}
        />
        <Blob
          color={alpha(third, 0.45)}
          size={minSide * 0.55}
          x={`${78 + Math.cos(seconds * 0.48) * 7}%`}
          y={`${72 + Math.sin(seconds * 0.55) * 6}%`}
          blur={minSide * 0.09}
          opacity={0.6}
        />
      </AbsoluteFill>
    );
  }

  if (preset === "kinetic-grid") {
    const gap = Math.round(minSide * 0.072);
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <AbsoluteFill
          style={{
            backgroundImage: `linear-gradient(${alpha(accent, 0.2)} 1.5px, transparent 1.5px), linear-gradient(90deg, ${alpha(
              accent,
              0.2,
            )} 1.5px, transparent 1.5px)`,
            backgroundSize: `${gap}px ${gap}px`,
            transform: `perspective(${Math.round(minSide * 1.4)}px) rotateX(58deg) scale(1.5) translateY(${
              seconds * 14
            }px)`,
            transformOrigin: "50% 100%",
            opacity: 0.8,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at 50% 62%, transparent 18%, ${alpha(
              theme.colors.background,
              0.86,
            )} 72%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${(seconds * 22) % 100}%`,
            height: Math.round(minSide * 0.008),
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            boxShadow: `0 0 ${Math.round(minSide * 0.05)}px ${accent}`,
            opacity: 0.7,
          }}
        />
      </AbsoluteFill>
    );
  }

  if (preset === "floating-orbs") {
    const orbs = [
      { size: 0.34, x: 24, y: 26, phase: 0, color: accent },
      { size: 0.24, x: 76, y: 32, phase: 1.4, color: secondary },
      { size: 0.2, x: 62, y: 74, phase: 2.2, color: third },
      { size: 0.14, x: 32, y: 78, phase: 3.1, color: accent },
      { size: 0.1, x: 84, y: 62, phase: 4.2, color: secondary },
    ];
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        {orbs.map((orb, index) => {
          const ox = Math.sin(seconds * 0.5 + orb.phase) * minSide * 0.06;
          const oy = Math.cos(seconds * 0.4 + orb.phase) * minSide * 0.05;
          const size = minSide * orb.size;
          return (
            <div
              key={index}
              style={{
                position: "absolute",
                left: `${orb.x}%`,
                top: `${orb.y}%`,
                width: size,
                height: size,
                marginLeft: -size / 2 + ox,
                marginTop: -size / 2 + oy,
                borderRadius: "50%",
                background: `radial-gradient(circle at 35% 30%, ${alpha(
                  orb.color,
                  0.75,
                )}, ${alpha(orb.color, 0.16)} 58%, transparent 72%)`,
                filter: `blur(${Math.round(minSide * 0.015)}px)`,
                boxShadow: `0 0 ${Math.round(size * 0.35)}px ${alpha(orb.color, 0.22)}`,
              }}
            />
          );
        })}
      </AbsoluteFill>
    );
  }

  if (preset === "deep-wave") {
    const waves = [0.72, 0.8, 0.88].map((base, index) => {
      const offset = Math.sin(seconds * 0.5 + index) * height * 0.05;
      const y = height * base + offset;
      return `M${-width * 0.2} ${y} C ${width * 0.18} ${y - height * 0.18}, ${width * 0.42} ${
        y + height * 0.1
      }, ${width * 0.7} ${y - height * 0.06} S ${width * 1.1} ${y + height * 0.14}, ${
        width * 1.2
      } ${y}`;
    });
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at 50% 108%, ${alpha(accent, 0.35)} 0%, transparent 58%), radial-gradient(ellipse at 12% 96%, ${alpha(
              secondary,
              0.28,
            )} 0%, transparent 50%)`,
          }}
        />
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ position: "absolute", inset: 0, width, height }}
        >
          {waves.map((d, index) => (
            <path
              key={index}
              d={d}
              fill="none"
              stroke={index === 0 ? alpha(accent, 0.5) : index === 1 ? alpha(secondary, 0.34) : alpha(third, 0.22)}
              strokeWidth={Math.max(2, minSide * (0.012 - index * 0.003))}
              strokeLinecap="round"
            />
          ))}
        </svg>
      </AbsoluteFill>
    );
  }

  if (preset === "particle-field") {
    const particles = Array.from({ length: 54 }, (_, index) => {
      const rand = (n: number) => {
        const value = Math.sin((index + 1) * 12.9898 + n * 78.233 + seed) * 43758.5453;
        return value - Math.floor(value);
      };
      const px = rand(1) * width;
      const py = rand(2) * height;
      const speed = 6 + rand(3) * 26;
      const radius = 1.5 + rand(4) * 3.4;
      const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(seconds * (0.7 + rand(5)) + index));
      return {
        x: (px + Math.sin(seconds * 0.25 + index) * 18) % width,
        y: (py - seconds * speed + height * 4) % height,
        radius,
        twinkle,
        color: index % 3 === 0 ? accent : index % 3 === 1 ? secondary : theme.colors.text,
      };
    });
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at 50% 40%, ${alpha(accent, 0.16)} 0%, transparent 55%)`,
          }}
        />
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ position: "absolute", inset: 0, width, height }}
        >
          {particles.map((particle, index) => (
            <circle
              key={index}
              cx={particle.x}
              cy={particle.y}
              r={particle.radius}
              fill={particle.color}
              opacity={particle.twinkle}
            />
          ))}
        </svg>
      </AbsoluteFill>
    );
  }

  if (preset === "editorial-paper") {
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: theme.isDark
              ? `linear-gradient(165deg, ${theme.colors.background} 0%, ${theme.colors.backgroundAlt} 100%)`
              : `linear-gradient(165deg, ${theme.colors.background} 0%, ${theme.colors.backgroundAlt} 100%)`,
          }}
        />
        <AbsoluteFill
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, ${alpha(
              theme.colors.text,
              0.06,
            )} 0 1px, transparent 1px ${Math.round(minSide * 0.045)}px)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -width * 0.12 + drift,
            top: height * 0.08,
            width: width * 0.6,
            height: width * 0.6,
            borderRadius: "50%",
            border: `1.5px solid ${alpha(theme.colors.text, 0.16)}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -width * 0.18 + driftAlt,
            bottom: height * 0.04,
            width: width * 0.52,
            height: width * 0.52,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${alpha(accent, 0.18)} 0%, transparent 66%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: width * 0.08,
            top: height * 0.1,
            width: Math.round(minSide * 0.14),
            height: Math.max(4, minSide * 0.008),
            borderRadius: 999,
            background: accent,
          }}
        />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: "-20%",
          background: `conic-gradient(from ${seconds * 28}deg at 62% 38%, ${alpha(
            accent,
            0.42,
          )}, transparent 32%, ${alpha(third, 0.36)} 54%, transparent 74%, ${alpha(secondary, 0.4)} 100%)`,
          filter: `blur(${Math.round(minSide * 0.08)}px)`,
          opacity: 0.8,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `repeating-linear-gradient(115deg, ${alpha(accent, 0.16)} 0 2px, transparent 2px ${Math.round(
            minSide * 0.02,
          )}px)`,
          transform: `translateX(${Math.sin(seconds * 0.6) * 22}px)`,
          opacity: 0.7,
        }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, transparent 58%, ${alpha(accent, 0.16)} 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "8%",
          right: "8%",
          bottom: `${18 + Math.sin(seconds * 0.5) * 2}%`,
          height: Math.round(minSide * 0.006),
          background: accent,
          boxShadow: `0 0 ${Math.round(minSide * 0.06)}px ${accent}`,
          opacity: 0.75,
        }}
      />
    </AbsoluteFill>
  );
};

export const Background = ({ theme, preset, seed = 0 }: BackgroundProps) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const seconds = frame / fps;
  const driftX = Math.sin(seconds * 0.28) * width * 0.035;
  const driftY = Math.cos(seconds * 0.22) * height * 0.025;
  const driftX2 = Math.cos(seconds * 0.19 + 1.2) * width * 0.04;
  const driftY2 = Math.sin(seconds * 0.24 + 0.6) * height * 0.03;
  const minSide = Math.min(width, height);
  const resolvedPreset = preset
    ? preset === "ai-free"
      ? pickAiPreset(seed, theme.id)
      : preset
    : undefined;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(150deg, ${theme.colors.background} 0%, ${theme.colors.backgroundAlt} 100%)`,
        overflow: "hidden",
      }}
    >
      {resolvedPreset ? (
        <PresetBackground theme={theme} preset={resolvedPreset} seed={seed} />
      ) : null}

      {!resolvedPreset && theme.id === "modern_dark" ? (
        <>
          <AbsoluteFill
            style={{
              backgroundImage:
                "linear-gradient(rgba(148, 163, 184, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.07) 1px, transparent 1px)",
              backgroundSize: `${Math.round(minSide * 0.075)}px ${Math.round(
                minSide * 0.075,
              )}px`,
              opacity: 0.55,
              maskImage:
                "radial-gradient(circle at 50% 45%, black 20%, transparent 78%)",
              WebkitMaskImage:
                "radial-gradient(circle at 50% 45%, black 20%, transparent 78%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              translate: `${driftX}px ${driftY}px`,
            }}
          >
            <Blob
              color={alpha(theme.colors.primary, 0.5)}
              size={minSide * 0.95}
              x="78%"
              y="16%"
              blur={minSide * 0.11}
              opacity={0.6}
            />
            <Blob
              color={alpha(theme.colors.secondary, 0.44)}
              size={minSide * 0.85}
              x="12%"
              y="78%"
              blur={minSide * 0.12}
              opacity={0.55}
            />
            <Blob
              color={alpha(theme.colors.accent, 0.3)}
              size={minSide * 0.55}
              x="58%"
              y="88%"
              blur={minSide * 0.1}
              opacity={0.6}
            />
          </div>
          <div
            style={{
              position: "absolute",
              width: minSide * 0.72,
              height: minSide * 0.72,
              borderRadius: "50%",
              border: `1px solid ${alpha(theme.colors.primary, 0.18)}`,
              left: `${52 + (driftX / width) * 100}%`,
              top: "22%",
              translate: "-50% -50%",
              boxShadow: `0 0 ${minSide * 0.12}px ${alpha(
                theme.colors.primary,
                0.14,
              )}`,
            }}
          />
          <AbsoluteFill
            style={{
              background:
                "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0, 0, 0, 0.55) 100%)",
            }}
          />
        </>
      ) : null}

      {!resolvedPreset && theme.id === "stickman" ? (
        <>
          <AbsoluteFill
            style={{
              backgroundImage: `radial-gradient(circle, ${alpha(
                theme.colors.text,
                0.13,
              )} 1.5px, transparent 1.6px)`,
              backgroundSize: `${Math.round(minSide * 0.052)}px ${Math.round(
                minSide * 0.052,
              )}px`,
              opacity: 0.55,
              maskImage:
                "radial-gradient(ellipse at 50% 40%, black 25%, transparent 80%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at 50% 40%, black 25%, transparent 80%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              translate: `${driftX}px ${driftY}px`,
            }}
          >
            <Blob
              color={alpha(theme.colors.secondary, 0.5)}
              size={minSide * 0.8}
              x="82%"
              y="14%"
              blur={minSide * 0.08}
              opacity={0.55}
            />
            <Blob
              color={alpha(theme.colors.primary, 0.35)}
              size={minSide * 0.75}
              x="10%"
              y="82%"
              blur={minSide * 0.09}
              opacity={0.5}
            />
            <Blob
              color={alpha(theme.colors.accent, 0.18)}
              size={minSide * 0.45}
              x="52%"
              y="58%"
              blur={minSide * 0.07}
              opacity={0.55}
            />
          </div>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{
              position: "absolute",
              inset: 0,
              width,
              height,
              overflow: "visible",
            }}
          >
            <path
              d={`M${-width * 0.1} ${height * 0.13} C ${width * 0.25} ${
                height * 0.02
              }, ${width * 0.45} ${height * 0.25}, ${width * 0.85} ${
                height * 0.09
              }`}
              fill="none"
              stroke={alpha(theme.colors.primary, 0.22)}
              strokeWidth={3}
              strokeDasharray="2 16"
              strokeLinecap="round"
            />
            <path
              d={`M${-width * 0.05} ${height * 0.86} C ${width * 0.3} ${
                height * 0.78
              }, ${width * 0.6} ${height * 0.97}, ${width * 1.05} ${
                height * 0.82
              }`}
              fill="none"
              stroke={alpha(theme.colors.accent, 0.18)}
              strokeWidth={3}
              strokeDasharray="2 18"
              strokeLinecap="round"
            />
            <circle
              cx={width * 0.12 + driftX2}
              cy={height * 0.18 + driftY2}
              r={minSide * 0.045}
              fill="none"
              stroke={alpha(theme.colors.primary, 0.4)}
              strokeWidth={4}
            />
            <circle
              cx={width * 0.89 + driftX2}
              cy={height * 0.7 + driftY2}
              r={minSide * 0.03}
              fill={alpha(theme.colors.secondary, 0.5)}
            />
          </svg>
        </>
      ) : null}

      {!resolvedPreset && theme.id === "editorial_clean" ? (
        <>
          <AbsoluteFill
            style={{
              backgroundImage:
                "linear-gradient(rgba(17, 17, 17, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(17, 17, 17, 0.045) 1px, transparent 1px)",
              backgroundSize: `${Math.round(minSide * 0.09)}px ${Math.round(
                minSide * 0.09,
              )}px`,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: -width * 0.08,
              top: -height * 0.08,
              width: width * 0.52,
              height: width * 0.52,
              borderRadius: "50%",
              border: `2px solid ${alpha(theme.colors.text, 0.14)}`,
              translate: `${driftX}px ${driftY}px`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -width * 0.16,
              bottom: height * 0.1,
              width: width * 0.46,
              height: width * 0.46,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${alpha(
                theme.colors.secondary,
                0.22,
              )} 0%, transparent 68%)`,
              translate: `${driftX2}px ${driftY2}px`,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              width: width * 0.22,
              height: height * 0.32,
              background: `linear-gradient(180deg, transparent, ${alpha(
                theme.colors.primary,
                0.1,
              )})`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: width * 0.065,
              top: height * 0.055,
              width: width * 0.055,
              height: Math.max(4, minSide * 0.008),
              background: theme.colors.accent,
              borderRadius: 999,
            }}
          />
        </>
      ) : null}

      <AbsoluteFill
        style={{
          background: theme.isDark
            ? "linear-gradient(180deg, rgba(255,255,255,0.02), transparent 30%, rgba(0,0,0,0.12))"
            : "linear-gradient(180deg, rgba(255,255,255,0.28), transparent 30%, rgba(0,0,0,0.025))",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
