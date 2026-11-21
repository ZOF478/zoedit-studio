import { useCurrentFrame, useVideoConfig } from "remotion";
import { alpha, type Theme } from "../theme";

type AmbientMotionProps = {
  theme: Theme;
  seed?: number;
  intensity?: number;
};

const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

type Particle = {
  baseX: number;
  baseY: number;
  radius: number;
  speed: number;
  phase: number;
  drift: number;
  warm: boolean;
};

const buildParticles = (seed: number): Particle[] => {
  const random = mulberry32(seed * 7717 + 97);
  return Array.from({ length: 20 }, () => ({
    baseX: random() * 100,
    baseY: random() * 100,
    radius: 1.2 + random() * 3.6,
    speed: 0.05 + random() * 0.16,
    phase: random() * Math.PI * 2,
    drift: 6 + random() * 34,
    warm: random() > 0.45,
  }));
};

export const AmbientMotion = ({
  theme,
  seed = 1,
  intensity = 1,
}: AmbientMotionProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  const particles = buildParticles(seed);
  const orbit = seconds * 18;
  const sweep = (seconds * 24) % 140 - 20;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
        opacity: intensity,
      }}
    >
      {particles.map((particle, index) => {
        const angle = seconds * particle.speed * Math.PI * 2 + particle.phase;
        const x = particle.baseX + Math.sin(angle) * particle.drift * 0.45;
        const y =
          particle.baseY +
          Math.cos(angle * 0.8 + particle.phase) * particle.drift * 0.35;
        const twinkle =
          0.18 +
          0.42 * (0.5 + 0.5 * Math.sin(angle * 1.7 + particle.phase));
        const color = particle.warm
          ? theme.colors.primary
          : theme.colors.accent;
        return (
          <span
            key={`ambient-particle-${index}`}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: particle.radius * 2,
              height: particle.radius * 2,
              marginLeft: -particle.radius,
              marginTop: -particle.radius,
              borderRadius: "50%",
              background: color,
              opacity: twinkle,
              boxShadow: `0 0 ${particle.radius * 4}px ${alpha(
                color,
                twinkle * 0.8,
              )}`,
            }}
          />
        );
      })}

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <ellipse
          cx="50"
          cy="52"
          rx="42"
          ry="30"
          fill="none"
          stroke={alpha(theme.colors.primary, 0.16)}
          strokeWidth="0.16"
          strokeDasharray="0.6 1.6"
          transform={`rotate(${orbit} 50 52)`}
        />
        <ellipse
          cx="50"
          cy="52"
          rx="30"
          ry="42"
          fill="none"
          stroke={alpha(theme.colors.accent, 0.13)}
          strokeWidth="0.14"
          strokeDasharray="0.4 2.2"
          transform={`rotate(${-orbit * 0.7} 50 52)`}
        />
        <line
          x1={sweep}
          y1="0"
          x2={sweep + 14}
          y2="100"
          stroke={alpha(theme.colors.primary, 0.1)}
          strokeWidth="3"
        />
      </svg>

      <div
        style={{
          position: "absolute",
          left: "4%",
          top: "10%",
          width: 26,
          height: 26,
          borderLeft: `2px solid ${alpha(theme.colors.primary, 0.32)}`,
          borderTop: `2px solid ${alpha(theme.colors.primary, 0.32)}`,
          transform: `rotate(${Math.sin(seconds * 0.8) * 8}deg)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "5%",
          bottom: "16%",
          width: 34,
          height: 34,
          borderRight: `2px solid ${alpha(theme.colors.accent, 0.28)}`,
          borderBottom: `2px solid ${alpha(theme.colors.accent, 0.28)}`,
          transform: `rotate(${-Math.sin(seconds * 0.6) * 10}deg)`,
        }}
      />
    </div>
  );
};
