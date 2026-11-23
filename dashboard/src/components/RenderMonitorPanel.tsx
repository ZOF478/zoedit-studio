import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Film,
  Loader2,
  PlayCircle,
  Square,
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
  canStart: boolean;
  onStartRender: () => void;
  renderedVideo: RenderedVideoResult | null;
  totalDurationSec: number;
  totalFrames: number;
  fps: FpsOption;
  aspectRatio: AspectRatio;
  renderStartedAt: number | null;
  renderRemainingSec?: number | null;
  renderRemainingUpdatedAt?: number | null;
  onCancelRender?: () => void;
  isCancelling?: boolean;
}

export function RenderMonitorPanel({
  steps,
  logs,
  overallProgress,
  isRendering,
  canStart,
  onStartRender,
  renderedVideo,
  totalDurationSec,
  totalFrames,
  fps,
  aspectRatio,
  renderStartedAt,
  renderRemainingSec = null,
  renderRemainingUpdatedAt = null,
  onCancelRender,
  isCancelling = false,
}: RenderMonitorPanelProps) {
  const { t } = useI18n();
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
  const expectedAudioSec = 45;
  const expectedCodeSec = 90;
  const expectedRenderSec = Math.max(30, totalDurationSec * 1.1);
  const progress = Math.min(100, Math.max(0, overallProgress));
  const stageRemainingSec =
    progress < 30
      ? expectedAudioSec * (1 - progress / 30) + expectedCodeSec + expectedRenderSec
      : progress < 70
        ? expectedCodeSec * (1 - (progress - 30) / 40) + expectedRenderSec
        : expectedRenderSec * (1 - (progress - 70) / 30);
  const etaSec =
    isRendering && progress < 100 ? Math.max(0, Math.round(stageRemainingSec)) : null;
  const remainingFresh =
    renderRemainingUpdatedAt !== null && clock - renderRemainingUpdatedAt < 15000;
  const liveRemainingSec =
    remainingFresh && renderRemainingSec !== null && renderRemainingUpdatedAt !== null
      ? Math.max(
          0,
          renderRemainingSec - Math.floor(Math.max(0, clock - renderRemainingUpdatedAt) / 1000)
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
      <div className="rounded-xl border border-white/8 bg-[#10141D] p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/8 pb-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-100">
              {t('بدء تصدير الفيديو', 'Start video export')}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-slate-400" dir="ltr">
              {aspectRatio} @ {fps}fps · {totalDurationSec.toFixed(1)}s ({totalFrames} frames)
            </p>
          </div>

          <button
            type="button"
            disabled={isRendering || !canStart}
            onClick={onStartRender}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
          >
            {isRendering ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Film className="h-4 w-4" />
            )}
            <span>
              {isRendering
                ? t('جاري تصدير الفيديو...', 'Exporting video...')
                : t('بدء تصدير الفيديو', 'Start video export')}
            </span>
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-200">
              {t('تقدم التصدير', 'Export progress')}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono tabular-nums text-sky-300">{overallProgress}%</span>
              {isRendering && onCancelRender ? (
                <button
                  type="button"
                  onClick={onCancelRender}
                  disabled={isCancelling}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/50 bg-red-500/20 px-3 py-1.5 text-[11px] font-bold text-red-100 hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {isCancelling ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Square className="h-3.5 w-3.5 fill-current" />
                  )}
                  {t('إيقاف العملية', 'Cancel export')}
                </button>
              ) : null}
            </div>
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
                {overallProgress >= 100
                  ? t('اكتمل التصدير', 'Export complete')
                  : activeStep?.label || t('جاهز للبدء', 'Ready to start')}
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
                    : t('الوقت المتبقي —', 'Time remaining —')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 pt-2 sm:grid-cols-3">
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
                    'في انتظار بدء التصدير — اضغط على "بدء تصدير الفيديو" لبدء البث المباشر.',
                    'Waiting to start — click "Start video export" to begin the live stream.'
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

      <div id="video-output" className="rounded-xl border border-white/8 bg-[#10141D] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-slate-100">
              {t('ملف الفيديو النهائي', 'Final video file')}
            </h3>
            <p className="text-xs text-slate-400">
              {renderedVideo
                ? t(
                    `ملف جاهز (${(renderedVideo.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB · ${renderedVideo.extension.toUpperCase()})`,
                    `Ready file (${(renderedVideo.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB · ${renderedVideo.extension.toUpperCase()})`
                  )
                : t(
                    'سيظهر الفيديو المصيّر هنا للمعاينة والتحميل فور اكتمال التصدير.',
                    'The rendered video will appear here for preview and download once export completes.'
                  )}
            </p>
          </div>

          <button
            type="button"
            disabled={!renderedVideo}
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            <span>{t('تحميل الفيديو', 'Download video')}</span>
          </button>
        </div>

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
              {t('لم يتم تصدير فيديو بعد', 'No video exported yet')}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
