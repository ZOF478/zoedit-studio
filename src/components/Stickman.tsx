import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { CharacterConfig, Pose } from "../types";

type PoseValues = {
  headX: number;
  headY: number;
  headTilt: number;
  bodyLean: number;
  leftUpper: number;
  leftFore: number;
  rightUpper: number;
  rightFore: number;
};

const POSES: Record<Pose, PoseValues> = {
  idle: {
    headX: 0,
    headY: 0,
    headTilt: 0,
    bodyLean: 0,
    leftUpper: 8,
    leftFore: 4,
    rightUpper: -8,
    rightFore: -4,
  },
  walking: {
    headX: -2,
    headY: -1,
    headTilt: -2,
    bodyLean: -2,
    leftUpper: 26,
    leftFore: 10,
    rightUpper: -30,
    rightFore: -12,
  },
  explaining: {
    headX: -4,
    headY: -2,
    headTilt: -4,
    bodyLean: -1,
    leftUpper: 16,
    leftFore: 8,
    rightUpper: -112,
    rightFore: -22,
  },
  thinking: {
    headX: 4,
    headY: 2,
    headTilt: 6,
    bodyLean: 2,
    leftUpper: 2,
    leftFore: 25,
    rightUpper: -100,
    rightFore: 180,
  },
  shocked: {
    headX: -2,
    headY: -8,
    headTilt: -6,
    bodyLean: -5,
    leftUpper: 118,
    leftFore: 24,
    rightUpper: -118,
    rightFore: -24,
  },
  happy: {
    headX: 0,
    headY: -6,
    headTilt: 4,
    bodyLean: 0,
    leftUpper: 148,
    leftFore: 16,
    rightUpper: -148,
    rightFore: -16,
  },
  sad: {
    headX: 2,
    headY: 7,
    headTilt: -10,
    bodyLean: 5,
    leftUpper: -2,
    leftFore: 18,
    rightUpper: 2,
    rightFore: -18,
  },
  pointing: {
    headX: -6,
    headY: -2,
    headTilt: -6,
    bodyLean: -3,
    leftUpper: 20,
    leftFore: 6,
    rightUpper: -154,
    rightFore: -8,
  },
  celebrating: {
    headX: 0,
    headY: -10,
    headTilt: 8,
    bodyLean: -2,
    leftUpper: 166,
    leftFore: 26,
    rightUpper: -166,
    rightFore: -26,
  },
  idea: {
    headX: -2,
    headY: -4,
    headTilt: -2,
    bodyLean: -1,
    leftUpper: 10,
    leftFore: 4,
    rightUpper: -142,
    rightFore: 34,
  },
  facepalm: {
    headX: 5,
    headY: 5,
    headTilt: 12,
    bodyLean: 4,
    leftUpper: 8,
    leftFore: 6,
    rightUpper: -124,
    rightFore: 196,
  },
};

type StickmanProps = {
  pose?: CharacterConfig["pose"];
  color: string;
  faceColor: string;
  accent: string;
  shadow: string;
  accessory?: CharacterConfig["accessory"];
  delay?: number;
};

