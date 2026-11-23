export type AiProviderId = 'opencode-free' | 'deepseek' | 'openrouter' | 'kieai' | 'custom';

export type AiScriptModelId = string;

export type VisualStyle = 'stickman' | 'modern-dark' | 'editorial-clean' | 'smart-mix';

export type ScriptPacing = 'fast' | 'balanced' | 'auto';

export type ScriptDepth = 'analytical' | 'condensed' | 'article';

export type CreativeCodeMode = 'creative' | 'fast';

export type CharacterLayout = 'side-by-side' | 'top-bottom';

export type AmbientSceneId =
  | 'none'
  | 'night-room'
  | 'desk-lamp'
  | 'rain-window'
  | 'clock'
  | 'phone-notifications'
  | 'cozy-desk';

export type CaptionAnimationStyle =
  | 'auto'
  | 'word-by-word'
  | 'karaoke'
  | 'static'
  | 'word-pop-glow'
  | 'dynamic-karaoke'
  | 'smooth-chunk-slide'
  | 'kinetic-typewriter';

export type CaptionColorSource =
  | 'background'
  | 'text'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'custom';

export interface CaptionColors {
  background: string;
  text: string;
  highlight: string;
  backgroundSource?: CaptionColorSource;
  textSource?: CaptionColorSource;
  highlightSource?: CaptionColorSource;
}

export type WordsPerScreen = 'auto' | '2' | '3' | '4' | '5';

export type AspectRatio = '9:16' | '16:9' | '1:1';

export type FpsOption = 30 | 60;

export type SfxMode = 'auto' | 'manual';

export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export const WATERMARK_POSITIONS: WatermarkPosition[] = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
];

export type BackgroundPresetId =
  | 'animated-mesh'
  | 'kinetic-grid'
  | 'floating-orbs'
  | 'deep-wave'
  | 'particle-field'
  | 'editorial-paper'
  | 'neon-cyber'
  | 'ai-free';

export type GenerativeMotif =
  | 'orbit'
  | 'network'
  | 'flow'
  | 'funnel'
  | 'cycle'
  | 'constellation';

export type StickmanPose =
  | 'idle'
  | 'walking'
  | 'explaining'
  | 'thinking'
  | 'shocked'
  | 'happy'
  | 'sad'
  | 'pointing'
  | 'celebrating'
  | 'idea'
  | 'facepalm';

export type SceneLayout = 'split' | 'stacked' | 'overlay' | 'centered';

export type CameraMove =
  | 'slow-zoom-in'
  | 'slow-zoom-out'
  | 'pan-left'
  | 'pan-right'
  | 'push-in'
  | 'static';

export type VisualElementType =
  | 'custom-tsx'
  | 'title-hero'
  | 'stat-number'
  | 'comparison-box'
  | 'bar-chart'
  | 'line-chart'
  | 'circular-gauge'
  | 'step-timeline'
  | 'notification-card'
  | 'warning-card'
  | 'editorial-quote'
  | 'bullet-list'
  | 'cta'
  | 'custom'
  | 'generative-scene';

export type ScriptLanguage = string;

export interface SceneItem {
  id: string;
  title: string;
  narration: string;
  pose: StickmanPose;
  visualType: VisualElementType;
  visualLabel: string;
  visualValue: string;
  visualPrompt?: string;
  visualSvg?: string;
  durationSec: number;
  audioDataUrl?: string | null;
  audioSrc?: string;
  audioSource?: 'elevenlabs' | 'browser-tts' | 'none';
  audioStatus?: 'idle' | 'generating' | 'ready' | 'fallback';
  audioDuration?: number;
  sfxId?: string;
  sfxCustomUrl?: string;
  sfxPrompt?: string;
  sfxAt?: number;
  sfxStatus?: 'idle' | 'generating' | 'ready' | 'error';
  layout?: SceneLayout;
  camera?: CameraMove;
  background?: string;
  backgroundPreset?: BackgroundPresetId;
  visualKeywords?: string[];
  motif?: GenerativeMotif;
  showCharacter?: boolean;
  generatedComponent?: string;
  customCodeBrief?: string;
  characters?: Array<{
    pose?: StickmanPose;
    side?: 'left' | 'right';
    accessory?: 'none' | 'tie' | 'badge';
    label?: string;
    scale?: number;
    enabled?: boolean;
  }>;
  characterLayout?: CharacterLayout;
  ambientScene?: AmbientSceneId;
}

