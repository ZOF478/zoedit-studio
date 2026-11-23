import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, TriangleAlert, X } from 'lucide-react';
import { ApiSettingsDrawer } from './components/ApiSettingsDrawer';
import { CoreVideoBar } from './components/CoreVideoBar';
import { MainPreviewPanel } from './components/MainPreviewPanel';
import { NotificationPermissionBanner } from './components/NotificationPermissionBanner';
import { QuickTweakPanel } from './components/QuickTweakPanel';
import { RenderMonitorPanel } from './components/RenderMonitorPanel';
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

const PROMPT_STORAGE_KEY = 'zof-studio-master-prompt-v1';
const SCRIPT_STORAGE_KEY = 'zof-studio-voiceover-script-v1';
const PALETTE_STORAGE_KEY = 'zof-studio-active-palette-v1';
const SFX_STORAGE_KEY = 'zof-studio-sfx-v1';
const DEPTH_25D_STORAGE_KEY = 'zof-studio-depth-25d-v1';
const CAPTION_STORAGE_KEY = 'zof-studio-caption-settings-v1';

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

const DEFAULT_BRAND_KIT: BrandKit = {
  accentColor: '#E77B40',
  bgColor: '#0B0F17',
  textColor: '#F8FAFC',
  primaryColor: '#38BDF8',
  secondaryColor: '#FBBF24',
  watermark: '@ZofStudio',
  watermarkEnabled: true,
  watermarkPosition: 'top-left',
};

