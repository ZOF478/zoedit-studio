import { Film, Maximize2, Radio } from 'lucide-react';
import { useI18n } from '../i18n';

interface LivePreviewStageProps {
  videoUrl?: string | null;
  aspectRatio: string;
  fps: number;
  title?: string;
  durationSec?: number;
  isRendering?: boolean;
  statusText?: string | null;
}

const ASPECT_RESOLUTIONS: Record<string, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '1:1': { width: 1080, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
};

export function LivePreviewStage({
  videoUrl,
  aspectRatio,
  fps,
  title,
  durationSec = 0,
  isRendering = false,
  statusText,
}: LivePreviewStageProps) {
  const { t } = useI18n();
  const resolution = ASPECT_RESOLUTIONS[aspectRatio] ?? ASPECT_RESOLUTIONS['9:16'];
  const ratio = `${resolution.width} / ${resolution.height}`;

  return (
    <section
      id="live-preview"
      className="flex h-full min-w-0 w-full max-w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0E121A] shadow-[0_24px_70px_-40px_rgba(56,189,248,0.55)]"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-sky-400/30 bg-sky-500/10 text-sky-300">
              <Radio className="h-3.5 w-3.5" />
            </span>
            <h2 className="truncate font-display text-sm font-bold text-slate-100">
              {t('المعاينة الحية', 'Live preview')}
            </h2>
            <span className="hidden items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              LIVE
            </span>
          </div>
          <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400 tabular-nums" dir="ltr">
            {aspectRatio} · {fps}fps
            {durationSec > 0 ? ` · ${durationSec.toFixed(1)}s` : ''}
            {title ? ` · ${title}` : ''}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#0B0E14] px-2.5 py-1 text-[10px] font-semibold text-slate-300">
          <Maximize2 className="h-3 w-3 text-slate-400" />
          {resolution.width}×{resolution.height}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center p-3 sm:p-4">
        <div
          className="flex max-h-[460px] w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#05070C]"
          style={{ aspectRatio: ratio, maxWidth: '100%' }}
        >
          {videoUrl ? (
            <video
              key={videoUrl}
              src={videoUrl}
              controls
              playsInline
              className="h-full w-full bg-black object-contain"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
              {isRendering ? (
                <span className="h-9 w-9 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400" />
              ) : (
                <Film className="h-10 w-10 text-slate-600" />
              )}
              <p className="text-sm font-semibold text-slate-300">
                {isRendering
                  ? statusText || t('جاري تجهيز الفيديو...', 'Preparing your video...')
                  : t('لا يوجد فيديو بعد', 'No video yet')}
              </p>
              <p className="max-w-sm text-xs leading-relaxed text-slate-500">
                {isRendering
                  ? t(
                      'اترك الصفحة مفتوحة — سيظهر الفيديو النهائي هنا تلقائياً.',
                      'Keep this page open — the final video will appear here automatically.'
                    )
                  : t(
                      'اكتب البرومبت واضغط "بدء تصدير الفيديو" ليظهر الفيديو النهائي هنا.',
                      'Write your prompt and click "Start Video Export" to see the final video here.'
                    )}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
