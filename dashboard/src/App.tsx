import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { BarChart3, CheckCircle2, Download, Film, ListChecks, MonitorPlay, PanelLeft, SlidersHorizontal, TriangleAlert, X } from 'lucide-react';
import { ApiSettingsDrawer } from './components/ApiSettingsDrawer';
import { CoreVideoBar } from './components/CoreVideoBar';
import { EditorTimeline, type TimelineScene } from './components/EditorTimeline';
import { PanelResizeHandle } from './components/PanelResizeHandle';
import { MainPreviewPanel } from './components/MainPreviewPanel';
import { NotificationPermissionBanner } from './components/NotificationPermissionBanner';
import { QuickTweakPanel } from './components/QuickTweakPanel';
import { RenderMonitorPanel } from './components/RenderMonitorPanel';
import { StudioGuideModal } from './components/StudioGuideModal';
import { StudioInfoModal, type StudioInfoModalId } from './components/StudioFooter';
import { StudioSidePanel } from './components/StudioSidePanel';
import { TopHeader } from './components/TopHeader';
import { UsageCostPanel } from './components/UsageCostPanel';
import { useStudioUsage } from './hooks/useStudioUsage';
import { useI18n } from './i18n';
import { getVideoLanguage, normalizeVideoLanguage } from './types/languages';
import { AI_PROVIDERS, AI_SCRIPT_MODELS } from './types/studio';
import type {
  AiProviderId,
  AiScriptModelId,
  ApiSettingsStatus,
  AspectRatio,
  BrandKit,
  CaptionAnimationStyle,
  CaptionColors,
  ElevenLabsVoice,
  ExportTargetDuration,
  FpsOption,
  RenderLogEntry,
  RenderStepId,
  RenderStepState,
  ScriptLanguage,
  SettingsSavePayload,
  SfxConfig,
  StepStatus,
  VoiceoverConfig,
} from './types/studio';
import type { RenderedVideoResult } from './utils/remotionRenderer';
import {
  DEFAULT_CAPTION_BOTTOM_OFFSET,
  DEFAULT_CAPTION_COLORS,
  normalizeCaptionBottomOffset,
  resolveCaptionStyle,
} from './utils/captionColors';
import {
  getNotificationPermission,
  playCompletionChime,
  primeCompletionAudio,
  requestNotificationPermission,
  showDesktopNotification,
  type NotificationPermissionState,
} from './utils/notifications';

type Translator = (ar: string, en: string) => string;

type GeneratedSceneSummary = {
  id: string;
  title: string;
  index: number;
  component?: string;
  durationSec: number;
  hasAudio: boolean;
  exists: boolean;
};

type InspectorTabId = 'render' | 'usage';
type MobilePaneId = 'tools' | 'player' | 'inspector';

const PROMPT_STORAGE_KEY = 'zoedit-studio-master-prompt-v1';
const SCRIPT_STORAGE_KEY = 'zoedit-studio-voiceover-script-v1';
const PALETTE_STORAGE_KEY = 'zoedit-studio-active-palette-v1';
const SFX_STORAGE_KEY = 'zoedit-studio-sfx-v1';
const DEPTH_25D_STORAGE_KEY = 'zoedit-studio-depth-25d-v1';
const RESPECT_SAFE_ZONE_STORAGE_KEY = 'zoedit-studio-respect-safe-zone-v1';
const CAPTION_STORAGE_KEY = 'zoedit-studio-caption-settings-v1';
const WORKSPACE_LAYOUT_KEY = 'zoedit-studio-workspace-layout-v2';
const WORKSPACE_SETTINGS_KEY = 'zoedit-studio-workspace-settings-v1';

const LEGACY_STORAGE_PREFIX = ['zof', 'studio'].join('-');
const STORAGE_SUFFIXES = [
  'lang',
  'master-prompt-v1',
  'voiceover-script-v1',
  'active-palette-v1',
  'sfx-v1',
  'depth-25d-v1',
  'respect-safe-zone-v1',
  'caption-settings-v1',
];
if (typeof window !== 'undefined') {
  try {
    for (const suffix of STORAGE_SUFFIXES) {
      const canonical = `zoedit-studio-${suffix}`;
      if (window.localStorage.getItem(canonical) !== null) continue;
      const legacy = window.localStorage.getItem(`${LEGACY_STORAGE_PREFIX}-${suffix}`);
      if (legacy !== null) window.localStorage.setItem(canonical, legacy);
    }
  } catch {
    // Storage migration is best-effort and must never block the workspace.
  }
}

type WorkspaceLayout = {
  leftWidth: number;
  rightWidth: number;
  timelineHeight: number;
};

const DEFAULT_WORKSPACE_LAYOUT: WorkspaceLayout = {
  leftWidth: 300,
  rightWidth: 360,
  timelineHeight: 110,
};

function readWorkspaceLayout(): WorkspaceLayout {
  if (typeof window === 'undefined') return DEFAULT_WORKSPACE_LAYOUT;
  try {
    const raw = window.localStorage.getItem(WORKSPACE_LAYOUT_KEY);
    if (!raw) return DEFAULT_WORKSPACE_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<WorkspaceLayout>;
    const read = (value: unknown, fallback: number, min: number, max: number) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? Math.min(max, Math.max(min, numeric)) : fallback;
    };
    return {
      leftWidth: read(parsed.leftWidth, DEFAULT_WORKSPACE_LAYOUT.leftWidth, 220, 560),
      rightWidth: read(parsed.rightWidth, DEFAULT_WORKSPACE_LAYOUT.rightWidth, 260, 620),
      timelineHeight: read(parsed.timelineHeight, DEFAULT_WORKSPACE_LAYOUT.timelineHeight, 110, 360),
    };
  } catch {
    return DEFAULT_WORKSPACE_LAYOUT;
  }
}

const CAPTION_STYLE_VALUES: CaptionAnimationStyle[] = [
  'auto',
  'word-by-word',
  'karaoke',
  'static',
  'word-pop-glow',
  'dynamic-karaoke',
  'smooth-chunk-slide',
  'kinetic-typewriter',
];

interface StoredCaptionSettings {
  style: CaptionAnimationStyle;
  colors: CaptionColors;
  bottomOffset: number;
}

function readStoredCaptionSettings(): StoredCaptionSettings | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CAPTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      style?: unknown;
      colors?: Partial<Record<keyof CaptionColors, unknown>>;
      bottomOffset?: unknown;
    };
    const style = resolveCaptionStyle(
      CAPTION_STYLE_VALUES.includes(parsed.style as CaptionAnimationStyle)
        ? (parsed.style as CaptionAnimationStyle)
        : 'word-by-word'
    );
    const colors = parsed.colors && typeof parsed.colors === 'object' ? parsed.colors : {};
    const readColor = (key: 'background' | 'text' | 'highlight'): string =>
      typeof colors[key] === 'string' && /^#[0-9a-fA-F]{6}$/.test(String(colors[key]).trim())
        ? String(colors[key]).trim().toUpperCase()
        : DEFAULT_CAPTION_COLORS[key];
    return {
      style,
      colors: {
        background: readColor('background'),
        text: readColor('text'),
        highlight: readColor('highlight'),
        backgroundSource:
          typeof colors.backgroundSource === 'string'
            ? (colors.backgroundSource as CaptionColors['backgroundSource'])
            : DEFAULT_CAPTION_COLORS.backgroundSource,
        textSource:
          typeof colors.textSource === 'string'
            ? (colors.textSource as CaptionColors['textSource'])
            : DEFAULT_CAPTION_COLORS.textSource,
        highlightSource:
          typeof colors.highlightSource === 'string'
            ? (colors.highlightSource as CaptionColors['highlightSource'])
            : DEFAULT_CAPTION_COLORS.highlightSource,
      },
      bottomOffset: normalizeCaptionBottomOffset(
        parsed.bottomOffset,
        DEFAULT_CAPTION_BOTTOM_OFFSET
      ),
    };
  } catch {
    return null;
  }
}

function persistCaptionSettings(settings: StoredCaptionSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CAPTION_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage can be unavailable in private mode.
  }
}

const PALETTE_COLOR_KEYS = [
  'bgColor',
  'textColor',
  'primaryColor',
  'secondaryColor',
  'accentColor',
] as const;

type PaletteColors = Pick<BrandKit, (typeof PALETTE_COLOR_KEYS)[number]>;

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function readStoredPalette(): PaletteColors | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PALETTE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Record<keyof PaletteColors, unknown>>;
    const colors = {} as PaletteColors;
    for (const key of PALETTE_COLOR_KEYS) {
      const value = parsed[key];
      if (typeof value !== 'string' || !HEX_COLOR_PATTERN.test(value.trim())) {
        return null;
      }
      colors[key] = value.trim().toUpperCase();
    }
    return colors;
  } catch {
    return null;
  }
}

