import { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Film,
  Loader2,
  Music2,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useI18n } from '../i18n';
import type { MediaFileInfo, MediaLibraryResponse } from '../types/studio';

interface MediaLibraryPanelProps {
  apiBaseUrl: string;
  sessionToken: string;
}

function formatSize(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function formatDate(timestamp: number): string {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString();
}

export function MediaLibraryPanel({ apiBaseUrl, sessionToken }: MediaLibraryPanelProps) {
  const { t } = useI18n();
  const [videos, setVideos] = useState<MediaFileInfo[]>([]);
  const [audio, setAudio] = useState<MediaFileInfo[]>([]);
  const [sfx, setSfx] = useState<MediaFileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'video' | 'audio' | 'sfx'>('video');
  const [pages, setPages] = useState<Record<'video' | 'audio' | 'sfx', number>>({
    video: 1,
    audio: 1,
    sfx: 1,
  });
  const PAGE_SIZE = 5;

  const headers: Record<string, string> = sessionToken
    ? { 'x-zof-session': sessionToken }
    : {};

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/media`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as MediaLibraryResponse;
      setVideos(data.videos || []);
      setAudio(data.audio || []);
      setSfx(data.sfx || []);
    } catch {
      setError(
        t('تعذر تحميل مكتبة الوسائط من الخادم.', 'Could not load the media library from the server.')
      );
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, sessionToken, t]);

  useEffect(() => {
    void fetchMedia();
  }, [fetchMedia]);

  const deleteFile = async (file: MediaFileInfo) => {
    if (!window.confirm(t(`حذف ${file.name}؟`, `Delete ${file.name}?`))) return;
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`${apiBaseUrl}/media`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ type: file.type, file: file.name }),
      });
      const data = (await res.json()) as { error?: string; deleted?: string[] };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setNotice(t(`تم حذف ${file.name}.`, `Deleted ${file.name}.`));
      await fetchMedia();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('تعذر حذف الملف.', 'Could not delete the file.')
      );
    }
  };

  const cleanUnused = async () => {
    if (
      !window.confirm(
        t(
          'حذف كل ملفات الصوت غير المستخدمة؟ الملفات المرتبطة بـ data.json أو المشروع الحالي ستبقى.',
          'Delete all unused audio files? Files referenced by data.json or the current project are kept.'
        )
      )
    ) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`${apiBaseUrl}/media`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ cleanUnused: true }),
      });
      const data = (await res.json()) as { error?: string; cleaned?: number };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setNotice(
        t(`تم تنظيف ${data.cleaned || 0} ملف صوتي غير مستخدم.`, `Cleaned ${data.cleaned || 0} unused audio files.`)
      );
      await fetchMedia();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('تعذر تنظيف الملفات الصوتية.', 'Could not clean unused audio.')
      );
    }
  };

  const cleanGeneratedTsx = async () => {
    if (
      !window.confirm(
        t(
          'حذف كل مكوّنات TSX المولّدة من src/generated؟ سيعود المشهد إلى المكتبة المدمجة.',
          'Delete all generated TSX components in src/generated? Scenes will fall back to the built-in library.'
        )
      )
    ) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`${apiBaseUrl}/media`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ cleanGenerated: true }),
      });
      const data = (await res.json()) as { error?: string; cleaned?: number };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setNotice(
        t(
          `تم حذف ${data.cleaned || 0} مكوّن TSX مولّد.`,
          `Deleted ${data.cleaned || 0} generated TSX components.`
        )
      );
      await fetchMedia();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('تعذر تنظيف مكوّنات TSX.', 'Could not clean generated TSX components.')
      );
    }
  };

  const renderRows = (files: MediaFileInfo[], kind: 'video' | 'audio' | 'sfx') => {
    if (files.length === 0) {
      return (
        <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-xs text-slate-500">
          {t('لا توجد ملفات بعد.', 'No files yet.')}
        </p>
      );
    }
    return (
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={`${file.type}-${file.name}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/8 bg-[#0B0E14] px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-[11px] text-slate-200" dir="ltr">
                {file.name}
              </p>
              <p className="text-[10px] text-slate-500">
                {formatSize(file.size)} · {formatDate(file.modified)}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {kind === 'video' ? (
                <>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-slate-300 hover:border-sky-400/40 hover:text-slate-100"
                  >
                    {t('معاينة', 'Preview')}
                  </a>
                  <a
                    href={file.url}
                    download={file.name}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 px-2 py-1 text-[10px] text-emerald-200 hover:bg-emerald-500/10"
                  >
                    <Download className="h-3 w-3" />
                    {t('تحميل', 'Download')}
                  </a>
                </>
              ) : (
                <audio controls src={file.url} className="h-7 max-w-[190px]" />
              )}
              <button
                type="button"
                onClick={() => void deleteFile(file)}
                className="inline-flex items-center gap-1 rounded-md border border-red-500/30 px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/10 cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
                {t('حذف', 'Delete')}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <section id="media-manager" className="min-w-0 overflow-x-hidden rounded-xl border border-white/8 bg-[#10141D] p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-4">
        <div>
          <h2 className="font-display text-base font-bold text-slate-100">
            {t('مدير الوسائط والمخرجات', 'Media & Outputs Manager')}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {t(
              'كل فيديو مصيّر وملفات الصوت والمؤثرات مع المعاينة والتنزيل والحذف.',
              'Every rendered video, voice file, and SFX with preview, download, and delete.'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void cleanUnused()}
            className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 cursor-pointer"
          >
            {t('تنظيف الصوت غير المستخدم', 'Clean unused audio')}
          </button>
          <button
            type="button"
            onClick={() => void cleanGeneratedTsx()}
            className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2 text-xs font-semibold text-fuchsia-200 hover:bg-fuchsia-500/20 cursor-pointer"
          >
            {t('تنظيف كاش TSX المولّد', 'Clean generated TSX cache')}
          </button>
          <button
            type="button"
            onClick={() => void fetchMedia()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:border-sky-400/40 hover:text-slate-100 disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {t('تحديث', 'Refresh')}
          </button>
        </div>
      </div>

      {notice && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      )}

      {(() => {
        const tabs = [
          {
            id: 'video' as const,
            label: t('الفيديوهات', 'Videos'),
            icon: Film,
            color: 'text-sky-400',
            files: videos,
          },
          {
            id: 'audio' as const,
            label: t('الصوت', 'Audio'),
            icon: Music2,
            color: 'text-emerald-400',
            files: audio,
          },
          {
            id: 'sfx' as const,
            label: t('المؤثرات', 'SFX'),
            icon: Sparkles,
            color: 'text-amber-400',
            files: sfx,
          },
        ];
        const active = tabs.find((tab) => tab.id === activeTab) || tabs[0];
        const totalPages = Math.max(1, Math.ceil(active.files.length / PAGE_SIZE));
        const currentPage = Math.min(pages[activeTab], totalPages);
        const pageFiles = active.files.slice(
          (currentPage - 1) * PAGE_SIZE,
          currentPage * PAGE_SIZE
        );
        const setPage = (next: number) => {
          setPages((prev) => ({
            ...prev,
            [activeTab]: Math.min(totalPages, Math.max(1, next)),
          }));
        };

        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-white/8 bg-[#0B0E14] p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-white/10 text-slate-50'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${tab.color}`} />
                    <span>{tab.label}</span>
                    <span className="rounded-full bg-white/8 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-slate-300">
                      {tab.files.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {renderRows(pageFiles, activeTab)}

            <div className="flex items-center justify-between gap-2 border-t border-white/8 pt-3">
              <span className="font-mono text-[11px] text-slate-400 tabular-nums" dir="ltr">
                {t(
                  `صفحة ${currentPage} من ${totalPages}`,
                  `Page ${currentPage} of ${totalPages}`
                )}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-300 hover:border-sky-400/40 hover:text-slate-100 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                  {t('السابق', 'Previous')}
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(currentPage + 1)}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-300 hover:border-sky-400/40 hover:text-slate-100 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                >
                  {t('التالي', 'Next')}
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
}
