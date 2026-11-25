import { useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import type {
  LiveBalancesResponse,
  UsageDelta,
  UsageResponse,
} from '../types/studio';

function addUsageDelta(target: UsageResponse, delta: UsageDelta): UsageResponse {
  const apply = (counters: UsageResponse['project']['usage']) => ({
    ...counters,
    aiInputTokens: counters.aiInputTokens + (delta.aiInputTokens || 0),
    aiOutputTokens: counters.aiOutputTokens + (delta.aiOutputTokens || 0),
    aiCalls: counters.aiCalls + (delta.aiCalls || 0),
    aiUsd: counters.aiUsd + (delta.aiUsd || 0),
    aiModel: delta.aiModel || counters.aiModel,
    ttsCharacters: counters.ttsCharacters + (delta.ttsCharacters || 0),
    ttsCalls: counters.ttsCalls + (delta.ttsCalls || 0),
    ttsUsd: counters.ttsUsd + (delta.ttsUsd || 0),
    visualCalls: counters.visualCalls + (delta.visualCalls || 0),
    visualUsd: counters.visualUsd + (delta.visualUsd || 0),
    renderedFrames: counters.renderedFrames + (delta.renderedFrames || 0),
    renderJobs: counters.renderJobs + (delta.renderJobs || 0),
    renderUsd: counters.renderUsd + (delta.renderUsd || 0),
  });
  const projectUsage = apply(target.project.usage);
  const allTimeUsage = apply(target.allTime.usage);
  const total = (counters: typeof projectUsage) =>
    Number(
      (counters.aiUsd + counters.ttsUsd + counters.visualUsd + counters.renderUsd).toFixed(6)
    );
  return {
    ...target,
    project: { usage: projectUsage, totalUsd: total(projectUsage) },
    allTime: { usage: allTimeUsage, totalUsd: total(allTimeUsage) },
  };
}

export function useStudioUsage(apiBaseUrl: string, sessionToken: string) {
  const { t, lang } = useI18n();
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [balances, setBalances] = useState<LiveBalancesResponse | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const headers = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = { 'x-zoedit-ui-lang': lang };
    if (sessionToken) next['x-zoedit-session'] = sessionToken;
    return next;
  }, [sessionToken, lang]);

  const refreshUsage = useCallback(async () => {
    setLoadingUsage(true);
    try {
      const res = await fetch(`${apiBaseUrl}/usage`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as UsageResponse;
      setUsage(data);
    } catch {
      setNotice(t('تعذر تحميل عداد الاستهلاك من الخادم.', 'Could not load usage data from the server.'));
    } finally {
      setLoadingUsage(false);
    }
  }, [apiBaseUrl, headers, t]);

  const refreshBalances = useCallback(async () => {
    setLoadingBalances(true);
    try {
      const res = await fetch(`${apiBaseUrl}/live-balances`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as LiveBalancesResponse;
      setBalances(data);
    } catch {
      setNotice(t('تعذر تحديث الأرصدة الحية الآن.', 'Could not refresh live balances right now.'));
    } finally {
      setLoadingBalances(false);
    }
  }, [apiBaseUrl, headers, t]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshUsage(), refreshBalances()]);
  }, [refreshUsage, refreshBalances]);

  const resetUsage = useCallback(async () => {
    setLoadingUsage(true);
    try {
      const res = await fetch(`${apiBaseUrl}/usage/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ scope: 'all' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as UsageResponse;
      setUsage(data);
      setNotice(t('تم تصفير عداد الاستهلاك بنجاح.', 'Usage counters were reset successfully.'));
    } catch {
      setNotice(t('تعذر تصفير العداد.', 'Could not reset the counters.'));
    } finally {
      setLoadingUsage(false);
    }
  }, [apiBaseUrl, headers, t]);

  const applyDelta = useCallback((delta: UsageDelta | undefined) => {
    if (!delta) return;
    setUsage((current) => (current ? addUsageDelta(current, delta) : current));
  }, []);

  useEffect(() => {
    void refreshUsage();
  }, [refreshUsage]);

  useEffect(() => {
    void refreshBalances();
  }, [refreshBalances]);

  return {
    usage,
    balances,
    loadingUsage,
    loadingBalances,
    notice,
    clearNotice: () => setNotice(null),
    refreshUsage,
    refreshBalances,
    refreshAll,
    resetUsage,
    applyDelta,
  };
}
