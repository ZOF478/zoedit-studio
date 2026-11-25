import {
  BookOpenCheck,
  Clapperboard,
  Coins,
  KeyRound,
  Languages,
  Mic,
  MicOff,
  Play,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { useI18n } from '../i18n';

interface TopHeaderProps {
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onExport: () => void;
  exportDisabled?: boolean;
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
  disabled?: boolean;
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
  onOpenGuide,
  onExport,
  exportDisabled = false,
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
  disabled = false,
}: TopHeaderProps) {
  const { lang, setLang, t } = useI18n();

  return (
    <header className="z-30 flex h-12 w-full min-w-0 shrink-0 items-center gap-2 border-b border-white/8 bg-[#0B0E14]/95 px-2.5 backdrop-blur-md sm:px-3">
      <a
        href="#top"
        title={t(
          'Zoedit Studio — استوديو الموشن جرافيك بمساعدة الذكاء الاصطناعي',
          'Zoedit Studio — AI-Directed Motion Graphics Studio'
        )}
        className="flex min-w-0 shrink-0 items-center gap-2"
      >
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-400/30 bg-gradient-to-br from-sky-500/25 to-fuchsia-500/15 text-sky-200 shadow-[0_0_24px_-8px_rgba(56,189,248,0.8)]">
          <Clapperboard className="h-4 w-4" />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block whitespace-nowrap font-display text-sm font-black tracking-tight text-slate-50">
            Zoedit Studio
          </span>
          <span className="hidden truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:block">
            {t('استوديو موشن جرافيك ذكي', 'AI Motion Editor')}
          </span>
        </span>
      </a>

      <div className="mx-1 hidden h-7 w-px shrink-0 bg-white/10 lg:block" />

      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
        <button
          type="button"
          role="switch"
          disabled={disabled}
          aria-checked={voiceoverEnabled}
          onClick={onToggleVoiceover}
          className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2 text-[10px] font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
            voiceoverEnabled
              ? 'border-sky-400/35 bg-sky-500/12 text-sky-100'
              : 'border-amber-400/35 bg-amber-500/12 text-amber-100'
          }`}
          title={t('تبديل التعليق الصوتي TTS', 'Toggle voiceover TTS')}
        >
          {voiceoverEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
          <span className="hidden xl:inline">
            {voiceoverEnabled ? t('صوت مفعّل', 'Voice ON') : t('صوت مغلق', 'Voice OFF')}
          </span>
        </button>

        <span
          className="hidden h-8 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-500/8 px-2 text-[10px] font-semibold text-emerald-100 sm:inline-flex"
          title={t('تكلفة المشروع الحالية', 'Current project cost')}
        >
          <Coins className="h-3.5 w-3.5" />
          <span className="font-mono tabular-nums" dir="ltr">{formatUsd(projectTotalUsd)}</span>
        </span>

        <span
          className="hidden h-8 min-w-0 shrink items-center gap-1.5 rounded-lg border border-sky-400/25 bg-sky-500/8 px-2 text-[10px] font-semibold text-sky-100 md:inline-flex"
          title={elevenHint || t('رصيد ElevenLabs', 'ElevenLabs quota')}
        >
          <Mic className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate font-mono tabular-nums" dir="ltr">
            {elevenConfigured
              ? elevenHint
                ? t('صلاحية User:Read مطلوبة', 'User:Read needed')
                : `${formatNumber(elevenRemaining)} ${t('حرف', 'chars')}`
              : t('ElevenLabs غير مضاف', 'ElevenLabs not set')}
          </span>
        </span>

        <span
          className="hidden h-8 min-w-0 shrink items-center gap-1.5 rounded-lg border border-violet-400/25 bg-violet-500/8 px-2 text-[10px] font-semibold text-violet-100 xl:inline-flex"
          title={t('رصيد مزود الذكاء الاصطناعي', 'AI provider balance')}
        >
          <Wallet className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate font-mono tabular-nums" dir="ltr">
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
          title={t('تحديث الأرصدة', 'Refresh balances')}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#0B0E14] text-slate-300 hover:border-sky-400/40 hover:text-slate-100 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${balancesLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <div
          className="inline-flex h-8 items-center gap-0.5 rounded-lg border border-white/10 bg-[#0B0E14] p-0.5"
          role="group"
          aria-label={t('لغة الواجهة', 'Interface language')}
        >
          <Languages className="mx-1 h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setLang('ar')}
            aria-pressed={lang === 'ar'}
            className={`h-6 rounded-md px-2 text-[10px] font-bold transition-colors cursor-pointer ${
              lang === 'ar' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            AR
          </button>
          <button
            type="button"
            onClick={() => setLang('en')}
            aria-pressed={lang === 'en'}
            className={`h-6 rounded-md px-2 text-[10px] font-bold transition-colors cursor-pointer ${
              lang === 'en' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            EN
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenGuide}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-[#141923] px-2 text-[10px] font-semibold text-slate-200 transition-colors hover:border-amber-400/40 hover:text-amber-100 cursor-pointer"
          title={t('دليل الاستخدام والترخيص', 'Guide, License & Ethical Use')}
        >
          <BookOpenCheck className="h-3.5 w-3.5 text-amber-300" />
          <span className="hidden 2xl:inline">{t('دليل الاستخدام والترخيص', 'Guide, License & Ethical Use')}</span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-[#141923] px-2 text-[10px] font-semibold text-slate-200 transition-colors hover:border-sky-400/50 hover:text-slate-100 cursor-pointer"
          title={t('إعدادات API', 'API & Keys')}
        >
          <KeyRound className="h-3.5 w-3.5 text-sky-400" />
          <span className="hidden xl:inline">{t('إعدادات API', 'API & Keys')}</span>
        </button>

        <button
          type="button"
          onClick={onExport}
          disabled={exportDisabled || disabled}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-sky-500 px-2.5 text-[11px] font-black text-slate-950 transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span className="whitespace-nowrap">{t('تصدير الفيديو', 'Export Video')}</span>
        </button>
      </div>
    </header>
  );
}
