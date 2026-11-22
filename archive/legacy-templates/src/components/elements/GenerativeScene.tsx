import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Layout } from "../../layout";
import { alpha, type Theme } from "../../theme";
import type { GenerativeMotif, SceneElement } from "../../types";

type Props = {
  el: Extract<SceneElement, { type: "generative_scene" }>;
  theme: Theme;
  layout: Layout;
  delay: number;
  durationInFrames?: number;
  sceneIndex?: number;
};

type NodePoint = { x: number; y: number };

const MOTIFS: Record<GenerativeMotif, NodePoint[]> = {
  orbit: [
    { x: 360, y: 70 },
    { x: 610, y: 220 },
    { x: 360, y: 372 },
    { x: 108, y: 220 },
    { x: 524, y: 96 },
  ],
  network: [
    { x: 128, y: 108 },
    { x: 356, y: 58 },
    { x: 592, y: 122 },
    { x: 218, y: 306 },
    { x: 492, y: 326 },
  ],
  flow: [
    { x: 96, y: 216 },
    { x: 246, y: 130 },
    { x: 402, y: 268 },
    { x: 560, y: 150 },
    { x: 650, y: 282 },
  ],
  funnel: [
    { x: 126, y: 92 },
    { x: 592, y: 100 },
    { x: 246, y: 210 },
    { x: 470, y: 218 },
    { x: 360, y: 340 },
  ],
  cycle: [
    { x: 360, y: 54 },
    { x: 612, y: 206 },
    { x: 500, y: 366 },
    { x: 218, y: 366 },
    { x: 108, y: 206 },
  ],
  constellation: [
    { x: 104, y: 298 },
    { x: 248, y: 82 },
    { x: 420, y: 246 },
    { x: 566, y: 96 },
    { x: 630, y: 330 },
  ],
};

const MOTIF_ORDER: GenerativeMotif[] = [
  "orbit",
  "network",
  "flow",
  "funnel",
  "cycle",
  "constellation",
];

