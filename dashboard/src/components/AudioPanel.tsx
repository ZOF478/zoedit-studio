import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Captions,
  ChevronDown,
  ChevronUp,
  Cloud,
  Cpu,
  Download,
  FilterX,
  Gauge,
  KeyRound,
  Loader2,
  Mic,
  MicOff,
  Play,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Square,
  Type,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { getVideoLanguage } from '../types/languages';
import type {
  BrandKit,
  CaptionAnimationStyle,
  CaptionColors,
  ElevenLabsModel,
  ElevenLabsVoice,
  ScriptLanguage,
  SfxConfig,
  TtsVoice,
  VoiceFilterPreferences,
  VoiceoverConfig,
  VoiceProviderId,
} from '../types/studio';
import { CaptionControls } from './CaptionControls';

interface AudioPanelProps {
  voiceover: VoiceoverConfig;
  onChangeVoiceover: (next: VoiceoverConfig) => void;
  voices: TtsVoice[];
  loadingVoices: boolean;
  onRefreshVoices: (options?: { refresh?: boolean }) => void;
  onVoiceImported: (voice: ElevenLabsVoice) => void;
  videoLanguage: ScriptLanguage;
  apiBaseUrl: string;
  sessionToken: string;
  sfx: SfxConfig;
  onChangeSfx: (next: SfxConfig) => void;
  captionsEnabled: boolean;
  onChangeCaptionsEnabled: (value: boolean) => void;
  brandKit: BrandKit;
  captionStyle: CaptionAnimationStyle;
  onChangeCaptionStyle: (value: CaptionAnimationStyle) => void;
  captionColors: CaptionColors;
  onChangeCaptionColors: (next: CaptionColors) => void;
  captionBottomOffset: number;
  onChangeCaptionBottomOffset: (value: number) => void;
  disabled?: boolean;
}

