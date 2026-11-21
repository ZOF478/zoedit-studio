import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

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

type Drop = { x: number; y: number; speed: number; size: number; delay: number };

const WARM = "#e8a13a";
const COLD = "#5fd0e6";
const RED = "#d94a4a";
const CHARCOAL = "#14161a";

const Clock: React.FC<{
  frame: number;
  cx: number;
  cy: number;
  r: number;
  textColor: string;
  accentColor: string;
}> = ({ frame, cx, cy, r, textColor, accentColor }) => {
  const secondAngle = (frame * 6) % 360;
  const minuteAngle = 345 + (frame / 30) * 0.5;
  const hourAngle = 345 + (frame / 3600) * 0.5;
  const ticks: React.ReactNode[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    const r1 = r * 0.82;
    const r2 = r * 0.9;
    ticks.push(
      <line
        key={i}
        x1={cx + Math.sin(a) * r1}
        y1={cy - Math.cos(a) * r1}
        x2={cx + Math.sin(a) * r2}
        y2={cy - Math.cos(a) * r2}
        stroke={textColor}
        strokeWidth={1.2}
        opacity={0.55}
      />,
    );
  }
  const hand = (angle: number, len: number, w: number, color: string) => {
    const a = (angle * Math.PI) / 180;
    return (
      <line
        x1={cx}
        y1={cy}
        x2={cx + Math.sin(a) * len}
        y2={cy - Math.cos(a) * len}
        stroke={color}
        strokeWidth={w}
        strokeLinecap="round"
      />
    );
  };
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={CHARCOAL} stroke={textColor} strokeWidth={1.5} opacity={0.95} />
      {ticks}
      {hand(hourAngle, r * 0.5, 3.2, textColor)}
      {hand(minuteAngle, r * 0.72, 2.2, textColor)}
      {hand(secondAngle, r * 0.78, 1.2, accentColor)}
      <circle cx={cx} cy={cy} r={3} fill={accentColor} />
    </g>
  );
};

const DeskFigure: React.FC<{ breathe: number; color: string; shadow: string }> = ({
  breathe,
  color,
  shadow,
}) => (
  <g transform={`translate(0 ${breathe})`}>
    <ellipse cx={0} cy={78} rx={34} ry={6} fill={shadow} opacity={0.5} />
    <path d="M -22 70 Q -22 20 -14 6 Q 0 -6 14 6 Q 22 20 22 70 Z" fill={color} />
    <circle cx={0} cy={-14} r={13} fill={color} />
  </g>
);

const LyingFigure: React.FC<{ breathe: number; color: string; shadow: string }> = ({
  breathe,
  color,
  shadow,
}) => (
  <g transform={`translate(0 ${breathe})`}>
    <ellipse cx={0} cy={34} rx={62} ry={5} fill={shadow} opacity={0.5} />
    <rect x={-58} y={6} width={116} height={26} rx={10} fill={color} />
    <circle cx={-62} cy={16} r={13} fill={color} />
    <path d="M 10 6 Q 34 -6 46 -22" stroke={color} strokeWidth={9} strokeLinecap="round" fill="none" />
  </g>
);

