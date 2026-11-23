import { Palette } from 'lucide-react';
import { useI18n } from '../i18n';
import type { BrandKit } from '../types/studio';
import { ColorFormatPicker } from './ColorFormatPicker';

interface ColorsPanelProps {
  brandKit: BrandKit;
  onChangeBrandKit: (next: BrandKit) => void;
  disabled?: boolean;
}

export function ColorsPanel({
  brandKit,
  onChangeBrandKit,
  disabled = false,
}: ColorsPanelProps) {
  const { t } = useI18n();

  return (
    <section className="min-w-0 w-full max-w-full rounded-2xl border border-white/10 bg-[#0E121A] p-3.5 shadow-[0_18px_60px_-50px_rgba(56,189,248,0.7)]">
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-fuchsia-400/25 bg-fuchsia-500/12 text-fuchsia-200">
          <Palette className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-[13px] font-bold text-slate-100">
            {t('لوحة الألوان', 'Color palette')}
          </h2>
          <p className="mt-0.5 truncate text-[11px] leading-tight text-slate-500">
            {t(
              'اختر ألوان العلامة، والمعاينة الحية في تبويب مساحة المعاينة.',
              'Pick your brand colors; preview them in the Live Sandbox tab.'
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <ColorFormatPicker
          label={t('الخلفية', 'Background')}
          value={brandKit.bgColor}
          onChange={(bgColor) => onChangeBrandKit({ ...brandKit, bgColor })}
          disabled={disabled}
          compact
        />
        <ColorFormatPicker
          label={t('النص', 'Text')}
          value={brandKit.textColor}
          onChange={(textColor) => onChangeBrandKit({ ...brandKit, textColor })}
          disabled={disabled}
          compact
        />
        <ColorFormatPicker
          label={t('الأساسي', 'Primary')}
          value={brandKit.primaryColor}
          onChange={(primaryColor) => onChangeBrandKit({ ...brandKit, primaryColor })}
          disabled={disabled}
          compact
        />
        <ColorFormatPicker
          label={t('الثانوي', 'Secondary')}
          value={brandKit.secondaryColor}
          onChange={(secondaryColor) => onChangeBrandKit({ ...brandKit, secondaryColor })}
          disabled={disabled}
          compact
        />
        <ColorFormatPicker
          label={t('التميز', 'Accent')}
          value={brandKit.accentColor}
          onChange={(accentColor) => onChangeBrandKit({ ...brandKit, accentColor })}
          disabled={disabled}
          compact
        />
      </div>
    </section>
  );
}
