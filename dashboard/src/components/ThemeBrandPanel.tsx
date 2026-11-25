import { Droplet, Fingerprint } from 'lucide-react';
import { useI18n } from '../i18n';
import type { BrandKit } from '../types/studio';
import { ColorsPanel } from './ColorsPanel';
import { WatermarkPositionPicker } from './WatermarkPositionPicker';

interface ThemeBrandPanelProps {
  brandKit: BrandKit;
  onChangeBrandKit: (next: BrandKit) => void;
  disabled?: boolean;
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  const { isRtl } = useI18n();
  return (
    <button
      type="button"
      role="switch"
      disabled={disabled}
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'bg-violet-500' : 'bg-slate-700'
      }`}
    >
      <span
        className="absolute top-1 h-4 w-4 rounded-full bg-white transition-all"
        style={isRtl ? { right: checked ? 22 : 2 } : { left: checked ? 22 : 2 }}
      />
    </button>
  );
}

export function ThemeBrandPanel({ brandKit, onChangeBrandKit, disabled = false }: ThemeBrandPanelProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      <ColorsPanel brandKit={brandKit} onChangeBrandKit={onChangeBrandKit} disabled={disabled} />

      <section className="min-w-0 w-full max-w-full rounded-2xl border border-white/10 bg-[#0E121A] p-3.5 shadow-[0_18px_60px_-50px_rgba(56,189,248,0.7)]">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-400/25 bg-violet-500/12 text-violet-200">
            <Droplet className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-[13px] font-bold text-slate-100">
              {t('العلامة المائية', 'Watermark')}
            </h2>
            <p className="mt-0.5 truncate text-[11px] leading-tight text-slate-500">
              {t('اسم العلامة وموضعها في الفيديو النهائي.', 'Brand text and its position on the final video.')}
            </p>
          </div>
          <ToggleSwitch
            checked={brandKit.watermarkEnabled}
            onChange={() =>
              onChangeBrandKit({ ...brandKit, watermarkEnabled: !brandKit.watermarkEnabled })
            }
            disabled={disabled}
            label={t('تبديل العلامة المائية', 'Toggle watermark')}
          />
        </div>

        <label className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
          <Fingerprint className="h-3.5 w-3.5 text-violet-300" />
          {t('نص العلامة المائية', 'Watermark text')}
        </label>
        <input
          type="text"
          value={brandKit.watermark}
          disabled={!brandKit.watermarkEnabled || disabled}
          onChange={(event) => onChangeBrandKit({ ...brandKit, watermark: event.target.value })}
          placeholder="@ZoeditStudio"
          className="w-full rounded-lg border border-white/10 bg-[#10141D] px-3 py-2 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        />

        <p className="mb-1 mt-3 text-[10px] font-semibold text-slate-400">
          {t('موضع العلامة', 'Watermark position')}
        </p>
        <WatermarkPositionPicker
          value={brandKit.watermarkPosition ?? 'top-left'}
          disabled={!brandKit.watermarkEnabled || disabled}
          onChange={(watermarkPosition) => onChangeBrandKit({ ...brandKit, watermarkPosition })}
          className="w-full justify-between"
        />
      </section>
    </div>
  );
}
