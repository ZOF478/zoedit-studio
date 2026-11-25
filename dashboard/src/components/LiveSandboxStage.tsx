import { useState, type CSSProperties } from 'react';
import { Maximize2, ShieldCheck, Sparkles } from 'lucide-react';
import { useI18n } from '../i18n';
import type {
  BrandKit,
  CaptionAnimationStyle,
  CaptionColors,
  WatermarkPosition,
} from '../types/studio';
import {
  normalizeCaptionBottomOffset,
  resolveCaptionColors,
  resolveCaptionStyle,
} from '../utils/captionColors';
import {
  SafeZoneOverlay,
  SafeZoneSwitcher,
  type SafeZoneMode,
} from './SafeZoneOverlay';
import {
  PREVIEW_ASPECT_RESOLUTIONS,
  PreviewStageShell,
} from './PreviewStageShell';

interface LiveSandboxStageProps {
  aspectRatio: string;
  brandKit: BrandKit;
  captionStyle: CaptionAnimationStyle;
  captionColors: CaptionColors;
  captionBottomOffset: number;
  captionsEnabled: boolean;
  watermarkEnabled: boolean;
  watermarkText: string;
  watermarkPosition: WatermarkPosition;
  respectSafeZone: boolean;
  fps?: number;
  embedded?: boolean;
}

