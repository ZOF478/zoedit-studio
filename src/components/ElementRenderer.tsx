import type { Layout } from "../layout";
import type { Theme } from "../theme";
import type { SceneElement } from "../types";
import type { WcagPalette } from "../utils/wcagPalette";
import { BulletList } from "./elements/BulletList";
import { BarChart, CircularGauge, LineChart } from "./elements/Charts";
import { ComparisonBox } from "./elements/ComparisonBox";
import { GENERATED_SCENES } from "../generated";
import { GeneratedSceneBoundary } from "./GeneratedSceneBoundary";
import { CustomVisual } from "./elements/CustomVisual";
import { EditorialQuote } from "./elements/EditorialQuote";
import { GenerativeScene } from "./elements/GenerativeScene";
import { GridNodes } from "./elements/GridNodes";
import { HeroTitle } from "./elements/HeroTitle";
import { HighlightCard } from "./elements/HighlightCard";
import { LayerStack } from "./elements/LayerStack";
import { ProgressBar } from "./elements/ProgressBar";
import { StatNumber } from "./elements/StatNumber";
import {
  CallToAction,
  NotificationCard,
  StepTimeline,
  WarningCard,
} from "./elements/StoryCards";

type ElementRendererProps = {
  element: SceneElement;
  theme: Theme;
  layout: Layout;
  delay: number;
  durationInFrames?: number;
  sceneIndex?: number;
  isRtl?: boolean;
  language?: string;
  sceneTitle?: string;
  sceneCaption?: string;
  showCharacter?: boolean;
  sfxAt?: number;
  sfxFrames?: number;
  wcag?: WcagPalette;
};

export const ElementRenderer = ({
  element,
  theme,
  layout,
  delay,
  durationInFrames = 120,
  sceneIndex = 0,
  isRtl = false,
  language = "ar",
  sceneTitle,
  sceneCaption,
  showCharacter = true,
  sfxAt,
  sfxFrames,
  wcag,
}: ElementRendererProps) => {
  switch (element.type) {
    case "hero_title":
      return (
        <HeroTitle el={element} theme={theme} layout={layout} delay={delay} />
      );
    case "stat_number":
      return (
        <StatNumber el={element} theme={theme} layout={layout} delay={delay} />
      );
    case "comparison_box":
      return (
        <ComparisonBox
          el={element}
          theme={theme}
          layout={layout}
          delay={delay}
          durationInFrames={durationInFrames}
          wcag={wcag}
        />
      );
    case "bar_chart":
      return (
        <BarChart
          el={element}
          theme={theme}
          layout={layout}
          delay={delay}
          sfxAt={sfxAt}
          sfxFrames={sfxFrames}
          durationInFrames={durationInFrames}
        />
      );
    case "line_chart":
      return (
        <LineChart
          el={element}
          theme={theme}
          layout={layout}
          delay={delay}
          sfxAt={sfxAt}
          sfxFrames={sfxFrames}
          durationInFrames={durationInFrames}
        />
      );
    case "circular_gauge":
      return (
        <CircularGauge
          el={element}
          theme={theme}
          layout={layout}
          delay={delay}
        />
      );
    case "step_timeline":
      return (
        <StepTimeline
          el={element}
          theme={theme}
          layout={layout}
          delay={delay}
          durationInFrames={durationInFrames}
          wcag={wcag}
        />
      );
    case "notification_card":
      return (
        <NotificationCard
          el={element}
          theme={theme}
          layout={layout}
          delay={delay}
        />
      );
    case "warning_card":
      return (
        <WarningCard el={element} theme={theme} layout={layout} delay={delay} />
      );
    case "editorial_quote":
      return (
        <EditorialQuote
          el={element}
          theme={theme}
          layout={layout}
          delay={delay}
        />
      );
    case "bullet_list":
      return (
        <BulletList el={element} theme={theme} layout={layout} delay={delay} />
      );
    case "cta":
      return (
        <CallToAction
          el={element}
          theme={theme}
          layout={layout}
          delay={delay}
        />
      );
    case "custom_visual":
      return (
        <CustomVisual
          el={element}
          theme={theme}
          layout={layout}
          delay={delay}
        />
      );
    case "layer_stack":
      return (
        <LayerStack el={element} theme={theme} layout={layout} delay={delay} />
      );
    case "grid_nodes":
      return (
        <GridNodes el={element} theme={theme} layout={layout} delay={delay} />
      );
    case "progress_bar":
      return (
        <ProgressBar el={element} theme={theme} layout={layout} delay={delay} />
      );
    case "highlight_card":
      return (
        <HighlightCard
          el={element}
          theme={theme}
          layout={layout}
          delay={delay}
        />
      );
    case "generative_scene":
      return (
        <GenerativeScene
          el={element}
          theme={theme}
          layout={layout}
          delay={delay}
          durationInFrames={durationInFrames}
          sceneIndex={sceneIndex}
        />
      );
    case "custom_tsx": {
      const GeneratedComponent = GENERATED_SCENES[element.component];
      if (!GeneratedComponent) {
        return (
          <GenerativeScene
            el={{
              type: "generative_scene",
              title: element.title,
              headline: element.text || element.title || "Custom scene",
              keywords:
                element.keywords && element.keywords.length > 0
                  ? element.keywords
                  : ["Idea", "Mechanism", "Action"],
              motif: "flow",
            }}
            theme={theme}
            layout={layout}
            delay={delay}
            durationInFrames={durationInFrames}
            sceneIndex={sceneIndex}
          />
        );
      }
      return (
        <GeneratedSceneBoundary
          fallback={
            <GenerativeScene
              el={{
                type: "generative_scene",
                title: element.title,
                headline: element.text || element.title || "Custom scene",
                keywords:
                  element.keywords && element.keywords.length > 0
                    ? element.keywords
                    : ["Idea", "Mechanism", "Action"],
                motif: "flow",
              }}
              theme={theme}
              layout={layout}
              delay={delay}
              durationInFrames={durationInFrames}
              sceneIndex={sceneIndex}
            />
          }
        >
          <GeneratedComponent
            accentColor={theme.colors.primary}
            bgColor={theme.colors.background}
            textColor={theme.colors.text}
            mutedColor={theme.colors.muted}
            characterBody={theme.character.body}
            characterFace={theme.character.face}
            characterAccent={theme.character.accent}
            characterShadow={theme.character.shadow}
            isRtl={isRtl}
            language={language}
            title={element.title ?? sceneTitle}
            text={element.text ?? sceneCaption}
            keywords={element.keywords}
            data={element.data}
            durationInFrames={durationInFrames}
            showCharacter={showCharacter}
          />
        </GeneratedSceneBoundary>
      );
    }
    default:
      return null;
  }
};
