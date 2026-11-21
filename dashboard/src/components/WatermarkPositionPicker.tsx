import { Move } from 'lucide-react';
import { useI18n } from '../i18n';
import {
  WATERMARK_POSITIONS,
  type WatermarkPosition,
} from '../types/studio';

const POSITION_LABELS: Record<WatermarkPosition, { ar: string; en: string }> = {
  'top-left': { ar: 'أعلى اليسار', en: 'Top-Left' },
  'top-right': { ar: 'أعلى اليمين', en: 'Top-Right' },
  'bottom-left': { ar: 'أسفل اليسار', en: 'Bottom-Left' },
  'bottom-right': { ar: 'أسفل اليمين', en: 'Bottom-Right' },
};

interface WatermarkPositionPickerProps {
  value: WatermarkPosition;
  onChange: (next: WatermarkPosition) => void;
  disabled?: boolean;
  className?: string;
}

export function WatermarkPositionPicker({
  value,
  onChange,
  disabled = false,
  className = '',
}: WatermarkPositionPickerProps) {
  const { t } = useI18n();

  return (
    <label
      title={t('موضع العلامة المائية', 'Watermark position')}
      className={`inline-flex min-w-0 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-[#10141D] px-2 py-1.5 text-[11px] text-slate-100 focus-within:border-sky-400 disabled:opacity-40 ${className}`}
    >
      <Move className="h-3.5 w-3.5 shrink-0 text-sky-300" />
      <select
        value={value}
        disabled={disabled}
        aria-label={t('موضع العلامة المائية', 'Watermark position')}
        onChange={(event) =>
          onChange(event.target.value as WatermarkPosition)
        }
        className="min-w-0 cursor-pointer bg-transparent text-[11px] font-semibold text-slate-100 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
      >
        {WATERMARK_POSITIONS.map((position) => (
          <option
            key={position}
            value={position}
            className="bg-[#10141D] text-slate-100"
          >
            {t(POSITION_LABELS[position].ar, POSITION_LABELS[position].en)}
          </option>
        ))}
      </select>
    </label>
  );
}