function persistPalette(brandKit: BrandKit): void {
  if (typeof window === 'undefined') return;
  try {
    const colors = {} as PaletteColors;
    for (const key of PALETTE_COLOR_KEYS) {
      colors[key] = brandKit[key];
    }
    window.localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(colors));
  } catch {
    // localStorage can be unavailable in private mode.
  }
}

const DEFAULT_SFX_CONFIG: SfxConfig = { enabled: true, volume: 0.2 };

function readStoredSfx(): SfxConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SFX_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { enabled?: unknown; volume?: unknown };
    const volume = Number(parsed.volume);
    if (typeof parsed.enabled !== 'boolean' || !Number.isFinite(volume)) {
      return null;
    }
    return {
      enabled: parsed.enabled,
      volume: Math.min(1, Math.max(0, volume)),
    };
  } catch {
    return null;
  }
}

function persistSfx(sfx: SfxConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SFX_STORAGE_KEY, JSON.stringify(sfx));
  } catch {
    // localStorage can be unavailable in private mode.
  }
}

function readStoredDepth25D(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DEPTH_25D_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function persistDepth25D(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DEPTH_25D_STORAGE_KEY, String(enabled));
  } catch {
    // localStorage can be unavailable in private mode.
  }
}

function readStoredRespectSafeZone(): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(RESPECT_SAFE_ZONE_STORAGE_KEY);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return null;
  } catch {
    return null;
  }
}

function persistRespectSafeZone(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RESPECT_SAFE_ZONE_STORAGE_KEY, String(enabled));
  } catch {
    // localStorage can be unavailable in private mode.
  }
}

const DEFAULT_BRAND_KIT: BrandKit = {
  accentColor: '#E77B40',
  bgColor: '#0B0F17',
  textColor: '#F8FAFC',
  primaryColor: '#38BDF8',
  secondaryColor: '#FBBF24',
  watermark: '@ZoeditStudio',
  watermarkEnabled: true,
  watermarkPosition: 'top-left',
};

const DEFAULT_VOICE_CONFIG: VoiceoverConfig = {
  enabled: true,
  modelId: 'eleven_multilingual_v2',
  voiceId: 'pNInz6obpgDQGcFmaJgB',
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0,
  speakerBoost: true,
  speed: 1,
};

const EXPORT_DURATION_VALUES: ExportTargetDuration[] = [
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
const ASPECT_RATIO_VALUES: AspectRatio[] = ['9:16', '16:9', '1:1'];
const FPS_VALUES: FpsOption[] = [30, 60];
const WATERMARK_POSITION_VALUES: Array<NonNullable<BrandKit['watermarkPosition']>> = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
];

type StoredWorkspaceSettings = {
  targetDuration?: ExportTargetDuration;
  aspectRatio?: AspectRatio;
  fps?: FpsOption;
  scriptLanguage?: ScriptLanguage;
  voiceConfig?: VoiceoverConfig;
  captionsEnabled?: boolean;
  sfx?: SfxConfig;
  enable25D?: boolean;
  cleanBrollMode?: boolean;
  respectSafeZone?: boolean;
  brandKit?: BrandKit;
  selectedAiProvider?: AiProviderId;
  selectedAiModel?: AiScriptModelId;
};

function clampStoredNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(max, Math.max(min, numeric)) : fallback;
}

function readStoredBrandKit(value: unknown): BrandKit | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const next: BrandKit = { ...DEFAULT_BRAND_KIT };
  for (const key of PALETTE_COLOR_KEYS) {
    const raw = record[key];
    if (typeof raw === 'string' && HEX_COLOR_PATTERN.test(raw.trim())) {
      next[key] = raw.trim().toUpperCase();
    }
  }
  if (typeof record.watermark === 'string') {
    next.watermark = record.watermark.slice(0, 80);
  }
  if (typeof record.watermarkEnabled === 'boolean') {
    next.watermarkEnabled = record.watermarkEnabled;
  }
  if (
    typeof record.watermarkPosition === 'string' &&
    WATERMARK_POSITION_VALUES.includes(
      record.watermarkPosition as NonNullable<BrandKit['watermarkPosition']>,
    )
  ) {
    next.watermarkPosition = record.watermarkPosition as NonNullable<
      BrandKit['watermarkPosition']
    >;
  }
  return next;
}

function readStoredWorkspaceSettings(): StoredWorkspaceSettings | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(WORKSPACE_SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    const result: StoredWorkspaceSettings = {};

    if (EXPORT_DURATION_VALUES.includes(parsed.targetDuration as ExportTargetDuration)) {
      result.targetDuration = parsed.targetDuration as ExportTargetDuration;
    }
    if (ASPECT_RATIO_VALUES.includes(parsed.aspectRatio as AspectRatio)) {
      result.aspectRatio = parsed.aspectRatio as AspectRatio;
    }
    if (FPS_VALUES.includes(Number(parsed.fps) as FpsOption)) {
      result.fps = Number(parsed.fps) as FpsOption;
    }
    if (typeof parsed.scriptLanguage === 'string' && parsed.scriptLanguage.trim()) {
      result.scriptLanguage = parsed.scriptLanguage.trim();
    }
    if (parsed.voiceConfig && typeof parsed.voiceConfig === 'object') {
      const voice = parsed.voiceConfig as Record<string, unknown>;
      result.voiceConfig = {
        enabled:
          typeof voice.enabled === 'boolean' ? voice.enabled : DEFAULT_VOICE_CONFIG.enabled,
        modelId:
          typeof voice.modelId === 'string' && voice.modelId.trim()
            ? voice.modelId.trim()
            : DEFAULT_VOICE_CONFIG.modelId,
        voiceId:
          typeof voice.voiceId === 'string' && voice.voiceId.trim()
            ? voice.voiceId.trim()
            : DEFAULT_VOICE_CONFIG.voiceId,
        stability: clampStoredNumber(voice.stability, DEFAULT_VOICE_CONFIG.stability, 0, 1),
        similarityBoost: clampStoredNumber(
          voice.similarityBoost,
          DEFAULT_VOICE_CONFIG.similarityBoost,
          0,
          1,
        ),
        style: clampStoredNumber(voice.style, DEFAULT_VOICE_CONFIG.style, 0, 1),
        speakerBoost:
          typeof voice.speakerBoost === 'boolean'
            ? voice.speakerBoost
            : DEFAULT_VOICE_CONFIG.speakerBoost,
        speed: clampStoredNumber(voice.speed, DEFAULT_VOICE_CONFIG.speed, 0.7, 1.2),
      };
    }
    if (typeof parsed.captionsEnabled === 'boolean') {
      result.captionsEnabled = parsed.captionsEnabled;
    }
    if (parsed.sfx && typeof parsed.sfx === 'object') {
      const sfxRecord = parsed.sfx as Record<string, unknown>;
      result.sfx = {
        enabled: typeof sfxRecord.enabled === 'boolean' ? sfxRecord.enabled : true,
        volume: clampStoredNumber(sfxRecord.volume, DEFAULT_SFX_CONFIG.volume, 0, 1),
      };
    }
    for (const key of ['enable25D', 'cleanBrollMode', 'respectSafeZone'] as const) {
      if (typeof parsed[key] === 'boolean') {
        result[key] = parsed[key] as boolean;
      }
    }
    const brandKit = readStoredBrandKit(parsed.brandKit);
    if (brandKit) result.brandKit = brandKit;
    if (
      typeof parsed.selectedAiProvider === 'string' &&
      AI_PROVIDERS.some((provider) => provider.id === parsed.selectedAiProvider)
    ) {
      result.selectedAiProvider = parsed.selectedAiProvider as AiProviderId;
    }
    if (typeof parsed.selectedAiModel === 'string' && parsed.selectedAiModel.trim()) {
      result.selectedAiModel = parsed.selectedAiModel.trim();
    }
    return result;
  } catch {
    return null;
  }
}

const DEFAULT_PROMPT_AR =
  'كيف تصنع فيديوهات تعليمية قصيرة بالذكاء الاصطناعي وتضاعف التفاعل';
const DEFAULT_PROMPT_EN =
  'How to create short educational videos with AI and double engagement';

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

function stripAnsi(value: string): string {
  return value
    .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, '')
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\[(?:\d{1,2}(?:;\d{1,2})*)m/g, '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
}

