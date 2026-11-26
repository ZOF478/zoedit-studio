import {
  BrainCircuit,
  FileText,
  Loader2,
  RefreshCw,
  WandSparkles,
} from 'lucide-react';
import { useI18n } from '../i18n';
import type { UserAsset } from '../types/studio';
import { UserAssetComposer } from './UserAssetComposer';

interface DirectorScriptPanelProps {
  masterPrompt: string;
  onChangeMasterPrompt: (value: string) => void;
  userAssets: UserAsset[];
  onChangeUserAssets: (assets: UserAsset[]) => void;
  apiBaseUrl: string;
  sessionToken: string;
  voiceoverScript: string;
  onChangeVoiceoverScript: (value: string) => void;
  onGenerateVoiceoverScript: (options?: { rephrase?: boolean }) => void;
  isGeneratingScript?: boolean;
  scriptError?: string | null;
  scriptNotice?: string | null;
  voiceoverEnabled: boolean;
  disabled?: boolean;
}

export function DirectorScriptPanel({
  masterPrompt,
  onChangeMasterPrompt,
  userAssets,
  onChangeUserAssets,
  apiBaseUrl,
  sessionToken,
  voiceoverScript,
  onChangeVoiceoverScript,
  onGenerateVoiceoverScript,
  isGeneratingScript = false,
  scriptError = null,
  scriptNotice = null,
  voiceoverEnabled,
  disabled = false,
}: DirectorScriptPanelProps) {
  const { t, isRtl } = useI18n();
  const scriptWordCount = voiceoverScript.trim().split(/\s+/).filter(Boolean).length;
  const estimatedScriptSec = scriptWordCount
    ? Math.round((scriptWordCount / 2.5) * 10) / 10
    : 0;
  const generateDisabled = disabled || isGeneratingScript || !masterPrompt.trim();

  return (
    <section className="min-w-0 w-full max-w-full overflow-x-hidden rounded-2xl border border-white/10 bg-[#0E121A] p-3.5 shadow-[0_18px_60px_-50px_rgba(56,189,248,0.7)]">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-400/25 bg-violet-500/12 text-violet-200">
          <BrainCircuit className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate font-display text-[13px] font-bold text-slate-100">
            {t('العقل المدبر', 'The Master Mind')}
          </h2>
          <p className="mt-0.5 truncate text-[11px] leading-tight text-slate-500">
            {t(
              'المدخل الإبداعي الوحيد — OpenCode يقرر الإيقاع وتقسيم المشاهد والسرد البصري.',
              'The only creative input — OpenCode decides pacing, scene breakdown, and visual storytelling.'
            )}
          </p>
        </div>
      </div>

      <textarea
        value={masterPrompt}
        onChange={(event) => onChangeMasterPrompt(event.target.value)}
        disabled={disabled}
        rows={7}
        placeholder={t(
          'اكتب فكرة الفيديو الكاملة، الجمهور، النبرة، والرسالة… OpenCode سيحوّلها إلى مشاهد Remotion مخصصة.',
          'Describe the full video idea, audience, tone, and message… OpenCode will turn it into bespoke Remotion scenes.'
        )}
        className="block w-full min-h-[150px] resize-y rounded-xl border border-white/10 bg-[#0B0E14] px-3.5 py-3 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />
      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
        <span>{t('البرومبت الرئيسي', 'Master prompt')}</span>
        <span className="font-mono tabular-nums">{masterPrompt.length}</span>
      </div>

      <UserAssetComposer
        assets={userAssets}
        onChangeAssets={onChangeUserAssets}
        apiBaseUrl={apiBaseUrl}
        sessionToken={sessionToken}
        disabled={disabled}
      />

      <div className="mt-3 space-y-3">
        {voiceoverEnabled ? (
          <div className="rounded-xl border border-sky-400/20 bg-[#0B0E14] p-2.5">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-sky-200">
                <FileText className="h-3.5 w-3.5" />
                {t(
                  'السكربت الصوتي (راجع وعدّل قبل التصدير)',
                  'Spoken script (review & edit before export)'
                )}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onGenerateVoiceoverScript()}
                  disabled={generateDisabled}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-violet-400/40 bg-violet-500/15 px-2 py-1 text-[10px] font-bold text-violet-100 transition-colors hover:border-violet-300/60 hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  {isGeneratingScript ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <WandSparkles className="h-3 w-3" />
                  )}
                  {t('توليد السكربت الصوتي', 'Generate script')}
                </button>
                <button
                  type="button"
                  onClick={() => onGenerateVoiceoverScript({ rephrase: true })}
                  disabled={generateDisabled || !voiceoverScript.trim()}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-[#10141D] px-2 py-1 text-[10px] font-bold text-slate-300 transition-colors hover:border-sky-400/40 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  {isGeneratingScript ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  {t('إعادة صياغة', 'Rephrase')}
                </button>
              </div>
            </div>
            <textarea
              value={voiceoverScript}
              onChange={(event) => onChangeVoiceoverScript(event.target.value)}
              disabled={disabled}
              rows={8}
              dir={isRtl ? 'rtl' : 'ltr'}
              placeholder={t(
                'اكتب فكرتك ثم اضغط «توليد السكربت الصوتي»، أو الصق سكربتك الجاهز هنا للمراجعة والتعديل قبل التصدير.',
                'Write your topic, click “Generate voiceover script”, or paste your own script here to review and edit before export.'
              )}
              className="block w-full min-h-[140px] resize-y rounded-xl border border-white/10 bg-[#0E121A] px-3 py-2.5 text-[12px] leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
              <span className="font-mono tabular-nums">
                {scriptWordCount} {t('كلمة', 'words')}
              </span>
              <span className="font-mono tabular-nums text-sky-300">
                ~{estimatedScriptSec.toFixed(0)}s
              </span>
            </div>
            {scriptError ? (
              <p className="mt-1.5 rounded-lg border border-red-400/30 bg-red-500/10 px-2 py-1 text-[10px] leading-relaxed text-red-200">
                {scriptError}
              </p>
            ) : null}
            {scriptNotice ? (
              <p className="mt-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[10px] leading-relaxed text-emerald-200">
                {scriptNotice}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2.5">
            <WandSparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
            <p className="text-[11px] font-semibold leading-relaxed text-amber-100">
              {t(
                'وضع الإخراج البصري المباشر (بدون تعليق صوتي — يعتمد على البرومبت الرئيسي)',
                'Direct visual output mode (no voiceover — driven by the master prompt)'
              )}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
