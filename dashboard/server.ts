import { execFile, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
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

const DASHBOARD_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(DASHBOARD_DIR, '..');
const DATA_FILE = path.join(PROJECT_ROOT, 'src', 'data.json');
const AUDIO_DIR = path.join(PROJECT_ROOT, 'public', 'audio');
const SFX_DIR = path.join(PROJECT_ROOT, 'public', 'sfx');
const OUT_DIR = path.join(PROJECT_ROOT, 'out');
const REMOTION_ENTRY = path.join(PROJECT_ROOT, 'src', 'index.ts');
const GENERATED_DIR = path.join(PROJECT_ROOT, 'src', 'generated');
const GENERATED_REGISTRY_FILE = path.join(GENERATED_DIR, 'index.ts');
const GENERATED_FILE_PREFIX = 'CustomScene_';
const ZOF_HOME_DIR = path.join(os.homedir(), '.zof-studio');
const SETTINGS_FILE = path.join(ZOF_HOME_DIR, 'settings.json');
const LEGACY_SETTINGS_FILE = path.join(DASHBOARD_DIR, 'data', 'studio-settings.json');
const CURRENT_PROJECT_FILE = path.join(ZOF_HOME_DIR, 'current-project.json');
const STUDIO_LOG_FILE = path.join(ZOF_HOME_DIR, 'remotion-studio.log');
const USAGE_FILE = path.join(ZOF_HOME_DIR, 'usage.json');
const SCENE_CACHE_DIR = path.join(OUT_DIR, 'scene-cache');
const SCENE_CACHE_INDEX_FILE = path.join(SCENE_CACHE_DIR, 'index.json');

dotenv.config({ path: path.join(DASHBOARD_DIR, '.env') });

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
  visualStyle: string;
  aspectRatio: string;
  fps: number;
  scriptLanguage: string;
  scriptDepth: string;
  creativeCodeMode: string;
  scriptPacing: string;
  captionAnimationStyle: string;
  wordsPerScreen: string;
  captionsEnabled: boolean;
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

interface OpenCodeInspection {
  configPaths: string[];
  authPaths: string[];
  configFound: boolean;
  authFound: boolean;
  providers: string[];
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
}

type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface RenderBrandKit {
  accentColor: string;
  bgColor: string;
  watermark: string;
  watermarkEnabled: boolean;
  watermarkPosition: WatermarkPosition;
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
  voiceoverEnabled: boolean;
  visualStyle: string;
  aspectRatio: string;
  fps: number;
  scriptLanguage: string;
  scriptDepth: string;
  creativeCodeMode: string;
  scriptPacing: string;
  captionAnimationStyle: string;
  wordsPerScreen: string;
  captionsEnabled: boolean;
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
  voiceId: string;
  modelId: string;
  voiceStability: number;
  voiceSimilarityBoost: number;
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
  wordsPerScreen: string;
  captionsEnabled: boolean;
  elevenlabsKey: string;
  audioPrepared?: boolean;
  usage?: { ttsCharacters: number; ttsCalls: number; ttsUsd: number };
  status: 'queued' | 'rendering' | 'completed' | 'error';
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
  elements: Array<Record<string, unknown>>;
};

type ParentVideoData = {
  meta: { title: string; topic: string; description: string };
  width: number;
  height: number;
  fps: number;
  style: string;
  script_language: string;
  script_depth?: string;
  creative_code_mode?: string;
  script_pacing?: string;
  caption?: {
    animation_style: string;
    words_per_screen: number | 'auto';
    lead_in: number;
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
}

interface ElevenLabsVoiceItem {
  voice_id: string;
  name: string;
  gender: string;
  language: string;
  accent: string;
  tone: string;
  category: string;
  preview_url: string | null;
  description: string;
  source?: 'personal' | 'library';
}

const PORT = Number(process.env.PORT) || 4789;
const HOST = '127.0.0.1';
const REMOTION_STUDIO_PORT = 9578;
const REMOTION_STUDIO_URL = `http://localhost:${REMOTION_STUDIO_PORT}`;
const IS_PROD = process.env.NODE_ENV === 'production';

const sessionKeyStore = new Map<string, SessionKeys>();
const renderJobs = new Map<string, RenderJob>();

const ALLOWED_LOCAL_ORIGINS = new Set([
  'http://localhost:4789',
  'http://127.0.0.1:4789',
]);

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

const DEEPSEEK_MODELS: AiModelDescriptor[] = [
  {
    id: 'deepseek-chat',
    label: 'DeepSeek Chat',
    provider: 'deepseek',
    providerLabel: 'DeepSeek',
    note: 'Direct DeepSeek V3 chat model for fast script writing.',
    isFree: false,
    upstream: 'deepseek',
  },
  {
    id: 'deepseek-reasoner',
    label: 'DeepSeek Reasoner',
    provider: 'deepseek',
    providerLabel: 'DeepSeek',
    note: 'Direct DeepSeek reasoning model for richer narrative logic.',
    isFree: false,
    upstream: 'deepseek',
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
  ...DEEPSEEK_MODELS,
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
      ? DEEPSEEK_MODELS
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
  },
  {
    model_id: 'eleven_turbo_v2_5',
    name: 'Eleven Turbo v2.5',
    description: 'توازن مثالي بين سرعة التوليد ووضوح المخارج الصوتية.',
    latencyBadge: 'استجابة سريعة · ~250ms',
    qualityBadge: 'متوازن',
  },
  {
    model_id: 'eleven_flash_v2_5',
    name: 'Eleven Flash v2.5',
    description: 'أسرع نموذج للتوليد الفوري ومعاينة المشاهد المتعددة.',
    latencyBadge: 'زمن فائق الانخفاض · ~75ms',
    qualityBadge: 'سرعة قصوى',
  },
];

const DEFAULT_ELEVENLABS_VOICES: ElevenLabsVoiceItem[] = [
  {
    voice_id: 'pNInz6obpgDQGcFmaJgB',
    name: 'آدم — Adam',
    gender: 'ذكر',
    language: 'Arabic',
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
    gender: 'أنثى',
    language: 'English',
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
    gender: 'ذكر',
    language: 'English',
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
    gender: 'أنثى',
    language: 'English',
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
  'word-pop-glow',
  'dynamic-karaoke',
  'smooth-chunk-slide',
  'kinetic-typewriter',
] as const;
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
    case 'word-pop-glow':
      return 'word_pop_glow';
    case 'dynamic-karaoke':
      return 'dynamic_karaoke';
    case 'smooth-chunk-slide':
      return 'smooth_chunk_slide';
    case 'kinetic-typewriter':
      return 'kinetic_typewriter';
    default:
      return 'auto';
  }
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
  visualStyle: 'stickman',
  aspectRatio: '9:16',
  fps: 60,
  scriptLanguage: 'ar',
  scriptDepth: 'analytical',
  creativeCodeMode: 'creative',
  scriptPacing: 'fast',
  captionAnimationStyle: 'auto',
  wordsPerScreen: 'auto',
  captionsEnabled: true,
  brandKit: DEFAULT_BRAND_KIT,
  sfxEnabled: true,
  sfxVolume: 0.65,
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
    watermark:
      typeof record.watermark === 'string'
        ? record.watermark.trim().slice(0, 60)
        : DEFAULT_BRAND_KIT.watermark,
    watermarkEnabled: record.watermarkEnabled !== false,
    watermarkPosition: normalizeWatermarkPosition(record.watermarkPosition),
  };
}