export function LiveSandboxStage({
  aspectRatio,
  brandKit,
  captionStyle,
  captionColors,
  captionBottomOffset,
  captionsEnabled,
  watermarkEnabled,
  watermarkText,
  watermarkPosition,
  respectSafeZone,
  fps = 60,
  embedded = false,
}: LiveSandboxStageProps) {
  const { t, isRtl } = useI18n();
  const [frameMode, setFrameMode] = useState<SafeZoneMode>('universal');
  const resolution = PREVIEW_ASPECT_RESOLUTIONS[aspectRatio] ?? PREVIEW_ASPECT_RESOLUTIONS['9:16'];
  const style = resolveCaptionStyle(captionStyle);
  const colors = resolveCaptionColors(captionColors, brandKit);
  const safeOffset = normalizeCaptionBottomOffset(captionBottomOffset);
  const isPortrait = aspectRatio === '9:16';
  const safeZonePadding = respectSafeZone
    ? {
        paddingTop: '13%',
        paddingBottom: '23%',
        paddingRight: '16%',
        paddingLeft: '6%',
      }
    : undefined;
  const safeZoneCaptionInset = respectSafeZone
    ? { left: '6%', right: '16%' }
    : undefined;
  const watermarkLabel = watermarkText.trim();
  const showWatermark = watermarkEnabled && watermarkLabel.length > 0;
  const watermarkInset =
    respectSafeZone && isPortrait
      ? { top: '13%', bottom: '23%', right: '16%', left: '6%' }
      : { top: '14px', bottom: '14px', right: '14px', left: '14px' };
  const watermarkPositionStyle: CSSProperties =
    watermarkPosition === 'top-left'
      ? { top: watermarkInset.top, left: watermarkInset.left }
      : watermarkPosition === 'top-right'
        ? { top: watermarkInset.top, right: watermarkInset.right }
        : watermarkPosition === 'bottom-left'
          ? { bottom: watermarkInset.bottom, left: watermarkInset.left }
          : { bottom: watermarkInset.bottom, right: watermarkInset.right };
  const sampleWords = isRtl
    ? ['اصنع', 'فيديوهات', 'تلفت', 'الأنظار', 'بسرعة']
    : ['Design', 'videos', 'that', 'stand', 'out'];
  const activeWord = 2;

  return (
    <PreviewStageShell
      title={t('مساحة المعاينة الحية', 'Live sandbox')}
      icon={
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-300">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
      }
      metadata={<>{aspectRatio} · {fps}fps</>}
      aspectRatio={aspectRatio}
      embedded={embedded}
      frameStyle={{
        backgroundColor: brandKit.bgColor,
        color: brandKit.textColor,
        fontFamily: 'var(--font-display)',
        direction: isRtl ? 'rtl' : 'ltr',
      }}
      actions={
        <>
          <SafeZoneSwitcher mode={frameMode} onChange={setFrameMode} />
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200">
            <ShieldCheck className="h-3 w-3" />
            {t(`كابشن عند ${safeOffset}%`, `Captions at ${safeOffset}%`)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#0B0E14] px-2.5 py-1 text-[10px] font-semibold text-slate-300">
            <Maximize2 className="h-3 w-3 text-slate-400" />
            {resolution.width}×{resolution.height}
          </span>
        </>
      }
    >
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 16%, ${brandKit.accentColor}55 0%, transparent 58%)`,
            }}
          />

          <div
            className={`relative flex h-full flex-col ${isPortrait ? 'p-4' : 'p-5 sm:p-7'}`}
            style={safeZonePadding}
          >
            <div className="flex items-center justify-end gap-2">
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                style={{ border: `1px solid ${brandKit.secondaryColor}`, color: brandKit.secondaryColor }}
              >
                {t('معاينة ثابتة', 'Static preview')}
              </span>
            </div>

            <div className="mt-auto mb-auto min-w-0">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ color: brandKit.secondaryColor }}
              >
                {t('هوية بصرية متكاملة', 'Full brand system')}
              </p>
              <h3
                className="mt-1 font-black leading-[1.15] break-words"
                style={{
                  fontSize: isPortrait
                    ? 'clamp(15px, 3.4vw, 22px)'
                    : 'clamp(16px, 2.6vw, 28px)',
                  color: brandKit.textColor,
                }}
              >
                {t('حوّل أفكارك إلى فيديو يلفت الأنظار', 'Turn your ideas into video that stands out')}
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-lg px-3 py-1.5 text-[10px] font-bold"
                  style={{ backgroundColor: brandKit.accentColor, color: brandKit.bgColor }}
                >
                  {t('ابدأ الآن', 'Get started')}
                </span>
                <span
                  className="rounded-lg px-3 py-1.5 text-[10px] font-bold"
                  style={{ border: `1px solid ${brandKit.primaryColor}`, color: brandKit.primaryColor }}
                >
                  {t('تفاصيل', 'Details')}
                </span>
              </div>
            </div>

            <div
              className="absolute inset-x-0 flex justify-center px-3"
              style={{ bottom: `${safeOffset}%`, ...safeZoneCaptionInset }}
            >
              <div
                className="max-w-[92%] text-center font-bold leading-snug"
                style={{
                  backgroundColor: colors.background,
                  color: colors.text,
                  border: `1px solid ${colors.text}2e`,
                  borderRadius: 18,
                  padding: isPortrait ? '10px 16px' : '8px 14px',
                  fontSize: isPortrait
                    ? 'clamp(10px, 2vw, 13px)'
                    : 'clamp(10px, 1.5vw, 14px)',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.42)',
                  direction: isRtl ? 'rtl' : 'ltr',
                  opacity: captionsEnabled ? 1 : 0.32,
                }}
              >
                {style === 'static' ? (
                  <span>{sampleWords.join(' ')}</span>
                ) : (
                  sampleWords.map((word, index) => {
                    const isActive = style === 'karaoke' && index === activeWord;
                    const revealed = style === 'karaoke' || index <= activeWord;
                    return (
                      <span
                        key={`${word}-${index}`}
                        style={{
                          display: 'inline-block',
                          marginInlineEnd: '0.26em',
                          color: isActive ? colors.highlight : colors.text,
                          opacity: revealed ? 1 : 0.28,
                          transform: isActive ? 'scale(1.08)' : undefined,
                        }}
                      >
                        {word}
                      </span>
                    );
                  })
                )}
              </div>
            </div>

            {!captionsEnabled ? (
              <span className="absolute bottom-2 start-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/45 px-2 py-0.5 text-[8px] font-semibold text-slate-300">
                {t('الكابشن مغلق', 'Captions off')}
              </span>
            ) : null}
          </div>

          {showWatermark ? (
            <span
              dir="auto"
              className="pointer-events-none absolute z-10 max-w-[76%] truncate rounded-full border px-3 py-1 text-[10px] font-black tracking-wide shadow-lg backdrop-blur-sm"
              style={{
                ...watermarkPositionStyle,
                backgroundColor: `${brandKit.primaryColor}d9`,
                color: brandKit.bgColor,
                borderColor: `${brandKit.textColor}33`,
              }}
            >
              {watermarkText}
            </span>
          ) : null}

          {isPortrait ? (
            <SafeZoneOverlay mode={frameMode} captionBottomOffset={safeOffset} />
          ) : null}
    </PreviewStageShell>
  );
}
