---
name: zof-motion-director
description: Strict motion graphics, RTL Arabic layout, SVG geometry alignment, and visual branding rules for Zof Studio videos.
---

# Zof Studio Motion & Design Rules

1. **Character, Symbolic Emotion & Modesty Rules:**
   - Keep the Stickman head smooth and clean by default (no detailed anatomical nose, mouth, or ears).
   - **Contextual Symbolic Expressions Only When Needed:** Express emotion descriptively through body posture (`pose` prop), surrounding visual metaphors, and **minimal symbolic cues only** when a scene specifically requires it (e.g., falling teardrop icons for sadness; sharp angled brow lines or small steam puffs for anger; upward celebratory pose with sparkles for joy). Never draw complex realistic faces.
   - Never depict women (if a female silhouette is unavoidable, use only a modest, fully obscured back-view silhouette).
   - Do NOT force the Stickman into every scene; prioritize pure kinetic motion graphics (SVG icons, UI mockups, charts, cards) for 60-70% of scenes.

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

4. **SVG Geometry & Motion Alignment:**
   - Align every directional object's rotation angle (`rotate(...)`) with its movement vector `(dx, dy)` (e.g., a rocket moving up-right must tilt clockwise ~35-45deg, never left).
   - Never use CSS transitions; animate strictly with Remotion `interpolate()` and `spring()`.
   - **Chart margins:** offset every Y-axis tick label from the axis line with `textAnchor="end"` and `x={axisX - 14}`, and reserve at least 56px of left padding so values such as `10x`, `20x`, `30x` are never struck through by the axis stroke.
   - **Card clearance:** keep all floating cards and 2.5D `SpatialCard` surfaces fully outside the plot rectangle, axis lines, gridlines, and data labels (minimum 24px gap). Never let a card sit on a chart line or tick.

5. **Arabic RTL & Safe Layout Grid:**
   - Apply `direction: "rtl"` and `lineHeight: 1.4` for Arabic text with `padding: "0 48px"`.
   - Keep the top 22% for headlines and the middle 50% for visuals (`maxWidth: "85%"`). Reserve the bottom caption strip dynamically from `captionBottomOffset` (default 20%, never less than 18% on 9:16) so elements never overlap TikTok/Reels UI or clip off-screen.

6. **Multi-Beat Choreography & Subtle Micro-SFX:**
   - Every scene MUST have at least three motion beats: a staggered spring entrance, continuous idle motion for the whole duration, and a visual state change.
   - Stagger every list item, card, badge, row, node, and icon with `spring()` delayed by exactly `index * 12` frames. Never reveal a group as one block.
   - Keep continuous subtle idle motion alive: floating sine drift, pulsing rings/halos, animated SVG path dashoffset/morphs, slow orbits, or breathing scale. Never freeze.
   - SFX are optional and strictly limited: use **at most ONE** subtle `<SceneSfx>` per scene, only on the single most important key visual transition/state change. Preferred clean CC0 names are `pop` (soft pop), `check` (subtle click), `whoosh` (soft whoosh), and `sparkle` (soft pop):
     `import { SceneSfx } from "../components/SceneSfx";`
     `<SceneSfx name="pop" | "check" | "whoosh" | "sparkle" frame={triggerFrame} volume={0.18} />`
   - Keep SFX volume between `0.15` and `0.22`, never above `0.25`, and leave at least 0.6s of breathing room after the sound.
   - **Never use bells, chimes, dings, success jingles, alarms, or notification sounds.** `ding-success.wav` and `notification-chime.wav` are strictly forbidden. Never place any SFX at frame 0, at a scene ending, at a transition boundary, or inside the final 20% of `props.durationInFrames`; scenes must end in silence. The composition owns the transition whoosh. If unsure, omit the sound entirely. SceneSfx respects the global SFX toggle and renders nothing when SFX are off.

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
   - `lucide-react` for crisp UI, tech, business, and map icons.
   - `d3-geo` + `topojson-client` + `world-atlas/countries-110m.json` for accurate real-world geographic country borders, projections (`geoMercator` / `geoNaturalEarth1`), and animated coordinate routes.
   - `@remotion/paths` & `@remotion/shapes` for mathematical SVG path interpolation, charts, and geometric shapes.
   - `roughjs` for hand-drawn / whiteboard-style diagrams only with the deterministic seed + `useMemo` pattern in rule 10, and `@remotion/noise` for organic subtle motion.
   - These libraries are available for bespoke, on-demand composition; never convert them into fixed scene templates.

