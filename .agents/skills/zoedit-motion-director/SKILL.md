---
name: zoedit-motion-director
description: Strict motion graphics, RTL Arabic layout, SVG geometry alignment, and visual branding rules for Zoedit Studio videos.
---

# Zoedit Studio Motion & Design Rules

1. **Character, Symbolic Emotion & Modesty Rules:**
   - **NEVER hand-draw crude stickmen or hand-coded geometric circles/rectangles** to represent real objects, religious symbols, electronics, or brand logos. Use `<SmartIcon query="..." brand={...} color="..." size={...} />` for ALL objects, symbols, icons, and company logos, and `<SilhouetteActor pose="..." color="..." size={...} />` for ALL human figures.
   - Keep the Stickman head smooth and clean by default (no detailed anatomical nose, mouth, or ears).
   - **Contextual Symbolic Expressions Only When Needed:** Express emotion descriptively through body posture (`pose` prop), surrounding visual metaphors, and **minimal symbolic cues only** when a scene specifically requires it (e.g., falling teardrop icons for sadness; sharp angled brow lines or small steam puffs for anger; upward celebratory pose with sparkles for joy). Never draw complex realistic faces.
   - **Featureless human action:** whenever a scene depicts a human action (praying, prostrating, sitting at a glowing screen, standing, walking), render `<SilhouetteActor pose="..." color="..." size={...} />` from `../components/SilhouetteActor`. It is a completely featureless silhouette (no eyes, mouth, nose, ears) and must never be given a face.
   - Never depict women (if a female silhouette is unavoidable, use only a modest, fully obscured back-view silhouette).
   - Do NOT force the Stickman or a silhouette into every scene; prioritize pure kinetic motion graphics (SVG icons, UI mockups, charts, cards) for 60-70% of scenes.

2. **Creative Visual Variety — Never Stamp the Same Layout:**
   - Never default every scene to the identical rigid grid (small kicker + top-left title + subtitle + centered card).
   - Direct each scene from its narration and pacing. Rotate deliberately between distinct composition architectures: full-bleed kinetic typography, split-screen comparisons, dynamic camera pans across a large canvas, minimal icon-driven beats, data-first charts, clean B-Roll visuals, timelines, or spatial 2.5D stacks.
   - Vary focal placement and hierarchy per scene (top, side, centered, full-bleed, corner-anchored). Two consecutive scenes must never share the same layout skeleton.
   - Prefer a custom layout chosen for the idea over a reusable boilerplate card. If a header block adds nothing, omit it instead of repeating it by habit.

3. **Caption Style, Brand Colors & Safe-Zone Elevation:**
   - Captions are composition-owned. When captions are enabled, honor the chosen `captionStyle`:
     - `word-by-word`: reveal each word with a spring/pop, building the line as it is spoken.
     - `karaoke`: show the full line and highlight the active word with the caption highlight color, synced to the scene's speech timing.
     - `static`: render one clean, readable subtitle block.
   - Use the exact caption colors supplied: pill background, base text, and active-word highlight. Never substitute brand defaults when custom caption colors are provided.
   - Respect the chosen `captionBottomOffset` (default `20%` from the bottom on `9:16`). Never render content under the caption strip, and keep the strip above TikTok / Reels / Shorts bottom UI overlays.
   - **Solid card & container contrast:** every card, icon badge, chip, callout, chart panel, legend, tooltip, and container MUST use a solid (or >= 0.88-opacity) fill from `props.surfaceColor` / `props.secondaryColor`. Never use `transparent`, near-transparent rgba(), or background-only gradients. Pair each surface with a subtle 1-2px border and a soft shadow so it stands out from `props.bgColor`.

