import { useId, type CSSProperties } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

export type SilhouettePose =
  | "standing"
  | "praying-qiyam"
  | "praying-sujood"
  | "sitting-screen"
  | "walking";

export type SilhouetteActorProps = {
  pose?: SilhouettePose;
  color?: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
};

type Point = {
  x: number;
  y: number;
};

type Limb = {
  points: Point[];
  width: number;
};

type Ellipse = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};

type Screen = {
  x: number;
  y: number;
  w: number;
  h: number;
  glowX: number;
  glowY: number;
  glowR: number;
};

type Figure = {
  head: { cx: number; cy: number; r: number };
  torso: string;
  backLimbs: Limb[];
  frontLimbs: Limb[];
  feet: Ellipse[];
  screen: Screen | null;
};

const VIEWBOX_WIDTH = 200;
const VIEWBOX_HEIGHT = 360;

const STANDING_TORSO =
  "M78 90 C74 128 80 166 86 184 L114 184 C120 166 126 128 122 90 C110 84 90 84 78 90 Z";

const STANDING_HEAD = { cx: 100, cy: 46, r: 22 };

const standingLegs = (spread = 0): Limb[] => [
  {
    points: [
      { x: 89, y: 184 },
      { x: 86 - spread, y: 262 },
      { x: 84 - spread, y: 336 },
    ],
    width: 22,
  },
  {
    points: [
      { x: 111, y: 184 },
      { x: 114 + spread, y: 262 },
      { x: 116 + spread, y: 336 },
    ],
    width: 22,
  },
];

const standingFeet = (leftX: number, rightX: number): Ellipse[] => [
  { cx: leftX, cy: 341, rx: 13, ry: 6 },
  { cx: rightX, cy: 341, rx: 13, ry: 6 },
];

const buildStanding = (phase: number): Figure => {
  const sway = Math.sin(phase) * 1.3;
  const breathe = Math.sin(phase * 1.6) * 1.5;
  return {
    head: {
      cx: STANDING_HEAD.cx + sway * 0.5,
      cy: STANDING_HEAD.cy + breathe * 0.3,
      r: STANDING_HEAD.r,
    },
    torso: STANDING_TORSO,
    backLimbs: [
      { points: [{ x: 100, y: 60 }, { x: 100, y: 96 }], width: 26 },
      ...standingLegs(),
      {
        points: [
          { x: 78, y: 98 },
          { x: 70 + sway, y: 150 },
          { x: 68 + sway, y: 198 },
        ],
        width: 17,
      },
    ],
    frontLimbs: [
      {
        points: [
          { x: 122, y: 98 },
          { x: 130 + sway, y: 150 },
          { x: 132 + sway, y: 198 },
        ],
        width: 17,
      },
    ],
    feet: standingFeet(84, 116),
    screen: null,
  };
};

const buildQiyam = (phase: number): Figure => {
  const breathe = Math.sin(phase * 1.5) * 1.1;
  return {
    head: {
      cx: STANDING_HEAD.cx,
      cy: STANDING_HEAD.cy + 2 + breathe * 0.25,
      r: STANDING_HEAD.r,
    },
    torso: STANDING_TORSO,
    backLimbs: [
      { points: [{ x: 100, y: 60 }, { x: 100, y: 96 }], width: 26 },
      ...standingLegs(),
      {
        points: [
          { x: 78, y: 98 },
          { x: 92, y: 142 },
          { x: 108, y: 130 + breathe },
        ],
        width: 17,
      },
    ],
    frontLimbs: [
      {
        points: [
          { x: 122, y: 98 },
          { x: 108, y: 142 },
          { x: 92, y: 132 + breathe },
        ],
        width: 17,
      },
    ],
    feet: standingFeet(84, 116),
    screen: null,
  };
};

const buildSujood = (phase: number): Figure => {
  const breathe = Math.sin(phase * 1.4) * 2;
  return {
    head: { cx: 168, cy: 334, r: 19 },
    torso: "",
    backLimbs: [
      {
        points: [
          { x: 76, y: 284 },
          { x: 140, y: 318 + breathe * 0.3 },
        ],
        width: 54,
      },
      { points: [{ x: 142, y: 322 }, { x: 160, y: 330 }], width: 20 },
      { points: [{ x: 92, y: 326 }, { x: 56, y: 338 }], width: 22 },
      { points: [{ x: 76, y: 282 }, { x: 94, y: 326 }], width: 26 },
      {
        points: [
          { x: 140, y: 318 },
          { x: 154, y: 338 },
          { x: 162, y: 344 },
        ],
        width: 15,
      },
    ],
    frontLimbs: [
      { points: [{ x: 92, y: 326 }, { x: 58, y: 340 }], width: 18 },
    ],
    feet: [{ cx: 52, cy: 340, rx: 13, ry: 6 }],
    screen: null,
  };
};

