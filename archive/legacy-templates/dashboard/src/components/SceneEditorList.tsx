import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2,
  Music2,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Square,
  TimerReset,
  Trash2,
  Wand2,
} from 'lucide-react';
import { useI18n } from '../i18n';
import {
  SFX_CATALOG,
  autoMatchSfx,
  isCustomSfxSelection,
  playSfxPreview,
  resolveSceneSfxUrl,
  stopSfxPreview,
} from '../utils/sfx';
import {
  STICKMAN_POSES,
  VISUAL_ELEMENT_TYPES,
} from '../types/studio';
import type {
  FpsOption,
  SceneItem,
  StickmanPose,
  VisualElementType,
} from '../types/studio';

interface SceneEditorListProps {
  scenes: SceneItem[];
  selectedSceneId: string;
  onSelectScene: (id: string) => void;
  onUpdateScene: (id: string, patch: Partial<SceneItem>) => void;
  onAddScene: () => void;
  onDeleteScene: (id: string) => void;
  onRegenerateSceneAudio: (scene: SceneItem) => Promise<void>;
  onSuggestVisual: (scene: SceneItem) => Promise<void>;
  onGenerateSceneSfx: (scene: SceneItem, prompt: string) => Promise<string | null>;
  suggestingSceneId: string | null;
  fps: FpsOption;
  sfxVolume: number;
  sfxMode: 'auto' | 'manual';
  elevenlabsConfigured: boolean;
  voiceoverEnabled: boolean;
  currentSecond: number;
  isSmartEditing: boolean;
  smartEditNotice: string | null;
  onApplySmartEdit: (request: {
    startSecond: number;
    endSecond: number;
    targetSceneId?: string;
    instruction: string;
  }) => Promise<boolean>;
}

