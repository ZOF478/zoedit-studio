import { useState } from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { useI18n } from '../i18n';
import type { BrandKit, CaptionAnimationStyle, CaptionColors } from '../types/studio';
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

interface LiveSandboxStageProps {
  aspectRatio: string;
  brandKit: BrandKit;
  captionStyle: CaptionAnimationStyle;
  captionColors: CaptionColors;
  captionBottomOffset: number;
  captionsEnabled: boolean;
  fps?: number;
  embedded?: boolean;
}

const ASPECT_RESOLUTIONS: Record<string, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '1:1': { width: 1080, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
};

export function LiveSandboxStage({
  aspectRatio,
  brandKit,
  captionStyle,
  captionColors,
  captionBottomOffset,
  captionsEnabled,
  fps = 60,
  embedded = false,
}: LiveSandboxStageProps) {
  const { t, isRtl } = useI18n();
  const [frameMode, setFrameMode] = useState<SafeZoneMode>('universal');
  const resolution = ASPECT_RESOLUTIONS[aspectRatio] ?? ASPECT_RESOLUTIONS['9:16'];
  const ratio = `${resolution.width} / ${resolution.height}`;
  const style = resolveCaptionStyle(captionStyle);
  const colors = resolveCaptionColors(captionColors, brandKit);
  const safeOffset = normalizeCaptionBottomOffset(captionBottomOffset);
  const isPortrait = aspectRatio === '9:16';
  const sampleWords = isRtl
    ? ['اصنع', 'فيديوهات', 'تلفت', 'الأنظار', 'بسرعة']
    : ['Design', 'videos', 'that', 'stand', 'out'];
  const activeWord = 2;

  return (
    <section
      className={
        embedded
          ? 'flex min-w-0 w-full max-w-full flex-col overflow-hidden'
          : 'flex min-w-0 w-full max-w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0E121A] shadow-[0_24px_70px_-40px_rgba(56,189,248,0.55)]'
      }
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-white/8 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-300">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <h2 className="truncate font-display text-sm font-bold text-slate-100">
              {t('مساحة المعاينة الحية', 'Live sandbox')}
            </h2>
          </div>
          <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400 tabular-nums" dir="ltr">
            {aspectRatio} · {resolution.width}×{resolution.height} · {fps}fps
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isPortrait ? (
            <SafeZoneSwitcher mode={frameMode} onChange={setFrameMode} />
          ) : null}
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200">
            <ShieldCheck className="h-3 w-3" />
            {t(`كابشن عند ${safeOffset}%`, `Captions at ${safeOffset}%`)}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center p-3 sm:p-5">
        <div
          className="relative w-full overflow-hidden rounded-xl border border-white/10 shadow-2xl"
          style={{
            aspectRatio: ratio,
            maxHeight: isPortrait ? 540 : 460,
            maxWidth: '100%',
            backgroundColor: brandKit.bgColor,
            color: brandKit.textColor,
            fontFamily: 'var(--font-display)',
            direction: isRtl ? 'rtl' : 'ltr',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 16%, ${brandKit.accentColor}55 0%, transparent 58%)`,
            }}
          />

          <div className="relative flex h-full flex-col p-5 sm:p-7">
            <div className="flex items-center justify-between gap-2">
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-black tracking-wide"
                style={{ backgroundColor: brandKit.primaryColor, color: brandKit.bgColor }}
              >
                ZOF STUDIO
              </span>
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
                className="mt-1 font-black leading-[1.15]"
                style={{
                  fontSize: isPortrait ? 'clamp(18px, 4.4vw, 30px)' : 'clamp(16px, 2.6vw, 28px)',
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
              style={{ bottom: `${safeOffset}%` }}
            >
              <div
                className="max-w-[92%] text-center font-bold leading-snug"
                style={{
                  backgroundColor: colors.background,
                  color: colors.text,
                  border: `1px solid ${colors.text}2e`,
                  borderRadius: 18,
                  padding: isPortrait ? '10px 16px' : '8px 14px',
                  fontSize: isPortrait ? 'clamp(11px, 2.6vw, 15px)' : 'clamp(10px, 1.5vw, 14px)',
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

          {isPortrait ? (
            <SafeZoneOverlay mode={frameMode} captionBottomOffset={safeOffset} />
          ) : null}
        </div>
      </div>
    </section>
  );
}
