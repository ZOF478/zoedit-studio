import { useEffect, useState } from 'react';
import {
  BookOpen,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  Server,
  Sparkles,
  X,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { ModelSearchSelect } from './ModelSearchSelect';
import type {
  AiModelOption,
  AiProviderId,
  AiProviderOption,
  AiScriptModelId,
  ApiSettingsStatus,
  SettingsSavePayload,
} from '../types/studio';

interface ApiSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  status: ApiSettingsStatus;
  providers: AiProviderOption[];
  models: AiModelOption[];
  selectedAiProvider: AiProviderId;
  onChangeAiProvider: (provider: AiProviderId) => void;
  selectedAiModel: AiScriptModelId;
  onChangeAiModel: (model: AiScriptModelId) => void;
  apiBaseUrl: string;
  sessionToken?: string;
  onChangeApiBaseUrl: (url: string) => void;
  onSaveAndSync: (settings: SettingsSavePayload) => Promise<void>;
  onOpenSetupGuide?: () => void;
}

function SecretField({
  id,
  label,
  value,
  onChange,
  placeholder,
  statusText,
  visible,
  onToggleVisible,
  hideLabel,
  showLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  statusText: string;
  visible: boolean;
  onToggleVisible: () => void;
  hideLabel: string;
  showLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <label htmlFor={id} className="font-semibold text-slate-200">
          {label}
        </label>
        <span className="truncate font-mono text-[10px] text-slate-400">{statusText}</span>
      </div>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-lg border border-white/10 bg-[#0B0E14] px-3.5 py-2.5 pl-10 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={visible ? hideLabel : showLabel}
          className="absolute inset-y-0 left-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function ApiSettingsDrawer({
  open,
  onClose,
  status,
  providers,
  models,
  selectedAiProvider,
  onChangeAiProvider,
  selectedAiModel,
  onChangeAiModel,
  apiBaseUrl,
  sessionToken = '',
  onChangeApiBaseUrl,
  onSaveAndSync,
  onOpenSetupGuide,
}: ApiSettingsDrawerProps) {
  const { t } = useI18n();
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [kieaiKey, setKieaiKey] = useState('');
  const [elevenlabsKey, setElevenlabsKey] = useState('');
  const [customProviderName, setCustomProviderName] = useState('');
  const [customProviderBaseUrl, setCustomProviderBaseUrl] = useState('');
  const [customProviderKey, setCustomProviderKey] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCustomProviderName((prev) => prev || status.customProviderName || '');
    setCustomProviderBaseUrl((prev) => prev || status.customProviderBaseUrl || '');
  }, [open, status.customProviderName, status.customProviderBaseUrl]);

  if (!open) return null;

  const toggleVisible = (key: string) =>
    setVisibleKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  const activeProvider = providers.find((provider) => provider.id === selectedAiProvider);
  const selectedModel = models.find((model) => model.id === selectedAiModel);
  const settingsFile = status.settingsFile || '~/.zoedit-studio/settings.json';
  const configuredLabel = (configured?: boolean, mask?: string) =>
    configured ? t(`مفعّل · ${mask || ''}`, `Active · ${mask || ''}`) : t('غير مضاف', 'Not set');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await onSaveAndSync({
        openrouterKey,
        deepseekKey,
        kieaiKey,
        elevenlabsKey,
        customProviderName,
        customProviderBaseUrl,
        customProviderKey,
        aiProvider: selectedAiProvider,
        aiModel: selectedAiModel,
      });
      setOpenrouterKey('');
      setDeepseekKey('');
      setKieaiKey('');
      setElevenlabsKey('');
      setCustomProviderKey('');
      setFeedback(
        t(
          'تم حفظ المفاتيح والتفضيلات في ملف الإعدادات المحلي ومزامنتها بنجاح.',
          'Keys and preferences were persisted to the local settings file.'
        )
      );
    } catch (err) {
      setFeedback(
        err instanceof Error
          ? err.message
          : t('تعذر مزامنة الإعدادات.', 'Could not sync settings.')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs">
      <div
        className="h-full w-full max-w-lg overflow-y-auto border-r border-white/10 bg-[#10141D] p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-settings-title"
      >
        <div className="flex items-center justify-between border-b border-white/8 pb-4">
          <div>
            <h2 id="api-settings-title" className="font-display text-lg font-bold text-slate-100">
              {t('إعدادات API والمزودين', 'API & provider settings')}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {t(
                'تُحفظ المفاتيح في ملف محلي دائم ولا تُكشف في المتصفح.',
                'Keys are persisted to a local file and never exposed to the browser.'
              )}
            </p>
            <p className="mt-1 font-mono text-[10px] text-slate-500" dir="ltr">
              {settingsFile}
            </p>
            {onOpenSetupGuide ? (
              <button
                type="button"
                onClick={onOpenSetupGuide}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-sky-200 transition-colors hover:bg-sky-500/20 cursor-pointer"
              >
                <BookOpen className="h-3.5 w-3.5" />
                {t('دليل تفعيل المفاتيح والنماذج', 'Open the API setup guide')}
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('إغلاق الإعدادات', 'Close settings')}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <section className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Sparkles className="h-3.5 w-3.5 text-sky-400" />
              <span>{t('مزود الذكاء الاصطناعي (AI Provider)', 'AI provider')}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {providers.map((provider) => {
                const active = provider.id === selectedAiProvider;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => onChangeAiProvider(provider.id)}
                    className={`rounded-lg border p-3 text-start transition-colors cursor-pointer ${
                      active
                        ? 'border-sky-400/70 bg-sky-500/10 text-slate-50'
                        : 'border-white/8 bg-[#0B0E14] text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{provider.label}</span>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          provider.configured ? 'bg-emerald-400' : 'bg-slate-600'
                        }`}
                      />
                    </div>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                      {provider.descriptionAr
                        ? t(provider.descriptionAr, provider.description)
                        : provider.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {status.opencode && (
            <section className="rounded-lg border border-white/8 bg-[#0B0E14] p-3 text-[10px] text-slate-400">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-200">
                <span>{t('تكامل OpenCode', 'OpenCode integration')}</span>
                <span
                  className={`rounded-full border px-2 py-0.5 ${
                    status.opencode.providers.length > 0
                      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-white/10 text-slate-400'
                  }`}
                >
                  {status.opencode.providers.length > 0
                    ? status.opencode.providers.join(', ')
                    : t('لا توجد مفاتيح مكتشفة', 'No detected providers')}
                </span>
              </div>
              <p className="mt-1.5 font-mono leading-relaxed" dir="ltr">
                {status.opencode.configPaths[0]} · auth: {status.opencode.authFound ? 'yes' : 'no'}
              </p>
            </section>
          )}

          <section className="space-y-2 border-t border-white/8 pt-5">
            <label htmlFor="ai-script-model" className="block text-xs font-semibold text-slate-200">
              {t('نموذج كتابة السكربت (AI Script Model)', 'AI script model')}
            </label>
            <ModelSearchSelect
              apiBaseUrl={apiBaseUrl}
              sessionToken={sessionToken}
              provider={selectedAiProvider}
              selectedModel={selectedAiModel}
              fallbackModels={models}
              onChangeModel={onChangeAiModel}
            />
            <p className="text-xs text-slate-400">
              {selectedModel
                ? selectedModel.noteAr
                  ? t(selectedModel.noteAr, selectedModel.note)
                  : selectedModel.note
                : activeProvider
                  ? activeProvider.descriptionAr
                    ? t(activeProvider.descriptionAr, activeProvider.description)
                    : activeProvider.description
                  : t('اختر المزود والنموذج المناسب.', 'Select a provider and model.')}
            </p>
          </section>

          <section className="space-y-3 border-t border-white/8 pt-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <KeyRound className="h-3.5 w-3.5 text-sky-400" />
              <span>{t('مفاتيح المزودين (Provider API Keys)', 'Provider API keys')}</span>
            </div>

            <SecretField
              id="openrouter-key"
              label="OpenRouter API key"
              value={openrouterKey}
              onChange={setOpenrouterKey}
              placeholder="sk-or-v1-..."
              statusText={configuredLabel(status.openrouterConfigured, status.openrouterMask)}
              visible={Boolean(visibleKeys.openrouter)}
              onToggleVisible={() => toggleVisible('openrouter')}
              hideLabel={t('إخفاء المفتاح', 'Hide key')}
              showLabel={t('إظهار المفتاح', 'Show key')}
            />
            <SecretField
              id="deepseek-key"
              label="DeepSeek API key"
              value={deepseekKey}
              onChange={setDeepseekKey}
              placeholder="sk-..."
              statusText={configuredLabel(status.deepseekConfigured, status.deepseekMask)}
              visible={Boolean(visibleKeys.deepseek)}
              onToggleVisible={() => toggleVisible('deepseek')}
              hideLabel={t('إخفاء المفتاح', 'Hide key')}
              showLabel={t('إظهار المفتاح', 'Show key')}
            />
            <SecretField
              id="kieai-key"
              label="Kie.ai API key"
              value={kieaiKey}
              onChange={setKieaiKey}
              placeholder="kie-..."
              statusText={configuredLabel(status.kieaiConfigured, status.kieaiMask)}
              visible={Boolean(visibleKeys.kieai)}
              onToggleVisible={() => toggleVisible('kieai')}
              hideLabel={t('إخفاء المفتاح', 'Hide key')}
              showLabel={t('إظهار المفتاح', 'Show key')}
            />
            <SecretField
              id="elevenlabs-key"
              label="ElevenLabs API key (optional — Edge/Piper need no key)"
              value={elevenlabsKey}
              onChange={setElevenlabsKey}
              placeholder="sk_..."
              statusText={configuredLabel(status.elevenlabsConfigured, status.elevenlabsMask)}
              visible={Boolean(visibleKeys.elevenlabs)}
              onToggleVisible={() => toggleVisible('elevenlabs')}
              hideLabel={t('إخفاء المفتاح', 'Hide key')}
              showLabel={t('إظهار المفتاح', 'Show key')}
            />

            <div className="space-y-2 rounded-lg border border-white/8 bg-[#0B0E14] p-3">
              <div className="text-[11px] font-semibold text-slate-200">
                {t('مزود مخصص (Custom Provider)', 'Custom provider')}
              </div>
              <input
                type="text"
                value={customProviderName}
                onChange={(e) => setCustomProviderName(e.target.value)}
                placeholder={t('اسم المزود', 'Provider name')}
                className="w-full rounded-lg border border-white/10 bg-[#10141D] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:outline-none"
              />
              <input
                type="text"
                dir="ltr"
                value={customProviderBaseUrl}
                onChange={(e) => setCustomProviderBaseUrl(e.target.value)}
                placeholder="https://api.example.com/v1"
                className="w-full rounded-lg border border-white/10 bg-[#10141D] px-3 py-2 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:outline-none"
              />
              <SecretField
                id="custom-key"
                label={t('مفتاح المزود المخصص', 'Custom provider key')}
                value={customProviderKey}
                onChange={setCustomProviderKey}
                placeholder="sk-..."
                statusText={configuredLabel(status.customConfigured, status.customProviderMask)}
                visible={Boolean(visibleKeys.custom)}
                onToggleVisible={() => toggleVisible('custom')}
                hideLabel={t('إخفاء المفتاح', 'Hide key')}
                showLabel={t('إظهار المفتاح', 'Show key')}
              />
            </div>
          </section>

          <section className="space-y-2.5 border-t border-white/8 pt-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Server className="h-3.5 w-3.5 text-sky-400" />
              <span>{t('مسار خادم التصيير (SSE Endpoint)', 'Render server endpoint (SSE)')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChangeApiBaseUrl('/api')}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  apiBaseUrl === '/api'
                    ? 'border-sky-400/60 bg-sky-500/12 text-sky-200'
                    : 'border-white/10 bg-[#0B0E14] text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('الخادم المدمج (/api)', 'Embedded server (/api)')}
              </button>
              <button
                type="button"
                onClick={() => onChangeApiBaseUrl('http://localhost:4789/api')}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  apiBaseUrl === 'http://localhost:4789/api'
                    ? 'border-sky-400/60 bg-sky-500/12 text-sky-200'
                    : 'border-white/10 bg-[#0B0E14] text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('المحلي (4789)', 'Local (4789)')}
              </button>
            </div>
            <input
              type="text"
              dir="ltr"
              value={apiBaseUrl}
              onChange={(e) => onChangeApiBaseUrl(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0B0E14] px-3 py-2 font-mono text-xs text-slate-300 focus:border-sky-400 focus:outline-none"
            />
          </section>

          {feedback && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-200">
              <Check className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{feedback}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span>{t('حفظ ومزامنة (Save & Sync)', 'Save & sync')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
