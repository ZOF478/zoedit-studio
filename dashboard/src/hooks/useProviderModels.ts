import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AiModelOption,
  AiProviderId,
  ProviderModelOption,
  ProviderModelsResponse,
} from '../types/studio';

interface UseProviderModelsOptions {
  apiBaseUrl: string;
  sessionToken: string;
  provider: AiProviderId;
  fallbackModels: AiModelOption[];
}

interface UseProviderModelsResult {
  models: ProviderModelOption[];
  loading: boolean;
  loadedProvider: AiProviderId | null;
  error: string | null;
  source: 'live' | 'curated' | 'fallback';
  refresh: () => void;
}

function fallbackForProvider(
  provider: AiProviderId,
  fallbackModels: AiModelOption[]
): ProviderModelOption[] {
  return fallbackModels
    .filter((model) => model.provider === provider)
    .map((model) => ({
      id: model.id,
      label: model.label,
      provider: model.provider,
      providerLabel: model.providerLabel,
      note: model.note,
      isFree: model.isFree,
      upstream: model.upstream,
    }));
}

export function useProviderModels({
  apiBaseUrl,
  sessionToken,
  provider,
  fallbackModels,
}: UseProviderModelsOptions): UseProviderModelsResult {
  const [remote, setRemote] = useState<ProviderModelOption[]>([]);
  const [remoteSource, setRemoteSource] = useState<'live' | 'curated'>('curated');
  const [loading, setLoading] = useState(false);
  const [loadedProvider, setLoadedProvider] = useState<AiProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (refresh: boolean) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);

      try {
        const headers: Record<string, string> = {};
        if (sessionToken) headers['x-zof-session'] = sessionToken;
        const res = await fetch(
          `${apiBaseUrl}/provider-models?provider=${encodeURIComponent(provider)}&refresh=${
            refresh ? 1 : 0
          }`,
          { headers, signal: controller.signal }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as ProviderModelsResponse;
        if (requestIdRef.current !== requestId) return;
        setRemote(data.models || []);
        setRemoteSource(data.source === 'live' ? 'live' : 'curated');
      } catch (err) {
        if (controller.signal.aborted) return;
        if (requestIdRef.current !== requestId) return;
        setRemote([]);
        setRemoteSource('curated');
        setError(err instanceof Error ? err.message : 'Could not load models.');
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
          setLoadedProvider(provider);
        }
      }
    },
    [apiBaseUrl, provider, sessionToken]
  );

  useEffect(() => {
    void load(false);
    return () => abortRef.current?.abort();
  }, [load]);

  const fallback = useMemo(
    () => fallbackForProvider(provider, fallbackModels),
    [provider, fallbackModels]
  );
  const models = remote.length > 0 ? remote : fallback;
  const source: UseProviderModelsResult['source'] =
    remote.length > 0 ? remoteSource : 'fallback';

  const refresh = useCallback(() => {
    void load(true);
  }, [load]);

  return { models, loading, loadedProvider, error, source, refresh };
}