const formatClock = (seconds: number): string => {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  return `${String(minutes).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
};

export function SceneEditorList({
  scenes,
  selectedSceneId,
  onSelectScene,
  onUpdateScene,
  onAddScene,
  onDeleteScene,
  onRegenerateSceneAudio,
  onSuggestVisual,
  onGenerateSceneSfx,
  suggestingSceneId,
  fps,
  sfxVolume,
  sfxMode,
  elevenlabsConfigured,
  voiceoverEnabled,
  currentSecond,
  isSmartEditing,
  smartEditNotice,
  onApplySmartEdit,
}: SceneEditorListProps) {
  const { t, lang } = useI18n();
  const [playingSceneId, setPlayingSceneId] = useState<string | null>(null);
  const [previewingSfxSceneId, setPreviewingSfxSceneId] = useState<string | null>(null);
  const [sfxNotices, setSfxNotices] = useState<Record<string, string>>({});
  const [smartStart, setSmartStart] = useState('0');
  const [smartEnd, setSmartEnd] = useState(
    String(Number((scenes[0]?.durationSec ?? 6).toFixed(1)))
  );
  const [smartInstruction, setSmartInstruction] = useState('');
  const [smartTargetSceneId, setSmartTargetSceneId] = useState<string | null>(null);
  const [smartLocalError, setSmartLocalError] = useState<string | null>(null);
  const smartBarRef = useRef<HTMLDivElement>(null);
  const smartInstructionRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const sceneRanges = useMemo(() => {
    let cursor = 0;
    return scenes.map((scene) => {
      const startSecond = cursor;
      cursor += Math.max(0.1, scene.durationSec || 0);
      return {
        startSecond: Number(startSecond.toFixed(3)),
        endSecond: Number(cursor.toFixed(3)),
      };
    });
  }, [scenes]);
  const totalDurationSec = sceneRanges[sceneRanges.length - 1]?.endSecond ?? 0;

  useEffect(() => {
    return () => {
      stopSfxPreview();
    };
  }, []);

  const toggleSceneSfxPreview = (scene: SceneItem) => {
    const url = resolveSceneSfxUrl(scene.sfxId, scene.visualType);
    if (!url) return;

    if (previewingSfxSceneId === scene.id) {
      stopSfxPreview();
      setPreviewingSfxSceneId(null);
      return;
    }

    stopSfxPreview();
    setPreviewingSfxSceneId(scene.id);
    playSfxPreview(url, sfxVolume, () => {
      setPreviewingSfxSceneId((current) => (current === scene.id ? null : current));
    });
  };

  const generateSceneSfx = async (scene: SceneItem) => {
    const prompt = (scene.sfxPrompt || '').trim();
    if (!prompt) return;

    setSfxNotices((prev) => ({ ...prev, [scene.id]: '' }));
    const error = await onGenerateSceneSfx(scene, prompt);
    setSfxNotices((prev) => ({
      ...prev,
      [scene.id]:
        error ||
        t(
          'تم توليد المؤثر الصوتي وحفظه في public/sfx.',
          'Sound effect generated and saved in public/sfx.'
        ),
    }));
  };

  const togglePlaySceneAudio = async (scene: SceneItem) => {
    if (playingSceneId === scene.id) {
      audioRef.current?.pause();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setPlayingSceneId(null);
      return;
    }

    audioRef.current?.pause();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingSceneId(scene.id);

    if (scene.audioDataUrl) {
      const audio = new Audio(scene.audioDataUrl);
      audioRef.current = audio;
      audio.onended = () => setPlayingSceneId(null);
      audio.onerror = () => setPlayingSceneId(null);
      await audio.play();
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(scene.narration);
      utter.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
      utter.onend = () => setPlayingSceneId(null);
      utter.onerror = () => setPlayingSceneId(null);
      window.speechSynthesis.speak(utter);
    } else {
      setPlayingSceneId(null);
    }
  };

  const captureCurrentPreviewTime = () => {
    const captured = Number(Math.max(0, currentSecond).toFixed(1));
    setSmartStart(String(captured));
    setSmartEnd((previous) => {
      const previousEnd = Number(previous);
      if (Number.isFinite(previousEnd) && previousEnd > captured) {
        return previous;
      }
      const nextEnd = Math.min(
        totalDurationSec > captured ? totalDurationSec : captured + 5,
        captured + 5
      );
      return String(Number(Math.max(captured + 0.5, nextEnd).toFixed(1)));
    });
    setSmartTargetSceneId(null);
    setSmartLocalError(null);
  };

  const focusSmartBarForScene = (scene: SceneItem, index: number) => {
    const range = sceneRanges[index];
    if (!range) return;
    onSelectScene(scene.id);
    setSmartTargetSceneId(scene.id);
    setSmartStart(String(Number(range.startSecond.toFixed(1))));
    setSmartEnd(String(Number(range.endSecond.toFixed(1))));
    setSmartLocalError(null);
    smartBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => smartInstructionRef.current?.focus(), 240);
  };

  const applySmartEdit = async () => {
    const startSecond = Number(smartStart);
    const endSecond = Number(smartEnd);
    if (!Number.isFinite(startSecond) || !Number.isFinite(endSecond) || endSecond <= startSecond) {
      setSmartLocalError(
        t(
          'أدخل نطاقاً زمنياً صحيحاً: يجب أن تكون قيمة "إلى" أكبر من قيمة "من".',
          'Enter a valid range: "To" must be greater than "From".'
        )
      );
      return;
    }
    if (!smartInstruction.trim()) {
      setSmartLocalError(
        t(
          'اكتب التعديل المطلوب لهذا الجزء فقط أولاً.',
          'Write the edit instruction for this segment first.'
        )
      );
      smartInstructionRef.current?.focus();
      return;
    }
    setSmartLocalError(null);
    await onApplySmartEdit({
      startSecond: Math.max(0, startSecond),
      endSecond: Math.max(startSecond, endSecond),
      targetSceneId: smartTargetSceneId ?? undefined,
      instruction: smartInstruction.trim(),
    });
  };

  const visibleSmartNotice = smartLocalError || smartEditNotice;

  return (
    <section id="scenes-workspace" className="min-w-0 space-y-4 overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-slate-100">
            {t(
              `محرر المشاهد التفاعلي (${scenes.length} مشاهد)`,
              `Interactive scene editor (${scenes.length} scenes)`
            )}
          </h2>
          <p className="text-xs text-slate-400">
            {t(
              'عدّل النصوص، وضعية الشخصية، نوع العنصر البصري، أو أعد توليد صوت أي مشهد.',
              'Edit narration, character pose, visual template, or regenerate any scene voice.'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={onAddScene}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-[#141923] px-3.5 py-2 text-xs font-semibold text-slate-100 hover:border-sky-400/50 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5 text-sky-400" />
          <span>{t('إضافة مشهد جديد', 'Add scene')}</span>
        </button>
      </div>

      <div
        ref={smartBarRef}
        className="min-w-0 rounded-xl border border-fuchsia-400/25 bg-[#151020] p-3 shadow-[0_16px_45px_-38px_rgba(217,70,239,0.9)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200">
              <Wand2 className="h-3.5 w-3.5" />
            </span>
            <h3 className="min-w-0 truncate text-[11px] font-bold text-fuchsia-100">
              {t('تعديل ذكي لنطاق زمني محدد', 'Surgical time-range smart edit')}
            </h3>
            {smartTargetSceneId ? (
              <span className="shrink-0 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2 py-0.5 text-[9px] font-semibold text-fuchsia-200">
                {t(
                  `المشهد ${String(scenes.findIndex((item) => item.id === smartTargetSceneId) + 1).padStart(2, '0')}`,
                  `Scene ${String(scenes.findIndex((item) => item.id === smartTargetSceneId) + 1).padStart(2, '0')}`
                )}
              </span>
            ) : null}
          </div>
          <span className="font-mono text-[10px] tabular-nums text-fuchsia-200/70" dir="ltr">
            {formatClock(Number(smartStart) || 0)} – {formatClock(Number(smartEnd) || 0)}
          </span>
        </div>

        <div className="mt-2 flex min-w-0 flex-wrap items-end gap-2">
          <label className="min-w-0 space-y-1 text-[10px] font-semibold text-slate-400">
            <span>{t('من (ثانية)', 'From (seconds)')}</span>
            <input
              type="number"
              min={0}
              max={totalDurationSec}
              step={0.1}
              value={smartStart}
              onChange={(event) => {
                setSmartStart(event.target.value);
                setSmartTargetSceneId(null);
                setSmartLocalError(null);
              }}
              className="w-24 rounded-lg border border-white/10 bg-[#0B0E14] px-2.5 py-1.5 font-mono text-[11px] text-slate-100 tabular-nums focus:border-fuchsia-400 focus:outline-none"
            />
          </label>
          <label className="min-w-0 space-y-1 text-[10px] font-semibold text-slate-400">
            <span>{t('إلى (ثانية)', 'To (seconds)')}</span>
            <input
              type="number"
              min={0}
              max={totalDurationSec}
              step={0.1}
              value={smartEnd}
              onChange={(event) => {
                setSmartEnd(event.target.value);
                setSmartTargetSceneId(null);
                setSmartLocalError(null);
              }}
              className="w-24 rounded-lg border border-white/10 bg-[#0B0E14] px-2.5 py-1.5 font-mono text-[11px] text-slate-100 tabular-nums focus:border-fuchsia-400 focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={captureCurrentPreviewTime}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/35 bg-sky-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-sky-100 transition-colors hover:bg-sky-500/20 cursor-pointer"
          >
            <TimerReset className="h-3.5 w-3.5" />
            <span>{t('التقط وقت المعاينة الحالي', 'Capture current preview time')}</span>
          </button>
          <span className="pb-1 text-[9px] text-slate-500">
            {t(
              `إجمالي الفيديو ${totalDurationSec.toFixed(1)}s · المؤشر عند ${currentSecond.toFixed(1)}s`,
              `Video ${totalDurationSec.toFixed(1)}s · playhead ${currentSecond.toFixed(1)}s`
            )}
          </span>
        </div>

        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
          <input
            ref={smartInstructionRef}
            type="text"
            value={smartInstruction}
            onChange={(event) => {
              setSmartInstruction(event.target.value);
              setSmartLocalError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void applySmartEdit();
              }
            }}
            placeholder={t(
              'اكتب التعديل المطلوب لهذا الجزء فقط...',
              'Describe the edit for this segment only...'
            )}
            className="min-w-[180px] flex-1 rounded-lg border border-white/10 bg-[#0B0E14] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-fuchsia-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void applySmartEdit()}
            disabled={isSmartEditing}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-fuchsia-500 px-3.5 py-2 text-[11px] font-bold text-slate-950 transition-colors hover:bg-fuchsia-400 disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {isSmartEditing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wand2 className="h-3.5 w-3.5" />
            )}
            <span>
              {isSmartEditing
                ? t('جارٍ التعديل الجزئي...', 'Applying surgical edit...')
                : t('تطبيق التعديل الجزئي', 'Apply surgical edit')}
            </span>
          </button>
        </div>

        {visibleSmartNotice ? (
          <p className="mt-2 break-words rounded-lg border border-fuchsia-400/20 bg-fuchsia-500/5 px-2.5 py-1.5 text-[10px] leading-relaxed text-fuchsia-100">
            {visibleSmartNotice}
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        {scenes.map((scene, index) => {
          const isSelected = scene.id === selectedSceneId;
          const range = sceneRanges[index];
          const framesCount = Math.round(scene.durationSec * fps);
          const isGeneratingAudio = scene.audioStatus === 'generating';
          const isPlaying = playingSceneId === scene.id;
          const isSuggesting = suggestingSceneId === scene.id;
          const autoSfx = autoMatchSfx(scene.visualType);
          const autoSfxLabel = SFX_CATALOG.find((item) => item.id === autoSfx);
          const isPreviewingSfx = previewingSfxSceneId === scene.id;
          const isGeneratingSfx = scene.sfxStatus === 'generating';
          const customSfxUrl = scene.sfxCustomUrl || (isCustomSfxSelection(scene.sfxId) ? scene.sfxId : undefined);
          const hasCustomSfx = Boolean(customSfxUrl);
          const selectedSfx = scene.sfxId || 'none';
          const visualLabelText = VISUAL_ELEMENT_TYPES.find(
            (item) => item.value === scene.visualType
          );
          const poseLabelText = STICKMAN_POSES.find((item) => item.value === scene.pose);
          const autoSfxId =
            scene.sfxId === 'auto'
              ? autoSfx
              : scene.sfxId && scene.sfxId !== 'none' && !scene.sfxCustomUrl
                ? scene.sfxId
                : null;
          const autoSfxName = SFX_CATALOG.find((item) => item.id === autoSfxId);

          return (
            <div
              key={scene.id}
              onClick={() => onSelectScene(scene.id)}
              className={`rounded-xl border p-4 transition-colors ${
                isSelected
                  ? 'border-sky-400/60 bg-[#121824]'
                  : 'border-white/8 bg-[#10141D] hover:border-white/16'
              }`}
            >
              {/* Scene Top Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="font-mono text-xs font-semibold text-sky-400 tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <input
                    type="text"
                    value={scene.title}
                    onChange={(e) => onUpdateScene(scene.id, { title: e.target.value })}
                    aria-label={t(`عنوان المشهد ${index + 1}`, `Scene ${index + 1} title`)}
                    className="w-full max-w-xs rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-slate-100 hover:border-white/10 focus:border-sky-400 focus:bg-[#0B0E14] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span>{t('المدة:', 'Duration:')}</span>
                    <input
                      type="number"
                      min={2}
                      max={20}
                      step={0.5}
                      value={scene.durationSec}
                      onChange={(e) =>
                        onUpdateScene(scene.id, {
                          durationSec: Math.min(20, Math.max(2, Number(e.target.value) || 4)),
                        })
                      }
                      className="w-16 rounded-md border border-white/10 bg-[#0B0E14] px-2 py-1 text-center font-mono text-xs text-slate-100 tabular-nums focus:border-sky-400 focus:outline-none"
                    />
                    <span>{t('ث', 's')}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-slate-400">
                      {framesCount}f
                    </span>
                  </div>

                  {scenes.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteScene(scene.id);
                      }}
                      aria-label={t(`حذف المشهد ${index + 1}`, `Delete scene ${index + 1}`)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/8 text-slate-400 hover:border-red-500/40 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      focusSmartBarForScene(scene, index);
                    }}
                    title={
                      range
                        ? t(
                            `تعديل ذكي ${formatClock(range.startSecond)} – ${formatClock(range.endSecond)}`,
                            `Smart edit ${formatClock(range.startSecond)} – ${formatClock(range.endSecond)}`
                          )
                        : t('تعديل ذكي', 'Smart edit')
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-fuchsia-100 transition-colors hover:bg-fuchsia-500/20 cursor-pointer whitespace-nowrap"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    <span>{t('تعديل ذكي', 'Smart edit')}</span>
                  </button>
                </div>
              </div>

              {/* Narration Textarea */}
              <div className="mt-3 space-y-1.5">
                <label className="block text-[11px] font-medium text-slate-400">
                  {t(
                    'نص التعليق الصوتي والترجمة (Narration / Caption)',
                    'Narration / caption text'
                  )}
                </label>
                <textarea
                  rows={2}
                  value={scene.narration}
                  onChange={(e) => onUpdateScene(scene.id, { narration: e.target.value })}
                  className="w-full resize-none rounded-lg border border-white/10 bg-[#0B0E14] px-3 py-2 text-sm leading-relaxed text-slate-100 focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="rounded-full border border-sky-400/25 bg-sky-500/10 px-2.5 py-1 font-semibold text-sky-200">
                  {lang === 'ar'
                    ? visualLabelText?.label || scene.visualType
                    : visualLabelText?.labelEn || scene.visualType}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300">
                  {lang === 'ar' ? poseLabelText?.label || scene.pose : poseLabelText?.labelEn || scene.pose}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-slate-300" dir="ltr">
                  {scene.layout || t('تكوين تلقائي', 'auto layout')}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-slate-300" dir="ltr">
                  {scene.camera || t('حركة تلقائية', 'auto camera')}
                </span>
                <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-emerald-200">
                  {autoSfxName
                    ? `${t('مؤثر ذكي', 'Smart SFX')}: ${lang === 'ar' ? autoSfxName.labelAr : autoSfxName.labelEn}`
                    : t('مشهد هادئ بدون مؤثر', 'Calm beat · no SFX')}
                </span>
              </div>

              <details className="mt-3 rounded-lg border border-white/8 bg-[#0B0E14] px-3 py-2">
                <summary className="cursor-pointer select-none text-[11px] font-semibold text-slate-300">
                  {t('التحكم المتقدم بالمشهد البصري', 'Advanced visual controls')}
                </summary>
              {/* Controls Grid: Pose + Visual Type + Label + Value */}
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-1 text-[11px] text-slate-400">
                  <span>{t('وضعية Stickman', 'Stickman pose')}</span>
                  <select
                    value={scene.pose}
                    onChange={(e) =>
                      onUpdateScene(scene.id, { pose: e.target.value as StickmanPose })
                    }
                    className="w-full rounded-lg border border-white/10 bg-[#0B0E14] px-2.5 py-2 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
                  >
                    {STICKMAN_POSES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {lang === 'ar' ? p.label : p.labelEn}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-[11px] text-slate-400">
                  <span>{t('نوع العنصر البصري', 'Visual template')}</span>
                  <select
                    value={scene.visualType}
                    onChange={(e) =>
                      onUpdateScene(scene.id, {
                        visualType: e.target.value as VisualElementType,
                      })
                    }
                    className="w-full rounded-lg border border-white/10 bg-[#0B0E14] px-2.5 py-2 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
                  >
                    {VISUAL_ELEMENT_TYPES.map((vt) => (
                      <option key={vt.value} value={vt.value}>
                        {lang === 'ar' ? vt.label : vt.labelEn}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-[11px] text-slate-400">
                  <span>{t('عنوان البطاقة البصرية', 'Visual card title')}</span>
                  <input
                    type="text"
                    value={scene.visualLabel}
                    onChange={(e) => onUpdateScene(scene.id, { visualLabel: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#0B0E14] px-2.5 py-2 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </label>

                <label className="space-y-1 text-[11px] text-slate-400">
                  <span>{t('القيمة / النص البارز', 'Value / highlight text')}</span>
                  <input
                    type="text"
                    value={scene.visualValue}
                    onChange={(e) => onUpdateScene(scene.id, { visualValue: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#0B0E14] px-2.5 py-2 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </label>
              </div>
              </details>

              {/* Custom Visual Prompt */}
              {scene.visualType === 'custom' && (
                <div className="mt-3 space-y-2 rounded-lg border border-sky-400/20 bg-sky-500/5 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[11px] font-medium text-sky-200">
                      {t(
                        'وصف العنصر البصري المخصص (Custom Visual Prompt)',
                        'Custom visual prompt'
                      )}
                    </label>
                    <button
                      type="button"
                      disabled={isSuggesting || !(scene.visualPrompt || '').trim()}
                      onClick={(e) => {
                        e.stopPropagation();
                        void onSuggestVisual(scene);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-sky-100 hover:bg-sky-500/25 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {isSuggesting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      <span>{t('اقتراح بالذكاء الاصطناعي', 'AI Suggest')}</span>
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={scene.visualPrompt || ''}
                    onChange={(e) =>
                      onUpdateScene(scene.id, { visualPrompt: e.target.value })
                    }
                    placeholder={t(
                      'مثال: رسم SVG لصندوق ادخار ينمو مع سهام خضراء وأرقام نسبية.',
                      'Example: an SVG of a growing savings box with green arrows and percentages.'
                    )}
                    className="w-full resize-none rounded-lg border border-white/10 bg-[#0B0E14] px-3 py-2 text-xs leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:outline-none"
                  />
                  {scene.visualSvg && (
                    <div className="flex items-center justify-between gap-2 text-[11px] text-emerald-300">
                      <span>{t('تم توليد SVG مخصص لهذا المشهد.', 'A custom SVG is ready for this scene.')}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateScene(scene.id, { visualSvg: undefined });
                        }}
                        className="text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {t('إزالة', 'Remove')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Scene SFX Selector + AI Generation */}
              {sfxMode === 'manual' ? (
              <div className="mt-3 space-y-2.5 rounded-lg border border-white/10 bg-[#0B0E14] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-200">
                    <Music2 className="h-3.5 w-3.5 text-sky-400" />
                    <span>{t('مؤثر صوتي للمشهد (SFX)', 'Scene sound effect (SFX)')}</span>
                  </div>
                  {resolveSceneSfxUrl(scene.sfxId, scene.visualType) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSceneSfxPreview(scene);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-300 hover:border-sky-400/40 hover:text-slate-100 transition-colors cursor-pointer"
                    >
                      {isPreviewingSfx ? (
                        <Square className="h-3 w-3 fill-current text-sky-400" />
                      ) : (
                        <Play className="h-3 w-3 fill-current text-sky-400" />
                      )}
                      <span>{isPreviewingSfx ? t('إيقاف', 'Stop') : t('معاينة', 'Preview')}</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <label className="space-y-1 text-[11px] text-slate-400">
                    <span>{t('اختر المؤثر', 'Choose effect')}</span>
                    <select
                      value={selectedSfx}
                      onChange={(e) => onUpdateScene(scene.id, { sfxId: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-[#10141D] px-2.5 py-2 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
                    >
                      <option value="auto">
                        {t(
                          `تلقائي حسب القالب · ${autoSfxLabel ? (lang === 'ar' ? autoSfxLabel.labelAr : autoSfxLabel.labelEn) : autoSfx}`,
                          `Auto-match · ${autoSfxLabel ? autoSfxLabel.labelEn : autoSfx}`
                        )}
                      </option>
                      <option value="none">{t('بدون مؤثر (None)', 'None')}</option>
                      {SFX_CATALOG.map((item) => (
                        <option key={item.id} value={item.id}>
                          {lang === 'ar' ? item.labelAr : item.labelEn}
                        </option>
                      ))}
                      {hasCustomSfx && (
                        <option value={customSfxUrl}>
                          {t(
                            `مخصص AI · ${customSfxUrl?.split('/').pop()}`,
                            `Custom AI · ${customSfxUrl?.split('/').pop()}`
                          )}
                        </option>
                      )}
                    </select>
                  </label>

                  <label className="space-y-1 text-[11px] text-slate-400">
                    <span>{t('وصف مؤثر مخصص (Custom AI SFX)', 'Custom AI SFX prompt')}</span>
                    <input
                      type="text"
                      value={scene.sfxPrompt || ''}
                      onChange={(e) => onUpdateScene(scene.id, { sfxPrompt: e.target.value })}
                      placeholder={t(
                        'مثال: صوت اشتراك نقدي معدني قصير',
                        'Example: short metallic cash subscription sound'
                      )}
                      className="w-full rounded-lg border border-white/10 bg-[#10141D] px-2.5 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:outline-none"
                    />
                  </label>

                  <label className="space-y-1 text-[11px] text-slate-400">
                    <span>{t('توقيت المؤثر (ثانية)', 'SFX trigger offset (s)')}</span>
                    <input
                      type="number"
                      min={0}
                      max={8}
                      step={0.1}
                      value={scene.sfxAt ?? 0}
                      onChange={(e) =>
                        onUpdateScene(scene.id, {
                          sfxAt: Math.min(8, Math.max(0, Number(e.target.value) || 0)),
                        })
                      }
                      className="w-full rounded-lg border border-white/10 bg-[#10141D] px-2.5 py-2 text-xs text-slate-100 tabular-nums focus:border-sky-400 focus:outline-none"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] text-slate-500">
                    {!elevenlabsConfigured
                      ? t(
                          'أضف مفتاح ElevenLabs من الإعدادات لتوليد مؤثرات مخصصة.',
                          'Add an ElevenLabs key in settings to generate custom SFX.'
                        )
                      : t(
                          'يتم حفظ المؤثر المخصص في public/sfx كملف MP3.',
                          'Custom effects are saved to public/sfx as MP3 files.'
                        )}
                  </p>
                  <button
                    type="button"
                    disabled={
                      isGeneratingSfx ||
                      !elevenlabsConfigured ||
                      !(scene.sfxPrompt || '').trim()
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      void generateSceneSfx(scene);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-sky-100 hover:bg-sky-500/25 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {isGeneratingSfx ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {isGeneratingSfx
                        ? t('جارٍ التوليد...', 'Generating...')
                        : t('توليد مؤثر ElevenLabs', 'Generate with ElevenLabs')}
                    </span>
                  </button>
                </div>

                {sfxNotices[scene.id] && (
                  <p
                    className={`text-[11px] ${
                      scene.sfxStatus === 'error' ? 'text-red-300' : 'text-emerald-300'
                    }`}
                  >
                    {sfxNotices[scene.id]}
                  </p>
                )}
              </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/5 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-200">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>
                      {autoSfxName
                        ? t(
                            `مؤثر ذكي تلقائي في اللحظة المفصلية · ${lang === 'ar' ? autoSfxName.labelAr : autoSfxName.labelEn}`,
                            `Smart auto-SFX on the key beat · ${autoSfxName.labelEn}`
                          )
                        : t(
                            'مشهد هادئ — لن يوضع مؤثر عشوائي هنا.',
                            'Calm scene — no random SFX will be added here.'
                          )}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {t(
                      'يمكنك التبديل إلى التحكم اليدوي من لوحة المؤثرات.',
                      'Switch to manual override in the SFX panel to edit.'
                    )}
                  </span>
                </div>
              )}

              {/* Scene Audio Footer */}
              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/6">
                <div className="text-[11px] text-slate-400">
                  {scene.audioStatus === 'ready' && scene.audioSource === 'elevenlabs'
                    ? t('تم توليد الصوت عبر ElevenLabs', 'Voice generated via ElevenLabs')
                    : scene.audioStatus === 'fallback'
                      ? t('جاهز للمعاينة الصوتية المحلية', 'Ready for local voice preview')
                      : t(
                          'لم يتم توليد ملف صوتي مخصص لهذا المشهد بعد',
                          'No custom audio file generated for this scene yet'
                        )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void togglePlaySceneAudio(scene);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0B0E14] px-3 py-1.5 text-xs text-slate-200 hover:border-sky-400/50 transition-colors cursor-pointer"
                  >
                    {isPlaying ? (
                      <Square className="h-3 w-3 fill-current text-sky-400" />
                    ) : (
                      <Play className="h-3 w-3 fill-current text-sky-400" />
                    )}
                    <span>{isPlaying ? t('إيقاف', 'Stop') : t('استماع', 'Listen')}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isGeneratingAudio || !voiceoverEnabled}
                    title={
                      voiceoverEnabled
                        ? undefined
                        : t(
                            'الوضع الصامت مفعّل — لن يتم توليد صوت.',
                            'Silent mode is on — no voice will be generated.'
                          )
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      void onRegenerateSceneAudio(scene);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/20 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {isGeneratingAudio ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {voiceoverEnabled
                        ? t('إعادة توليد صوت المشهد', 'Regenerate scene voice')
                        : t('التعليق الصوتي مغلق', 'Voiceover off')}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
