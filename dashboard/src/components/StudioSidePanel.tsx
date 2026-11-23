import { useState } from 'react';
import { BrainCircuit, Film, Mic, Palette } from 'lucide-react';
import { useI18n } from '../i18n';
import type {
  AiModelOption,
  AiProviderId,
  AiProviderOption,
  AiScriptModelId,
  BrandKit,
  CaptionAnimationStyle,
  CaptionColors,
  ElevenLabsVoice,
  SfxConfig,
  VoiceoverConfig,
} from '../types/studio';
import { AgentDirectorPanel } from './AgentDirectorPanel';
import { AudioPanel } from './AudioPanel';
import { ColorsPanel } from './ColorsPanel';
import { DirectorScriptPanel } from './DirectorScriptPanel';
import { MediaLibraryPanel } from './MediaLibraryPanel';

type SideTabId = 'director' | 'audio' | 'colors' | 'exports';

interface StudioSidePanelProps {
  providers: AiProviderOption[];
  models: AiModelOption[];
  selectedAiProvider: AiProviderId;
  onChangeAiProvider: (provider: AiProviderId) => void;
  selectedAiModel: AiScriptModelId;
  onChangeAiModel: (model: AiScriptModelId) => void;
  onOpenSettings: () => void;
  masterPrompt: string;
  onChangeMasterPrompt: (value: string) => void;
  brandKit: BrandKit;
  onChangeBrandKit: (next: BrandKit) => void;
  voiceover: VoiceoverConfig;
  onChangeVoiceover: (next: VoiceoverConfig) => void;
  voices: ElevenLabsVoice[];
  loadingVoices: boolean;
  onRefreshVoices: () => void;
  onVoiceImported: (voice: ElevenLabsVoice) => void;
  sfx: SfxConfig;
  onChangeSfx: (next: SfxConfig) => void;
  captionsEnabled: boolean;
  onChangeCaptionsEnabled: (value: boolean) => void;
  captionStyle: CaptionAnimationStyle;
  onChangeCaptionStyle: (value: CaptionAnimationStyle) => void;
  captionColors: CaptionColors;
  onChangeCaptionColors: (next: CaptionColors) => void;
  captionBottomOffset: number;
  onChangeCaptionBottomOffset: (value: number) => void;
  voiceoverScript: string;
  onChangeVoiceoverScript: (value: string) => void;
  onGenerateVoiceoverScript: (options?: { rephrase?: boolean }) => void;
  isGeneratingScript?: boolean;
  scriptError?: string | null;
  scriptNotice?: string | null;
  apiBaseUrl: string;
  sessionToken: string;
  historyKey: number;
  disabled?: boolean;
}

export function StudioSidePanel({
  providers,
  models,
  selectedAiProvider,
  onChangeAiProvider,
  selectedAiModel,
  onChangeAiModel,
  onOpenSettings,
  masterPrompt,
  onChangeMasterPrompt,
  brandKit,
  onChangeBrandKit,
  voiceover,
  onChangeVoiceover,
  voices,
  loadingVoices,
  onRefreshVoices,
  onVoiceImported,
  sfx,
  onChangeSfx,
  captionsEnabled,
  onChangeCaptionsEnabled,
  captionStyle,
  onChangeCaptionStyle,
  captionColors,
  onChangeCaptionColors,
  captionBottomOffset,
  onChangeCaptionBottomOffset,
  voiceoverScript,
  onChangeVoiceoverScript,
  onGenerateVoiceoverScript,
  isGeneratingScript = false,
  scriptError = null,
  scriptNotice = null,
  apiBaseUrl,
  sessionToken,
  historyKey,
  disabled = false,
}: StudioSidePanelProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<SideTabId>('director');

  const tabs: Array<{ id: SideTabId; label: string; icon: typeof Mic }> = [
    { id: 'director', label: t('المخرج والعقل', 'Director & brain'), icon: BrainCircuit },
    { id: 'audio', label: t('الصوت', 'Audio'), icon: Mic },
    { id: 'colors', label: t('الألوان', 'Colors'), icon: Palette },
    { id: 'exports', label: t('المُصدّرات', 'Exports'), icon: Film },
  ];

  return (
    <div className="min-w-0 w-full max-w-full space-y-3">
      <div
        role="tablist"
        aria-label={t('أقسام لوحة التحكم', 'Control panel sections')}
        className="grid grid-cols-4 gap-0.5 rounded-xl border border-white/[0.08] bg-[#0B0E14] p-1"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px] font-semibold transition-colors cursor-pointer ${
                active
                  ? 'bg-sky-500/12 text-sky-100 ring-1 ring-inset ring-sky-400/30'
                  : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${active ? 'text-sky-300' : ''}`} />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'director' ? (
        <div className="space-y-3">
          <AgentDirectorPanel
            providers={providers}
            models={models}
            selectedAiProvider={selectedAiProvider}
            onChangeAiProvider={onChangeAiProvider}
            selectedAiModel={selectedAiModel}
            onChangeAiModel={onChangeAiModel}
            onOpenSettings={onOpenSettings}
            apiBaseUrl={apiBaseUrl}
            sessionToken={sessionToken}
            disabled={disabled}
          />
          <DirectorScriptPanel
            masterPrompt={masterPrompt}
            onChangeMasterPrompt={onChangeMasterPrompt}
            voiceoverScript={voiceoverScript}
            onChangeVoiceoverScript={onChangeVoiceoverScript}
            onGenerateVoiceoverScript={onGenerateVoiceoverScript}
            isGeneratingScript={isGeneratingScript}
            scriptError={scriptError}
            scriptNotice={scriptNotice}
            voiceoverEnabled={voiceover.enabled}
            disabled={disabled}
          />
        </div>
      ) : null}

      {activeTab === 'audio' ? (
        <AudioPanel
          voiceover={voiceover}
          onChangeVoiceover={onChangeVoiceover}
          voices={voices}
          loadingVoices={loadingVoices}
          onRefreshVoices={onRefreshVoices}
          onVoiceImported={onVoiceImported}
          apiBaseUrl={apiBaseUrl}
          sessionToken={sessionToken}
          sfx={sfx}
          onChangeSfx={onChangeSfx}
          captionsEnabled={captionsEnabled}
          onChangeCaptionsEnabled={onChangeCaptionsEnabled}
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

      {activeTab === 'colors' ? (
        <ColorsPanel
          brandKit={brandKit}
          onChangeBrandKit={onChangeBrandKit}
          disabled={disabled}
        />
      ) : null}

      {activeTab === 'exports' ? (
        <MediaLibraryPanel
          apiBaseUrl={apiBaseUrl}
          sessionToken={sessionToken}
          refreshKey={historyKey}
        />
      ) : null}
    </div>
  );
}
