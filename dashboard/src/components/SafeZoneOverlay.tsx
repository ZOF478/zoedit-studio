import {
  Bookmark,
  Camera,
  ChevronDown,
  Heart,
  MessageCircle,
  MoreVertical,
  Music2,
  Play,
  Plus,
  Search,
  Send,
  Share2,
  ThumbsDown,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '../i18n';

export type SafeZoneMode = 'none' | 'universal' | 'tiktok' | 'reels' | 'shorts';

export const SAFE_ZONE_MODES: ReadonlyArray<{
  id: SafeZoneMode;
  ar: string;
  en: string;
}> = [
  { id: 'none', ar: 'بدون إطار', en: 'No frame' },
  { id: 'universal', ar: 'منطقة الأمان الموحدة', en: 'Universal safe area' },
  { id: 'tiktok', ar: 'TikTok', en: 'TikTok' },
  { id: 'reels', ar: 'Instagram Reels', en: 'Instagram Reels' },
  { id: 'shorts', ar: 'YouTube Shorts', en: 'YouTube Shorts' },
];

interface SafeZoneSwitcherProps {
  mode: SafeZoneMode;
  onChange: (mode: SafeZoneMode) => void;
  disabled?: boolean;
}

export function SafeZoneSwitcher({ mode, onChange, disabled = false }: SafeZoneSwitcherProps) {
  const { t } = useI18n();

  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-fuchsia-400/25 bg-[#0B0E14] px-2 py-1 text-[11px] font-semibold text-slate-300">
      <span className="hidden text-slate-400 sm:inline">{t('إطار المنصة', 'Platform frame')}</span>
      <span className="relative inline-flex items-center">
        <select
          value={mode}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value as SafeZoneMode)}
          className="cursor-pointer appearance-none rounded-md border border-white/10 bg-[#141926] py-1 pe-6 ps-2 text-[11px] font-semibold text-slate-100 outline-none transition-colors hover:border-fuchsia-400/40 focus:border-fuchsia-400/60 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={t('إطار المنصة', 'Platform frame')}
        >
          {SAFE_ZONE_MODES.map((option) => (
            <option key={option.id} value={option.id} className="bg-[#141926] text-slate-100">
              {t(option.ar, option.en)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute end-1.5 h-3 w-3 text-slate-400" />
      </span>
    </label>
  );
}

interface SafeZoneOverlayProps {
  mode: SafeZoneMode;
  captionBottomOffset?: number;
}

export function SafeZoneOverlay({ mode, captionBottomOffset = 20 }: SafeZoneOverlayProps) {
  const { t, isRtl } = useI18n();

  if (mode === 'none') return null;

  const bottomZone = Math.min(40, Math.max(18, Math.round(captionBottomOffset)));

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 select-none overflow-hidden"
      dir="ltr"
    >
      {mode === 'universal' ? (
        <UniversalSafeZone t={t} bottomZone={bottomZone} />
      ) : mode === 'tiktok' ? (
        <TikTokHud t={t} isRtl={isRtl} />
      ) : mode === 'reels' ? (
        <ReelsHud t={t} isRtl={isRtl} />
      ) : (
        <ShortsHud t={t} isRtl={isRtl} />
      )}
    </div>
  );
}

type Translate = (ar: string, en: string) => string;

function ActionMetric({
  icon: Icon,
  label,
  tone = 'default',
}: {
  icon: LucideIcon;
  label: string;
  tone?: 'default' | 'accent';
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/35 backdrop-blur-[2px] ${
          tone === 'accent' ? 'text-[#FE2C55]' : 'text-white/95'
        }`}
      >
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </span>
      <span className="text-[8px] font-semibold tabular-nums text-white/90">{label}</span>
    </div>
  );
}

function Avatar({ square = false }: { square?: boolean }) {
  return (
    <div className={`relative h-7 w-7 border border-white/80 bg-gradient-to-br from-fuchsia-400 via-violet-500 to-sky-400 ${square ? 'rounded-lg' : 'rounded-full'}`}>
      <span className="absolute -bottom-1.5 left-1/2 flex h-3.5 w-3.5 -translate-x-1/2 items-center justify-center rounded-full bg-[#FE2C55] text-white">
        <Plus className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    </div>
  );
}

function MusicDisc() {
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-slate-700 to-black text-white/85">
      <Music2 className="h-3.5 w-3.5" />
    </div>
  );
}

function UniversalSafeZone({ t, bottomZone }: { t: Translate; bottomZone: number }) {
  return (
    <>
      <div className="absolute inset-x-0 top-0 h-[10%] border-b border-dashed border-amber-300/60 bg-gradient-to-b from-amber-300/20 to-transparent">
        <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[8px] font-bold uppercase tracking-wide text-amber-100/90">
          {t('منطقة العنوان الآمنة', 'Safe title zone')}
        </span>
      </div>

      <div className="absolute bottom-0 right-0 top-0 w-[14%] border-l border-dashed border-sky-300/60 bg-gradient-to-l from-sky-400/18 to-transparent">
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[7px] font-bold uppercase tracking-wide text-sky-100/80 [writing-mode:vertical-rl]">
          {t('أزرار التفاعل', 'Action rail')}
        </span>
      </div>

      <div
        className="absolute inset-x-0 bottom-0 border-t border-dashed border-amber-300/60 bg-gradient-to-t from-amber-400/18 to-transparent"
        style={{ height: `${bottomZone}%` }}
      >
        <span className="absolute inset-x-0 bottom-1.5 text-center text-[8px] font-bold uppercase tracking-wide text-amber-100/90">
          {t(`منطقة الكابشن الآمنة · ${bottomZone}%`, `Caption safe zone · ${bottomZone}%`)}
        </span>
      </div>

      <div
        className="absolute rounded-sm border border-dashed border-emerald-300/70"
        style={{ top: '10%', bottom: `${bottomZone}%`, left: '4%', right: '14%' }}
      >
        <span className="absolute right-1 top-1 rounded bg-emerald-500/25 px-1.5 py-0.5 text-[7px] font-bold text-emerald-50">
          {t('منطقة الأمان', 'Safe area')}
        </span>
      </div>

      <div
        className="absolute inset-x-0 border-t border-emerald-300/50"
        style={{ bottom: `${bottomZone}%` }}
      >
        <span className="absolute right-1 -top-3.5 rounded bg-emerald-500/25 px-1 text-[7px] font-bold text-emerald-50 tabular-nums">
          {bottomZone}%
        </span>
      </div>
    </>
  );
}

function TikTokHud({ t, isRtl }: { t: Translate; isRtl: boolean }) {
  return (
    <>
      <div className="absolute inset-x-0 top-0 h-[13%] bg-gradient-to-b from-black/55 via-black/20 to-transparent">
        <div className="flex h-full items-start justify-center pt-[5%]">
          <div className="flex items-center gap-[8%] text-[9px] font-semibold text-white/75">
            <span>{t('متابعة', 'Following')}</span>
            <span className="relative font-bold text-white">
              {t('لك', 'For You')}
              <span className="absolute -bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-white" />
            </span>
          </div>
        </div>
        <Search className="absolute right-3 top-3 h-3.5 w-3.5 text-white/80" />
      </div>

      <div className="absolute bottom-[24%] right-[2.5%] flex flex-col items-center gap-3">
        <Avatar />
        <ActionMetric icon={Heart} label="128K" tone="accent" />
        <ActionMetric icon={MessageCircle} label="2.4K" />
        <ActionMetric icon={Bookmark} label="8.1K" />
        <ActionMetric icon={Share2} label="940" />
        <MusicDisc />
      </div>

      <div className="absolute inset-x-0 bottom-0 h-[24%] bg-gradient-to-t from-black/75 via-black/40 to-transparent">
        <div
          className="absolute inset-x-0 bottom-0 px-3 pb-2"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <div className="flex items-center gap-1 text-[9px] font-bold text-white">
            <span>@zof.studio</span>
            <span className="font-medium text-white/60">· {t('الآن', 'now')}</span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-white/90">
            {t('حوّل أفكارك إلى فيديو يلفت الأنظار', 'Turn your ideas into video that stands out')}{' '}
            <span className="font-semibold text-white">#zof #video</span>
          </p>
          <div className="mt-1 flex items-center gap-1 text-[8px] text-white/80">
            <Music2 className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{t('الصوت الأصلي · Zof Studio', 'Original sound · Zof Studio')}</span>
          </div>
          <div className="mt-1.5 h-0.5 rounded-full bg-white/25">
            <div className="h-full w-1/3 rounded-full bg-white/80" />
          </div>
        </div>
      </div>
    </>
  );
}

function ReelsHud({ t, isRtl }: { t: Translate; isRtl: boolean }) {
  return (
    <>
      <div className="absolute inset-x-0 top-0 flex h-[11%] items-start justify-between bg-gradient-to-b from-black/60 to-transparent px-3 pt-2">
        <div className="flex items-center gap-1 text-white">
          <Camera className="h-4 w-4" />
          <span className="text-[10px] font-bold">{t('ريلز', 'Reels')}</span>
        </div>
        <Search className="h-3.5 w-3.5 text-white/85" />
      </div>

      <div className="absolute bottom-[24%] right-[2.5%] flex flex-col items-center gap-3">
        <Avatar square />
        <ActionMetric icon={Heart} label="92K" tone="accent" />
        <ActionMetric icon={MessageCircle} label="1.2K" />
        <ActionMetric icon={Send} label="430" />
        <ActionMetric icon={Bookmark} label="6.7K" />
        <ActionMetric icon={MoreVertical} label="" />
        <MusicDisc />
      </div>

      <div className="absolute inset-x-0 bottom-0 h-[24%] bg-gradient-to-t from-black/75 via-black/35 to-transparent">
        <div
          className="absolute inset-x-0 bottom-0 px-3 pb-2"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-white">@zof.studio</span>
            <span className="rounded-md border border-white/50 px-1.5 py-0.5 text-[8px] font-bold text-white/90">
              {t('متابعة', 'Follow')}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-white/90">
            {t('حوّل أفكارك إلى فيديو يلفت الأنظار', 'Turn your ideas into video that stands out')}{' '}
            <span className="font-semibold text-white">#reels</span>
          </p>
          <div className="mt-1 flex items-center gap-1 text-[8px] text-white/80">
            <Music2 className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{t('مقطع صوتي أصلي · Zof Studio', 'Original audio · Zof Studio')}</span>
          </div>
          <div className="mt-1.5 h-0.5 rounded-full bg-white/25">
            <div className="h-full w-1/3 rounded-full bg-white/80" />
          </div>
        </div>
      </div>
    </>
  );
}

function ShortsHud({ t, isRtl }: { t: Translate; isRtl: boolean }) {
  return (
    <>
      <div className="absolute inset-x-0 top-0 flex h-[11%] items-start justify-between bg-gradient-to-b from-black/55 to-transparent px-3 pt-2">
        <div className="flex items-center gap-1">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#FF0033]">
            <Play className="h-3 w-3 fill-white text-white" />
          </span>
          <span className="text-[10px] font-bold text-white">Shorts</span>
        </div>
        <div className="flex items-center gap-2 text-white/85">
          <Search className="h-3.5 w-3.5" />
          <Camera className="h-3.5 w-3.5" />
          <MoreVertical className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="absolute bottom-[24%] right-[2.5%] flex flex-col items-center gap-3">
        <ActionMetric icon={Heart} label="310K" tone="accent" />
        <ActionMetric icon={ThumbsDown} label={t('لا يعجبني', 'Dislike')} />
        <ActionMetric icon={MessageCircle} label="5.2K" />
        <ActionMetric icon={Share2} label="1.8K" />
        <MusicDisc />
      </div>

      <div className="absolute inset-x-0 bottom-0 h-[24%] bg-gradient-to-t from-black/75 via-black/40 to-transparent">
        <div
          className="absolute inset-x-0 bottom-0 px-3 pb-2"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <div className="flex items-center gap-2">
            <span className="h-5 w-5 rounded-full bg-gradient-to-br from-fuchsia-400 via-violet-500 to-sky-400" />
            <span className="text-[9px] font-bold text-white">@zof.studio</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-[8px] font-black text-black">
              {t('اشترك', 'Subscribe')}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-[9px] leading-snug text-white/90">
            {t('حوّل أفكارك إلى فيديو يلفت الأنظار', 'Turn your ideas into video that stands out')}{' '}
            <span className="font-semibold text-white">#shorts</span>
          </p>
          <div className="mt-1 flex items-center gap-1 text-[8px] text-white/80">
            <Music2 className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{t('موسيقى · Zof Studio', 'Music · Zof Studio')}</span>
          </div>
          <div className="mt-1.5 h-0.5 rounded-full bg-white/25">
            <div className="h-full w-1/3 rounded-full bg-[#FF0033]" />
          </div>
        </div>
      </div>
    </>
  );
}
