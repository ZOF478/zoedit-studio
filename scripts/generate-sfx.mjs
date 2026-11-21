import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 48000;
const TWO_PI = Math.PI * 2;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SFX_DIR = path.join(ROOT, 'public', 'sfx');

const clamp = (value, min = -1, max = 1) => Math.min(max, Math.max(min, value));
const smoothstep = (value) => {
  const x = clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
};

const makeBuffers = (seconds) => {
  const length = Math.ceil(seconds * SAMPLE_RATE);
  return {
    left: new Float64Array(length),
    right: new Float64Array(length),
    length,
  };
};

const makeNoise = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return (((value ^ (value >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
};

const wave = (type, phase) => {
  const p = phase - Math.floor(phase);
  if (type === 'triangle') return 4 * Math.abs(p - 0.5) - 1;
  if (type === 'saw') return 2 * p - 1;
  if (type === 'square') return p < 0.5 ? 1 : -1;
  return Math.sin(TWO_PI * p);
};

const panGains = (pan) => {
  const angle = ((clamp(pan, -1, 1) + 1) * Math.PI) / 4;
  return [Math.cos(angle), Math.sin(angle)];
};

const envelope = (t, duration, attack, release) => {
  const inGain = attack > 0 ? smoothstep(t / attack) : 1;
  const outGain = release > 0 ? smoothstep((duration - t) / release) : 1;
  return inGain * outGain;
};

const addTone = (
  buffers,
  {
    start = 0,
    duration,
    type = 'sine',
    frequency,
    amplitude = 0.5,
    attack = 0.004,
    release = 0.04,
    pan = 0,
  },
) => {
  const begin = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const end = Math.min(buffers.length, Math.floor((start + duration) * SAMPLE_RATE));
  const [gainL, gainR] = panGains(pan);
  let phase = 0;

  for (let index = begin; index < end; index += 1) {
    const t = index / SAMPLE_RATE - start;
    const value = typeof frequency === 'function' ? frequency(t, duration) : frequency;
    phase += value / SAMPLE_RATE;
    const amp = typeof amplitude === 'function' ? amplitude(t, duration) : amplitude;
    const sample = wave(type, phase) * amp * envelope(t, duration, attack, release);
    buffers.left[index] += sample * gainL;
    buffers.right[index] += sample * gainR;
  }
};

const addBell = (
  buffers,
  {
    start = 0,
    baseFrequency,
    amplitude = 0.4,
    pan = 0,
    decay = 0.4,
    partials = [1, 2, 3, 4.2],
    gains = [1, 0.5, 0.3, 0.16],
  },
) => {
  partials.forEach((ratio, index) => {
    const partialDecay = decay / (1 + index * 0.55);
    addTone(buffers, {
      start,
      duration: Math.min(partialDecay * 5.5, 3.5),
      frequency: baseFrequency * ratio,
      amplitude: (t) => amplitude * (gains[index] ?? 0.1) * Math.exp(-t / partialDecay),
      attack: 0.0025,
      release: 0.01,
      pan,
    });
  });
};

class Biquad {
  constructor() {
    this.b0 = 1;
    this.b1 = 0;
    this.b2 = 0;
    this.a1 = 0;
    this.a2 = 0;
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;
  }

  set(type, frequency, q) {
    const f = clamp(frequency, 20, SAMPLE_RATE * 0.45);
    const w0 = (TWO_PI * f) / SAMPLE_RATE;
    const cos = Math.cos(w0);
    const sin = Math.sin(w0);
    const alpha = sin / (2 * Math.max(0.05, q));
    let b0 = 1;
    let b1 = 0;
    let b2 = 0;
    let a0 = 1;
    let a1 = 0;
    let a2 = 0;

    if (type === 'lowpass') {
      b0 = (1 - cos) / 2;
      b1 = 1 - cos;
      b2 = (1 - cos) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
    } else if (type === 'highpass') {
      b0 = (1 + cos) / 2;
      b1 = -(1 + cos);
      b2 = (1 + cos) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
    } else {
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
    }

    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
  }

  process(input) {
    const output =
      this.b0 * input +
      this.b1 * this.x1 +
      this.b2 * this.x2 -
      this.a1 * this.y1 -
      this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = input;
    this.y2 = this.y1;
    this.y1 = output;
    return output;
  }
}

const addNoiseSweep = (
  buffers,
  {
    start = 0,
    duration,
    gain = 0.4,
    type = 'bandpass',
    from = 400,
    to = 3000,
    q = 1,
    attack = 0.01,
    release = 0.12,
    pan = 0,
    spread = 0.15,
    seed = 11,
  },
) => {
  const begin = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const end = Math.min(buffers.length, Math.floor((start + duration) * SAMPLE_RATE));
  const noiseL = makeNoise(seed);
  const noiseR = makeNoise(seed + 97);
  const filterL = new Biquad();
  const filterR = new Biquad();
  const [gainL, gainR] = panGains(pan);
  const total = Math.max(1, end - begin);

  for (let index = begin; index < end; index += 1) {
    const progress = (index - begin) / total;
    if ((index - begin) % 24 === 0) {
      const frequency = from * Math.pow(Math.max(1, to) / Math.max(1, from), progress);
      filterL.set(type, frequency * (1 - spread * 0.25), q);
      filterR.set(type, frequency * (1 + spread * 0.25), q);
    }
    const t = index / SAMPLE_RATE - start;
    const env = envelope(t, duration, attack, release) * gain;
    buffers.left[index] += filterL.process(noiseL()) * env * gainL;
    buffers.right[index] += filterR.process(noiseR()) * env * gainR;
  }
};

const saturate = (buffers, drive = 1.6) => {
  const normalizer = Math.tanh(drive);
  for (let index = 0; index < buffers.length; index += 1) {
    buffers.left[index] = Math.tanh(buffers.left[index] * drive) / normalizer;
    buffers.right[index] = Math.tanh(buffers.right[index] * drive) / normalizer;
  }
};

const finalize = (buffers, { peak = 0.89, fadeIn = 0.003, fadeOut = 0.045 } = {}) => {
  let maximum = 0;
  for (let index = 0; index < buffers.length; index += 1) {
    maximum = Math.max(maximum, Math.abs(buffers.left[index]), Math.abs(buffers.right[index]));
  }
  const scale = maximum > 0 ? peak / maximum : 1;
  const inSamples = Math.max(1, Math.round(fadeIn * SAMPLE_RATE));
  const outSamples = Math.max(1, Math.round(fadeOut * SAMPLE_RATE));

  for (let index = 0; index < buffers.length; index += 1) {
    const inGain = smoothstep(index / inSamples);
    const outGain = smoothstep((buffers.length - 1 - index) / outSamples);
    buffers.left[index] = clamp(buffers.left[index] * scale * inGain * outGain);
    buffers.right[index] = clamp(buffers.right[index] * scale * inGain * outGain);
  }
};

const writeWav = (filename, buffers) => {
  const channels = 2;
  const bytesPerSample = 2;
  const dataSize = buffers.length * channels * bytesPerSample;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * channels * bytesPerSample, 28);
  header.writeUInt16LE(channels * bytesPerSample, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  const body = Buffer.alloc(dataSize);
  let offset = 0;
  for (let index = 0; index < buffers.length; index += 1) {
    body.writeInt16LE(Math.round(clamp(buffers.left[index]) * 32767), offset);
    body.writeInt16LE(Math.round(clamp(buffers.right[index]) * 32767), offset + 2);
    offset += 4;
  }

  fs.writeFileSync(path.join(SFX_DIR, `${filename}.wav`), Buffer.concat([header, body]));
};

const effects = {
  'whoosh-fast': () => {
    const buffers = makeBuffers(0.62);
    addNoiseSweep(buffers, { duration: 0.58, gain: 0.62, from: 320, to: 4200, q: 0.9, attack: 0.018, release: 0.22, seed: 21 });
    addNoiseSweep(buffers, { duration: 0.52, gain: 0.34, from: 5200, to: 700, q: 1.3, attack: 0.012, release: 0.24, pan: -0.18, seed: 53 });
    addNoiseSweep(buffers, { duration: 0.48, gain: 0.28, from: 3000, to: 480, q: 1.1, attack: 0.01, release: 0.2, pan: 0.22, seed: 79 });
    addTone(buffers, { duration: 0.5, frequency: (t) => 120 + 60 * Math.exp(-t * 7), amplitude: 0.08, attack: 0.03, release: 0.25 });
    return buffers;
  },

  'whoosh-deep': () => {
    const buffers = makeBuffers(1.25);
    addNoiseSweep(buffers, { duration: 1.18, gain: 0.48, from: 130, to: 950, q: 0.75, attack: 0.12, release: 0.55, seed: 101 });
    addNoiseSweep(buffers, { duration: 1.1, gain: 0.3, from: 1100, to: 150, q: 1.1, attack: 0.08, release: 0.5, pan: 0.16, seed: 137 });
    addTone(buffers, { duration: 1.1, frequency: (t) => 32 + 48 * Math.exp(-t * 2.6), amplitude: (t) => 0.34 * Math.exp(-t / 0.7), attack: 0.02, release: 0.35 });
    addTone(buffers, { duration: 0.8, frequency: (t) => 24 + 20 * Math.exp(-t * 4), amplitude: (t) => 0.18 * Math.exp(-t / 0.5), attack: 0.02, release: 0.3 });
    return buffers;
  },

  'pop-bubble': () => {
    const buffers = makeBuffers(0.34);
    addTone(buffers, {
      duration: 0.24,
      frequency: (t) => 170 * Math.pow(3.1, t / 0.24),
      amplitude: (t) => 0.55 * Math.exp(-t / 0.085),
      attack: 0.002,
      release: 0.03,
    });
    addTone(buffers, {
      duration: 0.15,
      frequency: (t) => 880 + 520 * (t / 0.15),
      amplitude: (t) => 0.12 * Math.exp(-t / 0.06),
      attack: 0.002,
      release: 0.02,
      pan: 0.1,
    });
    addNoiseSweep(buffers, { duration: 0.06, gain: 0.18, from: 1200, to: 380, q: 1.8, attack: 0.001, release: 0.025, seed: 211 });
    return buffers;
  },

  'pop-sharp': () => {
    const buffers = makeBuffers(0.24);
    addNoiseSweep(buffers, { duration: 0.055, gain: 0.52, type: 'highpass', from: 1400, to: 5200, q: 0.7, attack: 0.001, release: 0.02, seed: 307 });
    addTone(buffers, {
      duration: 0.16,
      frequency: (t) => 1300 * Math.pow(0.28, t / 0.16),
      amplitude: (t) => 0.5 * Math.exp(-t / 0.04),
      attack: 0.001,
      release: 0.015,
    });
    addTone(buffers, {
      duration: 0.1,
      frequency: 2460,
      amplitude: (t) => 0.16 * Math.exp(-t / 0.03),
      attack: 0.001,
      release: 0.01,
      pan: -0.12,
    });
    return buffers;
  },

  'ding-success': () => {
    const buffers = makeBuffers(1.55);
    addBell(buffers, { baseFrequency: 1046.5, start: 0, amplitude: 0.16, decay: 0.26, partials: [1, 2], gains: [1, 0.25], pan: -0.08 });
    addBell(buffers, { baseFrequency: 1318.51, start: 0.055, amplitude: 0.42, decay: 0.48, partials: [1, 2, 3, 4.2, 5.4], gains: [1, 0.42, 0.24, 0.12, 0.06] });
    addBell(buffers, { baseFrequency: 1760, start: 0.12, amplitude: 0.24, decay: 0.4, partials: [1, 2.03, 3.01], gains: [1, 0.3, 0.14], pan: 0.14 });
    addBell(buffers, { baseFrequency: 2637.02, start: 0.18, amplitude: 0.12, decay: 0.3, partials: [1, 2.02], gains: [1, 0.18], pan: 0.22 });
    return buffers;
  },

  'alert-warning': () => {
    const buffers = makeBuffers(1.15);
    [0, 0.26, 0.52].forEach((start, index) => {
      const frequency = index % 2 === 0 ? 880 : 660;
      addTone(buffers, { start, duration: 0.18, type: 'triangle', frequency, amplitude: 0.42, attack: 0.006, release: 0.03 });
      addTone(buffers, { start, duration: 0.18, type: 'sine', frequency: frequency * 2, amplitude: 0.16, attack: 0.006, release: 0.03, pan: 0.1 });
      addNoiseSweep(buffers, { start, duration: 0.045, gain: 0.14, type: 'highpass', from: 2200, to: 3800, q: 0.8, attack: 0.001, release: 0.02, seed: 401 + index });
    });
    addTone(buffers, { start: 0.78, duration: 0.22, type: 'triangle', frequency: 554.37, amplitude: 0.3, attack: 0.008, release: 0.05 });
    return buffers;
  },

  'cash-register': () => {
    const buffers = makeBuffers(1.4);
    addNoiseSweep(buffers, { duration: 0.045, gain: 0.38, type: 'highpass', from: 1800, to: 4600, q: 0.7, attack: 0.001, release: 0.018, seed: 501 });
    addTone(buffers, { duration: 0.22, frequency: (t) => 150 - 45 * (t / 0.22), amplitude: (t) => 0.34 * Math.exp(-t / 0.07), attack: 0.002, release: 0.03 });
    addBell(buffers, { baseFrequency: 2093, start: 0.035, amplitude: 0.32, decay: 0.34, partials: [1, 1.5, 2, 2.75], gains: [1, 0.35, 0.16, 0.08], pan: -0.12 });
    addBell(buffers, { baseFrequency: 2637, start: 0.09, amplitude: 0.3, decay: 0.42, partials: [1, 1.5, 2.02, 2.7], gains: [1, 0.32, 0.16, 0.08], pan: 0.15 });
    addNoiseSweep(buffers, { start: 0.32, duration: 0.16, gain: 0.22, type: 'bandpass', from: 1400, to: 5200, q: 0.9, attack: 0.002, release: 0.06, seed: 541 });
    addBell(buffers, { baseFrequency: 3136, start: 0.34, amplitude: 0.28, decay: 0.38, partials: [1, 1.48, 2.1], gains: [1, 0.32, 0.14] });
    addBell(buffers, { baseFrequency: 1568, start: 0.37, amplitude: 0.16, decay: 0.3, partials: [1, 2], gains: [1, 0.2], pan: -0.18 });
    return buffers;
  },

  'typing-click': () => {
    const buffers = makeBuffers(0.46);
    [0, 0.13, 0.26].forEach((start, index) => {
      addNoiseSweep(buffers, { start, duration: 0.035, gain: 0.46, type: 'highpass', from: 1300, to: 4200, q: 0.8, attack: 0.001, release: 0.014, pan: index % 2 === 0 ? -0.12 : 0.12, seed: 601 + index });
      addTone(buffers, { start, duration: 0.028, type: 'triangle', frequency: 1900 - index * 180, amplitude: (t) => 0.22 * Math.exp(-t / 0.008), attack: 0.001, release: 0.008 });
      addTone(buffers, { start, duration: 0.05, frequency: (t) => 180 - 60 * (t / 0.05), amplitude: (t) => 0.18 * Math.exp(-t / 0.018), attack: 0.001, release: 0.014, pan: index % 2 === 0 ? 0.1 : -0.1 });
    });
    return buffers;
  },

  'notification-chime': () => {
    const buffers = makeBuffers(1.85);
    addBell(buffers, { baseFrequency: 1046.5, start: 0, amplitude: 0.32, decay: 0.42, partials: [1, 2, 3.01, 4.16], gains: [1, 0.34, 0.16, 0.08], pan: -0.16 });
    addBell(buffers, { baseFrequency: 1318.51, start: 0.18, amplitude: 0.34, decay: 0.46, partials: [1, 2, 3.01, 4.16], gains: [1, 0.34, 0.16, 0.08] });
    addBell(buffers, { baseFrequency: 1567.98, start: 0.36, amplitude: 0.3, decay: 0.52, partials: [1, 2, 3.01, 4.16], gains: [1, 0.32, 0.15, 0.07], pan: 0.16 });
    addBell(buffers, { baseFrequency: 2093, start: 0.56, amplitude: 0.12, decay: 0.4, partials: [1, 2.01], gains: [1, 0.18] });
    return buffers;
  },

  'cinematic-hit': () => {
    const buffers = makeBuffers(2.2);
    addNoiseSweep(buffers, { duration: 0.09, gain: 0.42, type: 'highpass', from: 1600, to: 6000, q: 0.7, attack: 0.001, release: 0.04, seed: 701 });
    addNoiseSweep(buffers, { duration: 1.1, gain: 0.5, type: 'lowpass', from: 4200, to: 180, q: 0.8, attack: 0.003, release: 0.6, seed: 733 });
    addTone(buffers, { duration: 1.7, frequency: (t) => 34 + 86 * Math.exp(-t * 6.5), amplitude: (t) => 0.72 * Math.exp(-t / 0.6), attack: 0.003, release: 0.5 });
    addTone(buffers, { duration: 1.5, frequency: (t) => 55 + 55 * Math.exp(-t * 4), amplitude: (t) => 0.32 * Math.exp(-t / 0.5), attack: 0.004, release: 0.45, pan: -0.08 });
    addBell(buffers, { baseFrequency: 110, start: 0.01, amplitude: 0.3, decay: 0.7, partials: [1, 2, 3], gains: [1, 0.42, 0.18], pan: -0.2 });
    addBell(buffers, { baseFrequency: 164.81, start: 0.02, amplitude: 0.22, decay: 0.65, partials: [1, 2, 3], gains: [1, 0.36, 0.16], pan: 0.2 });
    addNoiseSweep(buffers, { start: 0.12, duration: 1.7, gain: 0.16, type: 'bandpass', from: 700, to: 260, q: 0.7, attack: 0.25, release: 0.8, seed: 769 });
    saturate(buffers, 1.18);
    return buffers;
  },

  'bass-drop': () => {
    const buffers = makeBuffers(1.85);
    const length = Math.ceil(1.7 * SAMPLE_RATE);
    let phase = 0;
    const noise = makeNoise(811);
    for (let index = 0; index < length; index += 1) {
      const t = index / SAMPLE_RATE;
      const frequency = 38 + 126 * Math.exp(-t * 3.1);
      phase += frequency / SAMPLE_RATE;
      const env = smoothstep(Math.min(1, t / 0.006)) * Math.exp(-t / 0.72);
      const sub = Math.sin(TWO_PI * phase) * 0.72 * env;
      const harmonic = Math.sin(TWO_PI * phase * 2) * 0.16 * env;
      const rumble = Math.sin(TWO_PI * phase * 0.5) * 0.14 * env;
      const sample = sub + harmonic + rumble + noise() * 0.008 * Math.exp(-t / 0.08);
      buffers.left[index] += sample;
      buffers.right[index] += sample;
    }
    addNoiseSweep(buffers, { duration: 0.5, gain: 0.24, type: 'lowpass', from: 2200, to: 110, q: 0.8, attack: 0.002, release: 0.3, seed: 823 });
    addTone(buffers, { duration: 0.14, frequency: (t) => 210 * Math.exp(-t * 15), amplitude: (t) => 0.18 * Math.exp(-t / 0.045), attack: 0.001, release: 0.05 });
    saturate(buffers, 1.7);
    return buffers;
  },

  'riser-build': () => {
    const buffers = makeBuffers(2.55);
    addNoiseSweep(buffers, { duration: 2.4, gain: 0.55, type: 'bandpass', from: 260, to: 9200, q: 0.8, attack: 1.65, release: 0.16, seed: 907 });
    addTone(buffers, { duration: 2.35, type: 'saw', frequency: (t) => 110 * Math.pow(8, t / 2.35), amplitude: (t) => 0.16 * Math.pow(t / 2.35, 1.5), attack: 0.3, release: 0.08 });
    addTone(buffers, { duration: 2.35, type: 'sine', frequency: (t) => 220 * Math.pow(8, t / 2.35), amplitude: (t) => 0.13 * Math.pow(t / 2.35, 1.6), attack: 0.4, release: 0.08, pan: 0.12 });
    addTone(buffers, { duration: 2.3, type: 'triangle', frequency: (t) => 55 * Math.pow(6, t / 2.3), amplitude: (t) => 0.2 * Math.pow(t / 2.3, 1.4), attack: 0.5, release: 0.06, pan: -0.12 });
    return buffers;
  },
};

fs.mkdirSync(SFX_DIR, { recursive: true });

Object.entries(effects).forEach(([name, create]) => {
  const buffers = create();
  finalize(buffers);
  writeWav(name, buffers);
  console.log(`${name}.wav ${(buffers.length / SAMPLE_RATE).toFixed(2)}s`);
});
