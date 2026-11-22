import {
  BrainCircuit,
  Clock3,
  Droplet,
  Loader2,
  Mic,
  MicOff,
  Monitor,
  RefreshCw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { ColorFormatPicker } from './ColorFormatPicker';
import { WatermarkPositionPicker } from './WatermarkPositionPicker';
import {
  ASPECT_RATIO_PRESETS,
  type AspectRatio,
  type BrandKit,
  type ElevenLabsVoice,
  type ExportTargetDuration,
  type FpsOption,
  type ScriptLanguage,
  type SfxConfig,
  type VoiceoverConfig,
} from '../types/studio';

interface StudioControlsProps {
  masterPrompt: string;
  onChangeMasterPrompt: (value: string) => void;
  targetDuration: ExportTargetDuration;
  onChangeTargetDuration: (value: ExportTargetDuration) => void;
  aspectRatio: AspectRatio;
  onChangeAspectRatio: (value: AspectRatio) => void;
  fps: FpsOption;
  onChangeFps: (value: FpsOption) => void;
  brandKit: BrandKit;
  onChangeBrandKit: (next: BrandKit) => void;
  voiceover: VoiceoverConfig;
  onChangeVoiceover: (next: VoiceoverConfig) => void;
  voices: ElevenLabsVoice[];
  loadingVoices: boolean;
  onRefreshVoices: () => void;
  sfx: SfxConfig;
  onChangeSfx: (next: SfxConfig) => void;
  scriptLanguage: ScriptLanguage;
  onChangeScriptLanguage: (value: ScriptLanguage) => void;
}

const DURATION_OPTIONS: Array<{ id: ExportTargetDuration; label: string }> = [
  { id: '30', label: '30s' },
  { id: '60', label: '60s' },
  { id: '90', label: '90s' },
  { id: 'auto', label: 'Auto' },
];

export function StudioControls({
  masterPrompt,
  onChangeMasterPrompt,
  targetDuration,
  onChangeTargetDuration,
  aspectRatio,
  onChangeAspectRatio,
  fps,
  onChangeFps,
  brandKit,
  onChangeBrandKit,
  voiceover,
  onChangeVoiceover,
  voices,
  loadingVoices,
  onRefreshVoices,
  sfx,
  onChangeSfx,
  scriptLanguage,
  onChangeScriptLanguage,
}: StudioControlsProps) {
  const { t, isRtl } = useI18n();
  const voiceOptions = voices.length > 0 ? voices.slice(0, 80) : [];

  return (
    <section className="min-w-0 w-full max-w-full overflow-x-hidden rounded-2xl border border-white/10 bg-[#0E121A] p-3 shadow-[0_18px_60px_-50px_rgba(56,189,248,0.7)] sm:p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-violet-400/30 bg-violet-500/15 text-violet-200">
          <BrainCircuit className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate font-display text-sm font-bold text-slate-100">
            {t('العقل المدبر', 'The Master Mind')}
          </h2>
          <p className="truncate text-[11px] text-slate-400">
            {t(
              'المدخل الإبداعي الوحيد — OpenCode يقرر الإيقاع وتقسيم المشاهد والسرد البصري.',
              'The only creative input — OpenCode decides pacing, scene breakdown, and visual storytelling.'
            )}
          </p>
        </div>
      </div>

      <textarea
        value={masterPrompt}
        onChange={(event) => onChangeMasterPrompt(event.target.value)}
        rows={7}
        placeholder={t(
          'اكتب فكرة الفيديو الكاملة، الجمهور، النبرة، والرسالة… OpenCode سيحوّلها إلى مشاهد Remotion مخصصة.',
          'Describe the full video idea, audience, tone, and message… OpenCode will turn it into bespoke Remotion scenes.'
        )}
        className="block w-full min-h-[150px] resize-y rounded-xl border border-white/10 bg-[#0B0E14] px-3.5 py-3 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
      />
      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
        <span>{t('البرومبت الرئيسي', 'Master prompt')}</span>
        <span className="font-mono tabular-nums">{masterPrompt.length}</span>
      </div>

      <div className="mt-3 space-y-3">
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
            <Clock3 className="h-3.5 w-3.5 text-sky-300" />
            {t('المدة المستهدفة', 'Target duration')}
          </div>
          <div className="inline-flex w-full rounded-xl border border-white/10 bg-[#0B0E14] p-0.5">
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onChangeTargetDuration(option.id)}
                aria-pressed={targetDuration === option.id}
                className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold transition-colors cursor-pointer ${
                  targetDuration === option.id
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {option.id === 'auto'
                  ? t('تلقائي حسب الصوت', 'Auto voiceover')
                  : option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
              <Monitor className="h-3.5 w-3.5 text-sky-300" />
              {t('أبعاد الفيديو', 'Aspect ratio')}
            </div>
            <div className="inline-flex w-full rounded-xl border border-white/10 bg-[#0B0E14] p-0.5">
              {ASPECT_RATIO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChangeAspectRatio(preset.id)}
                  aria-pressed={aspectRatio === preset.id}
                  title={preset.dimensions}
                  className={`flex-1 rounded-lg px-2 py-1.5 font-mono text-[10px] font-bold transition-colors cursor-pointer ${
                    aspectRatio === preset.id
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {preset.id}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-sky-300" />
              {t('معدل الإطارات', 'Frame rate')}
            </div>
            <div className="inline-flex w-full rounded-xl border border-white/10 bg-[#0B0E14] p-0.5">
              {([30, 60] as FpsOption[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChangeFps(option)}
                  aria-pressed={fps === option}
                  className={`flex-1 rounded-lg px-2 py-1.5 font-mono text-[10px] font-bold transition-colors cursor-pointer tabular-nums ${
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

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ColorFormatPicker
            label={t('لون الخلفية', 'Background color')}
            value={brandKit.bgColor}
            onChange={(bgColor) => onChangeBrandKit({ ...brandKit, bgColor })}
            compact
          />
          <ColorFormatPicker
            label={t('لون التمييز', 'Accent color')}
            value={brandKit.accentColor}
            onChange={(accentColor) => onChangeBrandKit({ ...brandKit, accentColor })}
            compact
          />
        </div>

        <div className="rounded-xl border border-white/8 bg-[#0B0E14] px-2.5 py-2">
          <div className="flex flex-wrap items-center gap-2">
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
              placeholder="@ZofStudio"
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
        </div>

        <div className="rounded-xl border border-white/8 bg-[#0B0E14] px-2.5 py-2 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={voiceover.enabled}
              onClick={() => onChangeVoiceover({ ...voiceover, enabled: !voiceover.enabled })}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition-colors cursor-pointer ${
                voiceover.enabled
                  ? 'border-sky-400/40 bg-sky-500/15 text-sky-100'
                  : 'border-amber-400/40 bg-amber-500/15 text-amber-100'
              }`}
            >
              {voiceover.enabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
              {voiceover.enabled
                ? t('التعليق الصوتي: مفعّل', 'Voiceover: ON')
                : t('التعليق الصوتي: مغلق', 'Voiceover: OFF')}
            </button>
            <select
              value={voiceover.voiceId}
              disabled={!voiceover.enabled || voiceOptions.length === 0}
              onChange={(event) =>
                onChangeVoiceover({ ...voiceover, voiceId: event.target.value })
              }
              className="min-w-[140px] flex-1 rounded-lg border border-white/10 bg-[#10141D] px-2.5 py-1.5 text-[11px] text-slate-100 focus:border-sky-400 focus:outline-none disabled:opacity-40"
            >
              {voiceOptions.length === 0 ? (
                <option value={voiceover.voiceId}>{voiceover.voiceId}</option>
              ) : (
                voiceOptions.map((voice) => (
                  <option key={voice.voice_id} value={voice.voice_id} className="bg-[#10141D]">
                    {voice.name} · {voice.gender || t('صوت', 'voice')}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              onClick={onRefreshVoices}
              disabled={loadingVoices}
              title={t('تحديث قائمة الأصوات', 'Refresh voices')}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#10141D] p-1.5 text-slate-300 hover:border-sky-400/40 disabled:opacity-50 cursor-pointer"
            >
              {loadingVoices ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={sfx.enabled}
              onClick={() => onChangeSfx({ ...sfx, enabled: !sfx.enabled })}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition-colors cursor-pointer ${
                sfx.enabled
                  ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
                  : 'border-slate-400/30 bg-slate-500/10 text-slate-300'
              }`}
            >
              {sfx.enabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              {sfx.enabled ? t('المؤثرات: مفعّلة', 'SFX: ON') : t('المؤثرات: مغلقة', 'SFX: OFF')}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={sfx.volume}
              disabled={!sfx.enabled}
              onChange={(event) => onChangeSfx({ ...sfx, volume: Number(event.target.value) })}
              className="min-w-[120px] flex-1 accent-emerald-400 disabled:opacity-40"
              aria-label={t('مستوى المؤثرات الصوتية', 'SFX volume')}
            />
            <span className="w-10 shrink-0 text-end font-mono text-[10px] text-slate-400 tabular-nums">
              {Math.round(sfx.volume * 100)}%
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold text-slate-400">
              {t('لغة السرد', 'Narration language')}
            </span>
            <div className="inline-flex rounded-lg border border-white/10 bg-[#10141D] p-0.5">
              {(['ar', 'en'] as ScriptLanguage[]).map((language) => (
                <button
                  key={language}
                  type="button"
                  onClick={() => onChangeScriptLanguage(language)}
                  aria-pressed={scriptLanguage === language}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
                    scriptLanguage === language
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {language === 'ar' ? 'العربية' : 'English'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
