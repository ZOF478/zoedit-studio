import type { Scene, SfxCueSound } from "./types";

export const SFX_FILES = {
  "whoosh-fast": "whoosh-fast.wav",
  "whoosh-deep": "whoosh-deep.wav",
  "pop-bubble": "pop-bubble.wav",
  "pop-sharp": "pop-sharp.wav",
  "ding-success": "ding-success.wav",
  "alert-warning": "alert-warning.wav",
  "cash-register": "cash-register.wav",
  "typing-click": "typing-click.wav",
  "notification-chime": "notification-chime.wav",
  "cinematic-hit": "cinematic-hit.wav",
  "bass-drop": "bass-drop.wav",
  "riser-build": "riser-build.wav",
} as const;

export type SfxCatalogId = keyof typeof SFX_FILES;

export const SFX_DURATIONS: Record<SfxCatalogId, number> = {
  "whoosh-fast": 0.62,
  "whoosh-deep": 1.25,
  "pop-bubble": 0.34,
  "pop-sharp": 0.24,
  "ding-success": 1.55,
  "alert-warning": 1.15,
  "cash-register": 1.4,
  "typing-click": 0.46,
  "notification-chime": 1.85,
  "cinematic-hit": 2.2,
  "bass-drop": 1.85,
  "riser-build": 2.55,
};

export const DEFAULT_SFX_VOLUME = 0.65;

export const DEFAULT_SFX_CUE_VOLUME = 0.4;

export const SFX_CUE_FILES: Record<SfxCueSound, string> = {
  pop: "pop-sharp.wav",
  tick: "typing-click.wav",
  whoosh: "whoosh-fast.wav",
  rise: "riser-build.wav",
  impact: "cinematic-hit.wav",
  chime: "notification-chime.wav",
};

export const resolveSceneSfxSrc = (scene: Scene): string | null => {
  const explicit = scene.sfxSrc?.trim();
  if (!explicit || explicit === "none") return null;
  return explicit.startsWith("/") ? explicit.slice(1) : explicit;
};
