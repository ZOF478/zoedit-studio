import { useEffect, useState, type ReactNode } from 'react';
import { Lock, Mic, Play, Square, Volume2 } from 'lucide-react';
import { ColorFormatPicker } from './ColorFormatPicker';
import { WatermarkPositionPicker } from './WatermarkPositionPicker';
import { useI18n } from '../i18n';
import {
  ASPECT_RATIO_PRESETS,
  BACKGROUND_PRESETS,
  CAPTION_ANIMATION_STYLES,
  CREATIVE_CODE_MODE_OPTIONS,
  SCRIPT_DEPTH_OPTIONS,
  SCRIPT_LANGUAGES,
  SCRIPT_PACING_OPTIONS,
  WORDS_PER_SCREEN_OPTIONS,
} from '../types/studio';
import type {
  AspectRatio,
  BackgroundPresetId,
  BrandKit,
  CaptionAnimationStyle,
  CreativeCodeMode,
  FpsOption,
  ScriptDepth,
  ScriptLanguage,
  ScriptPacing,
  SfxConfig,
  SfxMode,
  StudioTabId,
  VisualStyle,
  WordsPerScreen,
} from '../types/studio';
import { SFX_CATALOG, playSfxPreview, stopSfxPreview } from '../utils/sfx';

interface ConfigSidebarProps {
  activeTab: StudioTabId;
  topic: string;
  onChangeTopic: (value: string) => void;
  onGenerateScript: () => void;
  isGeneratingScript: boolean;
  scriptNotice: string | null;
  visualStyle: VisualStyle;
  onChangeVisualStyle: (style: VisualStyle) => void;
  aspectRatio: AspectRatio;
  onChangeAspectRatio: (ratio: AspectRatio) => void;
  fps: FpsOption;
  onChangeFps: (fps: FpsOption) => void;
  brandKit: BrandKit;
  onChangeBrandKit: (next: BrandKit) => void;
  sfx: SfxConfig;
  onChangeSfx: (next: SfxConfig) => void;
  sfxMode: SfxMode;
  onChangeSfxMode: (mode: SfxMode) => void;
  backgroundPreset: BackgroundPresetId;
  onChangeBackgroundPreset: (preset: BackgroundPresetId) => void;
  scriptLanguage: ScriptLanguage;
  onChangeScriptLanguage: (language: ScriptLanguage) => void;
  scriptDepth: ScriptDepth;
  onChangeScriptDepth: (depth: ScriptDepth) => void;
  creativeCodeMode: CreativeCodeMode;
  onChangeCreativeCodeMode: (mode: CreativeCodeMode) => void;
  scriptPacing: ScriptPacing;
  onChangeScriptPacing: (pacing: ScriptPacing) => void;
  captionAnimationStyle: CaptionAnimationStyle;
  onChangeCaptionAnimationStyle: (style: CaptionAnimationStyle) => void;
  wordsPerScreen: WordsPerScreen;
  onChangeWordsPerScreen: (words: WordsPerScreen) => void;
  captionsEnabled: boolean;
  onChangeCaptionsEnabled: (enabled: boolean) => void;
  voiceoverEnabled: boolean;
  onToggleVoiceover: () => void;
  voiceoverSlot?: ReactNode;
}

const STYLE_CARDS: { id: VisualStyle; titleAr: string; titleEn: string; descAr: string; descEn: string }[] = [
  {
    id: 'stickman',
    titleAr: 'Stickman (بدون ملامح)',
    titleEn: 'Stickman (faceless)',
    descAr: 'شخصيات خطية معبّرة للشروحات القصصية',
    descEn: 'Expressive line characters for story-driven explainers',
  },
  {
    id: 'modern-dark',
    titleAr: 'Modern Dark',
    titleEn: 'Modern Dark',
    descAr: 'تصميم هندسي داكن مع إحصائيات حادة',
    descEn: 'Dark geometric design with crisp data visuals',
  },
  {
    id: 'editorial-clean',
    titleAr: 'Editorial Clean',
    titleEn: 'Editorial Clean',
    descAr: 'تباين تحريري فاتح بأسلوب الوثائقيات',
    descEn: 'Bright editorial contrast with a documentary feel',
  },
  {
    id: 'smart-mix',
    titleAr: 'AI Smart Mix (يختار الأنسب لكل مشهد)',
    titleEn: 'AI Smart Mix (picks per scene)',
    descAr: 'الذكاء الاصطناعي يقرر لكل مشهد: شخصية أم رسوم حركية نقية',
    descEn: 'AI decides per scene: character or pure motion graphics',
  },
];



