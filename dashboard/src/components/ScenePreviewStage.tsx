import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useI18n } from '../i18n';
import type {
  AspectRatio,
  BrandKit,
  FpsOption,
  SceneItem,
  VisualStyle,
} from '../types/studio';
import { StickmanFigure } from './StickmanFigure';

const isDarkHexColor = (color: string): boolean => {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return true;
  const value = parseInt(color.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
};

interface ScenePreviewStageProps {
  scene: SceneItem | undefined;
  sceneIndex: number;
  totalScenes: number;
  visualStyle: VisualStyle;
  aspectRatio: AspectRatio;
  fps: FpsOption;
  brandKit: BrandKit;
}

export function ScenePreviewStage({
  scene,
  sceneIndex,
  totalScenes,
  visualStyle,
  aspectRatio,
  fps,
  brandKit,
}: ScenePreviewStageProps) {
  const { t } = useI18n();
  const [playingPreview, setPlayingPreview] = useState(true);
  const [frameTick, setFrameTick] = useState(0);

  useEffect(() => {
    if (!playingPreview) return;
    const timer = window.setInterval(() => {
      setFrameTick((prev) => prev + 1);
    }, 1000 / 12);
    return () => window.clearInterval(timer);
  }, [playingPreview]);

  if (!scene) return null;

  const bgDark = isDarkHexColor(brandKit.bgColor);
  const dataHeavy = ['generative-scene', 'comparison-box', 'bar-chart', 'line-chart', 'circular-gauge', 'step-timeline'].includes(scene.visualType);
  const showsCharacter =
    visualStyle === 'stickman' ||
    (visualStyle === 'smart-mix' && (scene.showCharacter ?? !dataHeavy));
  const stageBg = brandKit.bgColor;
  const textColor = bgDark ? '#F8FAFC' : '#111827';
  const mutedColor = bgDark ? 'rgba(248,250,252,0.65)' : 'rgba(17,24,39,0.65)';
  const cardSurface = bgDark ? 'rgba(255,255,255,0.06)' : 'rgba(17,24,39,0.05)';
  const cardBorder = bgDark ? 'rgba(255,255,255,0.12)' : 'rgba(17,24,39,0.12)';

  const aspectClass =
    aspectRatio === '9:16'
      ? 'aspect-[9/16] max-w-[260px]'
      : aspectRatio === '1:1'
        ? 'aspect-square max-w-[330px]'
        : 'aspect-video w-full max-w-[520px]';

  const totalSceneFrames = Math.round(scene.durationSec * fps);
  const currentFrame = playingPreview ? (frameTick * Math.max(1, Math.round(fps / 12))) % Math.max(1, totalSceneFrames) : 0;

  const narrationWords = (scene.narration || '').trim().split(/\s+/).filter(Boolean);
  const chunkSize = narrationWords.length <= 3 ? Math.max(2, narrationWords.length) : 3;
  const chunkCount = Math.max(1, Math.ceil(narrationWords.length / chunkSize));
  const chunkIndex = Math.min(
    chunkCount - 1,
    Math.floor((currentFrame / Math.max(1, totalSceneFrames)) * chunkCount)
  );
  const chunkWords = narrationWords.slice(
    chunkIndex * chunkSize,
    chunkIndex * chunkSize + chunkSize
  );

  return (
    <div className="rounded-xl border border-white/8 bg-[#10141D] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-bold text-slate-100">
            {t('معاينة مسرح Remotion المباشرة', 'Live Remotion stage preview')}
          </h3>
          <p className="mt-0.5 font-mono text-xs text-slate-400 tabular-nums" dir="ltr">
            Scene 0{sceneIndex + 1}/0{totalScenes} · Frame {currentFrame}/{totalSceneFrames} · {fps}fps
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPlayingPreview((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0B0E14] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-sky-400/50 transition-colors cursor-pointer"
        >
          {playingPreview ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          <span>
            {playingPreview
              ? t('إيقاف المعاينة', 'Pause preview')
              : t('تشغيل المعاينة', 'Play preview')}
          </span>
        </button>
      </div>

      <div className="flex justify-center rounded-lg border border-white/6 bg-[#07090E] p-4">
        <div
          className={`relative flex w-full flex-col justify-between overflow-hidden rounded-xl border border-white/12 p-4 shadow-lg transition-all ${aspectClass}`}
          style={{
            backgroundColor: stageBg,
            backgroundImage: bgDark
              ? 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)'
              : 'radial-gradient(rgba(17,24,39,0.07) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        >
          {/* Top Watermark & Scene Counter */}
          <div className="flex items-center justify-between text-[10px] font-semibold">
            {brandKit.watermarkEnabled && brandKit.watermark.trim() ? (
              <span style={{ color: mutedColor }} className="truncate">
                {brandKit.watermark}
              </span>
            ) : (
              <span aria-hidden="true" />
            )}
            <span style={{ color: mutedColor }} className="font-mono tabular-nums" dir="ltr">
              0{sceneIndex + 1}/0{totalScenes}
            </span>
          </div>

          {/* Visual Element Card */}
          <div
            className="my-2 rounded-lg p-3"
            style={{
              backgroundColor: cardSurface,
              border: `1px solid ${cardBorder}`,
            }}
          >
            <div
              className="mb-2 h-1 w-12 rounded-full"
              style={{ backgroundColor: brandKit.accentColor }}
            />
            <div className="text-[11px] font-semibold" style={{ color: mutedColor }}>
              {scene.visualLabel || scene.title}
            </div>
            <div
              className="mt-1 font-display text-base font-bold leading-snug"
              style={{
                color: scene.visualType === 'stat-number' ? brandKit.accentColor : textColor,
              }}
            >
              {scene.visualValue || scene.title}
            </div>
            {scene.visualType === 'custom' && scene.visualSvg ? (
              <img
                src={`data:image/svg+xml;utf8,${encodeURIComponent(scene.visualSvg)}`}
                alt={scene.visualLabel}
                className="mt-2 h-16 w-full rounded-md object-contain"
              />
            ) : null}
          </div>

          {/* Centerpiece: Stickman or Geometric Anchor */}
          <div className="flex flex-1 items-center justify-center py-1">
            {showsCharacter ? (
              <StickmanFigure
                pose={scene.pose}
                strokeColor={textColor}
                accentColor={brandKit.accentColor}
                className={aspectRatio === '16:9' ? 'h-24 w-24' : 'h-28 w-28'}
              />
            ) : (
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full border-2"
                style={{
                  borderColor: brandKit.accentColor,
                  backgroundColor: cardSurface,
                }}
              >
                <span
                  className="font-mono text-xs font-bold"
                  style={{ color: brandKit.accentColor }}
                >
                  {scene.visualType}
                </span>
              </div>
            )}
          </div>

          {/* Compact brand-tinted caption chunk */}
          <div className="flex justify-center">
            <div
              className="inline-flex flex-wrap items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold leading-relaxed text-slate-50"
              style={{
                backgroundColor: bgDark ? 'rgba(9,13,22,0.86)' : 'rgba(17,24,39,0.9)',
                border: `1px solid ${brandKit.accentColor}`,
                boxShadow: `0 0 18px ${brandKit.accentColor}33`,
              }}
            >
              {chunkWords.map((word, index) => {
                const isActive = index === Math.max(0, chunkWords.length - 2);
                return (
                  <span
                    key={`${word}-${index}`}
                    className="rounded px-1.5 py-0.5"
                    style={{
                      backgroundColor: isActive ? brandKit.accentColor : 'transparent',
                      color: isActive ? (bgDark ? '#0B0E14' : '#F8FAFC') : '#F8FAFC',
                    }}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
