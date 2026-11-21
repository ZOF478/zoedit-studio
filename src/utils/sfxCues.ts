import type { SfxCue, SfxCueSound } from "../types";

type CueElement = Record<string, unknown> & { type?: unknown };

export type SfxCueMode = "silent" | "voiceover";

export type BuildSfxCuesInput = {
  fps: number;
  durationSec: number;
  elements: CueElement[];
  mode?: SfxCueMode;
  maxCues?: number;
};

const asStrings = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === "string" && Boolean(item.trim()),
  );
};

const asRecords = (value: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object",
  );
};

const readPoints = (value: unknown): string[] => {
  if (!value || typeof value !== "object") return [];
  return asStrings((value as Record<string, unknown>).points);
};

const MAJOR_MULTI_STEP = new Set([
  "bullet_list",
  "grid_nodes",
  "layer_stack",
  "step_timeline",
  "comparison_box",
  "generative_scene",
  "hero_title",
]);

export const buildStaggeredSfxCues = ({
  fps,
  durationSec,
  elements,
  mode = "voiceover",
  maxCues,
}: BuildSfxCuesInput): SfxCue[] => {
  const safeFps = Math.max(1, Math.round(fps));
  const durationFrames = Math.max(
    1,
    Math.round(Math.max(0.5, durationSec) * safeFps),
  );
  const silent = mode === "silent";
  const accentVolume = silent ? 0.46 : 0.4;
  const baseVolume = silent ? 0.4 : 0.35;
  const beat = (seconds: number) => Math.round(safeFps * seconds);
  const elementDelay = (index: number) =>
    Math.round(safeFps * 0.3) + index * Math.round(safeFps * 0.24);

  const cues: SfxCue[] = [];
  const pushCue = (
    frameOffset: number,
    sound: SfxCueSound,
    volume = baseVolume,
  ) => {
    const at = Math.round(frameOffset);
    if (!Number.isFinite(at) || at < 0 || at >= Math.max(1, durationFrames - 1)) {
      return;
    }
    if (
      cues.some(
        (cue) => cue.sound === sound && Math.abs(cue.frameOffset - at) <= 1,
      )
    ) {
      return;
    }
    cues.push({
      frameOffset: at,
      sound,
      volume: Math.min(0.5, Math.max(0.34, Number(volume.toFixed(2)))),
    });
  };

  elements.forEach((rawElement, elementIndex) => {
    const element = (rawElement ?? {}) as CueElement;
    const type = typeof element.type === "string" ? element.type : "";
    const delay = elementDelay(elementIndex);

    if (!silent && !MAJOR_MULTI_STEP.has(type)) return;

    switch (type) {
      case "bullet_list":
      case "grid_nodes": {
        const items = asStrings(element.items).slice(0, 6);
        items.forEach((_, itemIndex) => {
          const sound: SfxCueSound =
            itemIndex === 0 ? "pop" : itemIndex % 2 === 0 ? "pop" : "tick";
          pushCue(
            delay + itemIndex * beat(0.1),
            sound,
            itemIndex === 0 ? accentVolume : baseVolume,
          );
        });
        break;
      }
      case "layer_stack": {
        const items = asStrings(element.items).slice(0, 5);
        items.forEach((_, itemIndex) => {
          pushCue(
            delay + itemIndex * beat(0.16),
            itemIndex === 0 ? "pop" : "tick",
            itemIndex === 0 ? accentVolume : baseVolume,
          );
        });
        break;
      }
      case "step_timeline": {
        const steps = asRecords(element.steps).slice(0, 5);
        const revealSpan = Math.max(
          beat(0.9),
          durationFrames - delay - beat(0.5),
        );
        const stepGap = revealSpan / Math.max(1, steps.length);
        steps.forEach((_, stepIndex) => {
          pushCue(
            delay + stepIndex * stepGap,
            stepIndex === 0 ? "pop" : "tick",
            stepIndex === 0 ? accentVolume : baseVolume,
          );
        });
        break;
      }
      case "comparison_box": {
        const rightBeat =
          delay + Math.max(beat(0.55), Math.round(durationFrames * 0.2));
        pushCue(delay, "pop", accentVolume);
        pushCue(rightBeat, "tick", baseVolume);
        const sides = [element.left, element.right];
        sides.forEach((side, sideIndex) => {
          const points = readPoints(side).slice(0, silent ? 2 : 1);
          const sideBeat = sideIndex === 0 ? delay : rightBeat;
          points.forEach((_, pointIndex) => {
            pushCue(
              sideBeat + beat(0.16) + pointIndex * beat(0.08),
              "tick",
              baseVolume * 0.92,
            );
          });
        });
        break;
      }
      case "hero_title": {
        pushCue(delay, silent ? "impact" : "pop", silent ? 0.38 : 0.32);
        pushCue(delay + beat(0.2), "tick", baseVolume);
        break;
      }
      case "generative_scene": {
        const keywords = asStrings(element.keywords).slice(0, 5);
        if (keywords.length > 0) {
          const revealStart = beat(0.26);
          const revealEnd = Math.max(
            revealStart + beat(1.5),
            durationFrames - beat(0.35),
          );
          const segment = Math.max(1, (revealEnd - revealStart) / 5);
          const limit = silent ? keywords.length : Math.min(2, keywords.length);
          keywords.slice(0, limit).forEach((_, keywordIndex) => {
            pushCue(
              delay + revealStart + keywordIndex * segment,
              keywordIndex % 2 === 0 ? "pop" : "tick",
              keywordIndex === 0 ? accentVolume : baseVolume,
            );
          });
          if (silent) pushCue(delay + beat(0.12), "tick", baseVolume);
        } else {
          const words = (typeof element.headline === "string"
            ? element.headline
            : ""
          )
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, silent ? 4 : 2);
          words.forEach((_, wordIndex) => {
            pushCue(
              delay + beat(0.12) + wordIndex * beat(0.06),
              "tick",
              baseVolume * 0.94,
            );
          });
        }
        break;
      }
      case "bar_chart":
      case "line_chart": {
        pushCue(delay + beat(0.15), silent ? "rise" : "tick", baseVolume * 0.95);
        if (silent) pushCue(delay + beat(0.55), "pop", baseVolume * 0.9);
        break;
      }
      case "progress_bar":
        pushCue(delay + beat(0.25), "tick", baseVolume);
        break;
      case "stat_number":
        pushCue(delay + beat(0.1), "pop", baseVolume);
        break;
      case "cta":
        pushCue(delay + beat(0.1), "chime", silent ? 0.36 : 0.3);
        break;
      case "notification_card":
        pushCue(delay, "chime", baseVolume);
        break;
      case "warning_card":
        pushCue(delay, "impact", baseVolume * 0.92);
        break;
      default:
        if (
          silent &&
          (type === "highlight_card" ||
            type === "editorial_quote" ||
            type === "custom_visual" ||
            type === "custom_tsx")
        ) {
          pushCue(delay, "pop", baseVolume * 0.9);
        }
        break;
    }
  });

  if (silent && cues.length === 0) {
    cues.push({ frameOffset: beat(0.28), sound: "pop", volume: 0.36 });
  }

  const limit = maxCues ?? (silent ? 7 : 3);
  return cues
    .sort((a, b) => a.frameOffset - b.frameOffset)
    .slice(0, Math.max(0, limit));
};

export const normalizeSfxCues = (raw: unknown): SfxCue[] | undefined => {
  if (!Array.isArray(raw)) return undefined;
  const validSounds = new Set<SfxCueSound>([
    "pop",
    "tick",
    "whoosh",
    "rise",
    "impact",
    "chime",
  ]);
  const cues = raw
    .map((item): SfxCue | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const frameOffset = Number(record.frameOffset);
      const sound = record.sound;
      if (
        !Number.isFinite(frameOffset) ||
        frameOffset < 0 ||
        typeof sound !== "string" ||
        !validSounds.has(sound as SfxCueSound)
      ) {
        return null;
      }
      const volumeRaw = Number(record.volume);
      return {
        frameOffset: Math.round(frameOffset),
        sound: sound as SfxCueSound,
        ...(Number.isFinite(volumeRaw)
          ? { volume: Math.min(1, Math.max(0, Number(volumeRaw.toFixed(2)))) }
          : {}),
      };
    })
    .filter((cue): cue is SfxCue => cue !== null)
    .sort((a, b) => a.frameOffset - b.frameOffset);
  return cues.length > 0 ? cues : undefined;
};
