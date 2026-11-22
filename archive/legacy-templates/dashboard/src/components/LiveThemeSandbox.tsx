import {
  ThemeSandboxComposition,
  type ThemeSandboxProps,
} from '../../../src/ThemeSandboxComposition';
import type {
  AspectRatio,
  BackgroundPresetId,
  CaptionAnimationStyle,
  ScriptLanguage,
  VisualStyle,
  WatermarkPosition,
  WordsPerScreen,
} from '../types/studio';

export const THEME_SANDBOX_SECONDS = 7;

export interface LiveThemeSandboxProps {
  bgColor: string;
  accentColor: string;
  visualStyle: VisualStyle;
  backgroundPreset: BackgroundPresetId;
  captionAnimationStyle: CaptionAnimationStyle;
  wordsPerScreen: WordsPerScreen;
  captionsEnabled: boolean;
  aspectRatio: AspectRatio;
  scriptLanguage: ScriptLanguage;
  uiLanguage?: ScriptLanguage;
  fps: number;
  watermark?: string;
  watermarkEnabled?: boolean;
  watermarkPosition?: WatermarkPosition;
  [key: string]: unknown;
}

const toParentCaptionStyle = (
  style: CaptionAnimationStyle
): ThemeSandboxProps['captionAnimationStyle'] => {
  if (style === 'word-pop-glow') return 'word_pop_glow';
  if (style === 'dynamic-karaoke') return 'dynamic_karaoke';
  if (style === 'smooth-chunk-slide') return 'smooth_chunk_slide';
  if (style === 'kinetic-typewriter') return 'kinetic_typewriter';
  return 'auto';
};

const toParentWordsPerScreen = (
  words: WordsPerScreen
): ThemeSandboxProps['wordsPerScreen'] => {
  if (words === 'auto') return 'auto';
  const numeric = Number.parseInt(words, 10);
  return numeric === 2 || numeric === 3 || numeric === 4 || numeric === 5
    ? numeric
    : 'auto';
};

export const LiveThemeSandbox = (props: LiveThemeSandboxProps) => {
  return (
    <ThemeSandboxComposition
      bgColor={props.bgColor}
      accentColor={props.accentColor}
      visualStyle={props.visualStyle}
      backgroundPreset={props.backgroundPreset}
      captionAnimationStyle={toParentCaptionStyle(props.captionAnimationStyle)}
      wordsPerScreen={toParentWordsPerScreen(props.wordsPerScreen)}
      captionsEnabled={props.captionsEnabled}
      aspectRatio={props.aspectRatio}
      scriptLanguage={props.scriptLanguage}
      uiLanguage={props.uiLanguage}
      fps={props.fps}
      watermark={props.watermark}
      watermarkEnabled={props.watermarkEnabled}
      watermarkPosition={props.watermarkPosition}
    />
  );
};
