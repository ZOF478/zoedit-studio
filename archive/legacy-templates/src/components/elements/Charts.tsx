import { useId } from "react";
import { evolvePath } from "@remotion/paths";
import { scaleLinear } from "d3-scale";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Layout } from "../../layout";
import { alpha, type Theme } from "../../theme";
import type { SceneElement } from "../../types";
import { Icon } from "../Icon";

type SyncProps = {
  sfxAt?: number;
  sfxFrames?: number;
  durationInFrames?: number;
};

type BarProps = {
  el: Extract<SceneElement, { type: "bar_chart" }>;
  theme: Theme;
  layout: Layout;
  delay: number;
} & SyncProps;

const syncWindow = (
  frameOffset: number,
  fps: number,
  totalFrames: number,
  sfxAt?: number,
  sfxFrames?: number,
): [number, number] => {
  if (typeof sfxAt === "number" && Number.isFinite(sfxAt)) {
    const start = Math.round(Math.max(0, sfxAt) * fps);
    const duration = Math.max(
      Math.round(fps * 0.7),
      Math.min(totalFrames, sfxFrames ?? Math.round(fps * 1.15)),
    );
    return [start, start + duration];
  }
  return [frameOffset, frameOffset + Math.round(fps * 1.1)];
};

const buildSmoothPath = (points: Array<[number, number]>): string => {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0][0]} ${points[0][1]}`;
  }
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[Math.min(points.length - 1, index + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
};

export const BarChart = ({ el, theme, layout, delay, sfxAt, sfxFrames, durationInFrames }: BarProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = el.items.slice(0, 7);
  const max = el.max && el.max > 0
    ? el.max
    : Math.max(...items.map((item) => item.value), 1);
  const palette = [
    theme.colors.primary,
    theme.colors.secondary,
    theme.colors.accent,
    theme.colors.success,
  ];
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, mass: 0.7, stiffness: 110 },
  });
  const eased = Math.min(1, Math.max(0, enter));
  const chartHeight = Math.round(layout.unit * 260);
  const valueScale = scaleLinear().domain([0, Math.max(1, max)]).range([0, chartHeight]);
  const totalFrames = Math.max(1, durationInFrames ?? Math.round(layout.height * 2));
  const [syncStart, syncEnd] = syncWindow(
    delay + Math.round(fps * 0.15),
    fps,
    totalFrames,
    sfxAt,
    sfxFrames,
  );
  const reveal = interpolate(frame, [syncStart, syncEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        width: "100%",
        background: theme.card.background,
        border: theme.card.border,
        borderRadius: theme.card.radius,
        boxShadow: theme.card.shadow,
        backdropFilter: theme.card.backdropFilter,
        padding: layout.cardPadding,
        opacity: eased,
        translate: `0px ${(1 - eased) * layout.unit * 36}px`,
      }}
    >
      {el.title ? (
        <div
          style={{
            fontFamily: theme.displayFamily,
            fontSize: Math.max(30, Math.round(layout.bodySize * 0.95)),
            fontWeight: 800,
            color: theme.colors.muted,
            marginBottom: Math.round(layout.unit * 16),
          }}
        >
          {el.title}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-around",
          gap: Math.round(layout.unit * 16),
          height: chartHeight,
        }}
      >
        {items.map((item, index) => {
          const color = palette[index % palette.length];
          const height = Math.max(
            12,
            valueScale(Math.min(max, Math.max(0, item.value))) * reveal,
          );
          return (
            <div
              key={`${item.label}-${index}`}
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: Math.round(layout.unit * 8),
                height: "100%",
              }}
            >
              <div
                style={{
                  fontFamily: theme.displayFamily,
                  fontSize: Math.max(30, Math.round(layout.smallSize * 0.95)),
                  fontWeight: 900,
                  color,
                  direction: "ltr",
                }}
              >
                {item.value}
                {el.suffix ?? ""}
              </div>
              <div
                style={{
                  width: "100%",
                  maxWidth: Math.round(layout.unit * 120),
                  height,
                  borderRadius: Math.round(layout.unit * 14),
                  background: `linear-gradient(180deg, ${color}, ${alpha(color, 0.55)})`,
                  boxShadow: `0 0 ${Math.round(layout.unit * 22)}px ${alpha(color, 0.35)}`,
                }}
              />
              <div
                style={{
                  fontFamily: theme.fontFamily,
                  fontSize: Math.max(30, Math.round(layout.smallSize * 0.78)),
                  fontWeight: 700,
                  color: theme.colors.muted,
                  textAlign: "center",
                  lineHeight: 1.3,
                }}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

type LineProps = {
  el: Extract<SceneElement, { type: "line_chart" }>;
  theme: Theme;
  layout: Layout;
  delay: number;
} & SyncProps;

export const LineChart = ({ el, theme, layout, delay, sfxAt, sfxFrames, durationInFrames }: LineProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const gradientId = `line-${useId().replace(/[:]/g, "")}`;
  const points = el.points.length > 1 ? el.points : [0, 25, 45, 70, 100];
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const width = 100;
  const height = 52;
  const xScale = scaleLinear()
    .domain([0, Math.max(1, points.length - 1)])
    .range([0, width]);
  const yScale = scaleLinear().domain([min, max]).range([height, 0]);
  const coords = points.map(
    (point, index) => [xScale(index), yScale(point)] as [number, number],
  );
  const linePath = buildSmoothPath(coords);
  const area = `${buildSmoothPath([
    [0, height],
    ...coords,
    [width, height],
  ])} Z`;

  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, mass: 0.7, stiffness: 110 },
  });
  const eased = Math.min(1, Math.max(0, enter));
  const totalFrames = Math.max(1, durationInFrames ?? Math.round(layout.height * 2));
  const [syncStart, syncEnd] = syncWindow(
    delay + Math.round(fps * 0.15),
    fps,
    totalFrames,
    sfxAt,
    sfxFrames,
  );
  const draw = interpolate(
    frame,
    [syncStart, syncEnd],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );
  const evolved = evolvePath(draw, linePath);
  const headPosition = points.length - 1;
  const rawHead = draw * headPosition;
  const headIndex = Math.min(points.length - 1, Math.floor(rawHead));
  const headNext = Math.min(points.length - 1, headIndex + 1);
  const headMix = rawHead - headIndex;
  const headX = coords[headIndex][0] + (coords[headNext][0] - coords[headIndex][0]) * headMix;
  const headY = coords[headIndex][1] + (coords[headNext][1] - coords[headIndex][1]) * headMix;

  return (
    <div
      style={{
        width: "100%",
        background: theme.card.background,
        border: theme.card.border,
        borderRadius: theme.card.radius,
        boxShadow: theme.card.shadow,
        backdropFilter: theme.card.backdropFilter,
        padding: layout.cardPadding,
        opacity: eased,
        translate: `0px ${(1 - eased) * layout.unit * 36}px`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: Math.round(layout.gap * 0.5),
          marginBottom: Math.round(layout.unit * 10),
        }}
      >
        <div
          style={{
            fontFamily: theme.displayFamily,
            fontSize: Math.max(30, Math.round(layout.bodySize * 0.95)),
            fontWeight: 800,
            color: theme.colors.muted,
          }}
        >
          {el.title ?? el.label}
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: Math.round(layout.unit * 6),
            fontFamily: theme.fontFamily,
            fontSize: Math.max(30, Math.round(layout.smallSize * 0.8)),
            fontWeight: 800,
            color: theme.colors.success,
          }}
        >
          <Icon
            name="trend"
            size={Math.round(layout.unit * 24)}
            color={theme.colors.success}
          />
          {points[points.length - 1]}
          {el.suffix ?? ""}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: Math.round(layout.unit * 220), overflow: "visible" }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.colors.primary} stopOpacity={0.42} />
            <stop offset="100%" stopColor={theme.colors.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} opacity={draw} />
        <path
          d={linePath}
          fill="none"
          stroke={theme.colors.primary}
          strokeWidth={2.4}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={evolved.strokeDasharray}
          strokeDashoffset={evolved.strokeDashoffset}
          vectorEffect="non-scaling-stroke"
        />
        {points.map((point, index) => {
          const [x, y] = coords[index];
          return (
            <circle
              key={`${point}-${index}`}
              cx={x}
              cy={y}
              r={draw > index / Math.max(1, points.length - 1) ? 1.6 : 0}
              fill={theme.colors.secondary}
              stroke={theme.colors.background}
              strokeWidth={0.5}
            />
          );
        })}
        <circle
          cx={headX}
          cy={headY}
          r={draw > 0.01 ? 2.2 : 0}
          fill={theme.colors.secondary}
          stroke={theme.colors.background}
          strokeWidth={0.8}
          style={{
            filter: `drop-shadow(0 0 4px ${alpha(theme.colors.secondary, 0.85)})`,
          }}
        />
      </svg>

      {el.xLabels?.length ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: Math.round(layout.unit * 8),
            fontFamily: theme.fontFamily,
            fontSize: Math.max(30, Math.round(layout.smallSize * 0.72)),
            fontWeight: 700,
            color: theme.colors.muted,
          }}
        >
          {el.xLabels.slice(0, points.length).map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
};

type GaugeProps = {
  el: Extract<SceneElement, { type: "circular_gauge" }>;
  theme: Theme;
  layout: Layout;
  delay: number;
};

export const CircularGauge = ({ el, theme, layout, delay }: GaugeProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const max = el.max && el.max > 0 ? el.max : 100;
  const ratio = Math.min(1, Math.max(0, el.value / max));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, mass: 0.7, stiffness: 110 },
  });
  const eased = Math.min(1, Math.max(0, enter));
  const fill = interpolate(
    frame,
    [delay + Math.round(fps * 0.2), delay + Math.round(fps * 1.15)],
    [0, ratio],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );

  return (
    <div
      style={{
        width: "100%",
        background: theme.card.background,
        border: theme.card.border,
        borderRadius: theme.card.radius,
        boxShadow: theme.card.shadow,
        backdropFilter: theme.card.backdropFilter,
        padding: layout.cardPadding,
        display: "flex",
        alignItems: "center",
        gap: Math.round(layout.gap * 0.9),
        opacity: eased,
        scale: `${0.95 + eased * 0.05}`,
      }}
    >
      <div
        style={{
          position: "relative",
          width: Math.round(layout.unit * 210),
          height: Math.round(layout.unit * 210),
          flexShrink: 0,
        }}
      >
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
          <circle
            cx={50}
            cy={50}
            r={radius}
            fill="none"
            stroke={alpha(theme.colors.text, theme.isDark ? 0.14 : 0.09)}
            strokeWidth={8}
          />
          <circle
            cx={50}
            cy={50}
            r={radius}
            fill="none"
            stroke={theme.colors.primary}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${fill * circumference} ${circumference}`}
            transform="rotate(-90 50 50)"
            style={{
              filter: `drop-shadow(0 0 ${Math.round(
                layout.unit * 8,
              )}px ${alpha(theme.colors.primary, 0.5)})`,
            }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: theme.displayFamily,
            fontWeight: 900,
            color: theme.colors.primary,
            fontSize: Math.round(layout.bigNumberSize * 0.62),
            lineHeight: 1,
            direction: "ltr",
          }}
        >
          {Math.round(fill * max)}
          <span style={{ fontSize: "0.5em", color: theme.colors.muted }}>
            {el.suffix ?? "%"}
          </span>
        </div>
      </div>

      <div style={{ minWidth: 0 }}>
        {el.icon ? (
          <div
            style={{
              width: Math.round(layout.unit * 54),
              height: Math.round(layout.unit * 54),
              borderRadius: "50%",
              background: alpha(theme.colors.primary, 0.14),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: Math.round(layout.unit * 12),
            }}
          >
            <Icon
              name={el.icon}
              size={Math.round(layout.unit * 30)}
              color={theme.colors.primary}
            />
          </div>
        ) : null}
        <div
          style={{
            fontFamily: theme.displayFamily,
            fontSize: Math.max(30, Math.round(layout.bodySize * 1.3)),
            fontWeight: 900,
            color: theme.colors.text,
            lineHeight: 1.3,
          }}
        >
          {el.title}
        </div>
        {el.label ? (
          <div
            style={{
              fontFamily: theme.fontFamily,
              fontSize: Math.max(30, Math.round(layout.smallSize)),
              fontWeight: 600,
              color: theme.colors.muted,
              lineHeight: 1.5,
              marginTop: Math.round(layout.unit * 6),
            }}
          >
            {el.label}
          </div>
        ) : null}
      </div>
    </div>
  );
};
