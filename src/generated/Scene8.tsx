import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Stickman } from "../components/Stickman";
import { SceneSfx } from "../components/SceneSfx";
import type { GeneratedSceneProps } from "./index";

type Props = GeneratedSceneProps;

const FONT = "'Cairo', 'Noto Sans', 'Noto Sans Arabic', system-ui, sans-serif";
const ISO = "matrix(0.866 0.5 -0.866 0.5 0 0)";
const CIRC =
  "M 780 690 C 860 680 900 660 900 620 C 900 580 820 570 820 530 C 820 490 900 490 900 450 C 900 430 880 425 860 420";

const FLOORS = [
  { num: "03", name: "Toit-terrasse", cy: 420, kind: "roof" },
  { num: "02", name: "Premier étage", cy: 520, kind: "first" },
  { num: "01", name: "Rez-de-chaussée", cy: 620, kind: "ground" },
];

export const Scene8 = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const exit = interpolate(
    frame,
    [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const head = spring({ frame: frame - 2, fps, config: { damping: 200 } });
  const pill = spring({ frame: frame - 80, fps, config: { damping: 200 } });
  const pathP = interpolate(frame, [40, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const bob = Math.sin(frame / 42) * 7;
  const driftX = Math.sin(frame / 55) * 10;

  return (
    <AbsoluteFill style={{ backgroundColor: props.bgColor, overflow: "hidden", direction: "ltr" }}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="s8glow" cx="45%" cy="52%" r="52%">
            <stop offset="0%" stopColor={props.accentColor} stopOpacity={0.16} />
            <stop offset="100%" stopColor={props.accentColor} stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect x={0} y={0} width={1920} height={1080} fill="url(#s8glow)" />
        {Array.from({ length: 14 }).map((_, i) => (
          <line key={`a${i}`} x1={i * 170} y1={1080} x2={i * 170 + 640} y2={0} stroke={props.secondaryColor} strokeWidth={1} opacity={0.05} />
        ))}
        {Array.from({ length: 14 }).map((_, i) => (
          <line key={`b${i}`} x1={i * 170} y1={0} x2={i * 170 + 640} y2={1080} stroke={props.secondaryColor} strokeWidth={1} opacity={0.05} />
        ))}
        <ellipse cx={860} cy={724} rx={340} ry={54} fill={props.accentColor} opacity={0.08} />
      </svg>

      <div style={{ position: "absolute", left: "5%", top: "8%", width: "60%", fontFamily: FONT }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            opacity: head,
            transform: `translateY(${(1 - head) * 16}px)`,
            color: props.accentColor,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          <div style={{ width: 30, height: 2, backgroundColor: props.accentColor }} />
          Conclusion
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: Math.min(64, width * 0.033),
            fontWeight: 800,
            lineHeight: 1.08,
            color: props.textColor,
            opacity: head,
            transform: `translateY(${(1 - head) * 24}px)`,
          }}
        >
          Une leçon d’espace
        </div>
        <div style={{ marginTop: 8, fontSize: 27, color: props.mutedColor, opacity: head }}>
          Chaque niveau guide le regard et le pas.
        </div>
      </div>

      <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0, direction: "ltr", opacity: exit }}>
        <g transform={`translate(${driftX} ${bob})`}>
          {FLOORS.map((f, i) => {
            const s = spring({ frame: frame - (8 + i * 12), fps, config: { damping: 18, mass: 0.7 } });
            return (
              <g key={f.name} opacity={s}>
                <g transform={`translate(860 ${f.cy + (1 - s) * 40})`}>
                  <g transform={ISO}>
                    <rect x={-210} y={-140} width={420} height={280} rx={22} fill={props.secondaryColor} opacity={0.45} transform="translate(0 20)" />
                    <rect x={-210} y={-140} width={420} height={280} rx={22} fill={props.surfaceColor} fillOpacity={0.96} stroke={props.accentColor} strokeWidth={2.5} />

                    {f.kind === "roof" && (
                      <>
                        <path d="M -150 50 C -70 -46 50 -56 132 34" fill="none" stroke={props.accentColor} strokeWidth={4} strokeLinecap="round" />
                        <circle cx={110} cy={26} r={18} fill="none" stroke={props.accentColor} strokeWidth={2} opacity={0.6} />
                        <path d="M -170 90 L -60 90" fill="none" stroke={props.secondaryColor} strokeWidth={2} opacity={0.5} />
                      </>
                    )}

                    {f.kind === "first" && (
                      <>
                        <rect x={-160} y={-105} width={140} height={100} rx={10} fill={props.accentColor} fillOpacity={0.16} stroke={props.accentColor} strokeWidth={2} />
                        <rect x={40} y={-20} width={120} height={90} rx={8} fill={props.secondaryColor} fillOpacity={0.16} stroke={props.secondaryColor} strokeWidth={1.5} />
                        <path d="M -20 -110 L -20 20" fill="none" stroke={props.secondaryColor} strokeWidth={1.5} opacity={0.6} />
                      </>
                    )}

                    {f.kind === "ground" && (
                      <>
                        <rect x={-70} y={-36} width={140} height={76} rx={10} fill={props.secondaryColor} fillOpacity={0.18} stroke={props.secondaryColor} strokeWidth={1.5} />
                        <circle cx={128} cy={-46} r={30} fill="none" stroke={props.accentColor} strokeWidth={2.5} />
                        <path d="M 116 -46 C 140 -46 140 -22 116 -22 C 100 -22 100 -58 128 -58" fill="none" stroke={props.accentColor} strokeWidth={2} strokeLinecap="round" opacity={0.8} />
                        <path d="M -190 80 L -60 80" fill="none" stroke={props.accentColor} strokeWidth={2.5} opacity={0.6} />
                      </>
                    )}

                    {[
                      [-184, -112],
                      [184, -112],
                      [-184, 112],
                      [184, 112],
                      [0, 0],
                    ].map(([cx, cy], k) => (
                      <circle key={k} cx={cx} cy={cy} r={6} fill={props.accentColor} opacity={0.85} />
                    ))}
                  </g>
                </g>

                <text x={500} y={f.cy - 18} textAnchor="end" fill={props.accentColor} fontFamily={FONT} fontSize={13} fontWeight={800} letterSpacing={2} opacity={0.85}>
                  NIVEAU {f.num}
                </text>
                <text x={500} y={f.cy + 8} textAnchor="end" fill={props.textColor} fontFamily={FONT} fontSize={20} fontWeight={800}>
                  {f.name}
                </text>
                <line x1={512} y1={f.cy} x2={590} y2={f.cy} stroke={props.secondaryColor} strokeWidth={1.5} opacity={0.6} />
                <circle cx={590} cy={f.cy} r={4} fill={props.accentColor} />
              </g>
            );
          })}

          <path
            d={CIRC}
            fill="none"
            stroke={props.accentColor}
            strokeWidth={16}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - pathP}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.16}
          />
          <path
            d={CIRC}
            fill="none"
            stroke={props.accentColor}
            strokeWidth={5}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - pathP}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={860} cy={420} r={9} fill={props.accentColor} />
          <circle cx={860} cy={420} r={20 + Math.sin(frame / 9) * 4} fill="none" stroke={props.accentColor} strokeWidth={1.5} opacity={0.55} />
        </g>
      </svg>

      <div
        style={{
          position: "absolute",
          left: "5%",
          top: "61%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 18px",
          borderRadius: 999,
          backgroundColor: props.surfaceColor,
          border: `1px solid ${props.secondaryColor}66`,
          boxShadow: "0 18px 48px rgba(0,0,0,0.32)",
          fontFamily: FONT,
          opacity: exit * pill,
          transform: `translateY(${(1 - pill) * 16}px)`,
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: props.accentColor }} />
        <span style={{ fontSize: 17, fontWeight: 700, color: props.textColor }}>Trois niveaux, un parcours</span>
      </div>

      {props.showCharacter !== false && (
        <div style={{ position: "absolute", right: 80, bottom: "30%", width: 240, height: 380, opacity: exit }}>
          <Stickman
            pose="pointing"
            color={props.characterBody}
            faceColor={props.characterFace}
            accent={props.characterAccent}
            shadow={props.characterShadow}
            delay={14}
          />
        </div>
      )}

      <SceneSfx name="whoosh-soft" frame={4} volume={0.18} />
      <SceneSfx name="pop-soft" frame={16} volume={0.18} />
      <SceneSfx name="pop-soft" frame={28} volume={0.18} />
      <SceneSfx name="pop-soft" frame={40} volume={0.18} />
      <SceneSfx name="type-tick" frame={20} volume={0.18} />
      <SceneSfx name="click-subtle" frame={84} volume={0.18} />
    </AbsoluteFill>
  );
};
