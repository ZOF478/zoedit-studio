import { useEffect, useMemo, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import type { AnyZodObject } from 'remotion';
import { Film, Maximize2, Palette, Radio, Sparkles } from 'lucide-react';
import { MainComposition } from '../../../src/Composition';
import type { MainProps } from '../../../src/config';
import type { VideoData } from '../../../src/types';
import { useI18n } from '../i18n';
import {
  LiveThemeSandbox,
  THEME_SANDBOX_SECONDS,
  type LiveThemeSandboxProps,
} from './LiveThemeSandbox';
import type {
  BackgroundPresetId,
  BrandKit,
  CaptionAnimationStyle,
  SceneItem,
  ScriptLanguage,
  VisualStyle,
  WordsPerScreen,
} from '../types/studio';

const ASPECT_RESOLUTIONS: Record<string, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '1:1': { width: 1080, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
};

interface LivePreviewStageProps {
  data: VideoData;
  scenes: SceneItem[];
  fps: number;
  aspectRatio: string;
  durationInFrames: number;
  totalDurationSec: number;
  selectedSceneId: string;
  onSelectScene: (id: string) => void;
  voiceoverEnabled: boolean;
  captionsEnabled: boolean;
  visualStyle: VisualStyle;
  backgroundPreset: BackgroundPresetId;
  brandKit: BrandKit;
  captionAnimationStyle: CaptionAnimationStyle;
  wordsPerScreen: WordsPerScreen;
  scriptLanguage: ScriptLanguage;
  onTimeUpdate?: (second: number) => void;
  seekRequest?: { second: number; token: number } | null;
}

type PreviewTab = 'project' | 'theme';

export function LivePreviewStage({
  data,
  scenes,
  fps,
  aspectRatio,
  durationInFrames,
  totalDurationSec,
  selectedSceneId,
  onSelectScene,
  voiceoverEnabled,
  captionsEnabled,
  visualStyle,
  backgroundPreset,
  brandKit,
  captionAnimationStyle,
  wordsPerScreen,
  scriptLanguage,
  onTimeUpdate,
  seekRequest,
}: LivePreviewStageProps) {
  const { t, lang } = useI18n();
  const [previewTab, setPreviewTab] = useState<PreviewTab>('project');
  const playerRef = useRef<PlayerRef>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  useEffect(() => {
    const element = stageRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      setStageSize({ width: rect.width, height: rect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { width, height } = useMemo(() => {
    const active = ASPECT_RESOLUTIONS[aspectRatio];
    if (active) return active;
    return {
      width: Math.max(1, Number(data.width) || 1080),
      height: Math.max(1, Number(data.height) || 1920),
    };
  }, [aspectRatio, data.width, data.height]);
  const ratio = width / height;

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    let lastReported = -1;
    const handleTime = (event: { detail: { frame: number } }) => {
      const second = Math.max(0, event.detail.frame) / Math.max(1, fps);
      if (Math.abs(second - lastReported) < 0.1) return;
      lastReported = second;
      onTimeUpdateRef.current?.(second);
    };
    player.addEventListener('timeupdate', handleTime);
    player.addEventListener('frameupdate', handleTime);
    return () => {
      player.removeEventListener('timeupdate', handleTime);
      player.removeEventListener('frameupdate', handleTime);
    };
  }, [previewTab, fps, width, height]);

  useEffect(() => {
    if (!seekRequest) return;
    setPreviewTab('project');
    const targetSecond = Math.max(0, seekRequest.second);
    const targetFrame = Math.round(targetSecond * Math.max(1, fps));
    onTimeUpdateRef.current?.(targetSecond);
    let cancelled = false;
    let timer: number | null = null;
    const applySeek = () => {
      if (cancelled) return true;
      const player = playerRef.current;
      if (!player) return false;
      player.pause();
      player.seekTo(targetFrame);
      return true;
    };
    if (!applySeek()) {
      timer = window.setInterval(() => {
        if (applySeek() || cancelled) {
          if (timer !== null) window.clearInterval(timer);
          timer = null;
        }
      }, 50);
    }
    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
    };
  }, [seekRequest, fps]);

  const playerBox = useMemo(() => {
    const stageWidth = stageSize.width || 640;
    const stageHeight = stageSize.height || 420;
    let nextHeight = stageHeight;
    let nextWidth = nextHeight * ratio;
    if (nextWidth > stageWidth) {
      nextWidth = stageWidth;
      nextHeight = nextWidth / ratio;
    }
    return {
      width: Math.max(1, Math.round(nextWidth)),
      height: Math.max(1, Math.round(nextHeight)),
    };
  }, [ratio, stageSize.height, stageSize.width]);

  const sceneOffsets = useMemo(() => {
    let cursor = 0;
    return scenes.map((scene) => {
      const frames = Math.max(1, Math.round(scene.durationSec * fps));
      const offset = cursor;
      cursor += frames;
      return { id: scene.id, offset };
    });
  }, [scenes, fps]);

  const sandboxProps = useMemo<LiveThemeSandboxProps>(
    () => ({
      bgColor: brandKit.bgColor,
      accentColor: brandKit.accentColor,
      visualStyle,
      backgroundPreset,
      captionAnimationStyle,
      wordsPerScreen,
      captionsEnabled: captionsEnabled && voiceoverEnabled,
      aspectRatio: aspectRatio as LiveThemeSandboxProps['aspectRatio'],
      scriptLanguage,
      uiLanguage: lang,
      fps,
      watermark: brandKit.watermark,
      watermarkEnabled: brandKit.watermarkEnabled,
      watermarkPosition: brandKit.watermarkPosition ?? 'top-left',
    }),
    [
      brandKit.bgColor,
      brandKit.accentColor,
      brandKit.watermark,
      brandKit.watermarkEnabled,
      brandKit.watermarkPosition,
      visualStyle,
      backgroundPreset,
      captionAnimationStyle,
      wordsPerScreen,
      captionsEnabled,
      voiceoverEnabled,
      aspectRatio,
      scriptLanguage,
      lang,
      fps,
    ]
  );

  const sandboxFrames = Math.max(210, Math.round(THEME_SANDBOX_SECONDS * fps));
  const projectFrames = Math.max(210, Math.round(durationInFrames));
  const activeFrames = previewTab === 'project' ? projectFrames : sandboxFrames;
  const initialFrame = Math.min(25, Math.max(0, activeFrames - 1));

  const seekToScene = (id: string) => {
    setPreviewTab('project');
    onSelectScene(id);
    const target = sceneOffsets.find((scene) => scene.id === id);
    if (target && playerRef.current) {
      playerRef.current.seekTo(target.offset);
    }
  };

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
              {t('مسرح المعاينة الحية', 'Live preview stage')}
            </h2>
            <span className="hidden items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              LIVE
            </span>
          </div>
          <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400 tabular-nums" dir="ltr">
            {aspectRatio} · {fps}fps ·{' '}
            {previewTab === 'project'
              ? `${scenes.length} scenes · ${totalDurationSec.toFixed(1)}s · ${projectFrames} frames`
              : `${THEME_SANDBOX_SECONDS}s theme sandbox`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
              voiceoverEnabled
                ? 'border-sky-400/30 bg-sky-500/10 text-sky-200'
                : 'border-amber-400/30 bg-amber-500/10 text-amber-200'
            }`}
          >
            <Sparkles className="h-3 w-3" />
            {voiceoverEnabled
              ? t('تعليق صوتي مفعّل', 'Voiceover on')
              : t('وضع بصري صامت', 'Silent visual mode')}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#0B0E14] px-2.5 py-1 text-[10px] font-semibold text-slate-300">
            <Maximize2 className="h-3 w-3 text-slate-400" />
            {width}×{height}
          </span>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-1 border-b border-white/8 bg-[#0B0E14] p-1.5">
        <button
          type="button"
          onClick={() => setPreviewTab('project')}
          aria-pressed={previewTab === 'project'}
          className={`inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[10px] font-semibold transition-colors cursor-pointer ${
            previewTab === 'project'
              ? 'bg-sky-500 text-slate-950'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
          }`}
        >
          <Film className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {t('معاينة المشروع الحي — Project Live', 'Project Live')}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setPreviewTab('theme')}
          aria-pressed={previewTab === 'theme'}
          className={`inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[10px] font-semibold transition-colors cursor-pointer ${
            previewTab === 'theme'
              ? 'bg-fuchsia-500 text-slate-950'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
          }`}
        >
          <Palette className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {t('معاينة الستايل والهوية — Live Theme Sandbox', 'Live Theme Sandbox')}
          </span>
        </button>
      </div>

      <div className="space-y-3 p-3 sm:p-4">
        <div
          ref={stageRef}
          className="flex h-[clamp(280px,42vh,440px)] max-h-[440px] w-full min-w-0 items-center justify-center overflow-hidden rounded-xl border border-white/8 bg-[#05070C]"
        >
          <div
            dir="ltr"
            className="overflow-hidden rounded-lg border border-white/12 shadow-2xl"
            style={{ width: playerBox.width, height: playerBox.height, direction: 'ltr' }}
          >
              {previewTab === 'project' ? (
                <Player<AnyZodObject, MainProps>
                  key={`project-${data.width}-${data.height}-${fps}`}
                  ref={playerRef}
                  component={MainComposition}
                  inputProps={{ data }}
                  durationInFrames={projectFrames}
                  fps={Math.max(1, fps)}
                  compositionWidth={width}
                  compositionHeight={height}
                  initialFrame={initialFrame}
                  style={{ width: '100%', height: '100%' }}
                  controls
                  loop
                  clickToPlay
                  acknowledgeRemotionLicense
                  renderLoading={() => (
                    <div className="flex h-full w-full items-center justify-center bg-[#05070C] text-[11px] font-semibold text-slate-400">
                      {t('جارٍ تحميل المعاينة...', 'Loading preview...')}
                    </div>
                  )}
                  errorFallback={() => (
                    <div className="flex h-full w-full items-center justify-center bg-[#05070C] p-4 text-center text-[11px] font-semibold leading-relaxed text-amber-200">
                      {t(
                        'تعذر تشغيل المعاينة الحية. جرّب تحديث الصفحة.',
                        'Live preview could not start. Try refreshing the page.'
                      )}
                    </div>
                  )}
                />
              ) : (
                <Player<AnyZodObject, LiveThemeSandboxProps>
                  key={`theme-${width}-${height}-${fps}`}
                  component={LiveThemeSandbox}
                  inputProps={sandboxProps}
                  durationInFrames={sandboxFrames}
                  fps={Math.max(1, fps)}
                  compositionWidth={width}
                  compositionHeight={height}
                  initialFrame={initialFrame}
                  style={{ width: '100%', height: '100%' }}
                  controls
                  loop
                  clickToPlay
                  acknowledgeRemotionLicense
                  renderLoading={() => (
                    <div className="flex h-full w-full items-center justify-center bg-[#05070C] text-[11px] font-semibold text-slate-400">
                      {t('جارٍ تحميل الستايل الحي...', 'Loading live style...')}
                    </div>
                  )}
                  errorFallback={() => (
                    <div className="flex h-full w-full items-center justify-center bg-[#05070C] p-4 text-center text-[11px] font-semibold leading-relaxed text-amber-200">
                      {t(
                        'تعذر تشغيل الستايل الحي. جرّب تحديث الصفحة.',
                        'Live style sandbox could not start. Try refreshing the page.'
                      )}
                    </div>
                  )}
                />
              )}
          </div>
        </div>

        {previewTab === 'project' ? (
          <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-1">
            {scenes.map((scene, index) => {
              const active = scene.id === selectedSceneId;
              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => seekToScene(scene.id)}
                  title={scene.title}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'border-sky-400/60 bg-sky-500/15 text-sky-100'
                      : 'border-white/8 bg-[#0B0E14] text-slate-400 hover:border-white/20 hover:text-slate-100'
                  }`}
                >
                  <span className="font-mono tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                  <span className="max-w-[120px] truncate">{scene.title}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="min-w-0 break-words rounded-lg border border-fuchsia-400/20 bg-fuchsia-500/5 px-3 py-2 text-[10px] leading-relaxed text-fuchsia-100">
            {t(
              'يعرض هذا الستايل الحي فوراً: النمط البصري، الخلفية المتحركة، ألوان الهوية، ونمط الكابشن — حتى قبل توليد السكربت.',
              'This sandbox instantly previews the visual style, animated background, Brand Kit colors, and caption style — even before generating a script.'
            )}
          </p>
        )}
      </div>
    </section>
  );
}
