import { useEffect, useState } from 'react';
import { Loader2, MicOff, TriangleAlert, WandSparkles, X } from 'lucide-react';
import { useI18n } from '../i18n';

interface VoiceoverConfirmDialogProps {
  open: boolean;
  busy?: boolean;
  error?: string | null;
  onAutoGenerate: (remember: boolean) => void;
  onContinueSilent: (remember: boolean) => void;
  onClose: () => void;
}

export function VoiceoverConfirmDialog({
  open,
  busy = false,
  error = null,
  onAutoGenerate,
  onContinueSilent,
  onClose,
}: VoiceoverConfirmDialogProps) {
  const { t } = useI18n();
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    if (open) setRemember(false);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="voiceover-confirm-title"
        className="w-full max-w-md rounded-2xl border border-sky-400/25 bg-[#0E121A] p-5 shadow-[0_40px_140px_-40px_rgba(56,189,248,0.55)]"
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/15 text-sky-200">
            <WandSparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="voiceover-confirm-title" className="text-sm font-bold text-slate-100">
              {t('لا يوجد سكربت صوتي بعد', 'No voiceover script yet')}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {t(
                'التعليق الصوتي مفعّل والبرومبت الرئيسي جاهز، لكن السكربت الصوتي فارغ. هل تريد توليد سكربت تلقائياً من البرومبت الرئيسي، أم المتابعة بدون تعليق صوتي (صامت)؟',
                'Audio is ON and your master prompt is ready, but the voiceover script is empty. Would you like to auto-generate one from your Master Prompt, or continue without voiceover (silent)?'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={t('إغلاق', 'Close')}
            className="rounded-md p-1 text-slate-500 transition-colors hover:text-slate-100 disabled:opacity-40 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-2.5 py-2 text-[11px] leading-relaxed text-red-200">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        ) : null}

        <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-[#0B0E14] px-2.5 py-2 text-[11px] font-semibold text-slate-300">
          <input
            type="checkbox"
            checked={remember}
            disabled={busy}
            onChange={(event) => setRemember(event.target.checked)}
            className="h-3.5 w-3.5 accent-sky-500"
          />
          {t('لا تسألني مرة أخرى', "Don't ask me again")}
        </label>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onContinueSilent(remember)}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/12 bg-[#10141D] px-3 py-2 text-xs font-bold text-slate-200 transition-colors hover:border-slate-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <MicOff className="h-4 w-4" />
            {t('متابعة صامت', 'Continue silent')}
          </button>
          <button
            type="button"
            onClick={() => onAutoGenerate(remember)}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-xs font-black text-slate-950 transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <WandSparkles className="h-4 w-4" />
            )}
            {t('توليد صوتي ومتابعة', 'Auto-generate voiceover & continue')}
          </button>
        </div>
      </div>
    </div>
  );
}
