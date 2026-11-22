import { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { buildStaggeredSfxCues } from "../utils/sfxCues";
import type { Layout } from "../layout";
import {
  DEFAULT_SFX_CUE_VOLUME,
  DEFAULT_SFX_VOLUME,
  resolveSceneSfxSrc,
  SFX_CUE_FILES,
  SFX_DURATIONS,
} from "../sfx";
import { alpha, type Theme, withWcagPalette } from "../theme";
import { resolveWcagPalette } from "../utils/wcagPalette";
import type {
  CaptionConfig,
  Scene as SceneData,
  StyleId,
} from "../types";
import { AmbientEnvironment } from "./AmbientEnvironment";
import { AmbientMotion } from "./AmbientMotion";
import { AnimatedCaption } from "./AnimatedCaption";
import { Background } from "./Background";
import { CharacterStage } from "./CharacterStage";
import { ElementRenderer } from "./ElementRenderer";
import { Stickman } from "./Stickman";

type SceneProps = {
  scene: SceneData;
  index: number;
  theme: Theme;
  layout: Layout;
  durationInFrames: number;
  isRtl: boolean;
  language: string;
  sfxVolume: number;
  style: StyleId;
  captionConfig?: CaptionConfig;
};

const DATA_HEAVY_ELEMENTS = new Set([
  "generative_scene",
  "comparison_box",
  "bar_chart",
  "line_chart",
  "circular_gauge",
  "grid_nodes",
  "step_timeline",
  "progress_bar",
]);

const resolveShowCharacter = (
  style: StyleId,
  scene: SceneData,
  index: number,
): boolean => {
  if (style === "modern_dark" || style === "editorial_clean") {
    return false;
  }
  if (style === "stickman") {
    return scene.character?.enabled !== false;
  }
  if (typeof scene.character?.enabled === "boolean") {
    return scene.character.enabled;
  }
  if (scene.character) {
    return true;
  }
  const firstType = scene.elements?.[0]?.type ?? "";
  if (DATA_HEAVY_ELEMENTS.has(firstType)) {
    return false;
  }
  return index % 2 === 0;
};

export const Scene = ({
  scene,
  index,
  theme: baseTheme,
  layout,
  durationInFrames,
  isRtl,
  language,
  sfxVolume,
  style,
  captionConfig,
}: SceneProps) => {
  const scenePalette = resolveWcagPalette({
    bgColor: baseTheme.wcag.bgColor,
    accentColor: baseTheme.wcag.safeAccent,
    moodText: [scene.title, scene.caption, scene.ambientScene, scene.background]
      .filter(Boolean)
      .join(" "),
  });
  const theme = withWcagPalette(baseTheme, scenePalette);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sfxSrc = sfxVolume > 0 ? resolveSceneSfxSrc(scene) : null;
  const sfxId = scene.sfxSrc
    ?.replace(/^\/?sfx\//, "")
    .replace(/\.[a-z0-9]+$/i, "") as keyof typeof SFX_DURATIONS | undefined;
  const sfxAudioSeconds = sfxId ? SFX_DURATIONS[sfxId] : undefined;
  const sfxFrames = Math.round(
    Math.max(
      0.45,
      Math.min(
        durationInFrames / fps,
        sfxAudioSeconds ?? Math.min(1.25, (durationInFrames / fps) * 0.4),
      ),
    ) * fps,
  );
  const sfxSyncAt = sfxSrc ? (scene.sfxAt ?? 0.2) : undefined;

  const resolvedSfxCues = useMemo(() => {
    if (sfxVolume <= 0) return [];
    if (scene.sfxCues && scene.sfxCues.length > 0) return scene.sfxCues;
    if (!scene.elements || scene.elements.length === 0) return [];
    return buildStaggeredSfxCues({
      fps,
      durationSec: durationInFrames / fps,
      elements: scene.elements as Array<Record<string, unknown>>,
      mode: scene.audioSrc ? "voiceover" : "silent",
    });
  }, [
    scene.sfxCues,
    scene.elements,
    scene.audioSrc,
    fps,
    durationInFrames,
    sfxVolume,
  ]);

  const sceneEnter = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.8, stiffness: 90 },
  });
  const sceneEase = Math.min(1, Math.max(0, sceneEnter));
  const exit = interpolate(
    frame,
    [Math.max(0, durationInFrames - Math.round(fps * 0.45)), durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const headerEnter = spring({
    frame: frame - Math.round(fps * 0.08),
    fps,
    config: { damping: 200, mass: 0.7, stiffness: 110 },
  });
  const headerEase = Math.min(1, Math.max(0, headerEnter));

  const direction = isRtl ? "rtl" : "ltr";
  const textAlign = isRtl ? "right" : "left";
  const side = scene.character?.side ?? "auto";
  const characterOnLeft = side === "left" || (side === "auto" && isRtl);
  const contentOrder = characterOnLeft ? 2 : 1;
  const characterOrder = characterOnLeft ? 1 : 2;
  const elements = scene.elements ?? [];
  const exclusiveStage = elements.some(
    (element) => element.type === "custom_tsx" || element.type === "comparison_box",
  );
  const elementRepeatsTitle = elements.some(
    (element) =>
      "title" in element &&
      typeof element.title === "string" &&
      element.title.trim() === (scene.title ?? "").trim(),
  );
  const sideBySide = layout.isWide || layout.isSquare;
  const portraitCharacterHeight = Math.round(
    layout.characterHeight * (elements.length > 1 ? 0.88 : 1),
  );

  let sceneLayout =
    scene.layout ??
    (layout.isPortrait
      ? index % 3 === 1
        ? "overlay"
        : index % 3 === 2
          ? "centered"
          : "stacked"
      : index % 3 === 0
        ? "overlay"
        : index % 3 === 1
          ? "split"
          : "centered");
  const resolvedCharacters =
    scene.characters && scene.characters.length > 0
      ? scene.characters
      : scene.character
        ? [scene.character]
        : [];
  const styleAllowsCharacters =
    style === "stickman" || style === "smart_mix";
  const multiCharacter =
    styleAllowsCharacters &&
    resolvedCharacters.length > 1 &&
    !(style === "smart_mix" && scene.character?.enabled === false);
  const showCharacter = exclusiveStage
    ? false
    : multiCharacter
      ? true
      : resolveShowCharacter(style, scene, index);
  const hasDataHeavyElement = elements.some((element) =>
    DATA_HEAVY_ELEMENTS.has(element.type),
  );
  if (showCharacter && hasDataHeavyElement && sceneLayout === "overlay") {
    sceneLayout = layout.isPortrait ? "stacked" : "split";
  }
  if (layout.isWide) {
    sceneLayout = "split";
  } else if (layout.isSquare) {
    if (sceneLayout === "stacked" || sceneLayout === "overlay") {
      sceneLayout = showCharacter ? "split" : "centered";
    } else if (sceneLayout === "split" && !showCharacter) {
      sceneLayout = "centered";
    }
  } else if (layout.isPortrait && sceneLayout === "split") {
    sceneLayout = "stacked";
  }
  const contentMaxHeight = `${Math.round(
    layout.contentMaxHeightRatio * 100,
  )}%`;
  const camera = scene.camera ?? "slow-zoom-in";
  const cameraProgress = interpolate(
    frame,
    [0, Math.max(1, durationInFrames - 1)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const cameraEase = 0.5 - 0.5 * Math.cos(cameraProgress * Math.PI);
  const stageTwo = Math.max(0, (cameraProgress - 0.5) * 2);
  const microX = Math.sin((frame / fps) * 0.9 + index * 1.7) * 0.18;
  const microY = Math.cos((frame / fps) * 0.7 + index) * 0.14;
  const cameraTransform = (() => {
    const drift = Math.sin(cameraProgress * Math.PI * 2) * 0.6;
    const settle = Math.sin(cameraProgress * Math.PI * 3 + index) * 0.12;
    switch (camera) {
      case "slow-zoom-out":
        return `scale(${1.09 - cameraEase * 0.07 + settle * 0.004}) translate(${microX}%, ${microY}%)`;
      case "pan-left":
        return `scale(${1.03 + cameraEase * 0.03}) translate(${
          2.2 - cameraProgress * 3.4 + microX
        }%, ${microY}%) rotate(${-0.4 + cameraProgress * 0.7}deg)`;
      case "pan-right":
        return `scale(${1.03 + cameraEase * 0.03}) translate(${
          -2.2 + cameraProgress * 3.4 + microX
        }%, ${microY}%) rotate(${0.4 - cameraProgress * 0.7}deg)`;
      case "push-in":
        return `scale(${1 + cameraEase * 0.06 + stageTwo * 0.055}) translate(${
          drift * 0.8 + microX
        }%, ${-microY * 0.6}%)`;
      case "static":
        return `scale(${1.01 + Math.sin(cameraProgress * Math.PI) * 0.012}) translate(${microX}%, ${microY}%)`;
      default:
        return `scale(${
          1 + cameraEase * 0.055 + stageTwo * 0.02 + settle * 0.004
        }) translate(${drift * 0.6 + microX}%, ${microY}%)`;
    }
  })();

  const poseName = scene.character?.pose ?? "idle";
  const walkTime = (frame / fps) * Math.PI * 2;
  const walkDrift =
    poseName === "walking"
      ? Math.sin(walkTime * 0.55) * layout.unit * 26
      : Math.sin(walkTime * 0.22 + index) * layout.unit * 4;
  const leaning = poseName === "pointing" || poseName === "explaining";
  const characterFlip = characterOnLeft ? 1 : -1;

  const header = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: Math.round(layout.gap * 0.55),
        textAlign,
        alignItems: isRtl ? "flex-end" : "flex-start",
        opacity: headerEase,
        translate: `0px ${(1 - headerEase) * layout.unit * 34}px`,
        width: "100%",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: Math.round(layout.unit * 10),
          background: alpha(theme.colors.primary, 0.14),
          border: `1px solid ${alpha(theme.colors.primary, 0.25)}`,
          color: theme.colors.primary,
          padding: `${Math.round(layout.unit * 7)}px ${Math.round(
            layout.unit * 20,
          )}px`,
          borderRadius: 999,
          fontFamily: theme.fontFamily,
          fontSize: layout.kickerSize,
          fontWeight: 800,
          lineHeight: 1.3,
        }}
      >
        <span
          style={{
            width: Math.round(layout.unit * 10),
            height: Math.round(layout.unit * 10),
            borderRadius: "50%",
            background: theme.colors.primary,
            boxShadow: `0 0 ${Math.round(layout.unit * 14)}px ${
              theme.colors.primary
            }`,
            flexShrink: 0,
          }}
        />
        <span>
          {String(index + 1).padStart(2, "0")}
          {scene.kicker ? ` · ${scene.kicker}` : ""}
        </span>
      </div>

      {scene.title && !elementRepeatsTitle ? (
        <div
          style={{
            fontFamily: theme.displayFamily,
            fontSize: layout.titleSize,
            fontWeight: 900,
            color: theme.colors.text,
            lineHeight: 1.18,
            letterSpacing: isRtl ? "0em" : "-0.02em",
            textWrap: "balance",
            maxWidth: "100%",
          }}
        >
          {scene.title}
        </div>
      ) : null}

      {scene.subtitle &&
      scene.subtitle !== scene.kicker &&
      scene.subtitle !== scene.title ? (
        <div
          style={{
            fontFamily: theme.fontFamily,
            fontSize: layout.subtitleSize,
            fontWeight: 600,
            color: theme.colors.muted,
            lineHeight: 1.55,
            maxWidth: sideBySide ? "94%" : "100%",
          }}
        >
          {scene.subtitle}
        </div>
      ) : null}
    </div>
  );

  const elementList = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: Math.round(layout.gap * 0.8),
        width: "100%",
      }}
    >
      {elements.map((element, elementIndex) => (
        <ElementRenderer
          key={`${element.type}-${elementIndex}`}
          element={element}
          theme={theme}
          layout={layout}
          durationInFrames={durationInFrames}
          sceneIndex={index}
          isRtl={isRtl}
          language={language}
          sceneTitle={scene.title}
          sceneCaption={scene.caption}
          showCharacter={showCharacter}
          sfxAt={sfxSyncAt}
          sfxFrames={sfxFrames}
          wcag={scenePalette}
          delay={
            Math.round(fps * 0.3) + elementIndex * Math.round(fps * 0.24)
          }
        />
      ))}
    </div>
  );

  const character = (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: multiCharacter
          ? sideBySide || sceneLayout === "overlay"
            ? "100%"
            : Math.max(
                Math.round(layout.height * 0.34),
                portraitCharacterHeight,
              )
          : sideBySide || sceneLayout === "overlay"
            ? "100%"
            : sceneLayout === "centered"
              ? Math.round(portraitCharacterHeight * 0.85)
              : portraitCharacterHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        minHeight: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: "78%",
          height: "78%",
          maxWidth: layout.characterWidth,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(
            theme.colors.primary,
            0.18,
          )} 0%, transparent 68%)`,
          filter: `blur(${Math.round(layout.unit * 28)}px)`,
        }}
      />
      <div
        style={{
          width: sideBySide ? "100%" : layout.characterWidth,
          height: "100%",
          maxWidth: layout.characterWidth,
          scale: scene.character?.scale ?? 1,
          transform: `translateX(${walkDrift}px) scaleX(${characterFlip})`,
          transformOrigin: "50% 70%",
          filter: leaning
            ? `drop-shadow(0 ${Math.round(layout.unit * 10)}px ${Math.round(
                layout.unit * 24,
              )}px ${alpha(theme.colors.primary, 0.16)})`
            : undefined,
        }}
      >
        {multiCharacter ? (
          <CharacterStage
            characters={resolvedCharacters}
            theme={theme}
            layout={layout}
            isRtl={isRtl}
            characterLayout={scene.characterLayout}
            durationInFrames={durationInFrames}
            sceneIndex={index}
          />
        ) : (
          <Stickman
            pose={scene.character?.pose}
            color={theme.character.body}
            faceColor={theme.character.face}
            accent={theme.character.accent}
            shadow={theme.character.shadow}
            accessory={scene.character?.accessory}
            delay={Math.round(fps * 0.22)}
          />
        )}
      </div>
    </div>
  );

  return (
    <AbsoluteFill
      style={{
        paddingLeft: layout.safeInsetX,
        paddingRight: layout.safeInsetX,
        paddingTop: layout.safeTop,
        paddingBottom: layout.captionSpace,
        direction,
        opacity: Math.min(1, sceneEase * 1.2) * exit,
        overflow: "hidden",
      }}
    >
      {scene.backgroundPreset ? (
        <AbsoluteFill style={{ opacity: 0.96, pointerEvents: "none" }}>
          <Background
            theme={theme}
            preset={scene.backgroundPreset}
            seed={scene.backgroundSeed ?? index}
          />
        </AbsoluteFill>
      ) : null}

      {scene.background ? (
        <AbsoluteFill
          style={{
            background: scene.background,
            opacity: 0.32,
            pointerEvents: "none",
          }}
        />
      ) : null}

      <AmbientMotion
        theme={theme}
        seed={(scene.backgroundSeed ?? index) + 11}
        intensity={showCharacter ? 0.85 : 1}
      />

      {scene.ambientScene && scene.ambientScene !== "none" ? (
        <AmbientEnvironment
          variant={scene.ambientScene}
          theme={theme}
          seed={(scene.backgroundSeed ?? index) + 23}
        />
      ) : null}

      {scene.audioSrc ? <Audio src={staticFile(scene.audioSrc)} /> : null}

      {sfxSrc ? (
        <Sequence
          from={Math.max(0, Math.round((scene.sfxAt ?? 0) * fps))}
          durationInFrames={Math.max(1, Math.round(durationInFrames * 0.4))}
        >
          <Audio src={staticFile(sfxSrc)} volume={sfxVolume} />
        </Sequence>
      ) : null}

      {sfxVolume > 0
        ? resolvedSfxCues.map((cue, cueIndex) => {
            const cueFile = SFX_CUE_FILES[cue.sound];
            if (!cueFile) return null;
            const cueFrom = Math.max(0, Math.round(cue.frameOffset));
            if (cueFrom >= durationInFrames) return null;
            const cueFrames = Math.max(
              1,
              Math.min(durationInFrames - cueFrom, Math.round(fps * 2.2)),
            );
            const masterGain = Math.min(1, sfxVolume / DEFAULT_SFX_VOLUME);
            const cueVolume = Math.min(
              1,
              Math.max(
                0,
                (cue.volume ?? DEFAULT_SFX_CUE_VOLUME) * masterGain,
              ),
            );
            return (
              <Sequence
                key={`sfx-cue-${cueIndex}-${cueFrom}`}
                from={cueFrom}
                durationInFrames={cueFrames}
              >
                <Audio
                  src={staticFile(`sfx/${cueFile}`)}
                  volume={cueVolume}
                />
              </Sequence>
            );
          })
        : null}

      <div
        style={{
          position: "relative",
          zIndex: 2,
          flex: 1,
          minHeight: 0,
          maxHeight: contentMaxHeight,
          marginTop: "auto",
          marginBottom: "auto",
          width: "100%",
          transform: cameraTransform,
          transformOrigin: "center",
        }}
      >
        {exclusiveStage ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flex: 1,
              minHeight: 0,
              height: "100%",
              width: "100%",
            }}
          >
            {elementList}
          </div>
        ) : sceneLayout === "overlay" ? (
          <div
            style={{
              position: "relative",
              flex: 1,
              minHeight: 0,
              height: "100%",
              display: "flex",
              alignItems: "center",
            }}
          >
            {showCharacter ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: characterOnLeft ? "flex-start" : "flex-end",
                  opacity: multiCharacter ? 0.78 : 0.5,
                  pointerEvents: "none",
                }}
              >
                <div style={{ width: multiCharacter ? "84%" : "62%", height: "100%" }}>{character}</div>
              </div>
            ) : null}
            <div
              style={{
                position: "relative",
                zIndex: 2,
                width: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: Math.round(layout.gap * 0.9),
              }}
            >
              {header}
              {elementList}
            </div>
          </div>
        ) : sceneLayout === "split" ? (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "stretch",
              gap: Math.round(layout.gap * 1.4),
              flex: 1,
              minHeight: 0,
              height: "100%",
            }}
          >
            {showCharacter ? (
              <>
                <div
                  style={{
                    order: contentOrder,
                    flex: multiCharacter ? 1 : 1.25,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: Math.round(layout.gap * 0.9),
                  }}
                >
                  {header}
                  {elementList}
                </div>
                <div
                  style={{
                    order: characterOrder,
                    flex: multiCharacter ? 1 : 0.75,
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {character}
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    order: contentOrder,
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: Math.round(layout.gap * 0.9),
                  }}
                >
                  {header}
                </div>
                <div
                  style={{
                    order: characterOrder,
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  {elementList}
                </div>
              </>
            )}
          </div>
        ) : sceneLayout === "centered" ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: Math.round(layout.gap * 0.7),
              flex: 1,
              minHeight: 0,
              height: "100%",
            }}
          >
            <div style={{ width: "100%", maxWidth: "94%" }}>{header}</div>
            {showCharacter ? (
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {character}
              </div>
            ) : null}
            <div style={{ width: "100%", maxWidth: "94%" }}>{elementList}</div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: Math.round(layout.gap * 0.6),
              flex: 1,
              minHeight: 0,
              height: "100%",
            }}
          >
            {header}
            {showCharacter ? character : null}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                justifyContent: "center",
                minHeight: 0,
              }}
            >
              {elementList}
            </div>
          </div>
        )}
      </div>

      {captionConfig?.enabled !== false ? (
        <AnimatedCaption
          wcag={scenePalette}
          text={scene.caption}
        language={language}
        theme={theme}
        layout={layout}
        durationInFrames={durationInFrames}
        audioDuration={scene.audioDuration}
        rtl={isRtl}
        animationStyle={captionConfig?.animation_style}
          wordsPerScreen={captionConfig?.words_per_screen}
          leadIn={captionConfig?.lead_in}
        />
      ) : null}
    </AbsoluteFill>
  );
};