export interface ProjectState {
  topic: string;
  scenes: SceneItem[];
  aiProvider?: AiProviderId;
  aiModel?: string;
  voiceId: string;
  voiceModelId: string;
  voiceStability: number;
  voiceSimilarityBoost: number;
  voiceoverEnabled: boolean;
  visualStyle: VisualStyle;
  aspectRatio: AspectRatio;
  fps: FpsOption;
  scriptLanguage: ScriptLanguage;
  scriptDepth?: ScriptDepth;
  creativeCodeMode?: CreativeCodeMode;
  scriptPacing?: ScriptPacing;
  captionAnimationStyle?: CaptionAnimationStyle;
  captionColors?: CaptionColors;
  captionBottomOffset?: number;
  wordsPerScreen?: WordsPerScreen;
  captionsEnabled: boolean;
  respectSafeZone: boolean;
  brandKit: BrandKit;
  sfxEnabled: boolean;
  sfxVolume: number;
  sfxMode: SfxMode;
  backgroundPreset: BackgroundPresetId;
  selectedSceneId?: string;
  updatedAt: number;
}

export interface MediaFileInfo {
  name: string;
  type: 'video' | 'audio' | 'sfx';
  size: number;
  modified: number;
  url: string;
}

export interface MediaLibraryResponse {
  ok: boolean;
  videos: MediaFileInfo[];
  audio: MediaFileInfo[];
  sfx: MediaFileInfo[];
  dirs?: {
    videos: string;
    audio: string;
    sfx: string;
  };
}

export interface ElevenLabsModel {
  model_id: string;
  name: string;
  description: string;
  latencyBadge: string;
  qualityBadge: string;
  languages?: string[];
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  language: string;
  languages?: string[];
  accent: string;
  tone?: string;
  category: string;
  preview_url?: string | null;
  description?: string;
  source?: 'personal' | 'library';
}

export interface BrandKit {
  accentColor: string;
  bgColor: string;
  textColor: string;
  primaryColor: string;
  secondaryColor: string;
  watermark: string;
  watermarkEnabled: boolean;
  watermarkPosition?: WatermarkPosition;
}

export type StudioTabId = 'script' | 'identity' | 'captions' | 'usage';

