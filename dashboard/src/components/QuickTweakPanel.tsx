import { Fragment, type ReactNode } from 'react';
import { Loader2, RotateCcw, Target, TriangleAlert, Wand2 } from 'lucide-react';
import { useI18n } from '../i18n';

interface QuickTweakTargetScene {
  id: string;
  index: number;
  title: string;
}

interface QuickTweakPanelProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  sceneCount: number;
  fallbackScenes?: number[];
  targetScene?: QuickTweakTargetScene | null;
  onSelectFallbackScene?: (sceneNumber: number) => void;
  onResetTarget?: () => void;
  disabled?: boolean;
  busy?: boolean;
  notice?: string | null;
}

function formatSceneNumber(sceneNumber: number): string {
  return String(sceneNumber).padStart(2, '0');
}

export function QuickTweakPanel({
  value,
  onChange,
  onSubmit,
  sceneCount,
  fallbackScenes = [],
  targetScene = null,
  onSelectFallbackScene,
  onResetTarget,
  disabled = false,
  busy = false,
  notice = null,
}: QuickTweakPanelProps) {
  const { t } = useI18n();
  const canSubmit = Boolean(value.trim()) && !disabled && !busy;
  const sortedFallbacks = Array.from(
    new Set(
      fallbackScenes.filter(
        (sceneNumber) => Number.isInteger(sceneNumber) && sceneNumber >= 1
      )
    )
  ).sort((left, right) => left - right);
  const targetNumber = targetScene?.index ?? null;
  const targetLabel =
    targetNumber === null
      ? null
      : t(
          `الهدف: المشهد ${formatSceneNumber(targetNumber)}`,
          `Target: Scene ${formatSceneNumber(targetNumber)}`
        );
  const placeholder =
    targetNumber === null
      ? t(
          'مثال: اجعل الحركة أبطأ وغيّر المشهد الثاني إلى خط زمني متدرج.',
          'Example: slow the motion down and turn scene 2 into a stepped timeline.'
        )
      : t(
          `عدّل رؤية أو حركة المشهد ${formatSceneNumber(targetNumber)}...`,
          `Tweak Scene ${formatSceneNumber(targetNumber)} visuals or motion...`
        );

  const renderFallbackMessage = (): ReactNode => {
    if (sortedFallbacks.length === 0) return null;
    const sceneWord =
      sortedFallbacks.length === 1 ? t('المشهد', 'Scene') : t('المشاهد', 'Scenes');
    const prefix = `${t('تم استخدام قالب احتياطي في ', 'Fallback template used in ')}${sceneWord} `;
    return (
      <>
        {prefix}
        {sortedFallbacks.map((sceneNumber, index) => {
          const isLast = index === sortedFallbacks.length - 1;
          const separator =
            index === 0
              ? null
              : sortedFallbacks.length === 2
                ? t(' و', ' and ')
                : isLast
                  ? t('، و', ', and ')
                  : t('، ', ', ');
          return (
            <Fragment key={sceneNumber}>
              {separator}
              <button
                type="button"
                onClick={() => onSelectFallbackScene?.(sceneNumber)}
                className="inline cursor-pointer rounded px-0.5 font-black text-amber-200 underline decoration-amber-300/70 decoration-2 underline-offset-2 transition-colors hover:text-amber-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300"
                title={t(
                  `تحديد المشهد ${formatSceneNumber(sceneNumber)} على الخط الزمني`,
                  `Select Scene ${formatSceneNumber(sceneNumber)} on the timeline`
                )}
              >
                {sceneNumber}
              </button>
            </Fragment>
          );
        })}
        {t('.', '.')}
      </>
    );
  };

  return (
    <section className="min-w-0 w-full max-w-full rounded-2xl border border-sky-500/20 bg-[#0D1119] p-3 sm:p-4">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-500/10 text-sky-300">
          <Wand2 className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-100">
            {t('تعديل سريع بالبرومبت', 'Quick prompt tweak')}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
            {t(
              `عدّل ${sceneCount} مشاهد مولّدة بصرياً أو حركياً ثم أعد التصدير مع الحفاظ على التعليق الصوتي الحالي بدون إعادة توليده.`,
              `Tweak the visuals or motion of ${sceneCount} generated scenes and re-render while reusing the current voiceover without regenerating it.`
            )}
          </p>
          {targetScene && targetLabel ? (
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-sky-400/35 bg-sky-500/12 px-2 py-1 text-[10px] font-bold text-sky-100">
                <Target className="h-3 w-3 shrink-0 text-sky-300" />
                <span className="truncate">{targetLabel}</span>
              </span>
              <span className="min-w-0 max-w-[180px] truncate text-[10px] text-slate-500">
                {targetScene.title}
              </span>
              <button
                type="button"
                onClick={onResetTarget}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-white/10 bg-[#0B0E14] px-1.5 py-1 text-[10px] font-semibold text-slate-300 transition-colors hover:border-sky-400/40 hover:text-slate-100"
              >
                <RotateCcw className="h-3 w-3" />
                {t('إعادة التعيين لكل المشاهد', 'Reset to All Scenes')}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {sortedFallbacks.length > 0 ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-3 flex min-w-0 items-start gap-2 rounded-lg border border-amber-400/35 bg-amber-500/12 px-2.5 py-2"
        >
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
          <p className="min-w-0 text-[11px] leading-relaxed text-amber-100">
            {renderFallbackMessage()}
          </p>
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) onSubmit();
        }}
        className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row"
      >
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled || busy}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#080B11] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-400/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Wand2 className="h-3.5 w-3.5" />
          )}
          <span>
            {busy
              ? t('جاري تطبيق التعديل...', 'Applying tweak...')
              : t('تطبيق وإعادة التصدير', 'Apply & re-render')}
          </span>
        </button>
      </form>

      {notice ? (
        <p className="mt-2 text-[11px] leading-relaxed text-sky-200/90">{notice}</p>
      ) : null}
    </section>
  );
}
