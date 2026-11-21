import type { CalculateMetadataFunction } from "remotion";
import rawData from "./data.json";
import type { Scene, StyleId, VideoData } from "./types";

export type MainProps = {
  data: VideoData;
};

export const videoData = rawData as unknown as VideoData;

const RTL_LANGUAGES = new Set([
  "ar",
  "fa",
  "ur",
  "he",
  "yi",
  "ps",
  "sd",
  "ug",
  "ku",
  "ckb",
]);

export type VideoSettings = {
  width: number;
  height: number;
  fps: number;
  style: StyleId;
  language: string;
  isRtl: boolean;
};

const positiveNumber = (
  value: number | undefined,
  fallback: number,
): number => {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
};

const normalizeStyleId = (value: unknown): StyleId => {
  const style = typeof value === "string" ? value.toLowerCase() : "";
  if (style === "modern_dark" || style === "modern-dark") return "modern_dark";
  if (style === "editorial_clean" || style === "editorial-clean")
    return "editorial_clean";
  if (style === "smart_mix" || style === "smart-mix" || style === "aimix")
    return "smart_mix";
  return "stickman";
};

export const getVideoSettings = (data: VideoData): VideoSettings => {
  const language = (data.script_language ?? data.language ?? "en")
    .slice(0, 3)
    .toLowerCase();
  return {
    width: Math.round(positiveNumber(data.width ?? data.video?.width, 1080)),
    height: Math.round(positiveNumber(data.height ?? data.video?.height, 1920)),
    fps: positiveNumber(data.fps ?? data.video?.fps, 60),
    style: normalizeStyleId(data.style ?? data.video?.style),
    language,
    isRtl: RTL_LANGUAGES.has(language.split("-")[0]),
  };
};

export const getSceneDurationInSeconds = (scene: Scene): number => {
  return positiveNumber(scene.durationInSeconds ?? scene.duration, 6);
};

export type SceneTiming = {
  from: number;
  durationInFrames: number;
};

export const getSceneTimings = (
  data: VideoData,
  fps: number,
): SceneTiming[] => {
  let cursor = 0;
  const scenes = data.scenes.length > 0 ? data.scenes : [{}];

  return scenes.map((scene) => {
    const durationInFrames = Math.max(
      1,
      Math.round(getSceneDurationInSeconds(scene) * fps),
    );
    const timing = { from: cursor, durationInFrames };
    cursor += durationInFrames;
    return timing;
  });
};

export const getTotalDurationInFrames = (
  data: VideoData,
  fps: number,
): number => {
  return getSceneTimings(data, fps).reduce(
    (total, timing) => total + timing.durationInFrames,
    0,
  );
};

export const calculateMetadata: CalculateMetadataFunction<MainProps> = ({
  props,
}) => {
  const data = props.data ?? videoData;
  const settings = getVideoSettings(data);

  return {
    width: settings.width,
    height: settings.height,
    fps: settings.fps,
    durationInFrames: getTotalDurationInFrames(data, settings.fps),
    defaultOutName: `${data.meta?.title?.trim() || "zof-studio"}`,
  };
};
