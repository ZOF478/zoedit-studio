import { useEffect, useRef, useState } from 'react';
import {
  ChevronsDown,
  ChevronsUp,
  Droplet,
  Loader2,
  Mic,
  MicOff,
  Sparkles,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { ASPECT_RATIO_PRESETS } from '../types/studio';
import type { AspectRatio, BrandKit, FpsOption } from '../types/studio';
import { WatermarkPositionPicker } from './WatermarkPositionPicker';

interface PrimaryCommandBarProps {
  topic: string;
  onChangeTopic: (value: string) => void;
  onGenerateScript: () => void;
  isGeneratingScript: boolean;
  scriptNotice: string | null;
  voiceoverEnabled: boolean;
  onToggleVoiceover: () => void;
  aspectRatio: AspectRatio;
  onChangeAspectRatio: (ratio: AspectRatio) => void;
  fps: FpsOption;
  onChangeFps: (fps: FpsOption) => void;
  brandKit: BrandKit;
  onChangeBrandKit: (next: BrandKit) => void;
}

export function PrimaryCommandBar({
  topic,
  onChangeTopic,
  onGenerateScript,
  isGeneratingScript,
  scriptNotice,
  voiceoverEnabled,
  onToggleVoiceover,
  aspectRatio,
  onChangeAspectRatio,
  fps,
  onChangeFps,
  brandKit,
  onChangeBrandKit,
}: PrimaryCommandBarProps) {
  const { t, isRtl } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const collapsedRef = useRef(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    if (expanded) {
      element.style.height = '320px';
      return;
    }
    if (collapsedRef.current) {
      element.style.height = '76px';
      return;
    }
    element.style.height = 'auto';
    const next = Math.min(320, Math.max(76, element.scrollHeight));
    element.style.height = `${next}px`;
  }, [topic, expanded]);

  const handleTopicChange = (value: string) => {
    collapsedRef.current = false;
    onChangeTopic(value);
  };

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    collapsedRef.current = !next;
  };

  return (
    <section
      className="min-w-0 w-full max-w-full overflow-x-hidden rounded-2xl border border-white/10 bg-[#0E121A] p-3 shadow-[0_18px_60px_-50px_rgba(56,189,248,0.7)] sm:p-4"
    >
      <div className="flex min-w-0 flex-col gap-2.5 xl:flex-row xl:items-stretch">
        <div className="min-w-0 flex-1">
          <label htmlFor="primary-topic" className="mb-1 block text-[10px] font-semibold text-slate-400">
            {t('موضوع الفيديو / السكربت', 'Video topic / script')}
          </label>
          <div className="relative min-w-0">
            <textarea
              id="primary-topic"
              ref={textareaRef}
              rows={2}
              value={topic}
              onChange={(event) => handleTopicChange(event.target.value)}
              placeholder={t(
                'اكتب فكرة الفيديو أو الموضوع المراد تحويله إلى مشاهد Remotion...',
                'Describe the video idea or topic to turn into Remotion scenes...'
              )}
              className="block w-full min-w-0 min-h-[76px] max-h-[320px] resize-y overflow-y-auto rounded-xl border border-white/10 bg-[#0B0E14] px-3.5 py-3 pe-24 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 transition-[height] duration-150 ease-out focus:border-sky-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={toggleExpanded}
              aria-expanded={expanded}
              className="absolute end-2 top-2 z-10 inline-flex items-center gap-1 rounded-md border border-white/10 bg-[#10141D] px-2 py-1 text-[9px] font-semibold text-slate-300 transition-colors hover:border-sky-400/40 hover:text-sky-200 cursor-pointer"
            >
              {expanded ? <ChevronsDown className="h-3 w-3" /> : <ChevronsUp className="h-3 w-3" />}
              <span>{expanded ? t('طي', 'Collapse') : t('توسيع النص', 'Expand text')}</span>
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 xl:flex-col xl:items-stretch xl:justify-between">
          <button
            type="button"
            onClick={onGenerateScript}
            disabled={isGeneratingScript || !topic.trim()}
            className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap xl:flex-none"
          >
            {isGeneratingScript ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>{t('توليد المشاهد', 'Generate scenes')}</span>
          </button>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={voiceoverEnabled}
              onClick={onToggleVoiceover}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold transition-colors cursor-pointer ${
                voiceoverEnabled
                  ? 'border-sky-400/40 bg-sky-500/15 text-sky-100'
                  : 'border-amber-400/40 bg-amber-500/15 text-amber-100'
              }`}
            >
              {voiceoverEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
              <span>
                {voiceoverEnabled
                  ? t('التعليق الصوتي: مفعّل', 'Voiceover: ON')
                  : t('التعليق الصوتي: مغلق', 'Voiceover: OFF')}
              </span>
            </button>

            <div className="inline-flex min-w-0 shrink-0 rounded-xl border border-white/10 bg-[#0B0E14] p-0.5">
              {ASPECT_RATIO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChangeAspectRatio(preset.id)}
                  aria-pressed={aspectRatio === preset.id}
                  title={preset.dimensions}
                  className={`rounded-lg px-2 py-1.5 font-mono text-[10px] font-bold transition-colors cursor-pointer ${
                    aspectRatio === preset.id
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {preset.id}
                </button>
              ))}
            </div>

            <div
              className="inline-flex min-w-0 shrink-0 rounded-xl border border-white/10 bg-[#0B0E14] p-0.5"
              title={t('معدل الإطارات', 'Frame rate')}
            >
              {([30, 60] as FpsOption[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChangeFps(option)}
                  aria-pressed={fps === option}
                  className={`rounded-lg px-2 py-1.5 font-mono text-[10px] font-bold transition-colors cursor-pointer tabular-nums ${
                    fps === option
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {option}fps
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-white/8 bg-[#0B0E14] px-2.5 py-2">
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold text-slate-400">
          <Droplet className="h-3.5 w-3.5 text-sky-300" />
          {t('العلامة المائية', 'Watermark')}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={brandKit.watermarkEnabled}
          aria-label={t('تبديل العلامة المائية', 'Toggle watermark')}
          onClick={() =>
            onChangeBrandKit({
              ...brandKit,
              watermarkEnabled: !brandKit.watermarkEnabled,
            })
          }
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
            brandKit.watermarkEnabled ? 'bg-sky-500' : 'bg-slate-700'
          }`}
        >
          <span
            className="absolute top-1 h-4 w-4 rounded-full bg-white transition-all"
            style={isRtl ? { right: brandKit.watermarkEnabled ? 22 : 2 } : { left: brandKit.watermarkEnabled ? 22 : 2 }}
          />
        </button>
        <input
          type="text"
          value={brandKit.watermark}
          disabled={!brandKit.watermarkEnabled}
          onChange={(event) =>
            onChangeBrandKit({ ...brandKit, watermark: event.target.value })
          }
          placeholder="@ZoeditStudio"
          className="min-w-[120px] flex-1 rounded-lg border border-white/10 bg-[#10141D] px-2.5 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:outline-none disabled:opacity-40"
        />
        <WatermarkPositionPicker
          value={brandKit.watermarkPosition ?? 'top-left'}
          disabled={!brandKit.watermarkEnabled}
          onChange={(watermarkPosition) =>
            onChangeBrandKit({ ...brandKit, watermarkPosition })
          }
        />
      </div>

      {scriptNotice ? (
        <p className="mt-2 break-words rounded-lg border border-amber-400/20 bg-amber-500/5 px-3 py-2 text-[10px] leading-relaxed text-amber-200">
          {scriptNotice}
        </p>
      ) : null}
    </section>
  );
}
