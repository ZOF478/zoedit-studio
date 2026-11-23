import { Captions, Palette, Type } from 'lucide-react';
import { useI18n } from '../i18n';
import type {
  BrandKit,
  CaptionAnimationStyle,
  CaptionColorSource,
  CaptionColors,
} from '../types/studio';
import { ColorFormatPicker } from './ColorFormatPicker';
import {
  CAPTION_STYLE_OPTIONS,
  brandColorForSource,
  normalizeCaptionColorSource,
  resolveCaptionColor,
} from '../utils/captionColors';

interface CaptionControlsProps {
  brandKit: BrandKit;
  captionStyle: CaptionAnimationStyle;
  onChangeCaptionStyle: (value: CaptionAnimationStyle) => void;
  captionColors: CaptionColors;
  onChangeCaptionColors: (next: CaptionColors) => void;
  captionBottomOffset: number;
  onChangeCaptionBottomOffset: (value: number) => void;
  disabled?: boolean;
}

type ColorField = 'background' | 'text' | 'highlight';
type SourceField = 'backgroundSource' | 'textSource' | 'highlightSource';

const COLOR_FIELDS: Array<{
  field: ColorField;
  sourceField: SourceField;
  labelAr: string;
  labelEn: string;
}> = [
  { field: 'background', sourceField: 'backgroundSource', labelAr: 'خلفية الكابشن', labelEn: 'Caption pill' },
  { field: 'text', sourceField: 'textSource', labelAr: 'نص الكابشن', labelEn: 'Caption text' },
  { field: 'highlight', sourceField: 'highlightSource', labelAr: 'الكلمة النشطة', labelEn: 'Active word' },
];

export function CaptionControls({
  brandKit,
  captionStyle,
  onChangeCaptionStyle,
  captionColors,
  onChangeCaptionColors,
  captionBottomOffset,
  onChangeCaptionBottomOffset,
  disabled = false,
}: CaptionControlsProps) {
  const { t } = useI18n();

  const sourceLabel = (source: CaptionColorSource): string => {
    switch (source) {
      case 'background':
        return t('الخلفية', 'Background');
      case 'text':
        return t('النص', 'Text');
      case 'primary':
        return t('الأساسي', 'Primary');
      case 'secondary':
        return t('الثانوي', 'Secondary');
      case 'accent':
        return t('التميز', 'Accent');
      default:
        return t('مخصص', 'Custom');
    }
  };

  const setSource = (sourceField: SourceField, source: CaptionColorSource) => {
    const field = sourceField.replace('Source', '') as ColorField;
    onChangeCaptionColors({
      ...captionColors,
      [sourceField]: source,
      ...(source === 'custom'
        ? {}
        : { [field]: brandColorForSource(source, brandKit) }),
    });
  };

  const setCustomColor = (field: ColorField, value: string) => {
    onChangeCaptionColors({
      ...captionColors,
      [field]: value,
      [`${field}Source`]: 'custom',
    });
  };

  return (
    <section className="min-w-0 space-y-2.5 rounded-xl border border-white/8 bg-[#0B0E14] px-2.5 py-2.5">
      <div className="flex items-start gap-2">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-emerald-400/25 bg-emerald-500/12 text-emerald-200">
          <Captions className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[11px] font-bold text-slate-100">
            {t('تخصيص الترجمة النصية', 'Caption customization')}
          </h3>
          <p className="truncate text-[10px] text-slate-500">
            {t(
              'حركة الكابشن والألوان والارتفاع الآمن.',
              'Caption motion, colors and safe elevation.'
            )}
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
          <Type className="h-3 w-3 text-emerald-300" />
          {t('نمط حركة الكابشن', 'Caption animation style')}
        </span>
        <div className="grid grid-cols-1 gap-1.5">
          {CAPTION_STYLE_OPTIONS.map((option) => {
            const active = captionStyle === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => onChangeCaptionStyle(option.value)}
                className={`flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-start transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                  active
                    ? 'border-emerald-400/50 bg-emerald-500/12 text-emerald-100'
                    : 'border-white/10 bg-[#10141D] text-slate-300 hover:border-emerald-400/30'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-bold">
                    {t(option.labelAr, option.labelEn)}
                  </span>
                  <span className="block truncate text-[9px] text-slate-500">
                    {t(option.hintAr, option.hintEn)}
                  </span>
                </span>
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    active ? 'bg-emerald-400' : 'bg-slate-600'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
          <Palette className="h-3 w-3 text-fuchsia-300" />
          {t('ألوان الكابشن (مرتبطة بالهوية)', 'Caption colors (brand-linked)')}
        </span>
        {COLOR_FIELDS.map(({ field, sourceField, labelAr, labelEn }) => {
          const source = normalizeCaptionColorSource(
            captionColors[sourceField],
            field === 'background'
              ? 'primary'
              : field === 'text'
                ? 'text'
                : 'accent'
          );
          const resolved = resolveCaptionColor(
            captionColors[field],
            source,
            brandKit,
            brandKit.primaryColor
          );
          return (
            <div key={field} className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-6 w-6 shrink-0 rounded-md border border-white/20"
                  style={{ backgroundColor: resolved }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-slate-300">
                  {t(labelAr, labelEn)}
                </span>
                <select
                  value={source}
                  disabled={disabled}
                  aria-label={t(`مصدر لون ${labelAr}`, `${labelEn} color source`)}
                  onChange={(event) =>
                    setSource(sourceField, event.target.value as CaptionColorSource)
                  }
                  className="w-[104px] shrink-0 rounded-lg border border-white/10 bg-[#10141D] px-1.5 py-1 text-[10px] text-slate-100 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <option value="background">{sourceLabel('background')}</option>
                  <option value="text">{sourceLabel('text')}</option>
                  <option value="primary">{sourceLabel('primary')}</option>
                  <option value="secondary">{sourceLabel('secondary')}</option>
                  <option value="accent">{sourceLabel('accent')}</option>
                  <option value="custom">{sourceLabel('custom')}</option>
                </select>
              </div>
              {source === 'custom' ? (
                <ColorFormatPicker
                  label={t(labelAr, labelEn)}
                  value={captionColors[field]}
                  onChange={(value) => setCustomColor(field, value)}
                  disabled={disabled}
                  compact
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="space-y-1">
        <label className="block space-y-1">
          <span className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
            <span>{t('ارتفاع الكابشن', 'Caption vertical height')}</span>
            <span className="font-mono text-emerald-300 tabular-nums" dir="ltr">
              {captionBottomOffset}%
            </span>
          </span>
          <input
            type="range"
            min={10}
            max={40}
            step={1}
            value={captionBottomOffset}
            disabled={disabled}
            onChange={(event) => onChangeCaptionBottomOffset(Number(event.target.value))}
            className="w-full accent-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={t('ارتفاع الكابشن عن الأسفل', 'Caption bottom offset')}
          />
        </label>
        <p className="text-[9px] leading-relaxed text-slate-500">
          {t(
            'الافتراضي 20% يحمي الكابشن من أزرار TikTok وReels وShorts في الأسفل.',
            'The 20% default keeps captions above the TikTok, Reels and Shorts bottom UI.'
          )}
        </p>
      </div>
    </section>
  );
}
