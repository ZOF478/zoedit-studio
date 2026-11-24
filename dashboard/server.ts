import { execFile, spawn, type ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import type { Server as HttpServer } from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { GoogleGenAI } from '@google/genai';
import { isNightMoodText, resolveWcagPalette } from '../src/utils/wcagPalette';
import {
  buildStaggeredSfxCues,
  normalizeSfxCues,
} from '../src/utils/sfxCues';
import {
  DEFAULT_VIDEO_LANGUAGE,
  getVideoLanguage,
  normalizeVideoLanguage,
  videoLanguageName,
} from './src/types/languages';

const DASHBOARD_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(DASHBOARD_DIR, '..');
const LOCAL_BIN_DIR = path.join(PROJECT_ROOT, 'node_modules', '.bin');

process.env.PATH = [LOCAL_BIN_DIR, process.env.PATH].filter(Boolean).join(path.delimiter);
const DATA_FILE = path.join(PROJECT_ROOT, 'src', 'data.json');
const AUDIO_DIR = path.join(PROJECT_ROOT, 'public', 'audio');
const SFX_DIR = path.join(PROJECT_ROOT, 'public', 'sfx');
const OUT_DIR = path.join(PROJECT_ROOT, 'out');
const REMOTION_ENTRY = path.join(PROJECT_ROOT, 'src', 'index.ts');
const GENERATED_DIR = path.join(PROJECT_ROOT, 'src', 'generated');
const GENERATED_REGISTRY_FILE = path.join(GENERATED_DIR, 'index.ts');
const GENERATED_FILE_PATTERN = /^(?:CustomScene_[A-Za-z0-9_]+|Scene\d+)$/;
const ZOF_HOME_DIR = path.join(os.homedir(), '.zof-studio');
const SETTINGS_FILE = path.join(ZOF_HOME_DIR, 'settings.json');
const CURRENT_PROJECT_FILE = path.join(ZOF_HOME_DIR, 'current-project.json');
const STUDIO_LOG_FILE = path.join(ZOF_HOME_DIR, 'remotion-studio.log');
const USAGE_FILE = path.join(ZOF_HOME_DIR, 'usage.json');
const SCENE_CACHE_DIR = path.join(OUT_DIR, 'scene-cache');
const SCENE_CACHE_INDEX_FILE = path.join(SCENE_CACHE_DIR, 'index.json');
const TRANSITION_DURATION_IN_FRAMES = 16;

dotenv.config({ path: path.join(PROJECT_ROOT, '.env'), quiet: true });
dotenv.config({ path: path.join(DASHBOARD_DIR, '.env'), quiet: true });

type AiProviderId = 'opencode-free' | 'deepseek' | 'openrouter' | 'kieai' | 'custom';

interface SessionKeys {
  openrouterKey?: string;
  deepseekKey?: string;
  kieaiKey?: string;
  elevenlabsKey?: string;
  customProviderKey?: string;
  updatedAt: number;
}

interface StudioSettings {
  openrouterKey: string;
  deepseekKey: string;
  kieaiKey: string;
  elevenlabsKey: string;
  customProviderName: string;
  customProviderKey: string;
  customProviderBaseUrl: string;
  aiProvider: AiProviderId;
  aiModel: string;
  voiceId: string;
  voiceModelId: string;
  voiceStability: number;
  voiceSimilarityBoost: number;
  voiceStyle: number;
  voiceSpeakerBoost: boolean;
  voiceSpeed: number;
  visualStyle: string;
  aspectRatio: string;
  fps: number;
  scriptLanguage: string;
  scriptDepth: string;
  creativeCodeMode: string;
  scriptPacing: string;
  captionAnimationStyle: string;
  captionColors: RenderCaptionColors;
  captionBottomOffset: number;
  wordsPerScreen: string;
  captionsEnabled: boolean;
  respectSafeZone: boolean;
  brandKit: RenderBrandKit;
  sfxEnabled: boolean;
  sfxVolume: number;
  sfxMode: 'auto' | 'manual';
  backgroundPreset: string;
  updatedAt: number;
}

interface AiProviderDescriptor {
  id: AiProviderId;
  label: string;
  description: string;
  requiresKey: boolean;
  configured?: boolean;
}

interface AiModelDescriptor {
  id: string;
  label: string;
  provider: AiProviderId;
  providerLabel: string;
  note: string;
  isFree: boolean;
  upstream?: 'openrouter' | 'deepseek' | 'kieai' | 'custom';
}

interface OpenCodeModelEntry {
  id: string;
  label: string;
  providerId: string;
  providerLabel: string;
}

interface OpenCodeInspection {
  configPaths: string[];
  authPaths: string[];
  configFound: boolean;
  authFound: boolean;
  providers: string[];
  models: OpenCodeModelEntry[];
  keys: Record<string, string>;
}

interface ResolvedApiKeys {
  openrouterKey: string;
  deepseekKey: string;
  kieaiKey: string;
  elevenlabsKey: string;
  customProviderName: string;
  customProviderKey: string;
  customProviderBaseUrl: string;
}

interface UsageCounters {
  aiInputTokens: number;
  aiOutputTokens: number;
  aiCalls: number;
  aiUsd: number;
  aiModel: string;
  ttsCharacters: number;
  ttsCalls: number;
  ttsUsd: number;
  visualCalls: number;
  visualUsd: number;
  renderedFrames: number;
  renderJobs: number;
  renderUsd: number;
}

interface UsageStore {
  version: 1;
  projectId: string;
  project: UsageCounters;
  allTime: UsageCounters;
  updatedAt: number;
}

type UsageDelta = Partial<Omit<UsageCounters, 'aiModel'>> & { aiModel?: string };

const ELEVENLABS_USD_PER_CHAR = 0.0003;

type SceneLayout = 'split' | 'stacked' | 'overlay' | 'centered';

type CameraMove = 'slow-zoom-in' | 'slow-zoom-out' | 'pan-left' | 'pan-right' | 'push-in' | 'static';

interface RenderScenePayload {
  id: string;
  title: string;
  narration: string;
  pose: string;
  visualType: string;
  visualLabel: string;
  visualValue: string;
  visualPrompt?: string;
  visualSvg?: string;
  audioDataUrl?: string;
  audioSrc?: string;
  audioDuration?: number;
  sfxId?: string;
  sfxPrompt?: string;
  sfxAt?: number;
  sfxCues?: Array<{
    frameOffset: number;
    sound: 'pop' | 'tick' | 'whoosh' | 'rise' | 'impact' | 'chime';
    volume?: number;
  }>;
  layout?: SceneLayout;
  camera?: CameraMove;
  background?: string;
  backgroundPreset?: string;
  visualKeywords?: string[];
  motif?: string;
  showCharacter?: boolean;
  generatedComponent?: string;
  customCodeBrief?: string;
  characters?: Array<{
    pose?: string;
    side?: 'left' | 'right';
    accessory?: 'none' | 'tie' | 'badge';
    label?: string;
    scale?: number;
    enabled?: boolean;
  }>;
  characterLayout?: 'side-by-side' | 'top-bottom';
  ambientScene?: string;
  durationSec: number;
  durationInFrames?: number;
}

type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface RenderBrandKit {
  accentColor: string;
  bgColor: string;
  textColor: string;
  primaryColor: string;
  secondaryColor: string;
  watermark: string;
  watermarkEnabled: boolean;
  watermarkPosition: WatermarkPosition;
}

type CaptionColorSource =
  | 'background'
  | 'text'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'custom';

interface RenderCaptionColors {
  background: string;
  text: string;
  highlight: string;
  backgroundSource: CaptionColorSource;
  textSource: CaptionColorSource;
  highlightSource: CaptionColorSource;
}

interface ProjectStatePayload {
  topic: string;
  scenes: RenderScenePayload[];
  aiProvider: AiProviderId;
  aiModel: string;
  voiceId: string;
  voiceModelId: string;
  voiceStability: number;
  voiceSimilarityBoost: number;
  voiceStyle: number;
  voiceSpeakerBoost: boolean;
  voiceSpeed: number;
  voiceoverEnabled: boolean;
  cleanBrollMode: boolean;
  visualStyle: string;
  aspectRatio: string;
  fps: number;
  scriptLanguage: string;
  scriptDepth: string;
  creativeCodeMode: string;
  scriptPacing: string;
  captionAnimationStyle: string;
  captionColors: RenderCaptionColors;
  captionBottomOffset: number;
  wordsPerScreen: string;
  captionsEnabled: boolean;
  respectSafeZone: boolean;
  brandKit: RenderBrandKit;
  sfxEnabled: boolean;
  sfxVolume: number;
  sfxMode: 'auto' | 'manual';
  backgroundPreset: string;
  selectedSceneId?: string;
  updatedAt: number;
}

interface RenderJob {
  id: string;
  createdAt: number;
  scenes: RenderScenePayload[];
  visualStyle: string;
  aspectRatio: string;
  fps: number;
  voiceoverEnabled: boolean;
  cleanBrollMode: boolean;
  voiceId: string;
  modelId: string;
  voiceStability: number;
  voiceSimilarityBoost: number;
  voiceStyle: number;
  voiceSpeakerBoost: boolean;
  voiceSpeed: number;
  sfxEnabled: boolean;
  sfxVolume: number;
  sfxMode: 'auto' | 'manual';
  backgroundPreset: string;
  brandKit: RenderBrandKit;
  scriptLanguage: string;
  scriptDepth: string;
  creativeCodeMode: string;
  scriptPacing: string;
  captionAnimationStyle: string;
  captionColors: RenderCaptionColors;
  captionBottomOffset: number;
  wordsPerScreen: string;
  captionsEnabled: boolean;
  respectSafeZone: boolean;
  enable25D: boolean;
  elevenlabsKey: string;
  masterPrompt?: string;
  tweakInstruction?: string;
  targetDuration?: ExportTargetDuration;
  audioPrepared?: boolean;
  usage?: { ttsCharacters: number; ttsCalls: number; ttsUsd: number };
  status: 'queued' | 'rendering' | 'completed' | 'error' | 'cancelled';
  outputFile?: string;
  outputPath?: string;
  outputSize?: number;
  error?: string;
  videoData?: ParentVideoData;
}

interface SceneAudioCacheEntry {
  hash: string;
  audioSrc: string;
  audioDuration?: number;
  updatedAt: number;
}

interface SceneSegmentCacheEntry {
  hash: string;
  file: string;
  startFrame: number;
  endFrame: number;
  durationSec: number;
  updatedAt: number;
}

interface SceneArtifactCacheStore {
  version: 1;
  audio: Record<string, SceneAudioCacheEntry>;
  segments: Record<string, SceneSegmentCacheEntry>;
}

type ParentScene = {
  id: string;
  kicker?: string;
  title: string;
  subtitle?: string;
  caption?: string;
  duration: number;
  durationInFrames?: number;
  audioSrc?: string;
  audioDuration?: number;
  sfxSrc?: string;
  sfxAt?: number;
  sfxCues?: Array<{
    frameOffset: number;
    sound: 'pop' | 'tick' | 'whoosh' | 'rise' | 'impact' | 'chime';
    volume?: number;
  }>;
  layout?: SceneLayout;
  camera?: CameraMove;
  background?: string;
  backgroundPreset?: string;
  character?: {
    pose: string;
    side: 'left' | 'right';
    accessory: string;
    enabled?: boolean;
  };
  characters?: Array<{
    pose: string;
    side: 'left' | 'right';
    accessory: string;
    label?: string;
    scale?: number;
    enabled?: boolean;
  }>;
  characterLayout?: 'side-by-side' | 'top-bottom';
  ambientScene?: string;
  generatedComponent?: string;
  elements: Array<Record<string, unknown>>;
};

type ParentVideoData = {
  meta: { title: string; topic: string; description: string };
  width: number;
  height: number;
  fps: number;
  durationInFrames?: number;
  style: string;
  script_language: string;
  language?: string;
  script_depth?: string;
  creative_code_mode?: string;
  script_pacing?: string;
  respect_safe_zone?: boolean;
  caption?: {
    animation_style: string;
    words_per_screen: number | 'auto';
    lead_in: number;
    colors?: {
      background: string;
      text: string;
      highlight: string;
    };
    bottom_offset?: number;
    enabled?: boolean;
  };
  brand_kit: Record<string, string | number | boolean>;
  sfx?: { enabled: boolean; volume: number };
  scenes: ParentScene[];
};

interface ElevenLabsModelItem {
  model_id: string;
  name: string;
  description: string;
  latencyBadge: string;
  qualityBadge: string;
  languages?: string[];
}

interface ElevenLabsVoiceItem {
  voice_id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  language: string;
  languages: string[];
  accent: string;
  tone: string;
  category: string;
  preview_url: string | null;
  description: string;
  source?: 'personal' | 'library';
}

const PORT = Number(process.env.PORT) || 4789;
const HOST = process.env.HOST || '127.0.0.1';
const REMOTION_STUDIO_RENDER_PORT = 9578;
const REMOTION_STUDIO_UI_PORT = Number(process.env.REMOTION_STUDIO_PORT) || 3333;
const OPENCODE_RUN_TIMEOUT_MS = 600000;
const RENDER_STALL_TIMEOUT_MS = 120_000;
const RENDER_STALL_CHECK_INTERVAL_MS = 5_000;
const STRICT_EFFICIENCY_RULE =
  'STRICT EFFICIENCY & NO-LOOP RULE: Write each scene file cleanly in ONE single pass (keep each scene concise, under ~220 lines of clean TypeScript). After writing all scene files and `index.ts`, run at most ONE `npx tsc --noEmit` check. Fix actual TypeScript compiler errors ONLY if any exist, and exit immediately. NEVER run repeated cosmetic micro-edits on font sizes, padding, colors, or coordinates after writing a file.';
const CRISP_VECTOR_MAP_RULE =
  '- When the prompt requests a map or geographical route, use real geographic data, never hand-guessed borders: import worldData from "world-atlas/countries-110m.json", convert with feature() from "topojson-client", and project with geoMercator()/geoNaturalEarth1() + geoPath() from "d3-geo". Add a subtle coordinate grid, a glowing animated route curve (evolvePath from "@remotion/paths"), and crisp lucide-react pins sized to the target aspect ratio (16:9 or 9:16).';
const ZOF_LIBRARY_CAPABILITIES = [
  '## INSTALLED VISUAL LIBRARIES (available for dynamic scene generation)',
  '- `@iconify/react` + `simple-icons` via `<SmartIcon />` from `../components/SmartIcon`: resolves ANY English keyword or brand name into a crisp vector icon or logo. It searches the Iconify API, fetches clean SVG markup, caches it in memory, blocks frames with `delayRender` for at most 4 seconds, and falls back to a styled monogram badge so headless rendering never stalls or shows a broken image.',
  '- `SilhouetteActor` from `../components/SilhouetteActor`: a completely featureless human silhouette (no eyes, mouth, nose, or ears) with `standing`, `praying-qiyam`, `praying-sujood`, `sitting-screen`, and self-animating `walking` poses.',
  '- `lucide-react`: crisp UI, tech, business, and map icons (for example `import { MapPin, Plane, Navigation, ShieldCheck, TrendingUp } from "lucide-react";`). Never hand-code icon `<path>` elements when a lucide icon exists.',
  '- `d3-geo` + `topojson-client` + `world-atlas/countries-110m.json`: accurate real-world geographic country borders, projections (`geoMercator` / `geoNaturalEarth1`), and animated coordinate routes.',
  '- `@remotion/paths` & `@remotion/shapes`: mathematical SVG path interpolation, charts, and geometric shapes.',
  '- `roughjs`: hand-drawn / whiteboard-style diagrams ONLY when the prompt explicitly asks for that look, and ONLY with the deterministic rendering pattern below.',
  '- `@remotion/noise`: organic subtle motion and natural drift.',
  '',
  '## STRICT NO-FALLBACK RULE (apply on the first pass)',
  '- NEVER hand-draw crude geometric shapes or stickmen from scratch to represent real objects, religious symbols, clocks, devices, or brands. No guessed circles, rectangles, or `<path>` approximations for a mosque, clock, shield, logo, or human.',
  '- NEVER draw continents, country borders, map coastlines, or recognizable brand/UI icons manually with guessed SVG `<path>` coordinates.',
  '- If a real library or component is whitelisted for the job (world-atlas + d3-geo for maps, lucide-react for UI icons, SmartIcon for symbols/brands, SilhouetteActor for human action), hand-drawing an approximation instead is a failure. Use the exact patterns below.',
  '',
  '### Symbols, concepts & brand logos (SmartIcon)',
  'import { SmartIcon } from "../components/SmartIcon";',
  '<SmartIcon query="mosque" size={64} color={props.accentColor} />',
  '<SmartIcon query="hourglass" size={48} color={props.accentColor} />',
  '<SmartIcon query="shield check" size={48} color={props.accentColor} />',
  '<SmartIcon query="youtube" brand size={56} color={props.textColor} />',
  '<SmartIcon query="tiktok" brand size={56} />',
  'Pass ANY English keyword or brand name as `query` (for example "mosque", "facebook", "hourglass", "sword", "brain", "tiktok"). SmartIcon searches Iconify and resolves the icon automatically. Set `brand` to prefer official logos. You may also pass an exact Iconify ID such as `query="mdi:mosque"` or `query="logos:facebook"`. SmartIcon accepts `query`, `size`, `color`, `brand`, and optional `style`/`className`/`title`. NEVER hand-draw the symbol or logo yourself.',
  '',
  '### Human action (SilhouetteActor)',
  'import { SilhouetteActor } from "../components/SilhouetteActor";',
  '<SilhouetteActor pose="praying-qiyam" color={props.characterBody} size={340} />',
  'Poses: "standing" | "praying-qiyam" | "praying-sujood" | "sitting-screen" | "walking". Size is the rendered height in pixels; the silhouette breathes and strides on its own via useCurrentFrame(). The silhouette is strictly featureless, so never add eyes, mouth, nose, or ears.',
  '',
  '### Real-world maps (d3-geo + topojson-client + world-atlas)',
  'import worldData from "world-atlas/countries-110m.json";',
  'import { feature } from "topojson-client";',
  'import { geoMercator, geoPath } from "d3-geo";',
  'const countries = feature(worldData as any, (worldData as any).objects.countries) as any;',
  'const projection = geoMercator().fitExtent([[40, 40], [mapWidth - 40, mapHeight - 40]], targetRegionOrCountries);',
  'const pathGen = geoPath().projection(projection);',
  '<path d={pathGen(country) ?? ""} />',
  'projection([lon, lat]) converts real [longitude, latitude] coordinates into exact [x, y] pixels: Tangier [-5.8, 35.76], Cairo [31.23, 30.04], Mecca [39.82, 21.42].',
  '',
  '### Icons (lucide-react)',
  'import { MapPin, Plane, Navigation, ShieldCheck, TrendingUp } from "lucide-react";',
  '<MapPin size={32} color={accentColor} />',
  '',
  '### Curves & shapes (@remotion/paths & @remotion/shapes)',
  'import { evolvePath } from "@remotion/paths";',
  'const dash = evolvePath(progress, routePath);',
  '<path d={routePath} strokeDasharray={dash.strokeDasharray} strokeDashoffset={dash.strokeDashoffset} />',
  '',
  '### Hand-drawn diagrams (roughjs) — MANDATORY deterministic rendering',
  'Use roughjs for whiteboard/hand-drawn requests and @remotion/noise for organic drift; these complement, never replace, the real map and icon libraries.',
  'NEVER call rough.svg(), rough.draw(), or rough.generator() paths inside the per-frame render body. Regenerating random rough geometry every frame causes severe frame-by-frame jitter.',
  'ALWAYS pass a fixed deterministic seed and stable roughness, and compute the drawable ONCE with useMemo:',
  'const roughGen = useMemo(() => rough.generator(), []);',
  'const drawable = useMemo(() => roughGen.path(d, { seed: 42, roughness: 1.4 }), []);',
  'Render the memoized drawable paths and animate drawing progress strictly with SVG strokeDasharray / strokeDashoffset or evolvePath() from @remotion/paths so hand-drawn animations stay silky-smooth at 60fps with zero jitter.',
].join('\n');
const IS_PROD = process.env.NODE_ENV === 'production';

const sessionKeyStore = new Map<string, SessionKeys>();
const renderJobs = new Map<string, RenderJob>();

const ALLOWED_LOCAL_ORIGINS = new Set([
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  `http://${HOST}:${PORT}`,
  `http://localhost:${REMOTION_STUDIO_UI_PORT}`,
  `http://127.0.0.1:${REMOTION_STUDIO_UI_PORT}`,
]);

const ALLOWED_HOSTS = new Set([
  `localhost:${PORT}`,
  `127.0.0.1:${PORT}`,
  `[::1]:${PORT}`,
]);

const ALLOWED_STATE_ORIGINS = new Set([
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  `http://[::1]:${PORT}`,
]);

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const OPENROUTER_MODEL_MAP: Record<string, string> = {
  'deepseek/deepseek-v4.1-flash': 'deepseek/deepseek-v4.1-flash:free',
  'z-ai/glm-5.3-flash': 'z-ai/glm-5.3-flash:free',
  'anthropic/claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
  'google/gemini-2.5-flash': 'google/gemini-2.5-flash',
};

const AI_PROVIDERS: AiProviderDescriptor[] = [
  {
    id: 'opencode-free',
    label: 'OpenCode Free Models',
    description: 'Free OpenCode-compatible models routed through available OpenRouter/OpenCode credentials.',
    requiresKey: false,
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    description: 'Direct DeepSeek API using the saved key or the key detected from OpenCode auth.',
    requiresKey: true,
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    description: 'OpenRouter hosted and :free models using your OpenRouter API key.',
    requiresKey: true,
  },
  {
    id: 'kieai',
    label: 'Kie.ai',
    description: 'Kie.ai OpenAI-compatible chat completions with your Kie.ai key.',
    requiresKey: true,
  },
  {
    id: 'custom',
    label: 'Custom Provider',
    description: 'Any OpenAI-compatible endpoint with a custom base URL and API key.',
    requiresKey: true,
  },
];

const FREE_MODELS: AiModelDescriptor[] = [
  {
    id: 'deepseek/deepseek-v4.1-flash:free',
    label: 'DeepSeek V4.1 Flash Free',
    provider: 'opencode-free',
    providerLabel: 'OpenCode Free Models',
    note: 'Fast free script drafting and structured JSON.',
    isFree: true,
    upstream: 'openrouter',
  },
  {
    id: 'xiaomi/mimo-v2.6-flash:free',
    label: 'MiMo V2.6 Flash Free',
    provider: 'opencode-free',
    providerLabel: 'OpenCode Free Models',
    note: 'Low-latency free model with strong multilingual output.',
    isFree: true,
    upstream: 'openrouter',
  },
  {
    id: 'nvidia/nemotron-3.5-super-vl:free',
    label: 'Nemotron 3.5 Super VL Free',
    provider: 'opencode-free',
    providerLabel: 'OpenCode Free Models',
    note: 'Free NVIDIA reasoning model for rich scene planning.',
    isFree: true,
    upstream: 'openrouter',
  },
  {
    id: 'z-ai/glm-4.5-air:free',
    label: 'GLM 4.5 Air Free',
    provider: 'opencode-free',
    providerLabel: 'OpenCode Free Models',
    note: 'Free balanced model with smooth Arabic and English dialogue.',
    isFree: true,
    upstream: 'openrouter',
  },
  {
    id: 'qwen/qwen3-235b-a22b:free',
    label: 'Qwen3 235B Free',
    provider: 'opencode-free',
    providerLabel: 'OpenCode Free Models',
    note: 'Free high-capacity OpenRouter model for detailed outlines.',
    isFree: true,
    upstream: 'openrouter',
  },
  {
    id: 'meta-llama/llama-4-maverick:free',
    label: 'Llama 4 Maverick Free',
    provider: 'opencode-free',
    providerLabel: 'OpenCode Free Models',
    note: 'Free OpenRouter model with broad general knowledge.',
    isFree: true,
    upstream: 'openrouter',
  },
  {
    id: 'mistralai/mistral-small-3.2-24b-instruct:free',
    label: 'Mistral Small 3.2 Free',
    provider: 'opencode-free',
    providerLabel: 'OpenCode Free Models',
    note: 'Free efficient model for concise scripts.',
    isFree: true,
    upstream: 'openrouter',
  },
];

const OPENROUTER_MODELS: AiModelDescriptor[] = [
  {
    id: 'anthropic/claude-3.5-sonnet',
    label: 'Claude 3.5 Sonnet',
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    note: 'Premium creative writing and precise editing.',
    isFree: false,
    upstream: 'openrouter',
  },
  {
    id: 'google/gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    note: 'Fast structured JSON generation through OpenRouter.',
    isFree: false,
    upstream: 'openrouter',
  },
  {
    id: 'deepseek/deepseek-v4.1-flash:free',
    label: 'DeepSeek V4.1 Flash Free',
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    note: 'OpenRouter free endpoint for DeepSeek V4.1 Flash.',
    isFree: true,
    upstream: 'openrouter',
  },
  {
    id: 'qwen/qwen3-235b-a22b:free',
    label: 'Qwen3 235B Free',
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    note: 'OpenRouter free model with generous context.',
    isFree: true,
    upstream: 'openrouter',
  },
  {
    id: 'meta-llama/llama-4-maverick:free',
    label: 'Llama 4 Maverick Free',
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    note: 'OpenRouter free model for general-purpose scripts.',
    isFree: true,
    upstream: 'openrouter',
  },
];

const KIEAI_MODELS: AiModelDescriptor[] = [
  {
    id: 'gpt-4o-mini',
    label: 'Kie.ai GPT-4o mini',
    provider: 'kieai',
    providerLabel: 'Kie.ai',
    note: 'Kie.ai chat completion model for concise multi-scene scripts.',
    isFree: false,
    upstream: 'kieai',
  },
  {
    id: 'deepseek-chat',
    label: 'Kie.ai DeepSeek Chat',
    provider: 'kieai',
    providerLabel: 'Kie.ai',
    note: 'Kie.ai hosted DeepSeek chat model.',
    isFree: false,
    upstream: 'kieai',
  },
];

const CUSTOM_MODELS: AiModelDescriptor[] = [
  {
    id: 'custom-model',
    label: 'Custom model',
    provider: 'custom',
    providerLabel: 'Custom Provider',
    note: 'Any model ID supported by your OpenAI-compatible endpoint.',
    isFree: false,
    upstream: 'custom',
  },
];

const ALL_AI_MODELS: AiModelDescriptor[] = [
  ...FREE_MODELS,
  ...OPENROUTER_MODELS,
  ...KIEAI_MODELS,
  ...CUSTOM_MODELS,
];

interface ProviderModelItem {
  id: string;
  label: string;
  provider: AiProviderId;
  providerLabel: string;
  note?: string;
  isFree: boolean;
  upstream?: 'openrouter' | 'deepseek' | 'kieai' | 'custom';
}

const PROVIDER_MODELS_TTL_MS = 15 * 60 * 1000;
const providerModelsCache = new Map<
  string,
  { fetchedAt: number; source: 'live' | 'curated'; models: ProviderModelItem[]; notice?: string }
>();

const normalizeProviderAlias = (raw: string): AiProviderId => {
  const value = raw.trim().toLowerCase();
  if (value === 'opencode' || value === 'opencode-free' || value === 'free') {
    return 'opencode-free';
  }
  if (value === 'kie' || value === 'kieai') return 'kieai';
  if (value === 'openrouter' || value === 'deepseek' || value === 'custom') {
    return value as AiProviderId;
  }
  return 'opencode-free';
};

const curatedProviderModels = (provider: AiProviderId): ProviderModelItem[] => {
  const source =
    provider === 'deepseek'
      ? []
      : provider === 'openrouter'
        ? OPENROUTER_MODELS
        : provider === 'kieai'
          ? KIEAI_MODELS
          : provider === 'custom'
            ? CUSTOM_MODELS
            : FREE_MODELS;
  return source.map((model) => ({
    id: model.id,
    label: model.label,
    provider: model.provider,
    providerLabel: model.providerLabel,
    note: model.note,
    isFree: model.isFree,
    upstream: model.upstream,
  }));
};

const providerLabelFor = (provider: AiProviderId): string =>
  AI_PROVIDERS.find((item) => item.id === provider)?.label || 'Provider';

const customModelsEndpoint = (raw: string): string | null => {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  let base = trimmed.replace(/\/chat\/completions$/i, '');
  if (!/\/v\d+$/i.test(base)) base = `${base}/v1`;
  return `${base}/models`;
};

const parseModelPayload = (payload: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'),
    );
  }
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  for (const key of ['data', 'models', 'result']) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'),
      );
    }
  }
  return [];
};

async function fetchProviderModelsLive(
  provider: AiProviderId,
  keys: ResolvedApiKeys,
): Promise<{ models: ProviderModelItem[]; notice?: string }> {
  const label = providerLabelFor(provider);
  let url = '';
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (provider === 'openrouter') {
    if (!keys.openrouterKey) return { models: [] };
    url = 'https://openrouter.ai/api/v1/models';
    headers.Authorization = `Bearer ${keys.openrouterKey}`;
  } else if (provider === 'deepseek') {
    if (!keys.deepseekKey) return { models: [] };
    url = 'https://api.deepseek.com/models';
    headers.Authorization = `Bearer ${keys.deepseekKey}`;
  } else if (provider === 'kieai') {
    if (!keys.kieaiKey) return { models: [] };
    url = 'https://api.kie.ai/v1/models';
    headers.Authorization = `Bearer ${keys.kieaiKey}`;
  } else if (provider === 'custom') {
    if (!keys.customProviderKey || !keys.customProviderBaseUrl) return { models: [] };
    const endpoint = customModelsEndpoint(keys.customProviderBaseUrl);
    if (!endpoint) return { models: [] };
    url = endpoint;
    headers.Authorization = `Bearer ${keys.customProviderKey}`;
  } else {
    return { models: [] };
  }

  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
    if (!response.ok) {
      return { models: [], notice: `${label} HTTP ${response.status}` };
    }
    const payload = (await response.json()) as unknown;
    const entries = parseModelPayload(payload).slice(0, 500);
    const models: ProviderModelItem[] = [];
    const seen = new Set<string>();

    for (const entry of entries) {
      const id =
        typeof entry.id === 'string'
          ? entry.id
          : typeof entry.name === 'string'
            ? entry.name
            : typeof entry.model === 'string'
              ? entry.model
              : '';
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const pricing =
        entry.pricing && typeof entry.pricing === 'object'
          ? (entry.pricing as Record<string, unknown>)
          : null;
      const promptPrice = Number(pricing?.prompt);
      const completionPrice = Number(pricing?.completion);
      const isFree =
        id.endsWith(':free') ||
        (pricing !== null &&
          Number.isFinite(promptPrice) &&
          Number.isFinite(completionPrice) &&
          promptPrice <= 0 &&
          completionPrice <= 0);
      const contextLength = Number(entry.context_length);
      const note =
        Number.isFinite(contextLength) && contextLength > 0
          ? `${new Intl.NumberFormat('en-US').format(contextLength)} ctx`
          : typeof entry.description === 'string'
            ? entry.description.slice(0, 90)
            : undefined;
      models.push({
        id,
        label:
          typeof entry.name === 'string' && entry.name.trim()
            ? entry.name.trim().slice(0, 120)
            : id,
        provider,
        providerLabel: label,
        note,
        isFree,
        upstream:
          provider === 'openrouter'
            ? 'openrouter'
            : provider === 'deepseek'
              ? 'deepseek'
              : provider === 'kieai'
                ? 'kieai'
                : 'custom',
      });
    }

    return { models };
  } catch {
    return { models: [], notice: `تعذر الاتصال بـ ${label} الآن.` };
  }
}

const DEFAULT_FREE_MODEL = FREE_MODELS[0].id;
const FREE_FALLBACK_MODELS = FREE_MODELS.map((model) => model.id);

const DEFAULT_ELEVENLABS_MODELS: ElevenLabsModelItem[] = [
  {
    model_id: 'eleven_multilingual_v2',
    name: 'Eleven Multilingual v2',
    description: 'دقة نطق عربية عالية ونبرة طبيعية للمحتوى الوثائقي والشروحات.',
    latencyBadge: 'جودة فائقة',
    qualityBadge: '29 لغة',
    languages: ['Arabic', 'English'],
  },
  {
    model_id: 'eleven_turbo_v2_5',
    name: 'Eleven Turbo v2.5',
    description: 'توازن مثالي بين سرعة التوليد ووضوح المخارج الصوتية.',
    latencyBadge: 'استجابة سريعة · ~250ms',
    qualityBadge: 'متوازن',
    languages: ['Arabic', 'English'],
  },
  {
    model_id: 'eleven_flash_v2_5',
    name: 'Eleven Flash v2.5',
    description: 'أسرع نموذج للتوليد الفوري ومعاينة المشاهد المتعددة.',
    latencyBadge: 'زمن فائق الانخفاض · ~75ms',
    qualityBadge: 'سرعة قصوى',
    languages: ['Arabic', 'English'],
  },
];

const DEFAULT_ELEVENLABS_VOICES: ElevenLabsVoiceItem[] = [
  {
    voice_id: 'pNInz6obpgDQGcFmaJgB',
    name: 'آدم — Adam',
    gender: 'male',
    language: 'Arabic',
    languages: ['Arabic'],
    accent: 'Standard',
    tone: 'وثائقي رزين',
    category: 'premade',
    preview_url: null,
    description: 'صوت رزين ومناسب للمحتوى التقني والشروحات التحليلية.',
    source: 'personal',
  },
  {
    voice_id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'سارة — Sarah',
    gender: 'female',
    language: 'English',
    languages: ['English'],
    accent: 'American',
    tone: 'إخباري هادئ',
    category: 'premade',
    preview_url: null,
    description: 'نبرة هادئة ومتزنة لعرض الحقائق والمقارنات.',
    source: 'personal',
  },
  {
    voice_id: 'TX3LPaxmHKxFdv7VOQHJ',
    name: 'ليام — Liam',
    gender: 'male',
    language: 'English',
    languages: ['English'],
    accent: 'British',
    tone: 'حيوي سريع',
    category: 'premade',
    preview_url: null,
    description: 'إيقاع سريع وملائم لمقاطع الـ Reels القصيرة.',
    source: 'personal',
  },
  {
    voice_id: 'Xb7hH8MSUJpSbSDYk0k2',
    name: 'أليس — Alice',
    gender: 'female',
    language: 'English',
    languages: ['English'],
    accent: 'British',
    tone: 'تعليمي دافئ',
    category: 'premade',
    preview_url: null,
    description: 'مناسب للتبسيط العلمي والقصص التعليمية.',
    source: 'personal',
  },
];

function maskApiKey(key?: string): string {
  if (!key || key.length < 8) return '';
  return `${key.slice(0, 6)}••••${key.slice(-4)}`;
}

const DEFAULT_BRAND_KIT: RenderBrandKit = {
  accentColor: '#E77B40',
  bgColor: '#0B0F17',
  textColor: '#F8FAFC',
  primaryColor: '#38BDF8',
  secondaryColor: '#FBBF24',
  watermark: '@ZofStudio',
  watermarkEnabled: true,
  watermarkPosition: 'top-left',
};

const BACKGROUND_PRESET_IDS = [
  'animated-mesh',
  'kinetic-grid',
  'floating-orbs',
  'deep-wave',
  'particle-field',
  'editorial-paper',
  'neon-cyber',
  'ai-free',
] as const;

type BackgroundPresetId = (typeof BACKGROUND_PRESET_IDS)[number];

const SCENE_BACKGROUND_PRESETS = BACKGROUND_PRESET_IDS.filter(
  (preset): preset is Exclude<BackgroundPresetId, 'ai-free'> => preset !== 'ai-free',
);

const GENERATIVE_MOTIFS = ['orbit', 'network', 'flow', 'funnel', 'cycle', 'constellation'] as const;

function normalizeBackgroundPreset(value: unknown, fallback: BackgroundPresetId = 'ai-free'): BackgroundPresetId {
  return typeof value === 'string' && (BACKGROUND_PRESET_IDS as readonly string[]).includes(value)
    ? (value as BackgroundPresetId)
    : fallback;
}

const SCRIPT_DEPTH_VALUES = ['analytical', 'condensed', 'article'] as const;

function normalizeScriptDepth(value: unknown, fallback = 'analytical'): string {
  return typeof value === 'string' && (SCRIPT_DEPTH_VALUES as readonly string[]).includes(value)
    ? value
    : fallback;
}

const CREATIVE_CODE_MODES = ['creative', 'fast'] as const;
const AMBIENT_SCENE_IDS = [
  'none',
  'night-room',
  'desk-lamp',
  'rain-window',
  'clock',
  'phone-notifications',
  'cozy-desk',
] as const;

function normalizeCreativeCodeMode(value: unknown, fallback = 'creative'): string {
  return typeof value === 'string' && (CREATIVE_CODE_MODES as readonly string[]).includes(value)
    ? value
    : fallback;
}

function normalizeAmbientScene(value: unknown): string | undefined {
  return typeof value === 'string' &&
    (AMBIENT_SCENE_IDS as readonly string[]).includes(value)
    ? value
    : undefined;
}

function normalizeSceneCharacters(
  raw: unknown,
): RenderScenePayload['characters'] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const validPoses = new Set([
    'idle',
    'walking',
    'explaining',
    'thinking',
    'shocked',
    'happy',
    'sad',
    'pointing',
    'celebrating',
    'idea',
    'facepalm',
  ]);
  const characters = raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .slice(0, 3)
    .map((item) => {
      const pose = typeof item.pose === 'string' && validPoses.has(item.pose) ? item.pose : 'idle';
      const side: 'left' | 'right' | undefined =
        item.side === 'left' ? 'left' : item.side === 'right' ? 'right' : undefined;
      const accessory: 'none' | 'tie' | 'badge' =
        item.accessory === 'tie'
          ? 'tie'
          : item.accessory === 'badge'
            ? 'badge'
            : 'none';
      const label =
        typeof item.label === 'string' && item.label.trim()
          ? item.label.trim().slice(0, 48)
          : undefined;
      const scaleRaw = Number(item.scale);
      const scale = Number.isFinite(scaleRaw)
        ? Math.min(1.6, Math.max(0.4, Number(scaleRaw.toFixed(2))))
        : undefined;
      return {
        pose,
        ...(side ? { side } : {}),
        accessory,
        ...(label ? { label } : {}),
        ...(scale !== undefined ? { scale } : {}),
        enabled: item.enabled !== false,
      };
    });
  return characters.length > 0 ? characters : undefined;
}

const SCRIPT_PACING_VALUES = ['fast', 'balanced', 'auto'] as const;
const CAPTION_ANIMATION_STYLE_VALUES = [
  'auto',
  'word-by-word',
  'karaoke',
  'static',
  'word-pop-glow',
  'dynamic-karaoke',
  'smooth-chunk-slide',
  'kinetic-typewriter',
] as const;
const DEFAULT_CAPTION_BOTTOM_OFFSET = 20;
const CAPTION_COLOR_SOURCES = [
  'background',
  'text',
  'primary',
  'secondary',
  'accent',
  'custom',
] as const;
const DEFAULT_CAPTION_COLORS: RenderCaptionColors = {
  background: DEFAULT_BRAND_KIT.primaryColor,
  text: DEFAULT_BRAND_KIT.textColor,
  highlight: DEFAULT_BRAND_KIT.accentColor,
  backgroundSource: 'primary',
  textSource: 'text',
  highlightSource: 'accent',
};
const WORDS_PER_SCREEN_VALUES = ['auto', '2', '3', '4', '5'] as const;

function normalizeScriptPacing(value: unknown, fallback = 'fast'): string {
  return typeof value === 'string' && (SCRIPT_PACING_VALUES as readonly string[]).includes(value)
    ? value
    : fallback;
}

function normalizeCaptionAnimationStyle(value: unknown, fallback = 'auto'): string {
  return typeof value === 'string' &&
    (CAPTION_ANIMATION_STYLE_VALUES as readonly string[]).includes(value)
    ? value
    : fallback;
}

function normalizeWordsPerScreen(value: unknown, fallback = 'auto'): string {
  const raw = typeof value === 'number' ? String(value) : value;
  return typeof raw === 'string' && (WORDS_PER_SCREEN_VALUES as readonly string[]).includes(raw)
    ? raw
    : fallback;
}

function normalizeVisualStyleValue(value: unknown, fallback = 'stickman'): string {
  const style = cleanSettingString(value, 32).toLowerCase();
  if (style === 'modern-dark' || style === 'modern_dark') return 'modern-dark';
  if (style === 'editorial-clean' || style === 'editorial_clean') return 'editorial-clean';
  if (style === 'smart-mix' || style === 'smart_mix') return 'smart-mix';
  if (style === 'stickman') return 'stickman';
  return fallback;
}

function parentCaptionStyle(value: string): string {
  switch (value) {
    case 'word-by-word':
    case 'word-pop-glow':
      return 'word_by_word';
    case 'karaoke':
    case 'dynamic-karaoke':
      return 'karaoke';
    case 'static':
    case 'smooth-chunk-slide':
      return 'static';
    case 'kinetic-typewriter':
      return 'kinetic_typewriter';
    default:
      return 'auto';
  }
}

function normalizeCaptionColorSource(
  value: unknown,
  fallback: CaptionColorSource,
): CaptionColorSource {
  return typeof value === 'string' &&
    (CAPTION_COLOR_SOURCES as readonly string[]).includes(value)
    ? (value as CaptionColorSource)
    : fallback;
}

function captionColorFromSource(
  source: CaptionColorSource,
  brandKit: RenderBrandKit,
): string {
  switch (source) {
    case 'background':
      return brandKit.bgColor;
    case 'text':
      return brandKit.textColor;
    case 'secondary':
      return brandKit.secondaryColor;
    case 'accent':
      return brandKit.accentColor;
    case 'primary':
    default:
      return brandKit.primaryColor;
  }
}

function normalizeCaptionColors(
  raw: unknown,
  brandKit: RenderBrandKit = DEFAULT_BRAND_KIT,
): RenderCaptionColors {
  const record = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const hasExplicitColor = (value: unknown): boolean =>
    typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim());
  const backgroundSource = normalizeCaptionColorSource(
    record.backgroundSource,
    hasExplicitColor(record.background) ? 'custom' : 'primary',
  );
  const textSource = normalizeCaptionColorSource(
    record.textSource,
    hasExplicitColor(record.text) ? 'custom' : 'text',
  );
  const highlightSource = normalizeCaptionColorSource(
    record.highlightSource,
    hasExplicitColor(record.highlight) ? 'custom' : 'accent',
  );
  return {
    background:
      backgroundSource === 'custom'
        ? colorSetting(record.background, brandKit.primaryColor)
        : captionColorFromSource(backgroundSource, brandKit),
    text:
      textSource === 'custom'
        ? colorSetting(record.text, brandKit.textColor)
        : captionColorFromSource(textSource, brandKit),
    highlight:
      highlightSource === 'custom'
        ? colorSetting(record.highlight, brandKit.accentColor)
        : captionColorFromSource(highlightSource, brandKit),
    backgroundSource,
    textSource,
    highlightSource,
  };
}

function normalizeCaptionBottomOffset(
  value: unknown,
  fallback = DEFAULT_CAPTION_BOTTOM_OFFSET,
): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(40, Math.max(10, Math.round(numeric)));
}

function parentWordsPerScreen(value: string): number | 'auto' {
  const numeric = Number.parseInt(value, 10);
  return Number.isFinite(numeric) && numeric >= 2 && numeric <= 5 ? numeric : 'auto';
}

const DEFAULT_STUDIO_SETTINGS: StudioSettings = {
  openrouterKey: '',
  deepseekKey: '',
  kieaiKey: '',
  elevenlabsKey: '',
  customProviderName: '',
  customProviderKey: '',
  customProviderBaseUrl: '',
  aiProvider: 'opencode-free',
  aiModel: DEFAULT_FREE_MODEL,
  voiceId: 'pNInz6obpgDQGcFmaJgB',
  voiceModelId: 'eleven_multilingual_v2',
  voiceStability: 0.5,
  voiceSimilarityBoost: 0.75,
  voiceStyle: 0,
  voiceSpeakerBoost: true,
  voiceSpeed: 1,
  visualStyle: 'stickman',
  aspectRatio: '9:16',
  fps: 60,
  scriptLanguage: 'ar',
  scriptDepth: 'analytical',
  creativeCodeMode: 'creative',
  scriptPacing: 'fast',
  captionAnimationStyle: 'auto',
  captionColors: DEFAULT_CAPTION_COLORS,
  captionBottomOffset: DEFAULT_CAPTION_BOTTOM_OFFSET,
  wordsPerScreen: 'auto',
  captionsEnabled: true,
  respectSafeZone: true,
  brandKit: DEFAULT_BRAND_KIT,
  sfxEnabled: true,
  sfxVolume: 0.2,
  sfxMode: 'auto',
  backgroundPreset: 'ai-free',
  updatedAt: 0,
};

const AI_PROVIDER_IDS = new Set<AiProviderId>(
  AI_PROVIDERS.map((provider) => provider.id)
);

function cleanSettingString(value: unknown, maxLength = 512): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

function readJsonFileSafe(filePath: string): unknown | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  } catch {
    return null;
  }
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function colorSetting(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim())
    ? value.trim()
    : fallback;
}

function normalizeWatermarkPosition(value: unknown): WatermarkPosition {
  return value === 'top-right' ||
    value === 'bottom-left' ||
    value === 'bottom-right'
    ? value
    : 'top-left';
}

function normalizeBrandKit(raw: unknown): RenderBrandKit {
  const record = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    accentColor: colorSetting(record.accentColor, DEFAULT_BRAND_KIT.accentColor),
    bgColor: colorSetting(record.bgColor, DEFAULT_BRAND_KIT.bgColor),
    textColor: colorSetting(record.textColor, DEFAULT_BRAND_KIT.textColor),
    primaryColor: colorSetting(record.primaryColor, DEFAULT_BRAND_KIT.primaryColor),
    secondaryColor: colorSetting(record.secondaryColor, DEFAULT_BRAND_KIT.secondaryColor),
    watermark:
      typeof record.watermark === 'string'
        ? record.watermark.trim().slice(0, 60)
        : DEFAULT_BRAND_KIT.watermark,
    watermarkEnabled: record.watermarkEnabled !== false,
    watermarkPosition: normalizeWatermarkPosition(record.watermarkPosition),
  };
}

function brandKitWithActivePalette(rawBrand: unknown, rawPalette: unknown): RenderBrandKit {
  const brand = (rawBrand && typeof rawBrand === 'object'
    ? rawBrand
    : {}) as Record<string, unknown>;
  const palette = (rawPalette && typeof rawPalette === 'object'
    ? rawPalette
    : {}) as Record<string, unknown>;
  const pick = (value: unknown): string | undefined =>
    typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim())
      ? value.trim()
      : undefined;
  const bgColor = pick(palette.background);
  const textColor = pick(palette.text);
  const primaryColor = pick(palette.primary);
  const secondaryColor = pick(palette.secondary);
  const accentColor = pick(palette.accent);
  return normalizeBrandKit({
    ...brand,
    ...(bgColor ? { bgColor } : {}),
    ...(textColor ? { textColor } : {}),
    ...(primaryColor ? { primaryColor } : {}),
    ...(secondaryColor ? { secondaryColor } : {}),
    ...(accentColor ? { accentColor } : {}),
  });
}

function normalizeStudioSettings(raw: unknown): StudioSettings {
  const record = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const providerRaw = cleanSettingString(record.aiProvider, 32) as AiProviderId;
  const modelId = cleanSettingString(record.aiModel, 160);
  const visualStyle = cleanSettingString(record.visualStyle, 32);
  const aspectRatio = cleanSettingString(record.aspectRatio, 16);
  const normalizedAspectRatio =
    aspectRatio === '16:9' || aspectRatio === '1:1' || aspectRatio === '9:16'
      ? aspectRatio
      : DEFAULT_STUDIO_SETTINGS.aspectRatio;
  const scriptLanguage = normalizeVideoLanguage(
    record.scriptLanguage ?? record.language,
    DEFAULT_VIDEO_LANGUAGE,
  );
  const brandKit = normalizeBrandKit(record.brandKit);
  return {
    openrouterKey: cleanSettingString(record.openrouterKey),
    deepseekKey: cleanSettingString(record.deepseekKey),
    kieaiKey: cleanSettingString(record.kieaiKey),
    elevenlabsKey: cleanSettingString(record.elevenlabsKey),
    customProviderName: cleanSettingString(record.customProviderName, 80),
    customProviderKey: cleanSettingString(record.customProviderKey),
    customProviderBaseUrl: cleanSettingString(record.customProviderBaseUrl, 300),
    aiProvider: AI_PROVIDER_IDS.has(providerRaw) ? providerRaw : DEFAULT_STUDIO_SETTINGS.aiProvider,
    aiModel: modelId || DEFAULT_STUDIO_SETTINGS.aiModel,
    voiceId: cleanSettingString(record.voiceId, 64) || DEFAULT_STUDIO_SETTINGS.voiceId,
    voiceModelId:
      cleanSettingString(record.voiceModelId, 64) || DEFAULT_STUDIO_SETTINGS.voiceModelId,
    voiceStability: clampNumber(record.voiceStability, DEFAULT_STUDIO_SETTINGS.voiceStability, 0, 1),
    voiceSimilarityBoost: clampNumber(
      record.voiceSimilarityBoost,
      DEFAULT_STUDIO_SETTINGS.voiceSimilarityBoost,
      0,
      1,
    ),
    voiceStyle: clampNumber(record.voiceStyle, DEFAULT_STUDIO_SETTINGS.voiceStyle, 0, 1),
    voiceSpeakerBoost:
      typeof record.voiceSpeakerBoost === 'boolean'
        ? record.voiceSpeakerBoost
        : DEFAULT_STUDIO_SETTINGS.voiceSpeakerBoost,
    voiceSpeed: clampNumber(record.voiceSpeed, DEFAULT_STUDIO_SETTINGS.voiceSpeed, 0.7, 1.2),
    visualStyle: normalizeVisualStyleValue(visualStyle, DEFAULT_STUDIO_SETTINGS.visualStyle),
    aspectRatio: normalizedAspectRatio,
    fps: Number(record.fps) === 30 ? 30 : DEFAULT_STUDIO_SETTINGS.fps,
    scriptLanguage,
    scriptDepth: normalizeScriptDepth(
      record.scriptDepth,
      DEFAULT_STUDIO_SETTINGS.scriptDepth,
    ),
    creativeCodeMode: normalizeCreativeCodeMode(
      record.creativeCodeMode,
      DEFAULT_STUDIO_SETTINGS.creativeCodeMode,
    ),
    scriptPacing: normalizeScriptPacing(
      record.scriptPacing,
      DEFAULT_STUDIO_SETTINGS.scriptPacing,
    ),
    captionAnimationStyle: normalizeCaptionAnimationStyle(
      record.captionAnimationStyle,
      DEFAULT_STUDIO_SETTINGS.captionAnimationStyle,
    ),
    captionColors: normalizeCaptionColors(record.captionColors, brandKit),
    captionBottomOffset: normalizeCaptionBottomOffset(record.captionBottomOffset),
    wordsPerScreen: normalizeWordsPerScreen(
      record.wordsPerScreen,
      DEFAULT_STUDIO_SETTINGS.wordsPerScreen,
    ),
    captionsEnabled: record.captionsEnabled !== false,
    respectSafeZone:
      typeof record.respectSafeZone === 'boolean'
        ? record.respectSafeZone
        : normalizedAspectRatio === '9:16',
    brandKit,
    sfxEnabled: record.sfxEnabled !== false,
    sfxVolume: clampNumber(record.sfxVolume, DEFAULT_STUDIO_SETTINGS.sfxVolume, 0, 1),
    sfxMode: record.sfxMode === 'manual' ? 'manual' : 'auto',
    backgroundPreset: normalizeBackgroundPreset(record.backgroundPreset),
    updatedAt: Number.isFinite(Number(record.updatedAt)) ? Number(record.updatedAt) : 0,
  };
}

function loadStudioSettings(): StudioSettings {
  const raw = readJsonFileSafe(SETTINGS_FILE);
  if (raw) return normalizeStudioSettings(raw);

  return normalizeStudioSettings({});
}

function saveStudioSettings(settings: StudioSettings): void {
  fs.mkdirSync(ZOF_HOME_DIR, { recursive: true });
  writeJsonFile(SETTINGS_FILE, settings);
  try {
    fs.chmodSync(SETTINGS_FILE, 0o600);
  } catch {
    // Permissions are best-effort on non-POSIX filesystems.
  }
}

function normalizeProjectState(raw: unknown): ProjectStatePayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const scenesRaw = Array.isArray(record.scenes) ? record.scenes : [];
  if (scenesRaw.length === 0) return null;
  const providerRaw = cleanSettingString(record.aiProvider, 32) as AiProviderId;
  const depthForTopic = normalizeScriptDepth(record.scriptDepth, 'analytical');
  const brandKit = normalizeBrandKit(record.brandKit);
  const projectAspectRatio =
    cleanSettingString(record.aspectRatio, 16) || DEFAULT_STUDIO_SETTINGS.aspectRatio;
  return {
    topic: cleanSettingString(record.topic, depthForTopic === 'article' ? 20000 : 1200),
    scenes: normalizeScenes(scenesRaw),
    aiProvider: AI_PROVIDER_IDS.has(providerRaw) ? providerRaw : studioSettings.aiProvider,
    aiModel: cleanSettingString(record.aiModel, 160) || studioSettings.aiModel,
    voiceId: cleanSettingString(record.voiceId, 64) || DEFAULT_STUDIO_SETTINGS.voiceId,
    voiceModelId:
      cleanSettingString(record.voiceModelId, 64) || DEFAULT_STUDIO_SETTINGS.voiceModelId,
    voiceStability: clampNumber(record.voiceStability, DEFAULT_STUDIO_SETTINGS.voiceStability, 0, 1),
    voiceSimilarityBoost: clampNumber(
      record.voiceSimilarityBoost,
      DEFAULT_STUDIO_SETTINGS.voiceSimilarityBoost,
      0,
      1,
    ),
    voiceStyle: clampNumber(record.voiceStyle, DEFAULT_STUDIO_SETTINGS.voiceStyle, 0, 1),
    voiceSpeakerBoost:
      typeof record.voiceSpeakerBoost === 'boolean'
        ? record.voiceSpeakerBoost
        : DEFAULT_STUDIO_SETTINGS.voiceSpeakerBoost,
    voiceSpeed: clampNumber(record.voiceSpeed, DEFAULT_STUDIO_SETTINGS.voiceSpeed, 0.7, 1.2),
    voiceoverEnabled: record.voiceoverEnabled !== false,
    cleanBrollMode: record.cleanBrollMode === true,
    visualStyle: normalizeVisualStyleValue(
      record.visualStyle,
      DEFAULT_STUDIO_SETTINGS.visualStyle,
    ),
    aspectRatio: projectAspectRatio,
    fps: Number(record.fps) === 30 ? 30 : 60,
    scriptLanguage: normalizeVideoLanguage(
      record.scriptLanguage ?? record.language,
      DEFAULT_STUDIO_SETTINGS.scriptLanguage,
    ),
    scriptDepth: normalizeScriptDepth(
      record.scriptDepth,
      DEFAULT_STUDIO_SETTINGS.scriptDepth,
    ),
    creativeCodeMode: normalizeCreativeCodeMode(
      record.creativeCodeMode,
      DEFAULT_STUDIO_SETTINGS.creativeCodeMode,
    ),
    scriptPacing: normalizeScriptPacing(
      record.scriptPacing,
      DEFAULT_STUDIO_SETTINGS.scriptPacing,
    ),
    captionAnimationStyle: normalizeCaptionAnimationStyle(
      record.captionAnimationStyle,
      DEFAULT_STUDIO_SETTINGS.captionAnimationStyle,
    ),
    captionColors: normalizeCaptionColors(record.captionColors, brandKit),
    captionBottomOffset: normalizeCaptionBottomOffset(record.captionBottomOffset),
    wordsPerScreen: normalizeWordsPerScreen(
      record.wordsPerScreen,
      DEFAULT_STUDIO_SETTINGS.wordsPerScreen,
    ),
    captionsEnabled: record.captionsEnabled !== false,
    respectSafeZone:
      typeof record.respectSafeZone === 'boolean'
        ? record.respectSafeZone
        : projectAspectRatio === '9:16',
    brandKit,
    sfxEnabled: record.sfxEnabled !== false,
    sfxVolume: clampNumber(record.sfxVolume, DEFAULT_STUDIO_SETTINGS.sfxVolume, 0, 1),
    sfxMode: record.sfxMode === 'manual' ? 'manual' : 'auto',
    backgroundPreset: normalizeBackgroundPreset(record.backgroundPreset),
    selectedSceneId: cleanSettingString(record.selectedSceneId, 120) || undefined,
    updatedAt: Number.isFinite(Number(record.updatedAt)) ? Number(record.updatedAt) : Date.now(),
  };
}

function readProjectState(): ProjectStatePayload | null {
  return normalizeProjectState(readJsonFileSafe(CURRENT_PROJECT_FILE));
}

function saveProjectState(project: ProjectStatePayload): void {
  fs.mkdirSync(ZOF_HOME_DIR, { recursive: true });
  writeJsonFile(CURRENT_PROJECT_FILE, project);
  studioSettings.aiProvider = project.aiProvider;
  studioSettings.aiModel = project.aiModel;
  studioSettings.voiceId = project.voiceId;
  studioSettings.voiceModelId = project.voiceModelId;
  studioSettings.voiceStability = project.voiceStability;
  studioSettings.voiceSimilarityBoost = project.voiceSimilarityBoost;
  studioSettings.voiceStyle = project.voiceStyle;
  studioSettings.voiceSpeakerBoost = project.voiceSpeakerBoost;
  studioSettings.voiceSpeed = project.voiceSpeed;
  studioSettings.visualStyle = project.visualStyle;
  studioSettings.aspectRatio = project.aspectRatio;
  studioSettings.fps = project.fps;
  studioSettings.scriptLanguage = project.scriptLanguage;
  studioSettings.scriptDepth = project.scriptDepth;
  studioSettings.creativeCodeMode = project.creativeCodeMode;
  studioSettings.scriptPacing = project.scriptPacing;
  studioSettings.captionAnimationStyle = project.captionAnimationStyle;
  studioSettings.captionColors = project.captionColors;
  studioSettings.captionBottomOffset = project.captionBottomOffset;
  studioSettings.wordsPerScreen = project.wordsPerScreen;
  studioSettings.captionsEnabled = project.captionsEnabled;
  studioSettings.respectSafeZone = project.respectSafeZone;
  studioSettings.brandKit = project.brandKit;
  studioSettings.sfxEnabled = project.sfxEnabled;
  studioSettings.sfxVolume = project.sfxVolume;
  studioSettings.sfxMode = project.sfxMode;
  studioSettings.backgroundPreset = project.backgroundPreset;
  studioSettings.updatedAt = Date.now();
  try {
    saveStudioSettings(studioSettings);
  } catch {
    // Project persistence should not fail if settings mirroring fails.
  }
}

function emptyUsageCounters(): UsageCounters {
  return {
    aiInputTokens: 0,
    aiOutputTokens: 0,
    aiCalls: 0,
    aiUsd: 0,
    aiModel: '',
    ttsCharacters: 0,
    ttsCalls: 0,
    ttsUsd: 0,
    visualCalls: 0,
    visualUsd: 0,
    renderedFrames: 0,
    renderJobs: 0,
    renderUsd: 0,
  };
}

function normalizeUsageCounters(raw: unknown): UsageCounters {
  const base = emptyUsageCounters();
  if (!raw || typeof raw !== 'object') return base;
  const record = raw as Record<string, unknown>;
  const number = (key: keyof UsageCounters): number => {
    const value = Number(record[key]);
    return Number.isFinite(value) && value > 0 ? value : 0;
  };
  return {
    aiInputTokens: number('aiInputTokens'),
    aiOutputTokens: number('aiOutputTokens'),
    aiCalls: number('aiCalls'),
    aiUsd: number('aiUsd'),
    aiModel: typeof record.aiModel === 'string' ? record.aiModel.slice(0, 160) : '',
    ttsCharacters: number('ttsCharacters'),
    ttsCalls: number('ttsCalls'),
    ttsUsd: number('ttsUsd'),
    visualCalls: number('visualCalls'),
    visualUsd: number('visualUsd'),
    renderedFrames: number('renderedFrames'),
    renderJobs: number('renderJobs'),
    renderUsd: number('renderUsd'),
  };
}

function loadUsageStore(): UsageStore {
  const raw = readJsonFileSafe(USAGE_FILE);
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    version: 1,
    projectId: typeof record.projectId === 'string' ? record.projectId : 'default',
    project: normalizeUsageCounters(record.project),
    allTime: normalizeUsageCounters(record.allTime),
    updatedAt: Number(record.updatedAt) || 0,
  };
}

const usageStore: UsageStore = loadUsageStore();

function saveUsageStore(): void {
  try {
    fs.mkdirSync(ZOF_HOME_DIR, { recursive: true });
    writeJsonFile(USAGE_FILE, usageStore);
  } catch {
    // Usage accounting is best-effort and must never break a render.
  }
}

function currentProjectUsageKey(): string {
  const project = readProjectState();
  if (!project) return usageStore.projectId || 'default';
  const signature = `${project.topic}::${project.scenes.map((scene) => scene.id).join('|')}`;
  return crypto.createHash('sha1').update(signature).digest('hex').slice(0, 16);
}

function syncUsageProjectBucket(): void {
  const key = currentProjectUsageKey();
  if (!usageStore.projectId || usageStore.projectId === 'default') {
    usageStore.projectId = key;
    usageStore.updatedAt = Date.now();
    saveUsageStore();
    return;
  }
  if (key !== usageStore.projectId) {
    // Keep the live counters for the current studio session; the project id is
    // refreshed so a brand-new project starts from an explicit Reset.
    usageStore.projectId = key;
    usageStore.updatedAt = Date.now();
    saveUsageStore();
  }
}

function usageTotalUsd(counters: UsageCounters): number {
  return Number(
    (counters.aiUsd + counters.ttsUsd + counters.visualUsd + counters.renderUsd).toFixed(6),
  );
}

function recordUsage(delta: UsageDelta): UsageDelta {
  syncUsageProjectBucket();
  const numericKeys: Array<keyof Omit<UsageCounters, 'aiModel'>> = [
    'aiInputTokens',
    'aiOutputTokens',
    'aiCalls',
    'aiUsd',
    'ttsCharacters',
    'ttsCalls',
    'ttsUsd',
    'visualCalls',
    'visualUsd',
    'renderedFrames',
    'renderJobs',
    'renderUsd',
  ];
  for (const key of numericKeys) {
    const value = Number(delta[key]);
    if (!Number.isFinite(value) || value === 0) continue;
    usageStore.project[key] += value;
    usageStore.allTime[key] += value;
  }
  if (delta.aiModel) {
    usageStore.project.aiModel = delta.aiModel;
    usageStore.allTime.aiModel = delta.aiModel;
  }
  usageStore.updatedAt = Date.now();
  saveUsageStore();
  return delta;
}

function buildUsageResponse(): {
  ok: boolean;
  projectId: string;
  project: { usage: UsageCounters; totalUsd: number };
  allTime: { usage: UsageCounters; totalUsd: number };
  updatedAt: number;
  usageFile: string;
} {
  syncUsageProjectBucket();
  return {
    ok: true,
    projectId: usageStore.projectId,
    project: {
      usage: { ...usageStore.project },
      totalUsd: usageTotalUsd(usageStore.project),
    },
    allTime: {
      usage: { ...usageStore.allTime },
      totalUsd: usageTotalUsd(usageStore.allTime),
    },
    updatedAt: usageStore.updatedAt,
    usageFile: USAGE_FILE,
  };
}

const MODEL_PRICING_PER_MILLION: Array<{
  match: RegExp;
  input: number;
  output: number;
}> = [
  { match: /:free$/i, input: 0, output: 0 },
  { match: /deepseek-reasoner/i, input: 0.55, output: 2.19 },
  { match: /deepseek/i, input: 0.27, output: 1.1 },
  { match: /claude.*sonnet/i, input: 3, output: 15 },
  { match: /gemini.*flash/i, input: 0.3, output: 2.5 },
  { match: /gpt-4o-mini/i, input: 0.15, output: 0.6 },
  { match: /llama|qwen|mixtral|mimo|nemotron|glm/i, input: 0.2, output: 0.6 },
];

function estimateAiUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING_PER_MILLION.find((entry) => entry.match.test(model)) || {
    input: 0.5,
    output: 1.5,
  };
  const usd =
    (Math.max(0, inputTokens) / 1_000_000) * pricing.input +
    (Math.max(0, outputTokens) / 1_000_000) * pricing.output;
  return Number(usd.toFixed(6));
}

let studioSettings = loadStudioSettings();

const OPENCODE_CONFIG_PATHS = [
  path.join(os.homedir(), '.config', 'opencode', 'opencode.json'),
  path.join(os.homedir(), '.config', 'opencode', 'opencode.jsonc'),
];
const OPENCODE_AUTH_PATHS = [
  path.join(os.homedir(), '.local', 'share', 'opencode', 'auth.json'),
  path.join(os.homedir(), '.config', 'opencode', 'auth.json'),
];

function inspectOpenCode(): OpenCodeInspection {
  const providers = new Set<string>();
  const models: OpenCodeModelEntry[] = [];
  const seenModels = new Set<string>();
  const keys: Record<string, string> = {};
  let configFound = false;
  let authFound = false;

  const addModel = (
    providerId: string,
    providerLabel: string,
    modelId: string,
    modelLabel: string,
  ) => {
    const id = modelId.trim();
    if (!id || seenModels.has(id)) return;
    seenModels.add(id);
    models.push({
      id,
      label: modelLabel.trim() || id,
      providerId,
      providerLabel,
    });
  };

  const collectProviderModels = (
    providerId: string,
    providerConfig: Record<string, unknown>,
  ) => {
    const providerLabel =
      typeof providerConfig.name === 'string' && providerConfig.name.trim()
        ? providerConfig.name.trim()
        : providerId;
    const modelField = providerConfig.models;
    if (modelField && typeof modelField === 'object' && !Array.isArray(modelField)) {
      for (const [modelId, modelValue] of Object.entries(modelField)) {
        if (!modelId.trim()) continue;
        const modelRecord =
          modelValue && typeof modelValue === 'object'
            ? (modelValue as Record<string, unknown>)
            : {};
        const modelLabel =
          typeof modelRecord.name === 'string' && modelRecord.name.trim()
            ? modelRecord.name.trim()
            : typeof modelRecord.id === 'string' && modelRecord.id.trim()
              ? modelRecord.id.trim()
              : modelId;
        addModel(providerId, providerLabel, modelId, `${providerLabel} · ${modelLabel}`);
      }
    } else if (Array.isArray(modelField)) {
      for (const item of modelField) {
        if (!item || typeof item !== 'object') continue;
        const record = item as Record<string, unknown>;
        const modelId =
          typeof record.id === 'string'
            ? record.id
            : typeof record.model === 'string'
              ? record.model
              : '';
        const modelLabel =
          typeof record.name === 'string' && record.name.trim()
            ? record.name.trim()
            : modelId;
        addModel(providerId, providerLabel, modelId, `${providerLabel} · ${modelLabel}`);
      }
    }
    if (typeof providerConfig.model === 'string' && providerConfig.model.trim()) {
      const modelId = providerConfig.model.trim();
      addModel(providerId, providerLabel, modelId, `${providerLabel} · ${modelId}`);
    }
  };

  for (const configPath of OPENCODE_CONFIG_PATHS) {
    const parsed = readJsonFileSafe(configPath);
    if (!parsed || typeof parsed !== 'object') continue;
    configFound = true;
    const record = parsed as Record<string, unknown>;
    for (const field of ['provider', 'providers']) {
      const value = record[field];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const [id, providerConfig] of Object.entries(
          value as Record<string, unknown>,
        )) {
          if (!/^[a-zA-Z0-9._-]{2,64}$/.test(id)) continue;
          providers.add(id);
          if (providerConfig && typeof providerConfig === 'object') {
            collectProviderModels(id, providerConfig as Record<string, unknown>);
          }
        }
      }
    }
  }

  for (const authPath of OPENCODE_AUTH_PATHS) {
    const parsed = readJsonFileSafe(authPath);
    if (!parsed || typeof parsed !== 'object') continue;
    authFound = true;
    const record = parsed as Record<string, unknown>;
    Object.entries(record).forEach(([id, value]) => {
      if (!/^[a-zA-Z0-9._-]{2,64}$/.test(id) || !value || typeof value !== 'object') return;
      providers.add(id);
      const entry = value as Record<string, unknown>;
      const key = cleanSettingString(entry.key);
      if (key) keys[id] = key;
    });
  }

  return {
    configPaths: OPENCODE_CONFIG_PATHS,
    authPaths: OPENCODE_AUTH_PATHS,
    configFound,
    authFound,
    providers: Array.from(providers).sort(),
    models,
    keys,
  };
}

function openCodeProviderModels(opencode: OpenCodeInspection): ProviderModelItem[] {
  const seen = new Set<string>();
  const items: ProviderModelItem[] = [];
  for (const model of opencode.models) {
    if (seen.has(model.id)) continue;
    seen.add(model.id);
    items.push({
      id: model.id,
      label: model.label,
      provider: 'opencode-free',
      providerLabel: 'OpenCode',
      note: model.providerId,
      isFree: true,
      upstream:
        model.providerId === 'openrouter'
          ? 'openrouter'
          : model.providerId === 'deepseek'
            ? 'deepseek'
            : model.providerId === 'kieai'
              ? 'kieai'
              : undefined,
    });
  }
  return items;
}

function getOrCreateSessionId(req: Request): { sessionId: string; isNew: boolean } {
  const headerToken = req.header('x-zof-session');
  if (headerToken && /^[a-f0-9]{32,64}$/i.test(headerToken) && sessionKeyStore.has(headerToken)) {
    return { sessionId: headerToken, isNew: false };
  }
  const newToken = crypto.randomBytes(24).toString('hex');
  sessionKeyStore.set(newToken, { updatedAt: Date.now() });
  return { sessionId: newToken, isNew: true };
}

function resolveApiKeys(req: Request): ResolvedApiKeys {
  const headerToken = req.header('x-zof-session');
  const session = headerToken ? sessionKeyStore.get(headerToken) : undefined;
  const opencode = inspectOpenCode();
  const envOpenRouter = process.env.OPENROUTER_API_KEY?.trim() || '';
  const envDeepSeek = process.env.DEEPSEEK_API_KEY?.trim() || '';
  const envKieAi = process.env.KIEAI_API_KEY?.trim() || process.env.KIE_API_KEY?.trim() || '';
  const envElevenLabs = process.env.ELEVENLABS_API_KEY?.trim() || '';

  return {
    openrouterKey:
      session?.openrouterKey ||
      studioSettings.openrouterKey ||
      opencode.keys.openrouter ||
      envOpenRouter,
    deepseekKey:
      session?.deepseekKey ||
      studioSettings.deepseekKey ||
      opencode.keys.deepseek ||
      envDeepSeek,
    kieaiKey:
      session?.kieaiKey || studioSettings.kieaiKey || opencode.keys.kieai || envKieAi,
    elevenlabsKey:
      session?.elevenlabsKey || studioSettings.elevenlabsKey || envElevenLabs,
    customProviderName:
      studioSettings.customProviderName || studioSettings.customProviderBaseUrl || 'Custom provider',
    customProviderKey: session?.customProviderKey || studioSettings.customProviderKey,
    customProviderBaseUrl: studioSettings.customProviderBaseUrl,
  };
}

function providerIsConfigured(
  provider: AiProviderId,
  keys: ResolvedApiKeys,
  opencode: OpenCodeInspection
): boolean {
  if (provider === 'opencode-free') {
    return Boolean(keys.openrouterKey || keys.deepseekKey || opencode.providers.length > 0);
  }
  if (provider === 'deepseek') return Boolean(keys.deepseekKey);
  if (provider === 'openrouter') return Boolean(keys.openrouterKey);
  if (provider === 'kieai') return Boolean(keys.kieaiKey);
  return Boolean(keys.customProviderKey && keys.customProviderBaseUrl);
}

function buildSettingsResponse(req: Request, sessionId?: string) {
  const keys = resolveApiKeys(req);
  const opencode = inspectOpenCode();
  return {
    ok: true,
    sessionToken: sessionId,
    settingsFile: SETTINGS_FILE,
    projectFile: CURRENT_PROJECT_FILE,
    persisted: true,
    keysLoadedFromDisk: fs.existsSync(SETTINGS_FILE),
    openrouterConfigured: Boolean(keys.openrouterKey),
    openrouterMask: maskApiKey(keys.openrouterKey),
    deepseekConfigured: Boolean(keys.deepseekKey),
    deepseekMask: maskApiKey(keys.deepseekKey),
    kieaiConfigured: Boolean(keys.kieaiKey),
    kieaiMask: maskApiKey(keys.kieaiKey),
    elevenlabsConfigured: Boolean(keys.elevenlabsKey),
    elevenlabsMask: maskApiKey(keys.elevenlabsKey),
    customConfigured: Boolean(keys.customProviderKey && keys.customProviderBaseUrl),
    customProviderName: studioSettings.customProviderName,
    customProviderBaseUrl: studioSettings.customProviderBaseUrl,
    customProviderMask: maskApiKey(keys.customProviderKey),
    providers: AI_PROVIDERS.map((provider) => ({
      ...provider,
      configured: providerIsConfigured(provider.id, keys, opencode),
    })),
    models: ALL_AI_MODELS,
    preferences: {
      provider: studioSettings.aiProvider,
      modelId: studioSettings.aiModel,
      voiceId: studioSettings.voiceId,
      voiceModelId: studioSettings.voiceModelId,
      voiceStability: studioSettings.voiceStability,
      voiceSimilarityBoost: studioSettings.voiceSimilarityBoost,
      voiceStyle: studioSettings.voiceStyle,
      voiceSpeakerBoost: studioSettings.voiceSpeakerBoost,
      voiceSpeed: studioSettings.voiceSpeed,
      visualStyle: studioSettings.visualStyle,
      aspectRatio: studioSettings.aspectRatio,
      fps: studioSettings.fps,
      scriptLanguage: studioSettings.scriptLanguage,
      scriptDepth: studioSettings.scriptDepth,
      creativeCodeMode: studioSettings.creativeCodeMode,
      scriptPacing: studioSettings.scriptPacing,
      captionAnimationStyle: studioSettings.captionAnimationStyle,
      captionColors: studioSettings.captionColors,
      captionBottomOffset: studioSettings.captionBottomOffset,
      wordsPerScreen: studioSettings.wordsPerScreen,
      captionsEnabled: studioSettings.captionsEnabled,
      respectSafeZone: studioSettings.respectSafeZone,
      brandKit: studioSettings.brandKit,
      sfx: {
        enabled: studioSettings.sfxEnabled,
        volume: studioSettings.sfxVolume,
      },
      sfxMode: studioSettings.sfxMode,
      backgroundPreset: studioSettings.backgroundPreset,
    },
    opencode: {
      configPaths: opencode.configPaths,
      authPaths: opencode.authPaths,
      configFound: opencode.configFound,
      authFound: opencode.authFound,
      providers: opencode.providers,
    },
  };
}

const VISUAL_TYPES = new Set([
  'title-hero',
  'stat-number',
  'comparison-box',
  'bar-chart',
  'line-chart',
  'circular-gauge',
  'step-timeline',
  'notification-card',
  'warning-card',
  'editorial-quote',
  'bullet-list',
  'cta',
  'custom',
  'custom-tsx',
  'generative-scene',
]);

const LEGACY_VISUAL_TYPE_MAP: Record<string, string> = {
  'stat-card': 'stat-number',
  comparison: 'comparison-box',
  quote: 'editorial-quote',
  'chart-bar': 'bar-chart',
  'bullet-list': 'bullet-list',
  'title-hero': 'title-hero',
};

function normalizeVisualType(raw: string): string {
  const value = raw.trim().toLowerCase();
  const mapped = LEGACY_VISUAL_TYPE_MAP[value] || value;
  return VISUAL_TYPES.has(mapped) ? mapped : 'stat-number';
}

const SFX_CATALOG_IDS = new Set([
  'whoosh-soft',
  'whoosh-whip',
  'pop-soft',
  'click-subtle',
  'slide',
  'type-tick',
  'toggle-soft',
  'impact-soft',
  // Legacy ids stay mapped to the clean CC0 assets for older saved projects.
  'whoosh-fast',
  'whoosh-deep',
  'pop-bubble',
  'pop-sharp',
  'alert-warning',
  'cash-register',
  'typing-click',
  'cinematic-hit',
  'bass-drop',
  'riser-build',
]);

const FORBIDDEN_SFX_IDS = new Set(['ding-success', 'notification-chime']);

const SFX_AUTO_MATCH: Record<string, string> = {
  'title-hero': 'impact-soft',
  'stat-number': 'pop-soft',
  'comparison-box': 'whoosh-soft',
  'bar-chart': 'click-subtle',
  'line-chart': 'slide',
  'circular-gauge': 'impact-soft',
  'step-timeline': 'type-tick',
  'notification-card': 'click-subtle',
  'warning-card': 'impact-soft',
  'editorial-quote': 'whoosh-soft',
  'bullet-list': 'pop-soft',
  cta: 'click-subtle',
  custom: 'pop-soft',
  'generative-scene': 'whoosh-soft',
};

function resolveSceneSfxSrc(
  selection: string | undefined,
  visualType: string
): string | undefined {
  const autoMatch = SFX_AUTO_MATCH[normalizeVisualType(visualType)] || 'pop-soft';
  const chosen = selection === 'auto' ? autoMatch : (selection || 'none').trim();

  if (chosen === 'none' || !chosen || FORBIDDEN_SFX_IDS.has(chosen)) return undefined;
  if (SFX_CATALOG_IDS.has(chosen)) return `sfx/${chosen}.wav`;

  const candidate = chosen.replace(/^\/?sfx\//, '');
  if (
    !candidate.includes('..') &&
    /^[a-zA-Z0-9._-]+\.(mp3|wav|ogg)$/.test(candidate) &&
    fs.existsSync(path.join(SFX_DIR, candidate))
  ) {
    return `sfx/${candidate}`;
  }

  return `sfx/${autoMatch}.wav`;
}

function buildFallbackScenes(
  topic: string,
  language: string,
  depth: string = 'analytical',
): RenderScenePayload[] {
  const cleanTopic = topic.trim() || 'How AI is changing short-form video production';
  const focus = cleanTopic.replace(/^["'«»]+|["'«»]+$/g, '').slice(0, 72);
  const shortFocus = focus.split(/\s+/).slice(0, 7).join(' ');
  const makeId = () => `scene-${crypto.randomUUID().slice(0, 8)}`;
  const isEn = language === 'en';

  const englishBase: RenderScenePayload[] = [
      {
        id: makeId(),
        title: `The ${shortFocus} trap`,
        narration: `Most people get ${shortFocus} wrong, and it quietly costs them more than they think.`,
        pose: 'shocked',
        visualType: 'title-hero',
        visualLabel: `The core of ${shortFocus}`,
        visualValue: focus,
        layout: 'centered',
        camera: 'push-in',
        sfxId: 'impact-soft',
        sfxAt: 0.2,
        showCharacter: true,
        durationSec: 4.2,
      },
      {
        id: makeId(),
        title: 'Effort is not the issue',
        narration: `The problem is not effort. It is the hidden sequence behind ${shortFocus}.`,
        pose: 'thinking',
        visualType: 'comparison-box',
        visualLabel: `${shortFocus}: effort vs. sequence`,
        visualValue: `Surface effort | Hidden sequence behind ${shortFocus}`,
        layout: 'split',
        camera: 'pan-left',
        sfxId: 'none',
        showCharacter: false,
        durationSec: 4.8,
      },
      {
        id: makeId(),
        title: 'The loop',
        narration: 'Watch the loop: motivation, doubt, pause, then guilt. It repeats on autopilot.',
        pose: 'explaining',
        visualType: 'generative-scene',
        visualLabel: 'The hidden loop',
        visualValue: 'Motivation | Doubt | Pause | Guilt',
        visualKeywords: ['Motivation', 'Doubt', 'Pause', 'Guilt'],
        motif: 'cycle',
        layout: 'stacked',
        camera: 'slow-zoom-out',
        sfxId: 'none',
        showCharacter: false,
        durationSec: 5.2,
      },
      {
        id: makeId(),
        title: 'One clean interrupt',
        narration: 'Name the loop, interrupt it once, and the whole pattern loses power.',
        pose: 'pointing',
        visualType: 'generative-scene',
        visualLabel: 'Break the pattern',
        visualValue: 'Name it | Interrupt it | Replace it',
        visualKeywords: ['Name it', 'Interrupt it', 'Replace it'],
        motif: 'flow',
        layout: 'overlay',
        camera: 'push-in',
        sfxId: 'none',
        showCharacter: false,
        durationSec: 4.6,
      },
      {
        id: makeId(),
        title: 'Measurable shift',
        narration: 'One small shift changes the result more than a month of random effort.',
        pose: 'celebrating',
        visualType: 'stat-number',
        visualLabel: 'One deliberate shift',
        visualValue: '+1 measurable change',
        layout: 'centered',
        camera: 'slow-zoom-in',
        sfxId: 'pop-soft',
        sfxAt: 0.3,
        showCharacter: true,
        durationSec: 4,
      },
      {
        id: makeId(),
        title: 'The warning',
        narration: 'Skip the interrupt and the same loop returns stronger tomorrow.',
        pose: 'sad',
        visualType: 'warning-card',
        visualLabel: 'The loop returns',
        visualValue: `Ignore it | Repeat ${shortFocus}`,
        layout: 'split',
        camera: 'pan-right',
        sfxId: 'none',
        showCharacter: true,
        durationSec: 4.4,
      },
      {
        id: makeId(),
        title: 'Start today',
        narration: `Pick one tiny action for ${shortFocus} today and repeat it tomorrow.`,
        pose: 'happy',
        visualType: 'cta',
        visualLabel: 'Your next step',
        visualValue: `One focused action for ${shortFocus}`,
        layout: 'centered',
        camera: 'static',
        sfxId: 'none',
        showCharacter: true,
        durationSec: 3.8,
      },
  ];

  const arabicBase: RenderScenePayload[] = [
    {
      id: makeId(),
      title: `فخ ${shortFocus}`,
      narration: `أغلب الناس يخطئون في ${shortFocus}، والثمن الحقيقي يظهر لاحقاً.`,
      pose: 'shocked',
      visualType: 'title-hero',
      visualLabel: `جوهر ${shortFocus}`,
      visualValue: focus,
      layout: 'centered',
      camera: 'push-in',
      sfxId: 'impact-soft',
      sfxAt: 0.2,
      showCharacter: true,
      durationSec: 4.2,
    },
    {
      id: makeId(),
      title: 'المشكلة ليست الجهد',
      narration: `المشكلة ليست في الجهد، بل في التسلسل الخفي وراء ${shortFocus}.`,
      pose: 'thinking',
      visualType: 'comparison-box',
      visualLabel: `${shortFocus}: الجهد مقابل التسلسل`,
      visualValue: `جهد سطحي | تسلسل خفي في ${shortFocus}`,
      layout: 'split',
      camera: 'pan-left',
      sfxId: 'none',
      showCharacter: false,
      durationSec: 4.8,
    },
    {
      id: makeId(),
      title: 'الحلقة المفرغة',
      narration: 'لاحظ الحلقة: حماس، ثم تراجع، ثم توقف، ثم ذنب. وتتكرر تلقائياً.',
      pose: 'explaining',
      visualType: 'generative-scene',
      visualLabel: 'الحلقة الخفية',
      visualValue: 'حماس | تراجع | توقف | ذنب',
      visualKeywords: ['حماس', 'تراجع', 'توقف', 'ذنب'],
      motif: 'cycle',
      layout: 'stacked',
      camera: 'slow-zoom-out',
      sfxId: 'none',
      showCharacter: false,
      durationSec: 5.2,
    },
    {
      id: makeId(),
      title: 'اقطع الحلقة',
      narration: 'سمّ الحلقة، واقطعها مرة واحدة، فيفقد النمط كله قوته.',
      pose: 'pointing',
      visualType: 'generative-scene',
      visualLabel: 'اكسر النمط',
      visualValue: 'سمّها | أوقفها | استبدلها',
      visualKeywords: ['سمّها', 'أوقفها', 'استبدلها'],
      motif: 'flow',
      layout: 'overlay',
      camera: 'push-in',
      sfxId: 'none',
      showCharacter: false,
      durationSec: 4.6,
    },
    {
      id: makeId(),
      title: 'تغيير قابل للقياس',
      narration: 'تغيير واحد صغير يغيّر النتيجة أكثر من شهر من الجهد العشوائي.',
      pose: 'celebrating',
      visualType: 'stat-number',
      visualLabel: 'خطوة واحدة مدروسة',
      visualValue: '+1 تحسّن قابل للقياس',
      layout: 'centered',
      camera: 'slow-zoom-in',
      sfxId: 'pop-soft',
      sfxAt: 0.3,
      showCharacter: true,
      durationSec: 4,
    },
    {
      id: makeId(),
      title: 'التحذير',
      narration: 'تجاهل القطع، وستعود نفس الحلقة أقوى غداً.',
      pose: 'sad',
      visualType: 'warning-card',
      visualLabel: 'الحلقة تعود',
      visualValue: `تجاهلها | كرر ${shortFocus}`,
      layout: 'split',
      camera: 'pan-right',
      sfxId: 'none',
      showCharacter: true,
      durationSec: 4.4,
    },
    {
      id: makeId(),
      title: 'ابدأ الآن',
      narration: `اختر خطوة صغيرة واحدة لـ ${shortFocus} اليوم وكررها غداً.`,
      pose: 'happy',
      visualType: 'cta',
      visualLabel: 'خطوتك التالية',
      visualValue: `إجراء واحد مركز لـ ${shortFocus}`,
      layout: 'centered',
      camera: 'static',
      sfxId: 'none',
      showCharacter: true,
      durationSec: 3.8,
    },
  ];

  const base = isEn ? englishBase : arabicBase;
  if (depth === 'condensed') {
    return base;
  }

  const deepExtras: RenderScenePayload[] = isEn
    ? [
        {
          id: makeId(),
          title: 'The hidden mechanism',
          narration: `The real mechanism behind ${shortFocus} is a feedback loop, not a lack of discipline.`,
          pose: 'explaining',
          visualType: 'generative-scene',
          visualLabel: 'Mechanism',
          visualValue: 'Trigger | Reaction | Reinforcement',
          visualKeywords: ['Trigger', 'Reaction', 'Reinforcement'],
          motif: 'flow',
          layout: 'stacked',
          camera: 'push-in',
          sfxId: 'none',
          showCharacter: false,
          durationSec: 4.5,
        },
        {
          id: makeId(),
          title: 'The costly mistake',
          narration: 'The costly mistake is fixing the symptom while leaving the trigger untouched.',
          pose: 'facepalm',
          visualType: 'warning-card',
          visualLabel: 'Common mistake',
          visualValue: 'Fix the symptom | Ignore the trigger',
          layout: 'split',
          camera: 'pan-left',
          sfxId: 'none',
          showCharacter: true,
          durationSec: 4.3,
        },
        {
          id: makeId(),
          title: 'The contrast',
          narration: 'People who win here change one variable and measure it, instead of changing everything.',
          pose: 'pointing',
          visualType: 'comparison-box',
          visualLabel: 'Before vs after',
          visualValue: 'Change everything | Change one variable',
          layout: 'split',
          camera: 'pan-right',
          sfxId: 'none',
          showCharacter: false,
          durationSec: 4.4,
        },
      ]
    : [
        {
          id: makeId(),
          title: 'الآلية الخفية',
          narration: `الآلية الحقيقية وراء ${shortFocus} حلقة تغذية راجعة، وليست نقص إرادة.`,
          pose: 'explaining',
          visualType: 'generative-scene',
          visualLabel: 'الآلية',
          visualValue: 'محفّز | رد فعل | تعزيز',
          visualKeywords: ['محفّز', 'رد فعل', 'تعزيز'],
          motif: 'flow',
          layout: 'stacked',
          camera: 'push-in',
          sfxId: 'none',
          showCharacter: false,
          durationSec: 4.5,
        },
        {
          id: makeId(),
          title: 'الخطأ المكلف',
          narration: 'الخطأ المكلف أن تعالج العَرَض وتترك المحفّز كما هو.',
          pose: 'facepalm',
          visualType: 'warning-card',
          visualLabel: 'خطأ شائع',
          visualValue: 'عالج العَرَض | تجاهل المحفّز',
          layout: 'split',
          camera: 'pan-left',
          sfxId: 'none',
          showCharacter: true,
          durationSec: 4.3,
        },
        {
          id: makeId(),
          title: 'الفارق',
          narration: 'الذين ينجحون هنا يغيّرون متغيراً واحداً ويقيسونه، لا كل شيء.',
          pose: 'pointing',
          visualType: 'comparison-box',
          visualLabel: 'قبل وبعد',
          visualValue: 'غيّر كل شيء | غيّر متغيراً واحداً',
          layout: 'split',
          camera: 'pan-right',
          sfxId: 'none',
          showCharacter: false,
          durationSec: 4.4,
        },
      ];

  return [...base.slice(0, -1), ...deepExtras, base[base.length - 1]];
}

const SFX_PIVOTAL_TYPES = new Set([
  'line-chart',
  'bar-chart',
  'circular-gauge',
  'stat-number',
  'warning-card',
  'comparison-box',
  'cta',
]);

const SFX_SOFT_MOOD =
  /(هادئ|تأمل|سكون|صمت|حزين|حنين|ذكرى|دافئ|calm|soft|quiet|reflective|emotional|memory|gentle|intimate)/i;

const SFX_BY_TYPE: Record<string, string> = {
  'line-chart': 'slide',
  'bar-chart': 'whoosh-soft',
  'circular-gauge': 'impact-soft',
  'stat-number': 'whoosh-soft',
  'warning-card': 'impact-soft',
  'comparison-box': 'whoosh-soft',
  cta: 'click-subtle',
};

const SILENT_SFX_BY_TYPE: Record<string, string[]> = {
  'title-hero': ['impact-soft', 'whoosh-soft', 'slide'],
  'stat-number': ['pop-soft', 'click-subtle', 'whoosh-soft'],
  'comparison-box': ['whoosh-soft', 'pop-soft', 'click-subtle'],
  'bar-chart': ['click-subtle', 'type-tick', 'whoosh-soft'],
  'line-chart': ['slide', 'whoosh-soft', 'impact-soft'],
  'circular-gauge': ['impact-soft', 'slide', 'pop-soft'],
  'step-timeline': ['type-tick', 'click-subtle', 'whoosh-soft'],
  'notification-card': ['click-subtle', 'pop-soft', 'type-tick'],
  'warning-card': ['impact-soft', 'whoosh-soft', 'slide'],
  'editorial-quote': ['whoosh-soft', 'slide', 'click-subtle'],
  'bullet-list': ['pop-soft', 'click-subtle', 'type-tick'],
  cta: ['click-subtle', 'pop-soft', 'slide'],
  custom: ['pop-soft', 'click-subtle', 'whoosh-soft'],
  'custom-tsx': ['whoosh-soft', 'click-subtle', 'slide'],
  'generative-scene': ['whoosh-soft', 'slide', 'pop-soft'],
};

const SILENT_SFX_CALM = ['whoosh-soft', 'slide', 'click-subtle'];

type CurateSfxOptions = {
  voiceoverEnabled?: boolean;
  sfxEnabled?: boolean;
};

function curateSceneSfx(
  scenes: RenderScenePayload[],
  topic: string,
  options: CurateSfxOptions = {},
): RenderScenePayload[] {
  if (scenes.length === 0) return scenes;
  if (options.sfxEnabled === false) {
    return scenes.map((scene) => ({ ...scene, sfxId: 'none', sfxAt: 0 }));
  }

  const silentVisualMode = options.voiceoverEnabled === false;
  const topicNight = isNightMoodText(topic);
  const evaluations = scenes.map((scene, index) => {
    const type = normalizeVisualType(scene.visualType);
    const moodText = [
      topic,
      scene.title,
      scene.narration,
      scene.visualLabel,
      scene.visualValue,
      scene.ambientScene,
      scene.background,
    ]
      .filter(Boolean)
      .join(' ');
    const night = topicNight || isNightMoodText(moodText);
    const calm = SFX_SOFT_MOOD.test(moodText);
    const pivotal = SFX_PIVOTAL_TYPES.has(type);
    const multiStep =
      type === 'step-timeline' ||
      type === 'bullet-list' ||
      type === 'generative-scene' ||
      type === 'comparison-box';
    const explicit = Boolean(
      scene.sfxId &&
        scene.sfxId !== 'none' &&
        scene.sfxId !== 'auto' &&
        SFX_CATALOG_IDS.has(scene.sfxId),
    );
    const score =
      (type === 'line-chart' || type === 'bar-chart' || type === 'circular-gauge'
        ? 3
        : 0) +
      (pivotal ? 2 : 0) +
      (multiStep ? 1 : 0) +
      (explicit ? 2 : 0);
    return { scene, index, type, night, calm, pivotal, multiStep, explicit, score };
  });

  const chosen = new Set<number>();
  const pickWithBreathingRoom = (
    candidates: typeof evaluations,
    target: number,
  ): Set<number> => {
    const result = new Set<number>();
    for (const entry of candidates) {
      if (result.has(entry.index)) continue;
      if (result.has(entry.index - 1) || result.has(entry.index + 1)) continue;
      result.add(entry.index);
      if (result.size >= target) break;
    }
    return result;
  };

  if (silentVisualMode) {
    const target = Math.min(
      scenes.length,
      Math.max(1, Math.ceil(scenes.length * 0.6)),
    );
    const candidates = evaluations
      .slice()
      .sort(
        (a, b) =>
          Number(b.explicit) - Number(a.explicit) ||
          b.score - a.score ||
          a.index - b.index,
      );
    for (const index of pickWithBreathingRoom(candidates, target)) {
      chosen.add(index);
    }
  } else {
    const maxSfx = Math.max(0, Math.floor(scenes.length * 0.35));
    if (!topicNight) {
      const candidates = evaluations
        .filter(
          (entry) =>
            !entry.night && !entry.calm && entry.pivotal && entry.score > 0,
        )
        .sort((a, b) => b.score - a.score || a.index - b.index);
      for (const index of pickWithBreathingRoom(candidates, maxSfx)) {
        chosen.add(index);
      }
    }
  }

  const earlySfxStart = (scene: RenderScenePayload, fallback: number): number => {
    const duration = Math.max(0.5, Number(scene.durationSec) || 0);
    const maxStart = Math.max(0.12, Math.min(1.2, duration * 0.25));
    const requested = Number(scene.sfxAt);
    const start = Number.isFinite(requested) ? requested : fallback;
    return Number(Math.min(maxStart, Math.max(0.12, start)).toFixed(2));
  };

  return scenes.map((scene, index) => {
    const entry = evaluations[index];
    if (!chosen.has(index)) {
      return { ...scene, sfxId: 'none', sfxAt: 0 };
    }

    const previousSound =
      scene.sfxId && !['auto', 'none'].includes(scene.sfxId)
        ? scene.sfxId
        : '';
    const explicitSound =
      previousSound &&
      !FORBIDDEN_SFX_IDS.has(previousSound) &&
      SFX_CATALOG_IDS.has(previousSound)
        ? previousSound
        : '';

    if (silentVisualMode) {
      const palette =
        entry.night || entry.calm
          ? SILENT_SFX_CALM
          : SILENT_SFX_BY_TYPE[entry.type] || [
              'pop-soft',
              'click-subtle',
              'whoosh-soft',
            ];
      const sound =
        explicitSound || palette[index % palette.length] || 'pop-soft';
      return {
        ...scene,
        sfxId: sound,
        sfxAt: earlySfxStart(
          scene,
          Math.min(0.45, 0.15 + (index % 4) * 0.07),
        ),
      };
    }

    const sound =
      entry.night || entry.calm
        ? SFX_BY_TYPE[entry.type] || 'whoosh-soft'
        : explicitSound || SFX_BY_TYPE[entry.type] || 'whoosh-soft';
    return {
      ...scene,
      sfxId: sound,
      sfxAt: earlySfxStart(scene, 0.2),
    };
  });
}

function hashTopic(value: string): number {
  return Array.from(value).reduce(
    (total, char, index) => (total + char.charCodeAt(0) * (index + 5)) % 100000,
    0,
  );
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value ?? null);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

function contentHash(value: unknown): string {
  return crypto
    .createHash('sha256')
    .update(stableStringify(value))
    .digest('hex');
}

let sceneArtifactCache: SceneArtifactCacheStore | null = null;

function loadSceneArtifactCache(): SceneArtifactCacheStore {
  if (sceneArtifactCache) return sceneArtifactCache;
  try {
    const parsed = JSON.parse(
      fs.readFileSync(SCENE_CACHE_INDEX_FILE, 'utf8'),
    ) as Partial<SceneArtifactCacheStore>;
    sceneArtifactCache = {
      version: 1,
      audio: parsed.audio && typeof parsed.audio === 'object' ? parsed.audio : {},
      segments:
        parsed.segments && typeof parsed.segments === 'object' ? parsed.segments : {},
    };
  } catch {
    sceneArtifactCache = { version: 1, audio: {}, segments: {} };
  }
  return sceneArtifactCache;
}

function saveSceneArtifactCache(): void {
  if (!sceneArtifactCache) return;
  try {
    fs.mkdirSync(SCENE_CACHE_DIR, { recursive: true });
    writeJsonFile(SCENE_CACHE_INDEX_FILE, sceneArtifactCache);
  } catch {
    // Caching must never break a render or a smart edit.
  }
}

function sceneAudioCacheHash(
  scene: RenderScenePayload,
  voice: {
    voiceId: string;
    modelId: string;
    stability: number;
    similarityBoost: number;
    style: number;
    speakerBoost: boolean;
    speed: number;
  },
): string {
  return contentHash({
    narration: scene.narration,
    voiceId: voice.voiceId,
    modelId: voice.modelId,
    stability: voice.stability,
    similarityBoost: voice.similarityBoost,
    style: voice.style,
    speakerBoost: voice.speakerBoost,
    speed: voice.speed,
  });
}

function readGeneratedComponentSource(componentName: string | undefined): string | null {
  if (!componentName || !isValidGeneratedComponentName(componentName)) return null;
  try {
    return fs.readFileSync(path.join(GENERATED_DIR, `${componentName}.tsx`), 'utf8');
  } catch {
    return null;
  }
}

function sceneSegmentCacheHash(
  scene: RenderScenePayload,
  job: RenderJob,
  startFrame: number,
  endFrame: number,
): string {
  const componentSource = readGeneratedComponentSource(scene.generatedComponent);
  return contentHash({
    scene,
    generatedComponentHash: componentSource ? contentHash(componentSource) : null,
    visualStyle: job.visualStyle,
    aspectRatio: job.aspectRatio,
    fps: job.fps,
    brandKit: job.brandKit,
    scriptLanguage: job.scriptLanguage,
    scriptDepth: job.scriptDepth,
    creativeCodeMode: job.creativeCodeMode,
    scriptPacing: job.scriptPacing,
    captionAnimationStyle: job.captionAnimationStyle,
    captionColors: job.captionColors,
    captionBottomOffset: job.captionBottomOffset,
    wordsPerScreen: job.wordsPerScreen,
    captionsEnabled: job.captionsEnabled,
    voiceoverEnabled: job.voiceoverEnabled,
    cleanBrollMode: job.cleanBrollMode,
    respectSafeZone: job.respectSafeZone,
    sfxEnabled: job.sfxEnabled,
    transitionDurationInFrames: TRANSITION_DURATION_IN_FRAMES,
    startFrame,
    endFrame,
  });
}

function seedSceneAudioCache(
  scenes: RenderScenePayload[],
  voice: {
    voiceId: string;
    modelId: string;
    stability: number;
    similarityBoost: number;
    style: number;
    speakerBoost: boolean;
    speed: number;
  },
): void {
  const cache = loadSceneArtifactCache();
  let changed = false;
  for (const scene of scenes) {
    const audioSrc = scene.audioSrc?.replace(/^\/+/, '');
    if (!audioSrc) continue;
    const hash = sceneAudioCacheHash(scene, voice);
    cache.audio[hash] = {
      hash,
      audioSrc,
      audioDuration: scene.audioDuration,
      updatedAt: Date.now(),
    };
    changed = true;
  }
  if (changed) saveSceneArtifactCache();
}

function sceneDurationInFrames(scene: RenderScenePayload, fps: number): number {
  const explicit = Number(scene.durationInFrames);
  if (Number.isFinite(explicit) && explicit > 0) {
    return Math.max(1, Math.round(explicit));
  }
  return Math.max(1, Math.round(scene.durationSec * fps));
}

function applyPromptOnlyPacing(
  scenes: RenderScenePayload[],
  targetDuration: ExportTargetDuration | undefined,
  fps: number,
): number {
  if (scenes.length === 0) return 0;
  const effective = targetDuration && targetDuration !== 'auto' ? targetDuration : '60';
  const seconds = Number(effective);
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;

  const targetFrames = Math.max(1, Math.round(seconds * fps));
  const contentFrames = Math.max(scenes.length, targetFrames);
  const baseFrames = Math.floor(contentFrames / scenes.length);
  const remainder = contentFrames - baseFrames * scenes.length;

  scenes.forEach((scene, index) => {
    const frames = Math.max(1, baseFrames + (index < remainder ? 1 : 0));
    scene.audioSrc = undefined;
    scene.audioDataUrl = undefined;
    scene.audioDuration = undefined;
    scene.durationInFrames = frames;
    scene.durationSec = Number((frames / fps).toFixed(6));
  });

  return targetFrames;
}

function sceneWindows(scenes: RenderScenePayload[]): Array<{
  id: string;
  index: number;
  startSecond: number;
  endSecond: number;
}> {
  let cursor = 0;
  return scenes.map((scene, index) => {
    const startSecond = cursor;
    cursor += Math.max(0.1, scene.durationSec || 0);
    return {
      id: scene.id,
      index,
      startSecond: Number(startSecond.toFixed(3)),
      endSecond: Number(cursor.toFixed(3)),
    };
  });
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const h = ((hue % 360) + 360) % 360;
  const s = Math.min(100, Math.max(0, saturation)) / 100;
  const l = Math.min(100, Math.max(0, lightness)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const segment = Math.floor(h / 60) % 6;
  const rgb =
    segment === 0
      ? [c, x, 0]
      : segment === 1
        ? [x, c, 0]
        : segment === 2
          ? [0, c, x]
          : segment === 3
            ? [0, x, c]
            : segment === 4
              ? [x, 0, c]
              : [c, 0, x];
  return `#${rgb
    .map((channel) =>
      Math.round((channel + m) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

function buildAiDesign(topic: string, visualStyle: string) {
  const seed = hashTopic(topic || 'zof-studio');
  const hue = seed % 360;
  const dark = visualStyle === 'modern-dark' || visualStyle === 'modern_dark';
  return {
    accentColor: hslToHex(hue, 78, dark ? 58 : 46),
    bgColor: dark ? hslToHex(hue + 12, 42, 8) : hslToHex(hue + 18, 26, 96),
    secondaryColor: hslToHex(hue + 52, 72, dark ? 62 : 50),
    highlightColor: hslToHex(hue + 128, 70, dark ? 60 : 44),
    mood: ['cinematic glow', 'editorial calm', 'kinetic energy', 'deep focus', 'electric dusk'][seed % 5],
    seed,
  };
}

function applySceneVariety(
  scenes: RenderScenePayload[],
  requestedPreset: string,
  topic: string,
): RenderScenePayload[] {
  const preset = normalizeBackgroundPreset(requestedPreset);
  const seed = hashTopic(topic || scenes.map((scene) => scene.title).join(' '));
  const layouts: SceneLayout[] = ['split', 'overlay', 'stacked', 'centered'];
  const cameras: CameraMove[] = [
    'slow-zoom-in',
    'pan-left',
    'push-in',
    'slow-zoom-out',
    'pan-right',
  ];
  let previousLayout: SceneLayout | undefined;
  let previousCamera: CameraMove | undefined;
  let previousBackground: BackgroundPresetId | undefined;

  return scenes.map((scene, index) => {
    let layout = scene.layout;
    if (!layout || layout === previousLayout) {
      layout = layouts[(index + seed) % layouts.length];
      if (layout === previousLayout) {
        layout = layouts[(layouts.indexOf(layout) + 1) % layouts.length];
      }
    }
    let camera = scene.camera;
    if (!camera || camera === previousCamera) {
      camera = cameras[(index + seed) % cameras.length];
      if (camera === previousCamera) {
        camera = cameras[(cameras.indexOf(camera) + 1) % cameras.length];
      }
    }
    let backgroundPreset: BackgroundPresetId;
    if (preset === 'ai-free') {
      backgroundPreset =
        SCENE_BACKGROUND_PRESETS[(seed + index * 3) % SCENE_BACKGROUND_PRESETS.length];
      if (backgroundPreset === previousBackground) {
        const currentIndex = SCENE_BACKGROUND_PRESETS.indexOf(
          backgroundPreset as Exclude<BackgroundPresetId, 'ai-free'>,
        );
        backgroundPreset =
          SCENE_BACKGROUND_PRESETS[(currentIndex + 1) % SCENE_BACKGROUND_PRESETS.length];
      }
    } else {
      backgroundPreset = preset;
    }
    previousLayout = layout;
    previousCamera = camera;
    previousBackground = backgroundPreset;
    return {
      ...scene,
      layout,
      camera,
      backgroundPreset,
    };
  });
}

function normalizeScenes(rawScenes: unknown[]): RenderScenePayload[] {
  const validPoses = new Set([
    'idle',
    'walking',
    'explaining',
    'thinking',
    'shocked',
    'happy',
    'sad',
    'pointing',
    'celebrating',
    'idea',
    'facepalm',
  ]);
  const validLayouts = new Set<SceneLayout>(['split', 'stacked', 'overlay', 'centered']);
  const validCameras = new Set<CameraMove>([
    'slow-zoom-in',
    'slow-zoom-out',
    'pan-left',
    'pan-right',
    'push-in',
    'static',
  ]);

  return rawScenes.slice(0, 16).map((item, idx) => {
    const record = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const poseRaw = typeof record.pose === 'string' ? record.pose.toLowerCase() : 'explaining';
    const typeRaw = typeof record.visualType === 'string' ? record.visualType.toLowerCase() : 'stat-number';
    const durationRaw = Number(record.durationSec);
    const durationFramesRaw = Number(record.durationInFrames);
    const audioDataUrl = typeof record.audioDataUrl === 'string' ? record.audioDataUrl : undefined;
    const audioSrc = typeof record.audioSrc === 'string' ? record.audioSrc : undefined;
    const audioDurationRaw = Number(record.audioDuration);
    const sfxIdRaw =
      typeof record.sfxId === 'string' && record.sfxId.trim()
        ? record.sfxId.trim().slice(0, 300)
        : 'none';
    const sfxId = FORBIDDEN_SFX_IDS.has(sfxIdRaw) ? 'none' : sfxIdRaw;
    const sfxPrompt =
      typeof record.sfxPrompt === 'string' && record.sfxPrompt.trim()
        ? record.sfxPrompt.trim().slice(0, 450)
        : undefined;
    const sfxAtRaw = Number(record.sfxAt);
    const sfxCues = normalizeSfxCues(record.sfxCues)?.slice(0, 1);
    const layoutRaw = typeof record.layout === 'string' ? record.layout.toLowerCase() : '';
    const cameraRaw = typeof record.camera === 'string' ? record.camera.toLowerCase() : '';
    const background =
      typeof record.background === 'string' && record.background.trim()
        ? record.background.trim().slice(0, 300)
        : undefined;
    const backgroundPreset =
      typeof record.backgroundPreset === 'string' && (BACKGROUND_PRESET_IDS as readonly string[]).includes(record.backgroundPreset)
        ? record.backgroundPreset
        : undefined;
    const visualKeywords = Array.isArray(record.visualKeywords)
      ? record.visualKeywords
          .filter((word): word is string => typeof word === 'string' && Boolean(word.trim()))
          .map((word) => word.trim().slice(0, 48))
          .slice(0, 6)
      : typeof record.visualKeywords === 'string'
        ? record.visualKeywords
            .split(/[|,،·]/)
            .map((word) => word.trim().slice(0, 48))
            .filter(Boolean)
            .slice(0, 6)
        : undefined;
    const motifRaw = typeof record.motif === 'string' ? record.motif.trim().toLowerCase() : '';
    const motif = (GENERATIVE_MOTIFS as readonly string[]).includes(motifRaw) ? motifRaw : undefined;
    const showCharacterRaw = record.showCharacter;
    const showCharacter =
      typeof showCharacterRaw === 'boolean' ? showCharacterRaw : undefined;
    const generatedComponentRaw =
      typeof record.generatedComponent === 'string'
        ? record.generatedComponent.trim()
        : typeof record.customComponent === 'string'
          ? record.customComponent.trim()
          : '';
    const generatedComponent = /^[A-Za-z_$][A-Za-z0-9_$]{2,64}$/.test(generatedComponentRaw)
      ? generatedComponentRaw
      : undefined;
    const customCodeBrief =
      typeof record.customCodeBrief === 'string' && record.customCodeBrief.trim()
        ? record.customCodeBrief.trim().slice(0, 1200)
        : undefined;
    const characters = normalizeSceneCharacters(record.characters);
    const characterLayoutRaw =
      typeof record.characterLayout === 'string' ? record.characterLayout.toLowerCase() : '';
    const characterLayout =
      characterLayoutRaw === 'side-by-side' || characterLayoutRaw === 'top-bottom'
        ? (characterLayoutRaw as 'side-by-side' | 'top-bottom')
        : undefined;
    const ambientScene = normalizeAmbientScene(record.ambientScene);
    const sceneId =
      typeof record.id === 'string' && /^[a-zA-Z0-9._-]{2,80}$/.test(record.id.trim())
        ? record.id.trim()
        : `scene-${crypto.randomUUID().slice(0, 8)}`;
    return {
      id: sceneId,
      title: typeof record.title === 'string' && record.title.trim() ? record.title.trim().slice(0, 80) : `المشهد ${idx + 1}`,
      narration:
        typeof record.narration === 'string' && record.narration.trim()
          ? record.narration.trim().slice(0, 600)
          : 'نص تعليق صوتي للمشهد.',
      pose: validPoses.has(poseRaw) ? poseRaw : 'explaining',
      visualType: normalizeVisualType(typeRaw),
      visualLabel:
        typeof record.visualLabel === 'string' && record.visualLabel.trim()
          ? record.visualLabel.trim().slice(0, 80)
          : 'معلومة رئيسية',
      visualValue:
        typeof record.visualValue === 'string' && record.visualValue.trim()
          ? record.visualValue.trim().slice(0, 160)
          : '100%',
      visualPrompt:
        typeof record.visualPrompt === 'string' && record.visualPrompt.trim()
          ? record.visualPrompt.trim().slice(0, 500)
          : undefined,
      visualSvg:
        typeof record.visualSvg === 'string' && record.visualSvg.trim()
          ? record.visualSvg.trim().slice(0, 20000)
          : undefined,
      audioDataUrl,
      audioSrc,
      audioDuration:
        Number.isFinite(audioDurationRaw) && audioDurationRaw > 0
          ? Number(audioDurationRaw.toFixed(3))
          : undefined,
      sfxId,
      sfxPrompt,
      sfxAt: Number.isFinite(sfxAtRaw) ? Math.min(8, Math.max(0, Number(sfxAtRaw.toFixed(2)))) : 0,
      sfxCues,
      layout: validLayouts.has(layoutRaw as SceneLayout) ? (layoutRaw as SceneLayout) : undefined,
      camera: validCameras.has(cameraRaw as CameraMove) ? (cameraRaw as CameraMove) : undefined,
      background,
      backgroundPreset,
      visualKeywords: visualKeywords && visualKeywords.length > 0 ? visualKeywords : undefined,
      motif,
      showCharacter,
      generatedComponent,
      customCodeBrief,
      characters,
      characterLayout,
      ambientScene,
      durationSec:
        Number.isFinite(durationRaw) && durationRaw > 0
          ? Number(durationRaw.toFixed(3))
          : 4,
      durationInFrames:
        Number.isFinite(durationFramesRaw) && durationFramesRaw > 0
          ? Math.max(1, Math.round(durationFramesRaw))
          : undefined,
    };
  });
}

function extractJsonArray(text: string): unknown[] | null {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { scenes?: unknown[] }).scenes)) {
      return (parsed as { scenes: unknown[] }).scenes;
    }
  } catch {
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start !== -1 && end > start) {
      try {
        const sliced = JSON.parse(cleaned.slice(start, end + 1));
        if (Array.isArray(sliced)) return sliced;
      } catch {
        return null;
      }
    }
  }
  return null;
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        const parsed = JSON.parse(cleaned.slice(start, end + 1));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}

function readParentData(): ParentVideoData | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as ParentVideoData;
    if (!parsed || !Array.isArray(parsed.scenes)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeJsonFile(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

type MediaFileInfo = {
  name: string;
  type: 'video' | 'audio' | 'sfx';
  size: number;
  modified: number;
  url: string;
};

let remotionStudioProcess: ChildProcess | null = null;
let remotionStudioUiProcess: ChildProcess | null = null;
let lastStudioSpawnError: string | null = null;
let dashboardHttpServer: HttpServer | null = null;
let dashboardShuttingDown = false;

type StudioProcessKind = 'studio' | 'studio-ui';

interface StudioLaunchResult {
  running: boolean;
  started: boolean;
  port: number;
  url: string;
  pid?: number;
  pids?: number[];
  recovered?: boolean;
  external?: boolean;
  error?: string;
}

const activeExportProcesses = new Set<ChildProcess>();
const cancelledExportJobs = new Set<string>();
const exportStreamEmitters = new Map<
  string,
  (eventName: string, payload: Record<string, unknown>) => void
>();

function trackExportProcess(child: ChildProcess): ChildProcess {
  activeExportProcesses.add(child);
  const cleanup = () => {
    activeExportProcesses.delete(child);
  };
  child.once('close', cleanup);
  child.once('error', cleanup);
  return child;
}

function killProcessTree(child: ChildProcess): void {
  if (!child || child.killed) return;
  try {
    if (child.pid && process.platform !== 'win32') {
      process.kill(-child.pid, 'SIGKILL');
      return;
    }
  } catch {
    // Fall back to killing the direct child below.
  }
  try {
    child.kill('SIGKILL');
  } catch {
    // Process already exited.
  }
}

function killAllExportProcesses(): void {
  for (const child of Array.from(activeExportProcesses)) {
    killProcessTree(child);
  }
  activeExportProcesses.clear();
}

function shutdownDashboard(exitCode = 0): void {
  if (dashboardShuttingDown) return;
  dashboardShuttingDown = true;

  const forceExit = setTimeout(() => process.exit(exitCode), 3000);
  forceExit.unref();

  try {
    killAllExportProcesses();
  } catch {
    // Best-effort cleanup.
  }

  for (const kind of ['studio', 'studio-ui'] as const) {
    const child = trackedStudioProcess(kind);
    if (isProcessAlive(child)) {
      killProcessTree(child);
    }
    setTrackedStudioProcess(kind, null);
  }

  if (!dashboardHttpServer) {
    process.exit(exitCode);
    return;
  }

  dashboardHttpServer.close(() => process.exit(exitCode));
  dashboardHttpServer.closeAllConnections?.();
}

function isExportCancelled(jobId: string): boolean {
  return cancelledExportJobs.has(jobId);
}

function throwIfExportCancelled(jobId: string): void {
  if (isExportCancelled(jobId)) {
    throw new Error('تم إيقاف عملية التصدير بواسطة المستخدم.');
  }
}

function listMediaFiles(dir: string, type: MediaFileInfo['type'], urlPrefix: string): MediaFileInfo[] {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .filter((entry) => {
        if (type === 'video') return /\.(mp4|webm|mov|m4v)$/i.test(entry.name);
        return /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(entry.name);
      })
      .map((entry) => {
        const filePath = path.join(dir, entry.name);
        const stat = fs.statSync(filePath);
        return {
          name: entry.name,
          type,
          size: stat.size,
          modified: stat.mtimeMs,
          url: `${urlPrefix}/${encodeURIComponent(entry.name)}`,
        };
      })
      .sort((a, b) => b.modified - a.modified);
  } catch {
    return [];
  }
}

function safeMediaName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.trim();
  if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) return null;
  return name;
}

function collectReferencedAudio(): Set<string> {
  const referenced = new Set<string>();
  const addFromScenes = (scenes: unknown) => {
    if (!Array.isArray(scenes)) return;
    for (const item of scenes) {
      if (!item || typeof item !== 'object') continue;
      const record = item as Record<string, unknown>;
      const candidates = [record.audioSrc, record.audioDataUrl];
      for (const candidate of candidates) {
        if (typeof candidate !== 'string') continue;
        const cleaned = candidate.replace(/^\/+/, '').replace(/^audio\//, '');
        if (cleaned && !cleaned.startsWith('data:')) referenced.add(cleaned);
      }
    }
  };
  const data = readParentData();
  addFromScenes(data?.scenes);
  const project = readProjectState();
  addFromScenes(project?.scenes);
  return referenced;
}

function checkPortOpen(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    const finish = (open: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(1200);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

const STUDIO_START_TIMEOUT_MS = 45_000;
const STUDIO_START_POLL_MS = 400;

function isProcessAlive(child: ChildProcess | null): child is ChildProcess {
  return Boolean(
    child &&
      child.pid &&
      child.exitCode === null &&
      child.signalCode === null &&
      !child.killed,
  );
}

function isZombiePid(pid: number): boolean {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    const state = stat.slice(stat.lastIndexOf(')') + 2).charAt(0);
    return state === 'Z' || state === 'X' || state === 'x';
  } catch {
    return false;
  }
}

function isPidRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EPERM') return false;
  }
  return !isZombiePid(pid);
}

function trackedStudioProcess(kind: StudioProcessKind): ChildProcess | null {
  return kind === 'studio' ? remotionStudioProcess : remotionStudioUiProcess;
}

function setTrackedStudioProcess(kind: StudioProcessKind, child: ChildProcess | null): void {
  if (kind === 'studio') {
    remotionStudioProcess = child;
  } else {
    remotionStudioUiProcess = child;
  }
}

function resolveRemotionCli(): { command: string; args: string[] } {
  const cliPath = path.join(
    PROJECT_ROOT,
    'node_modules',
    '@remotion',
    'cli',
    'remotion-cli.js',
  );
  if (fs.existsSync(cliPath)) {
    return { command: process.execPath, args: [cliPath] };
  }
  return {
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['remotion'],
  };
}

function openStudioLogFd(): number | null {
  try {
    fs.mkdirSync(ZOF_HOME_DIR, { recursive: true });
    // Open synchronously so the descriptor exists before spawn(); a lazily
    // created WriteStream has fd: null at this point and spawn() rejects it.
    return fs.openSync(STUDIO_LOG_FILE, 'a');
  } catch {
    return null;
  }
}

function spawnStudioProcess(port: number, kind: StudioProcessKind): ChildProcess {
  lastStudioSpawnError = null;
  const { command, args } = resolveRemotionCli();
  const logFd = openStudioLogFd();
  const logStdio = logFd === null ? 'ignore' : logFd;
  let child: ChildProcess;
  try {
    child = spawn(
      command,
      [
        ...args,
        'studio',
        path.relative(PROJECT_ROOT, REMOTION_ENTRY),
        '--port',
        String(port),
        '--host',
        '127.0.0.1',
        '--no-open',
      ],
      {
        cwd: PROJECT_ROOT,
        env: { ...process.env },
        // Detached keeps Studio in its own process group so it survives the
        // dashboard request/server lifecycle and keeps running after export.
        detached: process.platform !== 'win32',
        stdio: ['ignore', logStdio, logStdio],
        windowsHide: true,
      },
    );
  } finally {
    // The child holds a duplicated descriptor; the parent copy is no longer
    // needed once spawn() returns.
    if (logFd !== null) {
      try {
        fs.closeSync(logFd);
      } catch {
        // Ignore double-close races.
      }
    }
  }

  const clearReference = () => {
    if (trackedStudioProcess(kind) === child) {
      setTrackedStudioProcess(kind, null);
    }
  };

  child.once('error', (error) => {
    lastStudioSpawnError = error instanceof Error ? error.message : String(error);
    console.error(`[studio] ${kind} failed to start:`, error);
    clearReference();
  });
  child.once('exit', (code, signal) => {
    console.warn(`[studio] ${kind} exited (code=${code ?? 'null'}, signal=${signal ?? 'null'})`);
    clearReference();
  });

  setTrackedStudioProcess(kind, child);
  child.unref();
  return child;
}

async function checkStudioHttp(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(2000),
    });
    return response.status > 0;
  } catch {
    return false;
  }
}

async function waitForStudio(
  port: number,
  child: ChildProcess,
  timeoutMs: number,
): Promise<'ready' | 'exited' | 'timeout'> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isProcessAlive(child)) {
      return (await checkPortOpen(port)) && (await checkStudioHttp(port)) ? 'ready' : 'exited';
    }
    if ((await checkPortOpen(port)) && (await checkStudioHttp(port))) {
      return 'ready';
    }
    await new Promise((resolve) => setTimeout(resolve, STUDIO_START_POLL_MS));
  }
  return 'timeout';
}

const studioLaunchPromises = new Map<StudioProcessKind, Promise<StudioLaunchResult>>();

async function ensureStudioProcess(
  kind: StudioProcessKind,
  port: number,
  timeoutMs = STUDIO_START_TIMEOUT_MS,
): Promise<StudioLaunchResult> {
  const inFlight = studioLaunchPromises.get(kind);
  if (inFlight) return inFlight;

  const launch = launchStudioProcess(kind, port, timeoutMs).finally(() => {
    if (studioLaunchPromises.get(kind) === launch) {
      studioLaunchPromises.delete(kind);
    }
  });
  studioLaunchPromises.set(kind, launch);
  return launch;
}

async function launchStudioProcess(
  kind: StudioProcessKind,
  port: number,
  timeoutMs: number,
): Promise<StudioLaunchResult> {
  const url = `http://localhost:${port}`;
  const tracked = trackedStudioProcess(kind);
  const trackedAlive = isProcessAlive(tracked);

  if (!trackedAlive && (await checkPortOpen(port))) {
    if (await checkStudioHttp(port)) {
      return {
        running: true,
        started: false,
        external: true,
        port,
        url,
      };
    }
    const pids = await findPidsOnPort(port);
    return {
      running: false,
      started: false,
      port,
      url,
      pids,
      error:
        pids.length > 0
          ? `المنفذ ${port} مشغول بعملية أخرى (PID: ${pids.join(', ')}). أوقفها أو أعد تشغيل خادم Zof Studio ثم أعد المحاولة.`
          : `المنفذ ${port} مفتوح لكنه لا يستجيب لـ Remotion Studio. تحقق من العمليات التي تستخدمه ثم أعد المحاولة.`,
    };
  }

  let child = trackedAlive ? tracked : null;
  if (!child) {
    try {
      child = spawnStudioProcess(port, kind);
    } catch (error) {
      return {
        running: false,
        started: false,
        port,
        url,
        error: error instanceof Error ? error.message : 'تعذر تشغيل Remotion Studio.',
      };
    }
  }

  let status = await waitForStudio(port, child, timeoutMs);
  let recovered = false;

  if (status === 'exited') {
    // The previous launch exited early (stale instance, crash, or a port race).
    // Clear the dead reference and try exactly once more so the dashboard can
    // recover without needing a server restart.
    setTrackedStudioProcess(kind, null);
    try {
      child = spawnStudioProcess(port, kind);
      recovered = true;
      status = await waitForStudio(port, child, timeoutMs);
    } catch (error) {
      return {
        running: false,
        started: true,
        recovered: true,
        port,
        url,
        error: error instanceof Error ? error.message : 'تعذر تشغيل Remotion Studio.',
      };
    }
  }

  if (status === 'ready') {
    return {
      running: true,
      started: true,
      recovered,
      port,
      url,
      ...(isProcessAlive(child) && child.pid ? { pid: child.pid } : {}),
    };
  }

  return {
    running: false,
    started: true,
    recovered,
    port,
    url,
    error:
      status === 'exited'
        ? lastStudioSpawnError
          ? `توقف Remotion Studio مباشرة بعد التشغيل: ${lastStudioSpawnError}`
          : 'توقف Remotion Studio مباشرة بعد التشغيل. راجع سجل Studio ثم أعد المحاولة.'
        : `تعذر تشغيل Remotion Studio على المنفذ ${port} خلال ${Math.round(timeoutMs / 1000)} ثانية.`,
  };
}

async function ensureRemotionStudio(): Promise<StudioLaunchResult> {
  return ensureStudioProcess('studio', REMOTION_STUDIO_RENDER_PORT);
}

function findPidsOnPort(port: number): Promise<number[]> {
  return new Promise((resolve) => {
    execFile(
      'lsof',
      ['-ti', `tcp:${port}`],
      { timeout: 5000, maxBuffer: 1024 * 1024 },
      (error, stdout) => {
        if (error && !stdout) {
          resolve([]);
          return;
        }
        const pids = String(stdout || '')
          .split(/\s+/)
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0 && value !== process.pid);
        resolve(Array.from(new Set(pids)));
      },
    );
  });
}

async function ensureRemotionStudioUi(): Promise<StudioLaunchResult> {
  return ensureStudioProcess('studio-ui', REMOTION_STUDIO_UI_PORT);
}

async function stopRemotionStudioUi(): Promise<{
  ok: boolean;
  running: boolean;
  port: number;
  pids?: number[];
  error?: string;
}> {
  const port = REMOTION_STUDIO_UI_PORT;
  const tracked = trackedStudioProcess('studio-ui');
  if (isProcessAlive(tracked)) {
    killProcessTree(tracked);
  }
  setTrackedStudioProcess('studio-ui', null);

  const pids = await findPidsOnPort(port);
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // Process may already be gone.
    }
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!(await checkPortOpen(port))) {
      return { ok: true, running: false, port };
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return {
    ok: false,
    running: await checkPortOpen(port),
    port,
    pids,
    error: 'تعذر إيقاف Remotion Studio — ما زال المنفذ مشغولاً.',
  };
}

const ELEMENT_TO_VISUAL_TYPE: Record<string, string> = {
  hero_title: 'title-hero',
  stat_number: 'stat-number',
  comparison_box: 'comparison-box',
  bar_chart: 'bar-chart',
  line_chart: 'line-chart',
  circular_gauge: 'circular-gauge',
  step_timeline: 'step-timeline',
  notification_card: 'notification-card',
  warning_card: 'warning-card',
  editorial_quote: 'editorial-quote',
  bullet_list: 'bullet-list',
  cta: 'cta',
  custom_visual: 'custom',
  custom_tsx: 'custom-tsx',
  generative_scene: 'generative-scene',
};

function visualValueFromElement(element: Record<string, unknown>): string {
  const type = typeof element.type === 'string' ? element.type : '';
  if (type === 'stat_number' || type === 'circular_gauge') {
    const value = element.value ?? '';
    const suffix = typeof element.suffix === 'string' ? element.suffix : '';
    return `${value}${suffix}`.trim();
  }
  if (type === 'hero_title') {
    return cleanSettingString(element.subtitle || element.title, 160);
  }
  if (type === 'comparison_box') {
    const left = element.left as Record<string, unknown> | undefined;
    const right = element.right as Record<string, unknown> | undefined;
    return [left?.title, right?.title]
      .filter((item): item is string => typeof item === 'string' && Boolean(item))
      .join(' | ');
  }
  if (type === 'bar_chart') {
    const items = Array.isArray(element.items) ? element.items : [];
    return items
      .map((item) => {
        if (!item || typeof item !== 'object') return '';
        const record = item as Record<string, unknown>;
        return `${record.label ?? ''} ${record.value ?? ''}`.trim();
      })
      .filter(Boolean)
      .slice(0, 6)
      .join(' | ');
  }
  if (type === 'line_chart') {
    return Array.isArray(element.points) ? element.points.join(' | ') : '';
  }
  if (type === 'step_timeline') {
    const steps = Array.isArray(element.steps) ? element.steps : [];
    return steps
      .map((step) =>
        step && typeof step === 'object'
          ? cleanSettingString((step as Record<string, unknown>).label, 80)
          : '',
      )
      .filter(Boolean)
      .slice(0, 5)
      .join(' | ');
  }
  if (type === 'notification_card') {
    return cleanSettingString(element.message || element.title, 160);
  }
  if (type === 'warning_card') {
    return [element.myth, element.truth, element.text]
      .filter((item): item is string => typeof item === 'string' && Boolean(item))
      .join(' | ')
      .slice(0, 160);
  }
  if (type === 'editorial_quote') {
    return cleanSettingString(element.quote, 160);
  }
  if (type === 'bullet_list') {
    const items = Array.isArray(element.items) ? element.items : [];
    return items
      .filter((item): item is string => typeof item === 'string' && Boolean(item))
      .slice(0, 6)
      .join(' | ');
  }
  if (type === 'cta') {
    return cleanSettingString(element.subtitle || element.buttonLabel || element.title, 160);
  }
  if (type === 'generative_scene') {
    const keywords = Array.isArray(element.keywords)
      ? element.keywords.filter((item): item is string => typeof item === 'string')
      : [];
    return cleanSettingString(element.headline || keywords.join(' | ') || element.title, 160);
  }
  if (type === 'custom_visual' || type === 'highlight_card') {
    return cleanSettingString(element.text || element.title, 160);
  }
  return '';
}

function projectFromVideoData(data: ParentVideoData): ProjectStatePayload | null {
  if (!Array.isArray(data.scenes) || data.scenes.length === 0) return null;
  const scenes: RenderScenePayload[] = data.scenes.map((scene, index) => {
    const element =
      Array.isArray(scene.elements) && scene.elements[0] && typeof scene.elements[0] === 'object'
        ? (scene.elements[0] as Record<string, unknown>)
        : {};
    const elementType = typeof element.type === 'string' ? element.type : '';
    const sfxFile = scene.sfxSrc?.replace(/^\/+/, '').replace(/^sfx\//, '').replace(/\.[a-z0-9]+$/i, '');
    return {
      id: scene.id || `scene-${crypto.randomUUID().slice(0, 8)}`,
      title: scene.title || `Scene ${index + 1}`,
      narration: scene.caption || '',
      pose: scene.character?.pose || 'explaining',
      showCharacter: Boolean(scene.character),
      visualType: ELEMENT_TO_VISUAL_TYPE[elementType] || 'stat-number',
      generatedComponent:
        elementType === 'custom_tsx' && typeof element.component === 'string'
          ? element.component
          : undefined,
      customCodeBrief:
        typeof element.text === 'string' && element.text.trim()
          ? element.text
          : undefined,
      ...(scene.characters && scene.characters.length > 0
        ? {
            characters: scene.characters.map((character) => ({
              pose: character.pose,
              side: character.side === 'left' ? 'left' : 'right',
              accessory:
                character.accessory === 'tie' || character.accessory === 'badge'
                  ? character.accessory
                  : 'none',
              ...(character.label ? { label: character.label } : {}),
              ...(character.scale !== undefined ? { scale: character.scale } : {}),
              enabled: character.enabled !== false,
            })),
            characterLayout: scene.characterLayout,
          }
        : {}),
      ...(scene.ambientScene ? { ambientScene: scene.ambientScene } : {}),
      visualLabel: scene.kicker || scene.title || `Scene ${index + 1}`,
      visualValue: visualValueFromElement(element) || scene.subtitle || scene.title || '',
      visualPrompt:
        typeof element.prompt === 'string' && element.prompt.trim() ? element.prompt : undefined,
      audioSrc: scene.audioSrc,
      audioDuration: scene.audioDuration,
      sfxId: sfxFile && SFX_CATALOG_IDS.has(sfxFile) ? sfxFile : 'none',
      sfxAt: scene.sfxAt ?? 0,
      layout: scene.layout,
      camera: scene.camera,
      background: scene.background,
      backgroundPreset: scene.backgroundPreset,
      durationSec:
        Number.isFinite(Number(scene.duration)) && Number(scene.duration) > 0
          ? Number(scene.duration)
          : 4,
      durationInFrames:
        Number.isFinite(Number(scene.durationInFrames)) &&
        Number(scene.durationInFrames) > 0
          ? Math.max(1, Math.round(Number(scene.durationInFrames)))
          : undefined,
    };
  });

  const width = Number(data.width) || 1080;
  const height = Number(data.height) || 1920;
  const aspectRatio = width === height ? '1:1' : width > height ? '16:9' : '9:16';
  const style =
    data.style === 'modern_dark'
      ? 'modern-dark'
      : data.style === 'editorial_clean'
        ? 'editorial-clean'
        : data.style === 'smart_mix'
          ? 'smart-mix'
          : 'stickman';
  const brand = data.brand_kit || {};
  const brandKit: RenderBrandKit = {
    accentColor: colorSetting(
      brand.accent ?? brand.primary,
      DEFAULT_BRAND_KIT.accentColor,
    ),
    bgColor: colorSetting(brand.background, DEFAULT_BRAND_KIT.bgColor),
    textColor: colorSetting(brand.text, DEFAULT_BRAND_KIT.textColor),
    primaryColor: colorSetting(brand.primary, DEFAULT_BRAND_KIT.primaryColor),
    secondaryColor: colorSetting(brand.secondary, DEFAULT_BRAND_KIT.secondaryColor),
    watermark:
      typeof brand.watermark === 'string' ? brand.watermark.slice(0, 60) : DEFAULT_BRAND_KIT.watermark,
    watermarkEnabled: brand.watermark_enabled !== false,
    watermarkPosition: normalizeWatermarkPosition(brand.watermark_position),
  };

  return {
    topic: data.meta?.topic || '',
    scenes,
    aiProvider: studioSettings.aiProvider,
    aiModel: studioSettings.aiModel,
    voiceId: studioSettings.voiceId,
    voiceModelId: studioSettings.voiceModelId,
    voiceStability: studioSettings.voiceStability,
    voiceSimilarityBoost: studioSettings.voiceSimilarityBoost,
    voiceStyle: studioSettings.voiceStyle,
    voiceSpeakerBoost: studioSettings.voiceSpeakerBoost,
    voiceSpeed: studioSettings.voiceSpeed,
    voiceoverEnabled: true,
    cleanBrollMode: false,
    visualStyle: style,
    aspectRatio,
    fps: Number(data.fps) === 30 ? 30 : 60,
    scriptLanguage: normalizeVideoLanguage(
      data.script_language ?? data.language,
      DEFAULT_VIDEO_LANGUAGE,
    ),
    scriptDepth: normalizeScriptDepth(data.script_depth, 'analytical'),
    creativeCodeMode: normalizeCreativeCodeMode(data.creative_code_mode, 'creative'),
    scriptPacing: normalizeScriptPacing(data.script_pacing, 'fast'),
    captionAnimationStyle: normalizeCaptionAnimationStyle(
      data.caption?.animation_style?.replace(/_/g, '-'),
      'auto',
    ),
    captionColors: normalizeCaptionColors(data.caption?.colors, brandKit),
    captionBottomOffset: normalizeCaptionBottomOffset(data.caption?.bottom_offset),
    wordsPerScreen: normalizeWordsPerScreen(
      data.caption?.words_per_screen !== undefined
        ? String(data.caption.words_per_screen)
        : 'auto',
      'auto',
    ),
    captionsEnabled: data.caption?.enabled !== false,
    respectSafeZone:
      typeof data.respect_safe_zone === 'boolean'
        ? data.respect_safe_zone
        : aspectRatio === '9:16',
    brandKit,
    sfxEnabled: data.sfx?.enabled !== false,
    sfxVolume: clampNumber(data.sfx?.volume, DEFAULT_STUDIO_SETTINGS.sfxVolume, 0, 1),
    sfxMode: 'auto',
    backgroundPreset: normalizeBackgroundPreset(scenes[0]?.backgroundPreset),
    updatedAt: Date.now(),
  };
}

function buildProjectVideoData(project: ProjectStatePayload): ParentVideoData {
  const job: RenderJob = {
    id: `studio-${Date.now()}`,
    createdAt: Date.now(),
    scenes: project.scenes,
    visualStyle: project.visualStyle,
    aspectRatio: project.aspectRatio,
    fps: project.fps,
    voiceoverEnabled: project.voiceoverEnabled,
    cleanBrollMode: project.cleanBrollMode,
    respectSafeZone: project.respectSafeZone,
    voiceId: project.voiceId,
    modelId: project.voiceModelId,
    voiceStability: project.voiceStability,
    voiceSimilarityBoost: project.voiceSimilarityBoost,
    voiceStyle: project.voiceStyle,
    voiceSpeakerBoost: project.voiceSpeakerBoost,
    voiceSpeed: project.voiceSpeed,
    sfxEnabled: project.sfxEnabled,
    sfxVolume: project.sfxVolume,
    sfxMode: project.sfxMode,
    backgroundPreset: project.backgroundPreset,
    brandKit: project.brandKit,
    scriptLanguage: project.scriptLanguage,
    scriptDepth: project.scriptDepth,
    creativeCodeMode: project.creativeCodeMode,
    scriptPacing: project.scriptPacing,
    captionAnimationStyle: project.captionAnimationStyle,
    captionColors: project.captionColors,
    captionBottomOffset: project.captionBottomOffset,
    wordsPerScreen: project.wordsPerScreen,
    captionsEnabled: project.captionsEnabled,
    enable25D: false,
    elevenlabsKey: '',
    status: 'queued',
  };
  return buildParentVideoData(job, project.topic);
}

function numericValue(raw: string): number | string {
  const normalized = raw.replace(/[٬,]/g, '');
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return raw;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : raw;
}

function splitValues(raw: string): string[] {
  return raw
    .split(/\s*(?:\||\/|·|vs\.?|مقابل|\n)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function mapVisualStyle(style: string): string {
  if (style === 'modern-dark' || style === 'modern_dark') return 'modern_dark';
  if (style === 'editorial-clean' || style === 'editorial_clean') return 'editorial_clean';
  if (style === 'smart-mix' || style === 'smart_mix') return 'smart_mix';
  return 'stickman';
}

function aspectDimensions(aspectRatio: string): { width: number; height: number } {
  if (aspectRatio === '16:9') return { width: 1920, height: 1080 };
  if (aspectRatio === '1:1') return { width: 1080, height: 1080 };
  return { width: 1080, height: 1920 };
}

function firstNumber(raw: string): number | null {
  const value = numericValue(raw);
  return typeof value === 'number' ? value : null;
}

function extractNumbers(raw: string): number[] {
  const matches = raw.replace(/[٬,]/g, '').match(/-?\d+(?:\.\d+)?/g) || [];
  return matches.map(Number).filter((value) => Number.isFinite(value));
}

function parseChartItems(raw: string, fallbackLabel: string): Array<{ label: string; value: number }> {
  const parts = splitValues(raw);
  const items = parts
    .map((part, index) => {
      const number = firstNumber(part);
      if (number === null) return null;
      const label = part
        .replace(/-?\d+(?:\.\d+)?/g, '')
        .replace(/[|·:/%٪]/g, ' ')
        .trim();
      return {
        label: label || (parts.length === 1 ? fallbackLabel : `#${index + 1}`),
        value: number,
      };
    })
    .filter((item): item is { label: string; value: number } => item !== null);

  if (items.length > 0) return items.slice(0, 6);

  const numbers = extractNumbers(raw);
  if (numbers.length > 1) {
    return numbers.slice(0, 6).map((value, index) => ({
      label: parts[index]?.replace(/-?\d+(?:\.\d+)?/g, '').trim() || `#${index + 1}`,
      value,
    }));
  }

  const single = numbers[0] ?? 60;
  return [
    { label: fallbackLabel, value: single },
    { label: 'B', value: Math.round(single * 1.25) },
    { label: 'C', value: Math.round(single * 1.55) },
    { label: 'D', value: Math.round(single * 1.85) },
  ];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function safeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim())
    ? value.trim()
    : fallback;
}

function buildCustomSvg(params: {
  title: string;
  prompt: string;
  accent?: string;
}): string {
  const accent = safeColor(params.accent, '#E77B40');
  const title = escapeXml(params.title.slice(0, 52));
  const seed = Array.from(params.prompt).reduce((total, char) => total + char.charCodeAt(0), 0);
  const bars = [0.42, 0.62, 0.8, 0.96].map((base, index) =>
    Math.min(0.98, Math.max(0.18, base + (((seed >> index) % 7) - 3) * 0.03))
  );
  const barWidth = 64;
  const gap = 34;
  const baseX = 250;
  const baseY = 296;
  const barShapes = bars
    .map((ratio, index) => {
      const height = Math.round(ratio * 168);
      return `<rect x="${baseX + index * (barWidth + gap)}" y="${baseY - height}" width="${barWidth}" height="${height}" rx="18" fill="${index === bars.length - 1 ? accent : '#94A3B8'}" fill-opacity="${index === bars.length - 1 ? '0.95' : '0.32'}"/>`;
    })
    .join('');
  const points = bars
    .map((ratio, index) => {
      const x = baseX + index * (barWidth + gap) + barWidth / 2;
      const y = baseY - Math.round(ratio * 168) - 18;
      return `${x},${y}`;
    })
    .join(' ');
  const dots = Array.from({ length: 7 * 4 })
    .map((_, index) => {
      const col = index % 7;
      const row = Math.floor(index / 7);
      return `<circle cx="${72 + col * 34}" cy="${86 + row * 34}" r="2.2" fill="#94A3B8" fill-opacity="0.22"/>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="400" viewBox="0 0 720 400" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.26"/>
      <stop offset="100%" stop-color="#0B1220" stop-opacity="0.08"/>
    </linearGradient>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="720" height="400" rx="32" fill="url(#bg)"/>
  ${dots}
  <path d="M72 330 H648" stroke="#94A3B8" stroke-opacity="0.28" stroke-width="2"/>
  ${barShapes}
  <polyline points="${points}" fill="none" stroke="url(#line)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="543" cy="104" r="42" fill="${accent}" fill-opacity="0.16"/>
  <circle cx="543" cy="104" r="20" fill="${accent}" fill-opacity="0.85"/>
  <text x="72" y="86" fill="#E2E8F0" font-family="'IBM Plex Sans Arabic', 'Cairo', sans-serif" font-size="26" font-weight="700">${title}</text>
  <text x="72" y="120" fill="#94A3B8" font-family="'IBM Plex Sans Arabic', sans-serif" font-size="16" font-weight="600" letter-spacing="2">AI CUSTOM VISUAL</text>
  <text x="72" y="368" fill="#94A3B8" font-family="'IBM Plex Sans Arabic', sans-serif" font-size="15" font-weight="500">Generated from your prompt</text>
</svg>`;
}

function hexToRgba(hex: string, alpha: number): string {
  const safe = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#E77B40';
  const r = parseInt(safe.slice(1, 3), 16);
  const g = parseInt(safe.slice(3, 5), 16);
  const b = parseInt(safe.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.min(1, Math.max(0, alpha))})`;
}

const SCENE_LAYOUTS: SceneLayout[] = ['centered', 'split', 'stacked', 'overlay', 'split'];
const SCENE_CAMERAS: CameraMove[] = [
  'slow-zoom-in',
  'pan-left',
  'push-in',
  'slow-zoom-out',
  'pan-right',
];

function buildParentScene(
  scene: RenderScenePayload,
  index: number,
  accent: string,
  visualStyle: string,
  fps: number = 60,
  voiceoverEnabled: boolean = true,
  sfxEnabled: boolean = true,
): ParentScene {
  const label = scene.visualLabel || 'معلومة رئيسية';
  const value = scene.visualValue || '';
  const type = normalizeVisualType(scene.visualType);
  const dataHeavyTypes = new Set([
    'generative-scene',
    'comparison-box',
    'bar-chart',
    'line-chart',
    'circular-gauge',
    'step-timeline',
    'grid-nodes',
    'progress-bar',
  ]);
  const showCharacter =
    visualStyle === 'stickman'
      ? (scene.showCharacter ?? index === 0)
      : visualStyle === 'smart-mix'
        ? (scene.showCharacter ?? (!dataHeavyTypes.has(type) && index % 2 === 0))
        : false;
  let elements: Array<Record<string, unknown>> = [];

  if (type === 'title-hero') {
    elements = [
      {
        type: 'hero_title',
        title: label,
        subtitle: value || scene.narration,
        kicker: scene.title,
        badge: 'ZOF STUDIO',
      },
    ];
  } else if (type === 'stat-number') {
    elements = [
      {
        type: 'stat_number',
        value: numericValue(value),
        label,
        icon: 'chart',
      },
    ];
  } else if (type === 'comparison-box') {
    const parts = splitValues(value);
    elements = [
      {
        type: 'comparison_box',
        title: label,
        left: {
          title: parts[0] || 'الوضع الحالي',
          icon: 'alert',
          tone: 'negative',
          points: parts.length > 2 ? parts.slice(1, -1) : [],
        },
        right: {
          title: parts[1] || value || 'النتيجة',
          icon: 'trend',
          tone: 'positive',
          points: [],
        },
      },
    ];
  } else if (type === 'bar-chart') {
    elements = [
      {
        type: 'bar_chart',
        title: label,
        items: parseChartItems(value, label),
        suffix: /%/.test(value) ? '%' : '',
      },
    ];
  } else if (type === 'line-chart') {
    let points = extractNumbers(value);
    if (points.length < 2) {
      const base = points[0] ?? 40;
      points = [Math.round(base * 0.5), Math.round(base * 0.68), Math.round(base * 0.82), base, Math.round(base * 1.2)];
    }
    elements = [
      {
        type: 'line_chart',
        title: label,
        label,
        points: points.slice(0, 8),
        suffix: /%/.test(value) ? '%' : '',
      },
    ];
  } else if (type === 'circular-gauge') {
    const number = firstNumber(value) ?? 75;
    elements = [
      {
        type: 'circular_gauge',
        title: label,
        label: /%/.test(value) ? '' : scene.narration,
        value: number,
        max: /%/.test(value) || number <= 100 ? 100 : Math.round(number * 1.2),
        suffix: /%/.test(value) ? '%' : '',
        icon: 'target',
      },
    ];
  } else if (type === 'step-timeline') {
    const steps = splitValues(value);
    elements = [
      {
        type: 'step_timeline',
        title: label,
        steps: (steps.length > 0 ? steps : [value || label]).slice(0, 5).map((step) => ({
          label: step,
        })),
      },
    ];
  } else if (type === 'notification-card') {
    elements = [
      {
        type: 'notification_card',
        app: scene.title,
        title: label,
        message: value || scene.narration,
        time: 'now',
        icon: 'spark',
        tone: 'success',
      },
    ];
  } else if (type === 'warning-card') {
    const parts = splitValues(value);
    elements = [
      {
        type: 'warning_card',
        title: label,
        badge: scene.title,
        myth: parts[0],
        truth: parts[1],
        text: parts.length > 2 ? parts.slice(2).join(' · ') : scene.narration,
        tone: 'warning',
      },
    ];
  } else if (type === 'editorial-quote') {
    elements = [
      {
        type: 'editorial_quote',
        title: scene.title,
        quote: value || scene.narration,
        author: label,
        source: 'ZOF STUDIO',
      },
    ];
  } else if (type === 'bullet-list') {
    const items = splitValues(value);
    elements = [
      {
        type: 'bullet_list',
        title: label,
        icon: 'check',
        items: (items.length > 0 ? items : [value || label]).slice(0, 6),
      },
    ];
  } else if (type === 'cta') {
    elements = [
      {
        type: 'cta',
        title: label,
        subtitle: value || scene.narration,
        buttonLabel: scene.title,
        icon: 'rocket',
      },
    ];
  } else if (type === 'custom') {
    elements = [
      {
        type: 'custom_visual',
        title: label,
        text: value || scene.narration,
        prompt: scene.visualPrompt,
        svg:
          scene.visualSvg ||
          buildCustomSvg({ title: label, prompt: scene.visualPrompt || value, accent }),
        icon: 'spark',
      },
    ];
  } else if (type === 'custom-tsx') {
    const keywords =
      scene.visualKeywords && scene.visualKeywords.length > 0
        ? scene.visualKeywords
        : (splitValues(value).length > 0 ? splitValues(value) : [label, scene.title]).slice(0, 5);
    if (scene.generatedComponent) {
      elements = [
        {
          type: 'custom_tsx',
          component: scene.generatedComponent,
          title: label,
          text: value || scene.narration,
          keywords: keywords.slice(0, 5),
          data: {
            narration: scene.narration,
            visualType: scene.visualType,
            motif: scene.motif,
          },
        },
      ];
    } else {
      const motif =
        typeof scene.motif === 'string' &&
        (GENERATIVE_MOTIFS as readonly string[]).includes(scene.motif)
          ? scene.motif
          : GENERATIVE_MOTIFS[index % GENERATIVE_MOTIFS.length];
      elements = [
        {
          type: 'generative_scene',
          title: label,
          headline: value || scene.title || label,
          keywords: keywords.slice(0, 5),
          motif,
          badge: scene.title,
        },
      ];
    }
  } else if (type === 'generative-scene') {
    const keywords =
      scene.visualKeywords && scene.visualKeywords.length > 0
        ? scene.visualKeywords
        : (splitValues(value).length > 0 ? splitValues(value) : [label, scene.title]).slice(0, 5);
    const motif =
      typeof scene.motif === 'string' && (GENERATIVE_MOTIFS as readonly string[]).includes(scene.motif)
        ? scene.motif
        : GENERATIVE_MOTIFS[index % GENERATIVE_MOTIFS.length];
    elements = [
      {
        type: 'generative_scene',
        title: label,
        headline: value || scene.title || label,
        keywords: keywords.slice(0, 5),
        motif,
        badge: scene.title,
      },
    ];
  } else {
    elements = [
      {
        type: 'highlight_card',
        title: label,
        text: value || scene.narration,
        icon: 'spark',
        badge: 'ZOF STUDIO',
      },
    ];
  }

  const layout = scene.layout || SCENE_LAYOUTS[index % SCENE_LAYOUTS.length];
  const camera = scene.camera || SCENE_CAMERAS[index % SCENE_CAMERAS.length];
  const background =
    scene.background ||
    [
      `linear-gradient(135deg, ${hexToRgba(accent, 0.22)} 0%, transparent 58%)`,
      `linear-gradient(215deg, ${hexToRgba(accent, 0.16)} 0%, transparent 62%)`,
      `radial-gradient(circle at 82% 18%, ${hexToRgba(accent, 0.24)} 0%, transparent 46%)`,
      `linear-gradient(160deg, transparent 20%, ${hexToRgba(accent, 0.18)} 100%)`,
    ][index % 4];

  const sceneSfxSrc = resolveSceneSfxSrc(scene.sfxId, scene.visualType);
  const sceneFrames = sceneDurationInFrames(scene, fps);
  const lastSafeCueFrame = Math.max(1, sceneFrames - Math.round(fps * 0.5));
  let sfxCues = sfxEnabled && !sceneSfxSrc
    ? scene.sfxCues && scene.sfxCues.length > 0
      ? scene.sfxCues
      : buildStaggeredSfxCues({
          fps,
          durationSec: scene.durationSec,
          elements,
          mode: voiceoverEnabled ? 'voiceover' : 'silent',
          maxCues: 1,
        })
    : [];
  sfxCues = sfxCues
    .filter((cue) => cue.frameOffset < lastSafeCueFrame)
    .slice(0, 1);

  return {
    id: scene.id,
    kicker: label,
    title: scene.title,
    subtitle: label,
    caption: scene.narration,
    duration: scene.durationSec,
    durationInFrames: sceneFrames,
    audioSrc:
      scene.audioSrc ||
      (scene.audioDataUrl?.startsWith('/audio/') ? scene.audioDataUrl.slice(1) : undefined),
    audioDuration: scene.audioDuration,
    sfxSrc: sceneSfxSrc,
    sfxAt: scene.sfxAt,
    ...(sfxCues.length > 0 ? { sfxCues } : {}),
    layout,
    camera,
    background,
    backgroundPreset: scene.backgroundPreset,
    ...(visualStyle === 'smart-mix' || showCharacter
      ? {
          character: {
            pose: scene.pose,
            side: index % 2 === 0 ? 'left' : 'right',
            accessory: index % 3 === 0 ? 'badge' : 'tie',
            enabled: showCharacter,
          },
        }
      : {}),
    ...(visualStyle === 'stickman' || (visualStyle === 'smart-mix' && showCharacter)
      ? scene.characters && scene.characters.length > 0
        ? {
            characters: scene.characters.map((character, characterIndex) => ({
              pose: character.pose || 'idle',
              side:
                character.side ||
                (characterIndex === 0 ? 'left' : 'right'),
              accessory: character.accessory || 'none',
              ...(character.label ? { label: character.label } : {}),
              ...(character.scale !== undefined ? { scale: character.scale } : {}),
              enabled: character.enabled !== false,
            })),
            ...(scene.characterLayout
              ? { characterLayout: scene.characterLayout }
              : {}),
          }
        : {}
      : {}),
    ...(scene.ambientScene ? { ambientScene: scene.ambientScene } : {}),
    ...(scene.generatedComponent ? { generatedComponent: scene.generatedComponent } : {}),
    elements,
  };
}

function buildParentVideoData(job: RenderJob, topicOverride?: string): ParentVideoData {
  const existing = readParentData();
  const existingKit = existing?.brand_kit;
  const { width, height } = aspectDimensions(job.aspectRatio);
  const firstTitle = job.scenes[0]?.title || existing?.meta?.title || 'Zof Studio';
  const accent = safeColor(job.brandKit.accentColor, '#E77B40');
  const background = safeColor(job.brandKit.bgColor, '#0B0F17');
  const primary = safeColor(job.brandKit.primaryColor, accent);
  const secondary = safeColor(job.brandKit.secondaryColor, '#FBBF24');
  const text = safeColor(job.brandKit.textColor, '#F8FAFC');

  return {
    meta: {
      title: firstTitle.slice(0, 80),
      topic: topicOverride?.trim() || existing?.meta?.topic || 'zof-studio',
      description: job.scenes.map((scene) => scene.title).join(' · ').slice(0, 240),
    },
    width,
    height,
    fps: job.fps,
    durationInFrames:
      job.scenes.reduce(
        (total, scene) => total + sceneDurationInFrames(scene, job.fps),
        0,
      ) + (job.scenes.length > 1 ? TRANSITION_DURATION_IN_FRAMES : 0),
    style: mapVisualStyle(job.visualStyle),
    script_language: job.scriptLanguage,
    script_depth: job.scriptDepth,
    creative_code_mode: job.creativeCodeMode,
    script_pacing: job.scriptPacing,
    respect_safe_zone: job.respectSafeZone,
    caption: {
      animation_style: parentCaptionStyle(job.captionAnimationStyle),
      words_per_screen: parentWordsPerScreen(job.wordsPerScreen),
      lead_in: 0.2,
      colors: {
        background: job.captionColors.background,
        text: job.captionColors.text,
        highlight: job.captionColors.highlight,
      },
      bottom_offset: job.captionBottomOffset,
      enabled: job.captionsEnabled && job.voiceoverEnabled,
    },
    brand_kit: {
      name: 'ZOF',
      primary,
      secondary,
      accent,
      success:
        typeof existingKit?.success === 'string' ? existingKit.success : '#16A34A',
      danger:
        typeof existingKit?.danger === 'string' ? existingKit.danger : '#DC2626',
      background,
      text,
      muted: hexToRgba(text, 0.72),
      watermark: job.brandKit.watermark.slice(0, 60),
      watermark_enabled: job.brandKit.watermarkEnabled,
      watermark_position: job.brandKit.watermarkPosition,
    },
    sfx: {
      enabled: job.sfxEnabled,
      volume: job.sfxVolume,
    },
    scenes: job.scenes.map((scene, index) => {
      const parentScene = buildParentScene(
        scene,
        index,
        accent,
        job.visualStyle,
        job.fps,
        job.voiceoverEnabled,
        job.sfxEnabled,
      );
      if (job.voiceoverEnabled) return parentScene;
      return {
        ...parentScene,
        caption: '',
        audioSrc: '',
        audioDuration: undefined,
      };
    }),
  };
}

function resetActiveCompositionMetadata(job: RenderJob): ParentVideoData {
  const videoData = buildParentVideoData(job, job.masterPrompt);
  const silent = !job.voiceoverEnabled;
  if (silent) {
    for (const scene of job.scenes) {
      scene.audioSrc = '';
      scene.audioDataUrl = undefined;
      scene.audioDuration = undefined;
    }
  }
  const scenes = videoData.scenes.map((scene, index) => {
    const source = job.scenes[index];
    const durationInFrames = source
      ? sceneDurationInFrames(source, job.fps)
      : scene.durationInFrames;
    return {
      ...scene,
      duration: source ? source.durationSec : scene.duration,
      durationInFrames,
      ...(silent
        ? { caption: '', audioSrc: '', audioDuration: undefined }
        : {}),
    };
  });
  const { width, height } = aspectDimensions(job.aspectRatio);
  const caption = videoData.caption ?? {
    animation_style: 'auto',
    words_per_screen: 'auto' as const,
    lead_in: 0.2,
  };
  const next: ParentVideoData = {
    ...videoData,
    width,
    height,
    fps: job.fps,
    durationInFrames:
      scenes.reduce(
        (total, scene) => total + (scene.durationInFrames ?? 0),
        0,
      ) + (scenes.length > 1 ? TRANSITION_DURATION_IN_FRAMES : 0),
    ...(silent ? { caption: { ...caption, enabled: false } } : {}),
    scenes,
  };
  job.videoData = next;
  writeJsonFile(DATA_FILE, next);
  return next;
}

function parseRemainingTimeLabel(raw: string): number | null {
  const text = raw.trim().toLowerCase();
  if (!text) return null;

  const hours = text.match(/(\d+)\s*h/);
  const minutes = text.match(/(\d+)\s*m/);
  const seconds = text.match(/(\d+)\s*s/);
  if (hours || minutes || seconds) {
    const total =
      (hours ? Number(hours[1]) * 3600 : 0) +
      (minutes ? Number(minutes[1]) * 60 : 0) +
      (seconds ? Number(seconds[1]) : 0);
    return Number.isFinite(total) ? Math.max(0, Math.round(total)) : null;
  }

  const clock = text.match(/(\d+):(\d{1,2})(?::(\d{1,2}))?/);
  if (clock) {
    const first = Number(clock[1]);
    const second = Number(clock[2]);
    const third = clock[3] !== undefined ? Number(clock[3]) : null;
    const total =
      third !== null
        ? first * 3600 + second * 60 + third
        : first * 60 + second;
    return Number.isFinite(total) ? Math.max(0, Math.round(total)) : null;
  }

  if (/^\d+$/.test(text)) {
    return Math.max(0, Number(text));
  }
  return null;
}

function runRemotionRender(
  job: RenderJob,
  videoData: ParentVideoData,
  onProgress: (progress: number) => void,
  onLog: (level: 'info' | 'success' | 'warn' | 'error', message: string) => void,
  onTimeRemaining?: (remainingSec: number) => void,
  options?: {
    outputPath?: string;
    propsPath?: string;
    frameRange?: [number, number];
  },
): Promise<{ outputPath: string; outputFile: string }> {
  return new Promise((resolve, reject) => {
    if (isExportCancelled(job.id)) {
      reject(new Error('تم إيقاف عملية التصدير بواسطة المستخدم.'));
      return;
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });

    const outputPath = options?.outputPath ?? path.join(OUT_DIR, `${job.id}.mp4`);
    const propsPath = options?.propsPath ?? path.join(OUT_DIR, `${job.id}.props.json`);
    writeJsonFile(propsPath, { data: videoData });

    const args = [
      '-n',
      '19',
      'npx',
      'remotion',
      'render',
      REMOTION_ENTRY,
      'MainComposition',
      outputPath,
      `--props=${propsPath}`,
      '--concurrency=2',
      '--overwrite',
    ];
    if (options?.frameRange) {
      args.push(
        `--frames=${options.frameRange[0]}-${options.frameRange[1]}`,
        '--enforce-audio-track',
      );
    }

    onLog('info', `nice -n 19 npx remotion render MainComposition → ${outputPath}`);

    const child = spawn('nice', args, {
      cwd: PROJECT_ROOT,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    });
    trackExportProcess(child);

    let lastProgress = 0;
    let stderrBuffer = '';
    let settled = false;
    let lastFrameProgressAt = Date.now();
    let stallWatchdog: ReturnType<typeof setInterval> | null = null;

    const stopStallWatchdog = () => {
      if (stallWatchdog !== null) {
        clearInterval(stallWatchdog);
        stallWatchdog = null;
      }
    };

    const terminateStalledRender = (reason: string) => {
      if (settled) return;
      settled = true;
      stopStallWatchdog();
      onLog('error', reason);
      try {
        if (child.pid && process.platform !== 'win32') {
          process.kill(-child.pid, 'SIGTERM');
        } else {
          child.kill('SIGTERM');
        }
      } catch {
        // Process already exited.
      }
      const forceKill = setTimeout(() => killProcessTree(child), 5_000);
      forceKill.unref?.();
      reject(new Error(reason));
    };

    const handleLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const fraction = trimmed.match(/(\d+)\s*\/\s*(\d+)/);
      if (fraction) {
        lastFrameProgressAt = Date.now();
        const rendered = Number(fraction[1]);
        const total = Number(fraction[2]);
        if (total > 0) {
          const pct = Math.min(99, Math.max(lastProgress, Math.round((rendered / total) * 100)));
          if (pct !== lastProgress) {
            lastProgress = pct;
            onProgress(pct);
          }
        }
      }

      const percent = trimmed.match(/(\d{1,3})%/);
      if (percent) {
        lastFrameProgressAt = Date.now();
        const pct = Math.min(99, Math.max(lastProgress, Number(percent[1])));
        if (pct !== lastProgress) {
          lastProgress = pct;
          onProgress(pct);
        }
      }

      const remainingMatch = trimmed.match(
        /time remaining:\s*([0-9hms:.,\s]+)/i,
      );
      if (remainingMatch && onTimeRemaining) {
        const remainingSec = parseRemainingTimeLabel(remainingMatch[1]);
        if (remainingSec !== null) onTimeRemaining(remainingSec);
      }

      if (trimmed.length < 400) {
        onLog(/error|failed|exception/i.test(trimmed) ? 'error' : 'info', trimmed);
      }
    };

    child.stdout?.on('data', (chunk: Buffer) => {
      for (const line of chunk.toString('utf8').split(/\r?\n/)) handleLine(line);
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      stderrBuffer += chunk.toString('utf8');
      const lines = stderrBuffer.split(/\r?\n/);
      stderrBuffer = lines.pop() || '';
      for (const line of lines) handleLine(line);
    });

    stallWatchdog = setInterval(() => {
      if (settled) return;
      if (Date.now() - lastFrameProgressAt >= RENDER_STALL_TIMEOUT_MS) {
        terminateStalledRender(
          `توقف عرض Remotion: لم تتقدّم معالجة الإطارات لمدة ${Math.round(
            RENDER_STALL_TIMEOUT_MS / 1000,
          )} ثانية. تم إنهاء العملية المتوقفة لتجنب التعليق.`,
        );
      }
    }, RENDER_STALL_CHECK_INTERVAL_MS);

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      stopStallWatchdog();
      reject(error);
    });

    child.on('close', (code) => {
      if (stderrBuffer.trim()) handleLine(stderrBuffer);
      if (settled) return;
      settled = true;
      stopStallWatchdog();
      if (code !== 0) {
        reject(new Error(`Remotion render exited with code ${code ?? 'unknown'}`));
        return;
      }
      if (!fs.existsSync(outputPath)) {
        reject(new Error('Remotion render completed without producing an output file.'));
        return;
      }
      onProgress(100);
      resolve({
        outputPath,
        outputFile: path.relative(PROJECT_ROOT, outputPath),
      });
    });
  });
}

async function concatSceneSegments(
  segmentFiles: string[],
  segmentDurations: number[],
  outputPath: string,
  fps: number,
  onLog: (level: 'info' | 'success' | 'warn' | 'error', message: string) => void,
): Promise<void> {
  const inputArgs = segmentFiles.flatMap((file) => ['-i', file]);
  const audioFilters = segmentFiles
    .map((_, index) => {
      const duration = Math.max(
        0.001,
        Number(segmentDurations[index] || 0),
      ).toFixed(4);
      return `[${index}:a:0]apad,atrim=0:${duration},asetpts=PTS-STARTPTS[a${index}]`;
    })
    .join(';');
  const concatInputs = segmentFiles
    .map((_, index) => `[${index}:v:0][a${index}]`)
    .join('');
  const filter = `${audioFilters};${concatInputs}concat=n=${segmentFiles.length}:v=1:a=1[v][a]`;
  onLog('info', `دمج ${segmentFiles.length} مقطعاً مخزناً في الفيديو النهائي...`);
  const result = await runCommand(
    'ffmpeg',
    [
      '-y',
      ...inputArgs,
      '-filter_complex',
      filter,
      '-map',
      '[v]',
      '-map',
      '[a]',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '20',
      '-pix_fmt',
      'yuv420p',
      '-vsync',
      'cfr',
      '-r',
      String(Math.max(1, fps)),
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      outputPath,
    ],
    PROJECT_ROOT,
    300000,
    true,
  );
  if (!result.ok || !fs.existsSync(outputPath)) {
    try {
      fs.unlinkSync(outputPath);
    } catch {
      // Best effort cleanup.
    }
    throw new Error(result.output.slice(-1200) || 'ffmpeg concat failed');
  }
}

async function renderJobWithSceneCache(
  job: RenderJob,
  videoData: ParentVideoData,
  onProgress: (progress: number) => void,
  onLog: (level: 'info' | 'success' | 'warn' | 'error', message: string) => void,
  onTimeRemaining?: (remainingSec: number) => void,
): Promise<{ outputPath: string; outputFile: string }> {
  try {
    throwIfExportCancelled(job.id);
    fs.mkdirSync(SCENE_CACHE_DIR, { recursive: true });
    const cache = loadSceneArtifactCache();
    const timings: Array<{ startFrame: number; frames: number }> = [];
    let cursor = 0;
    for (const scene of job.scenes) {
      const frames = sceneDurationInFrames(scene, job.fps);
      timings.push({ startFrame: cursor, frames });
      cursor += frames;
    }
    const totalFrames = Math.max(1, cursor);
    const segmentFiles: string[] = [];
    let completedFrames = 0;
    const startedAt = Date.now();
    let cacheChanged = false;

    for (let index = 0; index < job.scenes.length; index += 1) {
      throwIfExportCancelled(job.id);
      const scene = job.scenes[index];
      const timing = timings[index];
      const endFrame = timing.startFrame + timing.frames - 1;
      const hash = sceneSegmentCacheHash(
        scene,
        job,
        timing.startFrame,
        endFrame,
      );
      const cached = cache.segments[hash];
      let segmentFile: string | undefined = cached?.file;
      if (segmentFile) {
        try {
          if (fs.statSync(segmentFile).size < 1024) segmentFile = undefined;
        } catch {
          segmentFile = undefined;
        }
      }

      if (!segmentFile) {
        const tempSuffix = `${job.id}-${crypto.randomBytes(3).toString('hex')}`;
        const tempFile = path.join(
          SCENE_CACHE_DIR,
          `${hash}.${tempSuffix}.tmp.mp4`,
        );
        const propsPath = path.join(
          SCENE_CACHE_DIR,
          `${hash}.${tempSuffix}.props.json`,
        );
        onLog(
          'info',
          `المقطع ${index + 1}/${job.scenes.length}: تصيير الإطارات ${timing.startFrame}–${endFrame} (لا يوجد كاش مطابق).`,
        );
        let segmentFraction = 0;
        const segmentProgress = (progress: number) => {
          segmentFraction = Math.min(1, Math.max(0, progress / 100));
          const doneFrames = Math.min(
            totalFrames,
            completedFrames + Math.round(timing.frames * segmentFraction),
          );
          onProgress(Math.min(99, Math.round((doneFrames / totalFrames) * 99)));
          if (onTimeRemaining && doneFrames > 0) {
            const elapsed = Math.max(0.5, (Date.now() - startedAt) / 1000);
            const rate = doneFrames / elapsed;
            if (rate > 0) {
              onTimeRemaining(
                Math.max(0, Math.round((totalFrames - doneFrames) / rate)),
              );
            }
          }
        };
        await runRemotionRender(
          job,
          videoData,
          segmentProgress,
          onLog,
          onTimeRemaining
            ? (remainingSec) => {
                const doneFrames = Math.min(
                  totalFrames,
                  completedFrames + Math.round(timing.frames * segmentFraction),
                );
                const remainingSegments = job.scenes.length - index - 1;
                onTimeRemaining(
                  Math.max(
                    0,
                    Math.round(remainingSec + remainingSegments * (remainingSec || 1)),
                  ),
                );
              }
            : undefined,
          {
            outputPath: tempFile,
            propsPath,
            frameRange: [timing.startFrame, endFrame],
          },
        );
        segmentFile = path.join(SCENE_CACHE_DIR, `${hash}.mp4`);
        fs.renameSync(tempFile, segmentFile);
        try {
          fs.unlinkSync(propsPath);
        } catch {
          // Best effort cleanup.
        }
        cache.segments[hash] = {
          hash,
          file: segmentFile,
          startFrame: timing.startFrame,
          endFrame,
          durationSec: scene.durationSec,
          updatedAt: Date.now(),
        };
        cacheChanged = true;
        saveSceneArtifactCache();
        onLog('success', `المقطع ${index + 1}: تم تحديث كاش المحتوى ${hash.slice(0, 10)}.`);
      } else {
        onLog(
          'success',
          `المقطع ${index + 1}: إعادة استخدام تصيير مخزن (${hash.slice(0, 10)}) — بدون إعادة معالجة.`,
        );
      }

      segmentFiles.push(segmentFile);
      completedFrames = Math.min(totalFrames, completedFrames + timing.frames);
      onProgress(Math.min(99, Math.round((completedFrames / totalFrames) * 99)));
    }

    if (cacheChanged) saveSceneArtifactCache();
    const outputPath = path.join(OUT_DIR, `${job.id}.mp4`);
    await concatSceneSegments(
      segmentFiles,
      timings.map((timing) => timing.frames / job.fps),
      outputPath,
      job.fps,
      onLog,
    );
    onProgress(100);
    return {
      outputPath,
      outputFile: path.relative(PROJECT_ROOT, outputPath),
    };
  } catch (error) {
    if (isExportCancelled(job.id)) throw error;
    const message = error instanceof Error ? error.message : 'unknown segment cache error';
    onLog(
      'warn',
      `تعذر مسار التصيير المقطعي (${message}) — سيتم التحويل إلى تصيير كامل آمن.`,
    );
    return runRemotionRender(
      job,
      videoData,
      onProgress,
      onLog,
      onTimeRemaining,
    );
  }
}

function audioExtensionForMime(mime: string): string {
  const normalized = mime.toLowerCase();
  if (normalized.includes('wav')) return 'wav';
  if (normalized.includes('ogg')) return 'ogg';
  if (normalized.includes('webm')) return 'webm';
  if (normalized.includes('aac')) return 'aac';
  return 'mp3';
}

function writeAudioFile(buffer: Buffer, extension: string): string {
  const filename = `scene-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${extension}`;
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  fs.writeFileSync(path.join(AUDIO_DIR, filename), buffer);
  return `audio/${filename}`;
}

function saveAudioDataUrl(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:audio\/([a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) return null;
  try {
    return writeAudioFile(Buffer.from(match[2], 'base64'), audioExtensionForMime(match[1]));
  } catch {
    return null;
  }
}

function estimateNarrationDuration(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2.5, Number((words * 0.48 + 0.8).toFixed(3)));
}

function probeAudioDuration(filePath: string): Promise<number | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    try {
      const child = spawn(
        'ffprobe',
        [
          '-v',
          'error',
          '-show_entries',
          'format=duration',
          '-of',
          'default=noprint_wrappers=1:nokey=1',
          filePath,
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
      let output = '';
      child.stdout?.on('data', (chunk: Buffer) => {
        output += chunk.toString('utf8');
      });
      child.on('error', () => finish(null));
      child.on('close', (code) => {
        if (code !== 0) {
          finish(null);
          return;
        }
        const duration = Number(output.trim().split(/\s+/)[0]);
        finish(Number.isFinite(duration) && duration > 0 ? duration : null);
      });
      setTimeout(() => {
        try {
          child.kill('SIGKILL');
        } catch {
          // ignore
        }
        finish(null);
      }, 10000);
    } catch {
      finish(null);
    }
  });
}

function normalizeAudioSrc(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim().replace(/^\/+/, '');
  if (!cleaned) return undefined;
  if (cleaned.startsWith('audio/')) return cleaned;
  if (cleaned.startsWith('data:')) return raw;
  return cleaned;
}

function audioFilePath(audioSrc: string): string {
  const cleaned = audioSrc.replace(/^\/+/, '').replace(/^audio\//, '');
  return path.join(AUDIO_DIR, cleaned);
}

async function applyMeasuredAudioDuration(
  scene: RenderScenePayload,
  explicitDuration: number | null,
  onLog: (level: 'info' | 'success' | 'warn' | 'error', message: string) => void,
  sceneNumber: number,
  fps: number,
): Promise<number | null> {
  let duration = explicitDuration;
  if ((!duration || duration <= 0) && scene.audioSrc) {
    duration = await probeAudioDuration(audioFilePath(scene.audioSrc));
  }
  if (!duration || duration <= 0) return null;
  const frames = Math.max(1, Math.ceil((duration + 0.25) * fps));
  scene.audioDuration = Number(duration.toFixed(3));
  scene.durationInFrames = frames;
  scene.durationSec = frames / fps;
  onLog(
    'info',
    `المشهد ${sceneNumber}: مدة الصوت الفعلية ${duration.toFixed(2)}s → durationInFrames=${frames} (${(frames / fps).toFixed(2)}s، هامش 0.25s).`,
  );
  return duration;
}

async function synthesizeSceneVoice(
  job: RenderJob,
  scene: RenderScenePayload,
  index: number,
  onLog: (level: 'info' | 'success' | 'warn' | 'error', message: string) => void,
): Promise<boolean> {
  if (!scene.narration.trim()) return false;
  if (!job.elevenlabsKey) {
    onLog('warn', 'لا يوجد مفتاح ElevenLabs — سيتم استخدام الصوت المحفوظ إن وجد.');
    return false;
  }
  try {
    const ttsResp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(job.voiceId)}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': job.elevenlabsKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: scene.narration,
          model_id: job.modelId,
          voice_settings: {
            stability: job.voiceStability,
            similarity_boost: job.voiceSimilarityBoost,
            style: job.voiceStyle,
            use_speaker_boost: job.voiceSpeakerBoost,
            speed: job.voiceSpeed,
          },
        }),
        signal: AbortSignal.timeout(60000),
      },
    );

    if (!ttsResp.ok) {
      onLog('warn', `المشهد ${index + 1}: تعذر توليد الصوت (${ttsResp.status}).`);
      return false;
    }

    const buffer = Buffer.from(await ttsResp.arrayBuffer());
    scene.audioSrc = writeAudioFile(buffer, 'mp3');
    const headerCost = Number(ttsResp.headers.get('character-cost'));
    const billedCharacters =
      Number.isFinite(headerCost) && headerCost >= 0 ? headerCost : scene.narration.length;
    const ttsUsd = Number((billedCharacters * ELEVENLABS_USD_PER_CHAR).toFixed(6));
    job.usage = {
      ttsCharacters: (job.usage?.ttsCharacters || 0) + billedCharacters,
      ttsCalls: (job.usage?.ttsCalls || 0) + 1,
      ttsUsd: Number(((job.usage?.ttsUsd || 0) + ttsUsd).toFixed(6)),
    };
    onLog(
      'success',
      `المشهد ${index + 1}: تم توليد صوت ElevenLabs (${job.modelId}, ${job.voiceId.slice(0, 8)}) إلى public/${scene.audioSrc} · ${billedCharacters} حرف.`,
    );
    return true;
  } catch {
    onLog('warn', `المشهد ${index + 1}: انتهت مهلة توليد الصوت عبر ElevenLabs.`);
    return false;
  }
}

async function prepareSceneAudio(
  job: RenderJob,
  onLog: (level: 'info' | 'success' | 'warn' | 'error', message: string) => void,
): Promise<number> {
  let generated = 0;

  if (!job.voiceoverEnabled) {
    // Silent visual mode: never call ElevenLabs and never attach a voiceover
    // track to the render. Durations stay on the visual pacing chosen in the
    // script while Foley SFX remain active. Saved project audio is untouched.
    for (let index = 0; index < job.scenes.length; index += 1) {
      const scene = job.scenes[index];
      onLog(
        'info',
        `المشهد ${index + 1}: التعليق الصوتي مغلق — مدة بصرية ${scene.durationSec.toFixed(1)}s مع إبقاء المؤثرات.`,
      );
    }
    return 0;
  }

  if (!job.elevenlabsKey) {
    onLog('warn', 'التعليق الصوتي مفعّل لكن مفتاح ElevenLabs غير متوفر — سيتم استخدام أي صوت محفوظ.');
  }

  const cache = loadSceneArtifactCache();
  const voice = {
    voiceId: job.voiceId,
    modelId: job.modelId,
    stability: job.voiceStability,
    similarityBoost: job.voiceSimilarityBoost,
    style: job.voiceStyle,
    speakerBoost: job.voiceSpeakerBoost,
    speed: job.voiceSpeed,
  };
  let cacheChanged = false;

  for (let index = 0; index < job.scenes.length; index += 1) {
    const scene = job.scenes[index];
    const existing = normalizeAudioSrc(scene.audioSrc || scene.audioDataUrl);
    if (existing?.startsWith('audio/')) {
      scene.audioSrc = existing;
    } else if (scene.audioDataUrl?.startsWith('data:audio/')) {
      const saved = saveAudioDataUrl(scene.audioDataUrl);
      if (saved) {
        scene.audioSrc = saved;
        onLog('info', `المشهد ${index + 1}: حفظ الصوت المرفق في public/${saved}.`);
      }
    }

    const cacheHash = sceneAudioCacheHash(scene, voice);
    const cachedAudio = cache.audio[cacheHash];
    if (cachedAudio?.audioSrc) {
      const cachedPath = audioFilePath(cachedAudio.audioSrc);
      if (fs.existsSync(cachedPath)) {
        scene.audioSrc = cachedAudio.audioSrc;
        const appliedCached = await applyMeasuredAudioDuration(
          scene,
          cachedAudio.audioDuration ?? null,
          onLog,
          index + 1,
          job.fps,
        );
        if (appliedCached) {
          onLog(
            'success',
            `المشهد ${index + 1}: إعادة استخدام الصوت المخزن (${cachedAudio.audioSrc}) بدون إعادة توليد.`,
          );
          continue;
        }
      }
      delete cache.audio[cacheHash];
      cacheChanged = true;
    }

    const synthesized = job.elevenlabsKey
      ? await synthesizeSceneVoice(job, scene, index, onLog)
      : false;
    if (synthesized) generated += 1;

    const measured = scene.audioSrc
      ? await probeAudioDuration(audioFilePath(scene.audioSrc))
      : null;
    const applied = await applyMeasuredAudioDuration(
      scene,
      measured,
      onLog,
      index + 1,
      job.fps,
    );
    if (!applied) {
      const estimate = estimateNarrationDuration(scene.narration);
      const frames = Math.max(1, Math.ceil((estimate + 0.25) * job.fps));
      scene.audioDuration = estimate;
      scene.durationInFrames = frames;
      scene.durationSec = frames / job.fps;
      onLog(
        'warn',
        `المشهد ${index + 1}: تعذر قياس الصوت — تم تقدير ${(frames / job.fps).toFixed(2)}s من النص.`,
      );
    }

    if (scene.audioSrc) {
      cache.audio[cacheHash] = {
        hash: cacheHash,
        audioSrc: scene.audioSrc,
        audioDuration: scene.audioDuration,
        updatedAt: Date.now(),
      };
      cacheChanged = true;
    }
  }

  if (cacheChanged) saveSceneArtifactCache();
  return generated;
}

const LANGUAGE_LABELS: Record<string, string> = {
  ar: 'Arabic',
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  hi: 'Hindi',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  tr: 'Turkish',
  nl: 'Dutch',
  pl: 'Polish',
  sv: 'Swedish',
  da: 'Danish',
  fi: 'Finnish',
  no: 'Norwegian',
  cs: 'Czech',
  el: 'Greek',
  he: 'Hebrew',
  fa: 'Persian',
  ur: 'Urdu',
  id: 'Indonesian',
  ms: 'Malay',
  vi: 'Vietnamese',
  th: 'Thai',
  uk: 'Ukrainian',
  ro: 'Romanian',
  hu: 'Hungarian',
  bg: 'Bulgarian',
  ca: 'Catalan',
  hr: 'Croatian',
  sk: 'Slovak',
  sl: 'Slovenian',
  tl: 'Filipino',
  sw: 'Swahili',
};

function normalizeLanguageLabel(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) return 'Other';
  const cleaned = raw
    .trim()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[,،].*$/, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'Other';
  const code = cleaned.toLowerCase().split(/[-_]/)[0];
  if (LANGUAGE_LABELS[code]) return LANGUAGE_LABELS[code];
  if (LANGUAGE_LABELS[cleaned.toLowerCase()]) return LANGUAGE_LABELS[cleaned.toLowerCase()];
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

type RawElevenLabsVoice = {
  voice_id?: string;
  name?: string;
  category?: string;
  preview_url?: string | null;
  description?: string;
  labels?: Record<string, string>;
  fine_tuning?: { language?: string; accent?: string } | null;
  verified_languages?: Array<
    string | {
      language?: string;
      language_code?: string;
      locale?: string;
      accent?: string;
    }
  >;
};

function normalizeVoiceGender(raw: unknown): 'male' | 'female' | 'neutral' {
  if (typeof raw !== 'string') return 'neutral';
  const value = raw.trim().toLowerCase();
  if (!value) return 'neutral';
  if (
    value === 'female' ||
    value === 'woman' ||
    value === 'girl' ||
    value === 'f' ||
    value.includes('أنثى') ||
    value.includes('انثى')
  ) {
    return 'female';
  }
  if (
    value === 'male' ||
    value === 'man' ||
    value === 'boy' ||
    value === 'm' ||
    value.includes('ذكر')
  ) {
    return 'male';
  }
  return 'neutral';
}

function mapElevenLabsVoice(
  raw: RawElevenLabsVoice,
  source: 'personal' | 'library'
): ElevenLabsVoiceItem {
  const labels = raw.labels || {};
  const verifiedLanguages = Array.isArray(raw.verified_languages)
    ? raw.verified_languages
        .map((item) =>
          typeof item === 'string'
            ? item
            : item.language || item.language_code || item.locale || ''
        )
        .filter(Boolean)
    : [];
  const languageSources = [
    labels.language,
    labels.locale,
    ...verifiedLanguages,
    raw.fine_tuning?.language || '',
  ];
  const languages: string[] = [];
  const seenLanguages = new Set<string>();
  for (const candidate of languageSources) {
    const label = normalizeLanguageLabel(candidate);
    if (!label || label === 'Other') continue;
    const key = label.toLowerCase();
    if (seenLanguages.has(key)) continue;
    seenLanguages.add(key);
    languages.push(label);
  }
  const language = languages[0] || 'Other';
  const gender = normalizeVoiceGender(labels.gender);
  const accentRaw = labels.accent || labels.locale || raw.fine_tuning?.accent || '';
  const accent = accentRaw
    ? accentRaw
        .split(/[-_]/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : 'Standard';
  const tone = labels.use_case || labels.descriptive || labels.style || 'Standard';

  return {
    voice_id: raw.voice_id || '',
    name: raw.name || 'Unnamed voice',
    gender,
    language,
    languages,
    accent,
    tone,
    category: raw.category || source,
    preview_url: raw.preview_url || null,
    description: raw.description || '',
    source,
  };
}

async function fetchVoicesPage(url: URL, apiKey: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url, {
      headers: { 'xi-api-key': apiKey },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function fetchElevenLabsVoiceLibrary(
  apiKey: string
): Promise<{ voices: ElevenLabsVoiceItem[]; warning?: string }> {
  const collected = new Map<string, ElevenLabsVoiceItem>();
  const addVoices = (list: unknown, source: 'personal' | 'library') => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const mapped = mapElevenLabsVoice(item as RawElevenLabsVoice, source);
      if (!mapped.voice_id || collected.has(mapped.voice_id)) continue;
      collected.set(mapped.voice_id, mapped);
    }
  };

  let nextToken = '';
  for (let page = 0; page < 10; page += 1) {
    const url = new URL('https://api.elevenlabs.io/v2/voices');
    url.searchParams.set('page_size', '100');
    if (nextToken) url.searchParams.set('next_page_token', nextToken);
    const payload = await fetchVoicesPage(url, apiKey);
    if (!payload) break;
    addVoices(payload.voices, 'personal');
    const token = typeof payload.next_page_token === 'string' ? payload.next_page_token : '';
    if (!payload.has_more && !token) break;
    if (!token) break;
    nextToken = token;
  }

  if (collected.size === 0) {
    const legacy = await fetchVoicesPage(
      new URL('https://api.elevenlabs.io/v1/voices'),
      apiKey
    );
    if (legacy) addVoices(legacy.voices, 'personal');
  }

  for (let page = 0; page < 3; page += 1) {
    const url = new URL('https://api.elevenlabs.io/v1/shared-voices');
    url.searchParams.set('page_size', '100');
    url.searchParams.set('page', String(page));
    const payload = await fetchVoicesPage(url, apiKey);
    if (!payload) break;
    const list = payload.voices;
    const before = collected.size;
    addVoices(list, 'library');
    if (!Array.isArray(list) || list.length < 100 || collected.size === before) break;
  }

  return {
    voices: Array.from(collected.values()),
    warning: collected.size === 0 ? 'تعذر جلب الأصوات الحية من ElevenLabs' : undefined,
  };
}

async function fetchElevenLabsVoiceById(
  apiKey: string,
  voiceId: string
): Promise<ElevenLabsVoiceItem | null> {
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/voices/${encodeURIComponent(voiceId)}`,
      {
        headers: { 'xi-api-key': apiKey },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!response.ok) return null;
    const raw = (await response.json()) as RawElevenLabsVoice;
    const mapped = mapElevenLabsVoice(raw, 'personal');
    return mapped.voice_id ? mapped : null;
  } catch {
    return null;
  }
}

type ChatAttemptKind = 'openrouter' | 'deepseek' | 'kieai' | 'custom';

type ChatAttempt = {
  kind: ChatAttemptKind;
  providerLabel: string;
  model: string;
  baseUrl?: string;
};

function mapOpenRouterModel(requestedModel: string): string {
  const mapped = OPENROUTER_MODEL_MAP[requestedModel] || requestedModel;
  if (
    !mapped ||
    !mapped.includes('/') ||
    mapped === 'deepseek-chat' ||
    mapped === 'deepseek-reasoner' ||
    mapped === 'custom-model' ||
    mapped === 'gpt-4o-mini'
  ) {
    return DEFAULT_FREE_MODEL;
  }
  return mapped;
}

function mapDeepSeekModel(requestedModel: string): string {
  const mapped = OPENROUTER_MODEL_MAP[requestedModel] || requestedModel;
  if (mapped.includes('reasoner')) return 'deepseek-reasoner';
  if (mapped === 'deepseek-chat' || mapped === 'deepseek-reasoner') return mapped;
  if (mapped.startsWith('deepseek/')) {
    const model = mapped.slice('deepseek/'.length);
    if (!model || model.includes('/') || model.endsWith(':free')) return 'deepseek-chat';
    return model;
  }
  if (mapped.includes('/')) return 'deepseek-chat';
  if (/^[a-zA-Z0-9._:-]+$/.test(mapped)) return mapped;
  return 'deepseek-chat';
}

function normalizeCustomBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/\/chat\/completions$/i.test(trimmed)) return trimmed;
  if (/\/v\d+$/i.test(trimmed)) return `${trimmed}/chat/completions`;
  return `${trimmed}/v1/chat/completions`;
}

function extractChatContent(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const message = (choices[0] as { message?: unknown }).message;
  if (message && typeof message === 'object') {
    const content = (message as { content?: unknown }).content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      const text = content
        .map((part) =>
          part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string'
            ? (part as { text: string }).text
            : ''
        )
        .join('');
      return text || null;
    }
  }
  const text = (choices[0] as { text?: unknown }).text;
  return typeof text === 'string' ? text : null;
}

type ChatUsage = {
  inputTokens: number;
  outputTokens: number;
  model: string;
  usd: number;
  calls: number;
};

type ChatResult = {
  content: string;
  usage: ChatUsage;
};

function readTokensFromPayload(payload: unknown): { input: number; output: number } {
  if (!payload || typeof payload !== 'object') return { input: 0, output: 0 };
  const usage = (payload as { usage?: unknown }).usage;
  if (!usage || typeof usage !== 'object') return { input: 0, output: 0 };
  const record = usage as Record<string, unknown>;
  const pick = (keys: string[]): number => {
    for (const key of keys) {
      const value = Number(record[key]);
      if (Number.isFinite(value) && value > 0) return value;
    }
    return 0;
  };
  return {
    input: pick(['prompt_tokens', 'input_tokens']),
    output: pick(['completion_tokens', 'output_tokens']),
  };
}

async function requestChatCompletion(
  attempt: ChatAttempt,
  systemPrompt: string,
  userPrompt: string,
  keys: ResolvedApiKeys
): Promise<ChatResult | null> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  let url = '';

  if (attempt.kind === 'openrouter') {
    if (!keys.openrouterKey) return null;
    url = 'https://openrouter.ai/api/v1/chat/completions';
    headers.Authorization = `Bearer ${keys.openrouterKey}`;
    headers['X-Title'] = 'Zof Studio';
    headers['HTTP-Referer'] = 'http://localhost:4789';
  } else if (attempt.kind === 'deepseek') {
    if (!keys.deepseekKey) return null;
    url = 'https://api.deepseek.com/chat/completions';
    headers.Authorization = `Bearer ${keys.deepseekKey}`;
  } else if (attempt.kind === 'kieai') {
    if (!keys.kieaiKey) return null;
    url = attempt.baseUrl || 'https://api.kie.ai/api/v1/chat/completions';
    headers.Authorization = `Bearer ${keys.kieaiKey}`;
  } else {
    if (!keys.customProviderKey || !keys.customProviderBaseUrl) return null;
    url = normalizeCustomBaseUrl(keys.customProviderBaseUrl);
    headers.Authorization = `Bearer ${keys.customProviderKey}`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: attempt.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as unknown;
    const content = extractChatContent(payload);
    if (!content) return null;
    const tokens = readTokensFromPayload(payload);
    const inputTokens = tokens.input || Math.max(1, Math.round((systemPrompt.length + userPrompt.length) / 4));
    const outputTokens = tokens.output || Math.max(1, Math.round(content.length / 4));
    const usd = estimateAiUsd(attempt.model, inputTokens, outputTokens);
    recordUsage({
      aiInputTokens: inputTokens,
      aiOutputTokens: outputTokens,
      aiCalls: 1,
      aiUsd: usd,
      aiModel: attempt.model,
    });
    return {
      content,
      usage: { inputTokens, outputTokens, model: attempt.model, usd, calls: 1 },
    };
  } catch {
    return null;
  }
}

function rehydrateStudioSettingsFromSources(): void {
  const opencode = inspectOpenCode();
  const envOpenRouter = process.env.OPENROUTER_API_KEY?.trim() || '';
  const envDeepSeek = process.env.DEEPSEEK_API_KEY?.trim() || '';
  const envKieAi =
    process.env.KIEAI_API_KEY?.trim() || process.env.KIE_API_KEY?.trim() || '';
  const envElevenLabs = process.env.ELEVENLABS_API_KEY?.trim() || '';
  let changed = false;

  if (!studioSettings.openrouterKey) {
    const key = envOpenRouter || opencode.keys.openrouter || '';
    if (key) {
      studioSettings.openrouterKey = key;
      changed = true;
    }
  }
  if (!studioSettings.deepseekKey) {
    const key = envDeepSeek || opencode.keys.deepseek || '';
    if (key) {
      studioSettings.deepseekKey = key;
      changed = true;
    }
  }
  if (!studioSettings.kieaiKey) {
    const key = envKieAi || opencode.keys.kieai || '';
    if (key) {
      studioSettings.kieaiKey = key;
      changed = true;
    }
  }
  if (!studioSettings.elevenlabsKey && envElevenLabs) {
    studioSettings.elevenlabsKey = envElevenLabs;
    changed = true;
  }

  // Re-apply persisted values into active server memory on every boot.
  if (changed) {
    studioSettings.updatedAt = Date.now();
    try {
      saveStudioSettings(studioSettings);
    } catch {
      // Keep the in-memory values even if the home directory is read-only.
    }
  }
}


function isValidGeneratedComponentName(name: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]{2,64}$/.test(name);
}

function extractGeneratedTsxCode(raw: string): string {
  if (!raw) return '';
  const fenced = raw.match(/```(?:tsx|ts|typescript|jsx)?\s*([\s\S]*?)```/i);
  let code = fenced ? fenced[1] : raw;
  const start = code.search(/(^|\n)\s*(import|export)\b/);
  if (start >= 0) code = code.slice(start);
  return code.replace(/```/g, '').trim();
}

const GENERATED_ALLOWED_IMPORTS = new Set([
  'react',
  'remotion',
  '../components/Stickman',
  '../components/SilhouetteActor',
  '../../src/components/SilhouetteActor',
  '../components/SmartIcon',
  '../../src/components/SmartIcon',
  '../components/SceneSfx',
  '../../src/components/SceneSfx',
  '../components/Depth25D',
  '../../src/components/Depth25D',
  '@iconify/react',
  'simple-icons',
  '@remotion/google-fonts',
  '@remotion/noise',
  '@remotion/paths',
  '@remotion/shapes',
  '@remotion/transitions',
  'lucide-react',
  'd3-geo',
  'topojson-client',
  'roughjs',
  'world-atlas/countries-110m.json',
]);

function isAllowedGeneratedImport(source: string): boolean {
  return (
    GENERATED_ALLOWED_IMPORTS.has(source) ||
    source.startsWith('@remotion/google-fonts/')
  );
}

function sanitizeGeneratedTsx(
  rawCode: string,
  componentName: string,
): { ok: boolean; code: string; errors: string[] } {
  const code = extractGeneratedTsxCode(rawCode);
  const errors: string[] = [];
  if (!code) {
    return { ok: false, code: '', errors: ['empty generated source'] };
  }
  if (code.length > 140000) {
    errors.push('generated source is too large');
  }

  const importSources: string[] = [];
  const fromPattern = /\bfrom\s+['"]([^'"]+)['"]/g;
  const sideEffectPattern = /(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g;
  for (const pattern of [fromPattern, sideEffectPattern]) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(code)) !== null) {
      importSources.push(match[1]);
    }
  }
  for (const source of importSources) {
    if (!isAllowedGeneratedImport(source)) {
      errors.push(`blocked import source: ${source}`);
    }
  }

  const withoutComments = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  const blockedPatterns: Array<{ label: string; pattern: RegExp }> = [
    { label: 'require()', pattern: /\brequire\s*\(/ },
    { label: 'dynamic import()', pattern: /\bimport\s*\(/ },
    { label: 'eval()', pattern: /\beval\s*\(/ },
    { label: 'new Function', pattern: /\bnew\s+Function\b/ },
    { label: 'fetch()', pattern: /\bfetch\s*\(/ },
    { label: 'XMLHttpRequest', pattern: /\bXMLHttpRequest\b/ },
    { label: 'WebSocket', pattern: /\bWebSocket\b/ },
    { label: 'child_process', pattern: /\bchild_process\b/ },
    { label: 'process', pattern: /\bprocess\s*\./ },
    { label: 'fs module', pattern: /\bfs\s*\./ },
    { label: 'path module', pattern: /\bpath\s*\./ },
    { label: 'os module', pattern: /\bos\s*\./ },
    { label: 'net module', pattern: /\bnet\s*\./ },
    { label: 'http module', pattern: /\bhttps?\s*\./ },
    { label: 'dangerous HTML', pattern: /\bdangerouslySetInnerHTML\b/ },
  ];
  for (const entry of blockedPatterns) {
    if (entry.pattern.test(withoutComments)) {
      errors.push(`blocked token: ${entry.label}`);
    }
  }

  if (!isValidGeneratedComponentName(componentName)) {
    errors.push('invalid component name');
  }
  const exportPattern = new RegExp(
    `\\bexport\\s+(?:const|function|class)\\s+${componentName.replace(/[$]/g, '\\$')}\\b`,
  );
  if (!exportPattern.test(code)) {
    errors.push(`missing named export ${componentName}`);
  }

  return { ok: errors.length === 0, code, errors };
}

function syncGeneratedRegistry(): string[] {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  const files = fs
    .readdirSync(GENERATED_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter(
      (name) =>
        name.endsWith('.tsx') &&
        GENERATED_FILE_PATTERN.test(name.replace(/\.tsx$/, '')) &&
        isValidGeneratedComponentName(name.replace(/\.tsx$/, '')),
    )
    .sort();
  const names = files.map((file) => file.replace(/\.tsx$/, ''));
  const importLines = names.map(
    (name) => `import { ${name} } from "./${name}";`,
  );
  const registryLines = names.map((name) => `  "${name}": ${name},`);
  const content = [
    'import type { ComponentType } from "react";',
    ...importLines,
    '',
    'export type GeneratedSceneProps = {',
    '  accentColor: string;',
    '  bgColor: string;',
    '  textColor: string;',
    '  mutedColor: string;',
    '  characterBody: string;',
    '  characterFace: string;',
    '  characterAccent: string;',
    '  characterShadow: string;',
    '  isRtl: boolean;',
    '  language: string;',
    '  title?: string;',
    '  text?: string;',
    '  keywords?: string[];',
    '  data?: Record<string, unknown>;',
    '  durationInFrames: number;',
    '  showCharacter?: boolean;',
    '};',
    '',
    'export const GENERATED_SCENES: Record<',
    '  string,',
    '  ComponentType<GeneratedSceneProps>',
    '> = {',
    ...registryLines,
    '};',
    '',
  ].join('\n');
  fs.writeFileSync(GENERATED_REGISTRY_FILE, content, 'utf8');
  return names;
}

function writeGeneratedComponentFile(
  componentName: string,
  source: string,
): { ok: boolean; errors: string[]; file?: string } {
  if (!isValidGeneratedComponentName(componentName)) {
    return { ok: false, errors: ['invalid component name'] };
  }
  const sanitized = sanitizeGeneratedTsx(source, componentName);
  if (!sanitized.ok) {
    return { ok: false, errors: sanitized.errors };
  }
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  const file = path.join(GENERATED_DIR, `${componentName}.tsx`);
  fs.writeFileSync(file, `${sanitized.code}\n`, 'utf8');
  syncGeneratedRegistry();
  return { ok: true, errors: [], file };
}

function removeGeneratedComponentFile(componentName: string): void {
  if (!isValidGeneratedComponentName(componentName)) return;
  const file = path.join(GENERATED_DIR, `${componentName}.tsx`);
  try {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch {
    // Best effort cleanup.
  }
  syncGeneratedRegistry();
}

function cleanGeneratedTsxCache(): string[] {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  const removed: string[] = [];
  for (const entry of fs.readdirSync(GENERATED_DIR, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (
      !entry.name.endsWith('.tsx') ||
      !GENERATED_FILE_PATTERN.test(entry.name.replace(/\.tsx$/, ''))
    ) {
      continue;
    }
    try {
      fs.unlinkSync(path.join(GENERATED_DIR, entry.name));
      removed.push(entry.name);
    } catch {
      // Ignore individual failures.
    }
  }
  syncGeneratedRegistry();
  return removed;
}

function sanitizeGeneratedSfxFiles(): string[] {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  const changed: string[] = [];
  for (const entry of fs.readdirSync(GENERATED_DIR, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.tsx')) continue;
    const file = path.join(GENERATED_DIR, entry.name);
    const source = fs.readFileSync(file, 'utf8');
    let keptSceneSfx = false;
    const sanitizedLines: string[] = [];
    for (const line of source.split('\n')) {
      if (/ding-success|notification-chime/i.test(line)) continue;
      if (/<SceneSfx\b/.test(line)) {
        if (keptSceneSfx || /frame=\{0\}/.test(line)) continue;
        keptSceneSfx = true;
        sanitizedLines.push(
          line
            .replace(/volume=\{[^}]*\}/g, 'volume={0.18}')
            .replace(/name="sparkle"/g, 'name="pop"'),
        );
        continue;
      }
      sanitizedLines.push(line);
    }
    const next = sanitizedLines.join('\n');
    if (next !== source) {
      fs.writeFileSync(file, next, 'utf8');
      changed.push(entry.name);
    }
  }
  return changed;
}

function snapshotGeneratedSceneFiles(): Map<string, string | null> {
  const snapshot = new Map<string, string | null>();
  const names = new Set<string>(['index.ts']);
  try {
    for (const entry of fs.readdirSync(GENERATED_DIR, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.tsx')) names.add(entry.name);
    }
  } catch {
    // Generated directory is optional before the first export.
  }
  for (const name of names) {
    try {
      snapshot.set(name, fs.readFileSync(path.join(GENERATED_DIR, name), 'utf8'));
    } catch {
      snapshot.set(name, null);
    }
  }
  return snapshot;
}

function restoreGeneratedSceneFiles(snapshot: Map<string, string | null>): void {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  for (const [name, source] of snapshot) {
    const file = path.join(GENERATED_DIR, name);
    try {
      if (source === null) {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } else {
        fs.writeFileSync(file, source, 'utf8');
      }
    } catch {
      // Best effort restore.
    }
  }
  try {
    for (const entry of fs.readdirSync(GENERATED_DIR, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.tsx') && !snapshot.has(entry.name)) {
        fs.unlinkSync(path.join(GENERATED_DIR, entry.name));
      }
    }
  } catch {
    // Best effort cleanup of any files created during the tweak.
  }
  syncGeneratedRegistry();
}

function validateTweakSceneSources(job: RenderJob): string[] {
  const errors: string[] = [];
  for (let index = 0; index < job.scenes.length; index += 1) {
    const scene = job.scenes[index];
    const name =
      scene.generatedComponent && isValidGeneratedComponentName(scene.generatedComponent)
        ? scene.generatedComponent
        : `Scene${index + 1}`;
    const source = readGeneratedComponentSource(name);
    if (!source) {
      errors.push(`${name}: missing generated scene file`);
      continue;
    }
    const sanitized = sanitizeGeneratedTsx(source, name);
    if (!sanitized.ok) {
      errors.push(`${name}: ${sanitized.errors.slice(0, 4).join(' | ')}`);
    }
  }
  return errors;
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
  track = false,
): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    const child = execFile(
      command,
      args,
      {
        cwd,
        timeout: timeoutMs,
        maxBuffer: 20 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          output: `${stdout || ''}\n${stderr || ''}`,
        });
      },
    );
    if (track) trackExportProcess(child);
  });
}

async function runRootTypeScriptCheck(): Promise<{ ok: boolean; output: string }> {
  return runCommand(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['tsc', '--noEmit'],
    PROJECT_ROOT,
    180000,
  );
}

function generatedTypeScriptErrors(output: string): string {
  return output
    .split(/\r?\n/)
    .filter((line) => /src[\\/]generated[\\/]/.test(line))
    .slice(0, 40)
    .join('\n');
}

function buildLocalCustomSceneSource(componentName: string): string {
  const variant = Array.from(componentName).reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0,
  );
  return buildFallbackSceneSource(componentName, variant);
}

async function requestCustomSceneCode(options: {
  scene: RenderScenePayload;
  componentName: string;
  scriptLanguage: string;
  aspectRatio: string;
  attempts: ChatAttempt[];
  keys: ResolvedApiKeys;
  wcagPrompt?: string;
  previousCode?: string;
  compilerErrors?: string;
}): Promise<string | null> {
  const { scene, componentName, scriptLanguage, aspectRatio, attempts, keys } =
    options;
  const languageMeta = getVideoLanguage(scriptLanguage);
  const systemPrompt = [
    'You are a senior Remotion + React engineer writing a single self-contained TSX scene component.',
    'Return ONLY the complete TSX module. No markdown fences, no commentary.',
    'Only import from: "react", "remotion", "../components/Stickman", "../components/SilhouetteActor", "../components/SmartIcon", "../components/SceneSfx", "@iconify/react", "simple-icons", "@remotion/noise", "@remotion/paths", "@remotion/shapes", "@remotion/transitions", "lucide-react", "d3-geo", "topojson-client", "world-atlas/countries-110m.json", "roughjs", or "@remotion/google-fonts".',
    'Never use fs, path, child_process, os, net, http, https, process, eval, new Function, fetch, XMLHttpRequest, WebSocket, require(), dynamic import(), or any network/file access.',
    'The file must export exactly one named component: ' + componentName + '.',
    'Use this exact Props shape:',
    'type Props = { accentColor: string; bgColor: string; textColor: string; mutedColor: string; characterBody: string; characterFace: string; characterAccent: string; characterShadow: string; isRtl: boolean; language: string; title?: string; text?: string; keywords?: string[]; data?: Record<string, unknown>; durationInFrames: number; showCharacter?: boolean; };',
    'Animate continuously across the entire durationInFrames with useCurrentFrame(), useVideoConfig(), spring(), and interpolate(). Never leave a static frame.',
    'Use SVG, @remotion/shapes, @remotion/paths, and @remotion/noise when useful. Use the faceless Stickman only when showCharacter is true; for human actions (praying, prostrating, sitting at a screen, standing, walking) use <SilhouetteActor pose="..." /> instead. For symbols, concepts, clocks, religious symbols, and brand logos always use <SmartIcon query="..." /> (add brand for company logos) — never hand-draw them from guessed shapes.',
    ZOF_LIBRARY_CAPABILITIES,
    'Strictly apply accentColor and bgColor. Respect isRtl for text direction and composition.',
    `Write every visible label in ${languageMeta.name} (${languageMeta.native}), direction ${languageMeta.dir.toUpperCase()}; never leave English placeholders such as TIME or VALUE when the video language is not English.`,
    `Primary aspect ratio: ${aspectRatio}. Optimize density, visual scale, and hierarchy for this ratio first.`,
    'Use useVideoConfig() to stay responsive across every aspect ratio: const { width, height } = useVideoConfig(); const isLandscape = width > height; const isSquare = width === height; const isPortrait = height > width. Never hardcode a single frame size.',
    'Build layouts with relative units (%, flex, minHeight: 0, overflow: hidden) instead of fixed pixel offsets so the scene cannot overflow when the aspect ratio changes before export.',
    '16:9 landscape: switch to a balanced horizontal two-column split (visuals/charts/character on one side, headline and callout card on the other), keep the content block within maxHeight 72%, and use safe padding of at least 64px horizontal / 48px vertical so heads never touch the top edge and bottom cards never clip.',
    '1:1 square: use compact centered or split spacing with proportional typography and character scaling so every element fits without overlapping.',
    '9:16 portrait: use clean vertical stacking with generous top/bottom safe zones (at least 80px top and 112px bottom) clear of player controls.',
    'Reserve the bottom 22% of the frame for AnimatedCaption; never place critical content there.',
    'Silent/Foley-only scenes must remain visually complete without music or voiceover.',
    'TypeScript strict mode and noUnusedLocals are enabled: every import and local must be used and all values typed.',
    options.wcagPrompt || '',
  ].join('\n');
  const userPrompt = [
    `Scene title: ${scene.title}`,
    `Narration: ${scene.narration}`,
    `Visual label: ${scene.visualLabel}`,
    `Visual value: ${scene.visualValue}`,
    `Brief: ${scene.customCodeBrief || scene.visualPrompt || scene.narration}`,
    `Keywords: ${(scene.visualKeywords || []).join(' | ')}`,
    `Language: ${languageMeta.name} (${languageMeta.native}) — ${languageMeta.dir.toUpperCase()}`,
    `Aspect ratio: ${aspectRatio}`,
    options.previousCode
      ? `Previous attempt:\n${options.previousCode}\n\nCompiler errors:\n${options.compilerErrors || 'none'}`
      : 'Write the first version now.',
  ].join('\n');

  for (const attempt of attempts.slice(0, 3)) {
    const result = await requestChatCompletion(
      attempt,
      systemPrompt,
      userPrompt,
      keys,
    );
    if (!result) continue;
    const code = extractGeneratedTsxCode(result.content);
    if (code) return code;
  }
  return null;
}

async function generateAndValidateCustomScene(options: {
  scene: RenderScenePayload;
  componentName: string;
  scriptLanguage: string;
  aspectRatio: string;
  attempts: ChatAttempt[];
  keys: ResolvedApiKeys;
  wcagPrompt?: string;
}): Promise<{ ok: boolean; source: 'ai' | 'library-template' | 'none'; errors: string[] }> {
  let previousCode = '';
  let compilerErrors = '';
  for (let round = 0; round < 3; round += 1) {
    const aiCode = await requestCustomSceneCode({
      ...options,
      previousCode: previousCode || undefined,
      compilerErrors: compilerErrors || undefined,
    });
    if (!aiCode) break;
    const written = writeGeneratedComponentFile(options.componentName, aiCode);
    if (written.ok) {
      const check = await runRootTypeScriptCheck();
      const generatedErrors = generatedTypeScriptErrors(check.output);
      if (!generatedErrors) {
        return { ok: true, source: 'ai', errors: [] };
      }
      compilerErrors = generatedErrors;
      previousCode = aiCode;
    } else {
      compilerErrors = written.errors.join('\n');
      previousCode = aiCode;
    }
    removeGeneratedComponentFile(options.componentName);
  }

  const localSource = buildLocalCustomSceneSource(options.componentName);
  const localWritten = writeGeneratedComponentFile(
    options.componentName,
    localSource,
  );
  if (localWritten.ok) {
    const check = await runRootTypeScriptCheck();
    const generatedErrors = generatedTypeScriptErrors(check.output);
    if (!generatedErrors) {
      return { ok: true, source: 'library-template', errors: [] };
    }
    removeGeneratedComponentFile(options.componentName);
    return {
      ok: false,
      source: 'none',
      errors: [generatedErrors],
    };
  }
  return { ok: false, source: 'none', errors: localWritten.errors };
}

function makeGeneratedComponentName(sceneId: string, index: number): string {
  const cleaned = sceneId.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 36);
  return `CustomScene_${cleaned || 'scene'}_${index}`;
}

async function maybeGenerateCreativeScenes(
  scenes: RenderScenePayload[],
  options: {
    creativeCodeMode: string;
    scriptLanguage: string;
    aspectRatio: string;
    attempts: ChatAttempt[];
    keys: ResolvedApiKeys;
    wcagPrompt?: string;
  },
): Promise<{ scenes: RenderScenePayload[]; generated: string[]; failed: string[] }> {
  if (options.creativeCodeMode !== 'creative') {
    return { scenes, generated: [], failed: [] };
  }
  const generated: string[] = [];
  const failed: string[] = [];
  const candidates = scenes
    .map((scene, index) => ({ scene, index }))
    .filter(({ scene }) => {
      return (
        scene.visualType === 'custom-tsx' ||
        (scene.visualType === 'custom' && Boolean(scene.customCodeBrief))
      );
    })
    .slice(0, 3);

  for (const { scene, index } of candidates) {
    const componentName = makeGeneratedComponentName(scene.id, index);
    const result = await generateAndValidateCustomScene({
      scene,
      componentName,
      scriptLanguage: options.scriptLanguage,
      aspectRatio: options.aspectRatio,
      attempts: options.attempts,
      keys: options.keys,
      wcagPrompt: options.wcagPrompt,
    });
    if (result.ok) {
      scene.generatedComponent = componentName;
      scene.visualType = 'custom-tsx';
      generated.push(componentName);
    } else {
      scene.generatedComponent = undefined;
      scene.visualType = 'generative-scene';
      if (!scene.visualKeywords || scene.visualKeywords.length === 0) {
        scene.visualKeywords = [scene.title, scene.visualLabel, 'Action'].filter(Boolean);
      }
      if (!scene.motif) scene.motif = 'flow';
      failed.push(componentName);
    }
  }
  return { scenes, generated, failed };
}

function buildChatAttempts(
  provider: AiProviderId,
  model: string,
  keys: ResolvedApiKeys,
): ChatAttempt[] {
  const attempts: ChatAttempt[] = [];
  const seen = new Set<string>();
  const push = (attempt: ChatAttempt) => {
    const signature = `${attempt.kind}:${attempt.model}:${attempt.baseUrl || ''}`;
    if (seen.has(signature)) return;
    seen.add(signature);
    attempts.push(attempt);
  };
  const pushOpenRouter = (requested: string) => {
    if (!keys.openrouterKey) return;
    push({
      kind: 'openrouter',
      providerLabel: 'OpenRouter',
      model: mapOpenRouterModel(requested),
    });
  };
  const pushDeepSeek = (requested: string) => {
    if (!keys.deepseekKey) return;
    push({
      kind: 'deepseek',
      providerLabel: 'DeepSeek',
      model: mapDeepSeekModel(requested),
    });
  };
  const pushKieAi = (requested: string) => {
    if (!keys.kieaiKey) return;
    push({
      kind: 'kieai',
      providerLabel: 'Kie.ai',
      model: KIEAI_MODELS.some((item) => item.id === requested)
        ? requested
        : KIEAI_MODELS[0].id,
      baseUrl: 'https://api.kie.ai/api/v1/chat/completions',
    });
  };
  const pushCustom = (requested: string) => {
    if (!keys.customProviderKey || !keys.customProviderBaseUrl) return;
    push({
      kind: 'custom',
      providerLabel: keys.customProviderName,
      model: requested || 'custom-model',
    });
  };

  if (provider === 'opencode-free') {
    const primaryOpenRouter = mapOpenRouterModel(model);
    pushOpenRouter(model);
    pushDeepSeek(model);
    FREE_FALLBACK_MODELS.filter((item) => item !== primaryOpenRouter)
      .slice(0, 2)
      .forEach(pushOpenRouter);
  } else if (provider === 'deepseek') {
    pushDeepSeek(model);
    pushOpenRouter(model);
  } else if (provider === 'openrouter') {
    pushOpenRouter(model);
    pushDeepSeek(model);
  } else if (provider === 'kieai') {
    pushKieAi(model);
    pushOpenRouter(model);
    pushDeepSeek(model);
  } else {
    pushCustom(model);
    pushOpenRouter(model);
    pushDeepSeek(model);
    pushKieAi(model);
  }
  pushOpenRouter(model);
  pushDeepSeek(model);
  pushKieAi(model);
  pushCustom(model);
  return attempts;
}

const SMART_EDIT_VISUAL_KEYS = [
  'pose',
  'visualType',
  'visualLabel',
  'visualValue',
  'visualPrompt',
  'visualSvg',
  'layout',
  'camera',
  'background',
  'backgroundPreset',
  'visualKeywords',
  'motif',
  'showCharacter',
  'customCodeBrief',
  'characters',
  'characterLayout',
  'ambientScene',
  'sfxCues',
  'sfxAt',
] as const;

function compactSceneForPrompt(scene: RenderScenePayload): Record<string, unknown> {
  const {
    audioDataUrl: _audioDataUrl,
    visualSvg: _visualSvg,
    ...rest
  } = scene;
  return rest;
}

function pickSmartEditTsx(record: Record<string, unknown>): string {
  for (const key of [
    'tsxCode',
    'generatedCode',
    'componentCode',
    'customTsx',
    'tsx',
  ]) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}

type ExportTargetDuration =
  | '3'
  | '5'
  | '8'
  | '12'
  | '15'
  | '30'
  | '45'
  | '60'
  | '90'
  | 'auto';

const EXPORT_TARGET_DURATIONS: readonly ExportTargetDuration[] = [
  '3',
  '5',
  '8',
  '12',
  '15',
  '30',
  '45',
  '60',
  '90',
  'auto',
];

const PROMPT_ONLY_SINGLE_SCENE_MAX_SECONDS = 8;
const PROMPT_ONLY_TWO_SCENE_MAX_SECONDS = 15;
type ExportStepId = 'audio' | 'code' | 'render';

const EXPORT_LOCK_TTL_MS = 3 * 60 * 60 * 1000;

let activeExportLock: { jobId: string; startedAt: number } | null = null;

function exportLockIsActive(): boolean {
  if (!activeExportLock) return false;
  if (Date.now() - activeExportLock.startedAt > EXPORT_LOCK_TTL_MS) {
    activeExportLock = null;
    return false;
  }
  return true;
}

function acquireExportLock(jobId: string): boolean {
  if (exportLockIsActive()) return false;
  activeExportLock = { jobId, startedAt: Date.now() };
  return true;
}

function releaseExportLock(jobId: string): void {
  if (activeExportLock?.jobId === jobId) {
    activeExportLock = null;
  }
}

function cancelActiveExport(reason: string): string | null {
  const jobId = activeExportLock?.jobId;
  if (!jobId) return null;

  cancelledExportJobs.add(jobId);
  killAllExportProcesses();

  const job = renderJobs.get(jobId);
  if (job && job.status !== 'completed') {
    job.status = 'cancelled';
    job.error = reason;
  }

  const emit = exportStreamEmitters.get(jobId);
  if (emit) {
    emit('cancelled', {
      jobId,
      message: reason,
    });
  }

  releaseExportLock(jobId);
  return jobId;
}

function normalizeTargetDuration(value: unknown): ExportTargetDuration {
  return EXPORT_TARGET_DURATIONS.includes(value as ExportTargetDuration)
    ? (value as ExportTargetDuration)
    : 'auto';
}

function exportSceneCount(
  prompt: string,
  targetDuration: ExportTargetDuration,
  voiceoverEnabled: boolean,
): number {
  if (!voiceoverEnabled) {
    if (targetDuration === 'auto') return 4;
    const seconds = Number(targetDuration);
    if (!Number.isFinite(seconds) || seconds <= 0) return 4;
    if (seconds <= PROMPT_ONLY_SINGLE_SCENE_MAX_SECONDS) return 1;
    if (seconds <= PROMPT_ONLY_TWO_SCENE_MAX_SECONDS) return 2;
    return Math.min(6, Math.max(3, Math.round(seconds / 15)));
  }
  if (targetDuration === '3' || targetDuration === '5') return 1;
  if (targetDuration === '8') return 2;
  if (targetDuration === '12' || targetDuration === '15') return 3;
  if (targetDuration === '30') return 6;
  if (targetDuration === '45') return 8;
  if (targetDuration === '60') return 10;
  if (targetDuration === '90') return 14;
  const words = prompt.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(16, Math.max(5, Math.ceil(words / 16)));
}

const SCRIPT_DOMAIN_TLDS = [
  'com',
  'net',
  'org',
  'io',
  'ai',
  'co',
  'dev',
  'app',
] as const;

const DOMAIN_DOT_SPACING_PATTERN = new RegExp(
  `([\\p{L}\\p{N}][\\p{L}\\p{N}-]*)\\.\\s+(${SCRIPT_DOMAIN_TLDS.join('|')})(?![\\p{L}\\p{N}])`,
  'giu',
);

function normalizeDomainDotSpacing(rawText: string): string {
  return rawText.replace(DOMAIN_DOT_SPACING_PATTERN, '$1.$2');
}

function splitScriptSentences(rawText: string): string[] {
  const text = normalizeDomainDotSpacing(
    rawText
      .replace(/\r/g, ' ')
      .replace(/[\t\n]+/g, ' ')
      .replace(/ {2,}/g, ' ')
      .trim(),
  );
  if (!text) return [];
  // Only break after real sentence-ending punctuation that is followed by
  // whitespace or the end of the string. Domain dots such as "example.net"
  // (including accidental "example. net" spacing, normalized above) are
  // followed by a TLD, which is never a sentence boundary.
  return text
    .split(/(?<=[.!?؟。！])(?=\s|$)/u)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function splitScriptIntoChunks(prompt: string, count: number): string[] {
  const text = prompt.replace(/\r/g, ' ').trim();
  if (!text) return [];
  const sentences = splitScriptSentences(text);

  const chunks: string[] = [];
  if (sentences.length >= count) {
    const targetLength = text.length / count;
    let current: string[] = [];
    let currentLength = 0;
    for (const sentence of sentences) {
      const remainingSentences = sentences.length - (chunks.length + 1);
      const shouldFlush =
        current.length > 0 &&
        (currentLength >= targetLength || chunks.length + 1 === count);
      if (shouldFlush && chunks.length + 1 < count) {
        chunks.push(current.join(' '));
        current = [];
        currentLength = 0;
      }
      current.push(sentence);
      currentLength += sentence.length + 1;
      if (chunks.length + 1 === count && remainingSentences >= 0) {
        chunks.push(current.join(' '));
        current = [];
        currentLength = 0;
        break;
      }
    }
    if (current.length > 0 && chunks.length < count) {
      chunks.push(current.join(' '));
    }
  }

  if (chunks.length === 0) {
    const words = text.split(/\s+/).filter(Boolean);
    const perChunk = Math.max(1, Math.ceil(words.length / count));
    for (let index = 0; index < count; index += 1) {
      const slice = words.slice(index * perChunk, (index + 1) * perChunk);
      if (slice.length > 0) chunks.push(slice.join(' '));
    }
  }

  while (chunks.length < count) {
    const longest = chunks.reduce(
      (best, chunk, index) =>
        chunk.length > (chunks[best]?.length || 0) ? index : best,
      0,
    );
    const words = (chunks[longest] || text).split(/\s+/).filter(Boolean);
    if (words.length <= 1) break;
    const midpoint = Math.ceil(words.length / 2);
    chunks[longest] = words.slice(0, midpoint).join(' ');
    chunks.splice(longest + 1, 0, words.slice(midpoint).join(' '));
  }

  return chunks.slice(0, count);
}

function sceneTitleFromNarration(
  narration: string,
  index: number,
  used: Set<string>,
): string {
  const cleaned = narration
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned.split(' ').filter(Boolean).slice(0, 7);
  let title = words.join(' ') || `Scene ${index + 1}`;
  title = title.slice(0, 72).trim();
  if (used.has(title.toLowerCase())) {
    title = `${title} ${index + 1}`;
  }
  used.add(title.toLowerCase());
  return title;
}

function splitSpokenScriptIntoBeats(script: string): string[] {
  const text = script.replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return [];
  const sentences = splitScriptSentences(text).filter((part) =>
    /[\p{L}\p{N}]/u.test(part),
  );

  const beats: string[] = [];
  const flushClauses = (sentence: string) => {
    const clauses = sentence
      .split(/(?<=[،,;؛:])\s+|\s+[—–]\s+/u)
      .map((part) => part.trim())
      .filter((part) => /[\p{L}\p{N}]/u.test(part));
    if (clauses.length <= 1) {
      beats.push(sentence);
      return;
    }
    let current: string[] = [];
    let currentWords = 0;
    const flush = () => {
      if (current.length > 0) {
        beats.push(current.join(' '));
        current = [];
        currentWords = 0;
      }
    };
    for (const clause of clauses) {
      const words = clause.split(/\s+/).filter(Boolean).length;
      if (currentWords > 0 && currentWords + words > 30) flush();
      current.push(clause);
      currentWords += words;
    }
    flush();
  };

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).filter(Boolean).length;
    if (words > 34) {
      flushClauses(sentence);
    } else {
      beats.push(sentence);
    }
  }
  return beats;
}

function buildVoiceoverScenePlan(
  script: string,
): Array<{ title: string; narration: string; durationSec: number }> {
  const beats = splitSpokenScriptIntoBeats(script);
  const usedTitles = new Set<string>();
  return beats.map((narration, index) => {
    const words = narration.split(/\s+/).filter(Boolean).length;
    return {
      title: sceneTitleFromNarration(narration, index, usedTitles),
      narration,
      durationSec: Math.max(2, Number((words * 0.4 + 0.25).toFixed(2))),
    };
  });
}

function buildExportScenePlan(
  prompt: string,
  targetDuration: ExportTargetDuration,
  voiceoverEnabled: boolean,
): Array<{ title: string; narration: string; durationSec: number }> {
  const effectiveTarget = targetDuration === 'auto' && !voiceoverEnabled ? '60' : targetDuration;
  const count = exportSceneCount(prompt, effectiveTarget, voiceoverEnabled);
  const chunks = splitScriptIntoChunks(prompt, count);
  const targetSeconds =
    effectiveTarget === 'auto' ? null : Number(effectiveTarget);
  const usedTitles = new Set<string>();

  return chunks.map((narration, index) => {
    const words = narration.split(/\s+/).filter(Boolean).length;
    const estimate = Math.max(2.6, Number((words * 0.48 + 0.8).toFixed(2)));
    const durationSec = targetSeconds
      ? Number((targetSeconds / Math.max(1, chunks.length)).toFixed(3))
      : estimate;
    return {
      title: sceneTitleFromNarration(narration, index, usedTitles),
      narration,
      durationSec,
    };
  });
}

function exportSfxId(index: number): string {
  const catalog = [
    'whoosh-soft',
    'pop-soft',
    'click-subtle',
    'type-tick',
    'slide',
    'impact-soft',
  ];
  return catalog[index % catalog.length];
}

function buildExportScenes(options: {
  jobId: string;
  prompt: string;
  targetDuration: ExportTargetDuration;
  voiceoverEnabled: boolean;
  sfxEnabled: boolean;
  language: string;
  spokenScript?: string;
}): RenderScenePayload[] {
  const scriptForVoiceover =
    options.voiceoverEnabled && options.spokenScript?.trim()
      ? options.spokenScript.trim()
      : '';
  const plan = scriptForVoiceover
    ? buildVoiceoverScenePlan(scriptForVoiceover)
    : buildExportScenePlan(
        options.prompt,
        options.targetDuration,
        options.voiceoverEnabled,
      );

  return plan.map((item, index) => {
    const keyPhrase = item.title
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 5)
      .join(' ');
    return {
      id: `scene-${options.jobId}-${index + 1}`,
      title: item.title,
      narration: item.narration,
      pose: index % 2 === 0 ? 'explaining' : 'pointing',
      visualType: 'custom-tsx',
      visualLabel: item.title,
      visualValue: keyPhrase || item.title,
      customCodeBrief: item.narration,
      visualKeywords: keyPhrase ? [keyPhrase] : [item.title],
      showCharacter: index === 0 || index === plan.length - 1,
      durationSec: item.durationSec,
      backgroundPreset: 'ai-free',
      ...(options.sfxEnabled
        ? {
            sfxId: exportSfxId(index),
            sfxAt: 0.15,
          }
        : {}),
    };
  });
}

function syncExportProject(job: RenderJob): void {
  try {
    const project = normalizeProjectState({
      topic: job.masterPrompt || job.scenes.map((scene) => scene.narration).join(' '),
      scenes: job.scenes,
      aiProvider: studioSettings.aiProvider,
      aiModel: studioSettings.aiModel,
      voiceId: job.voiceId,
      voiceModelId: job.modelId,
      voiceStability: job.voiceStability,
      voiceSimilarityBoost: job.voiceSimilarityBoost,
      voiceStyle: job.voiceStyle,
      voiceSpeakerBoost: job.voiceSpeakerBoost,
      voiceSpeed: job.voiceSpeed,
      voiceoverEnabled: job.voiceoverEnabled,
      cleanBrollMode: job.cleanBrollMode,
      visualStyle: job.visualStyle,
      aspectRatio: job.aspectRatio,
      fps: job.fps,
      scriptLanguage: job.scriptLanguage,
      scriptDepth: job.scriptDepth,
      creativeCodeMode: 'creative',
      scriptPacing: job.scriptPacing,
      captionAnimationStyle: job.captionAnimationStyle,
      captionColors: job.captionColors,
      captionBottomOffset: job.captionBottomOffset,
      wordsPerScreen: job.wordsPerScreen,
      captionsEnabled: job.captionsEnabled,
      respectSafeZone: job.respectSafeZone,
      brandKit: job.brandKit,
      sfxEnabled: job.sfxEnabled,
      sfxVolume: job.sfxVolume,
      sfxMode: job.sfxMode,
      backgroundPreset: job.backgroundPreset,
      selectedSceneId: job.scenes[0]?.id,
      updatedAt: Date.now(),
    });
    if (project) saveProjectState(project);
  } catch {
    // Project persistence must never interrupt an export.
  }
}

function expectedGeneratedSceneNames(count: number): string[] {
  return Array.from({ length: Math.max(1, count) }, (_, index) => `Scene${index + 1}`);
}

function buildFallbackLayoutMarkup(variantIndex: number): string {
  const safeIndex = Number.isFinite(variantIndex)
    ? Math.abs(Math.floor(variantIndex))
    : 0;
  switch (safeIndex % 4) {
    case 1:
      return `
      <div style={{ width: "82%", maxWidth: 860, display: "flex", flexDirection: "column", gap: 18, textAlign: align, opacity: enter, transform: "translateY(" + (1 - enter) * 44 + "px)" }}>
        <div style={{ fontSize: 58, fontWeight: 900, lineHeight: 1.1, color: props.textColor }}>{title}</div>
        {keywords.map((word, index) => {
          const itemEnter = spring({ frame: frame - index * 14 - 6, fps, config: { damping: 16, mass: 0.6, stiffness: 120 } });
          const done = progress > (index + 1) / (keywords.length + 1);
          return (
            <div key={word + index} style={{ display: "flex", alignItems: "center", gap: 18, padding: "20px 24px", borderRadius: 22, background: props.bgColor + "dd", border: "1px solid " + (done ? props.accentColor : props.mutedColor + "33"), opacity: itemEnter, transform: "translateY(" + (1 - itemEnter) * 28 + "px)" }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, border: "2px solid " + (done ? props.accentColor : props.mutedColor + "55"), display: "flex", alignItems: "center", justifyContent: "center", background: done ? props.accentColor + "22" : "transparent", color: props.accentColor, fontSize: 24, fontWeight: 900 }}>{done ? "✓" : ""}</div>
              <div style={{ flex: 1, fontSize: 28, fontWeight: 700, color: props.textColor }}>{word}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: props.mutedColor }}>{done ? "100%" : "..."}</div>
            </div>
          );
        })}
        {text ? <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.5, color: props.mutedColor }}>{text}</div> : null}
        <div style={{ height: 10, borderRadius: 999, background: props.mutedColor + "22", overflow: "hidden" }}>
          <div style={{ width: Math.round(progress * 100) + "%", height: "100%", background: props.accentColor }} />
        </div>
      </div>
      `;
    case 2:
      return `
      <div style={{ width: "84%", maxWidth: 900, display: "flex", flexDirection: "column", gap: 20, textAlign: align, opacity: enter, transform: "translateY(" + (1 - enter) * 40 + "px)" }}>
        <div style={{ fontSize: 58, fontWeight: 900, lineHeight: 1.1, color: props.textColor }}>{title}</div>
        {text ? <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.5, color: props.mutedColor }}>{text}</div> : null}
        {keywords.map((word, index) => {
          const value = Math.max(0.08, Math.min(1, progress * ((index + 1) / keywords.length)));
          return (
            <div key={word + index} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: props.textColor, fontSize: 26, fontWeight: 700 }}>
                <span>{word}</span>
                <span style={{ color: props.accentColor }}>{Math.round(value * 100)}%</span>
              </div>
              <div style={{ height: 18, borderRadius: 999, background: props.mutedColor + "22", overflow: "hidden" }}>
                <div style={{ width: Math.round(value * 100) + "%", height: "100%", borderRadius: 999, background: index % 2 === 0 ? props.accentColor : props.characterAccent }} />
              </div>
            </div>
          );
        })}
      </div>
      `;
    case 3:
      return `
      <div style={{ width: "86%", maxWidth: 920, display: "flex", flexDirection: "column", gap: 20, textAlign: align, opacity: enter, transform: "translateY(" + (1 - enter) * 44 + "px)" }}>
        <div style={{ fontSize: 58, fontWeight: 900, lineHeight: 1.1, color: props.textColor }}>{title}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18 }}>
          {keywords.map((word, index) => {
            const itemEnter = spring({ frame: frame - index * 12, fps, config: { damping: 15, mass: 0.6, stiffness: 130 } });
            const pulse = 1 + Math.sin(frame / 12 + index) * 0.04;
            return (
              <div key={word + index} style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: props.isRtl ? "flex-end" : "flex-start", padding: "24px 22px", borderRadius: 24, background: props.bgColor + "dd", border: "1px solid " + props.accentColor + "55", opacity: itemEnter, transform: "translateY(" + (1 - itemEnter) * 24 + "px) scale(" + itemEnter * pulse + ")" }}>
                <div style={{ width: 52, height: 52, borderRadius: 18, background: props.accentColor + "22", border: "1px solid " + props.accentColor + "66", display: "flex", alignItems: "center", justifyContent: "center", color: props.accentColor, fontSize: 24, fontWeight: 900 }}>{String(index + 1).padStart(2, "0")}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: props.textColor }}>{word}</div>
              </div>
            );
          })}
        </div>
        {text ? <div style={{ fontSize: 25, fontWeight: 600, lineHeight: 1.5, color: props.mutedColor }}>{text}</div> : null}
        <div style={{ height: 10, borderRadius: 999, background: props.mutedColor + "22", overflow: "hidden" }}>
          <div style={{ width: Math.round(progress * 100) + "%", height: "100%", background: props.accentColor }} />
        </div>
      </div>
      `;
    default:
      return `
      <div style={{ width: "84%", maxWidth: 900, borderRadius: 32, background: props.bgColor + "ee", border: "1px solid " + props.accentColor + "55", boxShadow: "0 40px 120px " + props.accentColor + "22", opacity: enter, transform: "translateY(" + (1 - enter) * 60 + "px) scale(" + (0.92 + enter * 0.08) + ")", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 24px", borderBottom: "1px solid " + props.accentColor + "33", background: props.bgColor + "cc" }}>
          {[0, 1, 2].map((dot) => (
            <div key={"dot-" + dot} style={{ width: 16, height: 16, borderRadius: 999, background: dot === 0 ? props.accentColor : props.mutedColor, opacity: dot === 0 ? 0.9 : 0.4 }} />
          ))}
          <div style={{ flex: 1, height: 34, borderRadius: 999, background: props.bgColor + "aa", border: "1px solid " + props.accentColor + "33", display: "flex", alignItems: "center", padding: "0 16px", color: props.mutedColor, fontSize: 20, fontWeight: 600 }}>{title}</div>
        </div>
        <div style={{ padding: "40px 44px", display: "flex", flexDirection: "column", gap: 20, textAlign: align }}>
          <div style={{ fontSize: 62, fontWeight: 900, lineHeight: 1.1, color: props.textColor }}>{title}</div>
          {text ? <div style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.5, color: props.mutedColor }}>{text}</div> : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: props.isRtl ? "flex-end" : "flex-start" }}>
            {keywords.map((word, index) => {
              const itemEnter = spring({ frame: frame - index * 12, fps, config: { damping: 16, mass: 0.6, stiffness: 120 } });
              return (
                <div key={word + index} style={{ padding: "10px 20px", borderRadius: 999, border: "1px solid " + props.accentColor + "66", background: props.bgColor + "cc", color: props.textColor, fontSize: 26, fontWeight: 700, opacity: itemEnter, transform: "translateY(" + (1 - itemEnter) * 20 + "px)" }}>{word}</div>
              );
            })}
          </div>
          <div style={{ height: 12, borderRadius: 999, background: props.mutedColor + "22", overflow: "hidden" }}>
            <div style={{ width: Math.round(progress * 100) + "%", height: "100%", background: props.accentColor }} />
          </div>
        </div>
      </div>
      `;
  }
}

function buildFallbackSceneSource(
  componentName: string,
  variantIndex = 0,
): string {
  const layout = buildFallbackLayoutMarkup(variantIndex);
  return `import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Stickman } from "../components/Stickman";
import { SceneSfx } from "../components/SceneSfx";

type Props = {
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

export const ${componentName} = (props: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = interpolate(frame, [0, Math.max(1, props.durationInFrames - 1)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const enter = spring({ frame, fps, config: { damping: 18, mass: 0.7, stiffness: 90 } });
  const beat = Math.sin((frame / Math.max(1, fps)) * 1.8);
  const title = props.title?.trim() || "Zof Studio";
  const text = props.text?.trim() || "";
  const keywords = (props.keywords && props.keywords.length > 0 ? props.keywords : [title]).slice(0, 4);
  const align = props.isRtl ? "right" : "left";
  const rtl = props.isRtl ? "rtl" : "ltr";
  const exit = interpolate(frame, [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: props.bgColor, overflow: "hidden", direction: rtl }}>
      <SceneSfx name="pop" frame={12} volume={0.18} />
      <SceneSfx name="whoosh" frame={48} volume={0.16} />
      <div style={{ position: "absolute", inset: 0, opacity: exit, transform: "translateY(" + (1 - exit) * -10 + "px)" }}>
        <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 18%, " + props.accentColor + "33 0%, transparent 62%)" }} />
        <div style={{ position: "absolute", top: "14%", left: "50%", width: 580 + beat * 26, height: 580 + beat * 26, marginLeft: -(580 + beat * 26) / 2, borderRadius: "50%", border: "2px solid " + props.accentColor + "22" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8%" }}>
${layout}
        </div>
        {props.showCharacter ? (
          <div style={{ position: "absolute", bottom: "10%", [props.isRtl ? "left" : "right"]: 56, width: 200, height: 300 }}>
            <Stickman pose="explaining" color={props.characterBody} faceColor={props.characterFace} accent={props.characterAccent} shadow={props.characterShadow} />
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
`;
}

function expectedGeneratedNamesForJob(job: RenderJob): string[] {
  return job.scenes.map((scene, index) =>
    scene.generatedComponent && isValidGeneratedComponentName(scene.generatedComponent)
      ? scene.generatedComponent
      : `Scene${index + 1}`,
  );
}

function generatedSceneVariantIndexes(job: RenderJob): Map<string, number> {
  const variants = new Map<string, number>();
  job.scenes.forEach((scene, index) => {
    const name =
      scene.generatedComponent &&
      isValidGeneratedComponentName(scene.generatedComponent)
        ? scene.generatedComponent
        : `Scene${index + 1}`;
    if (!variants.has(name)) variants.set(name, index);
  });
  return variants;
}

function generatedErrorComponentNames(errors: string): Set<string> {
  const names = new Set<string>();
  for (const line of errors.split(/\r?\n/)) {
    const match = line.match(
      /src[\\/]generated[\\/]([A-Za-z_$][A-Za-z0-9_$]*)\.tsx/,
    );
    if (match && match[1] !== 'index') names.add(match[1]);
  }
  return names;
}

function repairGeneratedSceneFiles(job: RenderJob): void {
  const expected = Array.from(new Set(expectedGeneratedNamesForJob(job)));
  const variants = generatedSceneVariantIndexes(job);
  let repaired = false;
  for (const name of expected) {
    const file = path.join(GENERATED_DIR, `${name}.tsx`);
    const variant = variants.get(name) ?? 0;
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, buildFallbackSceneSource(name, variant), 'utf8');
      repaired = true;
      console.log(
        `[export] generated scene ${name} was missing; wrote its distinct fallback layout.`,
      );
      continue;
    }
    try {
      const source = fs.readFileSync(file, 'utf8');
      const sanitized = sanitizeGeneratedTsx(source, name);
      if (!sanitized.ok) {
        console.log(
          `[export] generated scene ${name} failed validation: ${sanitized.errors.join(' | ')}`,
        );
        fs.writeFileSync(file, buildFallbackSceneSource(name, variant), 'utf8');
        repaired = true;
      } else if (sanitized.code !== source.trim()) {
        fs.writeFileSync(file, `${sanitized.code}\n`, 'utf8');
        repaired = true;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(
        `[export] generated scene ${name} could not be read: ${message}`,
      );
      fs.writeFileSync(file, buildFallbackSceneSource(name, variant), 'utf8');
      repaired = true;
    }
  }
  syncGeneratedRegistry();
  if (repaired) {
    console.log('[export] repaired generated scene files with safe fallbacks.');
  }
}

function repairFailingGeneratedScenes(
  job: RenderJob,
  errors: string,
): string[] {
  const failing = generatedErrorComponentNames(errors);
  if (failing.size === 0) return [];
  const variants = generatedSceneVariantIndexes(job);
  const repaired: string[] = [];
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  for (const name of failing) {
    if (!isValidGeneratedComponentName(name)) continue;
    const variant = variants.get(name) ?? 0;
    console.log(
      `[export] replacing only failing generated scene ${name} with its distinct fallback layout.`,
    );
    fs.writeFileSync(
      path.join(GENERATED_DIR, `${name}.tsx`),
      buildFallbackSceneSource(name, variant),
      'utf8',
    );
    repaired.push(name);
  }
  if (repaired.length > 0) syncGeneratedRegistry();
  return repaired;
}

function attachGeneratedComponents(job: RenderJob, preserveExisting = false): void {
  job.scenes.forEach((scene, index) => {
    const existing =
      preserveExisting &&
      scene.generatedComponent &&
      isValidGeneratedComponentName(scene.generatedComponent) &&
      fs.existsSync(path.join(GENERATED_DIR, `${scene.generatedComponent}.tsx`))
        ? scene.generatedComponent
        : `Scene${index + 1}`;
    scene.generatedComponent = existing;
    scene.visualType = 'custom-tsx';
    scene.customCodeBrief = scene.customCodeBrief || scene.narration;
    if (!scene.visualKeywords || scene.visualKeywords.length === 0) {
      scene.visualKeywords = scene.title.split(/\s+/).slice(0, 5);
    }
  });
}

function cleanBrollPromptSection(enabled: boolean): string[] {
  if (enabled) {
    return [
      '## CLEAN B-ROLL MODE (ENABLED by the user)',
      '- Fill the frame with the primary visual at 100% width and 100% height (full-bleed) and drive it with a smooth continuous camera pan/zoom. Never box the main visual inside a small card.',
      '- ZERO TOP HEADER RULE: render NO top <header>, no kicker, no scene title, no title badge, no top banner, and no prompt-echo descriptive text anywhere in the frame.',
      '- Do NOT reserve a top 22% headline band in this mode. The visual owns the full canvas edge-to-edge.',
      '- Render only diegetic labels that belong inside the graphic: city names, map labels, data values, axis labels, and explicitly requested callout cards.',
      '- Keep Y-axis tick labels offset from the axis line with textAnchor="end" and x={axisX - 14} (plus at least 56px left padding) so values such as 10x / 20x / 30x are never struck through by the axis stroke.',
      '- Keep every floating card and 2.5D SpatialCard fully outside the plot rectangle, axis lines, gridlines, and data labels with at least a 24px gap.',
      '- This layout applies ONLY because cleanBrollMode is true. Never enable it just because the voiceover is disabled.',
    ];
  }
  return [
    '## FULL TYPOGRAPHY MODE (cleanBrollMode OFF — user-selected)',
    '- Render complete typography, scene titles, structured headers, kickers, and callout text normally, even when the voiceover is disabled.',
    '- Never hide or suppress headers merely because voiceoverEnabled is false.',
  ];
}

const VISUAL_ARCHETYPES = [
  'full-bleed kinetic typography',
  'split-screen comparison',
  'dynamic camera pan across a large canvas',
  'minimal icon-driven beat',
  'data-first chart or diagram',
  'clean B-Roll visual',
  'timeline or process flow',
  'spatial 2.5D depth stack',
];

function captionStyleDisplayName(value: string): string {
  switch (value) {
    case 'word-by-word':
    case 'word-pop-glow':
      return 'word-by-word pop/reveal';
    case 'karaoke':
    case 'dynamic-karaoke':
      return 'karaoke active-word highlight';
    case 'static':
    case 'smooth-chunk-slide':
      return 'static clean subtitle block';
    case 'kinetic-typewriter':
      return 'kinetic typewriter';
    default:
      return 'word-by-word pop/reveal';
  }
}

function buildOpenCodeScenePrompt(job: RenderJob): string {
  const languageMeta = getVideoLanguage(job.scriptLanguage);
  const languageName = languageMeta.name;
  const languageDirection = languageMeta.dir.toUpperCase();
  const characterMomentIndices = new Set<number>();
  if (job.scenes.length > 0) {
    characterMomentIndices.add(0);
    if (job.scenes.length > 1) {
      characterMomentIndices.add(job.scenes.length - 1);
    }
  }
  const sceneLines = job.scenes
    .map((scene, index) => {
      const frames = sceneDurationInFrames(scene, job.fps);
      const renderedFrames =
        job.scenes.length > 1
          ? frames + TRANSITION_DURATION_IN_FRAMES
          : frames;
      return [
        `Scene${index + 1}`,
        job.cleanBrollMode
          ? `concept (internal semantic anchor — NEVER render it as a header): ${scene.title}`
          : `title: ${scene.title}`,
        `narration: ${scene.narration}`,
        `keyPhrases: ${(scene.visualKeywords?.length ? scene.visualKeywords : [scene.visualLabel]).join(' | ')}`,
        `compositionArchetype: ${VISUAL_ARCHETYPES[index % VISUAL_ARCHETYPES.length]} (adapt to the narration — never reuse the previous scene skeleton)`,
        `durationSeconds: ${scene.durationSec.toFixed(2)}`,
        `contentFrames: ${frames}`,
        `renderedDurationInFrames: ${renderedFrames}`,
        `character: ${
          characterMomentIndices.has(index)
            ? 'Stickman allowed ONLY if a human gesture clearly strengthens the hook or CTA'
            : 'NONE — pure kinetic motion graphics only, do not render the Stickman'
        }`,
      ].join(' | ');
    })
    .join('\n');

  const depth25DEnabled = job.enable25D === true;
  const promptOnlyShortForm =
    !job.voiceoverEnabled &&
    job.targetDuration !== undefined &&
    job.targetDuration !== 'auto' &&
    Number(job.targetDuration) <= PROMPT_ONLY_SINGLE_SCENE_MAX_SECONDS;
  const promptOnlySection = !job.voiceoverEnabled
    ? promptOnlyShortForm
      ? [
          '## PROMPT-ONLY SHORT-FORM DIRECTOR MODE (SINGLE SCENE)',
          '- Render exactly one cohesive, high-impact motion-graphics scene (Scene1.tsx) derived directly from the MASTER PROMPT. Do not split the idea across multiple files.',
          '- Build a complete three-act arc inside the single scene: a bold entrance in the first 20% of props.durationInFrames, a sustained main-action sequence for the middle 55–65%, and a graceful exit ease over the final 10 frames.',
          '- Choreograph at least three distinct visual beats (hook reveal, mechanism/action, payoff) with staggered springs, continuous idle motion, and clear state changes. Never hold a static frame.',
          '- Use at most one subtle <SceneSfx /> on a single key visual beat (volume 0.15–0.22). Never place a bell, chime, ding, or success sound, never at frame 0, and never at the scene ending; leave at least 0.6s of breathing room.',
          '- Make the scene read as a finished short-form visual even with no narration or captions: kinetic key-phrases and animated graphics must carry the full message.',
        ]
      : [
          '## PROMPT-ONLY MULTI-BEAT DIRECTOR MODE',
          `- Plan ${job.scenes.length} distinct visual beats directly from the MASTER PROMPT, distributed evenly across the total duration already listed below.`,
          '- Keep each scene focused on ONE core visual idea with a crisp entrance, a sustained main action, and a gentle exit ease over its final 10 frames. Never overload a single scene with complex multi-step choreography.',
          '- Keep the story flowing scene-to-scene without narration: kinetic key-phrases, diagrams, and visual metaphors must communicate the full idea.',
          '- Use at most one subtle <SceneSfx /> per scene on a key visual beat (volume 0.15–0.22). Never place a bell, chime, ding, or success sound, never at frame 0, and never at a scene ending; leave at least 0.6s of breathing room.',
        ]
    : [];

  const allowedImportsRule = depth25DEnabled
    ? '- Only import from "react", "remotion", "../components/Stickman", "../components/SilhouetteActor", "../components/SmartIcon", "../components/SceneSfx", "../components/Depth25D", "../../src/components/Depth25D", "@iconify/react", "simple-icons", "@remotion/noise", "@remotion/paths", "@remotion/shapes", "@remotion/transitions", "lucide-react", "d3-geo", "topojson-client", "world-atlas/countries-110m.json", "roughjs", or "@remotion/google-fonts". Do not import any other package.'
    : '- Only import from "react", "remotion", "../components/Stickman", "../components/SilhouetteActor", "../components/SmartIcon", "../components/SceneSfx", "@iconify/react", "simple-icons", "@remotion/noise", "@remotion/paths", "@remotion/shapes", "@remotion/transitions", "lucide-react", "d3-geo", "topojson-client", "world-atlas/countries-110m.json", "roughjs", or "@remotion/google-fonts". Do not import any other package.';
  const { width, height } = aspectDimensions(job.aspectRatio);
  const watermarkRule = job.brandKit.watermarkEnabled
    ? `Global watermark is ENABLED ("${job.brandKit.watermark}") and is drawn by the composition. Do not draw a second watermark.`
    : 'Global watermark is DISABLED. Do not draw any watermark.';
  const captionStyleName = captionStyleDisplayName(job.captionAnimationStyle);
  const captionSafeBottom = Math.min(46, Math.max(28, job.captionBottomOffset + 8));
  const captionDirectionSection = [
    '## CAPTION DIRECTION (composition-owned)',
    `- Caption animation style selected by the user: ${captionStyleName}. The composition renders it; do not rebuild caption animation inside scene files.`,
    `- Caption colors are locked: pill ${job.captionColors.background}, base text ${job.captionColors.text}, active-word highlight ${job.captionColors.highlight}. Do not override them.`,
    `- Caption vertical height is ${job.captionBottomOffset}% from the bottom. Keep every scene element above the bottom ${captionSafeBottom}% caption/safe zone.`,
    '- Never render duplicate subtitle text inside the scene when captions are enabled; let the composition own the caption strip.',
  ];
  const safeLayoutSection = job.cleanBrollMode
    ? [
        '## CLEAN B-ROLL SAFE LAYOUT (mandatory)',
        '- There is NO top headline/subtitle band. Do NOT reserve or render a top 22% header, kicker, title badge, or banner.',
        '- Fill the frame with the primary visual at 100% width and height and let a smooth camera pan/zoom carry the composition.',
        '- Keep only diegetic in-graphic labels (city names, data values, axis labels, requested callouts); never echo the prompt or scene title on screen.',
        `- If captions are enabled, keep the bottom ${captionSafeBottom}% clear (caption offset ${job.captionBottomOffset}%) for the composition-owned caption strip; otherwise keep the bottom safe margin clean.`,
        '- Never clip or collide: all labels must stay inside the full-bleed visual with generous padding.',
      ]
    : [
        '## SAFE LAYOUT GRID (no overlaps, no clipping)',
        `- TOP 22%: reserve exclusively for the headline/subtitle. ${languageDirection === 'RTL' ? 'RTL' : 'LTR'} text MUST use direction: "${languageDirection.toLowerCase()}", textAlign: "${languageDirection === 'RTL' ? 'right' : 'left'}", lineHeight: 1.4, and padding: "0 48px".`,
        '- MIDDLE 50%: the main visual stage, centered with maxWidth: "85%" and enough internal padding for labels.',
        `- BOTTOM ${captionSafeBottom}%: keep completely clear for captions (offset ${job.captionBottomOffset}%) and the safe margin. Never place headlines, key visuals, or the Stickman there.`,
        '- Never let any element clip off-screen or collide with the headline, subtitle, or caption safe zones. Decorative layers may bleed only when intentionally masked and never over text.',
      ];
  const respectSafeZoneSection =
    job.respectSafeZone === true && job.aspectRatio === '9:16'
      ? [
          '## RESPECT SAFE ZONE (mandatory — vertical 9:16)',
          '- Keep ALL primary typography, cards, charts, and captions centered inside the platform safe zone: content top >= 12%, content bottom <= 78%, content right edge <= 84%, content left edge >= 6%.',
          '- Never place text, buttons, badges, charts, or captions under the right-hand TikTok / Reels / Shorts action icons or the bottom description bar.',
          '- Backgrounds, gradients, and decorative layers may remain full-bleed edge-to-edge; only the content respects the safe-zone insets.',
        ]
      : [];

  return [
    'You are the creative motion-graphics engineer for Zof Studio.',
    'Work inside the project root and create a complete bespoke Remotion scene set from the master prompt below.',
    '',
    STRICT_EFFICIENCY_RULE,
    '',
    '## MASTER PROMPT (single source of truth)',
    job.masterPrompt,
    '',
    ...(promptOnlySection.length > 0 ? [...promptOnlySection, ''] : []),
    '## CREATIVE STORYTELLING MANDATE (dynamic SVG world, never static cards)',
    '- Every scene must be a rich, bespoke animated world tailored to the narration — never a static card, a lone word, or an idle Stickman.',
    '- When a scene includes the Stickman, make it actively interact with custom scene props: point at holographic screens, hold a glowing lightbulb, climb progress steps, push/pull objects, gesture with spring physics, and react to on-screen data. Use interpolate() and spring() for every limb prop and camera beat.',
    '- React to hook questions with floating animated ؟ / ? question marks around the visual, then resolve them as the narration answers.',
    '- Layer hand-built SVG illustrations, charts, timelines, icons, badges, and ambient particles. Build subtle parallax depth with 2–4 layered transforms moving at different speeds.',
    '- Smart kinetic key-phrases: display concise, impactful 2–5 word takeaways or punctuation hooks synced to the narration. NEVER show a single isolated word. Animate the phrase as a unit (pop, slide, mask-reveal, or spring scale) and time it to the spoken beat.',
    '- Use the provided keyPhrases as the semantic anchors; you may refine them to 2–5 words. When Captions are ENABLED, keep key-phrases distinct from the bottom caption strip so they do not duplicate it. When Captions are DISABLED, the kinetic key-phrases become the primary on-screen text.',
    '- Vary the visual composition aggressively between scenes: motion-graphics data diagram, timeline, comparison, symbolic metaphor, environmental storytelling, or a purposeful character beat. No two consecutive scenes should share the same layout.',
    '',
    '## ANTI-BOILERPLATE VISUAL VARIETY (mandatory)',
    '- NEVER default every scene to the same rigid skeleton (small kicker + top-left title + subtitle + centered card). That is a failure.',
    '- Adapt the composition architecture to each scene\'s narrative and pacing. Use the per-scene compositionArchetype as a starting point, then customize it so every scene feels custom-directed.',
    '- Vary focal placement deliberately: full-bleed kinetic typography, split-screen comparisons, large-canvas camera pans, minimal icon-driven beats, data-first charts, or clean B-Roll scenes with no header block.',
    '- Omit the header/kicker/title block whenever it adds no meaning. Never stamp a repeated top text band from habit.',
    '- Two consecutive scenes must not share the same layout skeleton, focal point, or card grid.',
    '',
    '## MULTI-BEAT CHOREOGRAPHY (mandatory in every scene)',
    '- Every scene MUST contain at least three distinct motion beats: an entrance beat, an ongoing idle beat, and a visual state-change beat. A single fade-in is not acceptable.',
    '- Staggered spring entrances: every list item, card, badge, node, row, and icon enters with its own spring() whose delay is exactly `index * 12` frames. Never reveal a group as one block.',
    '- Continuous subtle idle motion for the whole scene duration: floating sine drift, pulsing rings/halos, animated SVG path dashoffset or morphing blobs, slow orbit particles, or breathing scale. Motion must never freeze.',
    '- Visual state changes may optionally use at most one subtle SceneSfx on the key beat (soft pop/click/whoosh only). Never place a bell, chime, ding, or success sound, and never place any SFX at the scene ending.',
    '- Keep choreography readable: each beat should reinforce the narration instead of adding random noise.',
    '',
    '## SCENE TRANSITIONS & GENTLE EXIT EASE (mandatory)',
    `- The composition already connects scenes with @remotion/transitions (16-frame spring transitions with slide/wipe/fade) and triggers the scene-to-scene whoosh. Never build a hard cut, a scene-to-scene transition component, or a transition reset inside a scene.`,
    `- The composition adds ${TRANSITION_DURATION_IN_FRAMES} transition frames to every scene sequence so audio and captions stay frame-accurate. Always read props.durationInFrames for timing; the contentFrames value in the scene list is only the audio-length estimate.`,
    '- End every scene with a gentle 10-frame exit ease over the final 10 frames of props.durationInFrames: interpolate(frame, [Math.max(0, props.durationInFrames - 10), Math.max(1, props.durationInFrames - 1)], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) and apply it to the content layer opacity plus a tiny translateY/scale. Elements must never freeze abruptly.',
    '- Keep the idle motion alive until that exit ease begins; do not stop animation early or shorten the scene to compensate for the transition overlap.',
    '- Keep the entrance at frame 0. Do not render `<SceneSfx name="whoosh" frame={0} />` for scene transitions — the composition owns that whoosh.',
    '',
    ...(depth25DEnabled
      ? [
          '## 2.5D SPATIAL DEPTH MODE (ENABLED)',
          '- Import exactly: import { DepthStage, SpatialCard } from "../components/Depth25D";',
          '- Wrap the scene visual stage in <DepthStage> so every card shares perspective: 1200px and transformStyle: "preserve-3d".',
          '- Choreograph multi-plane card layering: build an ordered stack of 2–5 <SpatialCard> layers. Each new card uses enterFrame to spring smoothly toward the viewer at translateZ(0).',
          '- When the next card arrives, pass the previous card a recedeFrame so it smoothly recedes backward into Z-space (translateZ(-150px), scale(0.84), opacity 0.45, blur(2px), dynamic drop shadow) while the new active card rises forward in front of it.',
          '- Use tiltX/tiltY for a subtle physical card tilt. Keep the active card sharp and readable, and let receded cards become dim depth layers.',
          '- Mirror x offsets and text alignment for props.isRtl when language is ar, and use the exact active palette hex values for card surfaces, borders, glows, and shadows.',
          '- Every scene must visibly progress cards forward and backward through Z-space over time; do not use DepthStage/SpatialCard as a flat fade substitute.',
          `- Never place cards over the top 22% headline/subtitle or inside the bottom ${captionSafeBottom}% caption safe zone.`,
        ]
      : []),
    '',
    '## SUBTLE MICRO-SFX (strictly limited, optional)',
    'import { SceneSfx } from "../components/SceneSfx";',
    'type SceneSfxProps = {',
    '  name: "pop" | "check" | "whoosh" | "sparkle";',
    '  frame: number;',
    '  volume?: number;',
    '  sfxEnabled?: boolean;',
    '};',
    '- Use AT MOST ONE `<SceneSfx />` per scene, only on the single most important visual transition or state change.',
    '- Keep the volume between `0.15` and `0.22` (never above `0.25`), and leave at least 0.6s of breathing room after the sound.',
    '- Allowed names: `pop` (soft pop), `check` (subtle click), `whoosh` (soft whoosh), `sparkle` (soft pop). Never use any bell, chime, ding, success, alarm, or notification sound.',
    '- Never place a SceneSfx at frame 0, inside the final 20% of props.durationInFrames, or at a scene ending / transition boundary. Scenes must end in silence; the composition owns the transition whoosh.',
    '- If unsure whether a beat truly needs sound, omit it. Silence is always preferred over a bell/chime or stacked SFX.',
    '',
    '## CHARACTER POLICY — STICKMAN IS SELECTIVE, NOT MANDATORY',
    '- Pure kinetic motion graphics (animated SVG icons, UI mockups, data charts, glowing cards, kinetic typography, geometric transitions) must carry at least 60–70% of all scenes.',
    '- Include the clean, minimally expressive Stickman ONLY when the master prompt explicitly requests it OR in 1–2 narrative moments (such as the opening hook or the closing CTA) where a human gesture adds clear value.',
    '- Follow the per-scene "character" line in the scene list. When it says NONE, build the scene entirely from kinetic motion graphics with no Stickman figure, no silhouette, and no stand-in human shape.',
    '- Never add the Stickman as decoration or default filler, and never force it into data, chart, comparison, or process scenes.',
    '',
    '## ICONS, BRAND LOGOS & HUMAN SILHOUETTES (mandatory)',
    '- NEVER draw crude stickmen or hand-coded geometric circles/rectangles to represent real objects, religious symbols, electronics, or brand logos. Do not approximate a mosque, clock, phone, shield, or brand mark with guessed circles/rectangles/paths.',
    '- Use <SmartIcon query="..." brand={...} color="..." size={...} /> for ALL objects, symbols, icons, electronics, and company logos:',
    '  import { SmartIcon } from "../components/SmartIcon";',
    '  <SmartIcon query="mosque" size={64} color={props.accentColor} />',
    '  <SmartIcon query="hourglass" size={48} color={props.accentColor} />',
    '  <SmartIcon query="shield check" size={48} color={props.accentColor} />',
    '  <SmartIcon query="youtube" brand size={56} color={props.textColor} />',
    '  Pass ANY English keyword or brand name to `query` (mosque, facebook, hourglass, sword, brain, tiktok). Set `brand` for company logos. An exact Iconify ID like `query="mdi:mosque"` or `query="logos:facebook"` also works. SmartIcon searches Iconify, caches the SVG, and falls back to a clean monogram badge so headless rendering never stalls.',
    '- Use <SilhouetteActor pose="..." color="..." size={...} /> for ALL human figures (praying, prostrating, sitting at a screen, standing, walking):',
    '  import { SilhouetteActor } from "../components/SilhouetteActor";',
    '  <SilhouetteActor pose="praying-qiyam" color={props.characterBody} size={340} />',
    '  poses: "standing" | "praying-qiyam" | "praying-sujood" | "sitting-screen" | "walking". Size is the rendered height in pixels; the silhouette animates itself with useCurrentFrame(). It is strictly featureless — never add eyes, mouth, nose, or ears.',
    '',
    '## SPEED CONTRACT — DO NOT INSPECT THE CODEBASE',
    '- Do NOT run `cat`, `sed`, `head`, `tail`, `rg`, `grep`, `ls`, or any file-reading command on src/components/Stickman.tsx, src/components/SilhouetteActor.tsx, src/components/SmartIcon.tsx, src/types.ts, src/theme.ts, src/config.ts, src/data.json, or package.json.',
    '- After writing the files, run at most ONE `npx tsc --noEmit` check and fix actual compiler errors only. Do not run `npm`, build, test, or render commands. The host validates and renders after you finish.',
    '- Go straight to writing the files below with the write tool. No exploration step, no plan file.',
    '',
    '## OUTPUT FILES (exactly these, no other files)',
    ...job.scenes.map((_, index) => `- src/generated/Scene${index + 1}.tsx`),
    '- src/generated/index.ts',
    '',
    'Each Scene file must export exactly one named component matching its file name (Scene1, Scene2, ...).',
    '',
    '## CONCISE CODE CONTRACT',
    '- Keep each scene component clean, modular, and concise: target 80–140 lines per scene file.',
    '- Extract tiny local helper components/functions instead of repeating markup, and avoid dead code or unused imports.',
    '- Write src/generated/index.ts IMMEDIATELY after writing all scene files. Do not re-read, explore, or re-write scenes before writing the index.',
    '',
    '## src/generated/index.ts EXPORT CONTRACT (copy this shape exactly)',
    'import type { ComponentType } from "react";',
    'import { Scene1 } from "./Scene1";',
    'import { Scene2 } from "./Scene2";',
    '// ...one import per scene file you wrote...',
    '',
    'export type GeneratedSceneProps = {',
    '  accentColor: string;',
    '  bgColor: string;',
    '  textColor: string;',
    '  mutedColor: string;',
    '  characterBody: string;',
    '  characterFace: string;',
    '  characterAccent: string;',
    '  characterShadow: string;',
    '  isRtl: boolean;',
    '  language: string;',
    '  title?: string;',
    '  text?: string;',
    '  keywords?: string[];',
    '  data?: Record<string, unknown>;',
    '  durationInFrames: number;',
    '  showCharacter?: boolean;',
    '};',
    '',
    'export const GENERATED_SCENES: Record<string, ComponentType<GeneratedSceneProps>> = {',
    '  Scene1,',
    '  Scene2,',
    '  // ...every scene you wrote...',
    '};',
    '',
    '## EXACT STICKMAN COMPONENT INTERFACE (do not read the file)',
    'import { Stickman } from "../components/Stickman";',
    'type StickmanProps = {',
    '  pose?: "idle" | "walking" | "explaining" | "thinking" | "shocked" | "happy" | "sad" | "pointing" | "celebrating" | "idea" | "facepalm";',
    '  color: string;',
    '  faceColor: string;',
    '  accent: string;',
    '  shadow: string;',
    '  accessory?: "none" | "tie" | "badge";',
    '  delay?: number;',
    '};',
    'Usage: <Stickman pose="explaining" color={props.characterBody} faceColor={props.characterFace} accent={props.characterAccent} shadow={props.characterShadow} delay={0} />.',
    'Stickman already animates its own entrance and uses useVideoConfig internally. Place it in a relatively positioned wrapper with an explicit size such as 340x460 and pass no other props.',
    '',
    '## ABSOLUTEFILL LAYOUT RULES (mandatory)',
    '- The scene root MUST be `<AbsoluteFill style={{ backgroundColor: props.bgColor, overflow: "hidden", direction: props.isRtl ? "rtl" : "ltr" }}>`.',
    '- Read width/height from useVideoConfig() and prefer percentage/flex layouts so the scene works at 1080x1920, 1920x1080, and 1080x1080.',
    '- Use position: "absolute" layers for decorative motion and keep all text inside a padded content column.',
    '- Use flexbox with gap/justifyContent/alignItems instead of magic pixel offsets, and clamp overflow with maxWidth: "100%".',
    '',
    ...safeLayoutSection,
    '',
    ...respectSafeZoneSection,
    '',
    ...captionDirectionSection,
    '',
    ...cleanBrollPromptSection(job.cleanBrollMode),
    '',
    '## STRICT NON-OVERLAP BOUNDING ZONES (mandatory)',
    '- The Stickman must live in a dedicated column/corner, never in the center of the content grid. Pin it with an explicit wrapper such as `left: 60` or `right: 60` (use the RTL side for Arabic if it reads better) and a fixed width/height, for example `{ position: "absolute", left: 60, bottom: "30%", width: 260, height: 380 }` or `{ position: "absolute", right: 60, bottom: "30%", width: 260, height: 380 }`.',
    '- The Stickman wrapper must NEVER overlap any text pill, badge, card, row, chart label, headline, subtitle, or caption. Reserve the column by shrinking the text/card area (for example `maxWidth: "62%"` plus `marginLeft`/`marginRight`) so the two bounding boxes are disjoint.',
    `- Keep all pills, badges, and cards inside the middle 50% stage and within \`maxWidth: "85%"\`. They must not touch the Stickman column, the top 22% headline, or the bottom ${captionSafeBottom}% caption zone.`,
    '- Prefer separate layout regions (flex columns / absolute corners) over stacking text directly on top of illustrations. If a decorative SVG passes behind text, keep its opacity low and never position interactive content over the character.',
    '',
    '## CHART & CARD GEOMETRY (mandatory spacing)',
    '- Offset every Y-axis tick label away from the axis line: use textAnchor="end" and x={axisX - 14}, and reserve at least 56px of left padding so values like 10x / 20x / 30x are never struck through by the axis stroke.',
    '- Keep all floating cards and 2.5D SpatialCard surfaces fully outside the plot rectangle, axis lines, gridlines, and data labels (minimum 24px gap). Never let a card overlap a chart line, tick, or label.',
    '- Keep axis titles outside the plot area, and never draw data labels on top of gridlines or strokes.',
    '',
    '## DIRECTION & ROTATION ALIGNMENT (mandatory geometry)',
    '- Any directional object (rocket, arrow, plane, projectile, pointer) moving along a vector (dx, dy) MUST have its SVG rotation aligned to its travel angle.',
    '- Compute the angle with `Math.atan2(dy, dx) * (180 / Math.PI)` and apply it to the moving group. A rocket moving up-right must be rotated ~35–45deg clockwise, NEVER tilted left while moving right.',
    '- Match arrowheads, trails, and thrust plumes to the same vector; motion direction and rotation must never contradict each other.',
    '',
    '## EXACT SCENES AND TIMING',
    sceneLines,
    '',
    '## VIDEO LANGUAGE & ON-SCREEN COPY (mandatory)',
    `- Selected video language: ${languageName} (${languageMeta.native}); text direction: ${languageDirection}.`,
    `- Write EVERY visible string in ${languageName}: scene titles, key-phrases, axis titles, tick labels, legends, cards, badges, callouts, buttons, and UI mockup text.`,
    '- Never leave English placeholder labels such as TIME, VALUE, TOTAL, GROWTH, or REVENUE when a non-English language is selected. Translate them (for Arabic: الزمن / القيمة / الإجمالي / النمو / الإيرادات).',
    '- This localization is mandatory even when voiceoverEnabled is false; a silent video must keep all on-screen copy in the selected language.',
    `- Use props.isRtl with direction: "${languageDirection.toLowerCase()}" and the matching ${languageDirection === 'RTL' ? 'right' : 'left'} alignment for all ${languageName} text.`,
    '',
    '## VIDEO SETTINGS',
    `Aspect ratio: ${job.aspectRatio} (${width}x${height})`,
    `FPS: ${job.fps}`,
    `Language: ${languageName} (${languageMeta.native}) — ${languageDirection}`,
    '',
    '## LOCKED BRAND PALETTE (use these exact hex values, no substitutions)',
    `Background: ${job.brandKit.bgColor}`,
    `Text: ${job.brandKit.textColor}`,
    `Primary: ${job.brandKit.primaryColor}`,
    `Secondary: ${job.brandKit.secondaryColor}`,
    `Accent: ${job.brandKit.accentColor}`,
    '- Use the exact background hex above for the scene root background, the exact text hex for all body/headline text, the exact primary/secondary/accent hex for cards, pills, badges, charts, glows, and SVG strokes.',
    '- These hex values come from the active UI palette and MUST flow through as the exact props.bgColor / props.textColor / props.accentColor values. Never hardcode #1D150C, #E77B40, #0B0F17, #FBBF24, or any other fallback color when the active palette differs.',
    '- If you need tints, derive them from the active hex with rgba()/opacity rather than swapping in a different palette.',
    `Voiceover: ${job.voiceoverEnabled ? 'ENABLED (audio is handled by the composition)' : 'DISABLED (silent visual pacing)'}`,
    `Captions: ${job.captionsEnabled && job.voiceoverEnabled ? 'ENABLED (the composition draws captions)' : 'DISABLED (do not draw caption text)'}`,
    `SFX: ${job.sfxEnabled ? 'ENABLED (the composition plays SFX; design visual accents that match)' : 'DISABLED'}`,
    watermarkRule,
    '',
    '## PROPS CONTRACT (must match exactly)',
    'type Props = {',
    '  accentColor: string; bgColor: string; textColor: string; mutedColor: string;',
    '  characterBody: string; characterFace: string; characterAccent: string; characterShadow: string;',
    '  isRtl: boolean; language: string; title?: string; text?: string; keywords?: string[];',
    '  data?: Record<string, unknown>; durationInFrames: number; showCharacter?: boolean;',
    '};',
    '',
    '## HARD DESIGN RULES',
    '- Use free-form React/Remotion JSX and animated inline <svg> scenes and props. Do not use fixed card templates.',
    '- Stickman faces: keep the head smooth and clean, with NO detailed anatomical face (no nose, mouth, or ears). By default, express emotion through descriptive poses, head tilt, limb motion, interactive SVG props, and visual cues. ONLY when the scene emotion specifically requires it, add minimal contextual symbolic cues such as falling teardrops for sadness, sharp angled brow lines for anger, or sparkles for joy. Never draw complex or realistic faces.',
    '- Default to neutral/male minimalist stickman figures. NEVER depict a female character unless the script strictly requires it; if strictly required, keep the silhouette completely featureless and modest.',
    '- Build custom topic metaphors and story-driven props that match the master prompt. Avoid repetitive text cards.',
    '- Every scene — with or without the Stickman — must include at least one custom SVG prop, diagram, animated icon, chart, UI mockup, or kinetic typographic composition, plus layered parallax background depth.',
    CRISP_VECTOR_MAP_RULE,
    '- Show 2–5 word kinetic key-phrases synced to the narration; never render a lone isolated word as the main visual.',
    ...(job.cleanBrollMode
      ? ['- Do NOT render any scene title, top header, kicker, or banner. The concept line in the scene list is internal only.']
      : ['- Never show the same title twice on screen. Each scene should have a single clear headline at most.']),
    '- Use the provided brand colors, keep text contrast high, and respect RTL/LTR direction.',
    '- Animate continuously across the entire durationInFrames using useCurrentFrame(), useVideoConfig(), spring(), and interpolate(). Never freeze.',
    '- Every scene must be responsive to the aspect ratio using useVideoConfig(); no overflow and no fixed single-frame assumptions.',
    `- Keep critical content out of the bottom ${captionSafeBottom}% safe zone.`,
    '',
    ZOF_LIBRARY_CAPABILITIES,
    '',
    '## IMPORT RESTRICTIONS',
    allowedImportsRule,
    '- Never use fs, path, child_process, os, net, http, https, process, eval, new Function, fetch, XMLHttpRequest, WebSocket, require(), or dynamic import().',
    '- TypeScript strict mode and noUnusedLocals are enabled: every import and local must be used and fully typed.',
    '- Return only real files written to disk. Do not return markdown fences or commentary.',
  ].join('\n');
}

function buildOpenCodeTweakPrompt(job: RenderJob, instruction: string): string {
  const languageMeta = getVideoLanguage(job.scriptLanguage);
  const languageName = languageMeta.name;
  const languageDirection = languageMeta.dir.toUpperCase();
  const sceneFiles = job.scenes.map((scene, index) => {
    const name =
      scene.generatedComponent && isValidGeneratedComponentName(scene.generatedComponent)
        ? scene.generatedComponent
        : `Scene${index + 1}`;
    return `- src/generated/${name}.tsx — ${job.cleanBrollMode ? 'concept (internal, never render as header)' : 'title'}: ${scene.title}`;
  });
  const { width, height } = aspectDimensions(job.aspectRatio);
  const depth25DTweakEnabled = job.enable25D === true;
  const allowedTweakImports = depth25DTweakEnabled
    ? '- Only import from "react", "remotion", "../components/Stickman", "../components/SilhouetteActor", "../components/SmartIcon", "../components/SceneSfx", "../components/Depth25D", "../../src/components/Depth25D", "@iconify/react", "simple-icons", "@remotion/noise", "@remotion/paths", "@remotion/shapes", "@remotion/transitions", "lucide-react", "d3-geo", "topojson-client", "world-atlas/countries-110m.json", "roughjs", or "@remotion/google-fonts".'
    : '- Only import from "react", "remotion", "../components/Stickman", "../components/SilhouetteActor", "../components/SmartIcon", "../components/SceneSfx", "@iconify/react", "simple-icons", "@remotion/noise", "@remotion/paths", "@remotion/shapes", "@remotion/transitions", "lucide-react", "d3-geo", "topojson-client", "world-atlas/countries-110m.json", "roughjs", or "@remotion/google-fonts".';

  return [
    'You are the surgical Remotion scene editor for Zof Studio.',
    'Apply a quick visual/motion tweak to the EXISTING generated scene files below. This is not a full regeneration.',
    '',
    STRICT_EFFICIENCY_RULE,
    '',
    '## REQUESTED TWEAK',
    instruction,
    '',
    '## FILES TO EDIT IN PLACE',
    ...sceneFiles,
    '',
    '## HARD RULES',
    '- Edit only the listed src/generated/*.tsx files. Do NOT create, delete, or rename files.',
    '- Do NOT edit src/generated/index.ts or any other project file unless a listed scene file does not exist yet.',
    '- Preserve each component export name, the Props type, narration text, titles, scene durations, and all audio behavior.',
    '- Preserve audioSrc, audioDataUrl, and durationInFrames usage exactly; never add or remove voiceover logic.',
    '- Keep every scene file clean, modular, and concise: target 80–140 lines and reuse small local helpers.',
    '- Use useCurrentFrame(), useVideoConfig(), spring(), and interpolate() so motion stays continuous for the whole scene.',
    '- Preserve the gentle 10-frame exit ease at the end of props.durationInFrames (opacity plus a tiny translateY/scale); never let the scene freeze before the composition transitions out.',
    '- Never add a scene-to-scene whoosh at frame 0 or a hard cut: the composition owns @remotion/transitions and the transition whoosh.',
    job.cleanBrollMode
      ? `- Clean B-Roll is ON: render NO top header, kicker, scene title, title badge, or banner, and do not reserve a top 22% headline band. Keep the bottom ${Math.min(46, Math.max(28, job.captionBottomOffset + 8))}% clear when captions are enabled.`
      : `- Keep critical content out of the bottom ${Math.min(46, Math.max(28, job.captionBottomOffset + 8))}% safe zone (caption offset ${job.captionBottomOffset}%); reserve the top 22% for RTL/LTR headline and subtitle text and respect RTL spacing when the video language is RTL.`,
    ...(job.respectSafeZone === true && job.aspectRatio === '9:16'
      ? [
          '- Respect Safe Zone is ON: keep ALL typography, cards, charts, and captions inside top >= 12%, bottom <= 78%, right <= 84%, left >= 6%. Never place content under the right-hand TikTok / Reels / Shorts action icons or the bottom description bar; backgrounds may stay full-bleed.',
        ]
      : []),
    '- Never stamp one boilerplate skeleton across scenes: keep each scene\'s focal placement and composition architecture distinct and custom-directed (full-bleed type, split-screen, camera pan, icon beat, data-first chart, or clean B-Roll).',
    `- Preserve the caption direction exactly: style ${captionStyleDisplayName(job.captionAnimationStyle)}; pill ${job.captionColors.background}; base text ${job.captionColors.text}; active highlight ${job.captionColors.highlight}. Never hardcode different caption colors.`,
    '- Keep the multi-beat choreography: staggered spring entrances delayed by `index * 12` frames and continuous idle motion. At most one subtle `<SceneSfx name="pop|check|whoosh|sparkle" />` may be preserved per scene at volume 0.15–0.22, never at frame 0 or at the scene ending; remove any bell/chime/ding/success sound.',
    '- Keep the Stickman or SilhouetteActor inside a dedicated column/corner pinned with `left: 60` or `right: 60`; never let it overlap a text pill, badge, card, or caption.',
    '- Never hand-draw symbols, religious icons, clocks, devices, or brand logos. Use `import { SmartIcon } from "../components/SmartIcon";` with any English keyword or brand name plus `brand` for logos. For human action use `import { SilhouetteActor } from "../components/SilhouetteActor";` with poses standing, praying-qiyam, praying-sujood, sitting-screen, or walking; keep it strictly featureless.',
    CRISP_VECTOR_MAP_RULE,
    ...cleanBrollPromptSection(job.cleanBrollMode),
    '- Use the exact active palette hex values from the scene props; never replace them with #1D150C or #E77B40 fallbacks.',
    '',
    ZOF_LIBRARY_CAPABILITIES,
    '',
    ...(depth25DTweakEnabled
      ? [
          '- Preserve 2.5D spatial depth: keep importing { DepthStage, SpatialCard } from "../components/Depth25D" and keep the multi-plane Z-space card enter/recede choreography intact unless the tweak explicitly changes it.',
        ]
      : []),
    allowedTweakImports,
    '- Never use fs, path, child_process, os, net, http, https, process, eval, new Function, fetch, XMLHttpRequest, WebSocket, require(), or dynamic import().',
    '- After editing the files, run at most ONE `npx tsc --noEmit` check and fix actual compiler errors only. Do not run npm, build, test, or render commands. The host validates and renders after you finish.',
    '- Read only the listed scene files you must edit, then write them back immediately. No exploration step, no plan file.',
    '',
    '## CHART & CARD GEOMETRY (mandatory spacing)',
    '- Offset every Y-axis tick label away from the axis line: textAnchor="end" with x={axisX - 14} and at least 56px left padding, so 10x / 20x / 30x are never struck through by the axis stroke.',
    '- Keep all floating cards and 2.5D SpatialCard surfaces fully outside the plot rectangle, axis lines, gridlines, and data labels (minimum 24px gap).',
    '',
    '## VIDEO LANGUAGE & ON-SCREEN COPY (mandatory)',
    `- Selected video language: ${languageName} (${languageMeta.native}); text direction: ${languageDirection}.`,
    `- Keep EVERY visible label in ${languageName}: titles, key-phrases, axis titles, ticks, legends, cards, badges, callouts, buttons, and UI mockup text. Never revert to English placeholders such as TIME, VALUE, or TOTAL.`,
    `- Localize even when voiceover is disabled; use props.isRtl with direction: "${languageDirection.toLowerCase()}" and ${languageDirection === 'RTL' ? 'right' : 'left'} alignment.`,
    '',
    '## VIDEO SETTINGS',
    `Aspect ratio: ${job.aspectRatio} (${width}x${height})`,
    `FPS: ${job.fps}`,
    `Language: ${languageName} (${languageMeta.native}) — ${languageDirection}`,
    `Active palette — background ${job.brandKit.bgColor}; text ${job.brandKit.textColor}; primary ${job.brandKit.primaryColor}; secondary ${job.brandKit.secondaryColor}; accent ${job.brandKit.accentColor}. Use these exact hex values and never fall back to #1D150C or #E77B40.`,
    `Voiceover: ${job.voiceoverEnabled ? 'ENABLED (reuse existing audio)' : 'DISABLED (silent visual pacing)'}`,
    `Captions: ${job.captionsEnabled ? 'ENABLED (the composition draws captions)' : 'DISABLED (do not draw caption text)'}`,
    '',
    'Return only real files written to disk. Do not return markdown fences or commentary.',
  ].join('\n');
}

function runOpenCodeExport(
  job: RenderJob,
  prompt: string,
  onLog: (level: 'info' | 'success' | 'warn' | 'error', message: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      'run',
      '--auto',
      '--dir',
      PROJECT_ROOT,
      '--title',
      `Zof Export ${job.id.slice(0, 8)}`,
      prompt,
    ];
    onLog('info', 'opencode run --auto (headless) starting…');
    const child = spawn('opencode', args, {
      cwd: PROJECT_ROOT,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    });
    trackExportProcess(child);
    let settled = false;
    let lineCount = 0;
    let buffer = '';
    const timer = setTimeout(() => {
      if (settled) return;
      killProcessTree(child);
      settled = true;
      reject(new Error('opencode run timed out after 600 seconds.'));
    }, OPENCODE_RUN_TIMEOUT_MS);

    const handleLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      lineCount += 1;
      if (lineCount > 220) return;
      if (trimmed.length > 500) return;
      onLog(
        /error|failed|exception|denied/i.test(trimmed) ? 'warn' : 'info',
        `[opencode] ${trimmed}`,
      );
    };

    const handleChunk = (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) handleLine(line);
    };

    child.stdout?.on('data', handleChunk);
    child.stderr?.on('data', handleChunk);

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (buffer.trim()) handleLine(buffer);
      if (code !== 0) {
        reject(new Error(`opencode run exited with code ${code ?? 'unknown'}`));
        return;
      }
      resolve();
    });
  });
}

async function validateGeneratedScenes(): Promise<{ ok: boolean; errors: string }> {
  const check = await runRootTypeScriptCheck();
  const errors = generatedTypeScriptErrors(check.output);
  return { ok: !errors, errors };
}

async function startServer() {
  process.once('SIGHUP', () => shutdownDashboard(129));
  process.once('SIGINT', () => shutdownDashboard(130));
  process.once('SIGTERM', () => shutdownDashboard(143));

  const launcherPid = Number(process.env.ZOF_LAUNCHER_PID);
  if (Number.isInteger(launcherPid) && launcherPid > 1) {
    const launcherWatchdog = setInterval(() => {
      if (isPidRunning(launcherPid)) return;
      console.warn('[lifecycle] launcher process exited; stopping dashboard and Remotion Studio.');
      shutdownDashboard(0);
    }, 2000);
    launcherWatchdog.unref();
  }

  rehydrateStudioSettingsFromSources();
  fs.mkdirSync(ZOF_HOME_DIR, { recursive: true });
  if (!fs.existsSync(CURRENT_PROJECT_FILE)) {
    const existingData = readParentData();
    if (existingData) {
      const seededProject = projectFromVideoData(existingData);
      if (seededProject) {
        try {
          saveProjectState(seededProject);
        } catch {
          // Seeding current-project.json is best-effort.
        }
      }
    }
  }
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  fs.mkdirSync(SFX_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  syncGeneratedRegistry();

  const app = express();

  app.use((req: Request, res: Response, next: NextFunction) => {
    const host = (req.headers.host || '').trim().toLowerCase();
    if (!ALLOWED_HOSTS.has(host)) {
      res.status(403).type('text/plain').send('Forbidden');
      return;
    }

    if (STATE_CHANGING_METHODS.has(req.method)) {
      const source = req.headers.origin || req.headers.referer;
      let requestOrigin = '';
      if (typeof source === 'string') {
        try {
          requestOrigin = new URL(source).origin;
        } catch {
          requestOrigin = '';
        }
      }
      if (!ALLOWED_STATE_ORIGINS.has(requestOrigin)) {
        res.status(403).type('text/plain').send('Forbidden');
        return;
      }
    }

    const origin = req.headers.origin;
    if (origin && ALLOWED_LOCAL_ORIGINS.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-zof-session');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json({ limit: '2mb' }));

  app.use('/audio', express.static(AUDIO_DIR, { fallthrough: false }));
  app.use('/sfx', express.static(SFX_DIR, { fallthrough: false }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      app: 'zof-studio',
      host: HOST,
      port: PORT,
      service: 'Zof Studio API',
      projectRoot: PROJECT_ROOT,
      dataFile: path.relative(PROJECT_ROOT, DATA_FILE),
      audioDir: path.relative(PROJECT_ROOT, AUDIO_DIR),
      sfxDir: path.relative(PROJECT_ROOT, SFX_DIR),
      sfxCatalog: Array.from(SFX_CATALOG_IDS),
    });
  });

  app.get('/api/data', (_req: Request, res: Response) => {
    const data = readParentData();
    if (!data) {
      res.status(500).json({ error: 'تعذر قراءة src/data.json من مشروع Remotion.' });
      return;
    }
    res.json(data);
  });

  app.put('/api/data', (req: Request, res: Response) => {
    const body = (req.body || {}) as { data?: unknown; scenes?: unknown };
    const nextData = body.data && typeof body.data === 'object' ? body.data : body;
    if (!nextData || typeof nextData !== 'object' || !Array.isArray((nextData as { scenes?: unknown }).scenes)) {
      res.status(400).json({ error: 'بنية data.json غير صالحة: يجب وجود مصفوفة scenes.' });
      return;
    }
    writeJsonFile(DATA_FILE, nextData);
    res.json({ ok: true, file: path.relative(PROJECT_ROOT, DATA_FILE), data: nextData });
  });

  app.post('/api/data', (req: Request, res: Response) => {
    const body = (req.body || {}) as { data?: unknown; scenes?: unknown };
    const nextData = body.data && typeof body.data === 'object' ? body.data : body;
    if (!nextData || typeof nextData !== 'object' || !Array.isArray((nextData as { scenes?: unknown }).scenes)) {
      res.status(400).json({ error: 'بنية data.json غير صالحة: يجب وجود مصفوفة scenes.' });
      return;
    }
    writeJsonFile(DATA_FILE, nextData);
    res.json({ ok: true, file: path.relative(PROJECT_ROOT, DATA_FILE), data: nextData });
  });

  app.get('/api/audio', (_req: Request, res: Response) => {
    try {
      const files = fs
        .readdirSync(AUDIO_DIR, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name);
      res.json({ dir: path.relative(PROJECT_ROOT, AUDIO_DIR), files });
    } catch {
      res.json({ dir: path.relative(PROJECT_ROOT, AUDIO_DIR), files: [] });
    }
  });

  app.get('/api/sfx', (_req: Request, res: Response) => {
    try {
      const files = fs
        .readdirSync(SFX_DIR, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name);
      res.json({ dir: path.relative(PROJECT_ROOT, SFX_DIR), files, catalog: Array.from(SFX_CATALOG_IDS) });
    } catch {
      res.json({ dir: path.relative(PROJECT_ROOT, SFX_DIR), files: [], catalog: Array.from(SFX_CATALOG_IDS) });
    }
  });

  app.get('/api/settings', (req: Request, res: Response) => {
    const { sessionId } = getOrCreateSessionId(req);
    res.json(buildSettingsResponse(req, sessionId));
  });

  app.get('/api/settings/status', (req: Request, res: Response) => {
    const { sessionId } = getOrCreateSessionId(req);
    res.json(buildSettingsResponse(req, sessionId));
  });

  app.get('/api/usage', (_req: Request, res: Response) => {
    res.json(buildUsageResponse());
  });

  app.post('/api/usage/reset', (req: Request, res: Response) => {
    const body = (req.body || {}) as { scope?: unknown };
    const scope = body.scope === 'project' ? 'project' : 'all';
    usageStore.project = emptyUsageCounters();
    if (scope === 'all') usageStore.allTime = emptyUsageCounters();
    usageStore.updatedAt = Date.now();
    saveUsageStore();
    res.json({ ...buildUsageResponse(), scope });
  });

  app.get('/api/live-balances', async (req: Request, res: Response) => {
    const keys = resolveApiKeys(req);
    const elevenlabs: {
      configured: boolean;
      ok: boolean;
      characterCount?: number;
      characterLimit?: number;
      remaining?: number;
      tier?: string;
      resetsAt?: string;
      error?: string;
      hint?: string;
    } = { configured: Boolean(keys.elevenlabsKey), ok: false };

    if (keys.elevenlabsKey) {
      try {
        const resp = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
          headers: { 'xi-api-key': keys.elevenlabsKey },
          signal: AbortSignal.timeout(12000),
        });
        if (resp.ok) {
          const data = (await resp.json()) as Record<string, unknown>;
          const count = Number(data.character_count);
          const limit = Number(data.character_limit);
          elevenlabs.ok = true;
          elevenlabs.characterCount = Number.isFinite(count) ? count : 0;
          elevenlabs.characterLimit = Number.isFinite(limit) ? limit : 0;
          elevenlabs.remaining =
            Number.isFinite(count) && Number.isFinite(limit) ? Math.max(0, limit - count) : 0;
          elevenlabs.tier = typeof data.tier === 'string' ? data.tier : undefined;
          const resetUnix = Number(data.next_character_count_reset_unix);
          if (Number.isFinite(resetUnix) && resetUnix > 0) {
            elevenlabs.resetsAt = new Date(resetUnix * 1000).toISOString();
          }
        } else if (resp.status === 401 || resp.status === 403) {
          elevenlabs.hint =
            'فعّل صلاحية User: Read في مفتاح ElevenLabs لعرض الرصيد المتبقي.';
        } else {
          elevenlabs.error = `ElevenLabs HTTP ${resp.status}`;
        }
      } catch {
        elevenlabs.error = 'تعذر الاتصال بـ ElevenLabs الآن.';
      }
    }

    const llm: {
      provider: 'openrouter' | 'deepseek' | 'custom' | 'none';
      configured: boolean;
      ok: boolean;
      remainingUsd?: number | null;
      usedUsd?: number | null;
      limitUsd?: number | null;
      currency?: string;
      label?: string;
      error?: string;
    } = { provider: 'none', configured: false, ok: false };

    const preferDeepSeek =
      studioSettings.aiProvider === 'deepseek' && Boolean(keys.deepseekKey);
    if (keys.openrouterKey && !preferDeepSeek) {
      llm.provider = 'openrouter';
      llm.configured = true;
      try {
        const resp = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { Authorization: `Bearer ${keys.openrouterKey}` },
          signal: AbortSignal.timeout(12000),
        });
        if (resp.ok) {
          const payload = (await resp.json()) as { data?: Record<string, unknown> };
          const data = payload.data || {};
          const usage = typeof data.usage === 'number' ? data.usage : null;
          const limit = typeof data.limit === 'number' ? data.limit : null;
          const remaining = typeof data.limit_remaining === 'number' ? data.limit_remaining : null;
          llm.ok = true;
          llm.label =
            typeof data.label === 'string' && data.label.trim()
              ? data.label
              : 'OpenRouter';
          llm.usedUsd = usage;
          llm.limitUsd = limit;
          llm.remainingUsd =
            remaining !== null
              ? remaining
              : limit !== null && usage !== null
                ? Number((limit - usage).toFixed(6))
                : null;
          llm.currency = 'USD';
        } else {
          llm.error = `OpenRouter HTTP ${resp.status}`;
        }
      } catch {
        llm.error = 'تعذر الاتصال بـ OpenRouter الآن.';
      }
    } else if (keys.deepseekKey) {
      llm.provider = 'deepseek';
      llm.configured = true;
      try {
        const resp = await fetch('https://api.deepseek.com/user/balance', {
          headers: { Authorization: `Bearer ${keys.deepseekKey}` },
          signal: AbortSignal.timeout(12000),
        });
        if (resp.ok) {
          const payload = (await resp.json()) as {
            is_available?: boolean;
            balance_infos?: Array<Record<string, unknown>>;
          };
          const info = Array.isArray(payload.balance_infos) ? payload.balance_infos[0] : undefined;
          const total = Number(info?.total_balance);
          llm.ok = true;
          llm.label = payload.is_available === false ? 'DeepSeek (غير متاح)' : 'DeepSeek';
          llm.remainingUsd = Number.isFinite(total) ? total : null;
          llm.currency = typeof info?.currency === 'string' ? info.currency : 'CNY';
        } else {
          llm.error = `DeepSeek HTTP ${resp.status}`;
        }
      } catch {
        llm.error = 'تعذر الاتصال بـ DeepSeek الآن.';
      }
    }

    res.json({ ok: true, fetchedAt: Date.now(), elevenlabs, llm });
  });

  app.get('/api/provider-models', async (req: Request, res: Response) => {
    const provider = normalizeProviderAlias(String(req.query.provider || 'opencode-free'));
    const refresh = String(req.query.refresh || '0') === '1';
    const keys = resolveApiKeys(req);
    const cacheKey =
      provider === 'custom'
        ? `${provider}:${keys.customProviderBaseUrl || ''}`
        : provider;
    const cached = providerModelsCache.get(cacheKey);

    if (!refresh && cached && Date.now() - cached.fetchedAt < PROVIDER_MODELS_TTL_MS) {
      res.json({
        ok: true,
        provider,
        source: cached.source,
        fetchedAt: cached.fetchedAt,
        cached: true,
        models: cached.models,
        notice: cached.notice,
      });
      return;
    }

    let models: ProviderModelItem[] = [];
    let source: 'live' | 'curated' = 'curated';
    let notice: string | undefined;

    if (provider === 'opencode-free') {
      const opencode = inspectOpenCode();
      const discovered = openCodeProviderModels(opencode);
      if (discovered.length > 0) {
        models = discovered;
        source = 'live';
        notice = 'نماذج OpenCode المكتشفة من ملفات الإعدادات المحلية.';
      }
    } else {
      const live = await fetchProviderModelsLive(provider, keys);
      models = live.models;
      notice = live.notice;
      if (models.length > 0) source = 'live';
    }

    if (models.length === 0) {
      models = curatedProviderModels(provider);
      source = 'curated';
      notice =
        notice ||
        (provider === 'opencode-free'
          ? 'لم يتم العثور على نماذج في إعدادات OpenCode — تم استخدام القائمة الاحتياطية.'
          : 'تم استخدام القائمة الاحتياطية المنسّقة.');
    }

    const fetchedAt = Date.now();
    providerModelsCache.set(cacheKey, { fetchedAt, source, models, notice });
    res.json({
      ok: true,
      provider,
      source,
      fetchedAt,
      cached: false,
      models,
      notice,
    });
  });

  app.get('/api/media', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      videos: listMediaFiles(OUT_DIR, 'video', '/api/media/video'),
      audio: listMediaFiles(AUDIO_DIR, 'audio', '/audio'),
      sfx: listMediaFiles(SFX_DIR, 'sfx', '/sfx'),
      dirs: {
        videos: OUT_DIR,
        audio: AUDIO_DIR,
        sfx: SFX_DIR,
      },
    });
  });

  app.get('/api/media/video/:file', (req: Request, res: Response) => {
    const name = safeMediaName(req.params.file);
    if (!name || !/\.(mp4|webm|mov|m4v)$/i.test(name)) {
      res.status(400).json({ error: 'اسم ملف الفيديو غير صالح.' });
      return;
    }
    const filePath = path.join(OUT_DIR, name);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'ملف الفيديو غير موجود.' });
      return;
    }
    res.sendFile(filePath);
  });

  const handleDeleteMedia = (req: Request, res: Response) => {
    const body = (req.body || {}) as {
      type?: unknown;
      file?: unknown;
      cleanUnused?: unknown;
      cleanUnusedAudio?: unknown;
      cleanGenerated?: unknown;
      includeSfx?: unknown;
    };
    const cleanUnused = Boolean(body.cleanUnused || body.cleanUnusedAudio);
    const generatedRemoved = body.cleanGenerated ? cleanGeneratedTsxCache() : [];
    const deleted: string[] = generatedRemoved.map((name) => `generated/${name}`);
    if (body.cleanGenerated && !cleanUnused) {
      res.json({ ok: true, deleted, cleaned: deleted.length });
      return;
    }

    if (cleanUnused) {
      const referenced = collectReferencedAudio();
      const audioFiles = listMediaFiles(AUDIO_DIR, 'audio', '/audio');
      for (const file of audioFiles) {
        if (referenced.has(file.name)) continue;
        try {
          fs.unlinkSync(path.join(AUDIO_DIR, file.name));
          deleted.push(`audio/${file.name}`);
        } catch {
          // ignore individual failures
        }
      }
      if (body.includeSfx) {
        const project = readProjectState();
        const usedSfx = new Set<string>();
        const data = readParentData();
        const addSfx = (scenes: unknown) => {
          if (!Array.isArray(scenes)) return;
          for (const scene of scenes) {
            if (!scene || typeof scene !== 'object') continue;
            const sfx = (scene as Record<string, unknown>).sfxSrc;
            if (typeof sfx === 'string') usedSfx.add(sfx.replace(/^\/+/, '').replace(/^sfx\//, ''));
          }
        };
        addSfx(data?.scenes);
        addSfx(project?.scenes);
        for (const file of listMediaFiles(SFX_DIR, 'sfx', '/sfx')) {
          if (usedSfx.has(file.name)) continue;
          try {
            fs.unlinkSync(path.join(SFX_DIR, file.name));
            deleted.push(`sfx/${file.name}`);
          } catch {
            // ignore individual failures
          }
        }
      }
      res.json({ ok: true, deleted, cleaned: deleted.length });
      return;
    }

    const type = body.type === 'video' || body.type === 'sfx' ? body.type : 'audio';
    const name = safeMediaName(body.file);
    if (!name) {
      res.status(400).json({ error: 'اسم الملف غير صالح.' });
      return;
    }
    const dir = type === 'video' ? OUT_DIR : type === 'sfx' ? SFX_DIR : AUDIO_DIR;
    const filePath = path.join(dir, name);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'الملف غير موجود.' });
      return;
    }
    try {
      fs.unlinkSync(filePath);
      res.json({ ok: true, deleted: [`${type}/${name}`] });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'تعذر حذف الملف.',
      });
    }
  };

  app.delete('/api/media', handleDeleteMedia);
  app.post('/api/media/delete', handleDeleteMedia);

  const handleOpenRemotionStudio = async (req: Request, res: Response) => {
    const body = (req.body || {}) as { data?: unknown; project?: unknown };
    let project: ProjectStatePayload | null = null;

    if (body.project && typeof body.project === 'object') {
      project = normalizeProjectState(body.project);
    }
    if (!project) project = readProjectState();

    let videoData: ParentVideoData | null = null;
    if (
      body.data &&
      typeof body.data === 'object' &&
      Array.isArray((body.data as { scenes?: unknown[] }).scenes)
    ) {
      videoData = body.data as ParentVideoData;
    } else if (project) {
      videoData = buildProjectVideoData(project);
    }

    if (videoData) {
      writeJsonFile(DATA_FILE, videoData);
    } else if (!fs.existsSync(DATA_FILE)) {
      res.status(400).json({ error: 'لا توجد بيانات مشروع لمزامنتها مع Remotion Studio.' });
      return;
    }

    const studio = await ensureRemotionStudio();
    if (!studio.running) {
      res.status(503).json({
        ok: false,
        ...studio,
        port: REMOTION_STUDIO_RENDER_PORT,
        error:
          studio.error ||
          `تعذر تشغيل Remotion Studio على المنفذ ${REMOTION_STUDIO_RENDER_PORT}. تحقق من حالة المنفذ ثم أعد المحاولة.`,
        dataFile: path.relative(PROJECT_ROOT, DATA_FILE),
        projectFile: CURRENT_PROJECT_FILE,
      });
      return;
    }
    res.json({
      ok: true,
      ...studio,
      port: REMOTION_STUDIO_RENDER_PORT,
      dataFile: path.relative(PROJECT_ROOT, DATA_FILE),
      projectFile: CURRENT_PROJECT_FILE,
    });
  };

  app.post('/api/open-remotion-studio', handleOpenRemotionStudio);
  app.post('/api/studio/open', handleOpenRemotionStudio);

  app.post('/api/remotion-studio/start', async (_req: Request, res: Response) => {
    const studio = await ensureRemotionStudioUi();
    if (!studio.running) {
      res.status(503).json({
        ok: false,
        ...studio,
        error: studio.error || `تعذر تشغيل Remotion Studio على المنفذ ${REMOTION_STUDIO_UI_PORT}.`,
      });
      return;
    }
    res.json({ ok: true, ...studio });
  });

  app.post('/api/remotion-studio/stop', async (_req: Request, res: Response) => {
    const stopped = await stopRemotionStudioUi();
    res.status(stopped.ok ? 200 : 503).json({
      ...stopped,
      ...(stopped.ok ? {} : { error: `تعذر إيقاف Remotion Studio على المنفذ ${REMOTION_STUDIO_UI_PORT}.` }),
    });
  });

  app.get('/api/remotion-studio/status', async (_req: Request, res: Response) => {
    const port = REMOTION_STUDIO_UI_PORT;
    const tracked = trackedStudioProcess('studio-ui');
    const trackedAlive = isProcessAlive(tracked);
    const portOpen = await checkPortOpen(port);
    const running = portOpen ? await checkStudioHttp(port) : false;
    const pids = portOpen && !running ? await findPidsOnPort(port) : [];
    res.json({
      ok: true,
      running,
      starting: trackedAlive && !running,
      port,
      url: `http://localhost:${port}`,
      ...(trackedAlive && tracked.pid ? { pid: tracked.pid } : {}),
      external: running && !trackedAlive,
      ...(portOpen && !running && !trackedAlive
        ? {
            error: `المنفذ ${port} مفتوح لكنه لا يستجيب لـ Remotion Studio. قد تحتاج إلى استعادة العملية.`,
            pids,
          }
        : {}),
    });
  });

  const handleOpenStudioPage = async (req: Request, res: Response) => {
    const studio = await ensureRemotionStudioUi();
    if (!studio.running) {
      res.status(503);
      res.setHeader('content-type', 'text/html;charset=utf-8');
      res.setHeader('cache-control', 'no-store');
      res.end(
        `<!doctype html><meta charset="utf-8"><title>Remotion Studio</title>` +
          `<body style="font-family:system-ui,sans-serif;background:#0B0E14;color:#E2E8F0;padding:32px">` +
          `<h1 style="font-size:18px">Remotion Studio is not available</h1>` +
          `<p style="color:#94A3B8">${escapeHtml(studio.error || 'Could not start Remotion Studio.')}</p>` +
          `</body>`,
      );
      return;
    }
    const hostname = req.hostname || 'localhost';
    res.setHeader('cache-control', 'no-store');
    res.redirect(302, `http://${hostname}:${studio.port}/`);
  };

  app.get('/studio', handleOpenStudioPage);
  app.get('/studio/', handleOpenStudioPage);

  const handleGeneratedSceneStatus = (_req: Request, res: Response) => {
    const project = readProjectState();
    const projectScenes = project?.scenes || [];
    const generatedScenes = projectScenes
      .map((scene, index) => {
        const component =
          scene.generatedComponent && isValidGeneratedComponentName(scene.generatedComponent)
            ? scene.generatedComponent
            : `Scene${index + 1}`;
        return {
          id: scene.id,
          title: scene.title,
          index: index + 1,
          component,
          durationSec: scene.durationSec,
          hasAudio: Boolean(scene.audioSrc || scene.audioDataUrl),
          exists: fs.existsSync(path.join(GENERATED_DIR, `${component}.tsx`)),
        };
      })
      .filter((scene) => scene.exists);
    res.json({
      ok: true,
      hasGenerated:
        generatedScenes.length > 0 && generatedScenes.length === projectScenes.length,
      count: generatedScenes.length,
      totalScenes: projectScenes.length,
      scenes: generatedScenes,
      updatedAt: project?.updatedAt ?? null,
    });
  };

  app.get('/api/generated/status', handleGeneratedSceneStatus);
  app.get('/api/generated', handleGeneratedSceneStatus);

  app.get('/api/project', (_req: Request, res: Response) => {
    const project = readProjectState();
    res.json({
      ok: true,
      projectFile: CURRENT_PROJECT_FILE,
      exists: Boolean(project),
      project,
    });
  });

  const handleSaveProject = (req: Request, res: Response) => {
    const body = (req.body || {}) as { project?: unknown; data?: unknown };
    const project = normalizeProjectState(
      body.project && typeof body.project === 'object' ? body.project : body,
    );
    if (!project) {
      res.status(400).json({ error: 'بنية المشروع غير صالحة: يجب وجود مصفوفة scenes.' });
      return;
    }
    saveProjectState(project);
    res.json({
      ok: true,
      projectFile: CURRENT_PROJECT_FILE,
      updatedAt: project.updatedAt,
      project,
    });
  };

  app.put('/api/project', handleSaveProject);
  app.post('/api/project', handleSaveProject);

  app.post('/api/settings/sync', async (req: Request, res: Response) => {
    const { sessionId } = getOrCreateSessionId(req);
    const session = sessionKeyStore.get(sessionId) || { updatedAt: Date.now() };
    const body = (req.body || {}) as {
      openrouterKey?: unknown;
      deepseekKey?: unknown;
      kieaiKey?: unknown;
      elevenlabsKey?: unknown;
      customProviderName?: unknown;
      customProviderKey?: unknown;
      customProviderBaseUrl?: unknown;
      aiProvider?: unknown;
      aiModel?: unknown;
      voiceId?: unknown;
      voiceModelId?: unknown;
      voiceStability?: unknown;
      voiceSimilarityBoost?: unknown;
      voiceStyle?: unknown;
      voiceSpeakerBoost?: unknown;
      voiceSpeed?: unknown;
      visualStyle?: unknown;
      aspectRatio?: unknown;
      fps?: unknown;
      scriptLanguage?: unknown;
      language?: unknown;
      scriptDepth?: unknown;
      creativeCodeMode?: unknown;
      scriptPacing?: unknown;
      captionAnimationStyle?: unknown;
      captionStyle?: unknown;
      captionColors?: unknown;
      captionBottomOffset?: unknown;
      wordsPerScreen?: unknown;
      captionsEnabled?: unknown;
      respectSafeZone?: unknown;
      brandKit?: unknown;
      sfxEnabled?: unknown;
      sfxVolume?: unknown;
      sfxMode?: unknown;
      backgroundPreset?: unknown;
      clearOpenrouter?: boolean;
      clearDeepseek?: boolean;
      clearKieai?: boolean;
      clearElevenlabs?: boolean;
      clearCustom?: boolean;
    };

    if (body.clearOpenrouter) studioSettings.openrouterKey = '';
    else if (cleanSettingString(body.openrouterKey)) {
      studioSettings.openrouterKey = cleanSettingString(body.openrouterKey);
    }

    if (body.clearDeepseek) studioSettings.deepseekKey = '';
    else if (cleanSettingString(body.deepseekKey)) {
      studioSettings.deepseekKey = cleanSettingString(body.deepseekKey);
    }

    if (body.clearKieai) studioSettings.kieaiKey = '';
    else if (cleanSettingString(body.kieaiKey)) {
      studioSettings.kieaiKey = cleanSettingString(body.kieaiKey);
    }

    if (body.clearElevenlabs) studioSettings.elevenlabsKey = '';
    else if (cleanSettingString(body.elevenlabsKey)) {
      studioSettings.elevenlabsKey = cleanSettingString(body.elevenlabsKey);
    }

    if (body.clearCustom) {
      studioSettings.customProviderKey = '';
    } else if (cleanSettingString(body.customProviderKey)) {
      studioSettings.customProviderKey = cleanSettingString(body.customProviderKey);
    }

    if (typeof body.customProviderName === 'string') {
      studioSettings.customProviderName = cleanSettingString(body.customProviderName, 80);
    }
    if (typeof body.customProviderBaseUrl === 'string') {
      studioSettings.customProviderBaseUrl = cleanSettingString(body.customProviderBaseUrl, 300);
    }

    if (typeof body.aiProvider === 'string' && AI_PROVIDER_IDS.has(body.aiProvider as AiProviderId)) {
      studioSettings.aiProvider = body.aiProvider as AiProviderId;
    }
    if (cleanSettingString(body.aiModel, 160)) {
      studioSettings.aiModel = cleanSettingString(body.aiModel, 160);
    }
    if (cleanSettingString(body.voiceId, 64)) {
      studioSettings.voiceId = cleanSettingString(body.voiceId, 64);
    }
    if (cleanSettingString(body.voiceModelId, 64)) {
      studioSettings.voiceModelId = cleanSettingString(body.voiceModelId, 64);
    }
    if (body.voiceStability !== undefined) {
      studioSettings.voiceStability = clampNumber(
        body.voiceStability,
        studioSettings.voiceStability,
        0,
        1,
      );
    }
    if (body.voiceSimilarityBoost !== undefined) {
      studioSettings.voiceSimilarityBoost = clampNumber(
        body.voiceSimilarityBoost,
        studioSettings.voiceSimilarityBoost,
        0,
        1,
      );
    }
    if (body.voiceStyle !== undefined) {
      studioSettings.voiceStyle = clampNumber(body.voiceStyle, studioSettings.voiceStyle, 0, 1);
    }
    if (typeof body.voiceSpeakerBoost === 'boolean') {
      studioSettings.voiceSpeakerBoost = body.voiceSpeakerBoost;
    }
    if (body.voiceSpeed !== undefined) {
      studioSettings.voiceSpeed = clampNumber(body.voiceSpeed, studioSettings.voiceSpeed, 0.7, 1.2);
    }
    if (typeof body.visualStyle === 'string') {
      studioSettings.visualStyle = normalizeVisualStyleValue(
        body.visualStyle,
        studioSettings.visualStyle,
      );
    }
    if (body.aspectRatio === '9:16' || body.aspectRatio === '16:9' || body.aspectRatio === '1:1') {
      studioSettings.aspectRatio = body.aspectRatio as string;
    }
    if (Number(body.fps) === 30 || Number(body.fps) === 60) {
      studioSettings.fps = Number(body.fps);
    }
    const requestedLanguage = normalizeVideoLanguage(
      body.scriptLanguage ?? body.language,
      '',
    );
    if (requestedLanguage) {
      studioSettings.scriptLanguage = requestedLanguage;
    }
    if (body.scriptDepth !== undefined) {
      studioSettings.scriptDepth = normalizeScriptDepth(
        body.scriptDepth,
        studioSettings.scriptDepth,
      );
    }
    if (body.creativeCodeMode !== undefined) {
      studioSettings.creativeCodeMode = normalizeCreativeCodeMode(
        body.creativeCodeMode,
        studioSettings.creativeCodeMode,
      );
    }
    if (body.scriptPacing !== undefined) {
      studioSettings.scriptPacing = normalizeScriptPacing(
        body.scriptPacing,
        studioSettings.scriptPacing,
      );
    }
    if (body.captionStyle !== undefined || body.captionAnimationStyle !== undefined) {
      studioSettings.captionAnimationStyle = normalizeCaptionAnimationStyle(
        body.captionStyle ?? body.captionAnimationStyle,
        studioSettings.captionAnimationStyle,
      );
    }
    if (body.wordsPerScreen !== undefined) {
      studioSettings.wordsPerScreen = normalizeWordsPerScreen(
        body.wordsPerScreen,
        studioSettings.wordsPerScreen,
      );
    }
    if (typeof body.captionsEnabled === 'boolean') {
      studioSettings.captionsEnabled = body.captionsEnabled;
    }
    if (typeof body.respectSafeZone === 'boolean') {
      studioSettings.respectSafeZone = body.respectSafeZone;
    }
    if (body.brandKit && typeof body.brandKit === 'object') {
      studioSettings.brandKit = normalizeBrandKit(body.brandKit);
    }
    if (body.captionColors !== undefined) {
      studioSettings.captionColors = normalizeCaptionColors(
        body.captionColors,
        studioSettings.brandKit,
      );
    }
    if (body.captionBottomOffset !== undefined) {
      studioSettings.captionBottomOffset = normalizeCaptionBottomOffset(
        body.captionBottomOffset,
        studioSettings.captionBottomOffset,
      );
    }
    if (typeof body.sfxEnabled === 'boolean') {
      studioSettings.sfxEnabled = body.sfxEnabled;
    }
    if (body.sfxVolume !== undefined) {
      studioSettings.sfxVolume = clampNumber(body.sfxVolume, studioSettings.sfxVolume, 0, 1);
    }
    if (body.sfxMode === 'auto' || body.sfxMode === 'manual') {
      studioSettings.sfxMode = body.sfxMode;
    }
    if (body.backgroundPreset !== undefined) {
      studioSettings.backgroundPreset = normalizeBackgroundPreset(body.backgroundPreset);
    }

    studioSettings.updatedAt = Date.now();
    saveStudioSettings(studioSettings);

    session.openrouterKey = studioSettings.openrouterKey;
    session.deepseekKey = studioSettings.deepseekKey;
    session.kieaiKey = studioSettings.kieaiKey;
    session.elevenlabsKey = studioSettings.elevenlabsKey;
    session.customProviderKey = studioSettings.customProviderKey;
    session.updatedAt = Date.now();
    sessionKeyStore.set(sessionId, session);

    const effective = resolveApiKeys(req);
    let elevenlabsVerified = false;
    if (effective.elevenlabsKey) {
      try {
        const check = await fetch('https://api.elevenlabs.io/v1/models', {
          headers: { 'xi-api-key': effective.elevenlabsKey },
          signal: AbortSignal.timeout(5000),
        });
        elevenlabsVerified = check.ok;
      } catch {
        elevenlabsVerified = false;
      }
    }

    res.json({
      ...buildSettingsResponse(req, sessionId),
      elevenlabsVerified,
    });
  });

  app.get('/api/elevenlabs/models', async (req: Request, res: Response) => {
    const { elevenlabsKey } = resolveApiKeys(req);
    if (!elevenlabsKey) {
      res.json({ source: 'catalog', models: DEFAULT_ELEVENLABS_MODELS });
      return;
    }

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/models', {
        headers: { 'xi-api-key': elevenlabsKey },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        res.json({ source: 'catalog', models: DEFAULT_ELEVENLABS_MODELS, warning: 'تعذر التحقق من مفتاح ElevenLabs' });
        return;
      }
      const payload = (await response.json()) as unknown;
      const data = Array.isArray(payload)
        ? (payload as Array<{
            model_id?: string;
            name?: string;
            description?: string;
            can_do_text_to_speech?: boolean;
            languages?: Array<unknown>;
          }>)
        : [];

      const ttsModels = data
        .filter((m) => m.can_do_text_to_speech === true && m.model_id)
        .map((m) => {
          const id = m.model_id || '';
          const languages = Array.from(
            new Set(
              (Array.isArray(m.languages) ? m.languages : [])
                .map((language) => {
                  if (typeof language === 'string') return language;
                  if (language && typeof language === 'object') {
                    const record = language as Record<string, unknown>;
                    return (
                      record.language ||
                      record.language_code ||
                      record.locale ||
                      record.name ||
                      ''
                    );
                  }
                  return '';
                })
                .map((language) => normalizeLanguageLabel(language))
                .filter((language) => language && language !== 'Other'),
            ),
          );
          let latencyBadge = 'استجابة قياسية';
          let qualityBadge = `${languages.length || m.languages?.length || 0} لغة`;
          if (id.includes('flash')) {
            latencyBadge = 'زمن فائق الانخفاض · ~75ms';
            qualityBadge = 'سرعة قصوى';
          } else if (id.includes('turbo')) {
            latencyBadge = 'استجابة سريعة · ~250ms';
            qualityBadge = 'متوازن';
          } else if (id.includes('multilingual_v2')) {
            latencyBadge = 'جودة فائقة';
            qualityBadge = 'متعدد اللغات';
          }
          if (!languages.length) qualityBadge = 'جميع النماذج الصوتية';
          return {
            model_id: id,
            name: m.name || id,
            description: m.description || 'نموذج توليد صوتي من ElevenLabs',
            latencyBadge,
            qualityBadge,
            languages,
          };
        });

      res.json({
        source: 'live',
        models: ttsModels.length > 0 ? ttsModels : DEFAULT_ELEVENLABS_MODELS,
      });
    } catch {
      res.json({
        source: 'catalog',
        models: DEFAULT_ELEVENLABS_MODELS,
        warning: 'تعذر الاتصال بـ ElevenLabs، تم استخدام النماذج الاحتياطية',
      });
    }
  });

  app.get('/api/elevenlabs/voices', async (req: Request, res: Response) => {
    const { elevenlabsKey } = resolveApiKeys(req);
    if (!elevenlabsKey) {
      res.json({ source: 'catalog', voices: DEFAULT_ELEVENLABS_VOICES });
      return;
    }

    try {
      const { voices, warning } = await fetchElevenLabsVoiceLibrary(elevenlabsKey);
      if (voices.length === 0) {
        res.json({
          source: 'catalog',
          voices: DEFAULT_ELEVENLABS_VOICES,
          warning: warning || 'تعذر جلب الأصوات الحية',
        });
        return;
      }
      res.json({
        source: 'live',
        voices,
        total: voices.length,
        personalCount: voices.filter((voice) => voice.source === 'personal').length,
        libraryCount: voices.filter((voice) => voice.source === 'library').length,
      });
    } catch {
      res.json({ source: 'catalog', voices: DEFAULT_ELEVENLABS_VOICES });
    }
  });

  const handleFetchVoiceById = async (req: Request, res: Response) => {
    const { elevenlabsKey } = resolveApiKeys(req);
    const voiceId = String(req.params.voiceId || '').trim();

    if (!/^[a-zA-Z0-9_-]{4,80}$/.test(voiceId)) {
      res.status(400).json({ error: 'معرّف الصوت غير صالح.' });
      return;
    }
    if (!elevenlabsKey) {
      res.status(400).json({ error: 'مفتاح ElevenLabs غير مضاف لجلب الصوت المباشر.' });
      return;
    }

    const voice = await fetchElevenLabsVoiceById(elevenlabsKey, voiceId);
    if (!voice) {
      res.status(404).json({ error: 'لم يتم العثور على الصوت بهذا المعرّف في ElevenLabs.' });
      return;
    }

    res.json({ source: 'live', voice });
  };

  app.get('/api/elevenlabs/voices/:voiceId', handleFetchVoiceById);
  app.get('/api/elevenlabs/voice/:voiceId', handleFetchVoiceById);

  app.post('/api/elevenlabs/tts', async (req: Request, res: Response) => {
    const { elevenlabsKey } = resolveApiKeys(req);
    const body = (req.body || {}) as {
      text?: unknown;
      voiceId?: unknown;
      modelId?: unknown;
      stability?: unknown;
      similarityBoost?: unknown;
      style?: unknown;
      speakerBoost?: unknown;
      speed?: unknown;
      voiceoverEnabled?: unknown;
    };

    const text = typeof body.text === 'string' ? body.text.trim().slice(0, 1500) : '';
    const voiceId = typeof body.voiceId === 'string' && /^[a-zA-Z0-9_-]{4,64}$/.test(body.voiceId) ? body.voiceId : 'pNInz6obpgDQGcFmaJgB';
    const modelId = typeof body.modelId === 'string' && body.modelId.trim() ? body.modelId.trim().slice(0, 64) : 'eleven_multilingual_v2';
    const stability = Math.min(1, Math.max(0, Number(body.stability ?? 0.5)));
    const similarityBoost = Math.min(1, Math.max(0, Number(body.similarityBoost ?? 0.75)));
    const style = Math.min(1, Math.max(0, Number(body.style ?? 0)));
    const speakerBoost = typeof body.speakerBoost === 'boolean' ? body.speakerBoost : true;
    const speed = Math.min(1.2, Math.max(0.7, Number(body.speed ?? 1)));

    if (!text) {
      res.status(400).json({ error: 'النص الصوتي مطلوب' });
      return;
    }

    const wordsCount = text.split(/\s+/).filter(Boolean).length;
    const durationEstimateSec = Math.max(2.5, Number((wordsCount * 0.48 + 0.8).toFixed(1)));

    if (body.voiceoverEnabled === false) {
      res.json({
        source: 'none',
        audioDataUrl: null,
        durationEstimateSec,
        characters: 0,
        usage: { ttsCharacters: 0, ttsCalls: 0, ttsUsd: 0 },
        notice:
          'الوضع الصامت مفعّل — لم يتم استدعاء ElevenLabs ولن يتم استهلاك أي رصيد.',
      });
      return;
    }

    if (!elevenlabsKey) {
      res.json({
        source: 'browser-tts',
        audioDataUrl: null,
        durationEstimateSec,
        notice: 'مفتاح ElevenLabs غير مضاف — يتم تشغيل معاينة صوتية محلية.',
      });
      return;
    }

    try {
      const ttsResp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
        method: 'POST',
        headers: {
          'xi-api-key': elevenlabsKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: speakerBoost,
            speed,
          },
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (!ttsResp.ok) {
        const errText = await ttsResp.text();
        res.json({
          source: 'browser-tts',
          audioDataUrl: null,
          durationEstimateSec,
          notice: `تعذر التوليد عبر ElevenLabs (${ttsResp.status}): ${errText.slice(0, 120)}`,
        });
        return;
      }

      const arrayBuffer = await ttsResp.arrayBuffer();
      const filename = `tts-${voiceId.slice(0, 8)}-${Date.now()}.mp3`;
      const audioPath = path.join(AUDIO_DIR, filename);
      fs.mkdirSync(AUDIO_DIR, { recursive: true });
      fs.writeFileSync(audioPath, Buffer.from(arrayBuffer));

      const headerCost = Number(ttsResp.headers.get('character-cost'));
      const billedCharacters =
        Number.isFinite(headerCost) && headerCost >= 0 ? headerCost : text.length;
      const ttsUsd = Number((billedCharacters * ELEVENLABS_USD_PER_CHAR).toFixed(6));
      recordUsage({
        ttsCharacters: billedCharacters,
        ttsCalls: 1,
        ttsUsd,
      });

      res.json({
        source: 'elevenlabs',
        audioDataUrl: `/audio/${encodeURIComponent(filename)}`,
        audioFile: path.relative(PROJECT_ROOT, audioPath),
        durationEstimateSec,
        characters: billedCharacters,
        usage: { ttsCharacters: billedCharacters, ttsCalls: 1, ttsUsd },
      });
    } catch {
      res.json({
        source: 'browser-tts',
        audioDataUrl: null,
        durationEstimateSec,
        notice: 'انتهت مهلة الاتصال بخدمة ElevenLabs، تم تفعيل المعاينة المحلية.',
      });
    }
  });

  app.post('/api/elevenlabs/sfx', async (req: Request, res: Response) => {
    const { elevenlabsKey } = resolveApiKeys(req);
    const body = (req.body || {}) as {
      prompt?: unknown;
      text?: unknown;
      durationSeconds?: unknown;
    };

    const prompt =
      typeof body.prompt === 'string'
        ? body.prompt.trim().slice(0, 450)
        : typeof body.text === 'string'
          ? body.text.trim().slice(0, 450)
          : '';
    const requestedDuration = Number(body.durationSeconds);
    const durationSeconds = Number.isFinite(requestedDuration)
      ? Math.min(22, Math.max(0.5, Number(requestedDuration.toFixed(2))))
      : 3;

    if (prompt.length < 3) {
      res.status(400).json({ error: 'يرجى كتابة وصف واضح للمؤثر الصوتي (3 أحرف على الأقل).' });
      return;
    }

    if (!elevenlabsKey) {
      res.status(400).json({
        error: 'مفتاح ElevenLabs غير مضاف. أضفه من الإعدادات لتوليد مؤثرات مخصصة.',
      });
      return;
    }

    try {
      const sfxResp = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
        method: 'POST',
        headers: {
          'xi-api-key': elevenlabsKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: prompt,
          duration_seconds: durationSeconds,
          prompt_influence: 0.3,
        }),
        signal: AbortSignal.timeout(45000),
      });

      if (!sfxResp.ok) {
        const errText = await sfxResp.text();
        res.status(502).json({
          error: `تعذر توليد المؤثر عبر ElevenLabs (${sfxResp.status}): ${errText.slice(0, 160)}`,
        });
        return;
      }

      const buffer = Buffer.from(await sfxResp.arrayBuffer());
      fs.mkdirSync(SFX_DIR, { recursive: true });
      const filename = `ai-sfx-${Date.now()}-${crypto.randomBytes(3).toString('hex')}.mp3`;
      const sfxPath = path.join(SFX_DIR, filename);
      fs.writeFileSync(sfxPath, buffer);

      res.json({
        source: 'elevenlabs',
        sfxUrl: `/sfx/${encodeURIComponent(filename)}`,
        fileName: filename,
        file: path.relative(PROJECT_ROOT, sfxPath),
        durationSeconds,
      });
    } catch {
      res.status(502).json({
        error: 'انتهت مهلة الاتصال بخدمة ElevenLabs لتوليد المؤثر الصوتي.',
      });
    }
  });

  function countSpokenWords(script: string): number {
    return script.trim().split(/\s+/).filter(Boolean).length;
  }

  function estimateSpokenDurationSec(script: string): number {
    const words = countSpokenWords(script);
    if (words === 0) return 0;
    return Math.round((words / 2.5) * 10) / 10;
  }

  type ScriptWordBudget = {
    min: number;
    max: number;
    target: number;
    sentences: string;
  };

  function scriptWordBudget(target: ExportTargetDuration): ScriptWordBudget {
    if (target === '3') {
      return { min: 5, max: 9, target: 7, sentences: '1 to 2' };
    }
    if (target === '5') {
      return { min: 9, max: 14, target: 12, sentences: '2 to 3' };
    }
    if (target === '8') {
      return { min: 15, max: 22, target: 19, sentences: '2 to 3' };
    }
    if (target === '12') {
      return { min: 24, max: 32, target: 28, sentences: '3 to 4' };
    }
    if (target === '15') {
      return { min: 30, max: 40, target: 35, sentences: '3 to 4' };
    }
    if (target === '30') {
      return { min: 55, max: 70, target: 62, sentences: '4 to 5' };
    }
    if (target === '45') {
      return { min: 90, max: 110, target: 100, sentences: '5 to 7' };
    }
    if (target === '90') {
      return { min: 195, max: 215, target: 205, sentences: '10 to 12' };
    }
    return { min: 125, max: 145, target: 135, sentences: '7 to 8' };
  }

  function scriptTargetWords(target: ExportTargetDuration): number {
    return scriptWordBudget(target).target;
  }

  function splitSpokenSentences(text: string): string[] {
    return splitScriptSentences(text);
  }

  function enforceScriptWordBudget(
    script: string,
    budget: ScriptWordBudget,
  ): string {
    const text = script.trim();
    if (!text || countSpokenWords(text) <= budget.max) return text;

    const kept: string[] = [];
    let total = 0;
    for (const sentence of splitSpokenSentences(text)) {
      const words = countSpokenWords(sentence);
      if (total + words > budget.max) {
        const remaining = budget.max - total;
        if (remaining > 0) {
          const clipped = sentence
            .split(/\s+/)
            .slice(0, remaining)
            .join(' ')
            .replace(/[،,;:.!?؟。！]+$/, '');
          if (clipped) kept.push(`${clipped}.`);
        }
        break;
      }
      kept.push(sentence);
      total += words;
    }

    const trimmed = kept.join(' ').replace(/\s+/g, ' ').trim();
    return trimmed || text;
  }

  function normalizeVoiceoverScript(raw: string): string {
    let text = raw.trim();
    const fenced = text.match(/```(?:[a-z]*)?\s*\n?([\s\S]*?)```/i);
    if (fenced?.[1]) text = fenced[1];
    text = text
      .replace(/^\s*(?:script|voiceover|voice-over|narration|spoken script|السكربت(?:\s+الصوتي)?|التعليق الصوتي)\s*[:：-]\s*/i, '')
      .replace(/\*\*|__|`/g, '')
      .replace(/^[ \t]*[-*•]\s+/gm, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return normalizeDomainDotSpacing(text);
  }

  function buildLocalVoiceoverScript(
    topic: string,
    language: string,
    targetWords: number,
    budget: ScriptWordBudget = scriptWordBudget('60'),
  ): string {
    const core = topic.replace(/\s+/g, ' ').trim().replace(/[.!?؟]+$/, '');
    const shortCore = core.length > 150 ? `${core.slice(0, 147).trim()}…` : core;
    const openers =
      language === 'en'
        ? [
            `What if ${shortCore} is the one idea that changes how you see everything?`,
            'At first it looks simple, but the real result appears once you understand how it works from the inside.',
            `Most people treat ${shortCore} as a single step, when it is really a chain of small, deliberate decisions.`,
            'Start with one clear action, then measure the result after a full week instead of guessing.',
            'When those small steps add up, you feel the difference in time, effort, and outcome.',
            'The takeaway is simple: do not wait for perfect conditions. Start now and improve what you already have.',
          ]
        : [
            `ماذا لو كان ${shortCore} هو الفكرة التي تغيّر نظرتك بالكامل؟`,
            'في البداية يبدو الأمر بسيطاً، لكن النتيجة الحقيقية تظهر عندما تفهم كيف يعمل من الداخل.',
            `معظم الناس يتعاملون مع ${shortCore} كخطوة واحدة، بينما هو في الحقيقة سلسلة من القرارات الصغيرة والمدروسة.`,
            'ابدأ بخطوة واحدة واضحة، ثم قِس النتيجة بعد أسبوع كامل بدلاً من التخمين.',
            'وعندما تتراكم هذه الخطوات، ستلاحظ فرقاً ملموساً في الوقت والجهد والنتيجة.',
            'الخلاصة بسيطة: لا تنتظر الظروف المثالية، ابدأ الآن وحسّن ما لديك تدريجياً.',
          ];
    const extensions =
      language === 'en'
        ? [
            'Write down the first step today, give it a deadline, and let the next decision become easier.',
            'Look at the last time you tried: what exactly stopped you, and what would make the next attempt easier?',
            'Clarity beats intensity, so choose one measurable action and repeat it until it becomes automatic.',
            'Track what changes, keep what works, and remove the step that adds friction without adding value.',
          ]
        : [
            'اكتب أول خطوة اليوم، وحدّد لها موعداً نهائياً، وستصبح الخطوة التالية أسهل.',
            'فكّر في آخر مرة حاولت فيها: ما الذي أوقفك بالتحديد، وما الذي سيجعل المحاولة القادمة أسهل؟',
            'الوضوح أهم من الحماس، لذلك اختر خطوة واحدة قابلة للقياس وكرّرها حتى تصبح تلقائية.',
            'راقب ما يتغيّر، واحتفظ بما ينجح، واحذف الخطوة التي تضيف تعقيداً بلا قيمة.',
          ];
    let script = openers.join(' ');
    if (countSpokenWords(script) < targetWords * 0.55) {
      script += ` ${extensions[0]}`;
    }
    let extensionIndex = 1;
    while (
      countSpokenWords(script) < budget.min &&
      extensionIndex < extensions.length * 3
    ) {
      script += ` ${extensions[extensionIndex % extensions.length]}`;
      extensionIndex += 1;
    }
    return enforceScriptWordBudget(script, budget);
  }

  type VoiceoverScriptBody = {
    topic?: unknown;
    language?: unknown;
    provider?: unknown;
    modelId?: unknown;
    scriptLanguage?: unknown;
    targetDuration?: unknown;
    rephrase?: unknown;
    previousScript?: unknown;
    mode?: unknown;
  };

  async function handleVoiceoverScriptGeneration(
    req: Request,
    res: Response,
    body: VoiceoverScriptBody,
  ): Promise<void> {
    const topic =
      typeof body.topic === 'string' ? body.topic.trim().slice(0, 12000) : '';
    if (!topic) {
      res.status(400).json({ error: 'يرجى إدخال موضوع الفيديو أو الفكرة أولاً.' });
      return;
    }
    const scriptLanguage = normalizeVideoLanguage(
      body.scriptLanguage ?? body.language,
      studioSettings.scriptLanguage,
    );
    const outputLanguage = videoLanguageName(scriptLanguage);
    const targetDuration = normalizeTargetDuration(body.targetDuration);
    const targetBudget = scriptWordBudget(targetDuration);
    const targetWords = targetBudget.target;
    const rephrase = body.rephrase === true;
    const previousScript =
      typeof body.previousScript === 'string'
        ? normalizeVoiceoverScript(body.previousScript.slice(0, 12000))
        : '';
    const providerCandidate =
      typeof body.provider === 'string' ? body.provider : studioSettings.aiProvider;
    const requestedProvider = AI_PROVIDER_IDS.has(providerCandidate as AiProviderId)
      ? (providerCandidate as AiProviderId)
      : studioSettings.aiProvider;
    const requestedModel =
      (typeof body.modelId === 'string' && body.modelId.trim()
        ? body.modelId.trim()
        : studioSettings.aiModel) || DEFAULT_FREE_MODEL;

    const systemPrompt = [
      `You are a world-class ${outputLanguage} voiceover scriptwriter for short-form video.`,
      `Write ONLY the final spoken voiceover script in ${outputLanguage}.`,
      `Target length: STRICTLY ${targetBudget.min} to ${targetBudget.max} words for a ${targetDuration === 'auto' ? '60' : targetDuration}-second video (about ${targetWords} words), calibrated to a realistic speaking speed.`,
      `Structure the script as ${targetBudget.sentences} cohesive spoken sentences, each carrying one concrete idea.`,
      `Hard limit: the final script must stay at or below ${targetBudget.max} words and at or above ${targetBudget.min} words. Do not pad with filler to reach the lower bound.`,
      'Use natural, engaging, conversational language that sounds excellent when read aloud.',
      'Use proper punctuation (؟, !, .) and short clauses that a narrator can breathe between.',
      'Open with a strong hook, develop the idea with a concrete mechanism or example, and close with a clear takeaway.',
      'Do NOT include headings, timestamps, scene numbers, speaker labels, stage directions, bullet points, markdown, emojis, or explanations.',
      'Do NOT output a JSON object or an array. Output plain spoken text only.',
      rephrase
        ? 'The user wants a fresh rephrase of their approved script: preserve the same core meaning and approximate length, but rewrite it with different wording and rhythm.'
        : 'Expand the user topic/brief into a complete, polished spoken script.',
    ].join('\n');

    const userPrompt = rephrase && previousScript
      ? `Topic/brief: ${topic}\n\nApproved script to rephrase:\n${previousScript}\n\nReturn only the rewritten ${outputLanguage} spoken voiceover script.`
      : `Topic/brief: ${topic}\n\nReturn only the complete ${outputLanguage} spoken voiceover script.`;

    const keys = resolveApiKeys(req);
    const attempts = buildChatAttempts(requestedProvider, requestedModel, keys);
    let lastProviderLabel = '';
    let lastModel = '';
    let usage = { aiInputTokens: 0, aiOutputTokens: 0, aiCalls: 0, aiUsd: 0, aiModel: '' };

    for (const attempt of attempts) {
      lastProviderLabel = attempt.providerLabel;
      lastModel = attempt.model;
      const result = await requestChatCompletion(attempt, systemPrompt, userPrompt, keys);
      if (!result) continue;
      const script = enforceScriptWordBudget(
        normalizeVoiceoverScript(result.content),
        targetBudget,
      );
      if (countSpokenWords(script) < 10) continue;
      usage = {
        aiInputTokens: usage.aiInputTokens + result.usage.inputTokens,
        aiOutputTokens: usage.aiOutputTokens + result.usage.outputTokens,
        aiCalls: usage.aiCalls + result.usage.calls,
        aiUsd: Number((usage.aiUsd + result.usage.usd).toFixed(6)),
        aiModel: result.usage.model,
      };
      res.json({
        script,
        wordCount: countSpokenWords(script),
        estimatedDurationSec: estimateSpokenDurationSec(script),
        targetDuration,
        targetWords,
        language: scriptLanguage,
        source: attempt.kind,
        providerUsed: attempt.providerLabel,
        modelUsed: attempt.model,
        fallbackUsed:
          requestedProvider !== 'opencode-free' && attempt.kind !== requestedProvider,
        usage,
      });
      return;
    }

    const script = buildLocalVoiceoverScript(
      topic,
      scriptLanguage === 'ar' ? 'ar' : 'en',
      targetWords,
      targetBudget,
    );
    res.json({
      script,
      wordCount: countSpokenWords(script),
      estimatedDurationSec: estimateSpokenDurationSec(script),
      targetDuration,
      targetWords,
      language: scriptLanguage,
      source: 'template',
      providerUsed: 'Local spoken-script template',
      modelUsed: lastModel || requestedModel,
      fallbackUsed: true,
      usage,
      notice:
        scriptLanguage === 'ar'
          ? `تعذر الوصول إلى مزودي الذكاء الاصطناعي لموضوع "${topic.slice(0, 60)}". تم توليد مسودة صوتية محلية؛ تحقق من مفتاح API في الإعدادات للحصول على توليد حي.`
          : `No AI provider was reachable for "${topic.slice(0, 60)}". Generated a local spoken draft; verify your API key in settings for live output.`,
      lastProviderLabel: lastProviderLabel || undefined,
    });
  }

  const handleGenerateScript = async (req: Request, res: Response) => {
    const body = (req.body || {}) as {
      topic?: unknown;
      provider?: unknown;
      modelId?: unknown;
      visualStyle?: unknown;
      aspectRatio?: unknown;
      scriptLanguage?: unknown;
      language?: unknown;
      scriptDepth?: unknown;
      creativeCodeMode?: unknown;
      scriptPacing?: unknown;
      backgroundPreset?: unknown;
      brandKit?: unknown;
      voiceoverEnabled?: unknown;
      captionsEnabled?: unknown;
      sfxEnabled?: unknown;
      sfxVolume?: unknown;
      targetDuration?: unknown;
      rephrase?: unknown;
      previousScript?: unknown;
      mode?: unknown;
    };

    if (body.mode !== 'scenes') {
      await handleVoiceoverScriptGeneration(req, res, body);
      return;
    }

    const requestedScriptDepth = normalizeScriptDepth(
      body.scriptDepth,
      normalizeScriptDepth(studioSettings.scriptDepth),
    );
    const topicLimit = requestedScriptDepth === 'article' ? 20000 : 1200;
    const topic =
      typeof body.topic === 'string' ? body.topic.trim().slice(0, topicLimit) : '';
    const providerCandidate =
      typeof body.provider === 'string' ? body.provider : studioSettings.aiProvider;
    const requestedProvider = AI_PROVIDER_IDS.has(providerCandidate as AiProviderId)
      ? (providerCandidate as AiProviderId)
      : studioSettings.aiProvider;
    const requestedModel =
      (typeof body.modelId === 'string' && body.modelId.trim()
        ? body.modelId.trim()
        : studioSettings.aiModel) || DEFAULT_FREE_MODEL;
    const visualStyle = normalizeVisualStyleValue(body.visualStyle, 'stickman');
    const aspectRatio = typeof body.aspectRatio === 'string' ? body.aspectRatio : '9:16';
    const scriptLanguage = normalizeVideoLanguage(
      body.scriptLanguage ?? body.language,
      studioSettings.scriptLanguage,
    );
    const outputLanguage = videoLanguageName(scriptLanguage);
    const targetDuration = normalizeTargetDuration(body.targetDuration);
    const targetBudget = scriptWordBudget(targetDuration);
    const targetDurationLabel =
      targetDuration === 'auto' ? '60' : targetDuration;
    const scriptDepth = requestedScriptDepth;
    const creativeCodeMode = normalizeCreativeCodeMode(
      body.creativeCodeMode,
      normalizeCreativeCodeMode(studioSettings.creativeCodeMode),
    );
    const scriptPacing = normalizeScriptPacing(
      body.scriptPacing,
      normalizeScriptPacing(studioSettings.scriptPacing),
    );
    const sceneCountRule =
      scriptDepth === 'condensed'
        ? 'Produce exactly 6 to 7 micro-scenes (about 30 seconds total).'
        : scriptDepth === 'article'
          ? 'Produce as many micro-scenes as required to cover every fact, number, argument and nuance in the supplied text (usually 10 to 16, never fewer than 9).'
          : 'Produce 9 to 12 micro-scenes (about 60 seconds total) for a deep, investigative explanation.';
    const wordRule =
      scriptDepth === 'article'
        ? '10-18 words per scene'
        : '10-16 words per scene';
    const durationRule =
      scriptDepth === 'condensed'
        ? '3.5-4.5 seconds per scene'
        : '4-5 seconds per scene';
    const pacingGuidance =
      scriptPacing === 'balanced'
        ? 'Delivery rhythm: balanced and clear, but still no dead air and no filler.'
        : scriptPacing === 'auto'
          ? 'Delivery rhythm: choose the strongest cadence for each beat while keeping the required micro-scene count.'
          : 'Delivery rhythm: urgent, punchy and dense, with a micro-hook at the end of every scene.';
    const depthGuidance =
      scriptDepth === 'article'
        ? 'Treat the user-supplied topic/text as the sole authoritative source. Extract and structure ALL specific facts, data points, arguments, examples and nuances from it. Do not oversimplify, invent, or omit details; compress the language, never the substance.'
        : scriptDepth === 'condensed'
          ? 'Compress a genuinely deep explanation into a high-impact summary. Keep the causal mechanism and at least one concrete number, contrast and mistake, but move faster than the analytical mode.'
          : 'Build a deep, investigative explanation. Move beyond surface advice into the underlying psychological, scientific or practical mechanism: why it works, how it actually works, what it costs, and what to do about it.';
    const backgroundPreset = normalizeBackgroundPreset(
      body.backgroundPreset,
      normalizeBackgroundPreset(studioSettings.backgroundPreset),
    );
    const aiDesign = buildAiDesign(topic, visualStyle);
    const brandForPrompt =
      body.brandKit && typeof body.brandKit === 'object'
        ? normalizeBrandKit(body.brandKit)
        : null;
    const wcag = resolveWcagPalette({
      bgColor: brandForPrompt?.bgColor ?? aiDesign.bgColor,
      accentColor: brandForPrompt?.accentColor ?? aiDesign.accentColor,
      moodText: topic,
    });
    const wcagPrompt = `${wcag.promptBlock}\nAccent=${wcag.safeAccent}; background=${wcag.bgColor}; card=${wcag.surfaceCardBg}; text=${wcag.primaryText}; muted=${wcag.secondaryText}.`;
    const silentVisualMode = body.voiceoverEnabled === false;
    const sfxEnabledForScript = body.sfxEnabled !== false;
    const captionsHidden = silentVisualMode || body.captionsEnabled === false;

    if (!topic) {
      res.status(400).json({ error: 'يرجى إدخال موضوع الفيديو أو الفكرة أولاً.' });
      return;
    }

    const systemPrompt = [
      `You are an expert ${outputLanguage} short-form video scriptwriter and Remotion motion director.`,
      `The user's exact topic is: "${topic}".`,
      'Write a completely custom script for that exact topic. Do not reuse generic placeholder scenes.',
      `Create a deeply researched, non-superficial ${outputLanguage} short-form script for visualStyle="${visualStyle}" and aspectRatio="${aspectRatio}".`,
      `Design each scene for the primary ${aspectRatio} frame first, then keep it responsive: 16:9 favors a balanced horizontal two-column split (visual/chart/character beside headline and callout), 1:1 favors compact centered or split spacing with proportional type, and 9:16 favors clean vertical stacking with generous top/bottom safe zones. Never pack a scene so tightly that it clips when the aspect ratio changes.`,
      `SCRIPT DEPTH MODE: ${scriptDepth}. ${depthGuidance}`,
      sceneCountRule,
      `TOTAL SPOKEN BUDGET: the combined narration across all scenes must stay within ${targetBudget.min}-${targetBudget.max} words so the spoken audio matches the selected ${targetDurationLabel}-second duration. Trim narration rather than exceeding the ceiling.`,
      `Each micro-scene must contain ONE concrete idea and ${wordRule}; ${durationRule}.`,
      `BAN all generic filler, shallow platitudes and cliché intros. Never open with "في عالم اليوم", "هل تساءلت يوماً", "In today's world", "Have you ever wondered", "Did you know", or similar. Start with a concrete tension, surprising fact, or high-stakes consequence.`,
      'Every scene must add new information: a mechanism, a specific number/statistic, a real-world contrast, a common mistake, or an actionable step. Never repeat the same insight in different words.',
      'Across the script, include at least: one root-cause mechanism ("why and how it actually works"), one concrete number or data point, one before/after contrast, one common mistake, and a clear actionable takeaway.',
      'Connect scenes with smooth narrative micro-hooks: the last beat of each scene must create a reason to watch the next 4 seconds.',
      'Pacing and retention: no static exposition, no bloated paragraphs, no summarising what was just said. Every 4-5 seconds introduces a fresh visual beat and a concrete idea.',
      silentVisualMode
        ? 'PURE SILENT VISUAL MODE: there is no voiceover and no bottom subtitle bar. Every scene must communicate on its own through rich kinetic infographics, split comparisons, step cards, charts, and bold on-screen visual labels. Put the core message directly in visualLabel/visualValue and keep narration only as an internal script note.'
        : captionsHidden
          ? 'SUBTITLES ARE HIDDEN: the voiceover remains active, but no bottom caption strip will render. Move the essential message into bold on-screen visualLabel/visualValue text and visual storytelling while keeping narration for the spoken track.'
          : 'Captions are visible as short bottom chunks, so keep narration and visual labels tightly aligned.',
      'Creative direction is mandatory: every scene must feel visually different. Do not repeat the same visualType, pose, layout, or camera move twice in a row.',
      'Assign each micro-scene a visual composition and a step-by-step animated beat that matches the exact insight being spoken. Use comparison-box for contrasts, generative-scene with flow/cycle motifs for processes and loops, step-timeline for sequences, stat-number for data, warning-card for mistakes, and cta for the action step.',
      visualStyle === 'smart-mix'
        ? 'For AI Smart Mix, set "showCharacter" per scene: true only when an expressive faceless character genuinely helps the emotional beat; false when data, flow, comparison, or pure motion graphics communicate better.'
        : visualStyle === 'stickman'
          ? 'Stickman is SELECTIVE, not mandatory: set "showCharacter": true only for the opening hook and/or closing CTA (at most 1-2 scenes) where a human gesture adds clear value. Set false for at least 60-70% of scenes and carry them with pure kinetic motion graphics, animated SVG icons, UI mockups, data charts, glowing cards, kinetic typography, and geometric transitions.'
          : 'The selected style is pure motion graphics. Never rely on a character; use typography, geometry, data and diagram motion only.',
      'Return ONLY a valid JSON array (no markdown fences) where each object has:',
      `- "title": short ${outputLanguage} scene title (2-5 words)`,
      `- "narration": one crisp spoken ${outputLanguage} sentence with ${wordRule} and a concrete idea`,
      '- "pose": one of "idle", "walking", "explaining", "thinking", "shocked", "happy", "sad", "pointing", "celebrating", "idea", "facepalm" — choose an expressive, scene-appropriate state',
      creativeCodeMode === 'creative'
        ? '- "visualType": one of "custom-tsx", "generative-scene", "title-hero", "stat-number", "comparison-box", "bar-chart", "line-chart", "circular-gauge", "step-timeline", "notification-card", "warning-card", "editorial-quote", "bullet-list", "cta", "custom" — vary the composition across scenes'
        : '- "visualType": one of "generative-scene", "title-hero", "stat-number", "comparison-box", "bar-chart", "line-chart", "circular-gauge", "step-timeline", "notification-card", "warning-card", "editorial-quote", "bullet-list", "cta", "custom" — never use custom-tsx in fast mode',
      creativeCodeMode === 'creative'
        ? 'At least one scene must use "visualType": "custom-tsx" for bespoke storytelling beyond built-in primitives, with a detailed "customCodeBrief" describing the exact motion, composition, characters, ambient environment, and visual metaphor. Keep the rest of the scenes in built-in types.'
        : 'Use only built-in declarative visual types. Never request custom TSX generation.',
      '- "customCodeBrief": optional detailed visual code brief when visualType is "custom-tsx"',
      '- "ambientScene": optional one of "none", "night-room", "desk-lamp", "rain-window", "clock", "phone-notifications", "cozy-desk" — use for lifestyle/emotional atmosphere',
      '- "characters": optional array of 1-3 faceless character objects like {"pose":"idle","side":"left","accessory":"none","label":"..."} for multi-character split-screen storytelling',
      '- "characterLayout": optional "side-by-side" or "top-bottom" when multiple characters are used',
      '- Use "generative-scene" for at least two scenes. It renders a unique multi-layered animated SVG diagram with sequential node reveals, flowing connectors, and kinetic typography.',
      `- "visualLabel": short ${outputLanguage} label shown on the graphic`,
      '- "visualValue": concise metric, short phrase, or the kinetic headline shown prominently',
      '- "visualKeywords": when using "generative-scene", provide 3-5 short topic-specific labels for the animated nodes (array of strings)',
      '- "motif": when using "generative-scene", choose one of "orbit", "network", "flow", "funnel", "cycle", "constellation"',
      '- "showCharacter": boolean per scene (required for smart-mix, optional otherwise)',
      '- "customCodeBrief": optional detailed visual brief for bespoke custom-tsx scenes',
      '- "ambientScene": optional environmental layer id (night-room, desk-lamp, rain-window, clock, phone-notifications, cozy-desk)',
      '- "characters": optional array of up to 3 faceless characters for multi-character staging',
      '- "characterLayout": optional "side-by-side" or "top-bottom" for multi-character staging',
      '- "visualPrompt": optional custom visual prompt when visualType is "custom"',
      '- "layout": one of "split", "stacked", "overlay", "centered" — never repeat the same layout in two consecutive scenes',
      '- "camera": one of "slow-zoom-in", "slow-zoom-out", "pan-left", "pan-right", "push-in", "static" — vary the camera motion',
      '- "backgroundPreset": optionally one of "animated-mesh", "kinetic-grid", "floating-orbs", "deep-wave", "particle-field", "editorial-paper", "neon-cyber" — never repeat the same background in consecutive scenes',
      '- "sfxId": default to "none". Attach at most one subtle SFX to genuinely pivotal visual transitions or chart reveals, never more than 35% of scenes. Use "none" for calm, night, reflective, or emotional beats. Choose only from "whoosh-soft", "whoosh-whip", "pop-soft", "click-subtle", "slide", "type-tick", "toggle-soft", "impact-soft". Never use any bell, chime, ding, success, alarm, or notification sound (for example never "ding-success" or "notification-chime") and never place SFX at a scene ending.',
      '- "sfxAt": trigger offset in seconds (0.12 to 1.2 only) when sfxId is not "none"; keep it early in the scene with at least 0.6s of breathing room before the end.',
      `- "durationSec": number between ${scriptDepth === 'condensed' ? '3.5 and 4.5' : '4 and 5.5'} (the render pipeline will replace it with the measured ElevenLabs MP3 duration)`,
      'Output the JSON array only. It must contain no commentary, no markdown, and no repeated scenes.',
    ].join('\n');

    const keys = resolveApiKeys(req);
    const attempts: ChatAttempt[] = [];
    const seenAttempts = new Set<string>();
    const pushAttempt = (attempt: ChatAttempt) => {
      const signature = `${attempt.kind}:${attempt.model}:${attempt.baseUrl || ''}`;
      if (seenAttempts.has(signature)) return;
      seenAttempts.add(signature);
      attempts.push(attempt);
    };
    const pushOpenRouter = (model: string) => {
      if (!keys.openrouterKey) return;
      pushAttempt({
        kind: 'openrouter',
        providerLabel: 'OpenRouter',
        model: mapOpenRouterModel(model),
      });
    };
    const pushDeepSeek = (model: string) => {
      if (!keys.deepseekKey) return;
      pushAttempt({
        kind: 'deepseek',
        providerLabel: 'DeepSeek',
        model: mapDeepSeekModel(model),
      });
    };
    const pushKieAi = (model: string) => {
      if (!keys.kieaiKey) return;
      const normalized = KIEAI_MODELS.some((item) => item.id === model)
        ? model
        : KIEAI_MODELS[0].id;
      pushAttempt({
        kind: 'kieai',
        providerLabel: 'Kie.ai',
        model: normalized,
        baseUrl: 'https://api.kie.ai/api/v1/chat/completions',
      });
    };
    const pushCustom = (model: string) => {
      if (!keys.customProviderKey || !keys.customProviderBaseUrl) return;
      pushAttempt({
        kind: 'custom',
        providerLabel: keys.customProviderName,
        model: model || 'custom-model',
      });
    };

    if (requestedProvider === 'opencode-free') {
      const primaryModel = mapOpenRouterModel(requestedModel);
      pushOpenRouter(requestedModel);
      pushDeepSeek(requestedModel);
      FREE_FALLBACK_MODELS.filter((model) => model !== primaryModel)
        .slice(0, 2)
        .forEach(pushOpenRouter);
    } else if (requestedProvider === 'deepseek') {
      pushDeepSeek(requestedModel);
      pushOpenRouter(requestedModel);
    } else if (requestedProvider === 'openrouter') {
      pushOpenRouter(requestedModel);
      pushDeepSeek(requestedModel);
    } else if (requestedProvider === 'kieai') {
      pushKieAi(requestedModel);
      pushOpenRouter(requestedModel);
      pushDeepSeek(requestedModel);
    } else {
      pushCustom(requestedModel);
      pushOpenRouter(requestedModel);
      pushDeepSeek(requestedModel);
      pushKieAi(requestedModel);
    }

    pushOpenRouter(requestedModel);
    pushDeepSeek(requestedModel);
    pushKieAi(requestedModel);
    pushCustom(requestedModel);

    const userPrompt = `Requested topic: ${topic}\nWrite every scene specifically about this exact topic.`;
    const sfxOptions = {
      voiceoverEnabled: !silentVisualMode,
      sfxEnabled: sfxEnabledForScript,
    };
    const finalizeScenes = async (parsed: unknown[]) => {
      const normalized = curateSceneSfx(
        applySceneVariety(normalizeScenes(parsed), backgroundPreset, topic),
        topic,
        sfxOptions,
      );
      const result = await maybeGenerateCreativeScenes(normalized, {
        creativeCodeMode,
        scriptLanguage,
        aspectRatio,
        attempts,
        keys,
        wcagPrompt,
      });
      return {
        ...result,
        scenes: curateSceneSfx(result.scenes, topic, sfxOptions),
      };
    };
    let lastAttempt: ChatAttempt | null = null;
    const aiUsage: ChatUsage = { inputTokens: 0, outputTokens: 0, model: '', usd: 0, calls: 0 };

    for (const attempt of attempts) {
      lastAttempt = attempt;
      const result = await requestChatCompletion(attempt, systemPrompt, userPrompt, keys);
      if (!result) continue;
      aiUsage.inputTokens += result.usage.inputTokens;
      aiUsage.outputTokens += result.usage.outputTokens;
      aiUsage.usd += result.usage.usd;
      aiUsage.calls += result.usage.calls;
      aiUsage.model = result.usage.model;
      const parsed = extractJsonArray(result.content);
      if (parsed && parsed.length > 0) {
        const usingFallback =
          requestedProvider !== 'opencode-free' && attempt.kind !== requestedProvider;
        const finalized = await finalizeScenes(parsed);
        res.json({
          source: attempt.kind,
          providerUsed: attempt.providerLabel,
          requestedProvider,
          modelUsed: attempt.model,
          fallbackUsed: usingFallback,
          scenes: finalized.scenes,
          generatedScenes: finalized.generated,
          generationFallbacks: finalized.failed,
          scriptDepth,
          creativeCodeMode,
          scriptPacing,
          design: backgroundPreset === 'ai-free' ? aiDesign : undefined,
          usage: {
            aiInputTokens: aiUsage.inputTokens,
            aiOutputTokens: aiUsage.outputTokens,
            aiCalls: aiUsage.calls,
            aiUsd: Number(aiUsage.usd.toFixed(6)),
            aiModel: aiUsage.model,
          },
          notice: usingFallback
            ? `تم استخدام ${attempt.providerLabel} (${attempt.model}) بعد تعذر المزود المحدد.`
            : undefined,
        });
        return;
      }
    }

    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    if (geminiKey && geminiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const geminiResp = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `${systemPrompt}\n\nRequested topic: ${topic}`,
        });
        const geminiText = geminiResp.text || '';
        const parsed = extractJsonArray(geminiText);
        if (parsed && parsed.length > 0) {
          const geminiInput = Math.max(1, Math.round((systemPrompt.length + topic.length) / 4));
          const geminiOutput = Math.max(1, Math.round(geminiText.length / 4));
          const geminiUsd = estimateAiUsd('gemini-2.5-flash', geminiInput, geminiOutput);
          recordUsage({
            aiInputTokens: geminiInput,
            aiOutputTokens: geminiOutput,
            aiCalls: 1,
            aiUsd: geminiUsd,
            aiModel: 'gemini-2.5-flash',
          });
          const finalized = await finalizeScenes(parsed);
          res.json({
            source: 'gemini',
            providerUsed: 'Gemini',
            requestedProvider,
            modelUsed: 'gemini-2.5-flash',
            fallbackUsed: true,
            scenes: finalized.scenes,
            generatedScenes: finalized.generated,
            generationFallbacks: finalized.failed,
            scriptDepth,
            creativeCodeMode,
            scriptPacing,
            design: backgroundPreset === 'ai-free' ? aiDesign : undefined,
            usage: {
              aiInputTokens: geminiInput,
              aiOutputTokens: geminiOutput,
              aiCalls: 1,
              aiUsd: geminiUsd,
              aiModel: 'gemini-2.5-flash',
            },
          });
          return;
        }
      } catch {
        // Fall through to the topic-tailored local fallback
      }
    }

    const fallbackFinalized = await finalizeScenes(
      buildFallbackScenes(
        topic,
        scriptLanguage === 'ar' ? 'ar' : 'en',
        scriptDepth,
      ),
    );
    res.json({
      source: 'template',
      providerUsed: 'Local topic template',
      requestedProvider,
      modelUsed: lastAttempt?.model || requestedModel,
      fallbackUsed: true,
      scenes: fallbackFinalized.scenes,
      generatedScenes: fallbackFinalized.generated,
      generationFallbacks: fallbackFinalized.failed,
      scriptDepth,
      creativeCodeMode,
      scriptPacing,
      design: backgroundPreset === 'ai-free' ? aiDesign : undefined,
      notice:
        scriptLanguage === 'ar'
          ? `تعذر الوصول إلى مزودي الذكاء الاصطناعي لموضوع "${topic}". تم توليد مسودة محلية مخصصة للموضوع؛ تحقق من مفاتيح API في الإعدادات للحصول على توليد حي.`
          : `No AI provider was reachable for "${topic}". Generated a topic-tailored local draft; add or verify an API key in settings for live model output.`,
    });
  };

  app.post('/api/script/generate', handleGenerateScript);
  app.post('/api/generate-script', handleGenerateScript);

  app.post('/api/scenes/smart-edit', async (req: Request, res: Response) => {
    const body = (req.body || {}) as {
      scenes?: unknown;
      startSecond?: unknown;
      endSecond?: unknown;
      targetSceneId?: unknown;
      instruction?: unknown;
      visualStyle?: unknown;
      brandKit?: unknown;
      language?: unknown;
      scriptLanguage?: unknown;
      aspectRatio?: unknown;
      voiceoverEnabled?: unknown;
      sfxEnabled?: unknown;
      provider?: unknown;
      modelId?: unknown;
    };

    if (!Array.isArray(body.scenes) || body.scenes.length === 0) {
      res.status(400).json({ error: 'يجب وجود مشهد واحد على الأقل للتعديل الجزئي.' });
      return;
    }

    const instruction =
      typeof body.instruction === 'string' ? body.instruction.trim().slice(0, 1200) : '';
    if (!instruction) {
      res.status(400).json({ error: 'يرجى كتابة التعديل المطلوب لهذا الجزء فقط.' });
      return;
    }

    const scenes = normalizeScenes(body.scenes);
    const rawScenes = body.scenes as unknown[];
    const rawById = new Map<string, Record<string, unknown>>();
    for (const item of rawScenes) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const record = item as Record<string, unknown>;
      if (typeof record.id === 'string') rawById.set(record.id, record);
    }
    const windows = sceneWindows(scenes);
    const totalDuration = windows[windows.length - 1]?.endSecond ?? 0;
    const startRaw = Number(body.startSecond);
    const endRaw = Number(body.endSecond);
    const hasRange =
      Number.isFinite(startRaw) &&
      Number.isFinite(endRaw) &&
      Math.max(0, endRaw) > Math.max(0, startRaw);
    const requestedStart = Number.isFinite(startRaw)
      ? Math.min(totalDuration, Math.max(0, startRaw))
      : 0;
    const requestedEnd = Number.isFinite(endRaw)
      ? Math.min(totalDuration, Math.max(0, endRaw))
      : totalDuration;
    const targetSceneId =
      typeof body.targetSceneId === 'string' ? body.targetSceneId.trim() : '';

    const targetIndices = new Set<number>();
    if (targetSceneId) {
      const found = scenes.findIndex((scene) => scene.id === targetSceneId);
      if (found >= 0) targetIndices.add(found);
    }
    if (hasRange) {
      for (const window of windows) {
        if (
          window.endSecond > requestedStart &&
          window.startSecond < requestedEnd
        ) {
          targetIndices.add(window.index);
        }
      }
    }
    const orderedTargets = Array.from(targetIndices).sort((a, b) => a - b);
    if (orderedTargets.length === 0) {
      res.status(400).json({
        error: 'لم يتم العثور على مشهد يطابق النطاق الزمني أو المشهد المحدد.',
      });
      return;
    }

    const firstTarget = orderedTargets[0];
    const lastTarget = orderedTargets[orderedTargets.length - 1];
    const effectiveStart = hasRange
      ? requestedStart
      : windows[firstTarget].startSecond;
    const effectiveEnd = hasRange
      ? requestedEnd
      : windows[lastTarget].endSecond;
    const visualStyle = normalizeVisualStyleValue(
      body.visualStyle,
      studioSettings.visualStyle,
    );
    const brandKit = normalizeBrandKit(body.brandKit ?? studioSettings.brandKit);
    const language = normalizeVideoLanguage(
      body.language ?? body.scriptLanguage,
      studioSettings.scriptLanguage,
    );
    const aspectRatio =
      typeof body.aspectRatio === 'string' ? body.aspectRatio : '9:16';
    const wcag = resolveWcagPalette({
      bgColor: brandKit.bgColor,
      accentColor: brandKit.accentColor,
      moodText: instruction,
    });

    const promptTargets = orderedTargets.map((sceneIndex, order) => {
      const scene = scenes[sceneIndex];
      return {
        order,
        id: scene.id,
        globalSceneIndex: sceneIndex,
        range: windows[sceneIndex],
        scene: compactSceneForPrompt(scene),
        currentTsxCode:
          readGeneratedComponentSource(scene.generatedComponent) || undefined,
      };
    });
    const contextBefore =
      firstTarget > 0
        ? {
            id: scenes[firstTarget - 1].id,
            title: scenes[firstTarget - 1].title,
            narration: scenes[firstTarget - 1].narration.slice(0, 180),
          }
        : null;
    const contextAfter =
      lastTarget < scenes.length - 1
        ? {
            id: scenes[lastTarget + 1].id,
            title: scenes[lastTarget + 1].title,
            narration: scenes[lastTarget + 1].narration.slice(0, 180),
          }
        : null;

    const systemPrompt = [
      'You are a surgical Remotion scene editor for Zof Studio.',
      'You receive ONLY the targeted scene(s) plus tiny before/after context. Never rewrite the whole video.',
      'Return exactly one JSON array (no markdown fences, no commentary). Each object must represent one targeted scene and must keep the same "id".',
      'Preserve every non-target scene exactly as-is. Never touch narration, title, durationSec, audio files, audioSrc, audioDataUrl, or audioDuration.',
      'Only update surgical visual fields: pose, visualType, visualLabel, visualValue, visualPrompt, visualSvg, layout, camera, background, backgroundPreset, visualKeywords, motif, showCharacter, customCodeBrief, characters, characterLayout, ambientScene, sfxCues, sfxAt.',
      'Keep the overall video duration identical. Do not change durationSec.',
      'For Custom TSX updates, include a complete self-contained TSX module in "tsxCode". Only import from "react", "remotion", packages starting with "@remotion/", "@iconify/react", "simple-icons", "lucide-react", "d3-geo", "topojson-client", "world-atlas/countries-110m.json", "roughjs", "../components/Stickman", "../components/SilhouetteActor", "../components/SmartIcon", and "../components/SceneSfx". Use <SmartIcon query="..." brand={...} color="..." size={...} /> for ALL objects, symbols, icons, and company logos, and <SilhouetteActor pose="..." color="..." size={...} /> for ALL human figures — never hand-draw them. Never use fs, path, child_process, os, net, http, https, process, eval, new Function, fetch, XMLHttpRequest, WebSocket, require(), dynamic import(), or dangerouslySetInnerHTML.',
      'The TSX module must export exactly one named component with the same component name as the existing generatedComponent when provided.',
      'Use useCurrentFrame(), useVideoConfig(), spring(), and interpolate() so the segment stays animated. Respect RTL Arabic text when language is ar.',
      `Prioritize the requested aspect ratio (${aspectRatio}) while keeping the TSX responsive: read width/height from useVideoConfig(), derive isLandscape = width > height and isSquare = width === height, and use percentage/flex containers with minHeight 0 so switching to 9:16, 16:9, or 1:1 never clips or overflows.`,
      'For 16:9 use a two-column split with maxHeight 72% and at least 64px/48px safe padding; for 1:1 use compact centered/split spacing; for 9:16 use vertical stacking with at least 80px top and 112px bottom safe zones.',
      'Reserve the bottom 22% for captions. Keep at most one subtle SFX cue per scene at volume 0.12–0.25, use sfxCues frameOffset values relative to the scene start, never place a bell/chime/ding/success sound, and never place any cue in the final 0.6s of the scene.',
      wcag.promptBlock,
    ].join('\n');

    const userPrompt = JSON.stringify(
      {
        instruction,
        language,
        visualStyle,
        aspectRatio,
        brandKit,
        voiceoverEnabled: body.voiceoverEnabled !== false,
        sfxEnabled: body.sfxEnabled !== false,
        targetWindow: {
          startSecond: effectiveStart,
          endSecond: effectiveEnd,
          totalDuration,
        },
        contextBefore,
        contextAfter,
        targetedScenes: promptTargets,
      },
      null,
      2,
    );

    const providerCandidate =
      typeof body.provider === 'string' ? body.provider : studioSettings.aiProvider;
    const requestedProvider = AI_PROVIDER_IDS.has(providerCandidate as AiProviderId)
      ? (providerCandidate as AiProviderId)
      : studioSettings.aiProvider;
    const requestedModel =
      (typeof body.modelId === 'string' && body.modelId.trim()
        ? body.modelId.trim()
        : studioSettings.aiModel) || DEFAULT_FREE_MODEL;
    const keys = resolveApiKeys(req);
    const attempts = buildChatAttempts(requestedProvider, requestedModel, keys);

    const usage: ChatUsage = {
      inputTokens: 0,
      outputTokens: 0,
      model: '',
      usd: 0,
      calls: 0,
    };
    let lastProvider = '';

    for (const attempt of attempts) {
      const result = await requestChatCompletion(
        attempt,
        systemPrompt,
        userPrompt,
        keys,
      );
      if (!result) continue;
      usage.inputTokens += result.usage.inputTokens;
      usage.outputTokens += result.usage.outputTokens;
      usage.usd += result.usage.usd;
      usage.calls += result.usage.calls;
      usage.model = result.usage.model;
      lastProvider = attempt.providerLabel;

      const parsed = extractJsonArray(result.content);
      if (!parsed || parsed.length === 0) continue;
      const records = parsed.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === 'object' && !Array.isArray(item),
      );
      if (records.length === 0) continue;
      const byId = new Map<string, Record<string, unknown>>();
      for (const record of records) {
        if (typeof record.id === 'string') byId.set(record.id, record);
      }

      const updates = new Map<number, Record<string, unknown>>();
      orderedTargets.forEach((sceneIndex, order) => {
        const scene = scenes[sceneIndex];
        const record =
          byId.get(scene.id) || records[order] || records[0] || null;
        if (record) updates.set(sceneIndex, record);
      });

      const tsxUpdates: Array<{
        sceneIndex: number;
        componentName: string;
        code: string;
        filePath: string;
        existed: boolean;
        previousSource: string | null;
      }> = [];
      const tsxErrors: string[] = [];

      for (const [sceneIndex, record] of updates) {
        const scene = scenes[sceneIndex];
        const tsxCode = pickSmartEditTsx(record);
        if (!tsxCode) continue;
        const componentName =
          scene.generatedComponent &&
          isValidGeneratedComponentName(scene.generatedComponent)
            ? scene.generatedComponent
            : makeGeneratedComponentName(scene.id, sceneIndex);
        const sanitized = sanitizeGeneratedTsx(tsxCode, componentName);
        if (!sanitized.ok) {
          tsxErrors.push(
            `${scene.id}: ${sanitized.errors.slice(0, 4).join(' | ')}`,
          );
          continue;
        }
        const filePath = path.join(GENERATED_DIR, `${componentName}.tsx`);
        let previousSource: string | null = null;
        try {
          previousSource = fs.readFileSync(filePath, 'utf8');
        } catch {
          previousSource = null;
        }
        tsxUpdates.push({
          sceneIndex,
          componentName,
          code: sanitized.code,
          filePath,
          existed: previousSource !== null,
          previousSource,
        });
      }

      if (tsxErrors.length > 0) {
        res.status(422).json({
          error:
            language === 'ar'
              ? 'تم رفض كود TSX المخصص لأنه لم يجتز فحص الأمان أو التحقق النحوي.'
              : 'The custom TSX was rejected because it failed the security sandbox or syntax validation.',
          details: tsxErrors,
        });
        return;
      }

      const writtenFiles: Array<{
        filePath: string;
        existed: boolean;
        previousSource: string | null;
      }> = [];
      let writeFailed = false;
      for (const update of tsxUpdates) {
        const written = writeGeneratedComponentFile(
          update.componentName,
          update.code,
        );
        if (!written.ok) {
          tsxErrors.push(
            `${update.componentName}: ${written.errors.slice(0, 4).join(' | ')}`,
          );
          writeFailed = true;
          break;
        }
        writtenFiles.push({
          filePath: update.filePath,
          existed: update.existed,
          previousSource: update.previousSource,
        });
      }

      if (!writeFailed && writtenFiles.length > 0) {
        const check = await runRootTypeScriptCheck();
        const generatedErrors = generatedTypeScriptErrors(check.output);
        if (generatedErrors) {
          tsxErrors.push(generatedErrors);
          writeFailed = true;
        }
      }

      if (writeFailed) {
        for (const backup of writtenFiles.reverse()) {
          try {
            if (backup.existed && backup.previousSource !== null) {
              fs.writeFileSync(backup.filePath, backup.previousSource, 'utf8');
            } else if (!backup.existed && fs.existsSync(backup.filePath)) {
              fs.unlinkSync(backup.filePath);
            }
          } catch {
            // Best effort restore.
          }
        }
        syncGeneratedRegistry();
        res.status(422).json({
          error:
            language === 'ar'
              ? 'فشل التحقق من كود TSX المعدّل، وتم استرجاع النسخة السابقة دون تغيير المشاهد.'
              : 'The updated TSX failed validation. The previous version was restored and no scenes were changed.',
          details: tsxErrors,
        });
        return;
      }

      const tsxByScene = new Map(
        tsxUpdates.map((update) => [update.sceneIndex, update.componentName]),
      );
      const changedSceneIds: string[] = [];
      const finalScenes: unknown[] = scenes.map((original, sceneIndex) => {
        const rawOriginal = rawById.get(original.id) || original;
        if (!updates.has(sceneIndex)) {
          return rawOriginal;
        }
        const record = updates.get(sceneIndex)!;
        const patch: Record<string, unknown> = {};
        for (const key of SMART_EDIT_VISUAL_KEYS) {
          if (Object.prototype.hasOwnProperty.call(record, key)) {
            patch[key] = record[key];
          }
        }
        const mergedRaw: Record<string, unknown> = {
          ...rawOriginal,
          ...patch,
          id: original.id,
          title: original.title,
          narration: original.narration,
          durationSec: original.durationSec,
          audioSrc: original.audioSrc,
          audioDataUrl: original.audioDataUrl,
          audioDuration: original.audioDuration,
        };
        const generatedComponent = tsxByScene.get(sceneIndex);
        if (generatedComponent) {
          mergedRaw.generatedComponent = generatedComponent;
          mergedRaw.visualType = 'custom-tsx';
        }
        const normalized = normalizeScenes([mergedRaw])[0] || original;
        normalized.id = original.id;
        normalized.title = original.title;
        normalized.narration = original.narration;
        normalized.durationSec = original.durationSec;
        normalized.audioSrc = original.audioSrc;
        normalized.audioDataUrl = original.audioDataUrl;
        normalized.audioDuration = original.audioDuration;
        if (normalized.visualType === 'custom-tsx' && !normalized.generatedComponent) {
          normalized.visualType =
            original.visualType === 'custom-tsx'
              ? 'generative-scene'
              : original.visualType;
        }
        changedSceneIds.push(original.id);
        return { ...rawOriginal, ...normalized };
      });

      const projectVoice = readProjectState();
      seedSceneAudioCache(scenes, {
        voiceId: projectVoice?.voiceId || studioSettings.voiceId,
        modelId: projectVoice?.voiceModelId || studioSettings.voiceModelId,
        stability: projectVoice?.voiceStability ?? studioSettings.voiceStability,
        similarityBoost:
          projectVoice?.voiceSimilarityBoost ??
          studioSettings.voiceSimilarityBoost,
        style: projectVoice?.voiceStyle ?? studioSettings.voiceStyle,
        speakerBoost:
          projectVoice?.voiceSpeakerBoost ?? studioSettings.voiceSpeakerBoost,
        speed: projectVoice?.voiceSpeed ?? studioSettings.voiceSpeed,
      });

      res.json({
        ok: true,
        scenes: finalScenes,
        targetSceneIds: orderedTargets.map((index) => scenes[index].id),
        changedSceneIds,
        startSecond: Number(effectiveStart.toFixed(3)),
        endSecond: Number(effectiveEnd.toFixed(3)),
        targetSceneId: targetSceneId || undefined,
        providerUsed: attempt.providerLabel,
        modelUsed: attempt.model,
        usage: {
          aiInputTokens: usage.inputTokens,
          aiOutputTokens: usage.outputTokens,
          aiCalls: usage.calls,
          aiUsd: Number(usage.usd.toFixed(6)),
          aiModel: usage.model,
        },
        notice:
          language === 'ar'
            ? `تم التعديل الجزئي على ${changedSceneIds.length} مشهد فقط (${effectiveStart.toFixed(1)}s – ${effectiveEnd.toFixed(1)}s) مع الحفاظ على بقية الفيديو والصوت والكاش.`
            : `Surgically updated ${changedSceneIds.length} scene(s) between ${effectiveStart.toFixed(1)}s and ${effectiveEnd.toFixed(1)}s while preserving the rest of the video, audio, and cache.`,
      });
      return;
    }

    res.status(502).json({
      error:
        language === 'ar'
          ? 'تعذر الوصول إلى مزودي الذكاء الاصطناعي لتطبيق التعديل الجزئي. تحقق من المفاتيح في الإعدادات.'
          : 'Could not reach an AI provider for the surgical edit. Verify the keys in settings.',
      providerUsed: lastProvider || undefined,
    });
  });

  app.post('/api/visual/suggest', async (req: Request, res: Response) => {
    const body = (req.body || {}) as {
      prompt?: unknown;
      topic?: unknown;
      modelId?: unknown;
      scriptLanguage?: unknown;
      language?: unknown;
    };

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 500) : '';
    const topic = typeof body.topic === 'string' ? body.topic.trim().slice(0, 300) : '';
    const scriptLanguage = normalizeVideoLanguage(
      body.scriptLanguage ?? body.language,
      studioSettings.scriptLanguage,
    );
    const outputLanguage = videoLanguageName(scriptLanguage);
    const requestedModel = typeof body.modelId === 'string' ? body.modelId : 'deepseek/deepseek-v4.1-flash';

    if (!prompt) {
      res.status(400).json({ error: 'وصف العنصر البصري المخصص مطلوب.' });
      return;
    }

    const iconSet = new Set([
      'money', 'chart', 'heart', 'clock', 'brain', 'shield', 'rocket', 'target',
      'wallet', 'piggybank', 'trend', 'alert', 'check', 'x', 'lock', 'book',
      'bulb', 'calendar', 'coin', 'home', 'car', 'trophy', 'globe', 'users',
      'phone', 'star', 'arrow', 'spark', 'scale', 'bank', 'graduation', 'coffee',
      'briefcase', 'key', 'cloud',
    ]);

    let title =
      prompt.split(/[.!?،؟\n]/)[0].slice(0, 52) ||
      (scriptLanguage === 'ar' ? 'عنصر بصري مخصص' : 'Custom visual');
    let text = prompt.slice(0, 160);
    let icon = 'spark';
    let source: 'openrouter' | 'template' = 'template';
    let visualUsage: UsageDelta | undefined;

    const { openrouterKey } = resolveApiKeys(req);
    if (openrouterKey) {
      const openrouterModel = OPENROUTER_MODEL_MAP[requestedModel] || requestedModel;
      const systemPrompt = [
        `You are a visual director designing a single custom SVG card for a ${outputLanguage} short video.`,
        'Return ONLY a compact JSON object with keys:',
        '- "title": 2-6 word card title',
        '- "text": one crisp supporting sentence (max 140 chars)',
        '- "icon": one of money, chart, heart, clock, brain, shield, rocket, target, wallet, piggybank, trend, alert, check, lock, book, bulb, calendar, coin, home, car, trophy, globe, users, phone, star, arrow, spark, scale, bank, graduation, coffee, briefcase, key, cloud',
        'Do not return markdown fences or SVG markup.',
      ].join('\n');

      try {
        const orResp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json',
            'X-Title': 'Zof Studio',
          },
          body: JSON.stringify({
            model: openrouterModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Topic: ${topic || 'general'}\nVisual prompt: ${prompt}` },
            ],
            temperature: 0.6,
          }),
          signal: AbortSignal.timeout(20000),
        });

        if (orResp.ok) {
          const orData = (await orResp.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
            usage?: unknown;
          };
          const parsed = extractJsonObject(orData.choices?.[0]?.message?.content || '');
          if (parsed) {
            if (typeof parsed.title === 'string' && parsed.title.trim()) {
              title = parsed.title.trim().slice(0, 52);
            }
            if (typeof parsed.text === 'string' && parsed.text.trim()) {
              text = parsed.text.trim().slice(0, 160);
            }
            if (typeof parsed.icon === 'string' && iconSet.has(parsed.icon)) {
              icon = parsed.icon;
            }
            source = 'openrouter';
            const tokens = readTokensFromPayload(orData);
            const visualUsd = estimateAiUsd(
              openrouterModel,
              tokens.input || Math.max(1, Math.round((systemPrompt.length + prompt.length) / 4)),
              tokens.output || Math.max(1, Math.round(text.length / 4)),
            );
            visualUsage = { visualCalls: 1, visualUsd };
            recordUsage(visualUsage);
          }
        }
      } catch {
        // Fall back to the deterministic local visual
      }
    }

    const accent = '#E77B40';
    res.json({
      source,
      usage: visualUsage,
      suggestion: {
        title,
        text,
        icon,
        svg: buildCustomSvg({ title, prompt, accent }),
      },
    });
  });

  app.post('/api/export/start', async (req: Request, res: Response) => {
    const body = (req.body || {}) as {
      prompt?: unknown;
      targetDuration?: unknown;
      aspectRatio?: unknown;
      fps?: unknown;
      brandKit?: unknown;
      palette?: unknown;
      voiceoverEnabled?: unknown;
      voiceId?: unknown;
      modelId?: unknown;
      stability?: unknown;
      similarityBoost?: unknown;
      style?: unknown;
      speakerBoost?: unknown;
      speed?: unknown;
      sfxEnabled?: unknown;
      sfxVolume?: unknown;
      scriptLanguage?: unknown;
      language?: unknown;
      captionsEnabled?: unknown;
      captionStyle?: unknown;
      captionAnimationStyle?: unknown;
      captionColors?: unknown;
      captionBottomOffset?: unknown;
      enable25D?: unknown;
      cleanBrollMode?: unknown;
      respectSafeZone?: unknown;
      tweakInstruction?: unknown;
      voiceoverScript?: unknown;
    };

    const prompt =
      typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 24000) : '';
    const approvedVoiceoverScript =
      typeof body.voiceoverScript === 'string'
        ? body.voiceoverScript.trim().slice(0, 24000)
        : '';
    const tweakInstruction =
      typeof body.tweakInstruction === 'string'
        ? body.tweakInstruction.trim().slice(0, 1200)
        : '';
    const project = tweakInstruction ? readProjectState() : null;
    if (tweakInstruction && (!project || project.scenes.length === 0)) {
      res.status(400).json({
        error: 'لا توجد مشاهد مولّدة لتعديلها. أنشئ فيديو أولاً ثم استخدم التعديل السريع.',
      });
      return;
    }
    if (!prompt && !tweakInstruction) {
      res.status(400).json({ error: 'يرجى كتابة برومبت الفيديو الرئيسي أولاً.' });
      return;
    }
    if (tweakInstruction && project) {
      project.scenes.forEach((scene, index) => {
        if (
          !scene.generatedComponent &&
          fs.existsSync(path.join(GENERATED_DIR, `Scene${index + 1}.tsx`))
        ) {
          scene.generatedComponent = `Scene${index + 1}`;
        }
      });
      const missing = project.scenes.filter(
        (scene) =>
          !scene.generatedComponent ||
          !isValidGeneratedComponentName(scene.generatedComponent) ||
          !fs.existsSync(path.join(GENERATED_DIR, `${scene.generatedComponent}.tsx`)),
      );
      if (missing.length > 0) {
        res.status(400).json({
          error:
            'ملفات المشاهد المولّدة غير موجودة. أعد إنشاء الفيديو أولاً ثم استخدم التعديل السريع.',
        });
        return;
      }
    }
    if (exportLockIsActive()) {
      res.status(409).json({
        error: 'هناك مهمة تصدير قيد التنفيذ بالفعل. انتظر اكتمالها قبل البدء من جديد.',
      });
      return;
    }

    const { elevenlabsKey } = resolveApiKeys(req);
    const jobId = crypto.randomUUID();
    const targetDuration = tweakInstruction
      ? undefined
      : normalizeTargetDuration(body.targetDuration);
    const projectAspect = project?.aspectRatio;
    const aspectRatio =
      body.aspectRatio === '16:9' || body.aspectRatio === '1:1' || body.aspectRatio === '9:16'
        ? body.aspectRatio
        : projectAspect === '16:9' || projectAspect === '1:1' || projectAspect === '9:16'
          ? projectAspect
          : studioSettings.aspectRatio;
    const requestedFps = Number(body.fps);
    const projectFps = project?.fps;
    const fps =
      requestedFps === 30 || requestedFps === 60
        ? requestedFps
        : projectFps === 30 || projectFps === 60
          ? projectFps
          : 60;
    const brandKit = brandKitWithActivePalette(
      body.brandKit ?? project?.brandKit ?? studioSettings.brandKit,
      body.palette,
    );
    const voiceoverEnabled = tweakInstruction
      ? typeof body.voiceoverEnabled === 'boolean'
        ? body.voiceoverEnabled
        : Boolean(project?.voiceoverEnabled)
      : Boolean(body.voiceoverEnabled);
    const sfxEnabled = tweakInstruction
      ? typeof body.sfxEnabled === 'boolean'
        ? body.sfxEnabled
        : Boolean(project?.sfxEnabled)
      : Boolean(body.sfxEnabled);
    const requestedSfxVolume = Number(body.sfxVolume);
    const sfxVolume = Number.isFinite(requestedSfxVolume)
      ? Math.min(1, Math.max(0, requestedSfxVolume))
      : project?.sfxVolume ?? studioSettings.sfxVolume;
    const scriptLanguage = normalizeVideoLanguage(
      body.language ?? body.scriptLanguage,
      normalizeVideoLanguage(project?.scriptLanguage, studioSettings.scriptLanguage),
    );
    const captionsEnabled =
      (tweakInstruction
        ? typeof body.captionsEnabled === 'boolean'
          ? body.captionsEnabled
          : Boolean(project?.captionsEnabled)
        : Boolean(body.captionsEnabled)) && voiceoverEnabled;
    const captionAnimationStyle = normalizeCaptionAnimationStyle(
      body.captionStyle ??
        body.captionAnimationStyle ??
        (tweakInstruction ? project?.captionAnimationStyle : undefined),
      project?.captionAnimationStyle || studioSettings.captionAnimationStyle,
    );
    const captionColors = normalizeCaptionColors(
      body.captionColors ??
        (tweakInstruction ? project?.captionColors : undefined) ??
        studioSettings.captionColors,
      brandKit,
    );
    const captionBottomOffset = normalizeCaptionBottomOffset(
      body.captionBottomOffset ??
        (tweakInstruction ? project?.captionBottomOffset : undefined) ??
        studioSettings.captionBottomOffset,
      DEFAULT_CAPTION_BOTTOM_OFFSET,
    );
    const enable25D = body.enable25D === true;
    const cleanBrollMode = tweakInstruction
      ? typeof body.cleanBrollMode === 'boolean'
        ? body.cleanBrollMode
        : Boolean(project?.cleanBrollMode)
      : body.cleanBrollMode === true;
    const respectSafeZone =
      typeof body.respectSafeZone === 'boolean'
        ? body.respectSafeZone
        : tweakInstruction
          ? Boolean(project?.respectSafeZone)
          : aspectRatio === '9:16';
    const scenes =
      tweakInstruction && project
        ? project.scenes
        : buildExportScenes({
            jobId,
            prompt,
            targetDuration: targetDuration ?? 'auto',
            voiceoverEnabled,
            sfxEnabled,
            language: scriptLanguage,
            spokenScript: voiceoverEnabled
              ? approvedVoiceoverScript || prompt
              : undefined,
          });

    if (!tweakInstruction && !voiceoverEnabled) {
      applyPromptOnlyPacing(scenes, targetDuration, fps);
    }

    const job: RenderJob = {
      id: jobId,
      createdAt: Date.now(),
      scenes,
      visualStyle: 'stickman',
      aspectRatio,
      fps,
      voiceoverEnabled,
      cleanBrollMode,
      respectSafeZone,
      voiceId:
        typeof body.voiceId === 'string' && body.voiceId.trim()
          ? body.voiceId.trim()
          : project?.voiceId || studioSettings.voiceId,
      modelId:
        typeof body.modelId === 'string' && body.modelId.trim()
          ? body.modelId.trim()
          : project?.voiceModelId || studioSettings.voiceModelId,
      voiceStability: clampNumber(
        body.stability,
        project?.voiceStability ?? studioSettings.voiceStability,
        0,
        1,
      ),
      voiceSimilarityBoost: clampNumber(
        body.similarityBoost,
        project?.voiceSimilarityBoost ?? studioSettings.voiceSimilarityBoost,
        0,
        1,
      ),
      voiceStyle: clampNumber(
        body.style,
        project?.voiceStyle ?? studioSettings.voiceStyle,
        0,
        1,
      ),
      voiceSpeakerBoost:
        typeof body.speakerBoost === 'boolean'
          ? body.speakerBoost
          : (project?.voiceSpeakerBoost ?? studioSettings.voiceSpeakerBoost),
      voiceSpeed: clampNumber(
        body.speed,
        project?.voiceSpeed ?? studioSettings.voiceSpeed,
        0.7,
        1.2,
      ),
      sfxEnabled,
      sfxVolume,
      sfxMode: 'auto',
      backgroundPreset: project?.backgroundPreset || 'ai-free',
      brandKit,
      scriptLanguage,
      scriptDepth: project?.scriptDepth || studioSettings.scriptDepth,
      creativeCodeMode: project?.creativeCodeMode || 'creative',
      scriptPacing: project?.scriptPacing || studioSettings.scriptPacing,
      captionAnimationStyle,
      captionColors,
      captionBottomOffset,
      wordsPerScreen: project?.wordsPerScreen || studioSettings.wordsPerScreen,
      captionsEnabled,
      enable25D,
      elevenlabsKey,
      masterPrompt: prompt || project?.topic || '',
      tweakInstruction: tweakInstruction || undefined,
      targetDuration,
      status: 'queued',
    };

    if (!acquireExportLock(jobId)) {
      res.status(409).json({
        error: 'هناك مهمة تصدير قيد التنفيذ بالفعل. انتظر اكتمالها قبل البدء من جديد.',
      });
      return;
    }

    try {
      resetActiveCompositionMetadata(job);
      syncExportProject(job);
    } catch (error) {
      releaseExportLock(jobId);
      console.error('[export] failed to reset active composition metadata', error);
      res.status(500).json({
        error: 'تعذر تحديث بيانات التركيب النشط قبل بدء التصدير. أعد المحاولة.',
      });
      return;
    }

    renderJobs.set(jobId, job);
    res.json({
      jobId,
      mode: tweakInstruction ? 'tweak' : 'full',
      targetDuration,
      fps,
      aspectRatio,
      totalScenes: scenes.length,
      totalDurationSec: scenes.reduce((total, scene) => total + scene.durationSec, 0),
      outputFile: path.relative(PROJECT_ROOT, path.join(OUT_DIR, `${jobId}.mp4`)),
    });
  });

  app.post('/api/export/cancel', (req: Request, res: Response) => {
    const requestedJobId =
      typeof (req.body || {}).jobId === 'string' ? String((req.body || {}).jobId) : '';
    const activeJobId = activeExportLock?.jobId || '';
    if (!activeJobId || (requestedJobId && requestedJobId !== activeJobId)) {
      res.status(404).json({ error: 'لا توجد عملية تصدير قيد التنفيذ لإيقافها.' });
      return;
    }

    const jobId = cancelActiveExport('تم إيقاف عملية التصدير بواسطة المستخدم.');
    res.json({ ok: true, jobId });
  });

  app.get('/api/export/stream/:jobId', (req: Request, res: Response) => {
    const jobId = String(req.params.jobId || '');
    const job = renderJobs.get(jobId);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    if (!job) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: 'لم يتم العثور على مهمة تصدير.' })}\n\n`);
      res.end();
      return;
    }

    let closed = false;
    req.on('close', () => {
      closed = true;
    });

    const sendEvent = (eventName: string, payload: Record<string, unknown>) => {
      if (closed) return;
      res.write(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`);
    };
    const sendLog = (
      step: ExportStepId,
      level: 'info' | 'success' | 'warn' | 'error',
      message: string,
    ) => sendEvent('log', { step, level, message });
    const sendStep = (
      step: ExportStepId,
      status: 'pending' | 'active' | 'completed' | 'error',
      progress: number,
    ) => sendEvent('step', { step, status, progress });

    const buildTimings = () =>
      job.scenes.map((scene, index) => ({
        index: index + 1,
        id: scene.id,
        durationInFrames: sceneDurationInFrames(scene, job.fps),
        generatedComponent: scene.generatedComponent,
      }));

    const emitComplete = () => {
      const timings = buildTimings();
      sendEvent('complete', {
        jobId: job.id,
        totalFrames: timings.reduce((total, timing) => total + timing.durationInFrames, 0),
        totalDurationSec: job.scenes.reduce((total, scene) => total + scene.durationSec, 0),
        fps: job.fps,
        timings,
        outputFile: job.outputFile || null,
        outputUrl: job.status === 'completed' ? `/api/render/output/${job.id}` : null,
        fileSizeBytes: job.outputSize ?? null,
      });
    };

    if (job.status === 'completed') {
      emitComplete();
      res.end();
      return;
    }
    if (job.status === 'cancelled') {
      sendEvent('cancelled', {
        jobId: job.id,
        message: job.error || 'تم إيقاف عملية التصدير.',
      });
      res.end();
      return;
    }
    if (job.status === 'error') {
      sendEvent('error', { message: job.error || 'فشلت عملية التصدير.' });
      res.end();
      return;
    }
    if (job.status === 'rendering') {
      sendLog('render', 'info', 'مهمة التصدير قيد التنفيذ بالفعل — في انتظار اكتمالها...');
      const poll = setInterval(() => {
        if (job.status === 'completed') {
          clearInterval(poll);
          emitComplete();
          if (!closed) res.end();
        } else if (job.status === 'cancelled') {
          clearInterval(poll);
          sendEvent('cancelled', {
            jobId: job.id,
            message: job.error || 'تم إيقاف عملية التصدير.',
          });
          if (!closed) res.end();
        } else if (job.status === 'error') {
          clearInterval(poll);
          sendEvent('error', { message: job.error || 'فشلت عملية التصدير.' });
          if (!closed) res.end();
        }
      }, 500);
      req.on('close', () => clearInterval(poll));
      return;
    }

    job.status = 'rendering';
    exportStreamEmitters.set(job.id, sendEvent);

    const runPipeline = async () => {
      try {
        throwIfExportCancelled(job.id);
        // Step 1 — Audio & exact timing.
        sendStep('audio', 'active', 5);
        sendLog(
          'audio',
          'info',
          job.tweakInstruction
            ? `التعديل السريع على ${job.scenes.length} مشاهد — الحفاظ على التوقيت والصوت الحاليين.`
            : job.voiceoverEnabled
              ? `تقسيم السكربت الصوتي المعتمد إلى ${job.scenes.length} مشاهد/جمل كاملة — المدة تُحسب من صوت ElevenLabs الفعلي بدون تمديد.`
              : `وضع الإخراج البصري المباشر من البرومبت الرئيسي إلى ${job.scenes.length} مشهداً — المدة المستهدفة: ${
                  job.targetDuration === 'auto'
                    ? 'تلقائية'
                    : `${job.targetDuration}s`
                } (بدون تعليق صوتي).`,
        );
        if (job.tweakInstruction) {
          const missingAudio = job.scenes.some(
            (scene) =>
              job.voiceoverEnabled &&
              !normalizeAudioSrc(scene.audioSrc || scene.audioDataUrl),
          );
          if (missingAudio) {
            sendLog(
              'audio',
              'info',
              'التعديل السريع: بعض المشاهد لا تملك صوتاً محفوظاً — سيتم تجهيز الصوت المفقود فقط.',
            );
            const generated = await prepareSceneAudio(job, (level, message) =>
              sendLog('audio', level, message),
            );
            sendLog(
              'audio',
              'success',
              `تم تجهيز ${generated} مقطع صوتي مفقود مع إعادة استخدام الصوت المخزن للمشاهد الأخرى.`,
            );
          } else {
            sendLog(
              'audio',
              'success',
              job.voiceoverEnabled
                ? 'التعديل السريع: إعادة استخدام التعليق الصوتي الحالي بالكامل دون إعادة توليد.'
                : 'التعديل السريع: وضع الإخراج البصري المباشر — الحفاظ على التوقيت البصري الحالي دون TTS.',
            );
          }
          job.audioPrepared = true;
        } else if (job.voiceoverEnabled) {
          const generated = await prepareSceneAudio(job, (level, message) =>
            sendLog('audio', level, message),
          );
          job.audioPrepared = true;
          sendLog(
            'audio',
            'success',
            `تم تجهيز ${generated} مقطع صوتي عبر ElevenLabs وقياس المدد الفعلية لكل مشهد.`,
          );
          if (job.usage) {
            recordUsage({
              ttsCharacters: job.usage.ttsCharacters,
              ttsCalls: job.usage.ttsCalls,
              ttsUsd: job.usage.ttsUsd,
            });
          }
        } else {
          const totalSeconds =
            job.targetDuration === 'auto' ? 60 : Number(job.targetDuration);
          applyPromptOnlyPacing(job.scenes, job.targetDuration, job.fps);
          job.audioPrepared = true;
          sendLog(
            'audio',
            'success',
            `وضع الإخراج البصري المباشر — بدون TTS، تم ضبط ${job.scenes.length} مشهداً على ${Math.round(
              totalSeconds * job.fps,
            )} إطاراً (${totalSeconds}s @ ${job.fps}fps).`,
          );
        }

        const plannedFrames = job.scenes.reduce(
          (total, scene) => total + sceneDurationInFrames(scene, job.fps),
          0,
        );
        sendLog(
          'audio',
          'success',
          `التوقيت النهائي: ${plannedFrames} إطاراً بمعدل ${job.fps}fps.`,
        );
        syncExportProject(job);
        resetActiveCompositionMetadata(job);
        sendStep('audio', 'completed', 30);
        throwIfExportCancelled(job.id);

        // Step 2 — Real opencode headless scene coding.
        sendStep('code', 'active', 34);
        const generatedSnapshot = job.tweakInstruction
          ? snapshotGeneratedSceneFiles()
          : null;
        if (job.tweakInstruction) {
          sendLog(
            'code',
            'info',
            'التعديل السريع: opencode سيعدل مشاهد src/generated الحالية دون إعادة توليدها.',
          );
        } else {
          sendLog(
            'code',
            'info',
            'تشغيل opencode headless لكتابة مشاهد Remotion مخصصة في src/generated/.',
          );
          const removed = cleanGeneratedTsxCache();
          if (removed.length > 0) {
            sendLog('code', 'info', `تنظيف ${removed.length} مكوّن مولّد سابق.`);
          }
        }
        const openCodePrompt = job.tweakInstruction
          ? buildOpenCodeTweakPrompt(job, job.tweakInstruction)
          : buildOpenCodeScenePrompt(job);
        let codeProgress = 34;
        const codeProgressTimer = setInterval(() => {
          if (isExportCancelled(job.id)) return;
          codeProgress = Math.min(
            68,
            codeProgress + Math.max(1, Math.round((68 - codeProgress) * 0.12)),
          );
          sendStep('code', 'active', codeProgress);
        }, 1500);
        try {
          await runOpenCodeExport(job, openCodePrompt, (level, message) =>
            sendLog('code', level, message),
          );
        } catch (error) {
          clearInterval(codeProgressTimer);
          if (job.tweakInstruction && generatedSnapshot) {
            restoreGeneratedSceneFiles(generatedSnapshot);
          }
          if (isExportCancelled(job.id)) throw error;
          const message =
            error instanceof Error ? error.message : 'فشل تشغيل opencode.';
          sendLog('code', 'error', message);
          throw error;
        } finally {
          clearInterval(codeProgressTimer);
        }
        throwIfExportCancelled(job.id);

        const sanitizedSfxFiles = sanitizeGeneratedSfxFiles();
        if (sanitizedSfxFiles.length > 0) {
          sendLog(
            'code',
            'info',
            `تم تنظيف مؤثرات المشاهد لتبقى ناعمة وواحدة فقط دون أي جرس أو نغمة نهاية (${sanitizedSfxFiles.length} ملف).`,
          );
        }

        if (job.tweakInstruction) {
          const sourceErrors = validateTweakSceneSources(job);
          if (sourceErrors.length > 0) {
            restoreGeneratedSceneFiles(generatedSnapshot!);
            throw new Error(
              `فشل التحقق من ملفات التعديل السريع وتم استرجاع النسخة السابقة: ${sourceErrors.join(' | ')}`,
            );
          }
          const validation = await validateGeneratedScenes();
          if (!validation.ok) {
            restoreGeneratedSceneFiles(generatedSnapshot!);
            throw new Error(
              `فشل التحقق من TypeScript للتعديل السريع وتم استرجاع النسخة السابقة: ${validation.errors}`,
            );
          }
          attachGeneratedComponents(job, true);
        } else {
          repairGeneratedSceneFiles(job);
          let validation = await validateGeneratedScenes();
          if (!validation.ok) {
            console.log(
              `[export] generated scenes failed TypeScript validation:\n${validation.errors}`,
            );
            sendLog(
              'code',
              'warn',
              `مشاهد opencode لم تجتز TypeScript — سيتم إصلاح المشاهد المتأثرة فقط. ${validation.errors}`,
            );
            let repairedNames = repairFailingGeneratedScenes(
              job,
              validation.errors,
            );
            if (
              repairedNames.length === 0 &&
              /src[\\/]generated[\\/]index\.ts/.test(validation.errors)
            ) {
              syncGeneratedRegistry();
              repairedNames = ['index.ts'];
            }
            if (repairedNames.length > 0) {
              validation = await validateGeneratedScenes();
            }
            if (!validation.ok) {
              console.log(
                `[export] generated scenes still failed after targeted repair:\n${validation.errors}`,
              );
              throw new Error(
                `تعذر التحقق من مشاهد Remotion المولّدة بعد إصلاح المشاهد المتأثرة فقط: ${validation.errors}`,
              );
            }
            sendLog(
              'code',
              'warn',
              `تم إصلاح المشاهد المتأثرة فقط (${repairedNames.join(', ')}) بتخطيطات بديلة متنوعة.`,
            );
          }
          attachGeneratedComponents(job);
        }
        syncExportProject(job);
        const videoData = buildParentVideoData(job, job.masterPrompt);
        job.videoData = videoData;
        writeJsonFile(DATA_FILE, videoData);

        let generatedChars = 0;
        for (const scene of job.scenes) {
          if (!scene.generatedComponent) continue;
          try {
            generatedChars += fs.statSync(
              path.join(GENERATED_DIR, `${scene.generatedComponent}.tsx`),
            ).size;
          } catch {
            // ignore
          }
        }
        const inputTokens = Math.max(1, Math.round(openCodePrompt.length / 4));
        const outputTokens = Math.max(1, Math.round(generatedChars / 4));
        recordUsage({
          aiInputTokens: inputTokens,
          aiOutputTokens: outputTokens,
          aiCalls: 1,
          aiUsd: estimateAiUsd(studioSettings.aiModel, inputTokens, outputTokens),
          aiModel: studioSettings.aiModel,
        });
        sendLog(
          'code',
          'success',
          job.tweakInstruction
            ? `تم تطبيق التعديل السريع على ${job.scenes.length} مشهداً مع الحفاظ على الصوت الحالي.`
            : `opencode كتب ${job.scenes.length} مشهداً مخصصاً وأُضيفت إلى سجل src/generated.`,
        );
        sendStep('code', 'completed', 70);
        throwIfExportCancelled(job.id);

        // Step 3 — Render final MP4 and register it.
        sendStep('render', 'active', 74);
        const renderVideoData = buildParentVideoData(job, job.masterPrompt);
        job.videoData = renderVideoData;
        writeJsonFile(DATA_FILE, renderVideoData);
        const renderFrames = job.scenes.reduce(
          (total, scene) => total + sceneDurationInFrames(scene, job.fps),
          0,
        );
        recordUsage({
          renderedFrames: renderFrames,
          renderJobs: 1,
          renderUsd: 0,
        });
        sendLog(
          'render',
          'info',
          `بدء تصيير MainComposition (${job.aspectRatio} @ ${job.fps}fps).`,
        );

        const result = await renderJobWithSceneCache(
          job,
          renderVideoData,
          (progress) => {
            sendStep('render', 'active', Math.min(99, 74 + Math.round(progress * 0.25)));
          },
          (level, message) => sendLog('render', level, message),
          (remainingSec) => sendEvent('time', { remainingSec, updatedAt: Date.now() }),
        );

        job.status = 'completed';
        job.outputPath = result.outputPath;
        job.outputFile = result.outputFile;
        try {
          job.outputSize = fs.statSync(result.outputPath).size;
        } catch {
          job.outputSize = undefined;
        }
        syncExportProject(job);
        sendStep('render', 'completed', 100);
        sendLog('render', 'success', `اكتمل التصدير: ${result.outputFile}`);
        emitComplete();
      } catch (error) {
        if (isExportCancelled(job.id)) {
          job.status = 'cancelled';
          job.error = 'تم إيقاف عملية التصدير بواسطة المستخدم.';
          sendEvent('cancelled', { jobId: job.id, message: job.error });
        } else {
          job.status = 'error';
          job.error = error instanceof Error ? error.message : 'فشلت عملية التصدير.';
          sendEvent('error', { message: job.error });
        }
      } finally {
        exportStreamEmitters.delete(job.id);
        releaseExportLock(job.id);
        if (!closed) res.end();
      }
    };

    void runPipeline();
  });

  app.post('/api/render/start', async (req: Request, res: Response) => {
    const body = (req.body || {}) as {
      topic?: unknown;
      scenes?: unknown;
      visualStyle?: unknown;
      aspectRatio?: unknown;
      fps?: unknown;
      voiceoverEnabled?: unknown;
      cleanBrollMode?: unknown;
      respectSafeZone?: unknown;
      voiceId?: unknown;
      modelId?: unknown;
      stability?: unknown;
      similarityBoost?: unknown;
      style?: unknown;
      speakerBoost?: unknown;
      speed?: unknown;
      sfxEnabled?: unknown;
      sfxVolume?: unknown;
      sfxMode?: unknown;
      backgroundPreset?: unknown;
      brandKit?: unknown;
      scriptLanguage?: unknown;
      language?: unknown;
      scriptDepth?: unknown;
      creativeCodeMode?: unknown;
      scriptPacing?: unknown;
      captionAnimationStyle?: unknown;
      captionStyle?: unknown;
      captionColors?: unknown;
      captionBottomOffset?: unknown;
      wordsPerScreen?: unknown;
      captionsEnabled?: unknown;
    };

    if (!Array.isArray(body.scenes) || body.scenes.length === 0) {
      res.status(400).json({ error: 'يجب وجود مشهد واحد على الأقل للتصيير.' });
      return;
    }
    if (exportLockIsActive()) {
      res.status(409).json({
        error: 'هناك مهمة تصدير قيد التنفيذ بالفعل. انتظر اكتمالها قبل البدء من جديد.',
      });
      return;
    }

    const brandRaw = (body.brandKit && typeof body.brandKit === 'object'
      ? body.brandKit
      : {}) as Record<string, unknown>;
    const brandKit: RenderBrandKit = {
      accentColor: safeColor(brandRaw.accentColor, '#E77B40'),
      bgColor: safeColor(brandRaw.bgColor, '#0B0F17'),
      textColor: safeColor(brandRaw.textColor, DEFAULT_BRAND_KIT.textColor),
      primaryColor: safeColor(brandRaw.primaryColor, DEFAULT_BRAND_KIT.primaryColor),
      secondaryColor: safeColor(brandRaw.secondaryColor, DEFAULT_BRAND_KIT.secondaryColor),
      watermark:
        typeof brandRaw.watermark === 'string' ? brandRaw.watermark.trim().slice(0, 60) : '',
      watermarkEnabled: brandRaw.watermarkEnabled !== false,
      watermarkPosition: normalizeWatermarkPosition(brandRaw.watermarkPosition),
    };

    const { elevenlabsKey } = resolveApiKeys(req);
    const jobId = crypto.randomUUID();
    const fps = Number(body.fps) === 30 ? 30 : 60;
    const requestedSfxVolume = Number(body.sfxVolume);
    const sfxVolume = Number.isFinite(requestedSfxVolume)
      ? Math.min(1, Math.max(0, requestedSfxVolume))
      : DEFAULT_STUDIO_SETTINGS.sfxVolume;
    const requestedBackgroundPreset = normalizeBackgroundPreset(
      body.backgroundPreset,
      normalizeBackgroundPreset(studioSettings.backgroundPreset),
    );
    const topic = cleanSettingString(
      body.topic,
      normalizeScriptDepth(body.scriptDepth, 'analytical') === 'article' ? 20000 : 1200,
    );
    const requestedSfxMode = body.sfxMode === 'manual' ? 'manual' : 'auto';
    const requestVoiceoverEnabled = Boolean(body.voiceoverEnabled);
    const requestSfxEnabled = Boolean(body.sfxEnabled);
    const renderScenes = applySceneVariety(
      normalizeScenes(body.scenes),
      requestedBackgroundPreset,
      topic,
    );
    const curatedScenes =
      requestedSfxMode === 'manual'
        ? renderScenes
        : curateSceneSfx(renderScenes, topic, {
            voiceoverEnabled: requestVoiceoverEnabled,
            sfxEnabled: requestSfxEnabled,
          });
    const renderAspectRatio =
      typeof body.aspectRatio === 'string' ? body.aspectRatio : '9:16';
    const respectSafeZone =
      typeof body.respectSafeZone === 'boolean'
        ? body.respectSafeZone
        : renderAspectRatio === '9:16';
    const job: RenderJob = {
      id: jobId,
      createdAt: Date.now(),
      scenes: curatedScenes,
      visualStyle: normalizeVisualStyleValue(body.visualStyle, studioSettings.visualStyle),
      aspectRatio: renderAspectRatio,
      fps,
      voiceoverEnabled: Boolean(body.voiceoverEnabled),
      cleanBrollMode: body.cleanBrollMode === true,
      respectSafeZone,
      voiceId: typeof body.voiceId === 'string' ? body.voiceId : studioSettings.voiceId,
      modelId: typeof body.modelId === 'string' ? body.modelId : studioSettings.voiceModelId,
      voiceStability: clampNumber(body.stability, studioSettings.voiceStability, 0, 1),
      voiceSimilarityBoost: clampNumber(
        body.similarityBoost,
        studioSettings.voiceSimilarityBoost,
        0,
        1,
      ),
      voiceStyle: clampNumber(body.style, studioSettings.voiceStyle, 0, 1),
      voiceSpeakerBoost:
        typeof body.speakerBoost === 'boolean'
          ? body.speakerBoost
          : studioSettings.voiceSpeakerBoost,
      voiceSpeed: clampNumber(body.speed, studioSettings.voiceSpeed, 0.7, 1.2),
      sfxEnabled: Boolean(body.sfxEnabled),
      sfxVolume,
      sfxMode: requestedSfxMode,
      backgroundPreset: requestedBackgroundPreset,
      brandKit,
      scriptLanguage: normalizeVideoLanguage(
        body.language ?? body.scriptLanguage,
        studioSettings.scriptLanguage,
      ),
      scriptDepth: normalizeScriptDepth(body.scriptDepth, studioSettings.scriptDepth),
      creativeCodeMode: normalizeCreativeCodeMode(
        body.creativeCodeMode,
        studioSettings.creativeCodeMode,
      ),
      scriptPacing: normalizeScriptPacing(body.scriptPacing, studioSettings.scriptPacing),
      captionAnimationStyle: normalizeCaptionAnimationStyle(
        body.captionStyle ?? body.captionAnimationStyle,
        studioSettings.captionAnimationStyle,
      ),
      captionColors: normalizeCaptionColors(
        body.captionColors ?? studioSettings.captionColors,
        brandKit,
      ),
      captionBottomOffset: normalizeCaptionBottomOffset(
        body.captionBottomOffset ?? studioSettings.captionBottomOffset,
      ),
      wordsPerScreen: normalizeWordsPerScreen(
        body.wordsPerScreen,
        studioSettings.wordsPerScreen,
      ),
      captionsEnabled:
        Boolean(body.captionsEnabled) && Boolean(body.voiceoverEnabled),
      enable25D: false,
      elevenlabsKey,
      status: 'queued',
    };

    // Generate the selected ElevenLabs voice for EVERY scene before Remotion starts.
    // Each scene duration is then measured from the produced MP3 with ffprobe.
    const prepLog = (level: 'info' | 'success' | 'warn' | 'error', message: string) => {
      const prefix = level === 'error' ? '[render:error]' : '[render]';
      console.log(`${prefix} ${message}`);
    };
    const generatedAudio = await prepareSceneAudio(job, prepLog);
    job.audioPrepared = true;

    const plannedFrames = job.scenes.reduce(
      (total, scene) => total + sceneDurationInFrames(scene, job.fps),
      0,
    );
    const renderUsage: UsageDelta = {
      ttsCharacters: job.usage?.ttsCharacters || 0,
      ttsCalls: job.usage?.ttsCalls || 0,
      ttsUsd: job.usage?.ttsUsd || 0,
      renderedFrames: plannedFrames,
      renderJobs: 1,
      renderUsd: 0,
    };
    recordUsage(renderUsage);

    const videoData = buildParentVideoData(job);
    job.videoData = videoData;
    writeJsonFile(DATA_FILE, videoData);

    const project = normalizeProjectState({
      topic:
        topic ||
        readProjectState()?.topic ||
        readParentData()?.meta?.topic ||
        '',
      scenes: job.scenes,
      voiceId: job.voiceId,
      voiceModelId: job.modelId,
      voiceStability: job.voiceStability,
      voiceSimilarityBoost: job.voiceSimilarityBoost,
      voiceStyle: job.voiceStyle,
      voiceSpeakerBoost: job.voiceSpeakerBoost,
      voiceSpeed: job.voiceSpeed,
      voiceoverEnabled: job.voiceoverEnabled,
      cleanBrollMode: job.cleanBrollMode,
      visualStyle: job.visualStyle,
      aspectRatio: job.aspectRatio,
      fps: job.fps,
      scriptLanguage: job.scriptLanguage,
      scriptDepth: job.scriptDepth,
      creativeCodeMode: job.creativeCodeMode,
      scriptPacing: job.scriptPacing,
      captionAnimationStyle: job.captionAnimationStyle,
      captionColors: job.captionColors,
      captionBottomOffset: job.captionBottomOffset,
      wordsPerScreen: job.wordsPerScreen,
      captionsEnabled: job.captionsEnabled,
      respectSafeZone: job.respectSafeZone,
      brandKit: job.brandKit,
      sfxEnabled: job.sfxEnabled,
      sfxVolume: job.sfxVolume,
      sfxMode: job.sfxMode,
      backgroundPreset: job.backgroundPreset,
      updatedAt: Date.now(),
    });
    if (project) saveProjectState(project);

    renderJobs.set(jobId, job);
    res.json({
      jobId,
      fps,
      totalScenes: job.scenes.length,
      generatedAudio,
      audioPrepared: true,
      totalDurationSec: job.scenes.reduce((total, scene) => total + scene.durationSec, 0),
      dataFile: path.relative(PROJECT_ROOT, DATA_FILE),
      outputFile: path.relative(PROJECT_ROOT, path.join(OUT_DIR, `${jobId}.mp4`)),
      usage: renderUsage,
      usageSummary: buildUsageResponse(),
    });
  });

  app.get('/api/render/output/:jobId', (req: Request, res: Response) => {
    const jobId = String(req.params.jobId || '');
    const job = renderJobs.get(jobId);
    const outputPath = job?.outputPath || path.join(OUT_DIR, `${jobId}.mp4`);

    if (!fs.existsSync(outputPath)) {
      res.status(404).json({ error: 'ملف التصيير غير موجود بعد.' });
      return;
    }

    res.sendFile(outputPath);
  });

  app.get('/api/render/status/:jobId', (req: Request, res: Response) => {
    const jobId = String(req.params.jobId || '');
    const job = renderJobs.get(jobId);
    if (!job) {
      res.status(404).json({ error: 'لم يتم العثور على مهمة التصيير.' });
      return;
    }
    res.json({
      jobId: job.id,
      status: job.status,
      outputFile: job.outputFile || null,
      outputUrl: job.status === 'completed' ? `/api/render/output/${job.id}` : null,
      error: job.error || null,
    });
  });

  app.get('/api/render/stream/:jobId', (req: Request, res: Response) => {
    const jobId = String(req.params.jobId || '');
    const job = renderJobs.get(jobId);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    if (!job) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: 'لم يتم العثور على مهمة التصيير.' })}\n\n`);
      res.end();
      return;
    }

    let closed = false;
    req.on('close', () => {
      closed = true;
    });

    const sendEvent = (eventName: string, payload: Record<string, unknown>) => {
      if (closed) return;
      res.write(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`);
    };

    const sendLog = (
      step: 'script' | 'voices' | 'sync' | 'render',
      level: 'info' | 'success' | 'warn' | 'error',
      message: string,
    ) => {
      sendEvent('log', { step, level, message });
    };

    const buildTimings = () => {
      let cursorFrame = 0;
      return job.scenes.map((scene, index) => {
        const frames = sceneDurationInFrames(scene, job.fps);
        const startFrame = cursorFrame;
        cursorFrame += frames;
        return { index: index + 1, id: scene.id, startFrame, durationInFrames: frames };
      });
    };
    let timings = buildTimings();
    let totalDurationSec = job.scenes.reduce((acc, s) => acc + s.durationSec, 0);
    let totalFrames = Math.round(totalDurationSec * job.fps);

    const refreshTimings = () => {
      timings = buildTimings();
      totalDurationSec = job.scenes.reduce((acc, s) => acc + s.durationSec, 0);
      totalFrames = timings.reduce((total, timing) => total + timing.durationInFrames, 0);
    };

    const emitComplete = () => {
      refreshTimings();
      sendEvent('complete', {
        jobId: job.id,
        totalFrames,
        totalDurationSec,
        fps: job.fps,
        timings,
        outputFile: job.outputFile || null,
        outputUrl: job.status === 'completed' ? `/api/render/output/${job.id}` : null,
        fileSizeBytes: job.outputSize ?? null,
      });
    };

    if (job.status === 'completed') {
      emitComplete();
      res.end();
      return;
    }

    if (job.status === 'error') {
      sendEvent('error', { message: job.error || 'فشلت عملية التصيير.' });
      res.end();
      return;
    }

    if (job.status === 'rendering') {
      sendLog('render', 'info', 'مهمة التصيير قيد التنفيذ بالفعل — في انتظار اكتمالها...');
      const poll = setInterval(() => {
        if (job.status === 'completed') {
          clearInterval(poll);
          emitComplete();
          if (!closed) res.end();
        } else if (job.status === 'error') {
          clearInterval(poll);
          sendEvent('error', { message: job.error || 'فشلت عملية التصيير.' });
          if (!closed) res.end();
        }
      }, 500);
      req.on('close', () => clearInterval(poll));
      return;
    }

    job.status = 'rendering';

    const runPipeline = async () => {
      sendEvent('step', { step: 'script', status: 'active', progress: 10 });
      sendLog('script', 'info', `تجهيز ${job.scenes.length} مشاهد في src/data.json بنمط ${job.visualStyle}`);
      let videoData = buildParentVideoData(job);
      job.videoData = videoData;
      writeJsonFile(DATA_FILE, videoData);
      sendEvent('step', { step: 'script', status: 'completed', progress: 25 });
      sendLog('script', 'success', 'تمت مزامنة السكربت مع src/data.json في مشروع Remotion.');

      sendEvent('step', { step: 'voices', status: 'active', progress: 35 });
      if (job.voiceoverEnabled) {
        sendLog(
          'voices',
          'info',
          `المسار الصوتي ${job.modelId} جاهز للصوت ${job.voiceId.slice(0, 8)} عبر public/audio.`,
        );
      } else {
        sendLog('voices', 'warn', 'التعليق الصوتي معطّل — سيتم التصيير بدون تعليق صوتي.');
      }
      const audioCount = job.audioPrepared
        ? job.scenes.filter((scene) => Boolean(scene.audioSrc)).length
        : await prepareSceneAudio(job, (level, message) =>
            sendLog('voices', level, message),
          );
      if (job.audioPrepared) {
        sendLog(
          'voices',
          'success',
          `تم تجهيز ${audioCount} ملف صوتي عبر ElevenLabs قبل بدء التصيير مع قياس المدد الفعلية.`,
        );
      }
      videoData = buildParentVideoData(job);
      job.videoData = videoData;
      writeJsonFile(DATA_FILE, videoData);
      refreshTimings();
      sendEvent('step', { step: 'voices', status: 'completed', progress: 50 });
      sendLog(
        'voices',
        'success',
        `تم تجهيز ${audioCount} ملف صوتي في public/audio وربطها بـ src/data.json.`,
      );

      sendEvent('step', { step: 'sync', status: 'active', progress: 60 });
      sendLog(
        'sync',
        'info',
        `الجدول الزمني: ${totalFrames} إطاراً بمعدل ${job.fps}fps (${totalDurationSec.toFixed(1)} ثانية).`,
      );
      sendLog(
        'sync',
        job.sfxEnabled ? 'success' : 'warn',
        job.sfxEnabled
          ? `المؤثرات الصوتية مفعّلة بمستوى ${Math.round(job.sfxVolume * 100)}% باستخدام public/sfx.`
          : 'المؤثرات الصوتية معطّلة لهذا التصيير.',
      );
      sendEvent('step', { step: 'sync', status: 'completed', progress: 75 });
      sendLog('sync', 'success', `اكتملت مزامنة ${timings.length} مشاهد مع MainComposition.`);

      sendEvent('step', { step: 'render', status: 'active', progress: 82 });
      sendLog(
        'render',
        'info',
        `بدء npx remotion render MainComposition (${job.aspectRatio} @ ${job.fps}fps, concurrency=2, nice -n 19)...`,
      );

      try {
        const result = await renderJobWithSceneCache(
          job,
          videoData,
          (progress) => {
            sendEvent('step', {
              step: 'render',
              status: 'active',
              progress: Math.min(99, 82 + Math.round(progress * 0.17)),
            });
          },
          (level, message) => sendLog('render', level, message),
          (remainingSec) =>
            sendEvent('time', {
              remainingSec,
              updatedAt: Date.now(),
            }),
        );

        job.status = 'completed';
        job.outputPath = result.outputPath;
        job.outputFile = result.outputFile;
        try {
          job.outputSize = fs.statSync(result.outputPath).size;
        } catch {
          job.outputSize = undefined;
        }

        sendEvent('step', { step: 'render', status: 'completed', progress: 100 });
        sendLog('render', 'success', `اكتمل تصيير MainComposition إلى ${result.outputFile}.`);
        emitComplete();
      } catch (error) {
        job.status = 'error';
        job.error = error instanceof Error ? error.message : 'فشل تصيير Remotion.';
        sendEvent('step', { step: 'render', status: 'error', progress: 100 });
        sendLog('render', 'error', job.error);
        sendEvent('error', { message: job.error });
      } finally {
        if (!closed) res.end();
      }
    };

    void runPipeline();
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: DASHBOARD_DIR,
      server: { middlewareMode: true, host: HOST, port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(DASHBOARD_DIR, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  dashboardHttpServer = app.listen(PORT, HOST, () => {
    console.log(`Zof Studio server listening on http://${HOST}:${PORT}`);
    console.log(`Remotion project: ${PROJECT_ROOT}`);
  });
}

void startServer();
