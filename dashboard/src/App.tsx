import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  FileText,
  Gauge,
  TriangleAlert,
  Type,
  X,
} from 'lucide-react';
import { ApiSettingsDrawer } from './components/ApiSettingsDrawer';
import { ConfigSidebar } from './components/ConfigSidebar';
import { LivePreviewStage } from './components/LivePreviewStage';
import { MediaLibraryPanel } from './components/MediaLibraryPanel';
import { PrimaryCommandBar } from './components/PrimaryCommandBar';
import { QuickStyleDock } from './components/QuickStyleDock';
import { NotificationPermissionBanner } from './components/NotificationPermissionBanner';
import { RenderMonitorPanel } from './components/RenderMonitorPanel';
import { SceneEditorList } from './components/SceneEditorList';
import { TopHeader } from './components/TopHeader';
import { UsageCostPanel } from './components/UsageCostPanel';
import { VoiceoverPanel } from './components/VoiceoverPanel';
import { useStudioUsage } from './hooks/useStudioUsage';
import { useI18n } from './i18n';
import { buildPreviewVideoData } from './utils/previewData';
import { AI_PROVIDERS, AI_SCRIPT_MODELS } from './types/studio';
import type {
  AiProviderId,
  AiScriptModelId,
  ApiSettingsStatus,
  AspectRatio,
  BackgroundPresetId,
  BrandKit,
  CaptionAnimationStyle,
  CreativeCodeMode,
  ElevenLabsModel,
  ElevenLabsVoice,
  FpsOption,
  ProjectState,
  RenderLogEntry,
  RenderStepId,
  RenderStepState,
  SceneItem,
  ScriptDepth,
  ScriptLanguage,
  ScriptPacing,
  SettingsSavePayload,
  SfxConfig,
  SfxMode,
  StepStatus,
  StudioTabId,
  UsageDelta,
  VisualStyle,
  VoiceoverConfig,
  WordsPerScreen,
} from './types/studio';
import type { RenderedVideoResult } from './utils/remotionRenderer';
import {
  getNotificationPermission,
  playCompletionChime,
  primeCompletionAudio,
  requestNotificationPermission,
  showDesktopNotification,
  type NotificationPermissionState,
} from './utils/notifications';

type Translator = (ar: string, en: string) => string;

const PROJECT_STORAGE_KEY = 'zof-studio-current-project-v1';

function loadLocalProject(): ProjectState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PROJECT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProjectState>;
    if (!parsed || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) return null;
    return parsed as ProjectState;
  } catch {
    return null;
  }
}

const INITIAL_SCENES: SceneItem[] = [
  {
    id: 'scene-init-1',
    title: 'المشكلة في المونتاج التقليدي',
    narration: 'إنتاج فيديو قصير احترافي كان يستهلك ساعات طويلة من التحريك ومزامنة الصوت يدوياً.',
    pose: 'thinking',
    visualType: 'title-hero',
    visualLabel: 'سير العمل التقليدي',
    visualValue: '4 ساعات لكل دقيقة فيديو',
    durationSec: 4,
    audioStatus: 'idle',
  },
  {
    id: 'scene-init-2',
    title: 'قوة الأتمتة بالذكاء الاصطناعي',
    narration: 'مع Zof Studio، يتحول النص العربي مباشرة إلى مشاهد متزامنة مع تعليق صوتي واقعي وإحصائيات متحركة.',
    pose: 'explaining',
    visualType: 'stat-number',
    visualLabel: 'توفير الوقت الإنتاجي',
    visualValue: '85%',
    durationSec: 4.5,
    audioStatus: 'idle',
  },
  {
    id: 'scene-init-3',
    title: 'جاهز للنشر على كل المنصات',
    narration: 'اختر المقاس المناسب لـ Reels أو YouTube وصدّر الفيديو النهائي بسلاسة تامة بمعدل 60 إطاراً.',
    pose: 'happy',
    visualType: 'bar-chart',
    visualLabel: 'معدل التفاعل',
    visualValue: '3.4× نمو في المشاهدات',
    durationSec: 4,
    audioStatus: 'idle',
  },
];

function createInitialSteps(fps: FpsOption, t: Translator): RenderStepState[] {
  return [
    { id: 'script', label: t('توليد النص والمشاهد', 'Generating script & scenes'), status: 'pending', progress: 0 },
    { id: 'voices', label: t('جلب أصوات ElevenLabs', 'Fetching ElevenLabs voices'), status: 'pending', progress: 0 },
    { id: 'sync', label: t('مزامنة إطارات المشاهد', 'Syncing scene frames'), status: 'pending', progress: 0 },
    {
      id: 'render',
      label: t(`تصيير الفيديو ${fps}fps MP4`, `Rendering ${fps}fps MP4 video`),
      status: 'pending',
      progress: 0,
    },
  ];
}

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

