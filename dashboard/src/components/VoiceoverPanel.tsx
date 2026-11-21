import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Mic,
  Play,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Square,
} from 'lucide-react';
import { useI18n } from '../i18n';
import type {
  ElevenLabsModel,
  ElevenLabsVoice,
  VoiceoverConfig,
} from '../types/studio';

interface VoiceoverPanelProps {
  config: VoiceoverConfig;
  onChangeConfig: (next: VoiceoverConfig) => void;
  models: ElevenLabsModel[];
  voices: ElevenLabsVoice[];
  modelsSource: 'live' | 'catalog';
  voicesSource: 'live' | 'catalog';
  loadingCatalog: boolean;
  onRefreshCatalog: () => void;
  onVoiceImported: (voice: ElevenLabsVoice) => void;
  apiBaseUrl: string;
  sessionToken: string;
}

const VOICES_PER_PAGE = 6;

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  const { isRtl } = useI18n();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
        checked ? 'bg-sky-500' : 'bg-slate-700'
      }`}
    >
      <span
        className="absolute top-1 h-4 w-4 rounded-full bg-white transition-all"
        style={isRtl ? { right: checked ? 22 : 2 } : { left: checked ? 22 : 2 }}
      />
    </button>
  );
}

export function VoiceoverPanel({
  config,
  onChangeConfig,
  models,
  voices,
  modelsSource,
  voicesSource,
  loadingCatalog,
  onRefreshCatalog,
  onVoiceImported,
  apiBaseUrl,
  sessionToken,
}: VoiceoverPanelProps) {
  const { t, lang } = useI18n();
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [accentFilter, setAccentFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [toneFilter, setToneFilter] = useState('all');
  const [voicePage, setVoicePage] = useState(1);
  const [directVoiceId, setDirectVoiceId] = useState('');
  const [fetchingVoiceId, setFetchingVoiceId] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const selectedModel = models.find((m) => m.model_id === config.modelId) || models[0];

  const languageOptions = useMemo(
    () => Array.from(new Set(voices.map((v) => v.language || 'Other'))).sort(),
    [voices]
  );
  const accentOptions = useMemo(
    () => Array.from(new Set(voices.map((v) => v.accent).filter(Boolean))).sort(),
    [voices]
  );
  const genderOptions = useMemo(
    () => Array.from(new Set(voices.map((v) => v.gender).filter(Boolean))).sort(),
    [voices]
  );
  const toneOptions = useMemo(
    () => Array.from(new Set(voices.map((v) => v.tone).filter(Boolean))) as string[],
    [voices]
  );

  const filteredVoices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return voices.filter((voice) => {
      if (languageFilter !== 'all' && (voice.language || 'Other') !== languageFilter) return false;
      if (accentFilter !== 'all' && voice.accent !== accentFilter) return false;
      if (genderFilter !== 'all' && voice.gender !== genderFilter) return false;
      if (toneFilter !== 'all' && (voice.tone || '') !== toneFilter) return false;
      if (!query) return true;
      const haystack = [
        voice.name,
        voice.gender,
        voice.language,
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
  }, [voices, searchQuery, languageFilter, accentFilter, genderFilter, toneFilter]);

  useEffect(() => {
    setVoicePage(1);
  }, [searchQuery, languageFilter, accentFilter, genderFilter, toneFilter, voices.length]);

  const pageCount = Math.max(1, Math.ceil(filteredVoices.length / VOICES_PER_PAGE));
  const currentPage = Math.min(voicePage, pageCount);
  const pagedVoices = filteredVoices.slice(
    (currentPage - 1) * VOICES_PER_PAGE,
    currentPage * VOICES_PER_PAGE
  );

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    languageFilter !== 'all' ||
    accentFilter !== 'all' ||
    genderFilter !== 'all' ||
    toneFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setLanguageFilter('all');
    setAccentFilter('all');
    setGenderFilter('all');
    setToneFilter('all');
  };

  const handleFetchVoiceById = async () => {
    const voiceId = directVoiceId.trim();
    if (!voiceId) return;
    setFetchingVoiceId(true);
    setPreviewNotice(null);
    try {
      const resp = await fetch(
        `${apiBaseUrl}/elevenlabs/voices/${encodeURIComponent(voiceId)}`,
        {
          headers: sessionToken ? { 'x-zof-session': sessionToken } : {},
        }
      );
      const data = (await resp.json()) as {
        voice?: ElevenLabsVoice;
        error?: string;
      };
      if (!resp.ok || !data.voice) {
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

  const handlePlayVoicePreview = async (voice: ElevenLabsVoice) => {
    if (playingVoiceId === voice.voice_id) {
      stopPreview();
      return;
    }
    stopPreview();
    setPreviewNotice(null);
    setPlayingVoiceId(voice.voice_id);

    if (voice.preview_url) {
      const audio = new Audio(voice.preview_url);
      audioRef.current = audio;
      audio.onended = () => setPlayingVoiceId(null);
      audio.onerror = () => setPlayingVoiceId(null);
      try {
        await audio.play();
        return;
      } catch {
        // Fallback to TTS endpoint
      }
    }

    try {
      const resp = await fetch(`${apiBaseUrl}/elevenlabs/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-zof-session': sessionToken } : {}),
        },
        body: JSON.stringify({
          text: t(
            `مرحباً، أنا ${voice.name.split('—')[0].trim()}، وهذا اختبار لجودة التعليق الصوتي في استوديو زوف.`,
            `Hi, I'm ${voice.name.split('—')[0].trim()}, and this is a voice quality test for Zof Studio.`
          ),
          voiceId: voice.voice_id,
          modelId: config.modelId,
          stability: config.stability,
          similarityBoost: config.similarityBoost,
        }),
      });
      const data = (await resp.json()) as {
        audioDataUrl?: string | null;
        notice?: string;
      };

      if (data.audioDataUrl) {
        const audio = new Audio(data.audioDataUrl);
        audioRef.current = audio;
        audio.onended = () => setPlayingVoiceId(null);
        audio.onerror = () => setPlayingVoiceId(null);
        await audio.play();
        return;
      }

      if (data.notice) setPreviewNotice(data.notice);
    } catch {
      // Fallback to browser synthesis
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        t(
          'مرحباً بكم في استوديو زوف لإنتاج الفيديو بالذكاء الاصطناعي.',
          'Welcome to Zof Studio for AI-powered video production.'
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

  return (
    <section
      id="voiceover-studio"
      className="min-w-0 space-y-3 rounded-xl border border-white/8 bg-[#10141D] p-3.5"
    >
      {/* Header + Master Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#151B27] text-sky-400">
            <Mic className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-display text-xs font-bold text-slate-100">
              {t('استوديو ElevenLabs', 'ElevenLabs voice studio')}
            </h2>
            <p className="truncate text-[10px] text-slate-400">
              {voicesSource === 'live'
                ? t('متصل بالحساب الحي', 'Live account sync')
                : t('وضع المكتبة الافتراضية', 'Default catalog mode')}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onRefreshCatalog}
            disabled={loadingCatalog}
            aria-label={t('تحديث القائمة', 'Refresh catalog')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0B0E14] px-2.5 py-1.5 text-[10px] text-slate-300 hover:border-sky-400/40 hover:text-slate-100 transition-colors cursor-pointer"
          >
            {loadingCatalog ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{t('تحديث', 'Refresh')}</span>
          </button>

          <ToggleSwitch
            checked={config.enabled}
            onChange={() => onChangeConfig({ ...config, enabled: !config.enabled })}
            label={t('تبديل التعليق الصوتي', 'Toggle voiceover')}
          />
        </div>
      </div>

      {!config.enabled ? (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3">
          <p className="text-xs font-bold text-amber-200">
            {t('الوضع الصامت مفعّل', 'Silent mode is active')}
          </p>
          <p className="mt-1 break-words text-[10px] leading-relaxed text-amber-100/90">
            {t(
              'لن يتم توليد صوت أو استهلاك رصيد ElevenLabs (0 حرف). تبقى المؤثرات الصوتية (Foley) فعالة.',
              'No voice will be generated and 0 ElevenLabs characters will be used. Foley SFX stay active.'
            )}
          </p>
        </div>
      ) : (
      <div className="min-w-0 space-y-3">
        {/* Model Version Dropdown + Stability/Similarity Sliders */}
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="el-model-select" className="font-semibold text-slate-200">
                {t('إصدار نموذج الصوت (Model Version)', 'Model version')}
              </label>
              <span className="text-slate-400">
                {modelsSource === 'live' ? t('مزامنة مباشرة', 'Live sync') : t('النماذج القياسية', 'Standard models')}
              </span>
            </div>
            <select
              id="el-model-select"
              value={config.modelId}
              onChange={(e) => onChangeConfig({ ...config, modelId: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-[#0B0E14] px-3.5 py-2.5 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
            >
              {models.map((model) => (
                <option key={model.model_id} value={model.model_id}>
                  {model.name} ({model.latencyBadge})
                </option>
              ))}
            </select>
            {selectedModel && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="text-sky-300 font-medium">{selectedModel.latencyBadge}</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-300 font-medium">{selectedModel.qualityBadge}</span>
                <span aria-hidden="true">·</span>
                <span>{selectedModel.description}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="space-y-2 rounded-lg border border-white/8 bg-[#0B0E14] p-3.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="el-stability" className="font-semibold text-slate-200">
                  {t('الاستقرار (Stability)', 'Stability')}
                </label>
                <span className="font-mono tabular-nums text-sky-300">
                  {config.stability.toFixed(2)}
                </span>
              </div>
              <input
                id="el-stability"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={config.stability}
                onChange={(e) =>
                  onChangeConfig({ ...config, stability: Number(e.target.value) })
                }
                className="w-full accent-sky-400 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                {t(
                  'قيم أعلى لنبرة ثابتة، وأقل لتعبير عاطفي أكبر.',
                  'Higher values give a steady tone; lower values add more emotion.'
                )}
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-white/8 bg-[#0B0E14] p-3.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="el-similarity" className="font-semibold text-slate-200">
                  {t('التشابه (Similarity)', 'Similarity')}
                </label>
                <span className="font-mono tabular-nums text-sky-300">
                  {config.similarityBoost.toFixed(2)}
                </span>
              </div>
              <input
                id="el-similarity"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={config.similarityBoost}
                onChange={(e) =>
                  onChangeConfig({ ...config, similarityBoost: Number(e.target.value) })
                }
                className="w-full accent-sky-400 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                {t(
                  'يحافظ على وضوح البصمة الصوتية الأصلية.',
                  'Preserves the clarity of the original voice fingerprint.'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="space-y-2.5 rounded-lg border border-white/8 bg-[#0B0E14] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <SlidersHorizontal className="h-3.5 w-3.5 text-sky-400" />
              <span>{t('بحث وتصفية الأصوات', 'Search & filter voices')}</span>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] font-medium text-sky-300 hover:text-sky-200 cursor-pointer"
              >
                {t('مسح الفلاتر', 'Clear filters')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="relative col-span-2">
              <Search className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" style={{ insetInlineStart: 10 }} />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('ابحث بالاسم أو النبرة...', 'Search by name or tone...')}
                aria-label={t('بحث الأصوات', 'Search voices')}
                className="w-full rounded-lg border border-white/10 bg-[#10141D] py-2 pe-2.5 ps-8 text-xs text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:outline-none"
              />
            </div>

            <label className="sr-only" htmlFor="voice-language-filter">
              {t('فلتر اللغة', 'Language filter')}
            </label>
            <select
              id="voice-language-filter"
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#10141D] px-2.5 py-2 text-xs text-slate-200 focus:border-sky-400 focus:outline-none"
            >
              <option value="all">{t('كل اللغات', 'All languages')}</option>
              {languageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="voice-accent-filter">
              {t('فلتر اللكنة', 'Accent filter')}
            </label>
            <select
              id="voice-accent-filter"
              value={accentFilter}
              onChange={(e) => setAccentFilter(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#10141D] px-2.5 py-2 text-xs text-slate-200 focus:border-sky-400 focus:outline-none"
            >
              <option value="all">{t('كل اللكنات', 'All accents')}</option>
              {accentOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="voice-gender-filter">
              {t('فلتر الجنس', 'Gender filter')}
            </label>
            <select
              id="voice-gender-filter"
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#10141D] px-2.5 py-2 text-xs text-slate-200 focus:border-sky-400 focus:outline-none"
            >
              <option value="all">{t('كل الأجناس', 'All genders')}</option>
              {genderOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="voice-tone-filter">
              {t('فلتر النبرة', 'Tone filter')}
            </label>
            <select
              id="voice-tone-filter"
              value={toneFilter}
              onChange={(e) => setToneFilter(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#10141D] px-2.5 py-2 text-xs text-slate-200 focus:border-sky-400 focus:outline-none"
            >
              <option value="all">{t('كل النبرات', 'All tones')}</option>
              {toneOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 border-t border-white/8 pt-2.5 sm:flex-row">
            <div className="flex flex-1 items-center gap-2">
              <input
                type="text"
                dir="ltr"
                value={directVoiceId}
                onChange={(e) => setDirectVoiceId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleFetchVoiceById();
                  }
                }}
                placeholder={t('Direct Voice ID · مثال: 21m00Tcm4TlvDq8ikWAM', 'Direct Voice ID · e.g. 21m00Tcm4TlvDq8ikWAM')}
                className="w-full rounded-lg border border-white/10 bg-[#10141D] px-3 py-2 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void handleFetchVoiceById()}
                disabled={fetchingVoiceId || !directVoiceId.trim()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-100 hover:bg-sky-500/25 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
              >
                {fetchingVoiceId ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span>{t('جلب الصوت', 'Fetch voice')}</span>
              </button>
            </div>
            <span className="self-center text-[10px] text-slate-500">
              {t(
                'ألصق أي Voice ID من ElevenLabs لإضافته فوراً.',
                'Paste any ElevenLabs Voice ID to add it instantly.'
              )}
            </span>
          </div>
        </div>

        {/* Voice Character Selector Grid */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200">
              {t(
                `اختيار المعلق الصوتي (${filteredVoices.length} من ${voices.length})`,
                `Choose a narrator (${filteredVoices.length} of ${voices.length})`
              )}
            </h3>
            {previewNotice && (
              <span className="text-[11px] text-amber-300">{previewNotice}</span>
            )}
          </div>

          {filteredVoices.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/12 bg-[#0B0E14] px-4 py-8 text-center text-xs text-slate-400">
              {t('لا توجد أصوات مطابقة للفلاتر الحالية.', 'No voices match the current filters.')}
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 gap-2">
              {pagedVoices.map((voice) => {
                const selected = config.voiceId === voice.voice_id;
                const isPlaying = playingVoiceId === voice.voice_id;
                return (
                  <div
                    key={voice.voice_id}
                    onClick={() => onChangeConfig({ ...config, voiceId: voice.voice_id })}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onChangeConfig({ ...config, voiceId: voice.voice_id });
                      }
                    }}
                    className={`flex items-start justify-between gap-3 rounded-lg border p-3.5 text-start transition-colors cursor-pointer ${
                      selected
                        ? 'border-sky-400/70 bg-sky-500/10'
                        : 'border-white/8 bg-[#0B0E14] hover:border-white/20'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="truncate text-sm font-semibold text-slate-100">
                        {voice.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                        <span>{voice.gender}</span>
                        <span aria-hidden="true">·</span>
                        <span>{voice.language || 'Other'}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{voice.accent}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {voice.tone && (
                          <span className="inline-flex rounded-full border border-sky-400/20 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-200">
                            {voice.tone}
                          </span>
                        )}
                        {voice.source === 'library' && (
                          <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                            {t('مكتبة', 'Library')}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-label={
                        isPlaying
                          ? t(`إيقاف معاينة ${voice.name}`, `Stop preview of ${voice.name}`)
                          : t(`تشغيل معاينة ${voice.name}`, `Play preview of ${voice.name}`)
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        void handlePlayVoicePreview(voice);
                      }}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                        isPlaying
                          ? 'border-sky-400 bg-sky-500 text-slate-950'
                          : 'border-white/12 bg-[#141923] text-slate-200 hover:border-sky-400/60'
                      }`}
                    >
                      {isPlaying ? (
                        <Square className="h-3.5 w-3.5 fill-current" />
                      ) : (
                        <Play className="h-3.5 w-3.5 fill-current" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-[#0B0E14] px-3 py-2">
              <button
                type="button"
                onClick={() => setVoicePage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-300 hover:border-sky-400/40 hover:text-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>{t('السابق', 'Previous')}</span>
              </button>
              <span className="font-mono text-[11px] tabular-nums text-slate-400">
                {t(
                  `صفحة ${currentPage} من ${pageCount} · ${filteredVoices.length} صوت`,
                  `Page ${currentPage} of ${pageCount} · ${filteredVoices.length} voices`
                )}
              </span>
              <button
                type="button"
                onClick={() => setVoicePage(Math.min(pageCount, currentPage + 1))}
                disabled={currentPage >= pageCount}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-300 hover:border-sky-400/40 hover:text-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <span>{t('التالي', 'Next')}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            </>
          )}
        </div>
      </div>
      )}
    </section>
  );
}