const FALLBACK_ELEVENLABS_MODELS: ElevenLabsModel[] = [
  {
    model_id: 'eleven_multilingual_v2',
    name: 'Eleven Multilingual v2',
    description: 'Highest multilingual pronunciation accuracy',
    latencyBadge: 'Ultra quality',
    qualityBadge: '29 languages',
    languages: ['Arabic', 'English'],
  },
  {
    model_id: 'eleven_turbo_v2_5',
    name: 'Eleven Turbo v2.5',
    description: 'Balanced speed and quality',
    latencyBadge: 'Fast response · ~250ms',
    qualityBadge: 'Balanced',
    languages: ['Arabic', 'English'],
  },
  {
    model_id: 'eleven_flash_v2_5',
    name: 'Eleven Flash v2.5',
    description: 'Fastest model for scene previews',
    latencyBadge: 'Ultra-low latency · ~75ms',
    qualityBadge: 'Maximum speed',
    languages: ['Arabic', 'English'],
  },
];

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
  tone,
}: {
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
  label: string;
  tone: 'sky' | 'emerald';
}) {
  const { isRtl } = useI18n();
  return (
    <button
      type="button"
      role="switch"
      disabled={disabled}
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? (tone === 'sky' ? 'bg-sky-500' : 'bg-emerald-500') : 'bg-slate-700'
      }`}
    >
      <span
        className="absolute top-1 h-4 w-4 rounded-full bg-white transition-all"
        style={isRtl ? { right: checked ? 22 : 2 } : { left: checked ? 22 : 2 }}
      />
    </button>
  );
}

function normalizeGender(value: string): 'male' | 'female' | 'neutral' {
  const normalized = (value || '').trim().toLowerCase();
  if (!normalized) return 'neutral';
  if (
    normalized === 'female' ||
    normalized === 'woman' ||
    normalized === 'girl' ||
    normalized === 'f' ||
    normalized.includes('أنثى') ||
    normalized.includes('انثى')
  ) {
    return 'female';
  }
  if (
    normalized === 'male' ||
    normalized === 'man' ||
    normalized === 'boy' ||
    normalized === 'm' ||
    normalized.includes('ذكر')
  ) {
    return 'male';
  }
  return 'neutral';
}

function genderLabel(value: string, t: (ar: string, en: string) => string): string {
  const gender = normalizeGender(value);
  if (gender === 'male') return t('ذكر', 'Male');
  if (gender === 'female') return t('أنثى', 'Female');
  return t('محايد', 'Neutral');
}

function voiceLanguages(voice: ElevenLabsVoice): string[] {
  const list = voice.languages?.length ? voice.languages : [voice.language];
  const seen = new Set<string>();
  const values: string[] = [];
  for (const item of list) {
    const label = (item || '').trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(label);
  }
  return values.length > 0 ? values : ['Other'];
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="min-w-0 space-y-1 rounded-lg border border-white/8 bg-[#10141D] px-2.5 py-1.5">
      <span className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
        <span>{label}</span>
        <span className="font-mono text-sky-300 tabular-nums">{value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
      />
    </label>
  );
}

export function AudioPanel({
  voiceover,
  onChangeVoiceover,
  voices,
  loadingVoices,
  onRefreshVoices,
  onVoiceImported,
  videoLanguage,
  apiBaseUrl,
  sessionToken,
  sfx,
  onChangeSfx,
  captionsEnabled,
  onChangeCaptionsEnabled,
  brandKit,
  captionStyle,
  onChangeCaptionStyle,
  captionColors,
  onChangeCaptionColors,
  captionBottomOffset,
  onChangeCaptionBottomOffset,
  disabled = false,
}: AudioPanelProps) {
  const { t, lang } = useI18n();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [directVoiceId, setDirectVoiceId] = useState('');
  const [fetchingVoiceId, setFetchingVoiceId] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);
  const [models, setModels] = useState<ElevenLabsModel[]>(FALLBACK_ELEVENLABS_MODELS);
  const [modelsLoading, setModelsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filters = voiceover.filters;
  const provider = voiceover.provider;

  const providerOptions: Array<{
    id: VoiceProviderId;
    label: string;
    hint: string;
    icon: typeof Cloud;
  }> = [
    {
      id: 'edge',
      label: t('Edge TTS (مجاني)', 'Edge TTS (Free)'),
      hint: t('سحابي · 100+ لغة · بدون مفتاح', 'Cloud · 100+ languages · no key'),
      icon: Cloud,
    },
    {
      id: 'piper',
      label: t('Piper TTS (مفتوح المصدر)', 'Piper TTS (Open-Source Offline)'),
      hint: t('يعمل بدون إنترنت على المعالج', 'Runs offline on CPU'),
      icon: Cpu,
    },
    {
      id: 'elevenlabs',
      label: t('ElevenLabs (BYOK)', 'ElevenLabs (BYOK)'),
      hint: t('مفتاحك الخاص · أعلى جودة', 'Your own key · premium quality'),
      icon: KeyRound,
    },
  ];

  const updateFilters = (patch: Partial<VoiceFilterPreferences>) => {
    onChangeVoiceover({
      ...voiceover,
      filters: { ...filters, ...patch },
    });
  };

  const loadModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/elevenlabs/models`, {
        headers: sessionToken ? { 'x-zoedit-session': sessionToken } : {},
      });
      if (!response.ok) return;
      const data = (await response.json()) as { models?: ElevenLabsModel[] };
      if (data.models && data.models.length > 0) {
        setModels(data.models);
      }
    } catch {
      // Keep the built-in fallback catalog when the API is unreachable.
    } finally {
      setModelsLoading(false);
    }
  }, [apiBaseUrl, sessionToken]);

  useEffect(() => {
    if (provider !== 'elevenlabs') return;
    void loadModels();
  }, [loadModels, provider]);

  const captionsLocked = !voiceover.enabled;
  const captionsActive = captionsEnabled && voiceover.enabled;

  const localizedModelDescription = (model: ElevenLabsModel): string => {
    switch (model.model_id) {
      case 'eleven_multilingual_v2':
        return t('أعلى دقة نطق متعددة اللغات', 'Highest multilingual pronunciation accuracy');
      case 'eleven_turbo_v2_5':
        return t('توازن بين السرعة والجودة', 'Balanced speed and quality');
      case 'eleven_flash_v2_5':
        return t('أسرع نموذج لمعاينة المشاهد', 'Fastest model for scene previews');
      default:
        return model.description;
    }
  };

  const languageOptions = useMemo(
    () => Array.from(new Set(voices.flatMap((voice) => voiceLanguages(voice)))).sort(),
    [voices]
  );
  const accentOptions = useMemo(
    () => Array.from(new Set(voices.map((voice) => voice.accent).filter(Boolean))).sort(),
    [voices]
  );

  const videoLanguageName = getVideoLanguage(videoLanguage).name;
  const autoLanguage = useMemo(() => {
    const target = videoLanguageName.toLowerCase();
    const exact = languageOptions.find((option) => option.toLowerCase() === target);
    if (exact) return exact;
    const partial = languageOptions.find(
      (option) =>
        option.toLowerCase().includes(target) ||
        target.includes(option.toLowerCase()),
    );
    return partial || 'all';
  }, [languageOptions, videoLanguageName]);

  const effectiveLanguage = filters.followVideoLanguage
    ? autoLanguage
    : filters.language;

  const filteredVoices = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return voices.filter((voice) => {
      const languages = voiceLanguages(voice);
      if (effectiveLanguage !== 'all' && !languages.includes(effectiveLanguage)) {
        return false;
      }
      if (filters.accent !== 'all' && voice.accent !== filters.accent) return false;
      if (filters.gender !== 'all' && normalizeGender(voice.gender) !== filters.gender) {
        return false;
      }
      if (!query) return true;
      const haystack = [
        voice.name,
        voice.gender,
        voice.language,
        ...languages,
        voice.accent,
        voice.tone,
        voice.category,
        voice.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [voices, filters.search, filters.accent, filters.gender, effectiveLanguage]);

  const selectedVoice = voices.find((voice) => voice.voice_id === voiceover.voiceId);
  const optionVoices = useMemo(() => {
    if (filteredVoices.some((voice) => voice.voice_id === voiceover.voiceId)) {
      return filteredVoices;
    }
    return selectedVoice ? [selectedVoice, ...filteredVoices] : filteredVoices;
  }, [filteredVoices, selectedVoice, voiceover.voiceId]);

  const stopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingVoiceId(null);
  };

  const playSfxVolumeTest = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const AudioContextConstructor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;
    try {
      const context = new AudioContextConstructor();
      await context.resume().catch(() => undefined);
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, now);
      oscillator.frequency.exponentialRampToValueAtTime(540, now + 0.16);
      const targetGain = Math.max(0.0001, Math.min(1, sfx.volume));
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(targetGain, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.24);
      oscillator.onended = () => {
        void context.close();
      };
    } catch {
      // Audio preview is best-effort; some browsers may block AudioContext.
    }
  }, [sfx.volume]);

  const handlePlayPreview = async () => {
    if (!selectedVoice) return;
    if (playingVoiceId === selectedVoice.voice_id) {
      stopPreview();
      return;
    }
    stopPreview();
    setPreviewNotice(null);
    setPlayingVoiceId(selectedVoice.voice_id);

    if (selectedVoice.preview_url) {
      const audio = new Audio(selectedVoice.preview_url);
      audioRef.current = audio;
      audio.onended = () => setPlayingVoiceId(null);
      audio.onerror = () => setPlayingVoiceId(null);
      try {
        await audio.play();
        return;
      } catch {
        // Fall back to the TTS endpoint below.
      }
    }

    if (provider === 'piper' && selectedVoice.installed === false) {
      setPreviewNotice(
        t(
          'تنزيل نموذج Piper الصوتي لأول مرة إلى ~/.zoedit-studio/voices…',
          'Downloading the Piper voice model to ~/.zoedit-studio/voices for the first time…'
        )
      );
    }

    try {
      const response = await fetch(`${apiBaseUrl}/tts/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-zoedit-session': sessionToken } : {}),
        },
        body: JSON.stringify({
          provider,
          text: t(
            `مرحباً، أنا ${selectedVoice.name.split('—')[0].trim()}، وهذا اختبار لجودة التعليق الصوتي في استوديو زويد.`,
            `Hi, I'm ${selectedVoice.name.split('—')[0].trim()}, and this is a voice quality test for Zoedit Studio.`
          ),
          voiceId: selectedVoice.voice_id,
          modelId: voiceover.modelId,
          stability: voiceover.stability,
          similarityBoost: voiceover.similarityBoost,
          style: voiceover.style,
          speakerBoost: voiceover.speakerBoost,
          speed: voiceover.speed,
          uiLanguage: lang,
        }),
      });
      const data = (await response.json()) as {
        audioDataUrl?: string | null;
        notice?: string;
        error?: string;
      };
      if (data.audioDataUrl) {
        setPreviewNotice(null);
        const audio = new Audio(data.audioDataUrl);
        audioRef.current = audio;
        audio.onended = () => setPlayingVoiceId(null);
        audio.onerror = () => setPlayingVoiceId(null);
        await audio.play();
        return;
      }
      if (data.error) {
        setPreviewNotice(data.error);
        setPlayingVoiceId(null);
        return;
      }
      if (data.notice) setPreviewNotice(data.notice);
    } catch {
      // Fall back to browser synthesis below.
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        t(
          'مرحباً بكم في استوديو زويد لإنتاج الفيديو بالذكاء الاصطناعي.',
          'Welcome to Zoedit Studio for AI-powered video production.'
        )
      );
      utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
      utterance.onend = () => setPlayingVoiceId(null);
      utterance.onerror = () => setPlayingVoiceId(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setPlayingVoiceId(null);
    }
  };

  const handleFetchVoiceById = async () => {
    const voiceId = directVoiceId.trim();
    if (!voiceId) return;
    setFetchingVoiceId(true);
    setPreviewNotice(null);
    try {
      const response = await fetch(
        `${apiBaseUrl}/elevenlabs/voices/${encodeURIComponent(voiceId)}`,
        {
          headers: {
            ...(sessionToken ? { 'x-zoedit-session': sessionToken } : {}),
            'x-zoedit-ui-lang': lang,
          },
        }
      );
      const data = (await response.json()) as {
        voice?: ElevenLabsVoice;
        error?: string;
      };
      if (!response.ok || !data.voice) {
        setPreviewNotice(
          data.error ||
            t('تعذر جلب الصوت بهذا المعرّف.', 'Could not fetch a voice with this ID.')
        );
        return;
      }
      onVoiceImported(data.voice);
      setDirectVoiceId('');
      setPreviewNotice(
        t(`تمت إضافة الصوت ${data.voice.name} وتحديده.`, `Added and selected ${data.voice.name}.`)
      );
    } catch {
      setPreviewNotice(
        t('تعذر الاتصال بخادم ElevenLabs.', 'Could not reach the ElevenLabs server endpoint.')
      );
    } finally {
      setFetchingVoiceId(false);
    }
  };

  return (
    <section className="min-w-0 w-full max-w-full overflow-x-hidden rounded-2xl border border-white/10 bg-[#0E121A] p-3.5 shadow-[0_18px_60px_-50px_rgba(56,189,248,0.7)]">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-400/25 bg-sky-500/12 text-sky-200">
          <Mic className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-[13px] font-bold text-slate-100">
            {t('استوديو الصوت', 'Audio studio')}
          </h2>
          <p className="mt-0.5 truncate text-[11px] leading-tight text-slate-500">
            {t(
              'التعليق الصوتي والترجمة عبر Edge و Piper و ElevenLabs.',
              'Voiceover and captions via Edge, Piper and ElevenLabs.'
            )}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            role="switch"
            disabled={disabled}
            aria-checked={voiceover.enabled}
            onClick={() => onChangeVoiceover({ ...voiceover, enabled: !voiceover.enabled })}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
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

          <button
            type="button"
            role="switch"
            disabled={disabled || captionsLocked}
            aria-checked={captionsActive}
            title={
              captionsLocked
                ? t('الترجمة تتطلب تفعيل التعليق الصوتي', 'Captions require voiceover')
                : t('تبديل الترجمة النصية', 'Toggle captions')
            }
            onClick={() => onChangeCaptionsEnabled(!captionsEnabled)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
              captionsActive
                ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
                : 'border-slate-400/30 bg-slate-500/10 text-slate-300'
            }`}
          >
            <Captions className="h-3.5 w-3.5" />
            {captionsActive
              ? t('الترجمة النصية: مفعّلة', 'Captions: ON')
              : t('الترجمة النصية: مغلقة', 'Captions: OFF')}
          </button>
        </div>

        {!voiceover.enabled ? (
          <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1.5 text-[10px] leading-relaxed text-amber-100/90">
            {t(
              'الوضع الصامت: لن يتم توليد صوت أو ترجمة نصية. المؤثرات الصوتية تبقى متاحة.',
              'Silent mode: no voice or captions will be generated. SFX stay available.'
            )}
          </p>
        ) : (
          <div className="space-y-2.5">
            <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-white/8 bg-[#0B0E14] p-1.5">
              {providerOptions.map((option) => {
                const Icon = option.icon;
                const active = provider === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={disabled}
                    aria-pressed={active}
                    title={option.hint}
                    onClick={() =>
                      onChangeVoiceover({ ...voiceover, provider: option.id })
                    }
                    className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg border px-1.5 py-1.5 text-[9px] font-bold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                      active
                        ? 'border-sky-400/50 bg-sky-500/15 text-sky-100'
                        : 'border-white/8 bg-[#10141D] text-slate-400 hover:border-sky-400/30 hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${active ? 'text-sky-300' : ''}`} />
                    <span className="w-full text-center leading-tight">
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {provider === 'elevenlabs' ? (
              <div className="flex items-end gap-2">
                <label className="min-w-0 flex-1 space-y-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                    <Gauge className="h-3.5 w-3.5 text-sky-300" />
                    {t('إصدار نموذج ElevenLabs', 'ElevenLabs model')}
                  </span>
                  <select
                    value={voiceover.modelId}
                    disabled={disabled}
                    onChange={(event) =>
                      onChangeVoiceover({ ...voiceover, modelId: event.target.value })
                    }
                    className="w-full rounded-lg border border-white/10 bg-[#10141D] px-2.5 py-1.5 text-[11px] text-slate-100 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {!models.some((model) => model.model_id === voiceover.modelId) ? (
                      <option value={voiceover.modelId}>{voiceover.modelId}</option>
                    ) : null}
                    {models.map((model) => (
                      <option
                        key={model.model_id}
                        value={model.model_id}
                        title={localizedModelDescription(model)}
                        className="bg-[#10141D]"
                      >
                        {model.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    onRefreshVoices({ refresh: true });
                    void loadModels();
                  }}
                  disabled={disabled || loadingVoices || modelsLoading}
                  title={t('تحديث النماذج والأصوات', 'Refresh models and voices')}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#10141D] p-2 text-slate-300 hover:border-sky-400/40 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {loadingVoices || modelsLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-[#10141D] px-2.5 py-1.5">
                {provider === 'edge' ? (
                  <Cloud className="h-4 w-4 shrink-0 text-sky-300" />
                ) : (
                  <Cpu className="h-4 w-4 shrink-0 text-emerald-300" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-semibold text-slate-200">
                    {provider === 'edge'
                      ? t('Edge TTS سحابي مجاني — بدون مفتاح', 'Free Edge TTS — no key required')
                      : t('Piper TTS محلي — ONNX يعمل على المعالج', 'Local Piper TTS — CPU ONNX voices')}
                  </p>
                  <p className="truncate text-[9px] text-slate-500">
                    {provider === 'edge'
                      ? t('توقيتات كلمات أصلية للترجمة المتزامنة', 'Native word boundaries for synced captions')
                      : t('يُحمَّل الصوت في ~/.zoedit-studio/voices عند أول استخدام', 'Models download to ~/.zoedit-studio/voices on first use')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRefreshVoices({ refresh: true })}
                  disabled={disabled || loadingVoices}
                  title={t('تحديث الأصوات', 'Refresh voices')}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#0B0E14] p-2 text-slate-300 hover:border-sky-400/40 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {loadingVoices ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            )}

            <div className="space-y-2 rounded-xl border border-white/8 bg-[#0B0E14] p-2.5">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
                  style={{ insetInlineStart: 10 }}
                />
                <input
                  type="search"
                  value={filters.search}
                  disabled={disabled}
                  onChange={(event) => updateFilters({ search: event.target.value })}
                  placeholder={
                    provider === 'elevenlabs'
                      ? t(
                          'البحث عن صوت أو إضافته عبر Voice ID…',
                          'Search a voice or add it via Voice ID…',
                        )
                      : t('البحث بالاسم أو اللغة أو اللكنة…', 'Search by name, language or accent…')
                  }
                  aria-label={t('بحث الأصوات', 'Search voices')}
                  className="w-full rounded-lg border border-white/10 bg-[#10141D] py-1.5 pe-2.5 ps-8 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[9px]">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    updateFilters({ followVideoLanguage: true, language: 'all' })
                  }
                  className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                    filters.followVideoLanguage
                      ? 'border-sky-400/40 bg-sky-500/15 text-sky-100'
                      : 'border-white/10 bg-[#10141D] text-slate-400 hover:text-slate-200'
                  }`}
                  title={t('مطابقة لغة الفيديو تلقائياً', 'Automatically match the video language')}
                >
                  <Search className="h-2.5 w-2.5" />
                  {t('لغة الفيديو', 'Video language')}: {videoLanguageName}
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    updateFilters({
                      language: 'all',
                      accent: 'all',
                      gender: 'all',
                      search: '',
                      followVideoLanguage: true,
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-[#10141D] px-1.5 py-1 font-semibold text-slate-400 transition-colors hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  <FilterX className="h-2.5 w-2.5" />
                  {t('مسح الفلاتر', 'Clear filters')}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <label className="sr-only" htmlFor="voice-language-filter">
                  {t('اللغة', 'Language')}
                </label>
                <select
                  id="voice-language-filter"
                  value={effectiveLanguage}
                  disabled={disabled}
                  onChange={(event) =>
                    updateFilters({
                      language: event.target.value,
                      followVideoLanguage: false,
                    })
                  }
                  className="w-full rounded-lg border border-white/10 bg-[#10141D] px-2 py-1.5 text-[10px] text-slate-200 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <option value="all">{t('اللغة: الكل', 'Language: All')}</option>
                  {languageOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <label className="sr-only" htmlFor="voice-accent-filter">
                  {t('اللكنة', 'Accent')}
                </label>
                <select
                  id="voice-accent-filter"
                  value={filters.accent}
                  disabled={disabled}
                  onChange={(event) => updateFilters({ accent: event.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-[#10141D] px-2 py-1.5 text-[10px] text-slate-200 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <option value="all">{t('اللكنة: الكل', 'Accent: All')}</option>
                  {accentOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <label className="sr-only" htmlFor="voice-gender-filter">
                  {t('نوع الجنس', 'Gender')}
                </label>
                <select
                  id="voice-gender-filter"
                  value={filters.gender}
                  disabled={disabled}
                  onChange={(event) =>
                    updateFilters({
                      gender: event.target.value as VoiceFilterPreferences['gender'],
                    })
                  }
                  className="w-full rounded-lg border border-white/10 bg-[#10141D] px-2 py-1.5 text-[10px] text-slate-200 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <option value="all">{t('نوع الجنس: الكل', 'Gender: All')}</option>
                  <option value="male">{t('ذكر', 'Male')}</option>
                  <option value="female">{t('أنثى', 'Female')}</option>
                  <option value="neutral">{t('محايد', 'Neutral')}</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <select
                  value={voiceover.voiceId}
                  disabled={disabled || optionVoices.length === 0}
                  onChange={(event) =>
                    onChangeVoiceover({ ...voiceover, voiceId: event.target.value })
                  }
                  aria-label={t('اختيار الصوت', 'Select voice')}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#10141D] px-2.5 py-1.5 text-[11px] text-slate-100 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {optionVoices.length === 0 ? (
                    <option value={voiceover.voiceId}>{voiceover.voiceId}</option>
                  ) : (
                    optionVoices.map((voice) => (
                      <option key={voice.voice_id} value={voice.voice_id} className="bg-[#10141D]">
                        {voice.name} · {genderLabel(voice.gender, t)}
                        {voice.accent && voice.accent !== 'Standard' ? ` · ${voice.accent}` : ''}
                        {provider === 'piper' && voice.installed ? t(' · مثبّت', ' · installed') : ''}
                      </option>
                    ))
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => void handlePlayPreview()}
                  disabled={disabled || !selectedVoice}
                  title={
                    playingVoiceId
                      ? t('إيقاف المعاينة', 'Stop preview')
                      : t('معاينة الصوت', 'Preview voice')
                  }
                  className={`inline-flex shrink-0 items-center justify-center rounded-lg border p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer ${
                    playingVoiceId
                      ? 'border-sky-400 bg-sky-500 text-slate-950'
                      : 'border-white/10 bg-[#10141D] text-slate-300 hover:border-sky-400/40'
                  }`}
                >
                  {playingVoiceId ? (
                    <Square className="h-3.5 w-3.5 fill-current" />
                  ) : (
                    <Play className="h-3.5 w-3.5 fill-current" />
                  )}
                </button>
              </div>

              {provider === 'elevenlabs' ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    dir="ltr"
                    value={directVoiceId}
                    disabled={disabled}
                    onChange={(event) => setDirectVoiceId(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void handleFetchVoiceById();
                      }
                    }}
                    placeholder={t(
                      'إضافة عبر Voice ID · مثال: 21m00Tcm4TlvDq8ikWAM',
                      'Add via Voice ID · e.g. 21m00Tcm4TlvDq8ikWAM'
                    )}
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#10141D] px-2.5 py-1.5 font-mono text-[10px] text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                  />
                  <button
                    type="button"
                    onClick={() => void handleFetchVoiceById()}
                    disabled={disabled || fetchingVoiceId || !directVoiceId.trim()}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-sky-400/40 bg-sky-500/15 px-2.5 py-1.5 text-[10px] font-bold text-sky-100 hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    {fetchingVoiceId ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                    {t('تطبيق', 'Apply')}
                  </button>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] text-slate-500">
                <span className="font-mono tabular-nums">
                  {t(
                    `${filteredVoices.length} من ${voices.length} صوت`,
                    `${filteredVoices.length} of ${voices.length} voices`
                  )}
                </span>
                {previewNotice ? (
                  <span className="text-amber-300">{previewNotice}</span>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-white/8 bg-[#0B0E14] px-2.5 py-2">
              <button
                type="button"
                onClick={() => setAdvancedOpen((prev) => !prev)}
                aria-expanded={advancedOpen}
                className="flex w-full items-center justify-between gap-2 text-[10px] font-semibold text-slate-300 transition-colors hover:text-slate-100 cursor-pointer"
              >
                <span className="inline-flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-sky-300" />
                  {t('إعدادات متقدمة', 'Advanced settings')}
                </span>
                {advancedOpen ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>

              {advancedOpen ? (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {provider === 'elevenlabs' ? (
                    <>
                      <RangeControl
                        label={t('الاستقرار', 'Stability')}
                        value={voiceover.stability}
                        min={0}
                        max={1}
                        step={0.05}
                        disabled={disabled}
                        onChange={(stability) =>
                          onChangeVoiceover({ ...voiceover, stability })
                        }
                      />
                      <RangeControl
                        label={t('التشابه', 'Similarity boost')}
                        value={voiceover.similarityBoost}
                        min={0}
                        max={1}
                        step={0.05}
                        disabled={disabled}
                        onChange={(similarityBoost) =>
                          onChangeVoiceover({ ...voiceover, similarityBoost })
                        }
                      />
                      <RangeControl
                        label={t('الأسلوب / المبالغة', 'Style / Exaggeration')}
                        value={voiceover.style}
                        min={0}
                        max={1}
                        step={0.05}
                        disabled={disabled}
                        onChange={(style) => onChangeVoiceover({ ...voiceover, style })}
                      />
                    </>
                  ) : null}
                  <RangeControl
                    label={t('السرعة', 'Speed')}
                    value={voiceover.speed}
                    min={0.7}
                    max={1.2}
                    step={0.05}
                    disabled={disabled}
                    onChange={(speed) => onChangeVoiceover({ ...voiceover, speed })}
                  />
                  {provider === 'elevenlabs' ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-[#10141D] px-2.5 py-1.5 sm:col-span-2">
                      <span className="text-[10px] font-semibold text-slate-400">
                        {t('تعزيز المتحدث', 'Speaker boost')}
                      </span>
                      <ToggleSwitch
                        checked={voiceover.speakerBoost}
                        onChange={() =>
                          onChangeVoiceover({
                            ...voiceover,
                            speakerBoost: !voiceover.speakerBoost,
                          })
                        }
                        disabled={disabled}
                        label={t('تبديل تعزيز المتحدث', 'Toggle speaker boost')}
                        tone="sky"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {captionsActive ? (
          <CaptionControls
            brandKit={brandKit}
            captionStyle={captionStyle}
            onChangeCaptionStyle={onChangeCaptionStyle}
            captionColors={captionColors}
            onChangeCaptionColors={onChangeCaptionColors}
            captionBottomOffset={captionBottomOffset}
            onChangeCaptionBottomOffset={onChangeCaptionBottomOffset}
            disabled={disabled}
          />
        ) : null}

        <div className="space-y-2 rounded-xl border border-white/8 bg-[#0B0E14] px-2.5 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              role="switch"
              disabled={disabled}
              aria-checked={sfx.enabled}
              onClick={() => onChangeSfx({ ...sfx, enabled: !sfx.enabled })}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
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
              disabled={!sfx.enabled || disabled}
              onChange={(event) => onChangeSfx({ ...sfx, volume: Number(event.target.value) })}
              className="min-w-[120px] flex-1 accent-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t('مستوى المؤثرات الصوتية', 'SFX volume')}
            />
            <span className="w-10 shrink-0 text-end font-mono text-[10px] text-slate-400 tabular-nums">
              {Math.round(sfx.volume * 100)}%
            </span>
            <button
              type="button"
              onClick={() => void playSfxVolumeTest()}
              disabled={disabled}
              title={t('تجربة مستوى المؤثرات الصوتية', 'Test the current SFX volume')}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[9px] font-bold text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <Play className="h-2.5 w-2.5 fill-current" />
              {t('تجربة الصوت', 'Test Volume')}
            </button>
          </div>

          <p className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <Type className="h-3 w-3" />
            {captionsLocked
              ? t(
                  'الترجمة النصية مقفلة تلقائياً عند إيقاف التعليق الصوتي.',
                  'Captions are locked off while voiceover is disabled.'
                )
              : t(
                  'تُمرَّر الترجمة النصية إلى المشهد النهائي وبرومبت OpenCode.',
                  'Captions are passed to the final composition and the OpenCode prompt.'
                )}
          </p>
        </div>
      </div>
    </section>
  );
}
