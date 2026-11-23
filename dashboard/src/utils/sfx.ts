export type SfxKind = 'whoosh' | 'pop' | 'click';

export type SfxCatalogId =
  | 'whoosh-soft'
  | 'whoosh-whip'
  | 'pop-soft'
  | 'click-subtle'
  | 'slide'
  | 'type-tick'
  | 'toggle-soft'
  | 'impact-soft';

export interface SfxDefinition {
  id: SfxCatalogId;
  file: string;
  labelAr: string;
  labelEn: string;
  durationSec: number;
}

export const SFX_CATALOG: SfxDefinition[] = [
  { id: 'whoosh-soft', file: 'whoosh-soft.wav', labelAr: 'Whoosh ناعم', labelEn: 'Soft Whoosh', durationSec: 0.16 },
  { id: 'whoosh-whip', file: 'whoosh-whip.wav', labelAr: 'Whoosh خفيف', labelEn: 'Light Whip Whoosh', durationSec: 0.18 },
  { id: 'pop-soft', file: 'pop-soft.wav', labelAr: 'Pop ناعم', labelEn: 'Soft Pop', durationSec: 0.14 },
  { id: 'click-subtle', file: 'click-subtle.wav', labelAr: 'نقر خفيف', labelEn: 'Subtle Click', durationSec: 0.07 },
  { id: 'slide', file: 'slide.wav', labelAr: 'انزلاق', labelEn: 'Slide', durationSec: 0.4 },
  { id: 'type-tick', file: 'type-tick.wav', labelAr: 'نقر كتابة', labelEn: 'Type Tick', durationSec: 0.05 },
  { id: 'toggle-soft', file: 'toggle-soft.wav', labelAr: 'تبديل ناعم', labelEn: 'Soft Toggle', durationSec: 0.62 },
  { id: 'impact-soft', file: 'impact-soft.wav', labelAr: 'ضربة خفيفة', labelEn: 'Soft Impact', durationSec: 0.2 },
];

export const LEGACY_SFX_FILES: Record<string, string> = {
  'whoosh-fast': 'whoosh-soft.wav',
  'whoosh-deep': 'whoosh-soft.wav',
  'pop-bubble': 'pop-soft.wav',
  'pop-sharp': 'click-subtle.wav',
  'typing-click': 'type-tick.wav',
  'alert-warning': 'toggle-soft.wav',
  'cash-register': 'cash-register.wav',
  'cinematic-hit': 'impact-soft.wav',
  'bass-drop': 'impact-soft.wav',
  'riser-build': 'slide.wav',
};

export const MAX_SCENE_SFX_VOLUME = 0.25;

export const SFX_AUTO_MATCH: Record<string, SfxCatalogId> = {
  'title-hero': 'impact-soft',
  'stat-number': 'pop-soft',
  'comparison-box': 'whoosh-soft',
  'bar-chart': 'click-subtle',
  'line-chart': 'slide',
  'circular-gauge': 'impact-soft',
  'step-timeline': 'type-tick',
  'notification-card': 'click-subtle',
  'warning-card': 'impact-soft',
  'editorial-quote': 'whoosh-soft',
  'bullet-list': 'pop-soft',
  'cta': 'click-subtle',
  custom: 'pop-soft',
  'generative-scene': 'whoosh-soft',
};

export function isSfxCatalogId(value: string | null | undefined): value is SfxCatalogId {
  return Boolean(
    value &&
      (SFX_CATALOG.some((sfx) => sfx.id === value) || value in LEGACY_SFX_FILES)
  );
}

export function autoMatchSfx(visualType: string | null | undefined): SfxCatalogId {
  return SFX_AUTO_MATCH[visualType || ''] || 'pop-soft';
}

export function getSfxUrl(selection: string | null | undefined): string | null {
  if (!selection || selection === 'none') return null;
  if (selection.startsWith('/sfx/')) return selection;
  if (selection.startsWith('sfx/')) return `/${selection}`;
  const definition = SFX_CATALOG.find((sfx) => sfx.id === selection);
  if (definition) return `/sfx/${definition.file}`;
  const legacyFile = LEGACY_SFX_FILES[selection];
  return legacyFile ? `/sfx/${legacyFile}` : null;
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
  audio.volume = Math.min(MAX_SCENE_SFX_VOLUME, Math.max(0.01, volume));
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
  const safeVol = Math.min(MAX_SCENE_SFX_VOLUME, Math.max(0.01, volume));

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

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(520, startTime);

  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.22 * safeVol, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

  osc.connect(gain);
  gain.connect(destination);
  osc.start(startTime);
  osc.stop(startTime + 0.09);
}

export function previewSfx(kind: SfxKind, volume: number) {
  const ctx = getAudioContext();
  if (!ctx) return;
  scheduleSfxOnContext(ctx, ctx.destination, kind, ctx.currentTime + 0.01, volume);
}
