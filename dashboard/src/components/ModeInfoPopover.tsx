import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Boxes, Clapperboard, Info, ShieldCheck, X } from 'lucide-react';
import { useI18n } from '../i18n';

export type DisplayModeInfoId = 'broll' | 'depth' | 'safe';

interface ModeInfoPopoverProps {
  mode: DisplayModeInfoId;
  className?: string;
}

const MODE_META = {
  broll: {
    icon: Clapperboard,
    tone: 'amber',
    titleAr: 'وضع B-Roll النظيف',
    titleEn: 'Clean B-Roll Mode',
  },
  depth: {
    icon: Boxes,
    tone: 'violet',
    titleAr: 'وضع العمق 2.5D',
    titleEn: '2.5D Depth Mode',
  },
  safe: {
    icon: ShieldCheck,
    tone: 'emerald',
    titleAr: 'احترام منطقة الأمان',
    titleEn: 'Safe Zone Mode',
  },
} as const;

function MiniFrame({ label, children, tone }: { label: string; children: ReactNode; tone: string }) {
  return (
    <div className="min-w-0 flex-1">
      <div className={`relative h-24 overflow-hidden rounded-lg border ${tone} bg-[#070A10]`}>
        {children}
      </div>
      <p className="mt-1 text-center text-[9px] font-semibold text-slate-400">{label}</p>
    </div>
  );
}

function BrollPreview() {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <MiniFrame label={t('قبل: عناوين وشرائح نصية', 'Before: headlines & text slides')} tone="border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-sky-950" />
        <div className="absolute inset-x-2 top-2 h-2 rounded bg-white/70" />
        <div className="absolute inset-x-2 top-5 h-1.5 w-2/3 rounded bg-white/35" />
        <div className="absolute bottom-2 left-2 right-6 h-5 rounded border border-white/20 bg-black/40" />
        <div className="absolute bottom-3 left-3 h-1.5 w-10 rounded bg-sky-300/80" />
      </MiniFrame>
      <span className="text-sm font-black text-amber-300">→</span>
      <MiniFrame label={t('بعد: حركة + تسميات أساسية', 'After: motion + essential labels')} tone="border-amber-400/40">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-slate-950 to-sky-900/60" />
        <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-300/70 zoedit-orbit-slow" />
        <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-amber-300/30 zoedit-pulse-soft" />
        <div className="absolute inset-x-3 top-1/2 h-px bg-gradient-to-r from-transparent via-amber-200/80 to-transparent zoedit-sweep-line" />
        <span className="absolute bottom-2 left-2 rounded bg-black/45 px-1 py-0.5 font-mono text-[7px] font-bold text-amber-100">+18%</span>
      </MiniFrame>
    </div>
  );
}

function DepthPreview() {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-2 gap-2">
      <MiniFrame label={t('مسطح 2D', 'Flat 2D')} tone="border-white/10">
        <div className="absolute inset-0 bg-slate-950" />
        <div className="absolute left-1/2 top-1/2 h-12 w-16 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-500 bg-slate-700/80" />
        <div className="absolute left-1/2 top-1/2 h-1.5 w-9 -translate-x-1/2 -translate-y-1/2 rounded bg-slate-400" />
      </MiniFrame>
      <MiniFrame label={t('عمق 2.5D', '2.5D depth')} tone="border-violet-400/40">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-slate-950 to-sky-950" />
        <div className="absolute left-[18%] top-[24%] h-11 w-14 rounded-lg border border-violet-300/30 bg-violet-500/15 zoedit-parallax-far" />
        <div className="absolute left-[44%] top-[38%] h-12 w-16 rounded-lg border border-sky-300/50 bg-sky-500/25 zoedit-parallax-near" />
        <div className="absolute left-[30%] top-[58%] h-8 w-10 rounded-md border border-fuchsia-300/40 bg-fuchsia-500/20 zoedit-parallax-mid" />
      </MiniFrame>
    </div>
  );
}