export const Stickman = ({
  pose = "idle",
  color,
  faceColor,
  accent,
  shadow,
  accessory = "none",
  delay = 0,
}: StickmanProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = Math.max(0, frame - delay);
  const target = POSES[pose] ?? POSES.idle;

  const enter = spring({
    frame: localFrame,
    fps,
    config: { damping: 14, mass: 0.7, stiffness: 110 },
  });
  const ease = Math.min(1, Math.max(0, enter));

  const seconds = localFrame / fps;
  const breathe = Math.sin((seconds * Math.PI * 2) / 3.2) * ease;
  const sway = Math.sin((seconds * Math.PI * 2) / 5.1) * ease;
  const walking = pose === "walking";
  const stride = walking ? Math.sin(seconds * Math.PI * 2 * 1.35) : 0;
  const gesture = pose === "pointing" || pose === "explaining" || pose === "idea";
  const gesturePulse = gesture ? Math.sin(seconds * Math.PI * 2 * 0.9) * 3.5 : 0;
  const travel = walking ? Math.sin(seconds * 0.85) * 10 : 0;

  const headTilt = target.headTilt * ease + sway * 0.9;
  const bodyLean = target.bodyLean * ease + sway * 0.4 + stride * 1.6;
  const headX = target.headX * ease + sway * 1.4;
  const headY = target.headY * ease + breathe * 0.8;
  const bob = breathe * 1.8 + Math.abs(stride) * 2.2;

  const leftUpper = target.leftUpper * ease + sway * 1.6 - stride * 12;
  const leftFore = target.leftFore * ease + sway * 1.2 + stride * 6;
  const rightUpper = target.rightUpper * ease - sway * 1.6 + stride * 12 + gesturePulse;
  const rightFore = target.rightFore * ease - sway * 1.2 + gesturePulse * 0.6;

  const leftShoulder = { x: 122, y: 180 };
  const leftElbow = { x: 104, y: 252 };
  const leftWrist = { x: 110, y: 318 };
  const rightShoulder = { x: 198, y: 180 };
  const rightElbow = { x: 216, y: 252 };
  const rightWrist = { x: 210, y: 318 };
  const leftFootX = 128 + stride * 16;
  const rightFootX = 192 - stride * 16;

  const stroke = { stroke: color, strokeWidth: 17, strokeLinecap: "round" as const };

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        scale: interpolate(ease, [0, 1], [0.92, 1]),
        translate: `${travel}px ${interpolate(ease, [0, 1], [28, 0]) + Math.abs(stride) * -2}px`,
        opacity: Math.min(1, ease * 1.4),
      }}
    >
      <svg
        viewBox="0 0 320 440"
        style={{ height: "100%", width: "100%", overflow: "visible" }}
      >
        <ellipse
          cx="160"
          cy="424"
          rx={80 * ease}
          ry={14 * ease}
          fill={shadow}
        />

        <g transform={`rotate(${bodyLean} 160 292)`}>
          <g transform={`translate(0 ${bob})`}>
            <g
              transform={`rotate(${leftUpper} ${leftShoulder.x} ${leftShoulder.y})`}
            >
              <path
                d={`M${leftShoulder.x} ${leftShoulder.y} L${leftElbow.x} ${leftElbow.y}`}
                fill="none"
                {...stroke}
              />
              <g
                transform={`rotate(${leftFore} ${leftElbow.x} ${leftElbow.y})`}
              >
                <path
                  d={`M${leftElbow.x} ${leftElbow.y} L${leftWrist.x} ${leftWrist.y}`}
                  fill="none"
                  {...stroke}
                />
                <circle cx={leftWrist.x} cy={leftWrist.y} r="9" fill={color} />
              </g>
            </g>
          </g>

          <g transform={`translate(0 ${breathe * 1.8})`}>
            <path
              d={`M140 282 L${leftFootX - 4} 356 L${leftFootX - 2} 404`}
              fill="none"
              {...stroke}
            />
            <path
              d={`M180 282 L${rightFootX + 4} 356 L${rightFootX + 2} 404`}
              fill="none"
              {...stroke}
            />
            <ellipse
              cx={leftFootX - 2}
              cy={412}
              rx="20"
              ry="11"
              fill={color}
            />
            <ellipse
              cx={rightFootX + 2}
              cy={412}
              rx="20"
              ry="11"
              fill={color}
            />

            <path
              d="M160 146 C132 146 118 160 114 184 C109 213 116 249 123 282 L197 282 C204 249 211 213 206 184 C202 160 188 146 160 146 Z"
              fill={color}
            />

            {accessory === "tie" ? (
              <g>
                <path
                  d="M160 156 L151 166 L160 196 L169 166 Z"
                  fill={accent}
                />
                <path
                  d="M160 196 L155 214 L160 246 L165 214 Z"
                  fill={accent}
                  opacity={0.85}
                />
              </g>
            ) : null}

            {accessory === "badge" ? (
              <g>
                <circle cx="194" cy="208" r="11" fill={accent} />
                <circle
                  cx="194"
                  cy="208"
                  r="4.5"
                  fill="none"
                  stroke={faceColor}
                  strokeWidth="2.5"
                />
              </g>
            ) : null}

            <g
              transform={`translate(${headX} ${headY + bob}) rotate(${headTilt} 160 96)`}
              shapeRendering="geometricPrecision"
            >
              <rect
                x="149"
                y="120"
                width="22"
                height="46"
                rx="11"
                fill={color}
              />
              <circle cx="160" cy="96" r="50" fill={color} />
            </g>
          </g>

          <g transform={`translate(0 ${bob})`}>
            <g
              transform={`rotate(${rightUpper} ${rightShoulder.x} ${rightShoulder.y})`}
            >
              <path
                d={`M${rightShoulder.x} ${rightShoulder.y} L${rightElbow.x} ${rightElbow.y}`}
                fill="none"
                {...stroke}
              />
              <g
                transform={`rotate(${rightFore} ${rightElbow.x} ${rightElbow.y})`}
              >
                <path
                  d={`M${rightElbow.x} ${rightElbow.y} L${rightWrist.x} ${rightWrist.y}`}
                  fill="none"
                  {...stroke}
                />
                <circle cx={rightWrist.x} cy={rightWrist.y} r="9" fill={color} />
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
};