function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  const { isRtl } = useI18n();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
      } ${checked ? 'bg-sky-500' : 'bg-slate-700'}`}
    >
      <span
        className="absolute top-1 h-4 w-4 rounded-full bg-white transition-all"
        style={isRtl ? { right: checked ? 22 : 2 } : { left: checked ? 22 : 2 }}
      />
    </button>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-2.5">
      <div className="min-w-0">
        <h3 className="font-display text-xs font-bold text-slate-100">{title}</h3>
        {description ? (
          <p className="mt-0.5 break-words text-[10px] leading-relaxed text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function ConfigSidebar({
  activeTab,
  topic,
  onChangeTopic,
  onGenerateScript,
  isGeneratingScript,
  scriptNotice,
  visualStyle,
  onChangeVisualStyle,
  aspectRatio,
  onChangeAspectRatio,
  fps,
  onChangeFps,
  brandKit,
  onChangeBrandKit,
  sfx,
  onChangeSfx,
  sfxMode,
  onChangeSfxMode,
  backgroundPreset,
  onChangeBackgroundPreset,
  scriptLanguage,
  onChangeScriptLanguage,
  scriptDepth,
  onChangeScriptDepth,
  creativeCodeMode,
  onChangeCreativeCodeMode,
  scriptPacing,
  onChangeScriptPacing,
  captionAnimationStyle,
  onChangeCaptionAnimationStyle,
  wordsPerScreen,
  onChangeWordsPerScreen,
  captionsEnabled,
  onChangeCaptionsEnabled,
  voiceoverEnabled,
  onToggleVoiceover,
  voiceoverSlot,
}: ConfigSidebarProps) {
  const { t, lang } = useI18n();
  const [previewingSfx, setPreviewingSfx] = useState<string | null>(null);

  useEffect(() => () => stopSfxPreview(), []);

  const toggleSfxPreview = (sfxId: string) => {
    if (previewingSfx === sfxId) {
      stopSfxPreview();
      setPreviewingSfx(null);
      return;
    }
    stopSfxPreview();
    setPreviewingSfx(sfxId);
    playSfxPreview(sfxId, sfx.volume, () => {
      setPreviewingSfx((current) => (current === sfxId ? null : current));
    });
  };

  if (activeTab === 'usage') return null;

  if (activeTab === 'script') {
    return (
      <div className="min-w-0 space-y-4">
        <div
          className={`min-w-0 rounded-xl border px-3 py-2 ${
            voiceoverEnabled
              ? 'border-sky-400/35 bg-sky-500/8'
              : 'border-amber-400/35 bg-amber-500/8'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                voiceoverEnabled
                  ? 'border-sky-400/35 bg-sky-500/10 text-sky-200'
                  : 'border-amber-400/35 bg-amber-500/10 text-amber-200'
              }`}
            >
              <Mic className="h-3.5 w-3.5" />
            </span>
            <p className="min-w-0 truncate text-[11px] font-semibold text-slate-200">
              {voiceoverEnabled
                ? t('التعليق الصوتي مفعّل — ElevenLabs', 'Voiceover on — ElevenLabs')
                : t('الوضع الصامت مفعّل — بدون تعليق صوتي', 'Silent mode — no voiceover')}
            </p>
          </div>
        </div>

        <Section title={t('لغة السكربت', 'Script language')}>
          <div className="grid grid-cols-2 gap-1.5">
            {SCRIPT_LANGUAGES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChangeScriptLanguage(option.value)}
                aria-pressed={scriptLanguage === option.value}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                  scriptLanguage === option.value
                    ? 'border-sky-400/70 bg-sky-500/10 text-slate-50'
                    : 'border-white/8 bg-[#0B0E14] text-slate-300 hover:border-white/20'
                }`}
              >
                {lang === 'ar' ? option.label : option.labelEn}
              </button>
            ))}
          </div>
        </Section>

        {voiceoverSlot}

        <Section title={t('عمق السكربت (Script Depth)', 'Script depth')}>
          <div className="grid grid-cols-1 gap-1.5">
            {SCRIPT_DEPTH_OPTIONS.map((option) => {
              const active = scriptDepth === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChangeScriptDepth(option.value)}
                  className={`min-w-0 rounded-lg border px-2.5 py-1.5 text-start transition-colors cursor-pointer ${
                    active
                      ? 'border-sky-400/70 bg-sky-500/10'
                      : 'border-white/8 bg-[#0B0E14] hover:border-white/20'
                  }`}
                >
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 break-words text-[11px] font-semibold text-slate-100">
                      {lang === 'ar' ? option.labelAr : option.labelEn}
                    </span>
                    {active ? (
                      <span className="shrink-0 text-[9px] font-semibold text-sky-300">
                        {t('مختار', 'Selected')}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 break-words text-[9px] leading-snug text-slate-400">
                    {lang === 'ar' ? option.descAr : option.descEn}
                  </p>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title={t('إيقاع السكربت (Script Pacing)', 'Script pacing')}>
          <div className="grid grid-cols-1 gap-1.5">
            {SCRIPT_PACING_OPTIONS.map((option) => {
              const active = scriptPacing === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChangeScriptPacing(option.value)}
                  className={`min-w-0 rounded-lg border px-2.5 py-1.5 text-start transition-colors cursor-pointer ${
                    active
                      ? 'border-sky-400/70 bg-sky-500/10'
                      : 'border-white/8 bg-[#0B0E14] hover:border-white/20'
                  }`}
                >
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 break-words text-[11px] font-semibold text-slate-100">
                      {lang === 'ar' ? option.labelAr : option.labelEn}
                    </span>
                    {active ? (
                      <span className="shrink-0 text-[9px] font-semibold text-sky-300">
                        {t('مختار', 'Selected')}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 break-words text-[9px] leading-snug text-slate-400">
                    {lang === 'ar' ? option.descAr : option.descEn}
                  </p>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title={t('محرك إبداع الكود (Creative Code Engine)', 'Creative code engine')}>
          <div className="grid grid-cols-1 gap-1.5">
            {CREATIVE_CODE_MODE_OPTIONS.map((option) => {
              const active = creativeCodeMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChangeCreativeCodeMode(option.value)}
                  className={`min-w-0 rounded-lg border px-2.5 py-1.5 text-start transition-colors cursor-pointer ${
                    active
                      ? 'border-sky-400/70 bg-sky-500/10'
                      : 'border-white/8 bg-[#0B0E14] hover:border-white/20'
                  }`}
                >
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 break-words text-[11px] font-semibold text-slate-100">
                      {lang === 'ar' ? option.labelAr : option.labelEn}
                    </span>
                    {active ? (
                      <span className="shrink-0 text-[9px] font-semibold text-sky-300">
                        {t('مختار', 'Selected')}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 break-words text-[9px] leading-snug text-slate-400">
                    {lang === 'ar' ? option.descAr : option.descEn}
                  </p>
                </button>
              );
            })}
          </div>
        </Section>
      </div>
    );
  }

  if (activeTab === 'identity') {
    return (
      <div className="min-w-0 space-y-4">
        <Section title={t('النمط البصري', 'Visual style')}>
          <div className="space-y-1.5">
            {STYLE_CARDS.map((card) => {
              const active = visualStyle === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onChangeVisualStyle(card.id)}
                  className={`w-full min-w-0 rounded-lg border px-3 py-2 text-start transition-colors cursor-pointer ${
                    active
                      ? 'border-sky-400/70 bg-sky-500/10 text-slate-50'
                      : 'border-white/8 bg-[#0B0E14] text-slate-300 hover:border-white/20'
                  }`}
                >
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 break-words text-[11px] font-semibold">
                      {lang === 'ar' ? card.titleAr : card.titleEn}
                    </span>
                    {active ? (
                      <span className="shrink-0 text-[9px] font-semibold text-sky-300">
                        {t('مختار', 'Selected')}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 break-words text-[9px] leading-snug text-slate-400">
                    {lang === 'ar' ? card.descAr : card.descEn}
                  </p>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title={t('محرك إبداع الكود (Creative Code Engine)', 'Creative code engine')}>
          <div className="grid grid-cols-1 gap-1.5">
            {CREATIVE_CODE_MODE_OPTIONS.map((option) => {
              const active = creativeCodeMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChangeCreativeCodeMode(option.value)}
                  className={`min-w-0 rounded-lg border px-2.5 py-1.5 text-start transition-colors cursor-pointer ${
                    active
                      ? 'border-sky-400/70 bg-sky-500/10'
                      : 'border-white/8 bg-[#0B0E14] hover:border-white/20'
                  }`}
                >
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 break-words text-[11px] font-semibold text-slate-100">
                      {lang === 'ar' ? option.labelAr : option.labelEn}
                    </span>
                    {active ? (
                      <span className="shrink-0 text-[9px] font-semibold text-sky-300">
                        {t('مختار', 'Selected')}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 break-words text-[9px] leading-snug text-slate-400">
                    {lang === 'ar' ? option.descAr : option.descEn}
                  </p>
                </button>
              );
            })}
          </div>
        </Section>

        <Section
          title={t('خلفيات المشاهد المتحركة', 'Animated backgrounds')}
          description={t(
            'اختر قالباً متحركاً أو دع الذكاء الاصطناعي يصمم هوية جديدة لكل فيديو.',
            'Pick a curated animated template or let AI invent a fresh identity.'
          )}
        >
          <div className="grid grid-cols-2 gap-1.5">
            {BACKGROUND_PRESETS.map((preset) => {
              const active = backgroundPreset === preset.id;
              const isAi = preset.id === 'ai-free';
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChangeBackgroundPreset(preset.id)}
                  className={`group min-w-0 overflow-hidden rounded-lg border text-start transition-colors cursor-pointer ${
                    active
                      ? 'border-sky-400/70 bg-sky-500/10'
                      : 'border-white/8 bg-[#0B0E14] hover:border-white/20'
                  } ${isAi ? 'col-span-2' : ''}`}
                >
                  <div
                    className={`zoedit-bg-preview relative w-full overflow-hidden ${isAi ? 'h-12' : 'h-9'}`}
                    style={{ background: preset.preview }}
                  >
                    {isAi ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-slate-950/35 font-display text-[10px] font-bold text-white">
                        {t('إبداع حر بالذكاء الاصطناعي', 'AI Free Creativity')}
                      </span>
                    ) : null}
                  </div>
                  <div className="px-2 py-1.5">
                    <div className="flex min-w-0 items-center justify-between gap-1">
                      <span className="min-w-0 truncate text-[10px] font-semibold text-slate-100">
                        {lang === 'ar' ? preset.labelAr : preset.labelEn}
                      </span>
                      {active ? (
                        <span className="shrink-0 text-[9px] font-semibold text-sky-300">✓</span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title={t('هوية العلامة (Brand Kit)', 'Brand kit')}>
          <div className="grid grid-cols-1 gap-2">
            <ColorFormatPicker
              label={t('لون التمييز', 'Accent color')}
              value={brandKit.accentColor}
              onChange={(next) => onChangeBrandKit({ ...brandKit, accentColor: next })}
            />
            <ColorFormatPicker
              label={t('لون الخلفية', 'Background color')}
              value={brandKit.bgColor}
              onChange={(next) => onChangeBrandKit({ ...brandKit, bgColor: next })}
            />
          </div>

          <div className="min-w-0 space-y-2 rounded-lg border border-white/10 bg-[#0B0E14] px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-200">
                  {t('العلامة المائية', 'Watermark')}
                </p>
                <p className="text-[9px] text-slate-500">
                  {brandKit.watermarkEnabled
                    ? t('ظاهرة على الفيديو', 'Visible on the video')
                    : t('مخفية تماماً', 'Completely hidden')}
                </p>
              </div>
              <ToggleSwitch
                checked={brandKit.watermarkEnabled}
                onChange={() =>
                  onChangeBrandKit({ ...brandKit, watermarkEnabled: !brandKit.watermarkEnabled })
                }
                label={t('تبديل العلامة المائية', 'Toggle watermark')}
              />
            </div>
            <input
              type="text"
              value={brandKit.watermark}
              disabled={!brandKit.watermarkEnabled}
              onChange={(e) => onChangeBrandKit({ ...brandKit, watermark: e.target.value })}
              placeholder="@ZoeditStudio"
              className="w-full rounded-lg border border-white/10 bg-[#10141D] px-2.5 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:outline-none disabled:opacity-40"
            />
            <WatermarkPositionPicker
              value={brandKit.watermarkPosition ?? 'top-left'}
              disabled={!brandKit.watermarkEnabled}
              onChange={(watermarkPosition) =>
                onChangeBrandKit({ ...brandKit, watermarkPosition })
              }
              className="w-full justify-between"
            />
          </div>
        </Section>

        <Section title={t('الأبعاد ومعدل الإطارات', 'Aspect ratio & frame rate')}>
          <div className="flex items-center justify-end">
            <div className="inline-flex rounded-lg border border-white/10 bg-[#0B0E14] p-0.5">
              {([30, 60] as FpsOption[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChangeFps(option)}
                  className={`rounded-md px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors cursor-pointer tabular-nums ${
                    fps === option ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {option}fps
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {ASPECT_RATIO_PRESETS.map((preset) => {
              const active = aspectRatio === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChangeAspectRatio(preset.id)}
                  className={`min-w-0 rounded-lg border px-1.5 py-2 text-center transition-colors cursor-pointer ${
                    active
                      ? 'border-sky-400/70 bg-sky-500/10 text-slate-50'
                      : 'border-white/8 bg-[#0B0E14] text-slate-300 hover:border-white/20'
                  }`}
                >
                  <div className="font-mono text-[10px] font-semibold" dir="ltr">
                    {preset.id}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[9px] text-slate-400 tabular-nums" dir="ltr">
                    {preset.dimensions}
                  </div>
                </button>
              );
            })}
          </div>
        </Section>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <div
        className={`min-w-0 rounded-xl border p-3 ${
          captionsEnabled
            ? 'border-sky-400/35 bg-sky-500/8'
            : 'border-white/10 bg-[#0B0E14]'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-xs font-bold text-slate-100">
              {!voiceoverEnabled ? (
                <Lock className="h-3.5 w-3.5 shrink-0 text-amber-300" />
              ) : null}
              {t('إظهار الكابشن السفلي (Subtitles)', 'Show bottom subtitles')}
            </p>
            <p className="mt-0.5 break-words text-[10px] leading-relaxed text-slate-400">
              {!voiceoverEnabled
                ? t(
                    'مغلق تلقائياً في الوضع الصامت — لا يوجد تعليق صوتي',
                    'Automatically locked in silent mode — there is no voiceover'
                  )
                : captionsEnabled
                  ? t('الكابشن مفعّل فوق الفيديو', 'Subtitles are visible over the video')
                  : t('الكابشن مخفي مع بقاء الصوت', 'Subtitles hidden while voiceover stays on')}
            </p>
          </div>
          <ToggleSwitch
            checked={captionsEnabled}
            onChange={() => {
              if (voiceoverEnabled) onChangeCaptionsEnabled(!captionsEnabled);
            }}
            label={t('إظهار أو إخفاء الكابشن السفلي', 'Show or hide bottom subtitles')}
            disabled={!voiceoverEnabled}
          />
        </div>
        {!voiceoverEnabled ? (
          <p className="mt-2 rounded-lg border border-amber-400/25 bg-amber-500/10 px-2.5 py-1.5 text-[10px] leading-relaxed text-amber-200">
            {t(
              'الوضع الصامت يعتمد على سرد بصري تفاعلي خالص: بطاقات ومقارنات ومخططات وعناوين بصرية بدون شريط ترجمة.',
              'Silent mode relies on pure interactive visual storytelling: cards, comparisons, charts, and bold visual labels without a subtitle bar.'
            )}
          </p>
        ) : null}
      </div>

      <div className={voiceoverEnabled ? 'min-w-0' : 'min-w-0 pointer-events-none opacity-45'}>
      <Section
        title={t('تحكم الكابشن (Captions)', 'Caption controls')}
        description={t(
          'كابشن قصير 2–4 كلمات مع تزامن دقيق ولون الهوية.',
          'Compact 2–4 word chunks synced tightly to the brand colors.'
        )}
      >
        <div className="space-y-1.5">
          <div className="text-[10px] text-slate-400">
            {t('نمط حركة الكابشن', 'Caption animation style')}
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {CAPTION_ANIMATION_STYLES.map((option) => {
              const active = captionAnimationStyle === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChangeCaptionAnimationStyle(option.value)}
                  className={`min-w-0 rounded-lg border px-2.5 py-1.5 text-start text-[10px] font-semibold transition-colors cursor-pointer break-words ${
                    active
                      ? 'border-sky-400/70 bg-sky-500/10 text-slate-50'
                      : 'border-white/8 bg-[#0B0E14] text-slate-300 hover:border-white/20'
                  }`}
                >
                  {lang === 'ar' ? option.labelAr : option.labelEn}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-[10px] text-slate-400">
            {t('عدد الكلمات على الشاشة', 'Words per screen')}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {WORDS_PER_SCREEN_OPTIONS.map((option) => {
              const active = wordsPerScreen === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChangeWordsPerScreen(option.value)}
                  className={`min-w-0 rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition-colors cursor-pointer ${
                    option.value === 'auto' ? 'col-span-2' : ''
                  } ${
                    active
                      ? 'border-sky-400/70 bg-sky-500/10 text-slate-50'
                      : 'border-white/8 bg-[#0B0E14] text-slate-300 hover:border-white/20'
                  }`}
                >
                  {lang === 'ar' ? option.labelAr : option.labelEn}
                </button>
              );
            })}
          </div>
        </div>
      </Section>
      </div>

      <Section title={t('المؤثرات الصوتية (SFX)', 'Foley sound effects (SFX)')}>
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 break-words text-[10px] text-slate-400">
            {t(
              '12 مؤثراً جاهزاً للعمل دون اتصال · تبقى فعالة حتى في الوضع الصامت.',
              '12 offline-ready effects · they stay active even in silent mode.'
            )}
          </p>
          <ToggleSwitch
            checked={sfx.enabled}
            onChange={() => onChangeSfx({ ...sfx, enabled: !sfx.enabled })}
            label={t('تبديل المؤثرات الصوتية', 'Toggle sound effects')}
          />
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          <button
            type="button"
            onClick={() => onChangeSfxMode('auto')}
            className={`min-w-0 rounded-lg border px-2.5 py-2 text-start transition-colors cursor-pointer ${
              sfxMode === 'auto'
                ? 'border-sky-400/70 bg-sky-500/10'
                : 'border-white/8 bg-[#0B0E14] hover:border-white/20'
            }`}
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="min-w-0 break-words text-[11px] font-semibold text-slate-100">
                {t('مؤثرات ذكية تلقائية (AI Smart Auto-SFX)', 'AI Smart Auto-SFX')}
              </span>
              {sfxMode === 'auto' ? (
                <span className="shrink-0 text-[9px] font-semibold text-sky-300">
                  {t('افتراضي', 'Default')}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 break-words text-[9px] leading-relaxed text-slate-400">
              {t(
                'مؤثرات خفيفة على اللحظات المفصلية فقط، وليس على كل مشهد.',
                'Subtle SFX only on key beats, never on every scene.'
              )}
            </p>
          </button>
          <button
            type="button"
            onClick={() => onChangeSfxMode('manual')}
            className={`min-w-0 rounded-lg border px-2.5 py-2 text-start transition-colors cursor-pointer ${
              sfxMode === 'manual'
                ? 'border-amber-400/60 bg-amber-500/10'
                : 'border-white/8 bg-[#0B0E14] hover:border-white/20'
            }`}
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="min-w-0 break-words text-[11px] font-semibold text-slate-100">
                {t('تحكم يدوي مخصص', 'Custom / manual override')}
              </span>
              {sfxMode === 'manual' ? (
                <span className="shrink-0 text-[9px] font-semibold text-amber-300">
                  {t('يدوي', 'Manual')}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 break-words text-[9px] leading-relaxed text-slate-400">
              {t(
                'كشف أدوات اختيار وتوقيت المؤثر لكل مشهد.',
                'Reveals per-scene SFX selection and timing.'
              )}
            </p>
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-slate-300">
            <span>{t('مستوى صوت المؤثرات', 'SFX volume')}</span>
            <span className="font-mono tabular-nums text-slate-200">
              {Math.round(sfx.volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            disabled={!sfx.enabled}
            value={sfx.volume}
            onChange={(e) => onChangeSfx({ ...sfx, volume: Number(e.target.value) })}
            className="w-full accent-sky-400 disabled:opacity-40 cursor-pointer"
          />
          {sfxMode === 'manual' ? (
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {SFX_CATALOG.map((item) => {
                const isPlaying = previewingSfx === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleSfxPreview(item.id)}
                    title={`${lang === 'ar' ? item.labelAr : item.labelEn} · ${item.durationSec}s`}
                    className={`inline-flex min-w-0 items-center justify-between gap-1.5 rounded-md border px-2 py-1.5 text-[10px] transition-colors cursor-pointer ${
                      isPlaying
                        ? 'border-sky-400/60 bg-sky-500/15 text-sky-100'
                        : 'border-white/10 bg-[#0B0E14] text-slate-300 hover:border-sky-400/40 hover:text-slate-100'
                    }`}
                  >
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      {isPlaying ? (
                        <Square className="h-2.5 w-2.5 shrink-0 fill-current text-sky-400" />
                      ) : (
                        <Play className="h-2.5 w-2.5 shrink-0 fill-current text-sky-400" />
                      )}
                      <span className="truncate">{lang === 'ar' ? item.labelAr : item.labelEn}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[9px] tabular-nums text-slate-500">
                      {item.durationSec}s
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
          <p className="flex items-start gap-1.5 pt-1 text-[9px] leading-relaxed text-slate-500">
            <Volume2 className="mt-0.5 h-3 w-3 shrink-0 text-sky-400/70" />
            {t(
              'الملفات محفوظة في public/sfx وتعمل مباشرة في Remotion.',
              'Files are stored in public/sfx and play directly in Remotion.'
            )}
          </p>
        </div>
      </Section>

      <Section title={t('العلامة المائية', 'Watermark')}>
        <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-white/8 bg-[#0B0E14] px-2.5 py-2">
          <span className="min-w-0 break-words text-[10px] text-slate-400">
            {brandKit.watermarkEnabled
              ? t('ظاهرة على الفيديو', 'Visible on the video')
              : t('مخفية تماماً', 'Completely hidden')}
          </span>
          <ToggleSwitch
            checked={brandKit.watermarkEnabled}
            onChange={() =>
              onChangeBrandKit({
                ...brandKit,
                watermarkEnabled: !brandKit.watermarkEnabled,
              })
            }
            label={t('تبديل العلامة المائية', 'Toggle watermark')}
          />
        </div>
        <input
          type="text"
          value={brandKit.watermark}
          disabled={!brandKit.watermarkEnabled}
          onChange={(event) =>
            onChangeBrandKit({ ...brandKit, watermark: event.target.value })
          }
          placeholder="@ZoeditStudio"
          className="w-full min-w-0 rounded-lg border border-white/10 bg-[#10141D] px-2.5 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:outline-none disabled:opacity-40"
        />
        <WatermarkPositionPicker
          value={brandKit.watermarkPosition ?? 'top-left'}
          disabled={!brandKit.watermarkEnabled}
          onChange={(watermarkPosition) =>
            onChangeBrandKit({ ...brandKit, watermarkPosition })
          }
          className="w-full justify-between"
        />
      </Section>

      <Section title={t('معدل الإطارات (FPS)', 'Frame rate (FPS)')}>
        <div className="inline-flex w-full rounded-lg border border-white/10 bg-[#0B0E14] p-0.5">
          {([30, 60] as FpsOption[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChangeFps(option)}
              aria-pressed={fps === option}
              className={`flex-1 rounded-md px-2.5 py-1.5 font-mono text-[11px] font-semibold transition-colors cursor-pointer tabular-nums ${
                fps === option
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {option}fps
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}