const buildSittingScreen = (phase: number): Figure => {
  const breathe = Math.sin(phase * 1.5) * 1.4;
  const hunch = breathe * 0.4;
  return {
    head: { cx: 130, cy: 166 + hunch, r: 21 },
    torso: "",
    backLimbs: [
      {
        points: [
          { x: 104, y: 252 },
          { x: 116, y: 190 + hunch },
        ],
        width: 50,
      },
      { points: [{ x: 120, y: 188 }, { x: 128, y: 178 + hunch }], width: 20 },
      {
        points: [
          { x: 122, y: 198 + hunch },
          { x: 142, y: 224 },
          { x: 158, y: 238 },
        ],
        width: 15,
      },
      {
        points: [
          { x: 106, y: 252 },
          { x: 152, y: 250 },
          { x: 154, y: 330 },
        ],
        width: 24,
      },
    ],
    frontLimbs: [
      {
        points: [
          { x: 110, y: 254 },
          { x: 148, y: 256 },
          { x: 150, y: 332 },
        ],
        width: 20,
      },
    ],
    feet: [
      { cx: 154, cy: 336, rx: 13, ry: 6 },
      { cx: 150, cy: 338, rx: 11, ry: 5 },
    ],
    screen: {
      x: 166,
      y: 148,
      w: 30,
      h: 66,
      glowX: 176,
      glowY: 181,
      glowR: 66,
    },
  };
};

const buildWalking = (phase: number): Figure => {
  const stride = Math.sin(phase);
  const bob = Math.abs(Math.sin(phase)) * 2;
  const leftLegX = stride * 16;
  const rightLegX = -stride * 16;
  const leftFootX = 84 + stride * 28;
  const rightFootX = 116 - stride * 28;
  return {
    head: {
      cx: STANDING_HEAD.cx,
      cy: STANDING_HEAD.cy - bob * 0.5,
      r: STANDING_HEAD.r,
    },
    torso: STANDING_TORSO,
    backLimbs: [
      { points: [{ x: 100, y: 60 }, { x: 100, y: 96 }], width: 26 },
      {
        points: [
          { x: 89, y: 184 },
          { x: 86 + leftLegX, y: 260 },
          { x: 84 + leftLegX * 1.8, y: 336 },
        ],
        width: 22,
      },
      {
        points: [
          { x: 78, y: 98 },
          { x: 70 - stride * 9, y: 150 },
          { x: 66 - stride * 20, y: 196 },
        ],
        width: 17,
      },
    ],
    frontLimbs: [
      {
        points: [
          { x: 111, y: 184 },
          { x: 114 + rightLegX, y: 260 },
          { x: 116 + rightLegX * 1.8, y: 336 },
        ],
        width: 22,
      },
      {
        points: [
          { x: 122, y: 98 },
          { x: 130 + stride * 9, y: 150 },
          { x: 134 + stride * 20, y: 196 },
        ],
        width: 17,
      },
    ],
    feet: standingFeet(leftFootX, rightFootX),
    screen: null,
  };
};

const buildFigure = (pose: SilhouettePose, phase: number): Figure => {
  switch (pose) {
    case "praying-qiyam":
      return buildQiyam(phase);
    case "praying-sujood":
      return buildSujood(phase);
    case "sitting-screen":
      return buildSittingScreen(phase);
    case "walking":
      return buildWalking(phase);
    case "standing":
    default:
      return buildStanding(phase);
  }
};

const toPoints = (points: Point[]): string =>
  points.map((point) => `${point.x} ${point.y}`).join(" ");

export const SilhouetteActor = ({
  pose = "standing",
  color = "#0F172A",
  size = 320,
  className,
  style,
}: SilhouetteActorProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rawId = useId();
  const gradientId = `silhouette-glow-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const seconds = frame / Math.max(1, fps);
  const phase =
    pose === "walking"
      ? seconds * Math.PI * 2 * 1.4
      : (seconds * Math.PI * 2) / 3.4;
  const figure = buildFigure(pose, phase);
  const width = (size * VIEWBOX_WIDTH) / VIEWBOX_HEIGHT;

  return (
    <div
      className={className}
      style={{
        width,
        height: size,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        flexShrink: 0,
        ...style,
      }}
    >
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        width={width}
        height={size}
        aria-hidden
        style={{ overflow: "visible", display: "block" }}
      >
        <defs>
          <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.55" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>
        {figure.screen ? (
          <circle
            cx={figure.screen.glowX}
            cy={figure.screen.glowY}
            r={figure.screen.glowR}
            fill={`url(#${gradientId})`}
          />
        ) : null}
        {figure.backLimbs.map((limb, index) => (
          <polyline
            key={`back-${index}`}
            points={toPoints(limb.points)}
            fill="none"
            stroke={color}
            strokeWidth={limb.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {figure.torso ? <path d={figure.torso} fill={color} /> : null}
        {figure.frontLimbs.map((limb, index) => (
          <polyline
            key={`front-${index}`}
            points={toPoints(limb.points)}
            fill="none"
            stroke={color}
            strokeWidth={limb.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        <circle
          cx={figure.head.cx}
          cy={figure.head.cy}
          r={figure.head.r}
          fill={color}
        />
        {figure.feet.map((foot, index) => (
          <ellipse
            key={`foot-${index}`}
            cx={foot.cx}
            cy={foot.cy}
            rx={foot.rx}
            ry={foot.ry}
            fill={color}
          />
        ))}
        {figure.screen ? (
          <rect
            x={figure.screen.x}
            y={figure.screen.y}
            width={figure.screen.w}
            height={figure.screen.h}
            rx={6}
            fill={color}
            opacity={0.5}
          />
        ) : null}
      </svg>
    </div>
  );
};
