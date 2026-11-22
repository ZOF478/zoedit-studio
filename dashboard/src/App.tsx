import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, TriangleAlert, X } from 'lucide-react';
import { ApiSettingsDrawer } from './components/ApiSettingsDrawer';
import { LivePreviewStage } from './components/LivePreviewStage';
import { MediaLibraryPanel } from './components/MediaLibraryPanel';
import { NotificationPermissionBanner } from './components/NotificationPermissionBanner';
import { RenderMonitorPanel } from './components/RenderMonitorPanel';
import { StudioControls } from './components/StudioControls';
import { TopHeader } from './components/TopHeader';
import { UsageCostPanel } from './components/UsageCostPanel';
import { useStudioUsage } from './hooks/useStudioUsage';
import { useI18n } from './i18n';
import { AI_PROVIDERS, AI_SCRIPT_MODELS } from './types/studio';
import type {
  AiProviderId,
  AiScriptModelId,
  ApiSettingsStatus,
  AspectRatio,
  BrandKit,
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
  getNotificationPermission,
  playCompletionChime,
  primeCompletionAudio,
  requestNotificationPermission,
  showDesktopNotification,
  type NotificationPermissionState,
} from './utils/notifications';

type Translator = (ar: string, en: string) => string;

const PROMPT_STORAGE_KEY = 'zof-studio-master-prompt-v1';

const DEFAULT_BRAND_KIT: BrandKit = {
  accentColor: '#E77B40',
  bgColor: '#0B0F17',
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
  const [targetDuration, setTargetDuration] = useState<ExportTargetDuration>('60');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [fps, setFps] = useState<FpsOption>(60);
  const [brandKit, setBrandKit] = useState<BrandKit>(DEFAULT_BRAND_KIT);
  const [scriptLanguage, setScriptLanguage] = useState<ScriptLanguage>('ar');
  const [voiceConfig, setVoiceConfig] = useState<VoiceoverConfig>({
    enabled: true,
    modelId: 'eleven_multilingual_v2',
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    stability: 0.5,
    similarityBoost: 0.75,
  });
  const [sfx, setSfx] = useState<SfxConfig>({ enabled: true, volume: 0.65 });

  const [elVoices, setElVoices] = useState<ElevenLabsVoice[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const [steps, setSteps] = useState<RenderStepState[]>(() => createExportSteps(60, t));
  const [logs, setLogs] = useState<RenderLogEntry[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [renderedVideo, setRenderedVideo] = useState<RenderedVideoResult | null>(null);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
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
        }));
      }
      if (data.preferences.aspectRatio) setAspectRatio(data.preferences.aspectRatio);
      if (data.preferences.fps) setFps(data.preferences.fps);
      if (data.preferences.scriptLanguage) setScriptLanguage(data.preferences.scriptLanguage);
      if (data.preferences.brandKit) {
        setBrandKit((prev) => ({ ...prev, ...data.preferences?.brandKit }));
      }
      if (data.preferences.sfx) {
        setSfx({
          enabled: data.preferences.sfx.enabled,
          volume: data.preferences.sfx.volume,
        });
      }
    }
  }, []);

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
        visualStyle: 'stickman',
        aspectRatio,
        fps,
        scriptLanguage,
        brandKit,
        sfxEnabled: sfx.enabled,
        sfxVolume: sfx.volume,
        sfxMode: 'auto',
        backgroundPreset: 'ai-free',
        captionsEnabled: false,
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

  const handleChangeAiProvider = (provider: AiProviderId) => {
    setSelectedAiProvider(provider);
    const providerModels = availableModels.filter((model) => model.provider === provider);
    if (!providerModels.some((model) => model.id === selectedAiModel)) {
      setSelectedAiModel(providerModels[0]?.id || '');
    }
  };

  const activeStep = steps.find((step) => step.status === 'active');
  const statusText = isRendering
    ? activeStep?.label || t('جاري التصدير...', 'Exporting...')
    : null;

  const handleStartExport = async () => {
    if (isRendering || !masterPrompt.trim()) return;

    primeCompletionAudio();
    if (getNotificationPermission() === 'default') {
      await handleEnableNotifications();
    }

    eventSourceRef.current?.close();
    exportFailedRef.current = false;
    setIsRendering(true);
    setRenderStartedAt(Date.now());
    setRenderRemaining(null);
    setOverallProgress(0);
    setLogs([]);
    setSteps(createExportSteps(fps, t));
    setExportedVideoUrl(null);

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

    try {
      const startResp = await fetch(`${apiBaseUrl}/export/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-zof-session': sessionToken } : {}),
        },
        body: JSON.stringify({
          prompt: masterPrompt,
          targetDuration,
          aspectRatio,
          fps,
          brandKit,
          voiceoverEnabled: voiceConfig.enabled,
          voiceId: voiceConfig.voiceId,
          modelId: voiceConfig.modelId,
          stability: voiceConfig.stability,
          similarityBoost: voiceConfig.similarityBoost,
          sfxEnabled: sfx.enabled,
          sfxVolume: sfx.volume,
          scriptLanguage,
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

      es.addEventListener('error', (ev) => {
        exportFailedRef.current = true;
        es.close();
        setIsRendering(false);
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
      });

      es.onerror = () => {
        if (exportFailedRef.current) return;
        es.close();
        setIsRendering(false);
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
      setRenderStartedAt(null);
      setRenderRemaining(null);
      const message =
        error instanceof Error
          ? error.message
          : t('حدث خطأ غير متوقع أثناء التصدير.', 'An unexpected export error occurred.');
      showToast(t('تعذر بدء التصدير', 'Could not start export'), message, 'error');
      appendLog('audio', 'error', message);
    }
  };

  const toggleVoiceover = () => {
    setVoiceConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
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

        <div
          dir="ltr"
          className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_420px]"
        >
          <div dir={dir} className="min-w-0 w-full max-w-full space-y-4">
            <LivePreviewStage
              videoUrl={exportedVideoUrl}
              aspectRatio={aspectRatio}
              fps={fps}
              title={masterPrompt.trim().slice(0, 80)}
              isRendering={isRendering}
              statusText={statusText}
            />

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

            <MediaLibraryPanel
              apiBaseUrl={apiBaseUrl}
              sessionToken={sessionToken}
              refreshKey={historyKey}
            />
          </div>

          <aside dir={dir} className="min-w-0 w-full max-w-full">
            <StudioControls
              masterPrompt={masterPrompt}
              onChangeMasterPrompt={setMasterPrompt}
              targetDuration={targetDuration}
              onChangeTargetDuration={setTargetDuration}
              aspectRatio={aspectRatio}
              onChangeAspectRatio={setAspectRatio}
              fps={fps}
              onChangeFps={setFps}
              brandKit={brandKit}
              onChangeBrandKit={setBrandKit}
              voiceover={voiceConfig}
              onChangeVoiceover={setVoiceConfig}
              voices={elVoices}
              loadingVoices={loadingCatalog}
              onRefreshVoices={() => void fetchElevenLabsVoices(apiBaseUrl, sessionToken)}
              sfx={sfx}
              onChangeSfx={setSfx}
              scriptLanguage={scriptLanguage}
              onChangeScriptLanguage={setScriptLanguage}
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
