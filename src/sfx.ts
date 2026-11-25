import type { Scene } from "./types";

export const SFX_FILES = {
  "whoosh-soft": "whoosh-soft.wav",
  "whoosh-whip": "whoosh-whip.wav",
  "pop-soft": "pop-soft.wav",
  "click-subtle": "click-subtle.wav",
  slide: "slide.wav",
  "type-tick": "type-tick.wav",
  "toggle-soft": "toggle-soft.wav",
  "impact-soft": "impact-soft.wav",
  "whoosh-fast": "whoosh-fast.wav",
  "whoosh-deep": "whoosh-deep.wav",
  "pop-bubble": "pop-bubble.wav",
  "pop-sharp": "pop-sharp.wav",
  "typing-click": "typing-click.wav",
  "alert-warning": "alert-warning.wav",
  "cash-register": "cash-register.wav",
  "cinematic-hit": "cinematic-hit.wav",
  "bass-drop": "bass-drop.wav",
  "riser-build": "riser-build.wav",
} as const;

export type SfxCatalogId = keyof typeof SFX_FILES;

export const SFX_DURATIONS: Record<SfxCatalogId, number> = {
  "whoosh-soft": 0.16,
  "whoosh-whip": 0.18,
  "pop-soft": 0.14,
  "click-subtle": 0.07,
  slide: 0.4,
  "type-tick": 0.05,
  "toggle-soft": 0.62,
  "impact-soft": 0.2,
  "whoosh-fast": 0.16,
  "whoosh-deep": 0.16,
  "pop-bubble": 0.14,
  "pop-sharp": 0.07,
  "typing-click": 0.05,
  "alert-warning": 0.62,
  "cash-register": 0.3,
  "cinematic-hit": 0.2,
  "bass-drop": 0.2,
  "riser-build": 0.4,
};

export const MAX_SCENE_SFX_VOLUME = 0.25;

export const DEFAULT_SFX_VOLUME = 0.2;

export const DEFAULT_SFX_CUE_VOLUME = 0.18;

export const SFX_CUE_FILES: Record<string, string> = {
  ...SFX_FILES,
  pop: "pop-soft.wav",
  tick: "type-tick.wav",
  whoosh: "whoosh-soft.wav",
  rise: "slide.wav",
  impact: "impact-soft.wav",
  chime: "click-subtle.wav",
};

export const resolveSceneSfxSrc = (scene: Scene): string | null => {
  const explicit = scene.sfxSrc?.trim();
  if (!explicit || explicit === "none") return null;
  return explicit.startsWith("/") ? explicit.slice(1) : explicit;
};
