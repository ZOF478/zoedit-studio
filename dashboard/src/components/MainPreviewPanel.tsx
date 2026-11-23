import { useState } from 'react';
import { MonitorPlay, Sparkles } from 'lucide-react';
import { useI18n } from '../i18n';
import type { BrandKit, CaptionAnimationStyle, CaptionColors } from '../types/studio';
import { LivePreviewStage } from './LivePreviewStage';
import { LiveSandboxStage } from './LiveSandboxStage';

type PreviewTabId = 'video' | 'sandbox';

interface MainPreviewPanelProps {
  videoUrl?: string | null;
  aspectRatio: string;
  fps: number;
  title?: string;
  isRendering?: boolean;
  statusText?: string | null;
  apiBaseUrl?: string;
  brandKit: BrandKit;
  captionStyle: CaptionAnimationStyle;
  captionColors: CaptionColors;
  captionBottomOffset: number;
  captionsEnabled: boolean;
}

export function MainPreviewPanel({
  videoUrl,
  aspectRatio,
  fps,
  title,
  isRendering = false,
  statusText,
  apiBaseUrl,
  brandKit,
  captionStyle,
  captionColors,
  captionBottomOffset,
  captionsEnabled,
}: MainPreviewPanelProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<PreviewTabId>('video');

  const tabs: Array<{ id: PreviewTabId; label: string; icon: typeof MonitorPlay }> = [
    {
      id: 'video',
      label: t('المعاينة الحية', 'Live preview'),
      icon: MonitorPlay,
    },
    {
      id: 'sandbox',
      label: t('مساحة المعاينة الحية', 'Live sandbox'),
      icon: Sparkles,
    },
  ];

  return (
    <section className="min-w-0 w-full max-w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0E121A] shadow-[0_24px_70px_-40px_rgba(56,189,248,0.55)]">
      <div
        role="tablist"
        aria-label={t('أقسام المعاينة المركزية', 'Central preview sections')}
        className="flex flex-wrap items-center gap-1 border-b border-white/8 bg-[#0B0E14] p-1.5"
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
              className={`inline-flex min-w-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                active
                  ? 'bg-sky-500/12 text-sky-100 ring-1 ring-inset ring-sky-400/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${active ? 'text-sky-300' : ''}`} />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className={activeTab === 'video' ? 'block' : 'hidden'}>
        <LivePreviewStage
          videoUrl={videoUrl}
          aspectRatio={aspectRatio}
          fps={fps}
          title={title}
          isRendering={isRendering}
          statusText={statusText}
          apiBaseUrl={apiBaseUrl}
          embedded
        />
      </div>
      <div className={activeTab === 'sandbox' ? 'block' : 'hidden'}>
        <LiveSandboxStage
          aspectRatio={aspectRatio}
          brandKit={brandKit}
          captionStyle={captionStyle}
          captionColors={captionColors}
          captionBottomOffset={captionBottomOffset}
          captionsEnabled={captionsEnabled}
          fps={fps}
          embedded
        />
      </div>
    </section>
  );
}