const DEFAULT_PROMPT =
  'كيف تصنع فيديوهات تعليمية قصيرة بالذكاء الاصطناعي وتضاعف التفاعل';

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
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
  const { t, dir } = useI18n();
  const defaultBaseUrl =
    typeof window !== 'undefined' && window.location.port === '4789'
      ? 'http://localhost:4789/api'
      : '/api';

  const [apiBaseUrl, setApiBaseUrl] = useState<string>(defaultBaseUrl);
  const [sessionToken, setSessionToken] = useState<string>('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const usageTracker = useStudioUsage(apiBaseUrl, sessionToken);

  const [selectedAiProvider, setSelectedAiProvider] = useState<AiProviderId>('opencode-free');
  const [selectedAiModel, setSelectedAiModel] = useState<AiScriptModelId>(
    'deepseek/deepseek-v4.1-flash:free'
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
    if (typeof window === 'undefined') return DEFAULT_PROMPT;
    return window.localStorage.getItem(PROMPT_STORAGE_KEY) || DEFAULT_PROMPT;
  });
  const [voiceoverScript, setVoiceoverScript] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(SCRIPT_STORAGE_KEY) || '';
  });
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [scriptNotice, setScriptNotice] = useState<string | null>(null);
  const [targetDuration, setTargetDuration] = useState<ExportTargetDuration>('60');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [fps, setFps] = useState<FpsOption>(60);
  const [brandKit, setBrandKit] = useState<BrandKit>(() => ({
    ...DEFAULT_BRAND_KIT,
    ...(readStoredPalette() ?? {}),
  }));
  const hadStoredPaletteAtBootRef = useRef(Boolean(readStoredPalette()));
  const [scriptLanguage, setScriptLanguage] = useState<ScriptLanguage>('ar');
  const [voiceConfig, setVoiceConfig] = useState<VoiceoverConfig>({
    enabled: true,
    modelId: 'eleven_multilingual_v2',
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0,
    speakerBoost: true,
    speed: 1,
  });
  const [sfx, setSfx] = useState<SfxConfig>(
    () => readStoredSfx() ?? DEFAULT_SFX_CONFIG
  );
  const hadStoredSfxAtBootRef = useRef(Boolean(readStoredSfx()));
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
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
  const [enable25D, setEnable25D] = useState<boolean>(() => readStoredDepth25D());
  const [cleanBrollMode, setCleanBrollMode] = useState(false);

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
          message,
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

  const applyApiStatus = useCallback((data: ApiSettingsStatus) => {
    setApiStatus(data);
    if (data.preferences) {
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
    }
  }, []);

  const refreshGeneratedScenes = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/generated/status`);
      if (!res.ok) return;
      const data = (await res.json()) as { count?: number; hasGenerated?: boolean };
      setGeneratedSceneCount(data.hasGenerated ? data.count || 0 : 0);
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
      const headers: Record<string, string> = token ? { 'x-zof-session': token } : {};
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
    persistCaptionSettings({
      style: captionStyle,
      colors: captionColors,
      bottomOffset: captionBottomOffset,
    });
  }, [captionStyle, captionColors, captionBottomOffset]);

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
        t('إشعارات Zof Studio مفعّلة', 'Zof Studio notifications enabled'),
        t(
          'سنخبرك فور اكتمال تصدير الفيديو.',
          'We will let you know as soon as your video export finishes.'
        ),
        'zof-permission'
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
        ...(sessionToken ? { 'x-zof-session': sessionToken } : {}),
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
            ...(sessionToken ? { 'x-zof-session': sessionToken } : {}),
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
          ...(sessionToken ? { 'x-zof-session': sessionToken } : {}),
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
          ...(sessionToken ? { 'x-zof-session': sessionToken } : {}),
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
          voiceoverScript: voiceConfig.enabled ? voiceoverScript.trim() : undefined,
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
          t('اكتمل التصدير في Zof Studio', 'Zof Studio export complete'),
          completionBody,
          'zof-render-complete'
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
          ...(sessionToken ? { 'x-zof-session': sessionToken } : {}),
        },
        body: JSON.stringify({ jobId: activeJobId }),
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

  return (
    <div id="top" dir={dir} className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[#0B0E14] text-slate-100">
      <TopHeader
        onOpenSettings={() => setSettingsOpen(true)}
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

      <main className="mx-auto w-full max-w-[1440px] min-w-0 overflow-x-hidden px-3 py-4 sm:px-5 lg:py-6">
        {!notificationBannerDismissed ? (
          <div className="mb-4 min-w-0">
            <NotificationPermissionBanner
              permission={notificationPermission}
              onEnable={() => void handleEnableNotifications()}
              onDismiss={() => setNotificationBannerDismissed(true)}
            />
          </div>
        ) : null}

        <div className="mb-4 min-w-0">
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
            brandKit={brandKit}
            onChangeBrandKit={setBrandKit}
            disabled={isRendering}
          />
        </div>

        <div
          dir="ltr"
          className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_420px]"
        >
          <div dir={dir} className="min-w-0 w-full max-w-full space-y-4">
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
            />

            {generatedSceneCount > 0 ? (
              <QuickTweakPanel
                value={quickTweakInstruction}
                onChange={setQuickTweakInstruction}
                onSubmit={() => {
                  const instruction = quickTweakInstruction.trim();
                  if (!instruction || isRendering) return;
                  void handleStartExport({ tweakInstruction: instruction });
                }}
                sceneCount={generatedSceneCount}
                disabled={isRendering}
                busy={quickTweakBusy}
                notice={quickTweakNotice}
              />
            ) : null}

            <div className="min-w-0 w-full max-w-full rounded-2xl border border-sky-500/20 bg-[#0D1119] p-3 sm:p-5">
              <RenderMonitorPanel
                steps={steps}
                logs={logs}
                overallProgress={overallProgress}
                isRendering={isRendering}
                canStart={Boolean(masterPrompt.trim())}
                onStartRender={() => void handleStartExport()}
                renderedVideo={renderedVideo}
                totalDurationSec={
                  targetDuration === 'auto' ? 0 : Number(targetDuration)
                }
                totalFrames={
                  targetDuration === 'auto' ? 0 : Number(targetDuration) * fps
                }
                fps={fps}
                aspectRatio={aspectRatio}
                renderStartedAt={renderStartedAt}
                renderRemainingSec={renderRemaining?.seconds ?? null}
                renderRemainingUpdatedAt={renderRemaining?.updatedAt ?? null}
                onCancelRender={() => void handleCancelExport()}
                isCancelling={isCancelling}
              />
            </div>

            <div className="min-w-0 w-full max-w-full rounded-2xl border border-white/8 bg-[#0D1119] p-3 sm:p-5">
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
            </div>
          </div>

          <aside dir={dir} className="min-w-0 w-full max-w-full">
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
          </aside>
        </div>
      </main>

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
      />

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
