import {
  BrainCircuit,
  CircleDollarSign,
  Film,
  Loader2,
  Mic,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useI18n } from '../i18n';
import type {
  LiveBalancesResponse,
  UsageBreakdown,
  UsageResponse,
} from '../types/studio';

interface UsageCostPanelProps {
  usage: UsageResponse | null;
  balances: LiveBalancesResponse | null;
  loadingUsage: boolean;
  loadingBalances: boolean;
  notice: string | null;
  voiceoverEnabled: boolean;
  onRefresh: () => Promise<void> | void;
  onReset: () => Promise<void> | void;
}

function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (value > 0 && value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function usageValue(
  counter: UsageBreakdown,
  key: keyof UsageBreakdown
): number {
  const value = counter[key];
  return typeof value === 'number' ? value : 0;
}

export function UsageCostPanel({
  usage,
  balances,
  loadingUsage,
  loadingBalances,
  notice,
  voiceoverEnabled,
  onRefresh,
  onReset,
}: UsageCostPanelProps) {
  const { t } = useI18n();
  const project = usage?.project.usage;
  const allTime = usage?.allTime.usage;
  const eleven = balances?.elevenlabs;
  const llm = balances?.llm;

  const handleReset = () => {
    if (
      window.confirm(
        t(
          'هل تريد تصفير عداد الاستهلاك للمشروع والإجمالي التراكمي؟',
          'Reset both the project and cumulative usage counters?'
        )
      )
    ) {
      void onReset();
    }
  };

  const rows: Array<{
    id: string;
    icon: typeof BrainCircuit;
    color: string;
    labelAr: string;
    labelEn: string;
    detailAr: string;
    detailEn: string;
    projectValue: string;
    allValue: string;
  }> = [
    {
      id: 'ai',
      icon: BrainCircuit,
      color: 'text-violet-300',
      labelAr: 'الذكاء الاصطناعي (Script & Custom TSX)',
      labelEn: 'AI (Script & Custom TSX)',
      detailAr: `إدخال ${formatNumber(
        project ? usageValue(project, 'aiInputTokens') : 0
      )} · إخراج ${formatNumber(
        project ? usageValue(project, 'aiOutputTokens') : 0
      )} توكن · ${project?.aiModel || '—'}`,
      detailEn: `In ${formatNumber(
        project ? usageValue(project, 'aiInputTokens') : 0
      )} · Out ${formatNumber(
        project ? usageValue(project, 'aiOutputTokens') : 0
      )} tokens · ${project?.aiModel || '—'}`,
      projectValue: formatUsd(project?.aiUsd),
      allValue: formatUsd(allTime?.aiUsd),
    },
    {
      id: 'tts',
      icon: Mic,
      color: 'text-sky-300',
      labelAr: 'التعليق الصوتي (ElevenLabs TTS)',
      labelEn: 'Voiceover (ElevenLabs TTS)',
      detailAr: `${formatNumber(
        project ? usageValue(project, 'ttsCharacters') : 0
      )} حرف · ${formatNumber(
        project ? usageValue(project, 'ttsCalls') : 0
      )} استدعاء${voiceoverEnabled ? '' : ' · الوضع الصامت مفعّل'}`,
      detailEn: `${formatNumber(
        project ? usageValue(project, 'ttsCharacters') : 0
      )} chars · ${formatNumber(
        project ? usageValue(project, 'ttsCalls') : 0
      )} calls${voiceoverEnabled ? '' : ' · silent mode'}`,
      projectValue: formatUsd(project?.ttsUsd),
      allValue: formatUsd(allTime?.ttsUsd),
    },
    {
      id: 'visual',
      icon: Sparkles,
      color: 'text-amber-300',
      labelAr: 'الرسوم والتصيير (Visuals & Render)',
      labelEn: 'Visuals & Render',
      detailAr: `${formatNumber(
        project ? usageValue(project, 'visualCalls') : 0
      )} استدعاء بصري · ${formatNumber(
        project ? usageValue(project, 'renderedFrames') : 0
      )} إطار محلي · ${formatNumber(
        project ? usageValue(project, 'renderJobs') : 0
      )} تصيير`,
      detailEn: `${formatNumber(
        project ? usageValue(project, 'visualCalls') : 0
      )} visual calls · ${formatNumber(
        project ? usageValue(project, 'renderedFrames') : 0
      )} local frames · ${formatNumber(
        project ? usageValue(project, 'renderJobs') : 0
      )} renders`,
      projectValue: formatUsd(
        (project?.visualUsd || 0) + (project?.renderUsd || 0)
      ),
      allValue: formatUsd((allTime?.visualUsd || 0) + (allTime?.renderUsd || 0)),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-[#0E121A] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 font-display text-sm font-bold text-slate-100">
              <Wallet className="h-4 w-4 text-emerald-300" />
              {t('الأرصدة الحية للحساب', 'Live account balances')}
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {t(
                'تُجلب مباشرة من ElevenLabs ومزود الذكاء الاصطناعي عند التحميل أو التحديث.',
                'Fetched directly from ElevenLabs and your LLM provider on load or refresh.'
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void onRefresh()}
              disabled={loadingUsage || loadingBalances}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0B0E14] px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-sky-400/40 disabled:opacity-50 cursor-pointer"
            >
              {loadingUsage || loadingBalances ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {t('تحديث الرصيد (Refresh)', 'Refresh balance')}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={loadingUsage}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('تصفير العداد (Reset)', 'Reset counter')}
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="min-w-0 rounded-lg border border-sky-400/20 bg-sky-500/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-sky-200">
                {t('رصيد ElevenLabs', 'ElevenLabs quota')}
              </span>
              <span className="rounded-full border border-white/10 bg-[#0B0E14] px-2 py-0.5 text-[10px] font-mono text-slate-300">
                {eleven?.tier || (eleven?.configured ? '—' : t('غير مضاف', 'not set'))}
              </span>
            </div>
            {eleven?.ok ? (
              <>
                <div className="mt-1.5 font-display text-lg font-bold text-slate-50 tabular-nums">
                  {formatNumber(eleven.remaining)}{' '}
                  <span className="text-xs font-medium text-slate-400">
                    {t('حرف متبقٍ', 'chars left')}
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-slate-500 tabular-nums" dir="ltr">
                  {formatNumber(eleven.characterCount)} / {formatNumber(eleven.characterLimit)}
                </p>
              </>
            ) : eleven?.hint ? (
              <p className="mt-1.5 text-[11px] leading-relaxed text-amber-300">{eleven.hint}</p>
            ) : (
              <p className="mt-1.5 text-[11px] text-slate-400">
                {eleven?.error ||
                  (eleven?.configured
                    ? t('لا توجد بيانات رصيد متاحة.', 'No quota data available.')
                    : t('أضف مفتاح ElevenLabs من الإعدادات.', 'Add an ElevenLabs key in settings.'))}
              </p>
            )}
          </div>

          <div className="min-w-0 rounded-lg border border-violet-400/20 bg-violet-500/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-violet-200">
                {t('رصيد الذكاء الاصطناعي', 'LLM credits')}
              </span>
              <span className="rounded-full border border-white/10 bg-[#0B0E14] px-2 py-0.5 text-[10px] font-mono text-slate-300">
                {llm?.provider && llm.provider !== 'none' ? llm.provider : t('غير مضاف', 'not set')}
              </span>
            </div>
            {llm?.ok ? (
              <>
                <div className="mt-1.5 font-display text-lg font-bold text-slate-50 tabular-nums">
                  {typeof llm.remainingUsd === 'number'
                    ? `${llm.currency && llm.currency !== 'USD' ? llm.currency + ' ' : ''}${llm.remainingUsd.toFixed(2)}`
                    : formatUsd(llm.remainingUsd)}
                  <span className="ms-1 text-xs font-medium text-slate-400">
                    {t('متبقٍ', 'left')}
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-slate-500 tabular-nums" dir="ltr">
                  used {formatUsd(llm.usedUsd)} · limit {formatUsd(llm.limitUsd)}
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                {llm?.error ||
                  (llm?.configured
                    ? t('لا توجد بيانات رصيد متاحة.', 'No credit data available.')
                    : t(
                        'أضف مفتاح OpenRouter أو DeepSeek لعرض الرصيد.',
                        'Add an OpenRouter or DeepSeek key to see credits.'
                      ))}
              </p>
            )}
          </div>
        </div>

        {notice ? (
          <p className="mt-2 rounded-lg border border-white/10 bg-[#0B0E14] px-3 py-2 text-[11px] text-slate-300">
            {notice}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0E121A]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-4 py-3">
          <h3 className="flex items-center gap-2 font-display text-sm font-bold text-slate-100">
            <CircleDollarSign className="h-4 w-4 text-emerald-300" />
            {t('تفصيل الاستهلاك والتكلفة', 'Itemized usage & cost')}
          </h3>
          <span className="font-mono text-[10px] text-slate-500" dir="ltr">
            {usage?.usageFile || '~/.zof-studio/usage.json'}
          </span>
        </div>

        <div className="divide-y divide-white/6">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <div key={row.id} className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className={`mt-0.5 shrink-0 ${row.color}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-100">
                      {t(row.labelAr, row.labelEn)}
                    </p>
                    <p className="mt-0.5 break-words font-mono text-[10px] leading-relaxed text-slate-500" dir="ltr">
                      {t(row.detailAr, row.detailEn)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="text-end">
                    <p className="text-[9px] uppercase tracking-wide text-slate-500">
                      {t('المشروع', 'Project')}
                    </p>
                    <p className="font-mono text-xs font-semibold text-slate-100 tabular-nums">
                      {row.projectValue}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-[9px] uppercase tracking-wide text-slate-500">
                      {t('تراكمي', 'All-time')}
                    </p>
                    <p className="font-mono text-xs font-semibold text-slate-300 tabular-nums">
                      {row.allValue}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-2 border-t border-white/10 bg-[#0B0E14] px-4 py-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-400/25 bg-emerald-500/8 px-3 py-2">
            <span className="text-[11px] font-semibold text-emerald-200">
              {t('المجموع الكلي (المشروع)', 'Project total')}
            </span>
            <span className="font-mono text-sm font-bold text-emerald-100 tabular-nums">
              {formatUsd(usage?.project.totalUsd)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <span className="text-[11px] font-semibold text-slate-300">
              {t('المجموع الكلي (تراكمي)', 'Cumulative total')}
            </span>
            <span className="font-mono text-sm font-bold text-slate-100 tabular-nums">
              {formatUsd(usage?.allTime.totalUsd)}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/8 bg-[#0B0E14] p-3">
        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-400">
          <Film className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
          {t(
            'التصيير يتم محلياً عبر Remotion لذلك تكلفة الإطارات $0.00 — تُحتسب فقط استدعاءات الذكاء الاصطناعي و ElevenLabs.',
            'Rendering runs locally through Remotion, so frames cost $0.00 — only AI and ElevenLabs calls are billed.'
          )}
        </p>
      </div>
    </div>
  );
}
