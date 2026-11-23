import { createContext, useContext } from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { MAX_SCENE_SFX_VOLUME } from "../sfx";

export type SceneSfxName = "pop" | "check" | "whoosh" | "sparkle";

export const SCENE_SFX_FILES: Record<SceneSfxName, string> = {
  pop: "pop-soft.wav",
  check: "click-subtle.wav",
  whoosh: "whoosh-soft.wav",
  sparkle: "pop-soft.wav",
};

export const SCENE_SFX_DEFAULT_VOLUME = 0.18;

export const SceneSfxEnabledContext = createContext(true);

export const SceneSfxVolumeContext = createContext(1);

export type SceneSfxProps = {
  name: SceneSfxName;
  frame: number;
  volume?: number;
  sfxEnabled?: boolean;
};

const clampVolume = (value: number): number => {
  if (!Number.isFinite(value)) return SCENE_SFX_DEFAULT_VOLUME;
  return Math.min(MAX_SCENE_SFX_VOLUME, Math.max(0, value));
};

const resolveSfxSource = (fileName: string): string | null => {
  if (!fileName) return null;
  try {
    return staticFile(`sfx/${fileName}`);
  } catch {
    return null;
  }
};

export const SceneSfx = ({
  name,
  frame,
  volume = SCENE_SFX_DEFAULT_VOLUME,
  sfxEnabled,
}: SceneSfxProps) => {
  const contextEnabled = useContext(SceneSfxEnabledContext);
  const sfxVolume = useContext(SceneSfxVolumeContext);
  const enabled = contextEnabled && (sfxEnabled ?? true);

  if (!enabled) return null;

  const fileName = SCENE_SFX_FILES[name];
  if (!fileName) return null;

  const src = resolveSfxSource(fileName);
  if (!src) return null;

  const from = Math.max(0, Math.round(Number.isFinite(frame) ? frame : 0));
  const finalVolume = clampVolume(
    (volume ?? SCENE_SFX_DEFAULT_VOLUME) * clampVolume(sfxVolume),
  );

  if (finalVolume <= 0) return null;

  return (
    <Sequence from={from} layout="none">
      <Audio
        src={src}
        volume={finalVolume}
        onError={() => undefined}
      />
    </Sequence>
  );
};