function normalizeStudioSettings(raw: unknown): StudioSettings {
  const record = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const providerRaw = cleanSettingString(record.aiProvider, 32) as AiProviderId;
  const modelId = cleanSettingString(record.aiModel, 160);
  const visualStyle = cleanSettingString(record.visualStyle, 32);
  const aspectRatio = cleanSettingString(record.aspectRatio, 16);
  const scriptLanguage = cleanSettingString(record.scriptLanguage, 8);
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
    visualStyle: normalizeVisualStyleValue(visualStyle, DEFAULT_STUDIO_SETTINGS.visualStyle),
    aspectRatio:
      aspectRatio === '16:9' || aspectRatio === '1:1' || aspectRatio === '9:16'
        ? aspectRatio
        : DEFAULT_STUDIO_SETTINGS.aspectRatio,
    fps: Number(record.fps) === 30 ? 30 : DEFAULT_STUDIO_SETTINGS.fps,
    scriptLanguage: scriptLanguage === 'en' ? 'en' : DEFAULT_STUDIO_SETTINGS.scriptLanguage,
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
    wordsPerScreen: normalizeWordsPerScreen(
      record.wordsPerScreen,
      DEFAULT_STUDIO_SETTINGS.wordsPerScreen,
    ),
    captionsEnabled: record.captionsEnabled !== false,
    brandKit: normalizeBrandKit(record.brandKit),
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

  const legacyRaw = readJsonFileSafe(LEGACY_SETTINGS_FILE);
  if (legacyRaw) {
    const migrated = normalizeStudioSettings(legacyRaw);
    try {
      saveStudioSettings(migrated);
    } catch {
      // Migration is best-effort; runtime still uses the migrated values.
    }
    return migrated;
  }

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
    voiceoverEnabled: record.voiceoverEnabled !== false,
    visualStyle: normalizeVisualStyleValue(
      record.visualStyle,
      DEFAULT_STUDIO_SETTINGS.visualStyle,
    ),
    aspectRatio: cleanSettingString(record.aspectRatio, 16) || DEFAULT_STUDIO_SETTINGS.aspectRatio,
    fps: Number(record.fps) === 30 ? 30 : 60,
    scriptLanguage: record.scriptLanguage === 'en' ? 'en' : 'ar',
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
    wordsPerScreen: normalizeWordsPerScreen(
      record.wordsPerScreen,
      DEFAULT_STUDIO_SETTINGS.wordsPerScreen,
    ),
    captionsEnabled: record.captionsEnabled !== false,
    brandKit: normalizeBrandKit(record.brandKit),
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
  studioSettings.visualStyle = project.visualStyle;
  studioSettings.aspectRatio = project.aspectRatio;
  studioSettings.fps = project.fps;
  studioSettings.scriptLanguage = project.scriptLanguage;
  studioSettings.scriptDepth = project.scriptDepth;
  studioSettings.creativeCodeMode = project.creativeCodeMode;
  studioSettings.scriptPacing = project.scriptPacing;
  studioSettings.captionAnimationStyle = project.captionAnimationStyle;
  studioSettings.wordsPerScreen = project.wordsPerScreen;
  studioSettings.captionsEnabled = project.captionsEnabled;
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
  const keys: Record<string, string> = {};
  let configFound = false;
  let authFound = false;

  for (const configPath of OPENCODE_CONFIG_PATHS) {
    const parsed = readJsonFileSafe(configPath);
    if (!parsed || typeof parsed !== 'object') continue;
    configFound = true;
    const record = parsed as Record<string, unknown>;
    for (const field of ['provider', 'providers']) {
      const value = record[field];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.keys(value as Record<string, unknown>).forEach((id) => {
          if (/^[a-zA-Z0-9._-]{2,64}$/.test(id)) providers.add(id);
        });
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
    keys,
  };
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
      visualStyle: studioSettings.visualStyle,
      aspectRatio: studioSettings.aspectRatio,
      fps: studioSettings.fps,
      scriptLanguage: studioSettings.scriptLanguage,
      scriptDepth: studioSettings.scriptDepth,
      creativeCodeMode: studioSettings.creativeCodeMode,
      scriptPacing: studioSettings.scriptPacing,
      captionAnimationStyle: studioSettings.captionAnimationStyle,
      wordsPerScreen: studioSettings.wordsPerScreen,
      captionsEnabled: studioSettings.captionsEnabled,
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
  'whoosh-fast',
  'whoosh-deep',
  'pop-bubble',
  'pop-sharp',
  'ding-success',
  'alert-warning',
  'cash-register',
  'typing-click',
  'notification-chime',
  'cinematic-hit',
  'bass-drop',
  'riser-build',
]);