const isDarkColor = (color: string): boolean => {
  if (!color.startsWith("#") || (color.length !== 7 && color.length !== 4)) return false;
  const hex =
    color.length === 4
      ? color
          .slice(1)
          .split("")
          .map((char) => char + char)
          .join("")
      : color.slice(1);
  const value = parseInt(hex, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
};

const hashText = (text: string): number => {
  return Array.from(text).reduce(
    (total, char, index) => (total + char.charCodeAt(0) * (index + 3)) % 100000,
    0,
  );
};

export const GenerativeScene = ({
  el,
  theme,
  layout,
  delay,
  durationInFrames,
  sceneIndex = 0,
}: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = Math.max(0, frame - delay);
  const seed = hashText(`${el.headline}${el.title ?? ""}`);
  const motif: GenerativeMotif =
    el.motif ?? MOTIF_ORDER[seed % MOTIF_ORDER.length];
  const points = MOTIFS[motif];
  const keywords = el.keywords.length > 0 ? el.keywords.slice(0, 5) : [el.headline];
  const headlineWords = el.headline.split(/\s+/).filter(Boolean).slice(0, 7);
  const darkCanvas = isDarkColor(theme.colors.background);
  const readableText = darkCanvas ? "#F8FAFC" : theme.colors.text;

  const enter = spring({
    frame: local,
    fps,
    config: { damping: 200, mass: 0.8, stiffness: 100 },
  });
  const eased = Math.min(1, Math.max(0, enter));
  const pulse = 0.5 + 0.5 * Math.sin((local / fps) * Math.PI * 2 * 0.8);
  const totalFrames = durationInFrames && durationInFrames > 0 ? durationInFrames : 120;
  const revealStart = Math.round(fps * 0.26);
  const revealEnd = Math.max(
    revealStart + Math.round(fps * 1.5),
    totalFrames - Math.round(fps * 0.35),
  );
  const segment = Math.max(1, (revealEnd - revealStart) / points.length);
  const nodeBeat = (index: number) => revealStart + index * segment;
  const connectorProgress = (index: number) =>
    interpolate(
      local,
      [nodeBeat(index), nodeBeat(index) + segment * 0.92],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
  const activeNode =
    local < revealStart
      ? -1
      : Math.min(
          points.length - 1,
          Math.floor((local - revealStart) / segment),
        );
  const flow = (local / fps) * 42 + sceneIndex * 17;

  const connectorPath = (from: NodePoint, to: NodePoint): string => {
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    return `M${from.x} ${from.y} Q${midX} ${midY - 34} ${to.x} ${to.y}`;
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: Math.round(layout.gap * 0.5),
        opacity: eased,
        translate: `0px ${(1 - eased) * layout.unit * 34}px`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: Math.round(layout.unit * 12),
          flexWrap: "wrap",
        }}
      >
        {el.badge ? (
          <span
            style={{
              fontFamily: theme.fontFamily,
              fontSize: Math.max(30, Math.round(layout.kickerSize * 0.82)),
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: theme.colors.primary,
              background: alpha(theme.colors.primary, 0.12),
              border: `1px solid ${alpha(theme.colors.primary, 0.32)}`,
              borderRadius: 999,
              padding: `${Math.round(layout.unit * 5)}px ${Math.round(
                layout.unit * 14,
              )}px`,
            }}
          >
            {el.badge}
          </span>
        ) : null}
        {el.title ? (
          <span
            style={{
              fontFamily: theme.fontFamily,
              fontSize: Math.max(30, Math.round(layout.smallSize * 0.94)),
              fontWeight: 700,
              color: theme.colors.muted,
            }}
          >
            {el.title}
          </span>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: Math.round(layout.unit * 6),
          fontFamily: theme.displayFamily,
          fontSize: Math.round(layout.subtitleSize * 1.08),
          fontWeight: 900,
          lineHeight: 1.24,
          color: readableText,
          letterSpacing: "-0.01em",
        }}
      >
        {headlineWords.map((word, index) => {
          const wordEnter = spring({
            frame: local - Math.round(fps * 0.12) - index * Math.round(fps * 0.06),
            fps,
            config: { damping: 18, mass: 0.6, stiffness: 140 },
          });
          const wordEase = Math.min(1, Math.max(0, wordEnter));
          return (
            <span
              key={`${word}-${index}`}
              style={{
                display: "inline-block",
                opacity: wordEase,
                transform: `translateY(${(1 - wordEase) * 18}px) scale(${
                  0.9 + wordEase * 0.1
                })`,
                color:
                  index === headlineWords.length - 1
                    ? theme.colors.primary
                    : readableText,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9.4",
          marginTop: Math.round(layout.unit * 4),
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "6% 8%",
            borderRadius: "50%",
            background: `radial-gradient(ellipse at 50% 50%, ${alpha(
              theme.colors.primary,
              0.16 + pulse * 0.08,
            )} 0%, transparent 66%)`,
            filter: `blur(${Math.round(layout.unit * 26)}px)`,
          }}
        />
        <svg
          viewBox="0 0 720 420"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
        >
          <defs>
            <linearGradient id={`gen-line-${seed}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={theme.colors.primary} stopOpacity="0.85" />
              <stop offset="100%" stopColor={theme.colors.accent} stopOpacity="0.35" />
            </linearGradient>
          </defs>

          {points.map((point, index) => {
            const next = points[(index + 1) % points.length];
            const path = connectorPath(point, next);
            const progress = connectorProgress(index);
            const isActive = index === activeNode;
            return (
              <g key={`line-${index}`}>
                <path
                  d={path}
                  fill="none"
                  stroke={`url(#gen-line-${seed})`}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1 - progress}
                  opacity={0.12 + progress * 0.35}
                />
                {progress > 0.02 ? (
                  <path
                    d={path}
                    fill="none"
                    stroke={
                      isActive ? theme.colors.primary : theme.colors.accent
                    }
                    strokeWidth={isActive ? 3.2 : 1.8}
                    strokeLinecap="round"
                    strokeDasharray="7 11"
                    strokeDashoffset={-(flow + index * 14)}
                    opacity={isActive ? 0.9 : 0.45}
                  />
                ) : null}
              </g>
            );
          })}

          {motif === "orbit" || motif === "cycle" ? (
            <ellipse
              cx="360"
              cy="216"
              rx={250 - pulse * 8}
              ry={146 - pulse * 5}
              fill="none"
              stroke={alpha(theme.colors.primary, 0.28)}
              strokeWidth={1.6}
              strokeDasharray="4 12"
              transform={`rotate(${local * 0.35} 360 216)`}
            />
          ) : null}

          {points.map((point, index) => {
            const nodeEnter = spring({
              frame: local - nodeBeat(index),
              fps,
              config: { damping: 16, mass: 0.7, stiffness: 130 },
            });
            const nodeEase = Math.min(1, Math.max(0, nodeEnter));
            const isActive = index === activeNode;
            const color =
              index % 2 === 0 ? theme.colors.primary : theme.colors.accent;
            const ringPulse =
              0.5 +
              0.5 *
                Math.sin((local / fps) * Math.PI * 2 * 1.5 + index * 1.3);
            const orbitAngle = (local / fps) * 1.8 + index;
            return (
              <g key={`node-${index}`} opacity={nodeEase}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={34 + nodeEase * 8}
                  fill={alpha(color, 0.1)}
                />
                {isActive ? (
                  <>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={22 + ringPulse * 9}
                      fill="none"
                      stroke={color}
                      strokeWidth={2.4}
                      opacity={0.7 - ringPulse * 0.3}
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={40 + ringPulse * 16}
                      fill="none"
                      stroke={color}
                      strokeWidth={1.4}
                      opacity={0.42 - ringPulse * 0.28}
                    />
                  </>
                ) : null}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={8 + (isActive ? ringPulse * 2.2 : 0)}
                  fill={color}
                />
                <circle
                  cx={point.x + Math.cos(orbitAngle) * 27}
                  cy={point.y + Math.sin(orbitAngle) * 27}
                  r={2.6}
                  fill={color}
                  opacity={0.8}
                />
              </g>
            );
          })}
        </svg>

        {points.map((point, index) => {
          if (index >= keywords.length) return null;
          const nodeEnter = spring({
            frame: local - nodeBeat(index),
            fps,
            config: { damping: 16, mass: 0.7, stiffness: 130 },
          });
          const nodeEase = Math.min(1, Math.max(0, nodeEnter));
          const label = keywords[index];
          return (
            <div
              key={`label-${index}`}
              style={{
                position: "absolute",
                left: `${(point.x / 720) * 100}%`,
                top: `${(point.y / 420) * 100}%`,
                transform: `translate(-50%, -50%) translateY(${(1 - nodeEase) * 14}px)`,
                opacity: nodeEase,
                maxWidth: "42%",
                padding: `${Math.round(layout.unit * 6)}px ${Math.round(
                  layout.unit * 12,
                )}px`,
                borderRadius: 999,
                background: darkCanvas ? alpha("#0B1220", 0.82) : alpha("#FFFFFF", 0.9),
                border: `1px solid ${alpha(
                  index % 2 === 0 ? theme.colors.primary : theme.colors.accent,
                  0.48,
                )}`,
                boxShadow: `0 ${Math.round(layout.unit * 8)}px ${Math.round(
                  layout.unit * 22,
                )}px ${alpha(darkCanvas ? "#000000" : theme.colors.text, 0.12)}`,
                fontFamily: theme.fontFamily,
                fontSize: Math.max(30, Math.round(layout.smallSize * 0.84)),
                fontWeight: 700,
                color: readableText,
                textAlign: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
};
