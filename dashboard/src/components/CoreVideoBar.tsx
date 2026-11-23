import {
  Clapperboard,
  Clock3,
  Droplet,
  Languages,
  Layers,
  Monitor,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { LanguageSelect } from './LanguageSelect';
import { WatermarkPositionPicker } from './WatermarkPositionPicker';
import {
  ASPECT_RATIO_PRESETS,
  type AspectRatio,
  type BrandKit,
  type ExportTargetDuration,
  type FpsOption,
  type ScriptLanguage,
} from '../types/studio';

interface CoreVideoBarProps {
  aspectRatio: AspectRatio;
  onChangeAspectRatio: (value: AspectRatio) => void;
  scriptLanguage: ScriptLanguage;
  onChangeScriptLanguage: (value: ScriptLanguage) => void;
  fps: FpsOption;
  onChangeFps: (value: FpsOption) => void;
  targetDuration: ExportTargetDuration;
  onChangeTargetDuration: (value: ExportTargetDuration) => void;
  enable25D: boolean;
  onChangeEnable25D: (value: boolean) => void;
  cleanBrollMode: boolean;
  onChangeCleanBrollMode: (value: boolean) => void;
  respectSafeZone: boolean;
  onChangeRespectSafeZone: (value: boolean) => void;
  brandKit: BrandKit;
  onChangeBrandKit: (next: BrandKit) => void;
  disabled?: boolean;
}

const DURATION_OPTIONS: Array<{ id: ExportTargetDuration; label: string }> = [
  { id: '3', label: '3s' },
  { id: '5', label: '5s' },
  { id: '8', label: '8s' },
  { id: '12', label: '12s' },
  { id: '15', label: '15s' },
  { id: '30', label: '30s' },
  { id: '45', label: '45s' },
  { id: '60', label: '60s' },
  { id: '90', label: '90s' },
  { id: 'auto', label: 'auto' },
];

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
  tone,
}: {
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
  label: string;
  tone: 'violet' | 'amber' | 'emerald';
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
        checked
          ? tone === 'violet'
            ? 'bg-violet-500'
            : tone === 'amber'
              ? 'bg-amber-500'
              : 'bg-emerald-500'
          : 'bg-slate-700'
      }`}
    >
      <span
        className="absolute top-1 h-4 w-4 rounded-full bg-white transition-all"
        style={isRtl ? { right: checked ? 22 : 2 } : { left: checked ? 22 : 2 }}
      />
    </button>
  );
}

export function CoreVideoBar({
  aspectRatio,
  onChangeAspectRatio,
  scriptLanguage,
  onChangeScriptLanguage,
  fps,
  onChangeFps,
  targetDuration,
  onChangeTargetDuration,
  enable25D,
  onChangeEnable25D,
  cleanBrollMode,
  onChangeCleanBrollMode,
  respectSafeZone,
  onChangeRespectSafeZone,
  brandKit,
  onChangeBrandKit,
  disabled = false,
}: CoreVideoBarProps) {
  const { t, isRtl, dir } = useI18n();

  return (
    <section className="min-w-0 w-full max-w-full rounded-2xl border border-sky-500/25 bg-[#0E121A] p-3.5 shadow-[0_18px_60px_-50px_rgba(56,189,248,0.7)]">
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-400/25 bg-sky-500/12 text-sky-200">
          <SlidersHorizontal className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-[13px] font-bold text-slate-100">
            {t('إعدادات الفيديو الأساسية', 'Core video settings')}
          </h2>
          <p className="mt-0.5 truncate text-[11px] leading-tight text-slate-500">
            {t(
              'الأبعاد واللغة ومعدل الإطارات والمدة وأوضاع العرض — كل ما تحتاجه قبل التصدير.',
              'Dimensions, language, frame rate, duration and display modes — everything before export.',
            )}
          </p>
        </div>
        <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-200">
          {t('شريط أساسي', 'CORE')}
        </span>
      </div>

      <div
        dir="ltr"
        className="grid min-w-0 auto-rows-fr grid-cols-1 items-stretch gap-3.5 md:grid-cols-2 xl:grid-cols-3"
      >
        <div
          dir={dir}
          className="flex h-full min-w-0 flex-col rounded-xl border border-white/[0.07] bg-[#0B0E14] p-3"
        >
          <div className="mb-2 flex min-h-6 items-center gap-1.5 text-[10px] font-semibold text-slate-400">
            <Monitor className="h-3.5 w-3.5 text-sky-300" />
            {t('الأبعاد', 'Aspect ratio')}
          </div>
          <div className="flex flex-1 items-center">
            <div className="inline-flex w-full rounded-xl border border-white/10 bg-[#10141D] p-0.5">
              {ASPECT_RATIO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChangeAspectRatio(preset.id)}
                  aria-pressed={aspectRatio === preset.id}
                  title={preset.dimensions}
                  className={`flex-1 rounded-lg px-2 py-1.5 font-mono text-[10px] font-bold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                    aspectRatio === preset.id
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {preset.id}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          dir={dir}
          className="flex h-full min-w-0 flex-col rounded-xl border border-white/[0.07] bg-[#0B0E14] p-3"
        >
          <div className="mb-2 flex min-h-6 items-center gap-1.5 text-[10px] font-semibold text-slate-400">
            <Languages className="h-3.5 w-3.5 text-sky-300" />
            {t('لغة الفيديو', 'Video language')}
          </div>
          <div className="flex flex-1 flex-col justify-center">
            <LanguageSelect
              value={scriptLanguage}
              onChange={onChangeScriptLanguage}
              disabled={disabled}
            />
          </div>
        </div>

        <div
          dir={dir}
          className="flex h-full min-w-0 flex-col rounded-xl border border-white/[0.07] bg-[#0B0E14] p-3"
        >
          <div className="mb-2 flex min-h-6 items-center gap-1.5 text-[10px] font-semibold text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-sky-300" />
            {t('معدل الإطارات', 'Frame rate')}
          </div>
          <div className="flex flex-1 items-center">
            <div className="inline-flex w-full rounded-xl border border-white/10 bg-[#10141D] p-0.5">
              {([30, 60] as FpsOption[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChangeFps(option)}
                  aria-pressed={fps === option}
                  className={`flex-1 rounded-lg px-2 py-1.5 font-mono text-[10px] font-bold transition-colors cursor-pointer tabular-nums disabled:cursor-not-allowed disabled:opacity-40 ${
                    fps === option
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {option}fps
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          dir={dir}
          className="flex h-full min-w-0 flex-col rounded-xl border border-white/[0.07] bg-[#0B0E14] p-3"
        >
          <div className="mb-2 flex min-h-6 items-center gap-1.5 text-[10px] font-semibold text-slate-400">
            <Clock3 className="h-3.5 w-3.5 text-sky-300" />
            {t('المدة', 'Duration')}
          </div>
          <div className="flex flex-1 items-center">
            <div className="grid w-full grid-cols-5 gap-1.5 rounded-xl border border-white/10 bg-[#10141D] p-1">
              {DURATION_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChangeTargetDuration(option.id)}
                  aria-pressed={targetDuration === option.id}
                  className={`rounded-lg px-1.5 py-1.5 text-[10px] font-bold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                    targetDuration === option.id
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {option.id === 'auto' ? t('تلقائي', 'Auto') : option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          dir={dir}
          className="flex h-full min-w-0 flex-col rounded-xl border border-white/[0.07] bg-[#0B0E14] p-3"
        >
          <div className="mb-2 flex min-h-6 items-center gap-1.5 text-[10px] font-semibold text-slate-400">
            <Layers className="h-3.5 w-3.5 text-sky-300" />
            {t('أوضاع العرض', 'Display modes')}
          </div>
          <div className="flex flex-1 flex-col justify-center space-y-1.5">
            <div className="flex items-center gap-2 rounded-lg border border-violet-400/20 bg-[#10141D] px-2 py-1.5">
              <Layers className="h-3.5 w-3.5 shrink-0 text-violet-300" />
              <span className="min-w-0 flex-1 text-start text-[10px] font-semibold leading-snug text-slate-300">
                {t('وضع العمق 2.5D', '2.5D Depth Mode')}
              </span>
              <span
                className={`shrink-0 font-mono text-[9px] ${enable25D ? 'text-violet-200' : 'text-slate-500'}`}
              >
                {enable25D ? t('مفعّل', 'ON') : t('مغلق', 'OFF')}
              </span>
              <ToggleSwitch
                checked={enable25D}
                onChange={() => onChangeEnable25D(!enable25D)}
                disabled={disabled}
                label={t('تبديل وضع العمق 2.5D', 'Toggle 2.5D depth mode')}
                tone="violet"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-amber-400/20 bg-[#10141D] px-2 py-1.5">
              <Clapperboard className="h-3.5 w-3.5 shrink-0 text-amber-300" />
              <span className="min-w-0 flex-1 text-start text-[10px] font-semibold leading-snug text-slate-300">
                {t('وضع اللقطة البصرية (B-Roll نظيف)', 'Clean B-Roll Mode')}
              </span>
              <span
                className={`shrink-0 font-mono text-[9px] ${cleanBrollMode ? 'text-amber-200' : 'text-slate-500'}`}
              >
                {cleanBrollMode ? t('مفعّل', 'ON') : t('مغلق', 'OFF')}
              </span>
              <ToggleSwitch
                checked={cleanBrollMode}
                onChange={() => onChangeCleanBrollMode(!cleanBrollMode)}
                disabled={disabled}
                label={t(
                  'تبديل وضع اللقطة البصرية النظيف',
                  'Toggle clean B-Roll mode',
                )}
                tone="amber"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-[#10141D] px-2 py-1.5">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
              <span className="min-w-0 flex-1 text-start text-[10px] font-semibold leading-snug text-slate-300">
                {t('احترام منطقة الأمان', 'Respect Safe Zone')}
              </span>
              <span
                className={`shrink-0 font-mono text-[9px] ${respectSafeZone ? 'text-emerald-200' : 'text-slate-500'}`}
              >
                {respectSafeZone ? t('مفعّل', 'ON') : t('مغلق', 'OFF')}
              </span>
              <ToggleSwitch
                checked={respectSafeZone}
                onChange={() => onChangeRespectSafeZone(!respectSafeZone)}
                disabled={disabled}
                label={t('تبديل احترام منطقة الأمان', 'Toggle respect safe zone')}
                tone="emerald"
              />
            </div>
          </div>
        </div>

        <div
          dir={dir}
          className="flex h-full min-w-0 flex-col rounded-xl border border-white/[0.07] bg-[#0B0E14] p-3"
        >
          <div className="mb-2 flex min-h-6 items-center justify-between gap-1.5 text-[10px] font-semibold text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Droplet className="h-3.5 w-3.5 text-sky-300" />
              {t('العلامة المائية', 'Watermark')}
            </span>
            <ToggleSwitch
              checked={brandKit.watermarkEnabled}
              onChange={() =>
                onChangeBrandKit({
                  ...brandKit,
                  watermarkEnabled: !brandKit.watermarkEnabled,
                })
              }
              disabled={disabled}
              label={t('تبديل العلامة المائية', 'Toggle watermark')}
              tone="violet"
            />
          </div>
          <div className="flex flex-1 flex-col justify-center space-y-1.5">
            <input
              type="text"
              value={brandKit.watermark}
              disabled={!brandKit.watermarkEnabled || disabled}
              onChange={(event) =>
                onChangeBrandKit({ ...brandKit, watermark: event.target.value })
              }
              placeholder="@ZofStudio"
              className="w-full rounded-lg border border-white/10 bg-[#10141D] px-2.5 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
            />
            <WatermarkPositionPicker
              value={brandKit.watermarkPosition ?? 'top-left'}
              disabled={!brandKit.watermarkEnabled || disabled}
              onChange={(watermarkPosition) =>
                onChangeBrandKit({ ...brandKit, watermarkPosition })
              }
              className="w-full justify-between"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