const SFX_AUTO_MATCH: Record<string, string> = {
  'title-hero': 'cinematic-hit',
  'stat-number': 'ding-success',
  'comparison-box': 'whoosh-fast',
  'bar-chart': 'pop-sharp',
  'line-chart': 'riser-build',
  'circular-gauge': 'bass-drop',
  'step-timeline': 'typing-click',
  'notification-card': 'notification-chime',
  'warning-card': 'alert-warning',
  'editorial-quote': 'whoosh-deep',
  'bullet-list': 'pop-bubble',
  cta: 'cash-register',
  custom: 'pop-bubble',
  'generative-scene': 'whoosh-deep',
};

function resolveSceneSfxSrc(
  selection: string | undefined,
  visualType: string
): string | undefined {
  const autoMatch = SFX_AUTO_MATCH[normalizeVisualType(visualType)] || 'pop-bubble';
  const chosen = selection === 'auto' ? autoMatch : (selection || 'none').trim();

  if (chosen === 'none' || !chosen) return undefined;
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
        sfxId: 'cinematic-hit',
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
        sfxId: 'ding-success',
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
      sfxId: 'cinematic-hit',
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
      sfxId: 'ding-success',
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
  'line-chart': 'riser-build',
  'bar-chart': 'whoosh-fast',
  'circular-gauge': 'bass-drop',
  'stat-number': 'whoosh-deep',
  'warning-card': 'alert-warning',
  'comparison-box': 'whoosh-fast',
  cta: 'cash-register',
};

const SILENT_SFX_BY_TYPE: Record<string, string[]> = {
  'title-hero': ['cinematic-hit', 'whoosh-deep', 'riser-build'],
  'stat-number': ['ding-success', 'pop-sharp', 'bass-drop'],
  'comparison-box': ['whoosh-fast', 'whoosh-deep', 'pop-sharp'],
  'bar-chart': ['pop-sharp', 'typing-click', 'whoosh-fast'],
  'line-chart': ['riser-build', 'whoosh-deep', 'bass-drop'],
  'circular-gauge': ['bass-drop', 'riser-build', 'ding-success'],
  'step-timeline': ['typing-click', 'pop-sharp', 'whoosh-fast'],
  'notification-card': ['notification-chime', 'ding-success', 'pop-bubble'],
  'warning-card': ['alert-warning', 'cinematic-hit', 'bass-drop'],
  'editorial-quote': ['whoosh-deep', 'riser-build', 'notification-chime'],
  'bullet-list': ['pop-bubble', 'pop-sharp', 'typing-click'],
  cta: ['cash-register', 'ding-success', 'notification-chime'],
  custom: ['pop-bubble', 'pop-sharp', 'whoosh-fast'],
  'custom-tsx': ['whoosh-deep', 'pop-sharp', 'riser-build'],
  'generative-scene': ['whoosh-deep', 'riser-build', 'pop-sharp'],
};