export default function App() {
  const { t, dir } = useI18n();
  const initialProject = useRef<ProjectState | null>(loadLocalProject()).current;
  const hydratedRef = useRef(false);
  const projectSaveTimerRef = useRef<number | null>(null);
  const defaultBaseUrl =
    typeof window !== 'undefined' && window.location.port === '4789'
      ? 'http://localhost:4789/api'
      : '/api';

  const [apiBaseUrl, setApiBaseUrl] = useState<string>(defaultBaseUrl);
  const [sessionToken, setSessionToken] = useState<string>('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<StudioTabId>('script');
  const usageTracker = useStudioUsage(apiBaseUrl, sessionToken);
  const [selectedAiProvider, setSelectedAiProvider] = useState<AiProviderId>(
    initialProject?.aiProvider ?? 'opencode-free'
  );
  const [selectedAiModel, setSelectedAiModel] = useState<AiScriptModelId>(
    initialProject?.aiModel ?? 'deepseek/deepseek-v4.1-flash:free'
  );
  const [apiStatus, setApiStatus] = useState<ApiSettingsStatus>({
    openrouterConfigured: false,
    openrouterMask: '',
    elevenlabsConfigured: false,
    elevenlabsMask: '',
  });
  const availableProviders = apiStatus.providers?.length ? apiStatus.providers : AI_PROVIDERS;
  const availableModels = apiStatus.models?.length ? apiStatus.models : AI_SCRIPT_MODELS;

  const applyApiStatus = useCallback((data: ApiSettingsStatus) => {
    setApiStatus(data);
    if (data.preferences) {
      setSelectedAiProvider(data.preferences.provider);
      if (data.preferences.modelId) setSelectedAiModel(data.preferences.modelId);
      setVoiceConfig((prev) => ({
        ...prev,
        voiceId: data.preferences?.voiceId || prev.voiceId,
        modelId: data.preferences?.voiceModelId || prev.modelId,
        stability: data.preferences?.voiceStability ?? prev.stability,
        similarityBoost: data.preferences?.voiceSimilarityBoost ?? prev.similarityBoost,
      }));
      if (data.preferences.visualStyle) setVisualStyle(data.preferences.visualStyle);
      if (data.preferences.aspectRatio) setAspectRatio(data.preferences.aspectRatio);
      if (data.preferences.fps) setFps(data.preferences.fps);
      if (data.preferences.scriptLanguage) setScriptLanguage(data.preferences.scriptLanguage);
      if (data.preferences.scriptDepth) setScriptDepth(data.preferences.scriptDepth);
      if (data.preferences.creativeCodeMode)
        setCreativeCodeMode(data.preferences.creativeCodeMode);
      if (data.preferences.scriptPacing) setScriptPacing(data.preferences.scriptPacing);
      if (data.preferences.captionAnimationStyle)
        setCaptionAnimationStyle(data.preferences.captionAnimationStyle);
      if (data.preferences.wordsPerScreen)
        setWordsPerScreen(data.preferences.wordsPerScreen);
      if (typeof data.preferences.captionsEnabled === 'boolean')
        setCaptionsEnabled(data.preferences.captionsEnabled);
      if (data.preferences.brandKit) setBrandKit(data.preferences.brandKit);
      if (data.preferences.sfx) {
        setSfx({
          enabled: data.preferences.sfx.enabled,
          volume: data.preferences.sfx.volume,
        });
      }
      if (data.preferences.sfxMode) setSfxMode(data.preferences.sfxMode);
      if (data.preferences.backgroundPreset) setBackgroundPreset(data.preferences.backgroundPreset);
    }
  }, []);

  const handleChangeAiProvider = (provider: AiProviderId) => {
    setSelectedAiProvider(provider);
    const providerModels = availableModels.filter((model) => model.provider === provider);
    if (!providerModels.some((model) => model.id === selectedAiModel)) {
      setSelectedAiModel(providerModels[0]?.id || '');
    }
  };

  // Video & Sound Configuration
  const initialFps = initialProject?.fps ?? 60;
  const initialScenes =
    initialProject?.scenes && initialProject.scenes.length > 0
      ? initialProject.scenes
      : INITIAL_SCENES;
  const [topic, setTopic] = useState(
    initialProject?.topic ??
      'كيف تصنع فيديوهات تعليمية قصيرة بالذكاء الاصطناعي وتضاعف التفاعل'
  );
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptNotice, setScriptNotice] = useState<string | null>(null);
  const [visualStyle, setVisualStyle] = useState<VisualStyle>(
    initialProject?.visualStyle ?? 'stickman'
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    initialProject?.aspectRatio ?? '9:16'
  );
  const [fps, setFps] = useState<FpsOption>(initialFps);
  const [brandKit, setBrandKit] = useState<BrandKit>(
    initialProject?.brandKit ?? {
      accentColor: '#E77B40',
      bgColor: '#0B0F17',
      watermark: '@ZofStudio',
      watermarkEnabled: true,
      watermarkPosition: 'top-left',
    }
  );
  const [scriptLanguage, setScriptLanguage] = useState<ScriptLanguage>(
    initialProject?.scriptLanguage ?? 'ar'
  );
  const [sfx, setSfx] = useState<SfxConfig>({
    enabled: initialProject?.sfxEnabled ?? true,
    volume: initialProject?.sfxVolume ?? 0.65,
  });
  const [sfxMode, setSfxMode] = useState<SfxMode>(initialProject?.sfxMode ?? 'auto');
  const [backgroundPreset, setBackgroundPreset] = useState<BackgroundPresetId>(
    initialProject?.backgroundPreset ?? 'ai-free'
  );
  const [scriptDepth, setScriptDepth] = useState<ScriptDepth>(
    initialProject?.scriptDepth ?? 'analytical'
  );
  const [creativeCodeMode, setCreativeCodeMode] = useState<CreativeCodeMode>(
    initialProject?.creativeCodeMode ?? 'creative'
  );
  const [scriptPacing, setScriptPacing] = useState<ScriptPacing>(
    initialProject?.scriptPacing ?? 'fast'
  );
  const [captionAnimationStyle, setCaptionAnimationStyle] =
    useState<CaptionAnimationStyle>(initialProject?.captionAnimationStyle ?? 'auto');
  const [wordsPerScreen, setWordsPerScreen] = useState<WordsPerScreen>(
    initialProject?.wordsPerScreen ?? 'auto'
  );
  const [captionsEnabled, setCaptionsEnabled] = useState(
    initialProject?.captionsEnabled ?? true
  );

  // ElevenLabs Voiceover Studio
  const [voiceConfig, setVoiceConfig] = useState<VoiceoverConfig>({
    enabled: initialProject?.voiceoverEnabled ?? true,
    modelId: initialProject?.voiceModelId ?? 'eleven_multilingual_v2',
    voiceId: initialProject?.voiceId ?? 'pNInz6obpgDQGcFmaJgB',
    stability: initialProject?.voiceStability ?? 0.5,
    similarityBoost: initialProject?.voiceSimilarityBoost ?? 0.75,
  });
  const [elModels, setElModels] = useState<ElevenLabsModel[]>([]);
  const [elVoices, setElVoices] = useState<ElevenLabsVoice[]>([]);
  const [modelsSource, setModelsSource] = useState<'live' | 'catalog'>('catalog');
  const [voicesSource, setVoicesSource] = useState<'live' | 'catalog'>('catalog');
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Scenes
  const [scenes, setScenes] = useState<SceneItem[]>(initialScenes);
  const [selectedSceneId, setSelectedSceneId] = useState<string>(
    initialProject?.selectedSceneId || initialScenes[0].id
  );
  const [suggestingSceneId, setSuggestingSceneId] = useState<string | null>(null);
  const [previewSecond, setPreviewSecond] = useState(0);
  const [previewSeekRequest, setPreviewSeekRequest] = useState<{
    second: number;
    token: number;
  } | null>(null);
  const [isSmartEditing, setIsSmartEditing] = useState(false);
  const [smartEditNotice, setSmartEditNotice] = useState<string | null>(null);

  // Render Monitor
  const [steps, setSteps] = useState<RenderStepState[]>(() => createInitialSteps(initialFps, t));
  const [logs, setLogs] = useState<RenderLogEntry[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [renderedVideo, setRenderedVideo] = useState<RenderedVideoResult | null>(null);
  const [renderStartedAt, setRenderStartedAt] = useState<number | null>(null);
  const [renderRemaining, setRenderRemaining] = useState<{
    seconds: number;
    updatedAt: number;
  } | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
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

  const handleEnableNotifications = useCallback(async () => {
    primeCompletionAudio();
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      showDesktopNotification(
        t('إشعارات Zof Studio مفعّلة', 'Zof Studio notifications enabled'),
        t(
          'سنخبرك فور اكتمال تصيير الفيديو.',
          'We will let you know as soon as your video render finishes.'
        ),
        'zof-permission'
      );
      showToast(
        t('تم تفعيل الإشعارات', 'Notifications enabled'),
        t('ستصلك رسالة سطح مكتب ونغمة عند اكتمال التصيير.', 'You will get a desktop alert and a chime when rendering completes.'),
        'success'
      );
    } else if (permission === 'denied') {
      showToast(
        t('الإشعارات محظورة', 'Notifications blocked'),
        t(
          'اسمح بالإشعارات من إعدادات المتصفح لتفعيل التنبيهات.',
          'Allow notifications from your browser settings to enable alerts.'
        ),
        'error'
      );
    }
    return permission;
  }, [showToast, t]);

  const applyProject = useCallback((project: ProjectState) => {
    if (!project || !Array.isArray(project.scenes) || project.scenes.length === 0) return;
    if (project.aiProvider) setSelectedAiProvider(project.aiProvider);
    if (project.aiModel) setSelectedAiModel(project.aiModel);
    setTopic(project.topic || '');
    setScenes(
      project.scenes.map((scene) => {
        const audioSrc = scene.audioSrc?.replace(/^\/+/, '');
        return audioSrc && !scene.audioDataUrl
          ? { ...scene, audioDataUrl: `/${audioSrc}` }
          : scene;
      })
    );
    setVisualStyle(project.visualStyle || 'stickman');
    setAspectRatio(project.aspectRatio || '9:16');
    setFps(project.fps === 30 ? 30 : 60);
    setBrandKit(project.brandKit || {
      accentColor: '#E77B40',
      bgColor: '#0B0F17',
      watermark: '@ZofStudio',
      watermarkEnabled: true,
      watermarkPosition: 'top-left',
    });
    setScriptLanguage(project.scriptLanguage === 'en' ? 'en' : 'ar');
    setSfx({
      enabled: project.sfxEnabled !== false,
      volume: typeof project.sfxVolume === 'number' ? project.sfxVolume : 0.65,
    });
    setSfxMode(project.sfxMode === 'manual' ? 'manual' : 'auto');
    setBackgroundPreset(project.backgroundPreset ?? 'ai-free');
    setScriptDepth(project.scriptDepth ?? 'analytical');
    setCreativeCodeMode(project.creativeCodeMode ?? 'creative');
    setScriptPacing(project.scriptPacing ?? 'fast');
    setCaptionAnimationStyle(project.captionAnimationStyle ?? 'auto');
    setWordsPerScreen(project.wordsPerScreen ?? 'auto');
    setCaptionsEnabled(project.captionsEnabled ?? true);
    setVoiceConfig({
      enabled: project.voiceoverEnabled !== false,
      modelId: project.voiceModelId || 'eleven_multilingual_v2',
      voiceId: project.voiceId || 'pNInz6obpgDQGcFmaJgB',
      stability: typeof project.voiceStability === 'number' ? project.voiceStability : 0.5,
      similarityBoost:
        typeof project.voiceSimilarityBoost === 'number' ? project.voiceSimilarityBoost : 0.75,
    });
    setSelectedSceneId(
      project.selectedSceneId &&
        project.scenes.some((scene) => scene.id === project.selectedSceneId)
        ? project.selectedSceneId
        : project.scenes[0].id
    );
  }, []);

  const buildProjectSnapshot = useCallback(
    (): ProjectState => ({
      topic,
      scenes,
      aiProvider: selectedAiProvider,
      aiModel: selectedAiModel,
      voiceId: voiceConfig.voiceId,
      voiceModelId: voiceConfig.modelId,
      voiceStability: voiceConfig.stability,
      voiceSimilarityBoost: voiceConfig.similarityBoost,
      voiceoverEnabled: voiceConfig.enabled,
      visualStyle,
      aspectRatio,
      fps,
      scriptLanguage,
      scriptDepth,
      creativeCodeMode,
      scriptPacing,
      captionAnimationStyle,
      wordsPerScreen,
      captionsEnabled,
      brandKit,
      sfxEnabled: sfx.enabled,
      sfxVolume: sfx.volume,
      sfxMode,
      backgroundPreset,
      selectedSceneId,
      updatedAt: Date.now(),
    }),
    [
      topic,
      scenes,
      selectedAiProvider,
      selectedAiModel,
      voiceConfig,
      visualStyle,
      aspectRatio,
      fps,
      scriptLanguage,
      scriptDepth,
      creativeCodeMode,
      scriptPacing,
      captionAnimationStyle,
      wordsPerScreen,
      captionsEnabled,
      brandKit,
      sfx,
      sfxMode,
      backgroundPreset,
      selectedSceneId,
    ]
  );

  const fetchElevenLabsCatalog = useCallback(
    async (baseUrl: string, token: string) => {
      setLoadingCatalog(true);
      try {
        const headers: Record<string, string> = token ? { 'x-zof-session': token } : {};
        const [modelsRes, voicesRes] = await Promise.all([
          fetch(`${baseUrl}/elevenlabs/models`, { headers }),
          fetch(`${baseUrl}/elevenlabs/voices`, { headers }),
        ]);

        if (modelsRes.ok) {
          const mData = (await modelsRes.json()) as {
            source: 'live' | 'catalog';
            models: ElevenLabsModel[];
          };
          setElModels(mData.models);
          setModelsSource(mData.source);
          if (mData.models.length > 0) {
            setVoiceConfig((prev) =>
              mData.models.some((m) => m.model_id === prev.modelId)
                ? prev
                : { ...prev, modelId: mData.models[0].model_id }
            );
          }
        }

        if (voicesRes.ok) {
          const vData = (await voicesRes.json()) as {
            source: 'live' | 'catalog';
            voices: ElevenLabsVoice[];
          };
          setElVoices(vData.voices);
          setVoicesSource(vData.source);
          if (vData.voices.length > 0) {
            setVoiceConfig((prev) =>
              vData.voices.some((v) => v.voice_id === prev.voiceId)
                ? prev
                : { ...prev, voiceId: vData.voices[0].voice_id }
            );
          }
        }
      } catch {
        // Silent fallback if endpoint unreachable
      } finally {
        setLoadingCatalog(false);
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      let nextToken = '';
      try {
        const res = await fetch(`${apiBaseUrl}/settings`);
        if (res.ok) {
          const data = (await res.json()) as ApiSettingsStatus;
          applyApiStatus(data);
          nextToken = data.sessionToken || '';
          if (data.sessionToken) setSessionToken(data.sessionToken);
          await fetchElevenLabsCatalog(apiBaseUrl, nextToken);
        } else {
          await fetchElevenLabsCatalog(apiBaseUrl, nextToken);
        }
      } catch {
        await fetchElevenLabsCatalog(apiBaseUrl, nextToken);
      }

      const local = loadLocalProject();
      let serverProject: ProjectState | null = null;
      try {
        const projectRes = await fetch(`${apiBaseUrl}/project`);
        if (projectRes.ok) {
          const payload = (await projectRes.json()) as { project?: ProjectState | null };
          serverProject = payload.project || null;
        }
      } catch {
        serverProject = null;
      }

      if (cancelled) return;
      const serverTime = serverProject?.updatedAt || 0;
      const localTime = local?.updatedAt || 0;
      const chosen =
        serverProject && serverTime >= localTime ? serverProject : local || serverProject;
      if (chosen) applyProject(chosen);

      if (local && (!serverProject || localTime > serverTime)) {
        void fetch(`${apiBaseUrl}/project`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project: local }),
        }).catch(() => undefined);
      }
      hydratedRef.current = true;
    };
    void init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const project = buildProjectSnapshot();
    try {
      window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    } catch {
      // localStorage can be unavailable in private mode.
    }
    if (projectSaveTimerRef.current) {
      window.clearTimeout(projectSaveTimerRef.current);
    }
    const timer = window.setTimeout(() => {
      void fetch(`${apiBaseUrl}/project`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-zof-session': sessionToken } : {}),
        },
        body: JSON.stringify({ project }),
      }).catch(() => undefined);
    }, 700);
    projectSaveTimerRef.current = timer;
    return () => window.clearTimeout(timer);
  }, [apiBaseUrl, buildProjectSnapshot, sessionToken]);

  useEffect(() => {
    if (!voiceConfig.enabled) {
      setCaptionsEnabled(false);
    }
  }, [voiceConfig.enabled]);

  useEffect(() => {
    const syncPermission = () => setNotificationPermission(getNotificationPermission());
    window.addEventListener('focus', syncPermission);
    document.addEventListener('visibilitychange', syncPermission);
    return () => {
      window.removeEventListener('focus', syncPermission);
      document.removeEventListener('visibilitychange', syncPermission);
    };
  }, []);

  useEffect(() => {
    if (!isRendering) {
      setSteps(createInitialSteps(fps, t));
    }
  }, [fps, isRendering, t]);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

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
        visualStyle,
        aspectRatio,
        fps,
        scriptLanguage,
        scriptDepth,
        creativeCodeMode,
        scriptPacing,
        captionAnimationStyle,
        wordsPerScreen,
        captionsEnabled,
        brandKit,
        sfxEnabled: sfx.enabled,
        sfxVolume: sfx.volume,
        sfxMode,
        backgroundPreset,
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
    await fetchElevenLabsCatalog(apiBaseUrl, activeToken);
  };

  const handleVoiceImported = useCallback((voice: ElevenLabsVoice) => {
    setElVoices((prev) =>
      prev.some((item) => item.voice_id === voice.voice_id) ? prev : [voice, ...prev]
    );
    setVoicesSource('live');
    setVoiceConfig((prev) => ({ ...prev, voiceId: voice.voice_id }));
  }, []);

  const handleGenerateScript = async () => {
    if (!topic.trim()) return;
    setIsGeneratingScript(true);
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
          visualStyle,
          aspectRatio,
          scriptLanguage,
          scriptDepth,
          creativeCodeMode,
          scriptPacing,
          backgroundPreset,
          brandKit,
          voiceoverEnabled: voiceConfig.enabled,
          captionsEnabled: voiceConfig.enabled && captionsEnabled,
          sfxEnabled: sfx.enabled,
          sfxVolume: sfx.volume,
        }),
      });

      const data = (await res.json()) as {
        scenes?: SceneItem[];
        notice?: string;
        error?: string;
        source?: string;
        providerUsed?: string;
        modelUsed?: string;
        fallbackUsed?: boolean;
        usage?: UsageDelta;
        design?: {
          accentColor?: string;
          bgColor?: string;
          secondaryColor?: string;
          highlightColor?: string;
          mood?: string;
          seed?: number;
        };
      };

      if (!res.ok || !data.scenes) {
        setScriptNotice(
          data.error ||
            t('تعذر توليد السكربت حالياً.', 'Could not generate the script right now.')
        );
        return;
      }

      setScenes(data.scenes);
      setSelectedSceneId(data.scenes[0]?.id || '');
      usageTracker.applyDelta(data.usage);
      void usageTracker.refreshUsage();
      if (data.design && backgroundPreset === 'ai-free') {
        setBrandKit((prev) => ({
          ...prev,
          accentColor: data.design?.accentColor || prev.accentColor,
          bgColor: data.design?.bgColor || prev.bgColor,
        }));
      }
      if (data.notice) {
        setScriptNotice(data.notice);
      } else {
        const via = data.providerUsed ? ` · ${data.providerUsed}` : '';
        setScriptNotice(
          t(
            `تم توليد ${data.scenes.length} مشاهد بنجاح${via}.`,
            `Generated ${data.scenes.length} scenes successfully${via}.`
          )
        );
      }
    } catch {
      setScriptNotice(
        t('تعذر الاتصال بخادم توليد النصوص.', 'Could not reach the script generation server.')
      );
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleUpdateScene = (id: string, patch: Partial<SceneItem>) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleAddScene = () => {
    const newScene: SceneItem = {
      id: `scene-${Date.now()}`,
      title: t(`مشهد إضافي ${scenes.length + 1}`, `Extra scene ${scenes.length + 1}`),
      narration: t(
        'أضف نص التعليق الصوتي لهذا المشهد هنا.',
        'Add the voiceover narration for this scene here.'
      ),
      pose: 'explaining',
      visualType: 'stat-number',
      visualLabel: t('نقطة رئيسية', 'Key point'),
      visualValue: t('جديد', 'New'),
      durationSec: 4,
      audioStatus: 'idle',
    };
    setScenes((prev) => [...prev, newScene]);
    setSelectedSceneId(newScene.id);
  };

  const handleDeleteScene = (id: string) => {
    setScenes((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (selectedSceneId === id && next.length > 0) {
        setSelectedSceneId(next[0].id);
      }
      return next;
    });
  };

  const handleRegenerateSceneAudio = async (scene: SceneItem) => {
    if (!voiceConfig.enabled) {
      setScriptNotice(
        t(
          'الوضع الصامت مفعّل — لن يتم توليد صوت أو استهلاك رصيد ElevenLabs.',
          'Silent mode is on — no voice will be generated and no ElevenLabs credits will be used.'
        )
      );
      return;
    }
    handleUpdateScene(scene.id, { audioStatus: 'generating' });
    try {
      const res = await fetch(`${apiBaseUrl}/elevenlabs/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-zof-session': sessionToken } : {}),
        },
        body: JSON.stringify({
          text: scene.narration,
          voiceId: voiceConfig.voiceId,
          modelId: voiceConfig.modelId,
          stability: voiceConfig.stability,
          similarityBoost: voiceConfig.similarityBoost,
          voiceoverEnabled: voiceConfig.enabled,
        }),
      });

      const data = (await res.json()) as {
        audioDataUrl?: string | null;
        source?: 'elevenlabs' | 'browser-tts' | 'none';
        durationEstimateSec?: number;
        usage?: UsageDelta;
      };
      usageTracker.applyDelta(data.usage);
      void usageTracker.refreshUsage();

      if (data.audioDataUrl) {
        handleUpdateScene(scene.id, {
          audioDataUrl: data.audioDataUrl,
          audioSource: 'elevenlabs',
          audioStatus: 'ready',
          durationSec: data.durationEstimateSec || scene.durationSec,
        });
      } else {
        handleUpdateScene(scene.id, {
          audioDataUrl: null,
          audioSource: 'browser-tts',
          audioStatus: 'fallback',
        });
      }
    } catch {
      handleUpdateScene(scene.id, { audioStatus: 'fallback' });
    }
  };

  const handleGenerateSceneSfx = async (
    scene: SceneItem,
    prompt: string
  ): Promise<string | null> => {
    handleUpdateScene(scene.id, { sfxStatus: 'generating', sfxPrompt: prompt });
    try {
      const res = await fetch(`${apiBaseUrl}/elevenlabs/sfx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-zof-session': sessionToken } : {}),
        },
        body: JSON.stringify({
          prompt,
          durationSeconds: Math.min(22, Math.max(0.5, scene.durationSec)),
        }),
      });

      const data = (await res.json()) as {
        sfxUrl?: string;
        error?: string;
        notice?: string;
      };

      if (!res.ok || !data.sfxUrl) {
        handleUpdateScene(scene.id, { sfxStatus: 'error' });
        return (
          data.error ||
          data.notice ||
          t('تعذر توليد المؤثر الصوتي المخصص.', 'Could not generate the custom sound effect.')
        );
      }

      handleUpdateScene(scene.id, {
        sfxId: data.sfxUrl,
        sfxCustomUrl: data.sfxUrl,
        sfxPrompt: prompt,
        sfxStatus: 'ready',
      });
      return null;
    } catch {
      handleUpdateScene(scene.id, { sfxStatus: 'error' });
      return t(
        'تعذر الاتصال بخدمة ElevenLabs لتوليد المؤثر الصوتي.',
        'Could not reach ElevenLabs to generate the sound effect.'
      );
    }
  };

  const handleStartRender = async () => {
    if (isRendering || scenes.length === 0) return;

    primeCompletionAudio();
    if (getNotificationPermission() === 'default') {
      await handleEnableNotifications();
    }

    eventSourceRef.current?.close();
    setIsRendering(true);
    setRenderStartedAt(Date.now());
    setRenderRemaining(null);
    setOverallProgress(0);
    setLogs([]);
    setSteps(createInitialSteps(fps, t));

    if (renderedVideo?.blobUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(renderedVideo.blobUrl);
    }
    setRenderedVideo(null);

    appendLog(
      'script',
      'info',
      t(
        `إرسال مهمة التصيير إلى ${apiBaseUrl}/render/start...`,
        `Sending render job to ${apiBaseUrl}/render/start...`
      )
    );

    try {
      const startResp = await fetch(`${apiBaseUrl}/render/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-zof-session': sessionToken } : {}),
        },
        body: JSON.stringify({
          topic,
          scenes,
          visualStyle,
          aspectRatio,
          fps,
          voiceoverEnabled: voiceConfig.enabled,
          voiceId: voiceConfig.voiceId,
          modelId: voiceConfig.modelId,
          stability: voiceConfig.stability,
          similarityBoost: voiceConfig.similarityBoost,
          sfxEnabled: sfx.enabled,
          sfxVolume: sfx.volume,
          sfxMode,
          backgroundPreset,
          brandKit,
          scriptLanguage,
          scriptDepth,
          creativeCodeMode,
          scriptPacing,
          captionAnimationStyle,
          wordsPerScreen,
          captionsEnabled: voiceConfig.enabled && captionsEnabled,
        }),
      });

      if (!startResp.ok) {
        throw new Error(
          t('تعذر بدء مهمة التصيير على الخادم.', 'Could not start the render job on the server.')
        );
      }

      const startPayload = (await startResp.json()) as {
        jobId: string;
        usage?: UsageDelta;
      };
      usageTracker.applyDelta(startPayload.usage);
      void usageTracker.refreshUsage();
      const { jobId } = startPayload;

      try {
        const syncedProject = await fetch(`${apiBaseUrl}/project`, {
          headers: sessionToken ? { 'x-zof-session': sessionToken } : {},
        });
        if (syncedProject.ok) {
          const payload = (await syncedProject.json()) as { project?: ProjectState | null };
          if (payload.project) applyProject(payload.project);
        }
      } catch {
        // Rendering can continue even if the project refresh fails.
      }

      const es = new EventSource(`${apiBaseUrl}/render/stream/${encodeURIComponent(jobId)}`);
      eventSourceRef.current = es;

      es.addEventListener('step', (ev) => {
        const payload = JSON.parse((ev as MessageEvent).data) as {
          step: RenderStepId;
          status: StepStatus;
          progress: number;
        };
        setSteps((prev) =>
          prev.map((s) =>
            s.id === payload.step ? { ...s, status: payload.status } : s
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
          prev.map((s) => (s.id === 'render' ? { ...s, status: 'completed' } : s))
        );
        setOverallProgress(100);
        setRenderStartedAt(null);
        setRenderRemaining(null);

        if (!payload.outputUrl) {
          setSteps((prev) =>
            prev.map((s) => (s.id === 'render' ? { ...s, status: 'error' } : s))
          );
          appendLog(
            'render',
            'error',
            t('اكتمل التصيير بدون إرجاع رابط للملف النهائي.', 'Render finished without an output URL.')
          );
          setIsRendering(false);
          showToast(
            t('اكتمل التصيير بدون ملف', 'Render finished without a file'),
            t(
              'لم يُرجع الخادم رابط الفيديو النهائي.',
              'The server did not return a final video URL.'
            ),
            'error'
          );
          return;
        }

        setRenderedVideo({
          blobUrl: payload.outputUrl,
          mimeType: 'video/mp4',
          extension: 'mp4',
          fileSizeBytes: payload.fileSizeBytes ?? 0,
        });
        appendLog(
          'render',
          'success',
          t(
            `تم تصيير الفيديو الحقيقي عبر Remotion (${payload.outputFile || 'out/*.mp4'}).`,
            `Real Remotion video rendered (${payload.outputFile || 'out/*.mp4'}).`
          )
        );
        setIsRendering(false);
        void usageTracker.refreshAll();

        const sizeLabel = payload.fileSizeBytes
          ? `${(payload.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`
          : t('ملف MP4 جاهز', 'MP4 file ready');
        const completionTitle = t('اكتمل تصيير الفيديو 🎬', 'Your video render is ready 🎬');
        const completionBody = t(
          `تم إنشاء الفيديو النهائي بنجاح (${sizeLabel}). يمكنك الآن معاينته وتحميله.`,
          `Your final video was rendered successfully (${sizeLabel}). You can preview and download it now.`
        );
        playCompletionChime();
        showDesktopNotification(
          t('اكتمل التصيير في Zof Studio', 'Zof Studio render complete'),
          completionBody,
          'zof-render-complete'
        );
        showToast(completionTitle, completionBody, 'success');
      });

      es.onerror = () => {
        es.close();
        setIsRendering(false);
        setRenderStartedAt(null);
        setRenderRemaining(null);
        showToast(
          t('انقطع اتصال التصيير', 'Render connection lost'),
          t(
            'تأكد من تشغيل الخادم ثم أعد المحاولة.',
            'Make sure the server is running and try again.'
          ),
          'error'
        );
        appendLog(
          'render',
          'error',
          t(
            `انقطع اتصال SSE مع ${apiBaseUrl}. تأكد من تشغيل الخادم أو التحويل إلى /api.`,
            `SSE connection to ${apiBaseUrl} was lost. Make sure the server is running.`
          )
        );
      };
    } catch (err) {
      setIsRendering(false);
      setRenderStartedAt(null);
      setRenderRemaining(null);
      const message =
        err instanceof Error
          ? err.message
          : t('حدث خطأ غير متوقع أثناء التصيير.', 'An unexpected rendering error occurred.');
      showToast(t('تعذر بدء التصيير', 'Could not start rendering'), message, 'error');
      appendLog('script', 'error', message);
    }
  };

  const handleSuggestCustomVisual = async (scene: SceneItem) => {
    const prompt = scene.visualPrompt?.trim();
    if (!prompt) return;

    setSuggestingSceneId(scene.id);
    try {
      const res = await fetch(`${apiBaseUrl}/visual/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-zof-session': sessionToken } : {}),
        },
        body: JSON.stringify({
          prompt,
          topic,
          modelId: selectedAiModel,
          scriptLanguage,
        }),
      });

      const data = (await res.json()) as {
        suggestion?: {
          title?: string;
          text?: string;
          svg?: string;
        };
        usage?: UsageDelta;
        error?: string;
      };
      usageTracker.applyDelta(data.usage);
      void usageTracker.refreshUsage();

      if (!res.ok || !data.suggestion) {
        setScriptNotice(data.error || t('تعذر توليد اقتراح بصري حالياً.', 'Could not generate a visual suggestion.'));
        return;
      }

      handleUpdateScene(scene.id, {
        visualLabel: data.suggestion.title || scene.visualLabel,
        visualValue: data.suggestion.text || scene.visualValue,
        visualSvg: data.suggestion.svg || scene.visualSvg,
      });
      setScriptNotice(t('تم توليد اقتراح بصري مخصص بالذكاء الاصطناعي.', 'AI custom visual suggestion generated.'));
    } catch {
      setScriptNotice(t('تعذر الاتصال بخادم اقتراح العناصر البصرية.', 'Could not reach the visual suggestion server.'));
    } finally {
      setSuggestingSceneId(null);
    }
  };

  const handleSmartEdit = async (request: {
    startSecond: number;
    endSecond: number;
    targetSceneId?: string;
    instruction: string;
  }): Promise<boolean> => {
    if (!request.instruction.trim()) {
      setSmartEditNotice(
        t('اكتب التعديل المطلوب لهذا الجزء فقط أولاً.', 'Write the edit instruction for this segment first.')
      );
      return false;
    }
    setIsSmartEditing(true);
    setSmartEditNotice(null);
    try {
      const res = await fetch(`${apiBaseUrl}/scenes/smart-edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-zof-session': sessionToken } : {}),
        },
        body: JSON.stringify({
          scenes,
          startSecond: request.startSecond,
          endSecond: request.endSecond,
          targetSceneId: request.targetSceneId,
          instruction: request.instruction,
          visualStyle,
          brandKit,
          language: scriptLanguage,
          aspectRatio,
          voiceoverEnabled: voiceConfig.enabled,
          sfxEnabled: sfx.enabled,
          provider: selectedAiProvider,
          modelId: selectedAiModel,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        scenes?: SceneItem[];
        targetSceneIds?: string[];
        startSecond?: number;
        endSecond?: number;
        error?: string;
        details?: string[];
        notice?: string;
        usage?: UsageDelta;
      };

      usageTracker.applyDelta(data.usage);
      void usageTracker.refreshUsage();

      if (!res.ok || !data.scenes) {
        const detail = data.details?.length ? ` ${data.details[0]}` : '';
        setSmartEditNotice(
          `${data.error || t('تعذر تطبيق التعديل الجزئي.', 'Could not apply the surgical edit.')}${detail}`
        );
        return false;
      }

      setScenes(data.scenes);
      const nextTarget =
        data.targetSceneIds?.[0] ||
        request.targetSceneId ||
        data.scenes[0]?.id ||
        selectedSceneId;
      if (data.scenes.some((scene) => scene.id === nextTarget)) {
        setSelectedSceneId(nextTarget);
      }
      const seekSecond =
        typeof data.startSecond === 'number'
          ? data.startSecond
          : request.startSecond;
      setPreviewSeekRequest({ second: seekSecond, token: Date.now() });
      setSmartEditNotice(
        data.notice ||
          t(
            'تم تطبيق التعديل الجزئي مع الحفاظ على بقية المشاهد.',
            'Surgical edit applied while preserving all other scenes.'
          )
      );
      return true;
    } catch {
      setSmartEditNotice(
        t(
          'تعذر الاتصال بخادم التعديل الجزئي.',
          'Could not reach the surgical edit server.'
        )
      );
      return false;
    } finally {
      setIsSmartEditing(false);
    }
  };

  const selectedSceneIndex = Math.max(
    0,
    scenes.findIndex((s) => s.id === selectedSceneId)
  );
  const selectedScene = scenes[selectedSceneIndex] || scenes[0];

  const totalDurationSec = useMemo(
    () => scenes.reduce((acc, s) => acc + s.durationSec, 0),
    [scenes]
  );
  const totalFrames = useMemo(
    () =>
      scenes.reduce(
        (total, scene) => total + Math.max(1, Math.round(scene.durationSec * fps)),
        0
      ),
    [scenes, fps]
  );

  const previewData = useMemo(
    () =>
      buildPreviewVideoData({
        scenes,
        topic,
        visualStyle,
        aspectRatio,
        fps,
        scriptLanguage,
        scriptDepth,
        creativeCodeMode,
        scriptPacing,
        captionAnimationStyle,
        wordsPerScreen,
        captionsEnabled: captionsEnabled && voiceConfig.enabled,
        brandKit,
        sfxEnabled: sfx.enabled,
        sfxVolume: sfx.volume,
        backgroundPreset,
        voiceoverEnabled: voiceConfig.enabled,
      }),
    [
      scenes,
      topic,
      visualStyle,
      aspectRatio,
      fps,
      scriptLanguage,
      scriptDepth,
      creativeCodeMode,
      scriptPacing,
      captionAnimationStyle,
      wordsPerScreen,
      captionsEnabled,
      voiceConfig.enabled,
      brandKit,
      sfx.enabled,
      sfx.volume,
      backgroundPreset,
      voiceConfig.enabled,
    ]
  );

  const tabs: Array<{ id: StudioTabId; label: string; icon: typeof FileText }> = [
    { id: 'script', label: t('الصوت والإيقاع', 'Voice & Pacing'), icon: FileText },
    { id: 'captions', label: t('الكابشن والمؤثرات', 'Captions & SFX'), icon: Type },
    { id: 'usage', label: t('الاستهلاك والتصدير', 'Usage & Export'), icon: Gauge },
  ];

  return (
    <div id="top" dir={dir} className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[#0B0E14] text-slate-100">
      <TopHeader
        onOpenSettings={() => setSettingsOpen(true)}
        voiceoverEnabled={voiceConfig.enabled}
        onToggleVoiceover={() =>
          setVoiceConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
        }
        projectTotalUsd={usageTracker.usage?.project.totalUsd || 0}
        elevenRemaining={usageTracker.balances?.elevenlabs.remaining}
        elevenConfigured={usageTracker.balances?.elevenlabs.configured}
        elevenHint={usageTracker.balances?.elevenlabs.hint}
        llmRemainingUsd={usageTracker.balances?.llm.remainingUsd}
        llmProvider={usageTracker.balances?.llm.provider}
        balancesLoading={usageTracker.loadingUsage || usageTracker.loadingBalances}
        onRefreshBalances={() => void usageTracker.refreshAll()}
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

        <PrimaryCommandBar
          topic={topic}
          onChangeTopic={setTopic}
          onGenerateScript={handleGenerateScript}
          isGeneratingScript={isGeneratingScript}
          scriptNotice={scriptNotice}
          voiceoverEnabled={voiceConfig.enabled}
          onToggleVoiceover={() =>
            setVoiceConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
          }
          aspectRatio={aspectRatio}
          onChangeAspectRatio={setAspectRatio}
          fps={fps}
          onChangeFps={setFps}
          brandKit={brandKit}
          onChangeBrandKit={setBrandKit}
        />

        <div
          dir="ltr"
          className="mt-4 grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"
        >
          <div dir={dir} className="min-w-0 w-full max-w-full space-y-4">
            <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div className="h-full min-w-0 w-full max-w-full">
                <LivePreviewStage
                  data={previewData}
                  scenes={scenes}
                  fps={fps}
                  aspectRatio={aspectRatio}
                  durationInFrames={totalFrames}
                  totalDurationSec={totalDurationSec}
                  selectedSceneId={selectedScene?.id || ''}
                  onSelectScene={setSelectedSceneId}
                  voiceoverEnabled={voiceConfig.enabled}
                  captionsEnabled={captionsEnabled && voiceConfig.enabled}
                  visualStyle={visualStyle}
                  backgroundPreset={backgroundPreset}
                  brandKit={brandKit}
                  captionAnimationStyle={captionAnimationStyle}
                  wordsPerScreen={wordsPerScreen}
                  scriptLanguage={scriptLanguage}
                  onTimeUpdate={setPreviewSecond}
                  seekRequest={previewSeekRequest}
                />
              </div>
              <QuickStyleDock
                visualStyle={visualStyle}
                onChangeVisualStyle={setVisualStyle}
                brandKit={brandKit}
                onChangeBrandKit={setBrandKit}
                backgroundPreset={backgroundPreset}
                onChangeBackgroundPreset={setBackgroundPreset}
              />
            </div>

            <div className="min-w-0 w-full max-w-full rounded-2xl border border-sky-500/20 bg-[#0D1119] p-3 sm:p-5">
              <RenderMonitorPanel
                steps={steps}
                logs={logs}
                overallProgress={overallProgress}
                isRendering={isRendering}
                onStartRender={() => void handleStartRender()}
                renderedVideo={renderedVideo}
                totalDurationSec={totalDurationSec}
                totalFrames={totalFrames}
                fps={fps}
                aspectRatio={aspectRatio}
                apiBaseUrl={apiBaseUrl}
                renderStartedAt={renderStartedAt}
                renderRemainingSec={renderRemaining?.seconds ?? null}
                renderRemainingUpdatedAt={renderRemaining?.updatedAt ?? null}
              />
            </div>

            <div className="min-w-0 w-full max-w-full rounded-2xl border border-white/8 bg-[#0D1119] p-3 sm:p-5">
              <SceneEditorList
                scenes={scenes}
                selectedSceneId={selectedScene?.id || ''}
                onSelectScene={setSelectedSceneId}
                onUpdateScene={handleUpdateScene}
                onAddScene={handleAddScene}
                onDeleteScene={handleDeleteScene}
                onRegenerateSceneAudio={handleRegenerateSceneAudio}
                onSuggestVisual={handleSuggestCustomVisual}
                onGenerateSceneSfx={handleGenerateSceneSfx}
                suggestingSceneId={suggestingSceneId}
                fps={fps}
                sfxVolume={sfx.volume}
                sfxMode={sfxMode}
                elevenlabsConfigured={apiStatus.elevenlabsConfigured}
                voiceoverEnabled={voiceConfig.enabled}
                currentSecond={previewSecond}
                isSmartEditing={isSmartEditing}
                smartEditNotice={smartEditNotice}
                onApplySmartEdit={handleSmartEdit}
              />
            </div>

            <MediaLibraryPanel apiBaseUrl={apiBaseUrl} sessionToken={sessionToken} />
          </div>

          <aside
            dir={dir}
            className="min-w-0 w-full max-w-full overflow-x-hidden rounded-2xl border border-white/10 bg-[#0E121A] shadow-[0_18px_60px_-45px_rgba(148,163,184,0.7)]"
          >
            <div className="border-b border-white/8 bg-[#0B0E14] p-1.5">
              <div className="mb-1 flex min-w-0 items-center gap-2 px-2 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                <h2 className="min-w-0 truncate font-display text-[11px] font-bold text-slate-200">
                  {t('الإعدادات المتقدمة', 'Advanced settings')}
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      aria-pressed={active}
                      className={`inline-flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'bg-sky-500 text-slate-950'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0 truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-w-0 overflow-y-auto overflow-x-hidden p-3">
              <ConfigSidebar
                activeTab={activeTab}
                topic={topic}
                onChangeTopic={setTopic}
                onGenerateScript={handleGenerateScript}
                isGeneratingScript={isGeneratingScript}
                scriptNotice={scriptNotice}
                visualStyle={visualStyle}
                onChangeVisualStyle={setVisualStyle}
                aspectRatio={aspectRatio}
                onChangeAspectRatio={setAspectRatio}
                fps={fps}
                onChangeFps={setFps}
                brandKit={brandKit}
                onChangeBrandKit={setBrandKit}
                sfx={sfx}
                onChangeSfx={setSfx}
                sfxMode={sfxMode}
                onChangeSfxMode={setSfxMode}
                backgroundPreset={backgroundPreset}
                onChangeBackgroundPreset={setBackgroundPreset}
                scriptLanguage={scriptLanguage}
                onChangeScriptLanguage={setScriptLanguage}
                scriptDepth={scriptDepth}
                onChangeScriptDepth={setScriptDepth}
                creativeCodeMode={creativeCodeMode}
                onChangeCreativeCodeMode={setCreativeCodeMode}
                scriptPacing={scriptPacing}
                onChangeScriptPacing={setScriptPacing}
                captionAnimationStyle={captionAnimationStyle}
                onChangeCaptionAnimationStyle={setCaptionAnimationStyle}
                wordsPerScreen={wordsPerScreen}
                onChangeWordsPerScreen={setWordsPerScreen}
                captionsEnabled={captionsEnabled && voiceConfig.enabled}
                onChangeCaptionsEnabled={setCaptionsEnabled}
                voiceoverEnabled={voiceConfig.enabled}
                onToggleVoiceover={() =>
                  setVoiceConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
                }
                voiceoverSlot={
                  activeTab === 'script' ? (
                    <VoiceoverPanel
                      config={voiceConfig}
                      onChangeConfig={setVoiceConfig}
                      models={elModels}
                      voices={elVoices}
                      modelsSource={modelsSource}
                      voicesSource={voicesSource}
                      loadingCatalog={loadingCatalog}
                      onRefreshCatalog={() =>
                        void fetchElevenLabsCatalog(apiBaseUrl, sessionToken)
                      }
                      onVoiceImported={handleVoiceImported}
                      apiBaseUrl={apiBaseUrl}
                      sessionToken={sessionToken}
                    />
                  ) : undefined
                }
              />

              {activeTab === 'usage' ? (
                <div className="mt-4 min-w-0 space-y-4">
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
              ) : null}
            </div>
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
