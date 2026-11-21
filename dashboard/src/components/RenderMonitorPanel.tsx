import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Film,
  Loader2,
  MonitorPlay,
  PlayCircle,
  Terminal,
} from 'lucide-react';
import { useI18n } from '../i18n';
import type {
  AspectRatio,
  FpsOption,
  RenderLogEntry,
  RenderStepState,
} from '../types/studio';
import type { RenderedVideoResult } from '../utils/remotionRenderer';

interface RenderMonitorPanelProps {
  steps: RenderStepState[];
  logs: RenderLogEntry[];
  overallProgress: number;
  isRendering: boolean;
  onStartRender: () => void;
  renderedVideo: RenderedVideoResult | null;
  totalDurationSec: number;
  totalFrames: number;
  fps: FpsOption;
  aspectRatio: AspectRatio;
  apiBaseUrl: string;
  renderStartedAt: number | null;
  renderRemainingSec?: number | null;
  renderRemainingUpdatedAt?: number | null;
}

export function RenderMonitorPanel({
  steps,
  logs,
  overallProgress,
  isRendering,
  onStartRender,
  renderedVideo,
  totalDurationSec,
  totalFrames,
  fps,
  aspectRatio,
  apiBaseUrl,
  renderStartedAt,
  renderRemainingSec = null,
  renderRemainingUpdatedAt = null,
}: RenderMonitorPanelProps) {
  const { t } = useI18n();
  const [openingStudio, setOpeningStudio] = useState(false);
  const [studioNotice, setStudioNotice] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    if (!isRendering) return;
    setClock(Date.now());
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isRendering]);

  const elapsedSec =
    isRendering && renderStartedAt ? Math.max(0, (clock - renderStartedAt) / 1000) : 0;
  const etaSec =
    isRendering && overallProgress > 3 && overallProgress < 100
      ? Math.max(0, Math.round((elapsedSec * (100 - overallProgress)) / overallProgress))
      : null;
  const remainingFresh =
    renderRemainingUpdatedAt !== null && clock - renderRemainingUpdatedAt < 15000;
  const liveRemainingSec =
    remainingFresh &&
    renderRemainingSec !== null &&
    renderRemainingUpdatedAt !== null
      ? Math.max(
          0,
          renderRemainingSec -
            Math.floor(Math.max(0, clock - renderRemainingUpdatedAt) / 1000)
        )
      : null;
  const displayRemainingSec = isRendering
    ? liveRemainingSec ?? etaSec
    : overallProgress >= 100
      ? 0
      : liveRemainingSec ?? etaSec;
  const formatEta = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${mins}:${String(rest).padStart(2, '0')}`;
  };
  const activeStep =
    steps.find((step) => step.status === 'active') ||
    [...steps].reverse().find((step) => step.status === 'completed') ||
    steps[0];
  const activeStepIndex = Math.max(0, steps.findIndex((step) => step.id === activeStep?.id));
  const lastLog = logs[logs.length - 1];

  const handleOpenStudio = async () => {
    setOpeningStudio(true);
    setStudioNotice(
      t('جاري تشغيل Remotion Studio...', 'Starting Remotion Studio...')
    );
    const studioWindow = window.open('about:blank', '_blank');
    try {
      const res = await fetch(`${apiBaseUrl}/open-remotion-studio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        port?: number;
        running?: boolean;
        started?: boolean;
        error?: string;
      };
      if (!res.ok || data.ok === false || !data.port) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const studioUrl = `http://${window.location.hostname || 'localhost'}:${data.port}`;
      if (studioWindow) {
        studioWindow.location.href = studioUrl;
      } else {
        window.location.href = studioUrl;
      }
      setStudioNotice(
        t(
          `تم فتح Remotion Studio على المنفذ ${data.port}.`,
          `Remotion Studio is opening on port ${data.port}.`
        )
      );
    } catch (error) {
      studioWindow?.close();
      setStudioNotice(
        error instanceof Error
          ? error.message
          : t('تعذر فتح Remotion Studio.', 'Could not open Remotion Studio.')
      );
    } finally {
      setOpeningStudio(false);
    }
  };

  const handleDownload = () => {
    if (!renderedVideo) return;
    const link = document.createElement('a');
    link.href = renderedVideo.blobUrl;
    link.download = `zof-studio-${aspectRatio.replace(':', 'x')}-${fps}fps.${renderedVideo.extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section id="render-monitor" className="space-y-5">
      {/* Action & Summary Strip */}
      <div className="rounded-xl border border-white/8 bg-[#10141D] p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/8 pb-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-100">
              {t('مراقب التصيير المباشر (SSE Pipeline)', 'Live render monitor (SSE pipeline)')}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-slate-400" dir="ltr">
              SSE Stream: {apiBaseUrl}/render/stream · {aspectRatio} @ {fps}fps ·{' '}
              {totalDurationSec.toFixed(1)}s ({totalFrames} frames)
            </p>
          </div>

          <button
            type="button"
            disabled={isRendering}
            onClick={onStartRender}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
          >
            {isRendering ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Film className="h-4 w-4" />
            )}
            <span>
              {isRendering
                ? t('جاري تصيير الفيديو...', 'Rendering video...')
                : t('تصيير الفيديو النهائي', 'Render final video')}
            </span>
          </button>
        </div>

        {/* 4-Step Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">
              {t('التقدم العام للتصيير', 'Overall render progress')}
            </span>
            <span className="font-mono tabular-nums text-sky-300">{overallProgress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#0B0E14]">
            <div
              className="h-full rounded-full bg-sky-500 transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-500/20 bg-sky-500/5 px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-xs">
              {isRendering ? (
                <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
              ) : overallProgress >= 100 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <Clock className="h-4 w-4 text-slate-500" />
              )}
              <span className="font-semibold text-slate-100">
                {t('المرحلة الحالية', 'Current stage')}:{' '}
                {activeStep?.label || t('جاهز للبدء', 'Ready to start')}
              </span>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums" dir="ltr">
                {steps.length > 0 ? `${activeStepIndex + 1}/${steps.length}` : '0/0'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="font-mono tabular-nums" dir="ltr">
                {isRendering
                  ? `${formatEta(Math.round(elapsedSec))} ${t('منقضي', 'elapsed')}`
                  : '—'}
              </span>
              <span
                className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2.5 py-1 font-semibold text-sky-200 tabular-nums"
                dir="rtl"
              >
                {isRendering && displayRemainingSec !== null
                  ? t(
                      `الوقت المتبقي ${formatEta(displayRemainingSec)}`,
                      `Time remaining ${formatEta(displayRemainingSec)}`
                    )
                  : overallProgress >= 100
                    ? t('اكتمل', 'Complete')
                    : isRendering
                      ? t('الوقت المتبقي —', 'Time remaining —')
                      : t('الوقت المتبقي —', 'Time remaining —')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 pt-2 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, idx) => {
              const isActive = step.status === 'active';
              const isDone = step.status === 'completed';
              const isError = step.status === 'error';
              return (
                <div
                  key={step.id}
                  className={`rounded-lg border px-3.5 py-2.5 transition-colors ${
                    isActive
                      ? 'border-sky-400/60 bg-sky-500/10'
                      : isDone
                        ? 'border-emerald-500/40 bg-emerald-500/8'
                        : isError
                          ? 'border-red-500/40 bg-red-500/10'
                          : 'border-white/8 bg-[#0B0E14]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      0{idx + 1}
                    </span>
                    {isActive && <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />}
                    {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                  </div>
                  <div className="mt-1.5 text-xs font-semibold text-slate-100">
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compact status + optional verbose logs */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-300">
              <Terminal className="h-3.5 w-3.5 shrink-0 text-sky-400" />
              <span className="shrink-0">
                {showLogs
                  ? t('سجل العمليات التفصيلي', 'Detailed operation log')
                  : t('آخر تحديث', 'Latest update')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowLogs((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-sky-400/40 hover:text-slate-100 transition-colors cursor-pointer"
            >
              {showLogs ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {showLogs
                ? t('إخفاء السجل التفصيلي', 'Hide detailed logs')
                : t('إظهار السجل التفصيلي', 'Show detailed logs')}
            </button>
          </div>

          {showLogs ? (
            <div className="max-h-44 overflow-y-auto rounded-lg border border-white/8 bg-[#07090E] p-3 font-mono text-xs leading-relaxed">
              {logs.length === 0 ? (
                <div className="text-slate-500">
                  {t(
                    'في انتظار بدء التصيير — اضغط على "تصيير الفيديو النهائي" لبدء البث المباشر.',
                    'Waiting to start — click "Render final video" to begin the live stream.'
                  )}
                </div>
              ) : (
                logs.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2.5 py-0.5">
                    <span className="shrink-0 text-slate-500 tabular-nums" dir="ltr">
                      [{entry.timestamp}]
                    </span>
                    <span
                      className={
                        entry.level === 'success'
                          ? 'text-emerald-300'
                          : entry.level === 'warn'
                            ? 'text-amber-300'
                            : entry.level === 'error'
                              ? 'text-red-400'
                              : 'text-slate-200'
                      }
                    >
                      {entry.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="truncate rounded-lg border border-white/8 bg-[#07090E] px-3 py-2 font-mono text-[11px] text-slate-400">
              {lastLog ? lastLog.message : t('لا توجد سجلات بعد.', 'No logs yet.')}
            </div>
          )}
        </div>
      </div>

      {/* Built-in MP4 Video Player & Download Final Video */}
      <div
        id="video-output"
        className="rounded-xl border border-white/8 bg-[#10141D] p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-slate-100">
              {t('مشغل الفيديو النهائي والمخرجات', 'Final video player & output')}
            </h3>
            <p className="text-xs text-slate-400">
              {renderedVideo
                ? t(
                    `ملف جاهز (${(renderedVideo.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB · ${renderedVideo.extension.toUpperCase()})`,
                    `Ready file (${(renderedVideo.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB · ${renderedVideo.extension.toUpperCase()})`
                  )
                : t(
                    'سيظهر الفيديو المصيّر هنا للمعاينة والتحميل فور اكتمال عملية التصيير.',
                    'The rendered video will appear here for preview and download once rendering completes.'
                  )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleOpenStudio()}
              disabled={openingStudio}
              className="inline-flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/15 px-4 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-500/25 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              {openingStudio ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MonitorPlay className="h-4 w-4" />
              )}
              <span>{t('فتح في Remotion Studio', 'Open in Remotion Studio')}</span>
            </button>
            <button
              type="button"
              disabled={!renderedVideo}
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="h-4 w-4" />
              <span>{t('تحميل الفيديو النهائي', 'Download final video')}</span>
            </button>
          </div>
        </div>

        {studioNotice ? (
          <p className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
            {studioNotice}
          </p>
        ) : null}

        {renderedVideo ? (
          <div className="flex justify-center rounded-lg border border-white/10 bg-[#07090E] p-4">
            <video
              key={renderedVideo.blobUrl}
              src={renderedVideo.blobUrl}
              controls
              playsInline
              className="max-h-[460px] w-auto rounded-lg border border-white/10 bg-black"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/12 bg-[#0B0E14] py-12 text-center">
            <PlayCircle className="h-9 w-9 text-slate-600" />
            <p className="mt-3 text-sm font-medium text-slate-300">
              {t('لم يتم تصيير فيديو نهائي بعد', 'No final video rendered yet')}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {t(
                'أنهِ تعديل المشاهد ثم اضغط على "تصيير الفيديو النهائي" لمعاينة الفيديو وتحميله.',
                'Finish editing scenes, then click "Render final video" to preview and download it.'
              )}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
