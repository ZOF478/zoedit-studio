import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Layout } from "../layout";
import { alpha, type Theme } from "../theme";
import type { CharacterConfig, CharacterLayout } from "../types";
import { Stickman } from "./Stickman";

type CharacterStageProps = {
  characters: CharacterConfig[];
  theme: Theme;
  layout: Layout;
  isRtl: boolean;
  characterLayout?: CharacterLayout;
  durationInFrames: number;
  sceneIndex: number;
};

export const CharacterStage = ({
  characters,
  theme,
  layout,
  isRtl,
  characterLayout,
  durationInFrames,
  sceneIndex,
}: CharacterStageProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const visible = characters.slice(0, 3);
  const direction =
    characterLayout ??
    (layout.isPortrait ? "top-bottom" : "side-by-side");
  const isRow = direction === "side-by-side";
  const localTime = frame / fps;
  const progress = durationInFrames > 0 ? frame / durationInFrames : 0;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: isRow ? "row" : "column",
        alignItems: "stretch",
        justifyContent: "center",
        gap: Math.round(layout.unit * 10),
        minHeight: 0,
      }}
    >
      {visible.map((character, index) => {
        const enter = spring({
          frame: frame - Math.round(fps * (0.18 + index * 0.16)),
          fps,
          config: { damping: 16, mass: 0.65, stiffness: 130 },
        });
        const eased = Math.min(1, Math.max(0, enter));
        const side = character.side === "left" || character.side === "right"
          ? character.side
          : index === 0
            ? isRtl
              ? "right"
              : "left"
            : isRtl
              ? "left"
              : "right";
        const sway = Math.sin(localTime * 1.4 + index + sceneIndex) * 4;
        return (
          <div
            key={`staged-character-${index}`}
            style={{
              position: "relative",
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: theme.card.radius,
              background: `linear-gradient(160deg, ${alpha(
                theme.colors.primary,
                index === 0 ? 0.1 : 0.05,
              )} 0%, transparent 68%)`,
              border: `1px solid ${alpha(theme.colors.primary, 0.18)}`,
              overflow: "hidden",
              opacity: eased,
              transform: `translateY(${(1 - eased) * 24}px) scale(${
                0.94 + eased * 0.06
              })`,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `radial-gradient(circle at 50% 35%, ${alpha(
                  theme.colors.primary,
                  0.16,
                )} 0%, transparent 68%)`,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                maxWidth: layout.characterWidth,
                transform: `translateX(${sway}px) scaleX(${
                  side === "left" ? 1 : -1
                })`,
                transformOrigin: "50% 70%",
              }}
            >
              <Stickman
                pose={character.pose ?? "idle"}
                color={theme.character.body}
                faceColor={theme.character.face}
                accent={theme.character.accent}
                shadow={theme.character.shadow}
                accessory={character.accessory ?? "none"}
                delay={Math.round(fps * (0.22 + index * 0.12))}
              />
            </div>
            {character.label ? (
              <div
                style={{
                  position: "absolute",
                  bottom: Math.round(layout.unit * 14),
                  left: "50%",
                  transform: "translateX(-50%)",
                  padding: `${Math.round(layout.unit * 5)}px ${Math.round(
                    layout.unit * 16,
                  )}px`,
                  borderRadius: 999,
                  background: alpha(theme.colors.background, 0.7),
                  border: `1px solid ${alpha(theme.colors.primary, 0.45)}`,
                  color: theme.colors.text,
                  fontFamily: theme.fontFamily,
                  fontSize: Math.max(30, Math.round(layout.smallSize * 0.82)),
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                {character.label}
              </div>
            ) : null}
          </div>
        );
      })}

      {visible.length > 1 ? (
        <div
          style={{
            position: "absolute",
            left: isRow ? "50%" : "8%",
            right: isRow ? undefined : "8%",
            top: isRow ? "8%" : "50%",
            bottom: isRow ? "8%" : undefined,
            width: isRow ? Math.max(2, Math.round(layout.unit * 3)) : undefined,
            height: isRow ? undefined : Math.max(2, Math.round(layout.unit * 3)),
            transform: isRow ? "translateX(-50%)" : "translateY(-50%)",
            borderRadius: 999,
            background: `linear-gradient(${
              isRow ? "180deg" : "90deg"
            }, transparent, ${alpha(theme.colors.primary, 0.6)}, transparent)`,
            opacity: 0.65 + Math.sin(localTime * 2 + progress * 4) * 0.2,
            pointerEvents: "none",
          }}
        />
      ) : null}
    </div>
  );
};
