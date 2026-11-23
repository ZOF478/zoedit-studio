import type { ComponentType } from "react";
import { Scene1 } from "./Scene1";
import { Scene2 } from "./Scene2";
import { Scene3 } from "./Scene3";
import { Scene4 } from "./Scene4";
import { Scene5 } from "./Scene5";

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
  "Scene1": Scene1,
  "Scene2": Scene2,
  "Scene3": Scene3,
  "Scene4": Scene4,
  "Scene5": Scene5,
};