function createExportSteps(fps: FpsOption, t: Translator): RenderStepState[] {
  return [
    {
      id: 'audio',
      label: t('توليد الصوت والتوقيت', 'Generating audio & timing'),
      status: 'pending',
      progress: 0,
    },
    {
      id: 'code',
      label: t(
        'OpenCode يبرمج مشاهد Remotion مخصصة',
        'OpenCode coding custom Remotion scenes'
      ),
      status: 'pending',
      progress: 0,
    },
    {
      id: 'render',
      label: t(`تصيير MP4 النهائي ${fps}fps`, `Rendering final MP4 ${fps}fps`),
      status: 'pending',
      progress: 0,
    },
  ];
}

export default function App() {
  const { t, dir, lang, isRtl } = useI18n();
  const defaultBaseUrl =
    typeof window !== 'undefined' && window.location.port === '4789'
      ? 'http://localhost:4789/api'
      : '/api';

  const [apiBaseUrl, setApiBaseUrl] = useState<string>(defaultBaseUrl);
  const [sessionToken, setSessionToken] = useState<string>('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [footerModal, setFooterModal] = useState<StudioInfoModalId | null>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTabId>('render');
  const [mobilePane, setMobilePane] = useState<MobilePaneId>('player');
  const usageTracker = useStudioUsage(apiBaseUrl, sessionToken);
  const [initialWorkspaceSettings] = useState<StoredWorkspaceSettings | null>(
    readStoredWorkspaceSettings
  );

  const [selectedAiProvider, setSelectedAiProvider] = useState<AiProviderId>(
    initialWorkspaceSettings?.selectedAiProvider ?? 'opencode-free'
  );
  const [selectedAiModel, setSelectedAiModel] = useState<AiScriptModelId>(
    initialWorkspaceSettings?.selectedAiModel ?? 'deepseek/deepseek-v4.1-flash:free'
  );
  const [apiStatus, setApiStatus] = useState<ApiSettingsStatus>({
    openrouterConfigured: false,
    openrouterMask: '',
    elevenlabsConfigured: false,
    elevenlabsMask: '',
  });
  const availableProviders = apiStatus.providers?.length ? apiStatus.providers : AI_PROVIDERS;
  const availableModels = apiStatus.models?.length ? apiStatus.models : AI_SCRIPT_MODELS;

  const [masterPrompt, setMasterPrompt] = useState<string>(() => {
    const fallback = t(DEFAULT_PROMPT_AR, DEFAULT_PROMPT_EN);
    if (typeof window === 'undefined') return fallback;
    return window.localStorage.getItem(PROMPT_STORAGE_KEY) || fallback;
  });
  const [voiceoverScript, setVoiceoverScript] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(SCRIPT_STORAGE_KEY) || '';
  });
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [scriptNotice, setScriptNotice] = useState<string | null>(null);
  const [targetDuration, setTargetDuration] = useState<ExportTargetDuration>(
    initialWorkspaceSettings?.targetDuration ?? '60'
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    initialWorkspaceSettings?.aspectRatio ?? '9:16'
  );
  const [fps, setFps] = useState<FpsOption>(initialWorkspaceSettings?.fps ?? 60);
  const [brandKit, setBrandKit] = useState<BrandKit>(() =>
    initialWorkspaceSettings?.brandKit
      ? initialWorkspaceSettings.brandKit
      : {
          ...DEFAULT_BRAND_KIT,
          ...(readStoredPalette() ?? {}),
        }
  );
  const hadStoredPaletteAtBootRef = useRef(Boolean(readStoredPalette()));
  const [scriptLanguage, setScriptLanguage] = useState<ScriptLanguage>(
    normalizeVideoLanguage(initialWorkspaceSettings?.scriptLanguage ?? 'ar')
  );
  const [voiceConfig, setVoiceConfig] = useState<VoiceoverConfig>(
    initialWorkspaceSettings?.voiceConfig ?? DEFAULT_VOICE_CONFIG
  );
  const [sfx, setSfx] = useState<SfxConfig>(
    () => initialWorkspaceSettings?.sfx ?? readStoredSfx() ?? DEFAULT_SFX_CONFIG
  );
  const hadStoredSfxAtBootRef = useRef(Boolean(readStoredSfx()));
  const [captionsEnabled, setCaptionsEnabled] = useState(
    initialWorkspaceSettings?.captionsEnabled ?? true
  );
  const [storedCaptionSettings] = useState<StoredCaptionSettings | null>(
    readStoredCaptionSettings
  );
  const [captionStyle, setCaptionStyle] = useState<CaptionAnimationStyle>(
    () => storedCaptionSettings?.style ?? 'word-by-word'
  );
  const [captionColors, setCaptionColors] = useState<CaptionColors>(
    () => storedCaptionSettings?.colors ?? DEFAULT_CAPTION_COLORS
  );
  const [captionBottomOffset, setCaptionBottomOffset] = useState<number>(
    () => storedCaptionSettings?.bottomOffset ?? DEFAULT_CAPTION_BOTTOM_OFFSET
  );
  const [enable25D, setEnable25D] = useState<boolean>(
    () => initialWorkspaceSettings?.enable25D ?? readStoredDepth25D()
  );
  const [cleanBrollMode, setCleanBrollMode] = useState<boolean>(
    initialWorkspaceSettings?.cleanBrollMode ?? false
  );
  const [respectSafeZone, setRespectSafeZone] = useState<boolean>(() => {
    if (typeof initialWorkspaceSettings?.respectSafeZone === 'boolean') {
      return initialWorkspaceSettings.respectSafeZone;
    }
    const stored = readStoredRespectSafeZone();
    const defaultSafeZone = (initialWorkspaceSettings?.aspectRatio ?? '9:16') === '9:16';
    return stored ?? defaultSafeZone;
  });

  const [elVoices, setElVoices] = useState<ElevenLabsVoice[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const [steps, setSteps] = useState<RenderStepState[]>(() => createExportSteps(60, t));
  const [logs, setLogs] = useState<RenderLogEntry[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [renderedVideo, setRenderedVideo] = useState<RenderedVideoResult | null>(null);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [generatedSceneCount, setGeneratedSceneCount] = useState(0);
  const [generatedScenes, setGeneratedScenes] = useState<GeneratedSceneSummary[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [timelineLogsOpen, setTimelineLogsOpen] = useState(false);
  const [workspaceLayout, setWorkspaceLayout] = useState<WorkspaceLayout>(readWorkspaceLayout);
  const [resizingPanel, setResizingPanel] = useState<'left' | 'right' | 'timeline' | null>(null);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const [quickTweakInstruction, setQuickTweakInstruction] = useState('');
  const [quickTweakNotice, setQuickTweakNotice] = useState<string | null>(null);
  const [quickTweakBusy, setQuickTweakBusy] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [renderStartedAt, setRenderStartedAt] = useState<number | null>(null);
  const [renderRemaining, setRenderRemaining] = useState<{
    seconds: number;
    updatedAt: number;
  } | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const exportFailedRef = useRef(false);

  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermissionState>(() => getNotificationPermission());
  const [notificationBannerDismissed, setNotificationBannerDismissed] = useState(false);
  const [toast, setToast] = useState<{
    id: number;
    title: string;
    message: string;
    tone: 'success' | 'error';
  } | null>(null);

  const appendLog = useCallback(
    (step: RenderStepId, level: RenderLogEntry['level'], message: string) => {
      setLogs((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: nowTimeLabel(),
          step,
          level,
          message: stripAnsi(message),
        },
      ]);
    },
    []
  );

  const showToast = useCallback(
    (title: string, message: string, tone: 'success' | 'error' = 'success') => {
      const id = Date.now();
      setToast({ id, title, message, tone });
      window.setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current));
      }, 9000);
    },
    []
  );

  useEffect(() => {
    if (!isRendering) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRendering]);

  const applyApiStatus = useCallback((data: ApiSettingsStatus) => {
    setApiStatus(data);
    if (!data.preferences) return;
    // Local workspace settings are the source of truth on reload. Server
    // preferences only seed defaults on the very first run.
    const useServerPreferences = initialWorkspaceSettings === null;
    if (useServerPreferences) {
      if (data.preferences.provider) setSelectedAiProvider(data.preferences.provider);
      if (data.preferences.modelId) setSelectedAiModel(data.preferences.modelId);
      if (data.preferences.voiceId || data.preferences.voiceModelId) {
        setVoiceConfig((prev) => ({
          ...prev,
          voiceId: data.preferences?.voiceId || prev.voiceId,
          modelId: data.preferences?.voiceModelId || prev.modelId,
          stability: data.preferences?.voiceStability ?? prev.stability,
          similarityBoost:
            data.preferences?.voiceSimilarityBoost ?? prev.similarityBoost,
          style: data.preferences?.voiceStyle ?? prev.style,
          speakerBoost: data.preferences?.voiceSpeakerBoost ?? prev.speakerBoost,
          speed: data.preferences?.voiceSpeed ?? prev.speed,
        }));
      }
      if (data.preferences.aspectRatio) setAspectRatio(data.preferences.aspectRatio);
      if (data.preferences.fps) setFps(data.preferences.fps);
      if (data.preferences.scriptLanguage) {
        setScriptLanguage(normalizeVideoLanguage(data.preferences.scriptLanguage));
      }
      if (data.preferences.brandKit) {
        const preferredBrandKit = data.preferences.brandKit;
        setBrandKit((prev) =>
          hadStoredPaletteAtBootRef.current
            ? {
                ...prev,
                watermark: preferredBrandKit.watermark ?? prev.watermark,
                watermarkEnabled:
                  preferredBrandKit.watermarkEnabled ?? prev.watermarkEnabled,
                watermarkPosition:
                  preferredBrandKit.watermarkPosition ?? prev.watermarkPosition,
              }
            : { ...prev, ...preferredBrandKit }
        );
      }
      if (data.preferences.sfx && !hadStoredSfxAtBootRef.current) {
        setSfx({
          enabled: data.preferences.sfx.enabled,
          volume: data.preferences.sfx.volume,
        });
      }
      if (typeof data.preferences.captionsEnabled === 'boolean') {
        setCaptionsEnabled(data.preferences.captionsEnabled);
      }
      if (typeof data.preferences.respectSafeZone === 'boolean') {
        setRespectSafeZone(data.preferences.respectSafeZone);
      }
    }
    if (data.preferences.captionAnimationStyle) {
      setCaptionStyle(resolveCaptionStyle(data.preferences.captionAnimationStyle));
    }
    if (data.preferences.captionColors) {
      setCaptionColors((prev) => ({
        ...prev,
        ...data.preferences?.captionColors,
      }));
    }
    if (typeof data.preferences.captionBottomOffset === 'number') {
      setCaptionBottomOffset(
        normalizeCaptionBottomOffset(data.preferences.captionBottomOffset)
      );
    }
  }, [initialWorkspaceSettings]);

  const refreshGeneratedScenes = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/generated/status`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        count?: number;
        hasGenerated?: boolean;
        scenes?: Array<{
          id?: string;
          title?: string;
          index?: number;
          component?: string;
          durationSec?: number;
          hasAudio?: boolean;
          exists?: boolean;
        }>;
      };
      const scenes: GeneratedSceneSummary[] = (data.scenes ?? [])
        .filter((scene) => scene.id)
        .map((scene, index) => ({
          id: String(scene.id),
          title: scene.title || `Scene ${scene.index ?? index + 1}`,
          index: Number(scene.index) || index + 1,
          component: scene.component,
          durationSec: Math.max(0.1, Number(scene.durationSec) || 4),
          hasAudio: Boolean(scene.hasAudio),
          exists: scene.exists !== false,
        }));
      setGeneratedScenes(scenes);
      setGeneratedSceneCount(data.hasGenerated ? data.count || scenes.length : scenes.length);
      setSelectedSceneId((prev) =>
        prev && scenes.some((scene) => scene.id === prev) ? prev : scenes[0]?.id ?? null
      );
    } catch {
      // Generated scene status is optional.
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    void refreshGeneratedScenes();
  }, [refreshGeneratedScenes]);

  useEffect(() => {
    if (!voiceConfig.enabled) setCaptionsEnabled(false);
  }, [voiceConfig.enabled]);

  const fetchElevenLabsVoices = useCallback(async (baseUrl: string, token: string) => {
    setLoadingCatalog(true);
    try {
      const headers: Record<string, string> = token ? { 'x-zoedit-session': token } : {};
      const res = await fetch(`${baseUrl}/elevenlabs/voices`, { headers });
      if (!res.ok) return;
      const data = (await res.json()) as { voices?: ElevenLabsVoice[] };
      if (!data.voices) return;
      setElVoices(data.voices);
      setVoiceConfig((prev) =>
        data.voices?.some((voice) => voice.voice_id === prev.voiceId)
          ? prev
          : { ...prev, voiceId: data.voices?.[0]?.voice_id || prev.voiceId }
      );
    } catch {
      // Voice catalog is optional; keep manual/default voice.
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  const handleVoiceImported = useCallback((voice: ElevenLabsVoice) => {
    setElVoices((prev) =>
      prev.some((item) => item.voice_id === voice.voice_id)
        ? prev
        : [voice, ...prev]
    );
    setVoiceConfig((prev) => ({ ...prev, voiceId: voice.voice_id }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/settings`);
        if (res.ok) {
          const data = (await res.json()) as ApiSettingsStatus;
          applyApiStatus(data);
          const token = data.sessionToken || '';
          if (token) setSessionToken(token);
          if (!cancelled) await fetchElevenLabsVoices(apiBaseUrl, token);
        } else {
          await fetchElevenLabsVoices(apiBaseUrl, '');
        }
      } catch {
        await fetchElevenLabsVoices(apiBaseUrl, '');
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PROMPT_STORAGE_KEY, masterPrompt);
    } catch {
      // localStorage can be unavailable in private mode.
    }
  }, [masterPrompt]);

  useEffect(() => {
    if (!lang) return;
    if (masterPrompt === DEFAULT_PROMPT_AR || masterPrompt === DEFAULT_PROMPT_EN) {
      setMasterPrompt(t(DEFAULT_PROMPT_AR, DEFAULT_PROMPT_EN));
    }
  }, [lang, masterPrompt, t]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SCRIPT_STORAGE_KEY, voiceoverScript);
    } catch {
      // localStorage can be unavailable in private mode.
    }
  }, [voiceoverScript]);

  useEffect(() => {
    persistPalette(brandKit);
  }, [brandKit]);

  useEffect(() => {
    persistSfx(sfx);
  }, [sfx]);

  useEffect(() => {
    persistDepth25D(enable25D);
  }, [enable25D]);

  useEffect(() => {
    persistRespectSafeZone(respectSafeZone);
  }, [respectSafeZone]);

  useEffect(() => {
    persistCaptionSettings({
      style: captionStyle,
      colors: captionColors,
      bottomOffset: captionBottomOffset,
    });
  }, [captionStyle, captionColors, captionBottomOffset]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const settings: StoredWorkspaceSettings = {
        targetDuration,
        aspectRatio,
        fps,
        scriptLanguage,
        voiceConfig,
        captionsEnabled,
        sfx,
        enable25D,
        cleanBrollMode,
        respectSafeZone,
        brandKit,
        selectedAiProvider,
        selectedAiModel,
      };
      window.localStorage.setItem(WORKSPACE_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // localStorage can be unavailable in private mode.
    }
  }, [
    targetDuration,
    aspectRatio,
    fps,
    scriptLanguage,
    voiceConfig,
    captionsEnabled,
    sfx,
    enable25D,
    cleanBrollMode,
    respectSafeZone,
    brandKit,
    selectedAiProvider,
    selectedAiModel,
  ]);

  useEffect(() => {
    try {
      window.localStorage.setItem(WORKSPACE_LAYOUT_KEY, JSON.stringify(workspaceLayout));
    } catch {
      // localStorage can be unavailable in private mode.
    }
  }, [workspaceLayout]);

  useEffect(() => {
    const clampToViewport = () => {
      const width = workspaceRef.current?.getBoundingClientRect().width ?? window.innerWidth;
      if (width < 1024) return;
      setWorkspaceLayout((previous) => {
        const leftWidth = Math.min(
          previous.leftWidth,
          Math.max(220, Math.min(560, width - previous.rightWidth - 300)),
        );
        const rightWidth = Math.min(
          previous.rightWidth,
          Math.max(260, Math.min(620, width - leftWidth - 300)),
        );
        return leftWidth === previous.leftWidth && rightWidth === previous.rightWidth
          ? previous
          : { ...previous, leftWidth, rightWidth };
      });
    };
    clampToViewport();
    window.addEventListener('resize', clampToViewport);
    return () => window.removeEventListener('resize', clampToViewport);
  }, []);

  useEffect(() => {
    if (!isRendering) {
      setSteps(createExportSteps(fps, t));
    }
  }, [fps, isRendering, t]);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const handleEnableNotifications = useCallback(async () => {
    primeCompletionAudio();
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      showDesktopNotification(
        t('إشعارات Zoedit Studio مفعّلة', 'Zoedit Studio notifications enabled'),
        t(
          'سنخبرك فور اكتمال تصدير الفيديو.',
          'We will let you know as soon as your video export finishes.'
        ),
        'zoedit-permission'
      );
      showToast(
        t('تم تفعيل الإشعارات', 'Notifications enabled'),
        t(
          'ستصلك رسالة سطح مكتب ونغمة عند اكتمال التصدير.',
          'You will get a desktop alert and a chime when export completes.'
        ),
        'success'
      );
    }
    return permission;
  }, [showToast, t]);

  const handleSaveAndSync = async (keys: SettingsSavePayload) => {
    const res = await fetch(`${apiBaseUrl}/settings/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionToken ? { 'x-zoedit-session': sessionToken } : {}),
      },
      body: JSON.stringify({
        ...keys,
        aiProvider: selectedAiProvider,
        aiModel: selectedAiModel,
        voiceId: voiceConfig.voiceId,
        voiceModelId: voiceConfig.modelId,
        voiceStability: voiceConfig.stability,
        voiceSimilarityBoost: voiceConfig.similarityBoost,
        voiceStyle: voiceConfig.style,
        voiceSpeakerBoost: voiceConfig.speakerBoost,
        voiceSpeed: voiceConfig.speed,
        visualStyle: 'stickman',
        aspectRatio,
        fps,
        scriptLanguage,
        brandKit,
        sfxEnabled: sfx.enabled,
        sfxVolume: sfx.volume,
        sfxMode: 'auto',
        backgroundPreset: 'ai-free',
        captionsEnabled: captionsEnabled && voiceConfig.enabled,
        captionAnimationStyle: captionStyle,
        captionColors,
        captionBottomOffset,
        respectSafeZone,
      }),
    });

    if (!res.ok) {
      throw new Error(
        t('فشل الاتصال بالخادم لحفظ المفاتيح.', 'Could not reach the server to save keys.')
      );
    }

    const data = (await res.json()) as ApiSettingsStatus;
    applyApiStatus(data);
    const activeToken = data.sessionToken || sessionToken;
    if (data.sessionToken) setSessionToken(data.sessionToken);
    await fetchElevenLabsVoices(apiBaseUrl, activeToken);
  };

  const persistAiSelection = useCallback(
    async (provider: AiProviderId, model: string) => {
      try {
        const res = await fetch(`${apiBaseUrl}/settings/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionToken ? { 'x-zoedit-session': sessionToken } : {}),
          },
          body: JSON.stringify({ aiProvider: provider, aiModel: model }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as ApiSettingsStatus;
        if (data.sessionToken) setSessionToken(data.sessionToken);
        setApiStatus((prev) => ({
          ...prev,
          providers: data.providers ?? prev.providers,
          models: data.models ?? prev.models,
          preferences: data.preferences ?? prev.preferences,
        }));
      } catch {
        return;
      }
    },
    [apiBaseUrl, sessionToken]
  );

  const handleChangeAiProvider = (provider: AiProviderId) => {
    setSelectedAiProvider(provider);
    const providerModels = availableModels.filter((model) => model.provider === provider);
    const nextModel = providerModels.some((model) => model.id === selectedAiModel)
      ? selectedAiModel
      : providerModels[0]?.id || '';
    setSelectedAiModel(nextModel);
    void persistAiSelection(provider, nextModel);
  };

  const handleChangeAiModel = (model: AiScriptModelId) => {
    setSelectedAiModel(model);
    void persistAiSelection(selectedAiProvider, model);
  };

  const activeStep = steps.find((step) => step.status === 'active');
  const statusText = isRendering
    ? activeStep?.label || t('جاري التصدير...', 'Exporting...')
    : null;

  const handleGenerateVoiceoverScript = async (options?: { rephrase?: boolean }) => {
    if (isGeneratingScript || isRendering) return;
    const topic = masterPrompt.trim();
    if (!topic) {
      setScriptError(t('اكتب فكرة الفيديو أولاً.', 'Write your video topic first.'));
      return;
    }
    const rephrase = Boolean(options?.rephrase) && Boolean(voiceoverScript.trim());
    setIsGeneratingScript(true);
    setScriptError(null);
    setScriptNotice(null);
    try {
      const res = await fetch(`${apiBaseUrl}/script/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-zoedit-session': sessionToken } : {}),
          'x-zoedit-ui-lang': lang,
        },
        body: JSON.stringify({
          topic,
          provider: selectedAiProvider,
          modelId: selectedAiModel,
          scriptLanguage,
          targetDuration,
          rephrase,
          ...(rephrase ? { previousScript: voiceoverScript } : {}),
        }),
      });
      const payload = (await res.json().catch(() => null)) as
        | {
            script?: string;
            wordCount?: number;
            estimatedDurationSec?: number;
            providerUsed?: string;
            source?: string;
            notice?: string;
            error?: string;
          }
        | null;
      if (!res.ok || !payload?.script) {
        throw new Error(
          payload?.error ||
            t('تعذر توليد السكربت الصوتي.', 'Could not generate the voiceover script.')
        );
      }
      setVoiceoverScript(payload.script);
      const words =
        payload.wordCount ??
        payload.script.trim().split(/\s+/).filter(Boolean).length;
      const seconds =
        payload.estimatedDurationSec ??
        Math.round((words / 2.5) * 10) / 10;
      const provider = payload.providerUsed || payload.source || 'AI';
      setScriptNotice(
        t(
          `تم توليد السكربت الصوتي (${words} كلمة، ~${Math.round(seconds)}s) عبر ${provider}. راجعه وعدّل ثم ابدأ التصدير.`,
          `Voiceover script generated (${words} words, ~${Math.round(seconds)}s) via ${provider}. Review, edit, then export.`
        )
      );
      if (payload.notice) {
        setScriptNotice(`${payload.notice}`);
      }
    } catch (error) {
      setScriptError(
        error instanceof Error
          ? error.message
          : t('تعذر توليد السكربت الصوتي.', 'Could not generate the voiceover script.')
      );
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const isShortDuration = (value: ExportTargetDuration) =>
    value !== 'auto' && Number(value) >= 3 && Number(value) <= 15;

  const handleTargetDurationChange = (value: ExportTargetDuration) => {
    setTargetDuration(value);
    if (!voiceConfig.enabled && isShortDuration(value)) {
      setCleanBrollMode(true);
    }
  };

  const handleVoiceoverChange = (next: VoiceoverConfig) => {
    setVoiceConfig(next);
    if (next.enabled !== voiceConfig.enabled) {
      if (next.enabled) {
        setCleanBrollMode(false);
      } else if (isShortDuration(targetDuration)) {
        setCleanBrollMode(true);
      }
    }
  };

  const handleScriptLanguageChange = (value: ScriptLanguage) => {
    const nextLanguage = normalizeVideoLanguage(value, scriptLanguage);
    setScriptLanguage(nextLanguage);
    if (!voiceConfig.enabled || elVoices.length === 0) return;
    const languageName = getVideoLanguage(nextLanguage).name.toLowerCase();
    const matchingVoice = elVoices.find((voice) => {
      const languages = voice.languages?.length ? voice.languages : [voice.language];
      return languages.some((item) => (item || '').toLowerCase().includes(languageName));
    });
    if (matchingVoice && matchingVoice.voice_id !== voiceConfig.voiceId) {
      setVoiceConfig((prev) => ({ ...prev, voiceId: matchingVoice.voice_id }));
    }
  };

  const handleStartExport = async (options?: { tweakInstruction?: string }) => {
    if (isRendering || !masterPrompt.trim()) return;
    const tweakInstruction = options?.tweakInstruction?.trim() || '';

    primeCompletionAudio();
    if (getNotificationPermission() === 'default') {
      await handleEnableNotifications();
    }

    eventSourceRef.current?.close();
    exportFailedRef.current = false;
    setIsRendering(true);
    setIsCancelling(false);
    setActiveJobId(null);
    setRenderStartedAt(Date.now());
    setRenderRemaining(null);
    setOverallProgress(0);
    setLogs([]);
    setSteps(createExportSteps(fps, t));
    setExportedVideoUrl(null);
    if (tweakInstruction) {
      setQuickTweakBusy(true);
      setQuickTweakNotice(
        t('جاري تطبيق التعديل السريع وإعادة التصدير...', 'Applying the quick tweak and re-rendering...')
      );
    }

    if (renderedVideo?.blobUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(renderedVideo.blobUrl);
    }
    setRenderedVideo(null);

    appendLog(
      'audio',
      'info',
      t(
        `إرسال مهمة التصدير إلى ${apiBaseUrl}/export/start...`,
        `Sending export job to ${apiBaseUrl}/export/start...`
      )
    );
    if (tweakInstruction) {
      appendLog(
        'code',
        'info',
        t(`تعديل سريع: ${tweakInstruction}`, `Quick tweak: ${tweakInstruction}`)
      );
    }

    try {
      const startResp = await fetch(`${apiBaseUrl}/export/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-zoedit-session': sessionToken } : {}),
        },
        body: JSON.stringify({
          prompt: masterPrompt,
          ...(tweakInstruction ? { tweakInstruction } : {}),
          targetDuration,
          aspectRatio,
          fps,
          brandKit,
          palette: {
            background: brandKit.bgColor,
            text: brandKit.textColor,
            primary: brandKit.primaryColor,
            secondary: brandKit.secondaryColor,
            accent: brandKit.accentColor,
          },
          voiceoverEnabled: voiceConfig.enabled,
          cleanBrollMode,
          voiceId: voiceConfig.voiceId,
          modelId: voiceConfig.modelId,
          stability: voiceConfig.stability,
          similarityBoost: voiceConfig.similarityBoost,
          style: voiceConfig.style,
          speakerBoost: voiceConfig.speakerBoost,
          speed: voiceConfig.speed,
          sfxEnabled: sfx.enabled,
          sfxVolume: sfx.volume,
          scriptLanguage,
          language: scriptLanguage,
          captionsEnabled: captionsEnabled && voiceConfig.enabled,
          captionStyle,
          captionColors,
          captionBottomOffset,
          enable25D,
          respectSafeZone,
          voiceoverScript: voiceConfig.enabled ? voiceoverScript.trim() : undefined,
          uiLanguage: lang,
        }),
      });

      if (!startResp.ok) {
        const payload = (await startResp.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          payload?.error ||
            t('تعذر بدء مهمة التصدير على الخادم.', 'Could not start the export job.')
        );
      }

      const startPayload = (await startResp.json()) as { jobId: string };
      const { jobId } = startPayload;
      setActiveJobId(jobId);

      const es = new EventSource(`${apiBaseUrl}/export/stream/${encodeURIComponent(jobId)}`);
      eventSourceRef.current = es;

      es.addEventListener('step', (ev) => {
        const payload = JSON.parse((ev as MessageEvent).data) as {
          step: RenderStepId;
          status: StepStatus;
          progress: number;
        };
        setSteps((prev) =>
          prev.map((step) =>
            step.id === payload.step ? { ...step, status: payload.status } : step
          )
        );
        setOverallProgress(payload.progress);
      });

      es.addEventListener('log', (ev) => {
        const payload = JSON.parse((ev as MessageEvent).data) as {
          step: RenderStepId;
          level: RenderLogEntry['level'];
          message: string;
        };
        appendLog(payload.step, payload.level, payload.message);
      });

      es.addEventListener('time', (ev) => {
        const payload = JSON.parse((ev as MessageEvent).data) as {
          remainingSec?: number;
          updatedAt?: number;
        };
        if (
          typeof payload.remainingSec === 'number' &&
          Number.isFinite(payload.remainingSec)
        ) {
          setRenderRemaining({
            seconds: Math.max(0, payload.remainingSec),
            updatedAt: payload.updatedAt ?? Date.now(),
          });
        }
      });

      es.addEventListener('complete', (ev) => {
        es.close();
        const payload = JSON.parse((ev as MessageEvent).data) as {
          outputUrl?: string | null;
          outputFile?: string | null;
          outputName?: string | null;
          title?: string | null;
          fileSizeBytes?: number;
        };

        setSteps((prev) =>
          prev.map((step) => ({ ...step, status: 'completed' as StepStatus }))
        );
        setOverallProgress(100);
        setRenderStartedAt(null);
        setRenderRemaining(null);
        setIsRendering(false);
        setIsCancelling(false);
        setActiveJobId(null);

        if (!payload.outputUrl) {
          showToast(
            t('اكتمل التصدير بدون ملف', 'Export finished without a file'),
            t(
              'لم يُرجع الخادم رابط الفيديو النهائي.',
              'The server did not return a final video URL.'
            ),
            'error'
          );
          return;
        }

        setExportedVideoUrl(payload.outputUrl);
        setRenderedVideo({
          blobUrl: payload.outputUrl,
          mimeType: 'video/mp4',
          extension: 'mp4',
          fileSizeBytes: payload.fileSizeBytes ?? 0,
          downloadName:
            payload.outputName ||
            payload.outputFile?.split(/[\\/]/).pop() ||
            undefined,
        });
        setHistoryKey((prev) => prev + 1);
        appendLog(
          'render',
          'success',
          t(
            `تم تصدير الفيديو النهائي (${payload.outputFile || 'out/*.mp4'}).`,
            `Final video exported (${payload.outputFile || 'out/*.mp4'}).`
          )
        );
        void usageTracker.refreshAll();
        void refreshGeneratedScenes();
        if (tweakInstruction) {
          setQuickTweakInstruction('');
          setQuickTweakBusy(false);
          setQuickTweakNotice(
            t(
              'تم تطبيق التعديل السريع وإعادة التصدير مع الحفاظ على الصوت الحالي.',
              'Quick tweak applied and re-rendered while reusing the current voiceover.'
            )
          );
        }

        const sizeLabel = payload.fileSizeBytes
          ? `${(payload.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`
          : t('ملف MP4 جاهز', 'MP4 file ready');
        const completionBody = t(
          `تم إنشاء الفيديو النهائي بنجاح (${sizeLabel}). يمكنك الآن معاينته وتحميله.`,
          `Your final video was rendered successfully (${sizeLabel}). You can preview and download it now.`
        );
        playCompletionChime();
        showDesktopNotification(
          t('اكتمل التصدير في Zoedit Studio', 'Zoedit Studio export complete'),
          completionBody,
          'zoedit-render-complete'
        );
        showToast(t('اكتمل تصدير الفيديو', 'Your video export is ready'), completionBody, 'success');
      });

      es.addEventListener('cancelled', (ev) => {
        es.close();
        setIsRendering(false);
        setIsCancelling(false);
        setActiveJobId(null);
        setRenderStartedAt(null);
        setRenderRemaining(null);
        let message = t('تم إيقاف عملية التصدير.', 'Export was cancelled.');
        if (ev instanceof MessageEvent) {
          try {
            const payload = JSON.parse(ev.data) as { message?: string };
            if (payload.message) message = payload.message;
          } catch {
            // Use the generic cancellation message.
          }
        }
        setSteps((prev) =>
          prev.map((step) =>
            step.status === 'active' ? { ...step, status: 'error' as StepStatus } : step
          )
        );
        appendLog('render', 'warn', message);
        showToast(t('تم إيقاف التصدير', 'Export cancelled'), message, 'error');
        if (tweakInstruction) {
          setQuickTweakBusy(false);
          setQuickTweakNotice(
            t('تم إيقاف التعديل السريع.', 'The quick tweak was cancelled.')
          );
        }
      });

      es.addEventListener('error', (ev) => {
        exportFailedRef.current = true;
        es.close();
        setIsRendering(false);
        setIsCancelling(false);
        setActiveJobId(null);
        setRenderStartedAt(null);
        setRenderRemaining(null);
        let message = t('فشلت عملية التصدير.', 'Export failed.');
        if (ev instanceof MessageEvent) {
          try {
            const payload = JSON.parse(ev.data) as { message?: string };
            if (payload.message) message = payload.message;
          } catch {
            // Use the generic error message.
          }
        }
        setSteps((prev) =>
          prev.map((step) =>
            step.status === 'active' ? { ...step, status: 'error' as StepStatus } : step
          )
        );
        appendLog('render', 'error', message);
        showToast(t('تعذر إكمال التصدير', 'Could not complete export'), message, 'error');
        if (tweakInstruction) {
          setQuickTweakBusy(false);
          setQuickTweakNotice(
            t(`تعذر تطبيق التعديل السريع: ${message}`, `Could not apply the quick tweak: ${message}`)
          );
        }
      });

      es.onerror = () => {
        if (exportFailedRef.current) return;
        es.close();
        setIsRendering(false);
        setIsCancelling(false);
        setActiveJobId(null);
        setRenderStartedAt(null);
        setRenderRemaining(null);
        showToast(
          t('انقطع اتصال التصدير', 'Export connection lost'),
          t(
            'تأكد من تشغيل الخادم ثم أعد المحاولة.',
            'Make sure the server is running and try again.'
          ),
          'error'
        );
      };
    } catch (error) {
      setIsRendering(false);
      setIsCancelling(false);
      setActiveJobId(null);
      setRenderStartedAt(null);
      setRenderRemaining(null);
      const message =
        error instanceof Error
          ? error.message
          : t('حدث خطأ غير متوقع أثناء التصدير.', 'An unexpected export error occurred.');
      showToast(t('تعذر بدء التصدير', 'Could not start export'), message, 'error');
      appendLog('audio', 'error', message);
      if (tweakInstruction) {
        setQuickTweakBusy(false);
        setQuickTweakNotice(
          t(`تعذر تطبيق التعديل السريع: ${message}`, `Could not apply the quick tweak: ${message}`)
        );
      }
    }
  };

  const handleCancelExport = async () => {
    if (!isRendering || isCancelling) return;
    setIsCancelling(true);
    appendLog(
      'render',
      'warn',
      t('طلب إيقاف عملية التصدير...', 'Requesting export cancellation...')
    );
    try {
      const res = await fetch(`${apiBaseUrl}/export/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-zoedit-session': sessionToken } : {}),
        },
        body: JSON.stringify({ jobId: activeJobId, uiLanguage: lang }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          payload?.error ||
            t('تعذر إيقاف عملية التصدير.', 'Could not cancel the export.')
        );
      }
      setIsRendering(false);
      setIsCancelling(false);
      setActiveJobId(null);
      setRenderStartedAt(null);
      setRenderRemaining(null);
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      setSteps((prev) =>
        prev.map((step) =>
          step.status === 'active' ? { ...step, status: 'error' as StepStatus } : step
        )
      );
      showToast(
        t('تم إيقاف التصدير', 'Export cancelled'),
        t('تم إيقاف العملية وتحرير جميع عناصر التحكم.', 'The job was stopped and all controls unlocked.'),
        'success'
      );
    } catch (error) {
      setIsCancelling(false);
      const message =
        error instanceof Error
          ? error.message
          : t('تعذر إيقاف عملية التصدير.', 'Could not cancel the export.');
      showToast(t('تعذر الإيقاف', 'Could not cancel'), message, 'error');
    }
  };

  const toggleVoiceover = () => {
    if (isRendering) return;
    const nextEnabled = !voiceConfig.enabled;
    setVoiceConfig((prev) => ({ ...prev, enabled: nextEnabled }));
    if (nextEnabled) {
      setCleanBrollMode(false);
      return;
    }
    setCaptionsEnabled(false);
    if (isShortDuration(targetDuration)) setCleanBrollMode(true);
  };

  const handleSelectTimelineScene = (scene: TimelineScene) => {
    setSelectedSceneId(scene.id);
    if (!exportedVideoUrl) return;
    const target = document.getElementById('studio-main-video') as HTMLVideoElement | null;
    if (!target) return;
    const sceneIndex = generatedScenes.findIndex((item) => item.id === scene.id);
    if (sceneIndex < 0) return;
    const offset = generatedScenes
      .slice(0, sceneIndex)
      .reduce((sum, item) => sum + Math.max(0.1, item.durationSec), 0);
    try {
      target.currentTime = Math.min(offset, Number.isFinite(target.duration) ? target.duration : offset);
      target.focus({ preventScroll: true });
    } catch {
      // Seeking is a best-effort preview enhancement.
    }
  };

  const handleDownloadVideo = () => {
    if (!renderedVideo) return;
    const link = document.createElement('a');
    link.href = renderedVideo.blobUrl;
    link.download =
      renderedVideo.downloadName ||
      `zoedit-studio-${aspectRatio.replace(':', 'x')}-${fps}fps.${renderedVideo.extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const inspectorTabs: Array<{ id: InspectorTabId; label: string; icon: typeof Film }> = [
    { id: 'render', label: t('التصدير والسجل', 'Render & Logs'), icon: ListChecks },
    { id: 'usage', label: t('الاستخدام والرصيد', 'Usage & Balance'), icon: BarChart3 },
  ];

  const mobilePanes: Array<{ id: MobilePaneId; label: string; icon: typeof Film }> = [
    { id: 'tools', label: t('الأدوات', 'Tools'), icon: PanelLeft },
    { id: 'player', label: t('المشغل', 'Player'), icon: MonitorPlay },
    { id: 'inspector', label: t('المفتش', 'Inspector'), icon: SlidersHorizontal },
  ];

  const timelineScenes: TimelineScene[] = generatedScenes.map((scene) => ({
    id: scene.id,
    title: scene.title,
    index: scene.index,
    durationSec: scene.durationSec,
    hasAudio: scene.hasAudio,
  }));

  const workspaceStyle = {
    '--left-pane': `${workspaceLayout.leftWidth}px`,
    '--right-pane': `${workspaceLayout.rightWidth}px`,
    '--timeline-h': `${workspaceLayout.timelineHeight}px`,
  } as CSSProperties;

  const beginPanelResize =
    (panel: 'left' | 'right' | 'timeline') => (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startY = event.clientY;
      const startLayout = workspaceLayout;
      const rect = workspaceRef.current?.getBoundingClientRect();
      const availableWidth = rect?.width ?? window.innerWidth;
      const availableHeight = rect?.height ?? window.innerHeight;
      const previousCursor = document.body.style.cursor;
      const previousSelect = document.body.style.userSelect;
      setResizingPanel(panel);
      document.body.style.cursor = panel === 'timeline' ? 'row-resize' : 'col-resize';
      document.body.style.userSelect = 'none';

      const handleMove = (moveEvent: PointerEvent) => {
        if (panel === 'timeline') {
          const delta = startY - moveEvent.clientY;
          const maxHeight = Math.max(130, availableHeight - 220);
          setWorkspaceLayout((previous) => ({
            ...previous,
            timelineHeight: Math.min(maxHeight, Math.max(110, startLayout.timelineHeight + delta)),
          }));
          return;
        }
        const delta =
          panel === 'left'
            ? isRtl
              ? startX - moveEvent.clientX
              : moveEvent.clientX - startX
            : isRtl
              ? moveEvent.clientX - startX
              : startX - moveEvent.clientX;
        if (panel === 'left') {
          const maxWidth = Math.max(220, Math.min(560, availableWidth - startLayout.rightWidth - 300));
          setWorkspaceLayout((previous) => ({
            ...previous,
            leftWidth: Math.min(maxWidth, Math.max(220, startLayout.leftWidth + delta)),
          }));
        } else {
          const maxWidth = Math.max(260, Math.min(620, availableWidth - startLayout.leftWidth - 300));
          setWorkspaceLayout((previous) => ({
            ...previous,
            rightWidth: Math.min(maxWidth, Math.max(260, startLayout.rightWidth + delta)),
          }));
        }
      };

      const handleUp = () => {
        setResizingPanel(null);
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousSelect;
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleUp);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', handleUp);
    };

  return (
    <div
      id="top"
      dir={dir}
      className="flex h-screen w-full min-w-0 flex-col overflow-hidden bg-[#0B0E14] text-slate-100"
    >
      <TopHeader
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenGuide={() => setGuideOpen(true)}
        onExport={() => void handleStartExport()}
        exportDisabled={isRendering || !masterPrompt.trim()}
        voiceoverEnabled={voiceConfig.enabled}
        onToggleVoiceover={toggleVoiceover}
        projectTotalUsd={usageTracker.usage?.project.totalUsd || 0}
        elevenRemaining={usageTracker.balances?.elevenlabs.remaining}
        elevenConfigured={usageTracker.balances?.elevenlabs.configured}
        elevenHint={usageTracker.balances?.elevenlabs.hint}
        llmRemainingUsd={usageTracker.balances?.llm.remainingUsd}
        llmProvider={usageTracker.balances?.llm.provider}
        balancesLoading={usageTracker.loadingUsage || usageTracker.loadingBalances}
        onRefreshBalances={() => void usageTracker.refreshAll()}
        disabled={isRendering}
      />

      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-white/8 bg-[#080B11] px-2 lg:hidden">
        {mobilePanes.map((pane) => {
          const Icon = pane.icon;
          const active = mobilePane === pane.id;
          return (
            <button
              key={pane.id}
              type="button"
              onClick={() => setMobilePane(pane.id)}
              aria-pressed={active}
              className={`inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md border text-[10px] font-bold transition-colors cursor-pointer ${
                active
                  ? 'border-sky-400/40 bg-sky-500/15 text-sky-100'
                  : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {pane.label}
            </button>
          );
        })}
      </div>

      <main
        ref={workspaceRef}
        style={workspaceStyle}
        className="workspace-main min-h-0 flex-1 w-full min-w-0 overflow-hidden p-2"
      >
        <div className="workspace-columns min-h-0 min-w-0 overflow-hidden">
          <aside
            dir={dir}
            className={`${mobilePane === 'tools' ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0B0E14] lg:flex`}
          >
            <div className="h-full min-h-0 flex-1 overflow-hidden p-2">
              <StudioSidePanel
                providers={availableProviders}
                models={availableModels}
                selectedAiProvider={selectedAiProvider}
                onChangeAiProvider={handleChangeAiProvider}
                selectedAiModel={selectedAiModel}
                onChangeAiModel={handleChangeAiModel}
                onOpenSettings={() => setSettingsOpen(true)}
                masterPrompt={masterPrompt}
                onChangeMasterPrompt={setMasterPrompt}
                brandKit={brandKit}
                onChangeBrandKit={setBrandKit}
                voiceover={voiceConfig}
                onChangeVoiceover={handleVoiceoverChange}
                voices={elVoices}
                loadingVoices={loadingCatalog}
                onRefreshVoices={() => void fetchElevenLabsVoices(apiBaseUrl, sessionToken)}
                onVoiceImported={handleVoiceImported}
                sfx={sfx}
                onChangeSfx={setSfx}
                captionsEnabled={captionsEnabled}
                onChangeCaptionsEnabled={setCaptionsEnabled}
                captionStyle={captionStyle}
                onChangeCaptionStyle={setCaptionStyle}
                captionColors={captionColors}
                onChangeCaptionColors={setCaptionColors}
                captionBottomOffset={captionBottomOffset}
                onChangeCaptionBottomOffset={setCaptionBottomOffset}
                voiceoverScript={voiceoverScript}
                onChangeVoiceoverScript={setVoiceoverScript}
                onGenerateVoiceoverScript={(options) => {
                  void handleGenerateVoiceoverScript(options);
                }}
                isGeneratingScript={isGeneratingScript}
                scriptError={scriptError}
                scriptNotice={scriptNotice}
                apiBaseUrl={apiBaseUrl}
                sessionToken={sessionToken}
                historyKey={historyKey}
                disabled={isRendering}
              />
            </div>
          </aside>

          <PanelResizeHandle
            orientation="vertical"
            active={resizingPanel === 'left'}
            onPointerDown={beginPanelResize('left')}
          />

          <section
            dir={dir}
            className={`${mobilePane === 'player' ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-col gap-2 overflow-hidden lg:flex`}
          >
            <div className="shrink-0">
              <CoreVideoBar
                aspectRatio={aspectRatio}
                onChangeAspectRatio={setAspectRatio}
                scriptLanguage={scriptLanguage}
                onChangeScriptLanguage={handleScriptLanguageChange}
                fps={fps}
                onChangeFps={setFps}
                targetDuration={targetDuration}
                onChangeTargetDuration={handleTargetDurationChange}
                enable25D={enable25D}
                onChangeEnable25D={setEnable25D}
                cleanBrollMode={cleanBrollMode}
                onChangeCleanBrollMode={setCleanBrollMode}
                respectSafeZone={respectSafeZone}
                onChangeRespectSafeZone={setRespectSafeZone}
                brandKit={brandKit}
                onChangeBrandKit={setBrandKit}
                showWatermark={false}
                variant="toolbar"
                disabled={isRendering}
              />
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-[#0B0E14]">
              <MainPreviewPanel
                videoUrl={exportedVideoUrl}
                aspectRatio={aspectRatio}
                fps={fps}
                title={masterPrompt.trim().slice(0, 80)}
                isRendering={isRendering}
                statusText={statusText}
                apiBaseUrl={apiBaseUrl}
                brandKit={brandKit}
                captionStyle={captionStyle}
                captionColors={captionColors}
                captionBottomOffset={captionBottomOffset}
                captionsEnabled={captionsEnabled && voiceConfig.enabled}
                watermarkEnabled={brandKit.watermarkEnabled}
                watermarkText={brandKit.watermark}
                watermarkPosition={brandKit.watermarkPosition ?? 'top-left'}
                respectSafeZone={respectSafeZone}
              />
            </div>

            <div className="shrink-0">
              <QuickTweakPanel
                value={quickTweakInstruction}
                onChange={setQuickTweakInstruction}
                onSubmit={() => {
                  const instruction = quickTweakInstruction.trim();
                  if (!instruction || isRendering || generatedSceneCount === 0) return;
                  void handleStartExport({ tweakInstruction: instruction });
                }}
                sceneCount={generatedSceneCount}
                disabled={isRendering || generatedSceneCount === 0}
                busy={quickTweakBusy}
                notice={quickTweakNotice}
              />
            </div>

            {renderedVideo ? (
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-bold text-emerald-100">
                    {t('الفيديو النهائي جاهز', 'Final video is ready')}
                  </p>
                  <p className="truncate font-mono text-[10px] text-emerald-200/70" dir="ltr">
                    {(renderedVideo.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB · {renderedVideo.extension.toUpperCase()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadVideo}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-black text-emerald-950 transition-colors hover:bg-emerald-300 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  {t('تحميل الفيديو', 'Download Video')}
                </button>
              </div>
            ) : null}
          </section>

          <PanelResizeHandle
            orientation="vertical"
            active={resizingPanel === 'right'}
            onPointerDown={beginPanelResize('right')}
          />

          <aside
            dir={dir}
            className={`${mobilePane === 'inspector' ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0B0E14] lg:flex`}
          >
            <div className="flex shrink-0 items-center gap-1 border-b border-white/8 bg-[#080B11] p-1.5">
              {inspectorTabs.map((item) => {
                const Icon = item.icon;
                const active = inspectorTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setInspectorTab(item.id)}
                    aria-pressed={active}
                    className={`inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-[10px] font-bold transition-colors cursor-pointer ${
                      active
                        ? 'bg-sky-500/15 text-sky-100 ring-1 ring-inset ring-sky-400/30'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-sky-300' : ''}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {inspectorTab === 'render' ? (
                <RenderMonitorPanel
                  steps={steps}
                  logs={logs}
                  overallProgress={overallProgress}
                  isRendering={isRendering}
                  canStart={Boolean(masterPrompt.trim())}
                  onStartRender={() => void handleStartExport()}
                  renderedVideo={renderedVideo}
                  totalDurationSec={targetDuration === 'auto' ? 0 : Number(targetDuration)}
                  totalFrames={targetDuration === 'auto' ? 0 : Number(targetDuration) * fps}
                  fps={fps}
                  aspectRatio={aspectRatio}
                  renderStartedAt={renderStartedAt}
                  renderRemainingSec={renderRemaining?.seconds ?? null}
                  renderRemainingUpdatedAt={renderRemaining?.updatedAt ?? null}
                  onCancelRender={() => void handleCancelExport()}
                  isCancelling={isCancelling}
                  showOutput={false}
                  showStartButton={false}
                />
              ) : null}

              {inspectorTab === 'usage' ? (
                <UsageCostPanel
                  usage={usageTracker.usage}
                  balances={usageTracker.balances}
                  loadingUsage={usageTracker.loadingUsage}
                  loadingBalances={usageTracker.loadingBalances}
                  notice={usageTracker.notice}
                  voiceoverEnabled={voiceConfig.enabled}
                  onRefresh={() => usageTracker.refreshAll()}
                  onReset={() => usageTracker.resetUsage()}
                />
              ) : null}
            </div>
          </aside>
        </div>

        <PanelResizeHandle
          orientation="horizontal"
          active={resizingPanel === 'timeline'}
          onPointerDown={beginPanelResize('timeline')}
        />

        <EditorTimeline
          scenes={timelineScenes}
          selectedSceneId={selectedSceneId}
          onSelectScene={handleSelectTimelineScene}
          voiceoverEnabled={voiceConfig.enabled}
          captionsEnabled={captionsEnabled && voiceConfig.enabled}
          logs={logs}
          logsOpen={timelineLogsOpen}
          onToggleLogs={() => setTimelineLogsOpen((value) => !value)}
          isRendering={isRendering}
        />
      </main>

      {!notificationBannerDismissed ? (
        <div className="fixed bottom-3 end-3 z-40 w-[min(92vw,360px)]">
          <NotificationPermissionBanner
            permission={notificationPermission}
            onEnable={() => void handleEnableNotifications()}
            onDismiss={() => setNotificationBannerDismissed(true)}
          />
        </div>
      ) : null}

      <ApiSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        status={apiStatus}
        providers={availableProviders}
        models={availableModels}
        selectedAiProvider={selectedAiProvider}
        onChangeAiProvider={handleChangeAiProvider}
        selectedAiModel={selectedAiModel}
        onChangeAiModel={setSelectedAiModel}
        apiBaseUrl={apiBaseUrl}
        sessionToken={sessionToken}
        onChangeApiBaseUrl={setApiBaseUrl}
        onSaveAndSync={handleSaveAndSync}
        onOpenSetupGuide={() => {
          setSettingsOpen(false);
          setFooterModal('api');
        }}
      />

      <StudioGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        onOpenInfoModal={(modal) => {
          setGuideOpen(false);
          setFooterModal(modal);
        }}
      />

      <StudioInfoModal modal={footerModal} onClose={() => setFooterModal(null)} />

      {toast ? (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2">
          <div
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur ${
              toast.tone === 'error'
                ? 'border-red-500/40 bg-[#1b0f12]/95'
                : 'border-emerald-500/40 bg-[#0c1712]/95'
            }`}
          >
            {toast.tone === 'error' ? (
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-50">{toast.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-300">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label={t('إغلاق', 'Close')}
              className="rounded-md p-1 text-slate-400 hover:text-slate-100 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
