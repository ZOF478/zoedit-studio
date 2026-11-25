import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, RefreshCw, Search } from 'lucide-react';
import { useI18n } from '../i18n';
import type {
  AiModelOption,
  AiProviderId,
  ProviderModelOption,
  ProviderModelsResponse,
} from '../types/studio';

interface ModelSearchSelectProps {
  apiBaseUrl: string;
  sessionToken: string;
  provider: AiProviderId;
  selectedModel: string;
  fallbackModels: AiModelOption[];
  onChangeModel: (modelId: string) => void;
}

type DisplayModel = Pick<ProviderModelOption, 'id' | 'label' | 'isFree' | 'note'>;

export function ModelSearchSelect({
  apiBaseUrl,
  sessionToken,
  provider,
  selectedModel,
  fallbackModels,
  onChangeModel,
}: ModelSearchSelectProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [freeOnly, setFreeOnly] = useState(false);
  const [remoteModels, setRemoteModels] = useState<DisplayModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualModel, setManualModel] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const curated = useMemo<DisplayModel[]>(
    () =>
      fallbackModels
        .filter((model) => model.provider === provider)
        .map((model) => ({
          id: model.id,
          label: model.label,
          isFree: model.isFree,
          note: model.note,
        })),
    [fallbackModels, provider]
  );

  const loadModels = useCallback(
    async (refresh: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const headers: Record<string, string> = {};
        if (sessionToken) headers['x-zoedit-session'] = sessionToken;
        const res = await fetch(
          `${apiBaseUrl}/provider-models?provider=${encodeURIComponent(provider)}&refresh=${
            refresh ? 1 : 0
          }`,
          { headers }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as ProviderModelsResponse;
        setRemoteModels(
          (data.models || []).map((model) => ({
            id: model.id,
            label: model.label,
            isFree: model.isFree,
            note: model.note,
          }))
        );
      } catch {
        setRemoteModels([]);
        setError(
          t(
            'تعذر جلب النماذج الحية — يتم استخدام القائمة الاحتياطية.',
            'Could not fetch live models — using the curated fallback list.'
          )
        );
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl, provider, sessionToken, t]
  );

  useEffect(() => {
    if (!open) return;
    void loadModels(false);
  }, [open, loadModels]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const options = (remoteModels.length > 0 ? remoteModels : curated).filter((model) => {
    if (freeOnly && !model.isFree) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return `${model.id} ${model.label} ${model.note || ''}`.toLowerCase().includes(needle);
  });

  const selected =
    options.find((model) => model.id === selectedModel) ||
    remoteModels.find((model) => model.id === selectedModel) ||
    curated.find((model) => model.id === selectedModel);

  const selectModel = (modelId: string) => {
    onChangeModel(modelId);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative min-w-0 w-full max-w-full">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#0B0E14] px-3.5 py-2.5 text-start text-sm text-slate-100 hover:border-sky-400/40 focus:border-sky-400 focus:outline-none transition-colors cursor-pointer"
      >
        <span className="min-w-0 truncate">
          {selected ? selected.label : selectedModel || t('اختر نموذجاً', 'Select a model')}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {selected?.isFree ? (
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-200">
              {t('مجاني', 'FREE')}
            </span>
          ) : null}
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {open ? (
        <div className="absolute inset-x-0 z-50 mt-1 min-w-0 overflow-hidden rounded-xl border border-white/12 bg-[#10141D] shadow-2xl">
          <div className="flex min-w-0 items-center gap-1.5 border-b border-white/8 p-2">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
                style={{ insetInlineStart: 9 }}
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.preventDefault();
                }}
                placeholder={t('ابحث عن نموذج...', 'Search models...')}
                aria-label={t('بحث النماذج', 'Search models')}
                className="w-full min-w-0 rounded-lg border border-white/10 bg-[#0B0E14] py-1.5 pe-2.5 ps-8 text-xs text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => void loadModels(true)}
              disabled={loading}
              aria-label={t('تحديث النماذج', 'Refresh models')}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#0B0E14] text-slate-300 hover:border-sky-400/40 hover:text-slate-100 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1 px-2 py-1.5">
            <button
              type="button"
              onClick={() => setFreeOnly(false)}
              className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${
                !freeOnly
                  ? 'bg-sky-500 text-slate-950'
                  : 'bg-white/5 text-slate-300 hover:text-slate-100'
              }`}
            >
              {t('الكل', 'All')}
            </button>
            <button
              type="button"
              onClick={() => setFreeOnly(true)}
              className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${
                freeOnly
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-white/5 text-slate-300 hover:text-slate-100'
              }`}
            >
              {t('مجاني Free', 'Free')}
            </button>
            <span className="ms-auto font-mono text-[10px] text-slate-500 tabular-nums">
              {options.length}
            </span>
          </div>

          <div className="max-h-64 min-w-0 overflow-y-auto overflow-x-hidden border-t border-white/8 p-1">
            {loading && options.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-3 py-6 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t('جارٍ تحميل النماذج...', 'Loading models...')}
              </div>
            ) : options.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-slate-400">
                {t('لا توجد نماذج مطابقة.', 'No matching models.')}
              </div>
            ) : (
              options.map((model) => {
                const active = model.id === selectedModel;
                return (
                  <button
                    key={model.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => selectModel(model.id)}
                    className={`flex w-full min-w-0 items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-start transition-colors cursor-pointer ${
                      active
                        ? 'bg-sky-500/15 text-sky-100'
                        : 'text-slate-300 hover:bg-white/5 hover:text-slate-100'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold">
                        {model.label}
                      </span>
                      <span
                        className="mt-0.5 block truncate font-mono text-[10px] text-slate-500"
                        dir="ltr"
                      >
                        {model.id}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      {model.isFree ? (
                        <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-200">
                          FREE
                        </span>
                      ) : null}
                      {active ? <Check className="h-3.5 w-3.5 text-sky-300" /> : null}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {error ? (
            <p className="border-t border-white/8 px-3 py-2 text-[10px] leading-relaxed text-amber-300">
              {error}
            </p>
          ) : null}

          <div className="border-t border-white/8 p-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <input
                type="text"
                dir="ltr"
                value={manualModel}
                onChange={(event) => setManualModel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && manualModel.trim()) {
                    event.preventDefault();
                    selectModel(manualModel.trim());
                    setManualModel('');
                  }
                }}
                placeholder={t('Model ID يدوي...', 'Manual Model ID...')}
                className="w-full min-w-0 rounded-lg border border-white/10 bg-[#0B0E14] px-2.5 py-1.5 font-mono text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:outline-none"
              />
              <button
                type="button"
                disabled={!manualModel.trim()}
                onClick={() => {
                  selectModel(manualModel.trim());
                  setManualModel('');
                }}
                className="shrink-0 rounded-lg border border-sky-400/40 bg-sky-500/15 px-2.5 py-1.5 text-[10px] font-semibold text-sky-100 hover:bg-sky-500/25 disabled:opacity-40 cursor-pointer"
              >
                {t('استخدام', 'Use')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
