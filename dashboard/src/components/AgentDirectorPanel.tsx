import { useEffect, useMemo, useRef } from 'react';
import {
  BrainCircuit,
  KeyRound,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { useProviderModels } from '../hooks/useProviderModels';
import type {
  AiModelOption,
  AiProviderId,
  AiProviderOption,
  AiScriptModelId,
  ProviderModelOption,
} from '../types/studio';

interface AgentDirectorPanelProps {
  providers: AiProviderOption[];
  models: AiModelOption[];
  selectedAiProvider: AiProviderId;
  onChangeAiProvider: (provider: AiProviderId) => void;
  selectedAiModel: AiScriptModelId;
  onChangeAiModel: (model: AiScriptModelId) => void;
  onOpenSettings: () => void;
  apiBaseUrl: string;
  sessionToken: string;
  disabled?: boolean;
}

export function AgentDirectorPanel({
  providers,
  models,
  selectedAiProvider,
  onChangeAiProvider,
  selectedAiModel,
  onChangeAiModel,
  onOpenSettings,
  apiBaseUrl,
  sessionToken,
  disabled = false,
}: AgentDirectorPanelProps) {
  const { t } = useI18n();
  const { models: providerModels, loading, loadedProvider, refresh } = useProviderModels({
    apiBaseUrl,
    sessionToken,
    provider: selectedAiProvider,
    fallbackModels: models,
  });

  const activeProvider = providers.find((provider) => provider.id === selectedAiProvider);

  const selectedModel = useMemo<ProviderModelOption | undefined>(() => {
    const fromProvider = providerModels.find((model) => model.id === selectedAiModel);
    if (fromProvider) return fromProvider;
    const fromFallback = models.find(
      (model) => model.id === selectedAiModel && model.provider === selectedAiProvider
    );
    if (fromFallback) {
      return {
        id: fromFallback.id,
        label: fromFallback.label,
        provider: fromFallback.provider,
        providerLabel: fromFallback.providerLabel,
        note: fromFallback.note,
        noteAr: fromFallback.noteAr,
        isFree: fromFallback.isFree,
        upstream: fromFallback.upstream,
      };
    }
    if (!selectedAiModel) return undefined;
    return {
      id: selectedAiModel,
      label: selectedAiModel,
      provider: selectedAiProvider,
      providerLabel: activeProvider?.label || selectedAiProvider,
      isFree: false,
    };
  }, [activeProvider, models, providerModels, selectedAiModel, selectedAiProvider]);

  const modelOptions = useMemo(() => {
    if (!selectedModel || providerModels.some((model) => model.id === selectedModel.id)) {
      return providerModels;
    }
    return [selectedModel, ...providerModels];
  }, [providerModels, selectedModel]);

  const previousProviderRef = useRef(selectedAiProvider);
  const pendingSelectionRef = useRef(false);

  useEffect(() => {
    if (previousProviderRef.current === selectedAiProvider) return;
    previousProviderRef.current = selectedAiProvider;
    pendingSelectionRef.current = true;
  }, [selectedAiProvider]);

  useEffect(() => {
    if (!pendingSelectionRef.current || loading) return;
    if (loadedProvider !== selectedAiProvider) return;
    if (providerModels.length === 0) {
      pendingSelectionRef.current = false;
      return;
    }
    if (providerModels.some((model) => model.id === selectedAiModel)) {
      pendingSelectionRef.current = false;
      return;
    }
    const firstModel = providerModels[0];
    pendingSelectionRef.current = false;
    if (firstModel?.id) onChangeAiModel(firstModel.id);
  }, [
    loading,
    loadedProvider,
    onChangeAiModel,
    providerModels,
    selectedAiModel,
    selectedAiProvider,
  ]);

  return (
    <section className="min-w-0 w-full max-w-full rounded-2xl border border-white/10 bg-[#0E121A] p-3.5 shadow-[0_18px_60px_-50px_rgba(56,189,248,0.7)]">
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-400/25 bg-violet-500/12 text-violet-200">
          <BrainCircuit className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-[13px] font-bold text-slate-100">
            {t('المخرج والوكيل الذكي', 'Director & Agent')}
          </h2>
          <p className="mt-0.5 truncate text-[11px] leading-tight text-slate-500">
            {t(
              'العقل الذي يكتب السكربت ويخطط للمشاهد.',
              'The brain that writes the script and plans the scenes.'
            )}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-violet-400/25 bg-violet-500/8 px-2 py-0.5 text-[9px] font-bold text-violet-200">
          {t('الوكيل', 'AGENT')}
        </span>
      </div>

      <div className="space-y-3">
        <label className="block min-w-0 space-y-1.5">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-violet-300" />
            {t('المزود', 'Provider')}
          </span>
          <select
            value={selectedAiProvider}
            disabled={disabled}
            onChange={(event) => onChangeAiProvider(event.target.value as AiProviderId)}
            className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#0B0E14] px-2.5 text-[11px] font-medium text-slate-100 transition-colors hover:border-white/15 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id} className="bg-[#10141D]">
                {provider.label}
                {provider.configured ? ` · ${t('جاهز', 'ready')}` : ''}
              </option>
            ))}
          </select>
        </label>

        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
              <BrainCircuit className="h-3.5 w-3.5 text-violet-300" />
              {t('النموذج', 'Model')}
            </span>
            <span className="flex items-center gap-1.5">
              {loading ? (
                <span className="inline-flex items-center gap-1 text-[9px] text-slate-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t('مزامنة', 'syncing')}
                </span>
              ) : null}
              <button
                type="button"
                onClick={refresh}
                disabled={disabled || loading}
                aria-label={t('تحديث قائمة النماذج', 'Refresh models')}
                title={t('تحديث قائمة النماذج', 'Refresh models')}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-transparent text-slate-500 transition-colors hover:border-white/10 hover:bg-white/5 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </span>
          </div>
          <select
            value={selectedModel?.id ?? selectedAiModel}
            disabled={disabled || modelOptions.length === 0}
            onChange={(event) => onChangeAiModel(event.target.value)}
            className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#0B0E14] px-2.5 text-[11px] font-medium text-slate-100 transition-colors hover:border-white/15 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            {modelOptions.length === 0 ? (
              <option value={selectedAiModel}>
                {selectedAiModel || t('لا يوجد نموذج', 'No model')}
              </option>
            ) : (
              modelOptions.map((model) => (
                <option key={model.id} value={model.id} className="bg-[#10141D]">
                  {model.label}
                  {model.isFree ? ` · ${t('مجاني', 'free')}` : ''}
                </option>
              ))
            )}
          </select>
        </div>

        {selectedModel?.note ? (
          <p className="rounded-lg border border-white/[0.06] bg-[#0B0E14] px-2.5 py-2 text-[10px] leading-relaxed text-slate-500">
            {selectedModel.noteAr
              ? t(selectedModel.noteAr, selectedModel.note)
              : selectedModel.note}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-t border-white/[0.06] pt-3">
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-[#10141D] px-2.5 py-1.5 text-[10px] font-semibold text-slate-300 transition-colors hover:border-sky-400/40 hover:text-slate-100 cursor-pointer"
          >
            <KeyRound className="h-3.5 w-3.5 text-sky-300" />
            {t('المفاتيح والإعدادات', 'Keys & settings')}
          </button>
          {activeProvider ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-[10px] text-slate-500">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  activeProvider.configured ? 'bg-emerald-400' : 'bg-slate-600'
                }`}
              />
              {activeProvider.requiresKey
                ? activeProvider.configured
                  ? t('المفتاح محفوظ', 'Key saved')
                  : t('يتطلب مفتاح API', 'API key required')
                : t('لا يتطلب مفتاحاً', 'No key required')}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
