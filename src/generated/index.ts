import type { ComponentType } from "react";
import { Scene1 } from "./Scene1";
import { Scene2 } from "./Scene2";
import { Scene3 } from "./Scene3";
import { Scene4 } from "./Scene4";
import { Scene5 } from "./Scene5";
import { Scene6 } from "./Scene6";
import { Scene7 } from "./Scene7";
import { Scene8 } from "./Scene8";

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
  "Scene6": Scene6,
  "Scene7": Scene7,
  "Scene8": Scene8,
};
