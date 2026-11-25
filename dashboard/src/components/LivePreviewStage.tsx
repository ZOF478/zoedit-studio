import { useEffect, useState } from 'react';
import { Film, ExternalLink, Loader2, Maximize2, MonitorPlay, Radio, Square } from 'lucide-react';
import { useI18n } from '../i18n';
import {
  SafeZoneOverlay,
  SafeZoneSwitcher,
  type SafeZoneMode,
} from './SafeZoneOverlay';
import {
  PREVIEW_ASPECT_RESOLUTIONS,
  PreviewStageShell,
} from './PreviewStageShell';

interface LivePreviewStageProps {
  videoUrl?: string | null;
  aspectRatio: string;
  fps: number;
  title?: string;
  durationSec?: number;
  isRendering?: boolean;
  statusText?: string | null;
  apiBaseUrl?: string;
  embedded?: boolean;
}

export function LivePreviewStage({
  videoUrl,
  aspectRatio,
  fps,
  title,
  durationSec = 0,
  isRendering = false,
  statusText,
  apiBaseUrl = '/api',
  embedded = false,
}: LivePreviewStageProps) {
  const { t } = useI18n();
  const resolution = PREVIEW_ASPECT_RESOLUTIONS[aspectRatio] ?? PREVIEW_ASPECT_RESOLUTIONS['9:16'];
  const isPortrait = aspectRatio === '9:16';
  const [frameMode, setFrameMode] = useState<SafeZoneMode>('none');
  const [studioRunning, setStudioRunning] = useState(false);
  const [studioStarting, setStudioStarting] = useState(false);
  const [studioBusy, setStudioBusy] = useState(false);
  const [studioNotice, setStudioNotice] = useState<string | null>(null);
  const [studioError, setStudioError] = useState(false);
  const studioLauncherUrl = `${apiBaseUrl.replace(/\/api\/?$/, '')}/studio`;

  useEffect(() => {
    let cancelled = false;
    const checkStudio = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/remotion-studio/status`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          running?: boolean;
          starting?: boolean;
          error?: string;
          port?: number;
          url?: string;
        };
        if (cancelled) return;
        setStudioRunning(Boolean(data.running));
        setStudioStarting(Boolean(data.running ? false : data.starting));
        if (data.running && data.port) {
          // A live Studio answers for itself — drop any stale recovery error.
          setStudioError(false);
        }
        if (data.error) {
          setStudioNotice(data.error);
          setStudioError(true);
        }
      } catch {
        // Studio status is optional; the start button still works.
      }
    };
    void checkStudio();
    const timer = window.setInterval(() => void checkStudio(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [apiBaseUrl]);

  const showPopupMessage = (win: Window | null, title: string, body: string) => {
    if (!win) return;
    try {
      win.document.title = 'Remotion Studio';
      const container = win.document.body;
      container.style.cssText =
        'margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:#090d16;color:#E2E8F0;font-family:system-ui,sans-serif;padding:24px;text-align:center;';
      const heading = win.document.createElement('h1');
      heading.textContent = title;
      heading.style.cssText = 'font-size:18px;margin:0;';
      const paragraph = win.document.createElement('p');
      paragraph.textContent = body;
      paragraph.style.cssText = 'font-size:13px;line-height:1.6;margin:0;max-width:520px;color:#94A3B8;';
      container.replaceChildren(heading, paragraph);
    } catch {
      // Cross-origin or already-closed popup: nothing to update.
    }
  };

  function resolveStudioUrl(port: number, serverUrl?: string) {
    const hostname = window.location.hostname || 'localhost';
    if (serverUrl && (hostname === 'localhost' || hostname === '127.0.0.1')) {
      return serverUrl;
    }
    return `http://${hostname}:${port}`;
  }

  const handleOpenStudio = async () => {
    if (isRendering || studioBusy) return;
    setStudioBusy(true);
    setStudioNotice(
      t('جاري تشغيل Remotion Studio...', 'Starting Remotion Studio...')
    );
    setStudioError(false);
    const studioWindow = window.open('', '_blank');
    showPopupMessage(
      studioWindow,
      t('جاري تشغيل Remotion Studio', 'Starting Remotion Studio'),
      t(
        'يتم تجهيز الاستوديو، سيتم تحويلك تلقائياً خلال لحظات.',
        'Preparing the studio — you will be redirected automatically in a moment.'
      )
    );
    try {
      const res = await fetch(`${apiBaseUrl}/remotion-studio/start`, { method: 'POST' });
      const data = (await res.json()) as {
        ok?: boolean;
        port?: number;
        url?: string;
        running?: boolean;
        recovered?: boolean;
        external?: boolean;
        error?: string;
      };
      if (!res.ok || data.ok === false || !data.port) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      if (studioWindow) {
        studioWindow.location.replace(studioLauncherUrl);
      } else {
        window.open(studioLauncherUrl, '_blank');
      }
      setStudioRunning(true);
      setStudioError(false);
      setStudioNotice(
        data.recovered
          ? t(
              `تم استعادة Studio وإعادة تشغيله على المنفذ ${data.port}.`,
              `Remotion Studio was recovered and restarted on port ${data.port}.`
            )
          : data.external
            ? t(
                `يوجد Studio يعمل مسبقاً على المنفذ ${data.port} وتم فتحه.`,
                `An existing Remotion Studio on port ${data.port} was opened.`
              )
            : t(
                `Remotion Studio يعمل على المنفذ ${data.port}.`,
                `Remotion Studio is running on port ${data.port}.`
              )
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('تعذر فتح Remotion Studio.', 'Could not open Remotion Studio.');
      setStudioError(true);
      setStudioNotice(message);
      showPopupMessage(
        studioWindow,
        t('تعذر فتح Remotion Studio', 'Could not open Remotion Studio'),
        message
      );
    } finally {
      setStudioBusy(false);
    }
  };

  const handleStopStudio = async () => {
    if (studioBusy) return;
    setStudioBusy(true);
    try {
      const res = await fetch(`${apiBaseUrl}/remotion-studio/stop`, { method: 'POST' });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setStudioRunning(false);
      setStudioError(false);
      setStudioNotice(t('تم إيقاف Remotion Studio.', 'Remotion Studio stopped.'));
    } catch (error) {
      setStudioError(true);
      setStudioNotice(
        error instanceof Error
          ? error.message
          : t('تعذر إيقاف Remotion Studio.', 'Could not stop Remotion Studio.')
      );
    } finally {
      setStudioBusy(false);
    }
  };

  return (
    <PreviewStageShell
      title={t('المعاينة الحية', 'Live preview')}
      icon={
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-sky-400/30 bg-sky-500/10 text-sky-300">
          <Radio className="h-3.5 w-3.5" />
        </span>
      }
      live
      metadata={
        <>
          {aspectRatio} · {fps}fps
          {durationSec > 0 ? ` · ${durationSec.toFixed(1)}s` : ''}
          {title ? ` · ${title}` : ''}
        </>
      }
      notice={studioNotice}
      noticeTone={studioError ? 'error' : 'info'}
      aspectRatio={aspectRatio}
      embedded={embedded}
      actions={
        <>
          <button
            type="button"
            onClick={() => void handleOpenStudio()}
            disabled={isRendering || studioBusy || studioStarting}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-sky-200 transition-colors hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {studioBusy || studioStarting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MonitorPlay className="h-3.5 w-3.5" />
            )}
            <span>
              {studioStarting
                ? t('جاري تشغيل Studio...', 'Starting Studio...')
                : t('فتح Remotion Studio', 'Open Remotion Studio')}
            </span>
          </button>
          {studioRunning ? (
            <a
              href={studioLauncherUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20"
            >
              <ExternalLink className="h-3 w-3" />
              <span>{t('فتح في تبويب', 'Open in tab')}</span>
            </a>
          ) : null}
          {studioRunning ? (
            <button
              type="button"
              onClick={() => void handleStopStudio()}
              disabled={studioBusy}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-red-200 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Square className="h-3 w-3" />
              <span>{t('إيقاف Studio', 'Stop Studio')}</span>
            </button>
          ) : null}
          <SafeZoneSwitcher mode={frameMode} onChange={setFrameMode} />
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#0B0E14] px-2.5 py-1 text-[10px] font-semibold text-slate-300">
            <Maximize2 className="h-3 w-3 text-slate-400" />
            {resolution.width}×{resolution.height}
          </span>
        </>
      }
    >
      {videoUrl ? (
        <>
          <video
            id="studio-main-video"
            key={videoUrl}
            src={videoUrl}
            controls
            playsInline
            crossOrigin="anonymous"
            className="h-full w-full bg-black object-contain"
          />
          {isPortrait ? (
            <SafeZoneOverlay mode={frameMode} captionBottomOffset={20} />
          ) : null}
        </>
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
      {studioBusy || studioStarting ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#090d16]/96 px-6 text-center backdrop-blur-sm">
          <span className="h-9 w-9 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400" />
          <p className="text-sm font-bold text-slate-100">
            {t('جاري تجهيز Remotion Studio...', 'Preparing Remotion Studio...')}
          </p>
          <p className="max-w-sm text-[11px] leading-relaxed text-slate-400">
            {t(
              'سيظهر الاستوديو بعد لحظات في نافذة داكنة بدون وميض أبيض.',
              'The studio will appear in a dark window in a moment with no white flash.'
            )}
          </p>
        </div>
      ) : null}
    </PreviewStageShell>
  );
}