function SafeZonePreview() {
  const { t } = useI18n();
  return (
    <div className="flex justify-center">
      <div className="relative h-28 w-[68px] overflow-hidden rounded-xl border-2 border-emerald-300/60 bg-slate-950">
        <div className="absolute inset-x-0 top-0 h-[12%] bg-amber-400/25 text-center text-[6px] font-bold leading-4 text-amber-100">
          {t('عنوان', 'Title')}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[24%] bg-amber-400/20" />
        <div className="absolute bottom-0 right-0 top-0 w-[18%] bg-sky-400/20" />
        <div className="absolute left-2 right-3 top-4 bottom-7 rounded border border-dashed border-emerald-300/80 zoedit-safe-pulse" />
        <span className="absolute bottom-1 left-0 right-0 text-center text-[5px] font-semibold text-amber-100/90">
          {t('كابشن + واجهة', 'Captions + UI')}
        </span>
      </div>
    </div>
  );
}

export function ModeInfoPopover({ mode, className = '' }: ModeInfoPopoverProps) {
  const { t, dir } = useI18n();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const meta = MODE_META[mode];
  const Icon = meta.icon;
  const toneRing =
    meta.tone === 'amber'
      ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
      : meta.tone === 'violet'
        ? 'border-violet-400/30 bg-violet-500/10 text-violet-200'
        : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200';

  const cancelClose = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openPopover = () => {
    cancelClose();
    setOpen(true);
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 140);
  };

  useEffect(() => {
    return () => cancelClose();
  }, []);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 300;
      const margin = 8;
      const preferredLeft = dir === 'rtl' ? rect.right - width : rect.left;
      const left = Math.min(
        window.innerWidth - width - margin,
        Math.max(margin, preferredLeft),
      );
      const top = Math.min(window.innerHeight - 250, rect.bottom + 6);
      setPosition({ top: Math.max(margin, top), left });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, dir]);

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={openPopover}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label={t('شرح الوضع', 'Explain this mode')}
        onClick={() => setOpen((value) => !value)}
        onFocus={openPopover}
        className={`inline-flex h-5 w-5 items-center justify-center rounded-md border transition-colors cursor-pointer ${toneRing}`}
      >
        <Info className="h-3 w-3" />
      </button>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="dialog"
              dir={dir}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
              className={`fixed z-[100] w-[300px] rounded-xl border bg-[#0B0E14]/98 p-3 shadow-2xl backdrop-blur ${toneRing}`}
              style={{ top: position.top, left: position.left }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <p className="truncate text-[11px] font-bold text-slate-100">{t(meta.titleAr, meta.titleEn)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t('إغلاق', 'Close')}
                  className="rounded p-0.5 text-slate-400 hover:text-slate-100 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>

              <div className="mt-2">
                {mode === 'broll' ? <BrollPreview /> : null}
                {mode === 'depth' ? <DepthPreview /> : null}
                {mode === 'safe' ? <SafeZonePreview /> : null}
              </div>

              <p className="mt-2 text-[10px] leading-relaxed text-slate-300">
                {mode === 'broll'
                  ? t(
                      'تفعيل Clean B-Roll يحذف العناوين الرئيسية والشرائح النصية فقط، مع الحفاظ على تسميات قصيرة ضرورية مثل أرقام المخططات وأسماء المحاور والمواقع. التعليق الصوتي (TTS) والكابشن يظلان اختياريين لك.',
                      'Enabling Clean B-Roll removes main headlines and text-only slides while preserving brief essential labels such as chart numbers, axis values, and map names. Voiceover (TTS) and captions remain optional for you to enable or disable.'
                    )
                  : mode === 'depth'
                    ? t(
                        '2.5D Depth يضيف طبقات كروت متعددة المستويات مع اختلاف سرعة الحركة لعمق سينمائي. استخدمه للقصص والمقارنات؛ واتركه مغلقاً للمخططات المسطحة السريعة.',
                        '2.5D Depth adds multi-layer cards moving at different speeds for cinematic parallax. Use it for stories and comparisons; leave it off for fast flat charts.'
                      )
                    : t(
                        'Safe Zone يحافظ على النصوص والكروت داخل المساحة الآمنة بعيداً عن أزرار Reels/Shorts/TikTok وشريط الوصف والكابشن السفلي.',
                        'Safe Zone keeps text and cards inside the platform-safe area, clear of Reels/Shorts/TikTok action buttons, the description bar, and bottom captions.'
                      )}
              </p>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