4. **SVG Geometry & Motion Alignment:**
   - Align every directional object's rotation angle (`rotate(...)`) with its movement vector `(dx, dy)` (e.g., a rocket moving up-right must tilt clockwise ~35-45deg, never left).
   - Never use CSS transitions; animate strictly with Remotion `interpolate()` and `spring()`.
   - **Continuous strokes:** draw every chart line, curve, connector, route, and vector path as ONE continuous `<path>` (or documented `<polyline>`) with `fill="none"`. Animate with `pathLength={1}`, `strokeDasharray={1}`, `strokeDashoffset={1 - progress}` or `evolvePath()`. Never use fixed dash arrays such as `"6 6"`, pixel-length dashes, or split a series into fragments.
   - **Chart direction protection:** wrap each chart/map SVG and plot container in `direction: "ltr"` and never set `direction: "rtl"` on the SVG itself. NEVER mirror charts with `transform: "scaleX(-1)"`, `flexDirection: "row-reverse"`, or swapped x/width values when `props.isRtl` is true; only text blocks and navigation icons may mirror.
   - **Chart margins:** offset every Y-axis tick label from the axis line with `textAnchor="end"` and `x={axisX - 14}`, and reserve at least 56px of left padding so values such as `10x`, `20x`, `30x` are never struck through by the axis stroke.
   - **Card clearance:** keep all floating cards and 2.5D `SpatialCard` surfaces fully outside the plot rectangle, axis lines, gridlines, and data labels (minimum 24px gap). Never let a card sit on a chart line or tick.
   - **2.5D non-overlap & sizing:** never place two text-bearing `SpatialCard` layers at the same `(x, y)` at the same time. Keep only one focal text card centered per beat; separate simultaneous text cards on the vertical/grid axis with a generous (`>=32px`) gap, and stagger their enter/recede timing so previous copy is dimmed, blurred, and moved fully off the focal center before the next card arrives. Background depth planes must be subtle, non-text decorative parallax elements only. Size every card to its content (`auto`/`max-content` or a bounded `maxHeight`); never stretch a tall empty box down toward the caption zone.

5. **Arabic RTL & Safe Layout Grid:**
   - Apply `direction: "rtl"` and `lineHeight: 1.4` for Arabic text with `padding: "0 48px"`.
   - Use the shared multilingual font stack (`'Cairo', 'Noto Sans', 'Noto Sans Arabic', system-ui, sans-serif`); the composition loads Cairo plus the correct Noto Sans script font before rendering. Never fall back to a bare `sans-serif`.
   - Set `direction` and `textAlign` explicitly from `props.isRtl`, use lineHeight 1.35-1.6 for body/cards and 1.2-1.35 for headlines (never below 1.15), and allow wrapping so Arabic diacritics and tall scripts never clip or overlap.
   - Keep the top 22% for headlines and the middle 50% for visuals (`maxWidth: "85%"`). Reserve the bottom caption strip dynamically from `captionBottomOffset` (default 20%, never less than 18% on 9:16) so elements never overlap TikTok/Reels UI or clip off-screen.
   - **Respect Safe Zone (`respectSafeZone === true` on vertical `9:16`):** keep every primary typography block, card, chart, badge, button, and caption centered inside the platform safe zone — content `top >= 12%`, `bottom <= 78%`, `right <= 84%`, `left >= 6%`. Never place content under the right-hand TikTok / Reels / Shorts action icons or the bottom description bar. Backgrounds, gradients, and decorative layers may remain full-bleed edge-to-edge.
   - When `respectSafeZone === false`, use the standard full-canvas margins instead of the tighter platform insets.

