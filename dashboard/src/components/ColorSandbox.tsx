import { Contrast, Shuffle, Sparkles } from 'lucide-react';
import { useI18n } from '../i18n';
import type { BrandKit } from '../types/studio';
import {
  PALETTE_PRESETS,
  contrastRatio,
  randomHarmonyPalette,
  wcagResult,
  wcagToneClasses,
} from '../utils/colorContrast';

interface ColorSandboxProps {
  brandKit: BrandKit;
  onChange: (next: BrandKit) => void;
  disabled?: boolean;
}

export function ColorSandbox({ brandKit, onChange, disabled = false }: ColorSandboxProps) {
  const { t, isRtl } = useI18n();

  const checks = [
    { key: 'text', label: t('نص على الخلفية', 'Text on background'), fg: brandKit.textColor, bg: brandKit.bgColor, large: false },
    { key: 'primary', label: t('الأساسي على الخلفية', 'Primary on background'), fg: brandKit.primaryColor, bg: brandKit.bgColor, large: false },
    { key: 'secondary', label: t('الثانوي على الخلفية', 'Secondary on background'), fg: brandKit.secondaryColor, bg: brandKit.bgColor, large: true },
    { key: 'accent', label: t('التمييز على الخلفية', 'Accent on background'), fg: brandKit.accentColor, bg: brandKit.bgColor, large: true },
  ].map((check) => ({
    ...check,
    result: wcagResult(contrastRatio(check.fg, check.bg), check.large),
  }));

  const applyPalette = () => {
    const palette = randomHarmonyPalette();
    onChange({ ...brandKit, ...palette });
  };

  return (
    <section
      id="color-sandbox"
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-w-0 space-y-2.5 rounded-xl border border-white/8 bg-[#0B0E14] p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/15 text-fuchsia-200">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-xs font-bold text-slate-100">
              {t('مساحة الألوان والخطوط الحية', 'Live color & typography sandbox')}
            </h3>
            <p className="truncate text-[10px] text-slate-400">
              {t('معاينة فورية + تباين WCAG', 'Realtime preview + WCAG contrast')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={applyPalette}
          disabled={disabled}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/15 px-2.5 py-1.5 text-[10px] font-bold text-fuchsia-100 hover:bg-fuchsia-500/25 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          <Shuffle className="h-3.5 w-3.5" />
          {t('توليد لوحة متناغمة', 'Harmony palette')}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {PALETTE_PRESETS.map((preset) => {
          const active = (
            [
              'bgColor',
              'textColor',
              'primaryColor',
              'secondaryColor',
              'accentColor',
            ] as const
          ).every((key) => brandKit[key].toUpperCase() === preset.colors[key].toUpperCase());
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange({ ...brandKit, ...preset.colors })}
              disabled={disabled}
              aria-pressed={active}
              title={t(preset.labelAr, preset.labelEn)}
              className={`min-w-0 rounded-lg border p-1.5 text-start transition-colors cursor-pointer hover:border-fuchsia-300/60 disabled:cursor-not-allowed disabled:opacity-40 ${
                active ? 'border-fuchsia-400/70 ring-1 ring-fuchsia-400/40' : 'border-white/10'
              }`}
            >
              <span className="flex h-4 overflow-hidden rounded">
                {[
                  preset.colors.bgColor,
                  preset.colors.textColor,
                  preset.colors.primaryColor,
                  preset.colors.secondaryColor,
                  preset.colors.accentColor,
                ].map((color) => (
                  <span key={color} className="flex-1" style={{ backgroundColor: color }} />
                ))}
              </span>
              <span className="mt-1 block truncate text-[8px] font-semibold text-slate-300">
                {t(preset.labelAr, preset.labelEn)}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className="relative overflow-hidden rounded-xl border border-white/10 p-4"
        style={{ backgroundColor: brandKit.bgColor, color: brandKit.textColor }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-bold"
            style={{
              backgroundColor: brandKit.primaryColor,
              color: brandKit.bgColor,
            }}
          >
            ZOF STUDIO
          </span>
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-bold"
            style={{
              border: `1px solid ${brandKit.secondaryColor}`,
              color: brandKit.secondaryColor,
            }}
          >
            {t('مباشر', 'Live')}
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
              {t('عنوان عربي', 'Primary headline')}
            </p>
            <p
              className="mt-0.5 text-lg font-black leading-tight"
              style={{ color: brandKit.textColor }}
            >
              {t('أصنع فيديو يلفت الأنظار', 'Create video that stands out')}
            </p>
            <p
              dir="ltr"
              className="mt-1 text-sm font-bold leading-tight"
              style={{ color: brandKit.textColor }}
            >
              Design videos that stand out
            </p>
            <p className="mt-1 text-[10px] leading-relaxed" style={{ color: brandKit.textColor, opacity: 0.72 }}>
              {t(
                'نموذج نص توضيحي يوضح تباين النص مع الخلفية والألوان الأساسية.',
                'Sample body copy showing text contrast against the background and brand colors.'
              )}
            </p>
          </div>

          <svg viewBox="0 0 120 180" className="h-24 w-16 shrink-0" aria-hidden="true">
            <ellipse cx="60" cy="168" rx="28" ry="6" fill={brandKit.textColor} opacity="0.16" />
            <circle cx="60" cy="38" r="17" fill={brandKit.textColor} />
            <path
              d="M60 55 C48 55 42 64 41 78 L38 108 L44 150 L54 150 L58 112 L62 112 L66 150 L76 150 L82 108 L79 78 C78 64 72 55 60 55 Z"
              fill={brandKit.textColor}
            />
            <path d="M43 74 L22 96" stroke={brandKit.textColor} strokeWidth="7" strokeLinecap="round" />
            <path d="M77 74 L98 88" stroke={brandKit.accentColor} strokeWidth="7" strokeLinecap="round" />
            <path d="M54 150 L52 166" stroke={brandKit.textColor} strokeWidth="7" strokeLinecap="round" />
            <path d="M66 150 L70 166" stroke={brandKit.textColor} strokeWidth="7" strokeLinecap="round" />
            <circle cx="98" cy="88" r="6" fill={brandKit.accentColor} />
          </svg>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className="rounded-lg px-3 py-1.5 text-[11px] font-bold"
            style={{ backgroundColor: brandKit.accentColor, color: brandKit.bgColor }}
          >
            {t('ابدأ الآن', 'Get started')}
          </span>
          <span
            className="rounded-lg px-3 py-1.5 text-[11px] font-bold"
            style={{
              border: `1px solid ${brandKit.primaryColor}`,
              color: brandKit.primaryColor,
            }}
          >
            {t('تفاصيل', 'Details')}
          </span>
          <span
            className="rounded-lg px-3 py-1.5 text-[11px] font-bold"
            style={{ backgroundColor: brandKit.secondaryColor, color: brandKit.bgColor }}
          >
            {t('مشاركة', 'Share')}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {[brandKit.bgColor, brandKit.primaryColor, brandKit.secondaryColor, brandKit.accentColor, brandKit.textColor].map((color) => (
            <span
              key={color}
              className="flex h-6 items-end justify-center rounded-md border border-white/15 pt-1 text-[8px] font-mono font-bold"
              style={{ backgroundColor: color, color: contrastRatio('#FFFFFF', color) >= 3 ? '#FFFFFF' : '#000000' }}
            >
              {color}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {checks.map((check) => (
          <div
            key={check.key}
            className={`flex items-center justify-between gap-1.5 rounded-lg border px-2 py-1.5 ${wcagToneClasses(check.result.tone)}`}
          >
            <span className="min-w-0 truncate text-[9px] font-semibold">{check.label}</span>
            <span className="shrink-0 text-[9px] font-black tabular-nums" dir="ltr">
              {check.result.level} · {check.result.ratio.toFixed(2)}:1
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
        <Contrast className="h-3 w-3" />
        {t(
          'AA يتطلب 4.5:1 للنص العادي و3:1 للنص الكبير.',
          'AA requires 4.5:1 for body text and 3:1 for large text.'
        )}
      </div>
    </section>
  );
}
