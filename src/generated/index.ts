import type { ComponentType } from "react";
import { CustomScene_scene_2156279a_5 } from "./CustomScene_scene_2156279a_5";
import { CustomScene_scene_6e63c750_0 } from "./CustomScene_scene_6e63c750_0";

export type GeneratedSceneProps = {
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

export const GENERATED_SCENES: Record<
  string,
  ComponentType<GeneratedSceneProps>
> = {
  "CustomScene_scene_2156279a_5": CustomScene_scene_2156279a_5,
  "CustomScene_scene_6e63c750_0": CustomScene_scene_6e63c750_0,
};
