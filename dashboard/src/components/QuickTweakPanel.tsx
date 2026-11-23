import { Loader2, Wand2 } from 'lucide-react';
import { useI18n } from '../i18n';

interface QuickTweakPanelProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  sceneCount: number;
  disabled?: boolean;
  busy?: boolean;
  notice?: string | null;
}

export function QuickTweakPanel({
  value,
  onChange,
  onSubmit,
  sceneCount,
  disabled = false,
  busy = false,
  notice = null,
}: QuickTweakPanelProps) {
  const { t } = useI18n();
  const canSubmit = Boolean(value.trim()) && !disabled && !busy;

  return (
    <section className="min-w-0 w-full max-w-full rounded-2xl border border-sky-500/20 bg-[#0D1119] p-3 sm:p-4">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-500/10 text-sky-300">
          <Wand2 className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-100">
            {t('تعديل سريع بالبرومبت', 'Quick prompt tweak')}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
            {t(
              `عدّل ${sceneCount} مشاهد مولّدة بصرياً أو حركياً ثم أعد التصدير مع الحفاظ على التعليق الصوتي الحالي بدون إعادة توليده.`,
              `Tweak the visuals or motion of ${sceneCount} generated scenes and re-render while reusing the current voiceover without regenerating it.`
            )}
          </p>
        </div>
      </div>

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
          placeholder={t(
            'مثال: اجعل الحركة أبطأ وغيّر المشهد الثاني إلى خط زمني متدرج.',
            'Example: slow the motion down and turn scene 2 into a stepped timeline.'
          )}
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