const SILENT_SFX_CALM = ['whoosh-deep', 'riser-build', 'notification-chime'];

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
  if (silentVisualMode) {
    const minTarget = Math.min(
      scenes.length,
      Math.ceil(scenes.length * 0.85),
    );
    const target = Math.min(
      scenes.length,
      Math.max(minTarget, Math.round(scenes.length * 0.92)),
    );
    evaluations
      .slice()
      .sort(
        (a, b) =>
          Number(b.explicit) - Number(a.explicit) ||
          b.score - a.score ||
          a.index - b.index,
      )
      .slice(0, target)
      .forEach((entry) => chosen.add(entry.index));
  } else {
    const maxSfx = Math.max(0, Math.floor(scenes.length * 0.35));
    if (!topicNight) {
      evaluations
        .filter(
          (entry) =>
            !entry.night && !entry.calm && entry.pivotal && entry.score > 0,
        )
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .slice(0, maxSfx)
        .forEach((entry) => chosen.add(entry.index));
    }
  }

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
      previousSound && SFX_CATALOG_IDS.has(previousSound) ? previousSound : '';

    if (silentVisualMode) {
      const palette =
        entry.night || entry.calm
          ? SILENT_SFX_CALM
          : SILENT_SFX_BY_TYPE[entry.type] || [
              'pop-bubble',
              'pop-sharp',
              'whoosh-fast',
            ];
      const sound =
        explicitSound || palette[index % palette.length] || 'pop-bubble';
      return {
        ...scene,
        sfxId: sound,
        sfxAt: Number.isFinite(Number(scene.sfxAt))
          ? Math.min(2, Math.max(0, Number(scene.sfxAt)))
          : Math.min(0.45, Number((0.15 + (index % 4) * 0.07).toFixed(2))),
      };
    }

    const brightSound =
      previousSound === 'ding-success' ||
      previousSound === 'pop-bubble' ||
      previousSound === 'pop-sharp';
    const sound =
      entry.night || entry.calm || brightSound
        ? SFX_BY_TYPE[entry.type] || 'whoosh-deep'
        : explicitSound || SFX_BY_TYPE[entry.type] || 'whoosh-fast';
    return {
      ...scene,
      sfxId: sound,
      sfxAt: Number.isFinite(Number(scene.sfxAt))
        ? Math.min(2, Math.max(0, Number(scene.sfxAt)))
        : 0.2,
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
  },
): string {
  return contentHash({
    narration: scene.narration,
    voiceId: voice.voiceId,
    modelId: voice.modelId,
    stability: voice.stability,
    similarityBoost: voice.similarityBoost,
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
    wordsPerScreen: job.wordsPerScreen,
    captionsEnabled: job.captionsEnabled,
    voiceoverEnabled: job.voiceoverEnabled,
    sfxEnabled: job.sfxEnabled,
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
    const audioDataUrl = typeof record.audioDataUrl === 'string' ? record.audioDataUrl : undefined;
    const audioSrc = typeof record.audioSrc === 'string' ? record.audioSrc : undefined;
    const audioDurationRaw = Number(record.audioDuration);
    const sfxId =
      typeof record.sfxId === 'string' && record.sfxId.trim()
        ? record.sfxId.trim().slice(0, 300)
        : 'none';
    const sfxPrompt =
      typeof record.sfxPrompt === 'string' && record.sfxPrompt.trim()
        ? record.sfxPrompt.trim().slice(0, 450)
        : undefined;
    const sfxAtRaw = Number(record.sfxAt);
    const sfxCues = normalizeSfxCues(record.sfxCues);
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
      durationSec: Number.isFinite(durationRaw) && durationRaw >= 2 && durationRaw <= 30 ? Number(durationRaw.toFixed(1)) : 4,
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

let remotionStudioProcess: import('node:child_process').ChildProcess | null = null;

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

async function ensureRemotionStudio(): Promise<{
  running: boolean;
  started: boolean;
  url: string;
  port: number;
}> {
  const url = REMOTION_STUDIO_URL;
  const port = REMOTION_STUDIO_PORT;
  if (await checkPortOpen(port)) {
    return { running: true, started: false, url, port };
  }

  fs.mkdirSync(ZOF_HOME_DIR, { recursive: true });
  const logStream = fs.createWriteStream(STUDIO_LOG_FILE, { flags: 'a' });
  try {
    if (!remotionStudioProcess || remotionStudioProcess.killed) {
      remotionStudioProcess = spawn(
        'npx',
        [
          'remotion',
          'studio',
          path.relative(PROJECT_ROOT, REMOTION_ENTRY),
          '--port',
          String(port),
          '--host',
          '127.0.0.1',
        ],
        {
          cwd: PROJECT_ROOT,
          env: { ...process.env },
          detached: true,
          stdio: ['ignore', logStream, logStream],
        },
      );
      remotionStudioProcess.unref();
    }
  } catch {
    return { running: false, started: false, url, port };
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (await checkPortOpen(port)) {
      return { running: true, started: true, url, port };
    }
  }
  return { running: false, started: true, url, port };
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

  return {
    topic: data.meta?.topic || '',
    scenes,
    aiProvider: studioSettings.aiProvider,
    aiModel: studioSettings.aiModel,
    voiceId: studioSettings.voiceId,
    voiceModelId: studioSettings.voiceModelId,
    voiceStability: studioSettings.voiceStability,
    voiceSimilarityBoost: studioSettings.voiceSimilarityBoost,
    voiceoverEnabled: true,
    visualStyle: style,
    aspectRatio,
    fps: Number(data.fps) === 30 ? 30 : 60,
    scriptLanguage: data.script_language === 'en' ? 'en' : 'ar',
    scriptDepth: normalizeScriptDepth(data.script_depth, 'analytical'),
    creativeCodeMode: normalizeCreativeCodeMode(data.creative_code_mode, 'creative'),
    scriptPacing: normalizeScriptPacing(data.script_pacing, 'fast'),
    captionAnimationStyle: normalizeCaptionAnimationStyle(
      data.caption?.animation_style?.replace(/_/g, '-'),
      'auto',
    ),
    wordsPerScreen: normalizeWordsPerScreen(
      data.caption?.words_per_screen !== undefined
        ? String(data.caption.words_per_screen)
        : 'auto',
      'auto',
    ),
    captionsEnabled: data.caption?.enabled !== false,
    brandKit: {
      accentColor: colorSetting(brand.primary, DEFAULT_BRAND_KIT.accentColor),
      bgColor: colorSetting(brand.background, DEFAULT_BRAND_KIT.bgColor),
      watermark:
        typeof brand.watermark === 'string' ? brand.watermark.slice(0, 60) : DEFAULT_BRAND_KIT.watermark,
      watermarkEnabled: brand.watermark_enabled !== false,
      watermarkPosition: normalizeWatermarkPosition(brand.watermark_position),
    },
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
    voiceId: project.voiceId,
    modelId: project.voiceModelId,
    voiceStability: project.voiceStability,
    voiceSimilarityBoost: project.voiceSimilarityBoost,
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
    wordsPerScreen: project.wordsPerScreen,
    captionsEnabled: project.captionsEnabled,
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
      ? true
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

  const sfxCues = sfxEnabled
    ? scene.sfxCues && scene.sfxCues.length > 0
      ? scene.sfxCues
      : buildStaggeredSfxCues({
          fps,
          durationSec: scene.durationSec,
          elements,
          mode: voiceoverEnabled ? 'voiceover' : 'silent',
        })
    : [];

  return {
    id: scene.id,
    kicker: label,
    title: scene.title,
    subtitle: label,
    caption: scene.narration,
    duration: scene.durationSec,
    audioSrc:
      scene.audioSrc ||
      (scene.audioDataUrl?.startsWith('/audio/') ? scene.audioDataUrl.slice(1) : undefined),
    audioDuration: scene.audioDuration,
    sfxSrc: resolveSceneSfxSrc(scene.sfxId, scene.visualType),
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

  return {
    meta: {
      title: firstTitle.slice(0, 80),
      topic: topicOverride?.trim() || existing?.meta?.topic || 'zof-studio',
      description: job.scenes.map((scene) => scene.title).join(' · ').slice(0, 240),
    },
    width,
    height,
    fps: job.fps,
    style: mapVisualStyle(job.visualStyle),
    script_language: job.scriptLanguage,
    script_depth: job.scriptDepth,
    creative_code_mode: job.creativeCodeMode,
    script_pacing: job.scriptPacing,
    caption: {
      animation_style: parentCaptionStyle(job.captionAnimationStyle),
      words_per_screen: parentWordsPerScreen(job.wordsPerScreen),
      lead_in: 0.2,
      enabled: job.captionsEnabled && job.voiceoverEnabled,
    },
    brand_kit: {
      name: 'ZOF',
      primary: accent,
      secondary:
        typeof existingKit?.secondary === 'string' ? existingKit.secondary : '#FBBF24',
      accent,
      success:
        typeof existingKit?.success === 'string' ? existingKit.success : '#16A34A',
      danger:
        typeof existingKit?.danger === 'string' ? existingKit.danger : '#DC2626',
      background,
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
      return { ...parentScene, audioSrc: undefined, audioDuration: undefined };
    }),
  };
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
    });

    let lastProgress = 0;
    let stderrBuffer = '';

    const handleLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const fraction = trimmed.match(/(\d+)\s*\/\s*(\d+)/);
      if (fraction) {
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

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (stderrBuffer.trim()) handleLine(stderrBuffer);
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
    fs.mkdirSync(SCENE_CACHE_DIR, { recursive: true });
    const cache = loadSceneArtifactCache();
    const timings: Array<{ startFrame: number; frames: number }> = [];
    let cursor = 0;
    for (const scene of job.scenes) {
      const frames = Math.max(1, Math.round(scene.durationSec * job.fps));
      timings.push({ startFrame: cursor, frames });
      cursor += frames;
    }
    const totalFrames = Math.max(1, cursor);
    const segmentFiles: string[] = [];
    let completedFrames = 0;
    const startedAt = Date.now();
    let cacheChanged = false;

    for (let index = 0; index < job.scenes.length; index += 1) {
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
): Promise<number | null> {
  let duration = explicitDuration;
  if ((!duration || duration <= 0) && scene.audioSrc) {
    duration = await probeAudioDuration(audioFilePath(scene.audioSrc));
  }
  if (!duration || duration <= 0) return null;
  scene.audioDuration = Number(duration.toFixed(3));
  scene.durationSec = Math.ceil((duration + 0.35) * 10) / 10;
  onLog(
    'info',
    `المشهد ${sceneNumber}: مدة الصوت الفعلية ${duration.toFixed(2)}s → مدة المشهد ${scene.durationSec.toFixed(1)}s (هامش 0.35s).`,
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
    const applied = await applyMeasuredAudioDuration(scene, measured, onLog, index + 1);
    if (!applied) {
      const estimate = estimateNarrationDuration(scene.narration);
      scene.audioDuration = estimate;
      scene.durationSec = Math.ceil((estimate + 0.35) * 10) / 10;
      onLog(
        'warn',
        `المشهد ${index + 1}: تعذر قياس الصوت — تم تقدير ${scene.durationSec.toFixed(1)}s من النص.`,
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
  const cleaned = raw.trim();
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
  verified_languages?: Array<string | { language?: string; accent?: string }>;
};

function mapElevenLabsVoice(
  raw: RawElevenLabsVoice,
  source: 'personal' | 'library'
): ElevenLabsVoiceItem {
  const labels = raw.labels || {};
  const verifiedLanguages = Array.isArray(raw.verified_languages)
    ? raw.verified_languages
        .map((item) => (typeof item === 'string' ? item : item.language || ''))
        .filter(Boolean)
    : [];
  const genderRaw = (labels.gender || '').trim();
  const gender = genderRaw
    ? genderRaw.charAt(0).toUpperCase() + genderRaw.slice(1).toLowerCase()
    : 'Voice';
  const language = normalizeLanguageLabel(labels.language || verifiedLanguages[0] || '');
  const accentRaw = labels.accent || labels.locale || '';
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
]);

function isAllowedGeneratedImport(source: string): boolean {
  return (
    GENERATED_ALLOWED_IMPORTS.has(source) ||
    source.startsWith('@remotion/')
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
        name.startsWith(GENERATED_FILE_PREFIX) &&
        name.endsWith('.tsx') &&
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
    if (!entry.name.startsWith(GENERATED_FILE_PREFIX) || !entry.name.endsWith('.tsx')) {
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

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      { cwd, timeout: timeoutMs, maxBuffer: 20 * 1024 * 1024 },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          output: `${stdout || ''}\n${stderr || ''}`,
        });
      },
    );
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
  return `import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Circle, Star } from "@remotion/shapes";
import { evolvePath } from "@remotion/paths";
import { noise2D } from "@remotion/noise";
import { Stickman } from "../components/Stickman";

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
  const time = frame / fps;
  const entrance = spring({ frame, fps, config: { damping: 18, mass: 0.6, stiffness: 120 } });
  const progress = interpolate(frame, [0, Math.max(1, props.durationInFrames - 1)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pulse = 0.5 + 0.5 * Math.sin(time * Math.PI * 2 * 1.2);
  const drift = noise2D("zof-custom", time * 0.3, 0);
  const trail = "M 80 260 C 220 120, 420 360, 760 180";
  const trailDash = evolvePath(progress, trail);
  const keywords = props.keywords && props.keywords.length > 0 ? props.keywords.slice(0, 4) : [props.title || "Idea", "Mechanism", "Action"];
  const rtl = props.isRtl ? "rtl" : "ltr";
  const align = props.isRtl ? "right" : "left";
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 20%, " + props.accentColor + "22 0%, transparent 55%), " + props.bgColor, direction: rtl, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.9 }}>
        <svg viewBox="0 0 900 500" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <path d={trail} fill="none" stroke={props.accentColor} strokeWidth={3} strokeLinecap="round" strokeDasharray={trailDash.strokeDasharray} strokeDashoffset={trailDash.strokeDashoffset} />
        </svg>
        {keywords.map((word, index) => {
          const x = 12 + index * (76 / Math.max(1, keywords.length - 1));
          const y = 34 + Math.sin(index * 1.7 + time * 1.4) * 10 + drift * 3;
          const nodeScale = interpolate(progress, [index / Math.max(1, keywords.length), Math.min(1, (index + 1) / Math.max(1, keywords.length))], [0.3, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={"node-" + index} style={{ position: "absolute", left: x + "%", top: y + "%", transform: "translate(-50%, -50%) scale(" + nodeScale + ")", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Circle radius={18 + pulse * 4} fill={index % 2 === 0 ? props.accentColor : props.characterAccent} style={{ opacity: 0.85 }} />
              <div style={{ position: "absolute" }}>
                <Star points={5} innerRadius={5} outerRadius={9} fill={props.textColor} style={{ opacity: 0.9 }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: "8%", right: "8%", top: "10%", bottom: "24%", display: "flex", flexDirection: "column", justifyContent: "space-between", opacity: entrance }}>
        <div>
          <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.1, color: props.textColor, textAlign: align }}>{props.title || "Custom scene"}</div>
          <div style={{ marginTop: 12, fontSize: 34, fontWeight: 600, color: props.mutedColor, textAlign: align, maxWidth: "70%" }}>{props.text || ""}</div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: props.isRtl ? "flex-end" : "flex-start" }}>
          {keywords.map((word, index) => (
            <div key={"chip-" + index} style={{ padding: "10px 18px", borderRadius: 999, border: "1px solid " + props.accentColor, background: props.bgColor + "cc", color: props.textColor, fontSize: 30, fontWeight: 700, transform: "translateY(" + Math.sin(time * 1.6 + index) * 4 + "px)" }}>{word}</div>
          ))}
        </div>
        {props.showCharacter ? (
          <div style={{ position: "absolute", right: props.isRtl ? undefined : "0%", left: props.isRtl ? "0%" : undefined, bottom: "16%", width: 210, height: 300 }}>
            <Stickman pose="explaining" color={props.characterBody} faceColor={props.characterFace} accent={props.characterAccent} shadow={props.characterShadow} />
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
`;
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
  const systemPrompt = [
    'You are a senior Remotion + React engineer writing a single self-contained TSX scene component.',
    'Return ONLY the complete TSX module. No markdown fences, no commentary.',
    'Only import from: "react", "remotion", packages starting with "@remotion/", and "../components/Stickman".',
    'Never use fs, path, child_process, os, net, http, https, process, eval, new Function, fetch, XMLHttpRequest, WebSocket, require(), dynamic import(), or any network/file access.',
    'The file must export exactly one named component: ' + componentName + '.',
    'Use this exact Props shape:',
    'type Props = { accentColor: string; bgColor: string; textColor: string; mutedColor: string; characterBody: string; characterFace: string; characterAccent: string; characterShadow: string; isRtl: boolean; language: string; title?: string; text?: string; keywords?: string[]; data?: Record<string, unknown>; durationInFrames: number; showCharacter?: boolean; };',
    'Animate continuously across the entire durationInFrames with useCurrentFrame(), useVideoConfig(), spring(), and interpolate(). Never leave a static frame.',
    'Use SVG, @remotion/shapes, @remotion/paths, and @remotion/noise when useful. Use the faceless Stickman component only when showCharacter is true.',
    'Strictly apply accentColor and bgColor. Respect isRtl for text direction and composition.',
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
    `Language: ${scriptLanguage}`,
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
    [mapOpenRouterModel(model), ...FREE_FALLBACK_MODELS]
      .filter((item, index, list) => list.indexOf(item) === index)
      .slice(0, 3)
      .forEach(pushOpenRouter);
    pushDeepSeek(model);
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

async function startServer() {
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
  app.use(express.json({ limit: '2mb' }));

  app.use((req: Request, res: Response, next: NextFunction) => {
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

  app.use('/audio', express.static(AUDIO_DIR, { fallthrough: false }));
  app.use('/sfx', express.static(SFX_DIR, { fallthrough: false }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
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

    if (provider !== 'opencode-free') {
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
          ? 'قائمة OpenCode المجانية المنسّقة.'
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
        port: REMOTION_STUDIO_PORT,
        error:
          'تعذر تشغيل Remotion Studio على المنفذ 9578 خلال 15 ثانية. تحقق من السجلات.',
        dataFile: path.relative(PROJECT_ROOT, DATA_FILE),
        projectFile: CURRENT_PROJECT_FILE,
      });
      return;
    }
    res.json({
      ok: true,
      ...studio,
      port: REMOTION_STUDIO_PORT,
      dataFile: path.relative(PROJECT_ROOT, DATA_FILE),
      projectFile: CURRENT_PROJECT_FILE,
    });
  };

  app.post('/api/open-remotion-studio', handleOpenRemotionStudio);
  app.post('/api/studio/open', handleOpenRemotionStudio);

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
      visualStyle?: unknown;
      aspectRatio?: unknown;
      fps?: unknown;
      scriptLanguage?: unknown;
      scriptDepth?: unknown;
      creativeCodeMode?: unknown;
      scriptPacing?: unknown;
      captionAnimationStyle?: unknown;
      wordsPerScreen?: unknown;
      captionsEnabled?: unknown;
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
    if (body.scriptLanguage === 'ar' || body.scriptLanguage === 'en') {
      studioSettings.scriptLanguage = body.scriptLanguage;
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
    if (body.captionAnimationStyle !== undefined) {
      studioSettings.captionAnimationStyle = normalizeCaptionAnimationStyle(
        body.captionAnimationStyle,
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
    if (body.brandKit && typeof body.brandKit === 'object') {
      studioSettings.brandKit = normalizeBrandKit(body.brandKit);
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
      const data = (await response.json()) as Array<{
        model_id?: string;
        name?: string;
        description?: string;
        can_do_text_to_speech?: boolean;
        languages?: Array<unknown>;
      }>;

      const ttsModels = data
        .filter((m) => m.can_do_text_to_speech !== false && m.model_id)
        .map((m) => {
          const id = m.model_id || '';
          let latencyBadge = 'استجابة قياسية';
          let qualityBadge = `${m.languages?.length || 29} لغة`;
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
          return {
            model_id: id,
            name: m.name || id,
            description: m.description || 'نموذج توليد صوتي من ElevenLabs',
            latencyBadge,
            qualityBadge,
          };
        });

      res.json({
        source: 'live',
        models: ttsModels.length > 0 ? ttsModels : DEFAULT_ELEVENLABS_MODELS,
      });
    } catch {
      res.json({ source: 'catalog', models: DEFAULT_ELEVENLABS_MODELS });
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
      voiceoverEnabled?: unknown;
    };

    const text = typeof body.text === 'string' ? body.text.trim().slice(0, 1500) : '';
    const voiceId = typeof body.voiceId === 'string' && /^[a-zA-Z0-9_-]{4,64}$/.test(body.voiceId) ? body.voiceId : 'pNInz6obpgDQGcFmaJgB';
    const modelId = typeof body.modelId === 'string' && body.modelId.trim() ? body.modelId.trim().slice(0, 64) : 'eleven_multilingual_v2';
    const stability = Math.min(1, Math.max(0, Number(body.stability ?? 0.5)));
    const similarityBoost = Math.min(1, Math.max(0, Number(body.similarityBoost ?? 0.75)));

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

  const handleGenerateScript = async (req: Request, res: Response) => {
    const body = (req.body || {}) as {
      topic?: unknown;
      provider?: unknown;
      modelId?: unknown;
      visualStyle?: unknown;
      aspectRatio?: unknown;
      scriptLanguage?: unknown;
      scriptDepth?: unknown;
      creativeCodeMode?: unknown;
      scriptPacing?: unknown;
      backgroundPreset?: unknown;
      brandKit?: unknown;
      voiceoverEnabled?: unknown;
      captionsEnabled?: unknown;
      sfxEnabled?: unknown;
      sfxVolume?: unknown;
    };

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
    const scriptLanguage = body.scriptLanguage === 'en' ? 'en' : 'ar';
    const outputLanguage = scriptLanguage === 'en' ? 'English' : 'Arabic';
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
          ? 'The selected style is Stickman, so every scene uses the faceless character; still vary pose and composition.'
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
      '- "sfxId": default to "none". Attach SFX only to genuinely pivotal transitions or chart reveals, never more than 35% of scenes. Use "none" for calm, night, reflective, or emotional beats. Never use bright "ding-success" or cartoonish "pop-*" sounds on dark/night or emotional scenes; prefer "whoosh-deep", "riser-build", or "bass-drop" for cinematic/chart reveals.',
      '- "sfxAt": trigger offset in seconds (0 to 2) when sfxId is not "none"',
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
      const freeModels = [primaryModel, ...FREE_FALLBACK_MODELS]
        .filter((model, index, list) => list.indexOf(model) === index)
        .slice(0, 3);
      freeModels.forEach(pushOpenRouter);
      pushDeepSeek(requestedModel);
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
      buildFallbackScenes(topic, scriptLanguage, scriptDepth),
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
        scriptLanguage === 'en'
          ? `No AI provider was reachable for "${topic}". Generated a topic-tailored local draft; add or verify an API key in settings for live model output.`
          : `تعذر الوصول إلى مزودي الذكاء الاصطناعي لموضوع "${topic}". تم توليد مسودة محلية مخصصة للموضوع؛ تحقق من مفاتيح API في الإعدادات للحصول على توليد حي.`,
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
    const language = body.language === 'en' ? 'en' : 'ar';
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
      'For Custom TSX updates, include a complete self-contained TSX module in "tsxCode". Only import from "react", "remotion", packages starting with "@remotion/", and "../components/Stickman". Never use fs, path, child_process, os, net, http, https, process, eval, new Function, fetch, XMLHttpRequest, WebSocket, require(), dynamic import(), or dangerouslySetInnerHTML.',
      'The TSX module must export exactly one named component with the same component name as the existing generatedComponent when provided.',
      'Use useCurrentFrame(), useVideoConfig(), spring(), and interpolate() so the segment stays animated. Respect RTL Arabic text when language is ar.',
      `Prioritize the requested aspect ratio (${aspectRatio}) while keeping the TSX responsive: read width/height from useVideoConfig(), derive isLandscape = width > height and isSquare = width === height, and use percentage/flex containers with minHeight 0 so switching to 9:16, 16:9, or 1:1 never clips or overflows.`,
      'For 16:9 use a two-column split with maxHeight 72% and at least 64px/48px safe padding; for 1:1 use compact centered/split spacing; for 9:16 use vertical stacking with at least 80px top and 112px bottom safe zones.',
      'Reserve the bottom 22% for captions. Keep Foley/SFX cues valid and use sfxCues frameOffset values relative to the scene start.',
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
    };

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 500) : '';
    const topic = typeof body.topic === 'string' ? body.topic.trim().slice(0, 300) : '';
    const scriptLanguage = body.scriptLanguage === 'en' ? 'en' : 'ar';
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

    let title = prompt.split(/[.!?،؟\n]/)[0].slice(0, 52) || (scriptLanguage === 'en' ? 'Custom visual' : 'عنصر بصري مخصص');
    let text = prompt.slice(0, 160);
    let icon = 'spark';
    let source: 'openrouter' | 'template' = 'template';
    let visualUsage: UsageDelta | undefined;

    const { openrouterKey } = resolveApiKeys(req);
    if (openrouterKey) {
      const openrouterModel = OPENROUTER_MODEL_MAP[requestedModel] || requestedModel;
      const systemPrompt = [
        `You are a visual director designing a single custom SVG card for a ${scriptLanguage === 'en' ? 'English' : 'Arabic'} short video.`,
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

  app.post('/api/render/start', async (req: Request, res: Response) => {
    const body = (req.body || {}) as {
      topic?: unknown;
      scenes?: unknown;
      visualStyle?: unknown;
      aspectRatio?: unknown;
      fps?: unknown;
      voiceoverEnabled?: unknown;
      voiceId?: unknown;
      modelId?: unknown;
      stability?: unknown;
      similarityBoost?: unknown;
      sfxEnabled?: unknown;
      sfxVolume?: unknown;
      sfxMode?: unknown;
      backgroundPreset?: unknown;
      brandKit?: unknown;
      scriptLanguage?: unknown;
      scriptDepth?: unknown;
      creativeCodeMode?: unknown;
      scriptPacing?: unknown;
      captionAnimationStyle?: unknown;
      wordsPerScreen?: unknown;
      captionsEnabled?: unknown;
    };

    if (!Array.isArray(body.scenes) || body.scenes.length === 0) {
      res.status(400).json({ error: 'يجب وجود مشهد واحد على الأقل للتصيير.' });
      return;
    }

    const brandRaw = (body.brandKit && typeof body.brandKit === 'object'
      ? body.brandKit
      : {}) as Record<string, unknown>;
    const brandKit: RenderBrandKit = {
      accentColor: safeColor(brandRaw.accentColor, '#E77B40'),
      bgColor: safeColor(brandRaw.bgColor, '#0B0F17'),
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
      : 0.65;
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
    const job: RenderJob = {
      id: jobId,
      createdAt: Date.now(),
      scenes: curatedScenes,
      visualStyle: normalizeVisualStyleValue(body.visualStyle, studioSettings.visualStyle),
      aspectRatio: typeof body.aspectRatio === 'string' ? body.aspectRatio : '9:16',
      fps,
      voiceoverEnabled: Boolean(body.voiceoverEnabled),
      voiceId: typeof body.voiceId === 'string' ? body.voiceId : studioSettings.voiceId,
      modelId: typeof body.modelId === 'string' ? body.modelId : studioSettings.voiceModelId,
      voiceStability: clampNumber(body.stability, studioSettings.voiceStability, 0, 1),
      voiceSimilarityBoost: clampNumber(
        body.similarityBoost,
        studioSettings.voiceSimilarityBoost,
        0,
        1,
      ),
      sfxEnabled: Boolean(body.sfxEnabled),
      sfxVolume,
      sfxMode: requestedSfxMode,
      backgroundPreset: requestedBackgroundPreset,
      brandKit,
      scriptLanguage: body.scriptLanguage === 'en' ? 'en' : 'ar',
      scriptDepth: normalizeScriptDepth(body.scriptDepth, studioSettings.scriptDepth),
      creativeCodeMode: normalizeCreativeCodeMode(
        body.creativeCodeMode,
        studioSettings.creativeCodeMode,
      ),
      scriptPacing: normalizeScriptPacing(body.scriptPacing, studioSettings.scriptPacing),
      captionAnimationStyle: normalizeCaptionAnimationStyle(
        body.captionAnimationStyle,
        studioSettings.captionAnimationStyle,
      ),
      wordsPerScreen: normalizeWordsPerScreen(
        body.wordsPerScreen,
        studioSettings.wordsPerScreen,
      ),
      captionsEnabled:
        Boolean(body.captionsEnabled) && Boolean(body.voiceoverEnabled),
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
      (total, scene) => total + Math.max(1, Math.round(scene.durationSec * job.fps)),
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
      voiceoverEnabled: job.voiceoverEnabled,
      visualStyle: job.visualStyle,
      aspectRatio: job.aspectRatio,
      fps: job.fps,
      scriptLanguage: job.scriptLanguage,
      scriptDepth: job.scriptDepth,
      creativeCodeMode: job.creativeCodeMode,
      scriptPacing: job.scriptPacing,
      captionAnimationStyle: job.captionAnimationStyle,
      wordsPerScreen: job.wordsPerScreen,
      captionsEnabled: job.captionsEnabled,
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
        const frames = Math.max(1, Math.round(scene.durationSec * job.fps));
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

  app.listen(PORT, HOST, () => {
    console.log(`Zof Studio server listening on http://${HOST}:${PORT}`);
    console.log(`Remotion project: ${PROJECT_ROOT}`);
  });
}

void startServer();