6. **Multi-Beat Choreography & Smart Event-Synced SFX:**
   - Every scene MUST have at least three motion beats: a staggered spring entrance, continuous idle motion for the whole duration, and a visual state change.
   - Stagger every list item, card, badge, row, node, and icon with `spring()` delayed by exactly `index * 12` frames. Never reveal a group as one block.
   - Keep continuous subtle idle motion alive: floating sine drift, pulsing rings/halos, animated SVG path dashoffset/morphs, slow orbits, or breathing scale. Never freeze.
   - Use as many subtle `<SceneSfx>` cues per scene as the concrete visual actions warrant; there is **no fixed cue-count cap**. Inspect the full installed SFX library in `public/sfx` and choose the best-fit sound for text reveals/typing, button/badge/icon entrances, chart/data/number reveals, card/panel entrances, impacts, risers, whooshes, and mid-scene transitions. Friendly aliases `pop`, `tick`, `check`, `whoosh`, and `sparkle` remain available, but every catalog id is valid.
     `import { SceneSfx } from "../components/SceneSfx";`
     `<SceneSfx name="<any-installed-sfx-id>" frame={triggerFrame} volume={0.18} />`
   - Mix cues naturally and subordinate to narration; vary density with the action and avoid clutter. If an action genuinely needs no sound, omit it.
   - **STRICT NEGATIVE RULE: never use unsolicited loud, generic, or cheesy victory/success chimes, achievement bells, or celebration fanfares at the very end of the video unless the user prompt explicitly asks for one.** Otherwise use the full SFX library creatively wherever an action warrants audio. SceneSfx respects the global SFX toggle and renders nothing when SFX are off.

7. **Strict Non-Overlap Bounding Zones:**
   - Place the Stickman in a dedicated column/corner pinned with `left: 60` or `right: 60` inside a fixed-size absolute wrapper (for example 260x380).
   - The Stickman bounding box must NEVER overlap any text pill, badge, card, row, chart label, headline, subtitle, or caption. Shrink the content column (`maxWidth: "62%"` plus margin) to reserve the character column.
   - Keep pills, badges, and cards inside the middle 50% stage with `maxWidth: "85%"`; never touch the top 22% headline, the dynamic bottom caption zone (`captionBottomOffset`, default 20%), or the Stickman column.
   - Prefer separate layout regions (flex columns, absolute corners) over stacking text on top of illustrations. Decorative SVG may pass behind text only at low opacity and never over interactive content.

8. **Scene Transitions & Gentle Exit Ease:**
   - The composition connects scenes with `@remotion/transitions`: a 16-frame spring transition (slide/wipe/fade) plus its own transition whoosh. Never implement hard cuts, scene-to-scene transition code, or a whoosh at frame 0 inside a scene component.
   - The composition adds the 16 transition frames to every scene sequence so audio and captions stay frame-accurate. Always drive timing from `props.durationInFrames`; never shorten a scene or trim narration to compensate for the overlap.
   - End every scene with a gentle 10-frame exit ease over the final 10 frames of `props.durationInFrames`:
     `const exit = interpolate(frame, [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });`
     Apply `exit` to the content layer's opacity plus a tiny `translateY`/`scale` so elements never freeze abruptly.
   - Keep continuous idle motion alive until that exit ease begins; the final frames must still move.

