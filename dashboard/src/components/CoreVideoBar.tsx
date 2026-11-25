import { useLayoutEffect, useRef, useState } from 'react';
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
import { ModeInfoPopover } from './ModeInfoPopover';
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
  showWatermark?: boolean;
  variant?: 'panel' | 'toolbar';
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
  showWatermark = true,
  variant = 'panel',
  disabled = false,
}: CoreVideoBarProps) {
  const { t, isRtl, dir } = useI18n();
  const isToolbar = variant === 'toolbar';
  const toolbarRef = useRef<HTMLElement | null>(null);
  const [showFullModeLabels, setShowFullModeLabels] = useState(false);

  useLayoutEffect(() => {
    if (!isToolbar) return;
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    const updateLabelMode = () => {
      setShowFullModeLabels(toolbar.clientWidth >= 900);
    };
    updateLabelMode();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateLabelMode);
      return () => window.removeEventListener('resize', updateLabelMode);
    }
    const observer = new ResizeObserver(updateLabelMode);
    observer.observe(toolbar);
    return () => observer.disconnect();
  }, [isToolbar]);

  if (isToolbar) {
    const modePills = [
      {
        id: 'depth' as const,
        active: enable25D,
        onClick: () => onChangeEnable25D(!enable25D),
        icon: Layers,
        label: t('وضع العمق 2.5D', '2.5D Depth Mode'),
        compactLabel: t('2.5D', '2.5D'),
        title: t('وضع العمق 2.5D', '2.5D Depth Mode'),
        tone: 'violet' as const,
      },
      {
        id: 'broll' as const,
        active: cleanBrollMode,
        onClick: () => onChangeCleanBrollMode(!cleanBrollMode),
        icon: Clapperboard,
        label: t('وضع B-Roll نظيف', 'Clean B-Roll Mode'),
        compactLabel: t('B-Roll', 'B-Roll'),
        title: t('وضع B-Roll النظيف', 'Clean B-Roll Mode'),
        tone: 'amber' as const,
      },
      {
        id: 'safe' as const,
        active: respectSafeZone,
        onClick: () => onChangeRespectSafeZone(!respectSafeZone),
        icon: ShieldCheck,
        label: t('احترام منطقة الأمان', 'Respect Safe Zone'),
        compactLabel: t('آمن', 'Safe Zone'),
        title: t('احترام منطقة الأمان', 'Respect Safe Zone'),
        tone: 'emerald' as const,
      },
    ];
    const toneClasses = {
      violet: {
        on: 'border-violet-400/45 bg-violet-500/20 text-violet-100',
        off: 'border-white/10 bg-[#0B0E14] text-slate-400 hover:border-violet-400/35 hover:text-violet-200',
        icon: 'text-violet-300',
      },
      amber: {
        on: 'border-amber-400/45 bg-amber-500/20 text-amber-100',
        off: 'border-white/10 bg-[#0B0E14] text-slate-400 hover:border-amber-400/35 hover:text-amber-200',
        icon: 'text-amber-300',
      },
      emerald: {
        on: 'border-emerald-400/45 bg-emerald-500/20 text-emerald-100',
        off: 'border-white/10 bg-[#0B0E14] text-slate-400 hover:border-emerald-400/35 hover:text-emerald-200',
        icon: 'text-emerald-300',
      },
    };

    return (
      <section
        ref={toolbarRef}
        dir={dir}
        className="zoe-toolbar-scroll flex h-11 max-h-11 min-w-0 w-full max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-sky-500/25 bg-[#0E121A] px-1.5 shadow-[0_12px_40px_-34px_rgba(56,189,248,0.8)]"
      >
        <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-sky-400/20 bg-sky-500/10 px-1.5 text-[9px] font-black uppercase tracking-wide text-sky-200">
          <SlidersHorizontal className="h-3 w-3" />
          {t('إعدادات', 'Setup')}
        </span>

        <div className="inline-flex h-7 shrink-0 items-center rounded-md border border-white/10 bg-[#0B0E14] p-0.5" role="group" aria-label={t('نسبة الأبعاد', 'Aspect ratio')}>
          <Monitor className="mx-1 h-3 w-3 shrink-0 text-sky-300" />
          {ASPECT_RATIO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              onClick={() => onChangeAspectRatio(preset.id)}
              aria-pressed={aspectRatio === preset.id}
              title={preset.dimensions}
              className={`h-6 rounded px-1.5 font-mono text-[9px] font-bold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                aspectRatio === preset.id
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {preset.id}
            </button>
          ))}
        </div>

        <span className="h-5 w-px shrink-0 bg-white/10" />

        <div className="w-[208px] shrink-0">
          <LanguageSelect value={scriptLanguage} onChange={onChangeScriptLanguage} disabled={disabled} />
        </div>

        <span className="h-5 w-px shrink-0 bg-white/10" />

        <div className="inline-flex h-7 shrink-0 items-center rounded-md border border-white/10 bg-[#0B0E14] p-0.5" role="group" aria-label={t('معدل الإطارات', 'Frame rate')}>
          <Sparkles className="mx-1 h-3 w-3 shrink-0 text-sky-300" />
          {([30, 60] as FpsOption[]).map((option) => (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => onChangeFps(option)}
              aria-pressed={fps === option}
              className={`h-6 rounded px-1.5 font-mono text-[9px] font-bold tabular-nums transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                fps === option ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <span className="h-5 w-px shrink-0 bg-white/10" />

        <label className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-white/10 bg-[#0B0E14] px-1.5 text-slate-300">
          <Clock3 className="h-3 w-3 shrink-0 text-sky-300" />
          <span className="sr-only">{t('المدة', 'Duration')}</span>
          <select
            value={targetDuration}
            disabled={disabled}
            onChange={(event) => onChangeTargetDuration(event.target.value as ExportTargetDuration)}
            className="h-6 cursor-pointer appearance-none bg-transparent pe-4 font-mono text-[9px] font-bold text-slate-100 outline-none disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={t('المدة', 'Duration')}
          >
            {DURATION_OPTIONS.map((option) => (
              <option key={option.id} value={option.id} className="bg-[#10141D] text-slate-100">
                {option.id === 'auto' ? t('تلقائي', 'Auto') : option.label}
              </option>
            ))}
          </select>
        </label>

        <span className="h-5 w-px shrink-0 bg-white/10" />

        {modePills.map((mode) => {
          const Icon = mode.icon;
          const colors = toneClasses[mode.tone];
          return (
            <div key={mode.id} className="inline-flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                disabled={disabled}
                aria-pressed={mode.active}
                title={mode.title}
                onClick={mode.onClick}
                className={`inline-flex h-7 items-center gap-1 rounded-md border px-1.5 text-[9px] font-bold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                  mode.active ? colors.on : colors.off
                }`}
              >
                <Icon className={`h-3 w-3 shrink-0 ${mode.active ? '' : colors.icon}`} />
                <span className="whitespace-nowrap">{showFullModeLabels ? mode.label : mode.compactLabel}</span>
              </button>
              <ModeInfoPopover mode={mode.id} />
            </div>
          );
        })}
      </section>
    );
  }

  return (
    <section className={`min-w-0 w-full max-w-full rounded-xl border border-sky-500/25 bg-[#0E121A] shadow-[0_18px_60px_-50px_rgba(56,189,248,0.7)] ${isToolbar ? 'p-2' : 'p-3.5'}`}>
      <div className={`flex flex-wrap items-center gap-2.5 ${isToolbar ? 'mb-2' : 'mb-3.5'}`}>
        <span className={`inline-flex shrink-0 items-center justify-center rounded-lg border border-sky-400/25 bg-sky-500/12 text-sky-200 ${isToolbar ? 'h-6 w-6' : 'h-8 w-8'}`}>
          <SlidersHorizontal className={isToolbar ? 'h-3 w-3' : 'h-4 w-4'} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-[13px] font-bold text-slate-100">
            {t('إعدادات الفيديو الأساسية', 'Core video settings')}
          </h2>
          {!isToolbar ? (
          <p className="mt-0.5 truncate text-[11px] leading-tight text-slate-500">
            {t(
              'الأبعاد واللغة ومعدل الإطارات والمدة وأوضاع العرض — كل ما تحتاجه قبل التصدير.',
              'Dimensions, language, frame rate, duration and display modes — everything before export.',
            )}
          </p>
          ) : null}
        </div>
        <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-200">
          {t('شريط أساسي', 'CORE')}
        </span>
      </div>

      <div
        dir="ltr"
        className={`grid min-w-0 auto-rows-fr items-stretch ${isToolbar ? 'gap-2' : 'gap-3.5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}
        style={isToolbar ? { gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' } : undefined}
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
          style={isToolbar ? { gridColumn: 'span 2' } : undefined}
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
          style={isToolbar ? { gridColumn: 'span 2' } : undefined}
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
              <ModeInfoPopover mode="depth" />
              <ToggleSwitch
                checked={enable25D}
                onChange={() => onChangeEnable25D(!enable25D)}
                disabled={disabled}
                label={t('تبديل وضع العمق 2.5D', 'Toggle 2.5D depth mode')}
                tone="violet"
              />
            </div>
            {enable25D ? (
              <p className="rounded-lg border border-violet-400/15 bg-violet-500/[0.06] px-2 py-1.5 text-[9px] leading-relaxed text-violet-200/80">
                {t(
                  'تفعيل عمق 2.5D يضيف طبقات حركة إضافية وقد يزيد وقت كتابة المشاهد والريندر قليلاً.',
                  'Enabling 2.5D depth adds layered motion and may slightly increase scene coding & render time.'
                )}
              </p>
            ) : null}
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
              <ModeInfoPopover mode="broll" />
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
              <ModeInfoPopover mode="safe" />
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

        {showWatermark ? (
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
              placeholder="@ZoeditStudio"
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
        ) : null}
      </div>
    </section>
  );
}
