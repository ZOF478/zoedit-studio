import { ChevronDown, ChevronUp, Film, Mic, Terminal, Volume2 } from 'lucide-react';
import { useI18n } from '../i18n';
import type { RenderLogEntry } from '../types/studio';

export interface TimelineScene {
  id: string;
  title: string;
  index: number;
  durationSec: number;
  hasAudio: boolean;
}

interface EditorTimelineProps {
  scenes: TimelineScene[];
  selectedSceneId: string | null;
  onSelectScene: (scene: TimelineScene) => void;
  voiceoverEnabled: boolean;
  captionsEnabled: boolean;
  logs: RenderLogEntry[];
  logsOpen: boolean;
  onToggleLogs: () => void;
  isRendering?: boolean;
}

function formatSeconds(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0.0s';
  return `${value.toFixed(1)}s`;
}

export function EditorTimeline({
  scenes,
  selectedSceneId,
  onSelectScene,
  voiceoverEnabled,
  captionsEnabled,
  logs,
  logsOpen,
  onToggleLogs,
  isRendering = false,
}: EditorTimelineProps) {
  const { t } = useI18n();
  const total = scenes.reduce((sum, scene) => sum + Math.max(0.1, scene.durationSec), 0);
  const safeTotal = Math.max(0.1, total);
  const selectedScene = scenes.find((scene) => scene.id === selectedSceneId) ?? scenes[0];

  return (
    <section className="relative flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col border-t border-white/10 bg-[#080B11] px-2.5 pb-2 pt-1.5">
      {logsOpen ? (
        <div className="absolute inset-x-2 bottom-full z-40 mb-1 flex max-h-44 flex-col overflow-hidden rounded-xl border border-sky-500/25 bg-[#05070C]/98 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between gap-2 border-b border-white/8 px-3 py-1.5">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-bold text-sky-200">
              <Terminal className="h-3.5 w-3.5" />
              {t('سجل التصدير المباشر', 'Live export console')}
            </p>
            <button
              type="button"
              onClick={onToggleLogs}
              className="rounded p-0.5 text-slate-400 hover:text-slate-100 cursor-pointer"
              aria-label={t('إغلاق السجل', 'Close logs')}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2.5 font-mono text-[10px] leading-relaxed">
            {logs.length === 0 ? (
              <p className="text-slate-500">{t('لا توجد سجلات بعد.', 'No logs yet.')}</p>
            ) : (
              logs.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 py-0.5">
                  <span className="shrink-0 text-slate-500 tabular-nums" dir="ltr">[{entry.timestamp}]</span>
                  <span
                    className={
                      entry.level === 'success'
                        ? 'text-emerald-300'
                        : entry.level === 'warn'
                          ? 'text-amber-300'
                          : entry.level === 'error'
                            ? 'text-red-400'
                            : 'text-slate-200'
                    }
                  >
                    {entry.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 items-center gap-2">
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-sky-400/25 bg-sky-500/10 text-sky-300">
          <Film className="h-3 w-3" />
        </span>
        <p className="min-w-0 truncate text-[10px] font-bold text-slate-200">
          {t('الخط الزمني للمشاهد', 'Scene timeline')}
        </p>
        <span className="rounded border border-white/10 bg-[#0E121A] px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-slate-400" dir="ltr">
          {scenes.length} {t('مشهد', 'scenes')} · {formatSeconds(total)}
        </span>
        <span className="hidden items-center gap-1 rounded border border-emerald-400/20 bg-emerald-500/8 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-200 md:inline-flex">
          <Volume2 className="h-2.5 w-2.5" />
          {voiceoverEnabled ? t('TTS مفعّل', 'TTS ON') : t('صامت', 'Silent')}
        </span>
        <span className="hidden items-center gap-1 rounded border border-sky-400/20 bg-sky-500/8 px-1.5 py-0.5 text-[9px] font-semibold text-sky-200 lg:inline-flex">
          {captionsEnabled ? t('كابشن مفعّل', 'Captions ON') : t('كابشن مغلق', 'Captions OFF')}
        </span>
        <div className="min-w-0 flex-1" />
        <span className="hidden min-w-0 truncate text-[10px] text-slate-400 xl:inline">
          {selectedScene ? `${selectedScene.index}. ${selectedScene.title}` : t('لا توجد مشاهد بعد', 'No scenes yet')}
        </span>
        <button
          type="button"
          onClick={onToggleLogs}
          className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-md border px-2 text-[9px] font-bold transition-colors cursor-pointer ${
            logsOpen
              ? 'border-sky-400/40 bg-sky-500/15 text-sky-100'
              : 'border-white/10 bg-[#0E121A] text-slate-300 hover:border-sky-400/40'
          }`}
        >
          <Terminal className="h-3 w-3" />
          {logsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          {logsOpen ? t('إخفاء السجل', 'Hide logs') : t('عرض السجل', 'Show logs')}
        </button>
      </div>

      <div className="mt-1.5 flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-h-0 min-w-0 flex-1 items-stretch gap-1 overflow-x-auto">
          {scenes.length === 0 ? (
            <button
              type="button"
              onClick={onToggleLogs}
              className="flex min-w-0 flex-1 items-center justify-center rounded-lg border border-dashed border-white/12 bg-[#0B0E14] text-[10px] text-slate-500 hover:border-sky-400/30 hover:text-slate-300 cursor-pointer"
            >
              {isRendering
                ? t('جاري توليد المشاهد...', 'Generating scenes...')
                : t('ابدأ التصدير لتوليد المشاهد على الخط الزمني.', 'Export to populate the timeline with scenes.')}
            </button>
          ) : (
            scenes.map((scene) => {
              const active = selectedScene?.id === scene.id;
              const basis = Math.max(8, (Math.max(0.1, scene.durationSec) / safeTotal) * 100);
              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => onSelectScene(scene)}
                  aria-pressed={active}
                  title={`${scene.index}. ${scene.title} · ${formatSeconds(scene.durationSec)}`}
                  style={{ flexBasis: `${basis}%` }}
                  className={`group relative flex h-full min-w-[64px] flex-col justify-between overflow-hidden rounded-lg border px-1.5 py-1 text-start transition-colors cursor-pointer ${
                    active
                      ? 'border-sky-400/70 bg-sky-500/20 shadow-[0_0_22px_-10px_rgba(56,189,248,0.9)]'
                      : 'border-white/10 bg-[#101620] hover:border-sky-400/40 hover:bg-[#152033]'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-1">
                    <span className={`font-mono text-[8px] font-black tabular-nums ${active ? 'text-sky-200' : 'text-slate-500'}`}>
                      {String(scene.index).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 truncate text-[9px] font-semibold text-slate-200">{scene.title}</span>
                  </span>
                  <span className="flex items-center justify-between gap-1">
                    <span className={`font-mono text-[8px] tabular-nums ${active ? 'text-sky-100' : 'text-slate-400'}`} dir="ltr">
                      {formatSeconds(scene.durationSec)}
                    </span>
                    {scene.hasAudio ? <Mic className="h-2.5 w-2.5 shrink-0 text-emerald-300" /> : null}
                  </span>
                  <span className={`absolute inset-x-0 bottom-0 h-0.5 ${active ? 'bg-sky-400' : 'bg-sky-500/30 group-hover:bg-sky-400/60'}`} />
                </button>
              );
            })
          )}
        </div>

        <div className="flex h-4 min-w-0 items-center gap-1 rounded border border-white/8 bg-[#0B0E14] px-1">
          <span className="inline-flex shrink-0 items-center gap-1 text-[8px] font-bold text-emerald-300">
            <Volume2 className="h-2.5 w-2.5" />
            {t('صوت / TTS', 'Audio / TTS')}
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-px overflow-hidden rounded-sm bg-white/5">
            {scenes.length === 0 ? (
              <span className="h-2 w-full rounded-sm bg-emerald-500/15" />
            ) : (
              scenes.map((scene) => (
                <span
                  key={`audio-${scene.id}`}
                  style={{ flexGrow: Math.max(1, scene.durationSec) }}
                  title={scene.hasAudio ? t('مقطع صوتي جاهز', 'Audio ready') : t('بدون صوت', 'No audio')}
                  className={`h-2 rounded-sm ${scene.hasAudio ? 'bg-emerald-400/60' : 'bg-slate-600/40'}`}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
