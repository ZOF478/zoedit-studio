export type SfxKind = 'whoosh' | 'pop' | 'ding';

export type SfxCatalogId =
  | 'whoosh-fast'
  | 'whoosh-deep'
  | 'pop-bubble'
  | 'pop-sharp'
  | 'ding-success'
  | 'alert-warning'
  | 'cash-register'
  | 'typing-click'
  | 'notification-chime'
  | 'cinematic-hit'
  | 'bass-drop'
  | 'riser-build';

export interface SfxDefinition {
  id: SfxCatalogId;
  file: string;
  labelAr: string;
  labelEn: string;
  durationSec: number;
}

export const SFX_CATALOG: SfxDefinition[] = [
  { id: 'whoosh-fast', file: 'whoosh-fast.wav', labelAr: 'Whoosh سريع', labelEn: 'Fast Whoosh', durationSec: 0.62 },
  { id: 'whoosh-deep', file: 'whoosh-deep.wav', labelAr: 'Whoosh عميق', labelEn: 'Deep Whoosh', durationSec: 1.25 },
  { id: 'pop-bubble', file: 'pop-bubble.wav', labelAr: 'Pop فقاعة', labelEn: 'Bubble Pop', durationSec: 0.34 },
  { id: 'pop-sharp', file: 'pop-sharp.wav', labelAr: 'Pop حاد', labelEn: 'Sharp Pop', durationSec: 0.24 },
  { id: 'ding-success', file: 'ding-success.wav', labelAr: 'نجاح (Ding)', labelEn: 'Success Ding', durationSec: 1.55 },
  { id: 'alert-warning', file: 'alert-warning.wav', labelAr: 'تحذير (Alert)', labelEn: 'Warning Alert', durationSec: 1.15 },
  { id: 'cash-register', file: 'cash-register.wav', labelAr: 'آلة كاش (Cha-Ching)', labelEn: 'Cash Register', durationSec: 1.4 },
  { id: 'typing-click', file: 'typing-click.wav', labelAr: 'نقر كتابة', labelEn: 'Typing Click', durationSec: 0.46 },
  { id: 'notification-chime', file: 'notification-chime.wav', labelAr: 'جرس إشعار', labelEn: 'Notification Chime', durationSec: 1.85 },
  { id: 'cinematic-hit', file: 'cinematic-hit.wav', labelAr: 'ضربة سينمائية', labelEn: 'Cinematic Hit', durationSec: 2.2 },
  { id: 'bass-drop', file: 'bass-drop.wav', labelAr: 'Bass Drop', labelEn: 'Bass Drop', durationSec: 1.85 },
  { id: 'riser-build', file: 'riser-build.wav', labelAr: 'Riser تصاعدي', labelEn: 'Riser Build', durationSec: 2.55 },
];

export const SFX_AUTO_MATCH: Record<string, SfxCatalogId> = {
  'title-hero': 'cinematic-hit',
  'stat-number': 'ding-success',
  'comparison-box': 'whoosh-fast',
  'bar-chart': 'pop-sharp',
  'line-chart': 'riser-build',
  'circular-gauge': 'bass-drop',
  'step-timeline': 'typing-click',
  'notification-card': 'notification-chime',
  'warning-card': 'alert-warning',
  'editorial-quote': 'whoosh-deep',
  'bullet-list': 'pop-bubble',
  'cta': 'cash-register',
  custom: 'pop-bubble',
  'generative-scene': 'whoosh-deep',
};

export function isSfxCatalogId(value: string | null | undefined): value is SfxCatalogId {
  return Boolean(value && SFX_CATALOG.some((sfx) => sfx.id === value));
}

export function autoMatchSfx(visualType: string | null | undefined): SfxCatalogId {
  return SFX_AUTO_MATCH[visualType || ''] || 'pop-bubble';
}

export function getSfxUrl(selection: string | null | undefined): string | null {
  if (!selection || selection === 'none') return null;
  if (selection.startsWith('/sfx/')) return selection;
  if (selection.startsWith('sfx/')) return `/${selection}`;
  const definition = SFX_CATALOG.find((sfx) => sfx.id === selection);
  return definition ? `/sfx/${definition.file}` : null;
}

export function resolveSceneSfxUrl(
  selection: string | null | undefined,
  visualType: string | null | undefined
): string | null {
  if (!selection || selection === 'none') return null;
  if (selection !== 'auto') return getSfxUrl(selection);
  return getSfxUrl(autoMatchSfx(visualType));
}

export function isCustomSfxSelection(selection: string | null | undefined): boolean {
  return Boolean(
    selection &&
      selection !== 'auto' &&
      selection !== 'none' &&
      !isSfxCatalogId(selection) &&
      getSfxUrl(selection)
  );
}

let previewAudio: HTMLAudioElement | null = null;

export function stopSfxPreview() {
  if (!previewAudio) return;
  previewAudio.pause();
  previewAudio.currentTime = 0;
  previewAudio = null;
}

export function playSfxPreview(
  selection: string | null | undefined,
  volume: number,
  onEnded?: () => void
): HTMLAudioElement | null {
  stopSfxPreview();
  const url = getSfxUrl(selection);
  if (!url || typeof Audio === 'undefined') return null;
  const audio = new Audio(url);
  audio.volume = Math.min(1, Math.max(0.01, volume));
  audio.onended = () => {
    if (previewAudio === audio) previewAudio = null;
    onEnded?.();
  };
  audio.onerror = () => {
    if (previewAudio === audio) previewAudio = null;
    onEnded?.();
  };
  previewAudio = audio;
  void audio.play().catch(() => {
    if (previewAudio === audio) previewAudio = null;
    onEnded?.();
  });
  return audio;
}

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

export function scheduleSfxOnContext(
  ctx: AudioContext,
  destination: AudioNode,
  kind: SfxKind,
  startTime: number,
  volume: number
) {
  const safeVol = Math.min(1, Math.max(0.01, volume));

  if (kind === 'whoosh') {
    const bufferSize = Math.floor(ctx.sampleRate * 0.28);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.8, startTime);
    filter.frequency.setValueAtTime(220, startTime);
    filter.frequency.exponentialRampToValueAtTime(1900, startTime + 0.14);
    filter.frequency.exponentialRampToValueAtTime(320, startTime + 0.28);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.28 * safeVol, startTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    whiteNoise.start(startTime);
    whiteNoise.stop(startTime + 0.29);
    return;
  }

  if (kind === 'pop') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, startTime);
    osc.frequency.exponentialRampToValueAtTime(620, startTime + 0.06);
    osc.frequency.exponentialRampToValueAtTime(180, startTime + 0.13);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.35 * safeVol, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.14);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(startTime);
    osc.stop(startTime + 0.15);
    return;
  }

  // Stat ding
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(880, startTime);
  osc.frequency.setValueAtTime(1318.5, startTime + 0.07);

  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.26 * safeVol, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.42);

  osc.connect(gain);
  gain.connect(destination);
  osc.start(startTime);
  osc.stop(startTime + 0.44);
}

export function previewSfx(kind: SfxKind, volume: number) {
  const ctx = getAudioContext();
  if (!ctx) return;
  scheduleSfxOnContext(ctx, ctx.destination, kind, ctx.currentTime + 0.01, volume);
}
