import type { CSSProperties, ReactNode } from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const CLAMP = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const toFrame = (value: number): number =>
  Number.isFinite(value) ? Math.round(value) : 0;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export type DepthStageProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  perspective?: number;
};

export const DepthStage = ({
  children,
  className,
  style,
  perspective = 1200,
}: DepthStageProps) => {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        perspective: `${perspective}px`,
        transformStyle: "preserve-3d",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export type SpatialCardProps = {
  enterFrame: number;
  recedeFrame?: number;
  tiltX?: number;
  tiltY?: number;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  shadowColor?: string;
  recedeDepth?: number;
};

export const SpatialCard = ({
  enterFrame,
  recedeFrame,
  tiltX = 0,
  tiltY = 0,
  children,
  className,
  style,
  shadowColor = "rgba(2, 6, 23, 0.55)",
  recedeDepth = -150,
}: SpatialCardProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = clamp01(
    spring({
      frame: frame - toFrame(enterFrame),
      fps,
      config: { damping: 18, mass: 0.8, stiffness: 120 },
    }),
  );

  const recede =
    recedeFrame === undefined
      ? 0
      : clamp01(
          spring({
            frame: frame - toFrame(recedeFrame),
            fps,
            config: { damping: 200, mass: 0.9, stiffness: 90 },
          }),
        );

  const depth =
    interpolate(enter, [0, 1], [-120, 0], CLAMP) +
    interpolate(recede, [0, 1], [0, recedeDepth], CLAMP);
  const scale =
    interpolate(enter, [0, 1], [0.9, 1], CLAMP) *
    interpolate(recede, [0, 1], [1, 0.84], CLAMP);
  const lift =
    interpolate(enter, [0, 1], [28, 0], CLAMP) +
    interpolate(recede, [0, 1], [0, 18], CLAMP);
  const opacity =
    interpolate(enter, [0, 1], [0, 1], CLAMP) *
    interpolate(recede, [0, 1], [1, 0.45], CLAMP);
  const blur = interpolate(recede, [0, 1], [0, 2], CLAMP);
  const rotateX =
    interpolate(enter, [0, 1], [tiltX * 1.8, tiltX], CLAMP) +
    interpolate(recede, [0, 1], [0, tiltX * 0.35], CLAMP);
  const rotateY =
    interpolate(enter, [0, 1], [tiltY * 1.8, tiltY], CLAMP) +
    interpolate(recede, [0, 1], [0, tiltY * 0.35], CLAMP);
  const shadowY = interpolate(recede, [0, 1], [24, 52], CLAMP);
  const shadowBlur = interpolate(recede, [0, 1], [60, 104], CLAMP);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        transformStyle: "preserve-3d",
        backfaceVisibility: "hidden",
        willChange: "transform, opacity, filter",
        opacity,
        filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none",
        transform: `translate3d(0px, ${lift.toFixed(2)}px, ${depth.toFixed(
          2,
        )}px) scale(${scale.toFixed(3)}) rotateX(${rotateX.toFixed(
          2,
        )}deg) rotateY(${rotateY.toFixed(2)}deg)`,
        boxShadow: `0 ${shadowY.toFixed(0)}px ${shadowBlur.toFixed(
          0,
        )}px ${shadowColor}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