export interface UsageBreakdown {
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

export interface UsageSnapshot {
  usage: UsageBreakdown;
  totalUsd: number;
}

export interface UsageResponse {
  ok: boolean;
  projectId: string;
  project: UsageSnapshot;
  allTime: UsageSnapshot;
  updatedAt: number;
  usageFile?: string;
}

export interface UsageDelta {
  aiInputTokens?: number;
  aiOutputTokens?: number;
  aiCalls?: number;
  aiUsd?: number;
  aiModel?: string;
  ttsCharacters?: number;
  ttsCalls?: number;
  ttsUsd?: number;
  visualCalls?: number;
  visualUsd?: number;
  renderedFrames?: number;
  renderJobs?: number;
  renderUsd?: number;
}

export interface ElevenLabsBalance {
  configured: boolean;
  ok: boolean;
  characterCount?: number;
  characterLimit?: number;
  remaining?: number;
  tier?: string;
  resetsAt?: string;
  error?: string;
  hint?: string;
}

export interface LlmBalance {
  provider: 'openrouter' | 'deepseek' | 'custom' | 'none';
  configured: boolean;
  ok: boolean;
  remainingUsd?: number | null;
  usedUsd?: number | null;
  limitUsd?: number | null;
  currency?: string;
  label?: string;
  error?: string;
}

export interface LiveBalancesResponse {
  ok: boolean;
  fetchedAt: number;
  elevenlabs: ElevenLabsBalance;
  llm: LlmBalance;
}

export interface SfxConfig {
  enabled: boolean;
  volume: number;
}

export interface VoiceoverConfig {
  enabled: boolean;
  modelId: string;
  voiceId: string;
  stability: number;
  similarityBoost: number;
  style: number;
  speakerBoost: boolean;
  speed: number;
}

export type ExportTargetDuration =
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

export type RenderStepId = 'audio' | 'code' | 'render';

export type StepStatus = 'pending' | 'active' | 'completed' | 'error';

export interface RenderStepState {
  id: RenderStepId;
  label: string;
  status: StepStatus;
  progress: number;
}

export interface RenderLogEntry {
  id: string;
  timestamp: string;
  step: RenderStepId;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

export interface ApiSettingsStatus {
  openrouterConfigured: boolean;
  openrouterMask: string;
  deepseekConfigured?: boolean;
  deepseekMask?: string;
  kieaiConfigured?: boolean;
  kieaiMask?: string;
  elevenlabsConfigured: boolean;
  elevenlabsMask: string;
  elevenlabsVerified?: boolean;
  customConfigured?: boolean;
  customProviderName?: string;
  customProviderBaseUrl?: string;
  customProviderMask?: string;
  settingsFile?: string;
  projectFile?: string;
  persisted?: boolean;
  keysLoadedFromDisk?: boolean;
  providers?: AiProviderOption[];
  models?: AiModelOption[];
  preferences?: {
    provider: AiProviderId;
    modelId: string;
    voiceId?: string;
    voiceModelId?: string;
    voiceStability?: number;
    voiceSimilarityBoost?: number;
    voiceStyle?: number;
    voiceSpeakerBoost?: boolean;
    voiceSpeed?: number;
    visualStyle?: VisualStyle;
    aspectRatio?: AspectRatio;
    fps?: FpsOption;
    scriptLanguage?: ScriptLanguage;
    scriptDepth?: ScriptDepth;
    creativeCodeMode?: CreativeCodeMode;
    scriptPacing?: ScriptPacing;
    captionAnimationStyle?: CaptionAnimationStyle;
    captionColors?: CaptionColors;
    captionBottomOffset?: number;
    wordsPerScreen?: WordsPerScreen;
    captionsEnabled?: boolean;
    respectSafeZone?: boolean;
    brandKit?: BrandKit;
    sfx?: SfxConfig;
    sfxMode?: SfxMode;
    backgroundPreset?: BackgroundPresetId;
  };
  opencode?: {
    configPaths: string[];
    authPaths: string[];
    configFound: boolean;
    authFound: boolean;
    providers: string[];
  };
  sessionToken?: string;
}

export interface AiProviderOption {
  id: AiProviderId;
  label: string;
  description: string;
  requiresKey: boolean;
  configured?: boolean;
}

export interface SettingsSavePayload {
  openrouterKey: string;
  deepseekKey: string;
  kieaiKey: string;
  elevenlabsKey: string;
  customProviderName: string;
  customProviderKey: string;
  customProviderBaseUrl: string;
  aiProvider: AiProviderId;
  aiModel: string;
  voiceId?: string;
  voiceModelId?: string;
  voiceStability?: number;
  voiceSimilarityBoost?: number;
  visualStyle?: VisualStyle;
  aspectRatio?: AspectRatio;
  fps?: FpsOption;
  scriptLanguage?: ScriptLanguage;
  scriptDepth?: ScriptDepth;
  creativeCodeMode?: CreativeCodeMode;
  scriptPacing?: ScriptPacing;
  captionAnimationStyle?: CaptionAnimationStyle;
  captionColors?: CaptionColors;
  captionBottomOffset?: number;
  wordsPerScreen?: WordsPerScreen;
  captionsEnabled?: boolean;
  respectSafeZone?: boolean;
  brandKit?: BrandKit;
  sfxEnabled?: boolean;
  sfxVolume?: number;
  sfxMode?: SfxMode;
  backgroundPreset?: BackgroundPresetId;
  clearOpenrouter?: boolean;
  clearDeepseek?: boolean;
  clearKieai?: boolean;
  clearElevenlabs?: boolean;
  clearCustom?: boolean;
}

export interface AiModelOption {
  id: AiScriptModelId;
  label: string;
  provider: AiProviderId;
  providerLabel: string;
  note: string;
  isFree: boolean;
  upstream?: 'openrouter' | 'deepseek' | 'kieai' | 'custom';
}

export const AI_PROVIDERS: AiProviderOption[] = [
  {
    id: 'opencode-free',
    label: 'OpenCode Free Models',
    description: 'Free OpenCode-compatible models with automatic fallback.',
    requiresKey: false,
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    description: 'Live models from your DeepSeek API account.',
    requiresKey: true,
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    description: 'Hosted and :free OpenRouter models.',
    requiresKey: true,
  },
  {
    id: 'kieai',
    label: 'Kie.ai',
    description: 'Kie.ai OpenAI-compatible chat completions.',
    requiresKey: true,
  },
  {
    id: 'custom',
    label: 'Custom Provider',
    description: 'Any OpenAI-compatible endpoint.',
    requiresKey: true,
  },
];

export const AI_SCRIPT_MODELS: AiModelOption[] = [
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
    note: 'Low-latency free model with multilingual output.',
    isFree: true,
    upstream: 'openrouter',
  },
  {
    id: 'nvidia/nemotron-3.5-super-vl:free',
    label: 'Nemotron 3.5 Super VL Free',
    provider: 'opencode-free',
    providerLabel: 'OpenCode Free Models',
    note: 'Free NVIDIA model for rich scene planning.',
    isFree: true,
    upstream: 'openrouter',
  },
  {
    id: 'z-ai/glm-4.5-air:free',
    label: 'GLM 4.5 Air Free',
    provider: 'opencode-free',
    providerLabel: 'OpenCode Free Models',
    note: 'Free balanced Arabic and English dialogue model.',
    isFree: true,
    upstream: 'openrouter',
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    label: 'Claude 3.5 Sonnet',
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    note: 'Premium creative writing through OpenRouter.',
    isFree: false,
    upstream: 'openrouter',
  },
  {
    id: 'google/gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    note: 'Fast structured JSON generation.',
    isFree: false,
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
    note: 'OpenRouter free general-purpose model.',
    isFree: true,
    upstream: 'openrouter',
  },
  {
    id: 'gpt-4o-mini',
    label: 'Kie.ai GPT-4o mini',
    provider: 'kieai',
    providerLabel: 'Kie.ai',
    note: 'Kie.ai chat completion model.',
    isFree: false,
    upstream: 'kieai',
  },
  {
    id: 'custom-model',
    label: 'Custom model',
    provider: 'custom',
    providerLabel: 'Custom Provider',
    note: 'Any model ID supported by your endpoint.',
    isFree: false,
    upstream: 'custom',
  },
];

export const STICKMAN_POSES: { value: StickmanPose; label: string; labelEn: string }[] = [
  { value: 'idle', label: 'ثابت (Idle)', labelEn: 'Idle' },
  { value: 'walking', label: 'يمشي (Walking)', labelEn: 'Walking' },
  { value: 'explaining', label: 'يشرح (Explaining)', labelEn: 'Explaining' },
  { value: 'thinking', label: 'يفكر (Thinking)', labelEn: 'Thinking' },
  { value: 'shocked', label: 'مصدوم (Shocked)', labelEn: 'Shocked' },
  { value: 'happy', label: 'سعيد (Happy)', labelEn: 'Happy' },
  { value: 'sad', label: 'حزين (Sad)', labelEn: 'Sad' },
  { value: 'pointing', label: 'يشير (Pointing)', labelEn: 'Pointing' },
  { value: 'celebrating', label: 'يحتفل (Celebrating)', labelEn: 'Celebrating' },
  { value: 'idea', label: 'فكرة (Idea)', labelEn: 'Idea' },
  { value: 'facepalm', label: 'تأسف (Facepalm)', labelEn: 'Facepalm' },
];

export {
  VIDEO_LANGUAGES as SCRIPT_LANGUAGES,
  type VideoLanguage,
  type VideoLanguageDirection,
} from './languages';

export const SCRIPT_DEPTH_OPTIONS: {
  value: ScriptDepth;
  labelAr: string;
  labelEn: string;
  descAr: string;
  descEn: string;
}[] = [
  {
    value: 'analytical',
    labelAr: 'تحليلي مُدقّق (60ث · 9–12 مشهد سريع)',
    labelEn: 'Analytical deep dive (60s · 9–12 micro-scenes)',
    descAr: 'شرح استقصائي عميق: آليات وأرقام وأمثلة وأخطاء شائعة وخطوات عملية.',
    descEn: 'Investigative depth: mechanisms, numbers, contrasts, mistakes and action steps.',
  },
  {
    value: 'condensed',
    labelAr: 'سريع ومكثف (30ث · 6–7 مشاهد)',
    labelEn: 'Fast & condensed (30s · 6–7 scenes)',
    descAr: 'ملخص عالي التأثير يحافظ على العمق مع 6–7 مشاهد فقط.',
    descEn: 'High-impact summary that keeps the depth in just 6–7 scenes.',
  },
  {
    value: 'article',
    labelAr: 'تحويل نص/مقال مفصّل (من النص المدخل)',
    labelEn: 'Article-to-script (from pasted text)',
    descAr: 'يستخرج كل الحقائق والأرقام والحجج والتفاصيل من النص دون تبسيط أو حذف.',
    descEn: 'Extracts every fact, number, argument and nuance from the pasted text without oversimplifying.',
  },
];

export const CREATIVE_CODE_MODE_OPTIONS: {
  value: CreativeCodeMode;
  labelAr: string;
  labelEn: string;
  descAr: string;
  descEn: string;
}[] = [
  {
    value: 'creative',
    labelAr: 'إبداع برمجي حر (AI Custom TSX + مكتبة موسعة)',
    labelEn: 'AI Custom TSX + expanded library',
    descAr:
      'يستخدم مكتبة Remotion الموسعة، ويولّد مكوّن TSX مخصصاً للمشاهد التي تحتاج سرداً بصرياً معقداً.',
    descEn:
      'Uses the expanded Remotion library and generates bespoke TSX components for complex visual storytelling.',
  },
  {
    value: 'fast',
    labelAr: 'المكتبة السريعة فقط (Fast Declarative Engine)',
    labelEn: 'Fast declarative engine only',
    descAr: 'مشاهد مبنية مسبقاً فقط لتصيير فوري دون توليد كود.',
    descEn: 'Built-in declarative scenes only for instant rendering, no code generation.',
  },
];

export const AMBIENT_SCENE_OPTIONS: {
  value: AmbientSceneId;
  labelAr: string;
  labelEn: string;
}[] = [
  { value: 'none', labelAr: 'بدون بيئة إضافية', labelEn: 'No extra environment' },
  { value: 'night-room', labelAr: 'غرفة ليلية', labelEn: 'Night room' },
  { value: 'desk-lamp', labelAr: 'مصباح مكتب', labelEn: 'Desk lamp' },
  { value: 'rain-window', labelAr: 'نافذة مطر', labelEn: 'Rain window' },
  { value: 'clock', labelAr: 'ساعة', labelEn: 'Clock' },
  { value: 'phone-notifications', labelAr: 'إشعارات الهاتف', labelEn: 'Phone notifications' },
  { value: 'cozy-desk', labelAr: 'مكتب دافئ', labelEn: 'Cozy desk' },
];

export const SCRIPT_PACING_OPTIONS: {
  value: ScriptPacing;
  labelAr: string;
  labelEn: string;
  descAr: string;
  descEn: string;
}[] = [
  {
    value: 'fast',
    labelAr: 'سريع ومكثف 3–5ث',
    labelEn: 'Fast & punchy 3–5s',
    descAr: '6–8 مشاهد قصيرة، 12–18 كلمة لكل مشهد، إيقاع عالي الاحتفاظ.',
    descEn: '6–8 short scenes, 12–18 words each, high-retention pacing.',
  },
  {
    value: 'balanced',
    labelAr: 'متوازن',
    labelEn: 'Balanced',
    descAr: 'مشاهد أوضح مع مساحة للتنفس دون فقدان الإيقاع.',
    descEn: 'Clearer scenes with breathing room without losing rhythm.',
  },
  {
    value: 'auto',
    labelAr: 'AI يحدد الأفضل',
    labelEn: 'AI picks the best',
    descAr: 'دع الذكاء الاصطناعي يوازن السرعة حسب الموضوع.',
    descEn: 'Let AI balance pacing based on the topic.',
  },
];

export const CAPTION_ANIMATION_STYLES: {
  value: CaptionAnimationStyle;
  labelAr: string;
  labelEn: string;
}[] = [
  { value: 'auto', labelAr: 'AI يحدد الأنسب (Auto)', labelEn: 'AI auto pick' },
  { value: 'word-pop-glow', labelAr: 'كلمة بكلمة متوهجة (Word Pop & Glow)', labelEn: 'Word pop & glow' },
  { value: 'dynamic-karaoke', labelAr: 'كاراوكي ديناميكي (Dynamic Karaoke)', labelEn: 'Dynamic karaoke' },
  { value: 'smooth-chunk-slide', labelAr: 'ظهور متدرج نظيف (Smooth Chunk Slide)', labelEn: 'Smooth chunk slide' },
  { value: 'kinetic-typewriter', labelAr: 'كتابة حركية سريعة (Kinetic Typewriter)', labelEn: 'Kinetic typewriter' },
];

export const WORDS_PER_SCREEN_OPTIONS: {
  value: WordsPerScreen;
  labelAr: string;
  labelEn: string;
}[] = [
  { value: 'auto', labelAr: 'حر / AI يحدد الأفضل (Auto)', labelEn: 'Auto (2–4 words)' },
  { value: '2', labelAr: '2 كلمات', labelEn: '2 words' },
  { value: '3', labelAr: '3 كلمات', labelEn: '3 words' },
  { value: '4', labelAr: '4 كلمات', labelEn: '4 words' },
  { value: '5', labelAr: '5 كلمات', labelEn: '5 words' },
];

export const VISUAL_ELEMENT_TYPES: {
  value: VisualElementType;
  label: string;
  labelEn: string;
}[] = [
  {
    value: 'custom-tsx',
    label: 'مشهد TSX مخصص (AI Custom TSX)',
    labelEn: 'AI Custom TSX Scene',
  },
  { value: 'title-hero', label: 'عنوان رئيسي (Hero Title)', labelEn: 'Hero Title' },
  { value: 'stat-number', label: 'رقم إحصائي (Stat Number)', labelEn: 'Stat Number' },
  { value: 'comparison-box', label: 'مقارنة ثنائية (Comparison Box)', labelEn: 'Comparison Box' },
  { value: 'bar-chart', label: 'مخطط أعمدة (Bar Chart)', labelEn: 'Bar Chart' },
  { value: 'line-chart', label: 'مخطط نمو خطي (Line Growth)', labelEn: 'Line Growth Chart' },
  { value: 'circular-gauge', label: 'مؤشر دائري (Circular Gauge)', labelEn: 'Circular Gauge' },
  { value: 'step-timeline', label: 'خط زمني بالخطوات (Step Timeline)', labelEn: 'Step Timeline' },
  { value: 'notification-card', label: 'بطاقة إشعار (Notification Card)', labelEn: 'Notification Card' },
  { value: 'warning-card', label: 'تحذير / خرافة (Warning Myth)', labelEn: 'Warning / Myth Card' },
  { value: 'editorial-quote', label: 'اقتباس تحريري (Editorial Quote)', labelEn: 'Editorial Quote' },
  { value: 'bullet-list', label: 'قائمة نقاط (Bullet List)', labelEn: 'Bullet List' },
  { value: 'cta', label: 'دعوة لاتخاذ إجراء (CTA)', labelEn: 'Call-to-Action' },
  { value: 'custom', label: 'عنصر مخصص (Custom Visual)', labelEn: 'Custom Visual' },
  {
    value: 'generative-scene',
    label: 'مشهد حركي توليدي (Generative Motion)',
    labelEn: 'Generative Motion Scene',
  },
];

export const BACKGROUND_PRESETS: {
  id: BackgroundPresetId;
  labelAr: string;
  labelEn: string;
  descAr: string;
  descEn: string;
  preview: string;
}[] = [
  {
    id: 'animated-mesh',
    labelAr: 'تدرج شبكي متحرك',
    labelEn: 'Animated Mesh Gradients',
    descAr: 'تدرجات ناعمة تتنفس خلف المشهد.',
    descEn: 'Soft breathing gradients behind the scene.',
    preview: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 45%, #f472b6 100%)',
  },
  {
    id: 'kinetic-grid',
    labelAr: 'شبكة حركية',
    labelEn: 'Kinetic Grid',
    descAr: 'شبكة هندسية تنزلق باستمرار.',
    descEn: 'A geometric grid gliding in motion.',
    preview:
      'repeating-linear-gradient(0deg, rgba(56,189,248,.35) 0 1px, transparent 1px 22px), repeating-linear-gradient(90deg, rgba(56,189,248,.35) 0 1px, transparent 1px 22px), radial-gradient(circle at 60% 40%, #0f172a, #020617)',
  },
  {
    id: 'floating-orbs',
    labelAr: 'كرات عائمة',
    labelEn: 'Floating Orbs',
    descAr: 'كرات ضوئية تطفو بهدوء.',
    descEn: 'Light orbs drifting calmly.',
    preview:
      'radial-gradient(circle at 28% 32%, #22d3ee 0 12%, transparent 13%), radial-gradient(circle at 72% 62%, #f472b6 0 16%, transparent 17%), radial-gradient(circle at 52% 18%, #a78bfa 0 9%, transparent 10%), #070b17',
  },
  {
    id: 'deep-wave',
    labelAr: 'موجة عميقة',
    labelEn: 'Deep Wave Flow',
    descAr: 'موجات متدفقة بأسلوب سينمائي.',
    descEn: 'Cinematic layered wave flow.',
    preview:
      'radial-gradient(ellipse at 50% 120%, #0ea5e9 0%, transparent 55%), radial-gradient(ellipse at 10% 90%, #8b5cf6 0%, transparent 45%), #030712',
  },
  {
    id: 'particle-field',
    labelAr: 'حقل جزيئات',
    labelEn: 'Particle Field',
    descAr: 'نجوم وجزيئات تتلألأ وتتحرك.',
    descEn: 'Twinkling moving particles.',
    preview:
      'radial-gradient(circle at 20% 30%, #e2e8f0 0 1.5px, transparent 2px), radial-gradient(circle at 65% 25%, #7dd3fc 0 1.5px, transparent 2px), radial-gradient(circle at 45% 70%, #e2e8f0 0 1.5px, transparent 2px), radial-gradient(circle at 82% 78%, #a5b4fc 0 1.5px, transparent 2px), #05070f',
  },
  {
    id: 'editorial-paper',
    labelAr: 'ورق تحريري',
    labelEn: 'Minimal Editorial Paper',
    descAr: 'خلفية ورقية فاتحة مع خطوط دقيقة.',
    descEn: 'Bright paper texture with fine rules.',
    preview:
      'repeating-linear-gradient(0deg, rgba(17,24,39,.05) 0 1px, transparent 1px 26px), linear-gradient(180deg, #faf9f4, #efece2)',
  },
  {
    id: 'neon-cyber',
    labelAr: 'نيون سايبر',
    labelEn: 'Neon Cyber Pulse',
    descAr: 'نبض نيون مستقبلي عالي التباين.',
    descEn: 'High-contrast futuristic neon pulse.',
    preview:
      'repeating-linear-gradient(115deg, rgba(34,211,238,.22) 0 2px, transparent 2px 16px), radial-gradient(circle at 80% 20%, #db2777 0%, transparent 40%), radial-gradient(circle at 12% 82%, #0891b2 0%, transparent 45%), #04050c',
  },
  {
    id: 'ai-free',
    labelAr: 'إبداع حر بالذكاء الاصطناعي',
    labelEn: 'AI Free Creativity',
    descAr: 'لوحة ألوان وخلفية وشيدر جديد لكل فيديو حسب الموضوع.',
    descEn: 'A brand-new palette, shader, and lighting mood per video.',
    preview:
      'conic-gradient(from 210deg at 55% 45%, #f59e0b, #ef4444, #8b5cf6, #06b6d4, #22c55e, #f59e0b)',
  },
];

export const ASPECT_RATIO_PRESETS: {
  id: AspectRatio;
  label: string;
  dimensions: string;
  width: number;
  height: number;
}[] = [
  { id: '9:16', label: '9:16 Reels', dimensions: '1080×1920', width: 1080, height: 1920 },
  { id: '16:9', label: '16:9 YouTube', dimensions: '1920×1080', width: 1920, height: 1080 },
  { id: '1:1', label: '1:1 Square', dimensions: '1080×1080', width: 1080, height: 1080 },
];

export interface ProviderModelOption {
  id: string;
  label: string;
  provider: AiProviderId;
  providerLabel: string;
  note?: string;
  isFree: boolean;
  upstream?: 'openrouter' | 'deepseek' | 'kieai' | 'custom';
}

export interface ProviderModelsResponse {
  ok: boolean;
  provider: AiProviderId;
  source: 'live' | 'curated';
  fetchedAt: number;
  cached: boolean;
  models: ProviderModelOption[];
  notice?: string;
}