9. **Installed Visual Libraries (dynamic scene generation, no rigid templates):**
   - `@iconify/react` + `simple-icons` power `<SmartIcon />`: it resolves ANY English keyword or brand name into a crisp vector icon or logo. It searches the Iconify API, fetches clean SVG markup, caches it in memory, blocks frames with `delayRender` for at most 4 seconds, and falls back to a styled monogram badge so headless rendering never stalls.
   - `SilhouetteActor` (`../components/SilhouetteActor`): featureless human silhouette with `standing`, `praying-qiyam`, `praying-sujood`, `sitting-screen`, and animated `walking` poses.
   - `lucide-react` for crisp UI, tech, business, and map icons.
   - `d3-geo` + `topojson-client` + `world-atlas/countries-110m.json` for accurate real-world geographic country borders, projections (`geoMercator` / `geoNaturalEarth1`), and animated coordinate routes.
   - `@remotion/paths` & `@remotion/shapes` for mathematical SVG path interpolation, chart geometry, and shape primitives (`Rect`, `Circle`, `Triangle`, `Star`, `Pie`) instead of hand-computed shape math.
   - `@remotion/transitions` provides transition primitives/timings; the composition owns scene-to-scene transitions, so do not rebuild a transition shell inside a scene.
   - `@remotion/google-fonts` for an additional specific font family when typography genuinely needs it; otherwise inherit the shared multilingual stack.
   - `d3-scale` for real chart scales and tick generation instead of guessed pixel positions.
   - `colord` for color mixing, tints, shades, and contrast-safe variants instead of manual hex math.
   - `roughjs` for hand-drawn / whiteboard-style diagrams only with the deterministic seed + `useMemo` pattern in rule 10, and `@remotion/noise` for organic subtle motion.
   - **Installed package inventory:** scene/runtime packages are `remotion`, `react`, `react-dom`, `@remotion/paths`, `@remotion/shapes`, `@remotion/noise`, `@remotion/transitions`, `@remotion/google-fonts`, `@iconify/react`, `simple-icons`, `lucide-react`, `d3-geo`, `d3-scale`, `topojson-client`, `world-atlas`, `roughjs`, and `colord`. Dashboard-only packages (`@remotion/player`, `motion`, `@google/genai`, `express`, `dotenv`, `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`) must never be imported into scene files. Tooling (`@remotion/cli`, `opencode-ai`, `typescript`, `eslint`, `prettier`, `@types/*`) is not a scene dependency.
   - **ALWAYS prefer an installed library over reinventing its capability** with raw manual SVG coordinates, hand-written geometry math, or basic CSS fallbacks. These libraries are available for bespoke, on-demand composition; never convert them into fixed scene templates.

10. **Strict No-Fallback Rule (use these exact patterns on the first pass):**
   - NEVER draw continents, country borders, map coastlines, or recognizable brand/UI icons manually with guessed SVG `<path>` coordinates.
   - If an installed library fits the job (world-atlas + d3-geo for maps, lucide-react for icons, SmartIcon for symbols/brands, SilhouetteActor for humans, @remotion/shapes for geometry, @remotion/paths for curves, d3-scale for charts, colord for color derivation), hand-drawing or rebuilding it manually is a failure. Use the installed library.
   - **Real-world maps** (`world-atlas` + `topojson-client` + `d3-geo`):
     `import worldData from "world-atlas/countries-110m.json";`
     `import { feature } from "topojson-client";`
     `import { geoMercator, geoPath } from "d3-geo";`
     `const countries = feature(worldData as any, (worldData as any).objects.countries) as any;`
     `const projection = geoMercator().fitExtent([[40, 40], [mapWidth - 40, mapHeight - 40]], targetRegionOrCountries);`
     `const pathGen = geoPath().projection(projection);`
     `<path d={pathGen(country) ?? ""} />`
     `projection([lon, lat])` converts real `[longitude, latitude]` city coordinates into exact `[x, y]` pixels: Tangier `[-5.8, 35.76]`, Cairo `[31.23, 30.04]`, Mecca `[39.82, 21.42]`.
   - **Symbols, concepts & brand logos** (`SmartIcon`): always import the reusable icon component instead of hand-drawing shapes:
     `import { SmartIcon } from "../components/SmartIcon";`
     `<SmartIcon query="mosque" size={64} color={accentColor} />`
     `<SmartIcon query="hourglass" size={48} color={props.accentColor} />`
     `<SmartIcon query="youtube" brand size={56} />`
     Pass ANY English keyword or brand name as `query` ("mosque", "facebook", "hourglass", "sword", "brain", "tiktok"). Set `brand` to prefer official company logos. Exact Iconify IDs such as `query="mdi:mosque"` or `query="logos:facebook"` also work. NEVER approximate a mosque, clock, shield, or brand mark with guessed circles/rectangles.
   - **Human action** (`SilhouetteActor`): whenever a scene depicts a person, import and pose the featureless silhouette instead of drawing a stickman:
     `import { SilhouetteActor } from "../components/SilhouetteActor";`
     `<SilhouetteActor pose="praying-qiyam" color={props.characterBody} size={340} />`
     Supported poses: `standing`, `praying-qiyam`, `praying-sujood`, `sitting-screen`, `walking`. `size` is the rendered height in pixels; the silhouette breathes and strides on its own with `useCurrentFrame()`.
   - **UI icons** (`lucide-react`): always import crisp icons such as `import { MapPin, Plane, Navigation, TrendingUp } from "lucide-react";` and render them (for example `<MapPin size={32} color={accentColor} />`) instead of hand-coding icon `<path>` elements.
   - **Curves & shapes** (`@remotion/paths` & `@remotion/shapes`): use `import { evolvePath } from "@remotion/paths";` to animate dashed/glowing routes smoothly: `const dash = evolvePath(progress, routePath);` then `<path d={routePath} strokeDasharray={dash.strokeDasharray} strokeDashoffset={dash.strokeDashoffset} />`.
   - **Hand-drawn diagrams & organic motion**: use `roughjs` for whiteboard/hand-drawn requests only with the fixed-seed/`useMemo` pattern in rule 10, and `@remotion/noise` for organic drift; these complement, never replace, the real map and icon libraries.

