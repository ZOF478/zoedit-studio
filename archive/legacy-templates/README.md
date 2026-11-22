# Legacy Templates & Rigid Presets (Archived)

**Archive path:** `~/zof-studio/archive/legacy-templates/`

This folder preserves the original rigid, pre-built scene/card templates, preset
background/style libraries, and manual scene-builder components. Nothing was
deleted — every legacy file is kept here for reference or future reuse.

Zof Studio no longer uses these templates in its export pipeline. The live
studio is a single-prompt, direct-export pipeline:

1. Audio & timing from the master prompt.
2. Real `opencode run` writes bespoke Remotion scenes into `src/generated/`
   (`Scene1.tsx`, `Scene2.tsx`, … and `src/generated/index.ts`).
3. Remotion renders the final MP4 into `out/`.

## What is archived

### `src/components/elements/`
Rigid declarative scene/card templates and visual widgets:

- `HighlightCard.tsx`
- `GridNodes.tsx`
- `BulletList.tsx`
- `ComparisonBox.tsx`
- `StoryCards.tsx` (notification, warning, step timeline, CTA)
- `LayerStack.tsx`
- `HeroTitle.tsx`
- `StatNumber.tsx`
- `Charts.tsx` (bar/line/circular gauge)
- `EditorialQuote.tsx`
- `ProgressBar.tsx`
- `GenerativeScene.tsx`
- `CustomVisual.tsx`

### `src/components/`
Legacy scene-builder and preset visual libraries:

- `Scene.tsx` — manual scene layout builder
- `ElementRenderer.tsx` — template dispatcher
- `Background.tsx` — preset background library
- `AmbientEnvironment.tsx` — ambient preset environments
- `AmbientMotion.tsx` — preset motion overlays
- `CharacterStage.tsx` — multi-character preset stage
- `AnimatedCaption.tsx` — caption preset renderer
- `Icon.tsx` — preset icon library

### `src/`
- `theme.ts` — fixed style/theme presets
- `layout.ts` — fixed layout presets
- `ThemeSandboxComposition.tsx` — preset theme sandbox

### `dashboard/src/components/`
Manual dashboard scene controls and preset pickers:

- `SceneEditorList.tsx` — manual scene list/editor
- `ScenePreviewStage.tsx` — manual scene stage preview
- `StickmanFigure.tsx` — dashboard stickman preview widget
- `LiveThemeSandbox.tsx` — preset theme/background sandbox
- `ConfigSidebar.tsx` — template/background/scene settings sidebar
- `QuickStyleDock.tsx` — preset style and background dock
- `PrimaryCommandBar.tsx` — legacy "Generate Scenes" command bar

## Active replacements

- Free-form scenes are generated on demand under `src/generated/`.
- `GeneratedSceneBoundary` keeps previews and renders alive if a generated
  scene throws.
- The dashboard only exposes the master prompt, core export settings, usage
  statistics, live preview, and export history.