export const CustomScene_scene_6e63c750_0: React.FC<Props> = ({
  accentColor,
  bgColor,
  textColor,
  mutedColor,
  characterShadow,
  isRtl,
  title,
  text,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  const midX = width / 2;
  const dividerProgress = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.6 },
    durationInFrames: Math.round(0.6 * fps),
  });
  const dividerTop = height * 0.06;
  const dividerBottom = height * 0.78;
  const dividerY2 = dividerTop + (dividerBottom - dividerTop) * dividerProgress;

  const breathe = Math.sin((frame / fps) * Math.PI * 1.4) * 2;
  const breatheL = Math.sin((frame / fps) * Math.PI * 1.2) * 2;

  const drops: Drop[] = useMemo(() => {
    const arr: Drop[] = [];
    let seed = 7;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < 14; i++) {
      arr.push({
        x: rnd() * width,
        y: rnd() * height,
        speed: 0.6 + rnd() * 1.6,
        size: 2 + rnd() * 3,
        delay: rnd() * 120,
      });
    }
    return arr;
  }, [width, height]);

  const badgeCount = Math.min(
    5,
    Math.floor(interpolate(frame, [30, 120], [0, 5], { extrapolateRight: "clamp" })),
  );

  const clockR = Math.min(width * 0.11, 64);
  const clockCx = midX;
  const clockCy = height * 0.13;

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute" }}
      >
        <defs>
          <radialGradient id="lampGlow" cx="50%" cy="60%" r="60%">
            <stop offset="0%" stopColor={WARM} stopOpacity={0.55} />
            <stop offset="55%" stopColor={WARM} stopOpacity={0.12} />
            <stop offset="100%" stopColor={WARM} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="phoneGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={COLD} stopOpacity={0.6} />
            <stop offset="100%" stopColor={COLD} stopOpacity={0} />
          </radialGradient>
          <linearGradient id="leftBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a1712" />
            <stop offset="100%" stopColor="#0d0b08" />
          </linearGradient>
          <linearGradient id="rightBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0c10" />
            <stop offset="100%" stopColor="#050608" />
          </linearGradient>
        </defs>

        <rect x={0} y={0} width={midX} height={height} fill="url(#leftBg)" />
        <ellipse
          cx={midX * 0.55}
          cy={height * 0.62}
          rx={midX * 0.7}
          ry={height * 0.32}
          fill="url(#lampGlow)"
        />

        <rect x={midX * 0.12} y={height * 0.63} width={midX * 0.78} height={6} fill="#3a2f22" rx={2} />
        <rect
          x={midX * 0.2}
          y={height * 0.5}
          width={midX * 0.28}
          height={height * 0.13}
          rx={4}
          fill="#2b2b2b"
          stroke="#4a4034"
          strokeWidth={1.5}
        />
        <rect
          x={midX * 0.22}
          y={height * 0.52}
          width={midX * 0.24}
          height={height * 0.09}
          rx={2}
          fill="#3c3830"
          opacity={0.7}
        />
        <line
          x1={midX * 0.56}
          y1={height * 0.625}
          x2={midX * 0.68}
          y2={height * 0.615}
          stroke={WARM}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <rect
          x={midX * 0.58}
          y={height * 0.56}
          width={midX * 0.22}
          height={height * 0.07}
          rx={2}
          fill="#e8dfc8"
          opacity={0.85}
        />
        {[0, 1, 2].map((i) => (
          <line
            key={i}
            x1={midX * 0.6}
            y1={height * (0.575 + i * 0.015)}
            x2={midX * 0.77}
            y2={height * (0.575 + i * 0.015)}
            stroke="#8a7a5a"
            strokeWidth={1}
          />
        ))}

        <g transform={`translate(${midX * 0.42} ${height * 0.63})`}>
          <DeskFigure breathe={breatheL} color="#2a2620" shadow={characterShadow} />
        </g>

        <rect x={midX} y={0} width={midX} height={height} fill="url(#rightBg)" />
        <rect x={midX * 1.15} y={height * 0.66} width={midX * 0.7} height={8} rx={3} fill="#1c2028" />
        <rect
          x={midX * 1.2}
          y={height * 0.6}
          width={midX * 0.6}
          height={height * 0.06}
          rx={6}
          fill="#232833"
          opacity={0.9}
        />
        <circle cx={midX * 1.42} cy={height * 0.5} r={height * 0.09} fill="url(#phoneGlow)" />
        <g transform={`translate(${midX * 1.45} ${height * 0.56})`}>
          <LyingFigure breathe={breathe} color="#20242c" shadow={characterShadow} />
        </g>
        <rect
          x={midX * 1.62}
          y={height * 0.44}
          width={18}
          height={30}
          rx={3}
          fill={COLD}
          opacity={0.9}
        />
        {Array.from({ length: badgeCount }).map((_, i) => (
          <g
            key={i}
            transform={`translate(${midX * 1.66 + i * 12} ${height * 0.41 - i * 10})`}
          >
            <circle r={7} fill={RED} />
            <text x={0} y={3.5} textAnchor="middle" fontSize={9} fill="#fff" fontWeight={700}>
              {i + 1}
            </text>
          </g>
        ))}

        <g opacity={0.18}>
          <rect
            x={width * 0.06}
            y={height * 0.08}
            width={width * 0.2}
            height={height * 0.32}
            stroke={textColor}
            strokeWidth={1}
            fill="none"
          />
          <line
            x1={width * 0.16}
            y1={height * 0.08}
            x2={width * 0.16}
            y2={height * 0.4}
            stroke={textColor}
            strokeWidth={1}
          />
          <rect
            x={width * 0.74}
            y={height * 0.08}
            width={width * 0.2}
            height={height * 0.32}
            stroke={textColor}
            strokeWidth={1}
            fill="none"
          />
          <line
            x1={width * 0.84}
            y1={height * 0.08}
            x2={width * 0.84}
            y2={height * 0.4}
            stroke={textColor}
            strokeWidth={1}
          />
        </g>

        {drops.map((d, i) => {
          const t = (frame + d.delay) * d.speed;
          const y = (d.y + t) % (height * 0.8);
          return (
            <ellipse
              key={i}
              cx={d.x}
              cy={y}
              rx={d.size * 0.6}
              ry={d.size}
              fill={COLD}
              opacity={0.35}
            />
          );
        })}

        <line
          x1={midX}
          y1={dividerTop}
          x2={midX}
          y2={dividerY2}
          stroke="#ffffff"
          strokeWidth={1.5}
          opacity={0.85}
        />
        <line
          x1={midX}
          y1={dividerTop}
          x2={midX}
          y2={dividerY2}
          stroke={accentColor}
          strokeWidth={3}
          opacity={0.25}
        />

        <Clock
          frame={frame}
          cx={clockCx}
          cy={clockCy}
          r={clockR}
          textColor={textColor}
          accentColor={accentColor}
        />

        <text
          x={midX}
          y={height * 0.22}
          textAnchor="middle"
          fontSize={Math.min(width * 0.05, 68)}
          fontWeight={700}
          fill={textColor}
          opacity={titleOpacity}
          direction={isRtl ? "rtl" : "ltr"}
        >
          {title ?? "انقسام الحادية عشرة والنصف"}
        </text>
        <text
          x={midX}
          y={height * 0.26}
          textAnchor="middle"
          fontSize={Math.min(width * 0.04, 34)}
          fill={mutedColor}
          opacity={titleOpacity}
          direction={isRtl ? "rtl" : "ltr"}
        >
          11:30 ليلاً
        </text>

        <text
          x={midX * 0.5}
          y={height * 0.72}
          textAnchor="middle"
          fontSize={Math.min(width * 0.04, 34)}
          fill={WARM}
          opacity={0.9}
          direction={isRtl ? "rtl" : "ltr"}
        >
          مكتب دافئ
        </text>
        <text
          x={midX * 1.5}
          y={height * 0.72}
          textAnchor="middle"
          fontSize={Math.min(width * 0.04, 34)}
          fill={COLD}
          opacity={0.9}
          direction={isRtl ? "rtl" : "ltr"}
        >
          غرفة مظلمة
        </text>
      </svg>

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: height * 0.22,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            color: mutedColor,
            fontSize: 30,
            fontFamily: "system-ui, sans-serif",
            opacity: interpolate(
              frame,
              [durationInFrames - 30, durationInFrames - 5],
              [1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            ),
            direction: isRtl ? "rtl" : "ltr",
          }}
        >
          {text ?? "نقطة الانقسام"}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
