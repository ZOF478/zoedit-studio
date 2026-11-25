export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return getNotificationPermission();
  }
}

export function showDesktopNotification(title: string, body: string, tag = 'zoedit-render'): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;
  try {
    const notification = new Notification(title, {
      body,
      tag,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      silent: true,
    });
    window.setTimeout(() => notification.close(), 12000);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx) sharedCtx = new AudioCtx();
  if (sharedCtx.state === 'suspended') void sharedCtx.resume();
  return sharedCtx;
}

export function primeCompletionAudio(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
}

export function playCompletionChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime + 0.03;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.001, now);
  master.gain.exponentialRampToValueAtTime(0.24, now + 0.08);
  master.gain.exponentialRampToValueAtTime(0.001, now + 1.9);
  master.connect(ctx.destination);

  const notes = [
    { freq: 523.25, start: 0, length: 0.7 },
    { freq: 659.25, start: 0.12, length: 0.75 },
    { freq: 783.99, start: 0.24, length: 0.85 },
    { freq: 1046.5, start: 0.4, length: 1.25 },
  ];

  notes.forEach((note) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(note.freq, now + note.start);
    gain.gain.setValueAtTime(0.001, now + note.start);
    gain.gain.exponentialRampToValueAtTime(0.5, now + note.start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + note.start + note.length);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now + note.start);
    osc.stop(now + note.start + note.length + 0.05);
  });

  const shimmer = ctx.createOscillator();
  const shimmerGain = ctx.createGain();
  shimmer.type = 'triangle';
  shimmer.frequency.setValueAtTime(1567.98, now + 0.46);
  shimmerGain.gain.setValueAtTime(0.001, now + 0.46);
  shimmerGain.gain.exponentialRampToValueAtTime(0.12, now + 0.52);
  shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 2.1);
  shimmer.connect(shimmerGain);
  shimmerGain.connect(master);
  shimmer.start(now + 0.46);
  shimmer.stop(now + 2.2);
}