11. **Clean B-Roll Mode (`cleanBrollMode`) — explicit user toggle only:**
   - Never hide headers, titles, kickers, or structured typography merely because `voiceoverEnabled === false`. There is no blanket silent-mode rule that suppresses them.
   - Apply the Clean B-Roll layout ONLY when `cleanBrollMode === true`:
     - **Remove main headlines, titles, kickers, badges, text-only slides, and decorative copy.** Do not reserve a top 22% headline band.
     - **Preserve brief essential in-scene information:** short data labels, chart numbers, axis values, map/route names, legend keys, and diagram annotations needed to understand the visual. Keep them small, concise, and secondary.
     - Frame the primary visual full-bleed at `100%` width and height with a smooth camera pan/zoom instead of boxing it in a small card.
     - Keep preserved chart labels offset from strokes: Y-axis values use `textAnchor="end"` with `x={axisX - 14}` and at least 56px left padding.
     - Captions, when enabled, stay composition-owned as an optional overlay. Voiceover (TTS) and captions remain independently optional.
   - When `cleanBrollMode === false` (even if `voiceoverEnabled === false`), allow and render full typography, titles, kickers, and structured headers normally so silent text-driven videos remain possible.

12. **Deterministic `roughjs` (zero frame-by-frame jitter):**
   - NEVER regenerate random rough paths inside the render body or call `rough.svg()` / `rough.generator()` per frame. That causes visible frame-by-frame jitter and glitch.
   - ALWAYS pass a fixed deterministic seed and stable roughness, and memoize the generator/drawable once:
     `const roughGen = useMemo(() => rough.generator(), []);`
     `const drawable = useMemo(() => roughGen.path(d, { seed: 42, roughness: 1.4 }), []);`
   - Animate drawing progress strictly with SVG `strokeDasharray` / `strokeDashoffset` or `evolvePath()` from `@remotion/paths`; the hand-drawn geometry itself must stay identical across frames for silky-smooth 60fps output.

13. **Video Language & On-Screen Copy:**
   - **Language-neutral visual quality:** build the SAME visual hierarchy, structured cards, icon badges, chart density, layered parallax, and multi-beat motion for every language. Only the visible strings are localized; never simplify or flatten the design for Arabic, Hebrew, Hindi, or any other non-Latin script.
   - Localize EVERY visible string to the selected video language: scene titles, key-phrases, axis titles, tick labels, legends, cards, badges, callouts, buttons, and UI mockup text.
   - Never leave English placeholders such as `TIME`, `VALUE`, `TOTAL`, `GROWTH`, or `REVENUE` when a non-English language is selected (for Arabic use `الزمن` / `القيمة` / `الإجمالي` / `النمو` / `الإيرادات`).
   - This applies even when `voiceoverEnabled === false`; silent videos must keep all on-screen copy in the selected language.
