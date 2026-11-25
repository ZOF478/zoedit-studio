import { Palette, Sparkles } from 'lucide-react';
import { useI18n } from '../i18n';
import { ColorFormatPicker } from './ColorFormatPicker';
import { BACKGROUND_PRESETS } from '../types/studio';
import type {
  BackgroundPresetId,
  BrandKit,
  VisualStyle,
} from '../types/studio';

interface QuickStyleDockProps {
  visualStyle: VisualStyle;
  onChangeVisualStyle: (style: VisualStyle) => void;
  brandKit: BrandKit;
  onChangeBrandKit: (next: BrandKit) => void;
  backgroundPreset: BackgroundPresetId;
  onChangeBackgroundPreset: (preset: BackgroundPresetId) => void;
}

const STYLE_OPTIONS: Array<{
  id: VisualStyle;
  labelAr: string;
  labelEn: string;
}> = [
  { id: 'stickman', labelAr: 'Stickman', labelEn: 'Stickman' },
  { id: 'modern-dark', labelAr: 'Modern Dark', labelEn: 'Modern Dark' },
  { id: 'editorial-clean', labelAr: 'Editorial Clean', labelEn: 'Editorial Clean' },
  { id: 'smart-mix', labelAr: 'AI Smart Mix', labelEn: 'AI Smart Mix' },
];

export function QuickStyleDock({
  visualStyle,
  onChangeVisualStyle,
  brandKit,
  onChangeBrandKit,
  backgroundPreset,
  onChangeBackgroundPreset,
}: QuickStyleDockProps) {
  const { t, lang } = useI18n();

  return (
    <aside className="flex h-full min-w-0 w-full max-w-full flex-col justify-between gap-3 overflow-x-hidden rounded-2xl border border-white/10 bg-[#0E121A] p-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-300">
          <Palette className="h-3.5 w-3.5" />
        </span>
        <h2 className="min-w-0 truncate font-display text-xs font-bold text-slate-100">
          {t('الهوية والنمط السريع', 'Quick identity & style')}
        </h2>
      </div>

      <section className="min-w-0 space-y-1.5">
        <h3 className="text-[10px] font-semibold text-slate-400">
          {t('النمط البصري', 'Visual style')}
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {STYLE_OPTIONS.map((style) => {
            const active = visualStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => onChangeVisualStyle(style.id)}
                aria-pressed={active}
                className={`min-w-0 rounded-lg border px-2 py-1.5 text-[10px] font-bold transition-colors cursor-pointer ${
                  active
                    ? 'border-sky-400/70 bg-sky-500/15 text-sky-100'
                    : 'border-white/8 bg-[#0B0E14] text-slate-400 hover:border-white/20 hover:text-slate-100'
                }`}
              >
                <span className="block truncate">{lang === 'ar' ? style.labelAr : style.labelEn}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="min-w-0 space-y-1.5">
        <h3 className="text-[10px] font-semibold text-slate-400">
          {t('ألوان الهوية', 'Brand Kit colors')}
        </h3>
        <div className="grid grid-cols-1 gap-1.5">
          <ColorFormatPicker
            compact
            label={t('الخلفية', 'Background')}
            value={brandKit.bgColor}
            onChange={(next) => onChangeBrandKit({ ...brandKit, bgColor: next })}
          />
          <ColorFormatPicker
            compact
            label={t('التمييز', 'Accent')}
            value={brandKit.accentColor}
            onChange={(next) => onChangeBrandKit({ ...brandKit, accentColor: next })}
          />
        </div>
      </section>

      <section className="min-w-0 space-y-1.5">
        <h3 className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
          <Sparkles className="h-3 w-3 text-sky-400" />
          {t('الخلفية المتحركة', 'Animated background')}
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {BACKGROUND_PRESETS.map((preset) => {
            const active = backgroundPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChangeBackgroundPreset(preset.id)}
                aria-pressed={active}
                title={lang === 'ar' ? preset.descAr : preset.descEn}
                className={`group min-w-0 overflow-hidden rounded-lg border text-start transition-colors cursor-pointer ${
                  active
                    ? 'border-sky-400/70 bg-sky-500/10'
                    : 'border-white/8 bg-[#0B0E14] hover:border-white/20'
                }`}
              >
                <div
                  className="zoedit-bg-preview h-7 w-full overflow-hidden"
                  style={{ background: preset.preview }}
                />
                <span className="block truncate px-1.5 py-1 text-[9px] font-semibold text-slate-200">
                  {lang === 'ar' ? preset.labelAr : preset.labelEn}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <p className="rounded-lg border border-white/8 bg-[#0B0E14] px-2.5 py-1.5 text-[9px] leading-relaxed text-slate-500">
        {t(
          'كل تغيير هنا يظهر فوراً في معاينة الستايل الحي والمشروع.',
          'Every change here updates the live theme sandbox and project preview instantly.'
        )}
      </p>
    </aside>
  );
}
