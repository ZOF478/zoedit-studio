import {
  Coins,
  KeyRound,
  Languages,
  Mic,
  MicOff,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { useI18n } from '../i18n';

interface TopHeaderProps {
  onOpenSettings: () => void;
  voiceoverEnabled: boolean;
  onToggleVoiceover: () => void;
  projectTotalUsd: number;
  elevenRemaining?: number;
  elevenConfigured?: boolean;
  elevenHint?: string;
  llmRemainingUsd?: number | null;
  llmProvider?: string;
  balancesLoading?: boolean;
  onRefreshBalances?: () => void;
}

function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (value > 0 && value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

export function TopHeader({
  onOpenSettings,
  voiceoverEnabled,
  onToggleVoiceover,
  projectTotalUsd,
  elevenRemaining,
  elevenConfigured,
  elevenHint,
  llmRemainingUsd,
  llmProvider,
  balancesLoading,
  onRefreshBalances,
}: TopHeaderProps) {
  const { lang, setLang, t } = useI18n();

  return (
    <header className="sticky top-0 z-30 min-w-0 overflow-x-hidden border-b border-white/8 bg-[#0B0E14]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] min-w-0 flex-wrap items-center justify-between gap-3 px-3 py-2.5 sm:px-5">
        <a
          href="#top"
          className="font-display text-lg font-bold tracking-tight text-slate-50 whitespace-nowrap shrink-0"
        >
          Zof Studio
        </a>

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-1.5 order-3 w-full sm:order-2 sm:w-auto">
          <button
            type="button"
            role="switch"
            aria-checked={voiceoverEnabled}
            onClick={onToggleVoiceover}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${
              voiceoverEnabled
                ? 'border-sky-400/40 bg-sky-500/15 text-sky-100'
                : 'border-amber-400/40 bg-amber-500/15 text-amber-100'
            }`}
          >
            {voiceoverEnabled ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
            <span>
              {voiceoverEnabled
                ? t('التعليق الصوتي: مفعّل', 'Voiceover: ON')
                : t('التعليق الصوتي: مغلق', 'Voiceover: OFF')}
            </span>
          </button>

          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-100">
            <Coins className="h-3 w-3" />
            <span className="font-mono tabular-nums" dir="ltr">
              {formatUsd(projectTotalUsd)}
            </span>
            <span className="hidden text-emerald-200/70 md:inline">{t('تكلفة', 'cost')}</span>
          </span>

          <span
            className="inline-flex min-w-0 shrink-0 items-center gap-1.5 rounded-full border border-sky-400/25 bg-sky-500/8 px-2.5 py-1 text-[10px] font-semibold text-sky-100"
            title={elevenHint || t('رصيد ElevenLabs', 'ElevenLabs quota')}
          >
            <Mic className="h-3 w-3 shrink-0" />
            <span className="font-mono tabular-nums" dir="ltr">
              {elevenConfigured
                ? elevenHint
                  ? t('صلاحية User:Read مطلوبة', 'User:Read scope needed')
                  : `${formatNumber(elevenRemaining)} ${t('حرف', 'chars')}`
                : t('ElevenLabs غير مضاف', 'ElevenLabs not set')}
            </span>
          </span>

          <span className="inline-flex min-w-0 shrink-0 items-center gap-1.5 rounded-full border border-violet-400/25 bg-violet-500/8 px-2.5 py-1 text-[10px] font-semibold text-violet-100">
            <Wallet className="h-3 w-3 shrink-0" />
            <span className="font-mono tabular-nums" dir="ltr">
              {llmProvider && llmProvider !== 'none'
                ? `${formatUsd(llmRemainingUsd)} ${t('رصيد', 'left')}`
                : t('رصيد AI غير متاح', 'AI credits n/a')}
            </span>
          </span>

          <button
            type="button"
            onClick={onRefreshBalances}
            disabled={balancesLoading}
            aria-label={t('تحديث الأرصدة', 'Refresh balances')}
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#0B0E14] p-1.5 text-slate-300 hover:border-sky-400/40 hover:text-slate-100 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${balancesLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2 order-2 sm:order-3">
          <div
            className="inline-flex items-center gap-0.5 rounded-lg border border-white/10 bg-[#0B0E14] p-0.5"
            role="group"
            aria-label={t('لغة الواجهة', 'Interface language')}
          >
            <Languages className="mx-1 h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <button
              type="button"
              onClick={() => setLang('ar')}
              aria-pressed={lang === 'ar'}
              className={`rounded-md px-2 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                lang === 'ar' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              AR
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
              className={`rounded-md px-2 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                lang === 'en' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              EN
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-[#141923] px-3 py-2 text-xs font-semibold text-slate-100 hover:border-sky-400/50 hover:bg-[#19202D] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            <KeyRound className="h-3.5 w-3.5 text-sky-400" />
            <span className="hidden sm:inline">{t('إعدادات API', 'API & Keys')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