10. **Strict No-Fallback Rule (use these exact patterns on the first pass):**
   - NEVER draw continents, country borders, map coastlines, or recognizable brand/UI icons manually with guessed SVG `<path>` coordinates.
   - If a whitelisted real library fits the job (world-atlas + d3-geo for maps, lucide-react for icons), hand-drawing an approximation instead is a failure. Use the patterns below.
   - **Real-world maps** (`world-atlas` + `topojson-client` + `d3-geo`):
     `import worldData from "world-atlas/countries-110m.json";`
     `import { feature } from "topojson-client";`
     `import { geoMercator, geoPath } from "d3-geo";`
     `const countries = feature(worldData as any, (worldData as any).objects.countries) as any;`
     `const projection = geoMercator().fitExtent([[40, 40], [mapWidth - 40, mapHeight - 40]], targetRegionOrCountries);`
     `const pathGen = geoPath().projection(projection);`
     `<path d={pathGen(country) ?? ""} />`
     `projection([lon, lat])` converts real `[longitude, latitude]` city coordinates into exact `[x, y]` pixels: Tangier `[-5.8, 35.76]`, Cairo `[31.23, 30.04]`, Mecca `[39.82, 21.42]`.
   - **Icons** (`lucide-react`): always import crisp icons such as `import { MapPin, Plane, Navigation, ShieldCheck, TrendingUp } from "lucide-react";` and render them (for example `<MapPin size={32} color={accentColor} />`) instead of hand-coding icon `<path>` elements.
   - **Curves & shapes** (`@remotion/paths` & `@remotion/shapes`): use `import { evolvePath } from "@remotion/paths";` to animate dashed/glowing routes smoothly: `const dash = evolvePath(progress, routePath);` then `<path d={routePath} strokeDasharray={dash.strokeDasharray} strokeDashoffset={dash.strokeDashoffset} />`.
   - **Hand-drawn diagrams & organic motion**: use `roughjs` for whiteboard/hand-drawn requests only with the fixed-seed/`useMemo` pattern in rule 10, and `@remotion/noise` for organic drift; these complement, never replace, the real map and icon libraries.

11. **Clean B-Roll Mode (`cleanBrollMode`) — explicit user toggle only:**
   - Never hide headers, titles, kickers, or structured typography merely because `voiceoverEnabled === false`. There is no blanket silent-mode rule that suppresses them.
   - Apply the Clean B-Roll layout ONLY when `cleanBrollMode === true`:
     - **Zero top header:** render NO top `<header>`, kicker, scene title, title badge, top banner, or prompt-echo descriptive text. Do not reserve a top 22% headline band.
     - Render only diegetic labels inside the graphic: city names, data values, axis labels, map labels, and explicitly requested callout cards.
     - Frame the primary visual full-bleed at `100%` width and height with a smooth camera pan/zoom instead of boxing it in a small card.
     - Offset Y-axis ticks with `textAnchor="end"` and `x={axisX - 14}` (≥56px left padding) so axis strokes never cross numbers such as `10x` / `20x` / `30x`; keep floating cards fully outside chart lines with a ≥24px gap.
   - When `cleanBrollMode === false` (even if `voiceoverEnabled === false`), allow and render full typography, titles, kickers, and structured headers normally so silent text-driven videos remain possible.

12. **Deterministic `roughjs` (zero frame-by-frame jitter):**
   - NEVER regenerate random rough paths inside the render body or call `rough.svg()` / `rough.generator()` per frame. That causes visible frame-by-frame jitter and glitch.
   - ALWAYS pass a fixed deterministic seed and stable roughness, and memoize the generator/drawable once:
     `const roughGen = useMemo(() => rough.generator(), []);`
     `const drawable = useMemo(() => roughGen.path(d, { seed: 42, roughness: 1.4 }), []);`
   - Animate drawing progress strictly with SVG `strokeDasharray` / `strokeDashoffset` or `evolvePath()` from `@remotion/paths`; the hand-drawn geometry itself must stay identical across frames for silky-smooth 60fps output.

13. **Video Language & On-Screen Copy:**
   - Localize EVERY visible string to the selected video language: scene titles, key-phrases, axis titles, tick labels, legends, cards, badges, callouts, buttons, and UI mockup text.
   - Never leave English placeholders such as `TIME`, `VALUE`, `TOTAL`, `GROWTH`, or `REVENUE` when a non-English language is selected (for Arabic use `الزمن` / `القيمة` / `الإجمالي` / `النمو` / `الإيرادات`).
   - This applies even when `voiceoverEnabled === false`; silent videos must keep all on-screen copy in the selected language.
