import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Circle, Star } from "@remotion/shapes";
import { evolvePath } from "@remotion/paths";
import { noise2D } from "@remotion/noise";
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

export const CustomScene_scene_4e14b274_5 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const entrance = spring({ frame, fps, config: { damping: 18, mass: 0.6, stiffness: 120 } });
  const progress = interpolate(frame, [0, Math.max(1, props.durationInFrames - 1)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pulse = 0.5 + 0.5 * Math.sin(time * Math.PI * 2 * 1.2);
  const drift = noise2D("zof-custom", time * 0.3, 0);
  const trail = "M 80 260 C 220 120, 420 360, 760 180";
  const trailDash = evolvePath(progress, trail);
  const keywords = props.keywords && props.keywords.length > 0 ? props.keywords.slice(0, 4) : [props.title || "Idea", "Mechanism", "Action"];
  const rtl = props.isRtl ? "rtl" : "ltr";
  const align = props.isRtl ? "right" : "left";
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 20%, " + props.accentColor + "22 0%, transparent 55%), " + props.bgColor, direction: rtl, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.9 }}>
        <svg viewBox="0 0 900 500" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <path d={trail} fill="none" stroke={props.accentColor} strokeWidth={3} strokeLinecap="round" strokeDasharray={trailDash.strokeDasharray} strokeDashoffset={trailDash.strokeDashoffset} />
        </svg>
        {keywords.map((word, index) => {
          const x = 12 + index * (76 / Math.max(1, keywords.length - 1));
          const y = 34 + Math.sin(index * 1.7 + time * 1.4) * 10 + drift * 3;
          const nodeScale = interpolate(progress, [index / Math.max(1, keywords.length), Math.min(1, (index + 1) / Math.max(1, keywords.length))], [0.3, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={"node-" + index} style={{ position: "absolute", left: x + "%", top: y + "%", transform: "translate(-50%, -50%) scale(" + nodeScale + ")", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Circle radius={18 + pulse * 4} fill={index % 2 === 0 ? props.accentColor : props.characterAccent} style={{ opacity: 0.85 }} />
              <div style={{ position: "absolute" }}>
                <Star points={5} innerRadius={5} outerRadius={9} fill={props.textColor} style={{ opacity: 0.9 }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: "8%", right: "8%", top: "10%", bottom: "24%", display: "flex", flexDirection: "column", justifyContent: "space-between", opacity: entrance }}>
        <div>
          <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.1, color: props.textColor, textAlign: align }}>{props.title || "Custom scene"}</div>
          <div style={{ marginTop: 12, fontSize: 34, fontWeight: 600, color: props.mutedColor, textAlign: align, maxWidth: "70%" }}>{props.text || ""}</div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: props.isRtl ? "flex-end" : "flex-start" }}>
          {keywords.map((word, index) => (
            <div key={"chip-" + index} style={{ padding: "10px 18px", borderRadius: 999, border: "1px solid " + props.accentColor, background: props.bgColor + "cc", color: props.textColor, fontSize: 30, fontWeight: 700, transform: "translateY(" + Math.sin(time * 1.6 + index) * 4 + "px)" }}>{word}</div>
          ))}
        </div>
        {props.showCharacter ? (
          <div style={{ position: "absolute", right: props.isRtl ? undefined : "0%", left: props.isRtl ? "0%" : undefined, bottom: "16%", width: 210, height: 300 }}>
            <Stickman pose="explaining" color={props.characterBody} faceColor={props.characterFace} accent={props.characterAccent} shadow={props.characterShadow} />
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
