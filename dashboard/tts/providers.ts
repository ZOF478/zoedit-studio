import { execFile, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export type VoiceProviderId = 'edge' | 'piper' | 'elevenlabs';

export type TtsGender = 'male' | 'female' | 'neutral';

export interface TtsWordTiming {
  word: string;
  start: number;
  end: number;
}

export interface TtsVoiceRecord {
  voice_id: string;
  name: string;
  gender: TtsGender;
  language: string;
  locale: string;
  localeName: string;
  accent: string;
  region: string;
  tone: string;
  category: string;
  provider: VoiceProviderId;
  source: 'personal' | 'library' | 'edge' | 'piper';
  preview_url: string | null;
  description: string;
  quality?: string;
  languageCode?: string;
  nativeName?: string;
  numSpeakers?: number;
  modelFile?: string;
  configFile?: string;
  modelBytes?: number;
  modelMd5?: string;
  configMd5?: string;
  installed?: boolean;
}

export interface TtsSynthesisResult {
  buffer: Buffer;
  extension: 'mp3' | 'wav';
  wordTimings: TtsWordTiming[];
  billedCharacters: number;
}

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD_DIR = path.resolve(MODULE_DIR, '..');
const TTS_DATA_DIR = path.join(MODULE_DIR, 'data');

export const ZOEDIT_HOME_DIR = path.join(os.homedir(), '.zoedit-studio');
export const TTS_RUNTIME_DIR = path.join(ZOEDIT_HOME_DIR, 'tts-runtime');
export const VOICES_DIR = path.join(ZOEDIT_HOME_DIR, 'voices');
const EDGE_VOICE_CACHE_FILE = path.join(TTS_RUNTIME_DIR, 'edge-voices-cache.json');
const PIPER_RUNTIME_DIR = path.join(TTS_RUNTIME_DIR, 'piper-2023.11.14-2');
const PIPER_RELEASE_TAG = '2023.11.14-2';
const PIPER_RELEASE_BASE = `https://github.com/rhasspy/piper/releases/download/${PIPER_RELEASE_TAG}`;
const PIPER_VOICE_BASE =
  'https://huggingface.co/rhasspy/piper-voices/resolve/main';

const edgeVoiceCache = {
  voices: null as TtsVoiceRecord[] | null,
  fetchedAt: 0,
  source: 'catalog' as 'catalog' | 'live',
  warning: undefined as string | undefined,
};
const piperInstallPromises = new Map<string, Promise<string>>();
const piperModelPromises = new Map<string, Promise<string>>();
let piperBinaryPromise: Promise<string> | null = null;

function ensurePrivateDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  try {
    fs.chmodSync(dir, 0o700);
  } catch {
    // Best-effort on non-POSIX filesystems.
  }
}

function restrictPrivateFile(filePath: string, mode = 0o600): void {
  try {
    fs.chmodSync(filePath, mode);
  } catch {
    // Best-effort on non-POSIX filesystems.
  }
}

function writePrivateFile(filePath: string, data: string | Buffer): void {
  ensurePrivateDir(path.dirname(filePath));
  const tempPath = `${filePath}.${process.pid}.${crypto.randomBytes(3).toString('hex')}.tmp`;
  fs.writeFileSync(tempPath, data, { mode: 0o600 });
  restrictPrivateFile(tempPath);
  fs.renameSync(tempPath, filePath);
  restrictPrivateFile(filePath);
}

function readJsonFile(filePath: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  } catch {
    return null;
  }
}

function normalizeGender(raw: unknown): TtsGender {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (value === 'female' || value === 'woman' || value === 'f') return 'female';
  if (value === 'male' || value === 'man' || value === 'm') return 'male';
  return 'neutral';
}

function splitLocaleName(localeName: string): { language: string; region: string } {
  const match = localeName.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (match) return { language: match[1].trim(), region: match[2].trim() };
  return { language: localeName.trim(), region: '' };
}

function prettyEdgeName(shortName: string): string {
  const parts = shortName.split('-');
  let body = parts.length >= 3 ? parts.slice(2).join('-') : shortName;
  body = body.replace(/Neural$/i, '');
  body = body.replace(/(?<=[a-z0-9])(?=[A-Z])/g, ' ');
  body = body.replace(/(?<=[A-Z])(?=[A-Z][a-z])/g, ' ');
  return body.trim() || shortName;
}

function mapEdgeVoice(raw: Record<string, unknown>): TtsVoiceRecord | null {
  const shortName = typeof raw.ShortName === 'string' ? raw.ShortName.trim() : '';
  if (!shortName) return null;
  const localeName = typeof raw.LocaleName === 'string' ? raw.LocaleName : '';
  const { language, region } = splitLocaleName(localeName);
  const voiceTag =
    raw.VoiceTag && typeof raw.VoiceTag === 'object'
      ? (raw.VoiceTag as Record<string, unknown>)
      : {};
  const personalities = Array.isArray(voiceTag.VoicePersonalities)
    ? voiceTag.VoicePersonalities.filter(
        (item): item is string => typeof item === 'string' && Boolean(item.trim()),
      )
    : [];
  return {
    voice_id: shortName,
    name: prettyEdgeName(shortName),
    gender: normalizeGender(raw.Gender),
    language: language || 'Other',
    locale: typeof raw.Locale === 'string' ? raw.Locale : '',
    localeName,
    accent: region || 'Standard',
    region,
    tone: personalities.length > 0 ? personalities.join(', ') : 'Standard',
    category: 'Edge Neural',
    provider: 'edge',
    source: 'edge',
    preview_url: null,
    description: localeName,
  };
}

function loadStaticCatalog<T>(fileName: string): T[] {
  const parsed = readJsonFile(path.join(TTS_DATA_DIR, fileName));
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

function isPiperVoiceInstalled(voice: TtsVoiceRecord): boolean {
  if (!voice.voice_id) return false;
  const dir = path.join(VOICES_DIR, voice.voice_id);
  return (
    fs.existsSync(path.join(dir, `${voice.voice_id}.onnx`)) &&
    fs.existsSync(path.join(dir, `${voice.voice_id}.onnx.json`))
  );
}

export function getPiperCatalog(): TtsVoiceRecord[] {
  return loadStaticCatalog<TtsVoiceRecord>('piper-voices.json')
    .filter((voice) => Boolean(voice.voice_id))
    .map((voice) => ({
      ...voice,
      provider: 'piper' as const,
      source: 'piper' as const,
      installed: isPiperVoiceInstalled(voice),
      numSpeakers: Number.isFinite(Number(voice.numSpeakers))
        ? Number(voice.numSpeakers)
        : 1,
    }));
}

export async function listEdgeVoices(options?: {
  refresh?: boolean;
}): Promise<{
  voices: TtsVoiceRecord[];
  source: 'catalog' | 'live';
  warning?: string;
}> {
  const refresh = options?.refresh === true;
  const cacheFresh =
    edgeVoiceCache.voices !== null &&
    Date.now() - edgeVoiceCache.fetchedAt < 6 * 60 * 60 * 1000;
  if (cacheFresh && !refresh && edgeVoiceCache.voices) {
    return {
      voices: edgeVoiceCache.voices,
      source: edgeVoiceCache.source,
      warning: edgeVoiceCache.warning,
    };
  }

  if (!refresh && edgeVoiceCache.voices === null) {
    const cached = readJsonFile(EDGE_VOICE_CACHE_FILE);
    if (Array.isArray(cached) && cached.length > 0) {
      edgeVoiceCache.voices = cached
        .map((item) =>
          item && typeof item === 'object'
            ? mapEdgeVoice(item as Record<string, unknown>)
            : null,
        )
        .filter((item): item is TtsVoiceRecord => item !== null);
      edgeVoiceCache.fetchedAt = Date.now();
      edgeVoiceCache.source = 'live';
    }
  }

  if (edgeVoiceCache.voices !== null && !refresh) {
    return {
      voices: edgeVoiceCache.voices,
      source: edgeVoiceCache.source,
      warning: edgeVoiceCache.warning,
    };
  }

  if (!refresh) {
    const bundled = loadStaticCatalog<TtsVoiceRecord>('edge-voices.json').map(
      (voice) => ({
        ...voice,
        provider: 'edge' as const,
        source: 'edge' as const,
        installed: true,
      }),
    );
    edgeVoiceCache.voices = bundled;
    edgeVoiceCache.fetchedAt = Date.now();
    edgeVoiceCache.source = 'catalog';
    edgeVoiceCache.warning = undefined;
    return { voices: bundled, source: 'catalog' };
  }

  let tts: MsEdgeTTS | null = null;
  try {
    tts = new MsEdgeTTS({ connectionTimeoutMs: 12000, synthesisTimeoutMs: 0 });
    const liveVoices = await tts.getVoices();
    const mapped = liveVoices
      .map((voice) => mapEdgeVoice(voice as unknown as Record<string, unknown>))
      .filter((voice): voice is TtsVoiceRecord => voice !== null)
      .sort((a, b) =>
        `${a.language} ${a.accent} ${a.name}`.localeCompare(
          `${b.language} ${b.accent} ${b.name}`,
        ),
      );
    if (mapped.length > 0) {
      edgeVoiceCache.voices = mapped;
      edgeVoiceCache.fetchedAt = Date.now();
      edgeVoiceCache.source = 'live';
      edgeVoiceCache.warning = undefined;
      try {
        writePrivateFile(EDGE_VOICE_CACHE_FILE, JSON.stringify(mapped));
      } catch {
        // Caching the live catalog must never fail a request.
      }
      return { voices: mapped, source: 'live' };
    }
  } catch {
    // Fall through to the bundled snapshot.
  } finally {
    try {
      tts?.close();
    } catch {
      // Ignore socket close failures.
    }
  }

  const fallback = loadStaticCatalog<TtsVoiceRecord>('edge-voices.json').map(
    (voice) => ({
      ...voice,
      provider: 'edge' as const,
      source: 'edge' as const,
      installed: true,
    }),
  );
  edgeVoiceCache.voices = fallback;
  edgeVoiceCache.fetchedAt = Date.now();
  edgeVoiceCache.source = 'catalog';
  edgeVoiceCache.warning =
    'تعذر تحديث كتالوج Edge TTS المباشر — يتم استخدام النسخة المدمجة.';
  return {
    voices: fallback,
    source: 'catalog',
    warning: edgeVoiceCache.warning,
  };
}

function parseConcatenatedJson(raw: string): unknown[] {
  const objects: unknown[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        const chunk = raw.slice(start, index + 1);
        try {
          objects.push(JSON.parse(chunk));
        } catch {
          // Ignore malformed fragments.
        }
        start = -1;
      }
    }
  }
  return objects;
}

function edgeWordTimingsFromMetadata(metadataText: string): TtsWordTiming[] {
  const timings: TtsWordTiming[] = [];
  for (const payload of parseConcatenatedJson(metadataText)) {
    if (!payload || typeof payload !== 'object') continue;
    const metadata = (payload as { Metadata?: unknown }).Metadata;
    if (!Array.isArray(metadata)) continue;
    for (const item of metadata) {
      if (!item || typeof item !== 'object') continue;
      const record = item as Record<string, unknown>;
      if (record.Type !== 'WordBoundary') continue;
      const data =
        record.Data && typeof record.Data === 'object'
          ? (record.Data as Record<string, unknown>)
          : {};
      const text =
        data.text && typeof data.text === 'object'
          ? (data.text as Record<string, unknown>)
          : {};
      const word = typeof text.Text === 'string' ? text.Text.trim() : '';
      if (!word) continue;
      const offset = Number(data.Offset);
      const duration = Number(data.Duration);
      if (!Number.isFinite(offset)) continue;
      const start = Math.max(0, offset / 10_000_000);
      const end = start + Math.max(0.02, Number.isFinite(duration) ? duration / 10_000_000 : 0);
      timings.push({
        word,
        start: Number(start.toFixed(4)),
        end: Number(end.toFixed(4)),
      });
    }
  }
  return timings.sort((a, b) => a.start - b.start);
}

function sampleRateSpeed(value: number): number {
  return Math.min(1.2, Math.max(0.7, Number.isFinite(value) ? value : 1));
}

export async function synthesizeEdge(
  text: string,
  options: {
    voiceId: string;
    speed?: number;
  },
): Promise<TtsSynthesisResult> {
  const voiceId = options.voiceId.trim();
  if (!voiceId) throw new Error('Edge TTS voice is required.');
  const tts = new MsEdgeTTS({
    connectionTimeoutMs: 15000,
    synthesisTimeoutMs: 45000,
  });
  try {
    await tts.setMetadata(
      voiceId,
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
      {
        wordBoundaryEnabled: true,
        sentenceBoundaryEnabled: false,
      },
    );
    const { audioStream, metadataStream } = tts.toStream(text, {
      rate: sampleRateSpeed(options.speed ?? 1),
    });
    const audioChunks: Buffer[] = [];
    let metadataText = '';
    let settled = false;
    const audioDone = new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        if (error) reject(error);
        else resolve();
      };
      audioStream.on('data', (chunk: Buffer | string) => {
        audioChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      audioStream.on('end', () => finish());
      audioStream.on('close', () => finish());
      audioStream.on('error', (error: Error) => finish(error));
    });
    metadataStream?.on('data', (chunk: Buffer | string) => {
      metadataText += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;
    });
    metadataStream?.on('error', () => {
      // Word boundaries are optional; audio remains valid.
    });
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('Edge TTS synthesis timed out.')),
        60000,
      );
    });
    try {
      await Promise.race([audioDone, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
    const buffer = Buffer.concat(audioChunks);
    if (buffer.length === 0) throw new Error('Edge TTS returned empty audio.');
    return {
      buffer,
      extension: 'mp3',
      wordTimings: edgeWordTimingsFromMetadata(metadataText),
      billedCharacters: text.length,
    };
  } finally {
    try {
      tts.close();
    } catch {
      // Ignore socket close failures.
    }
  }
}

function piperPlatformArchive(platform: string, arch: string): string {
  if (platform === 'linux' && arch === 'x64') return 'piper_linux_x86_64.tar.gz';
  if (platform === 'linux' && arch === 'arm64') return 'piper_linux_aarch64.tar.gz';
  if (platform === 'linux' && arch === 'arm') return 'piper_linux_armv7l.tar.gz';
  if (platform === 'darwin' && arch === 'x64') return 'piper_macos_x64.tar.gz';
  if (platform === 'darwin' && arch === 'arm64') return 'piper_macos_aarch64.tar.gz';
  if (platform === 'win32' && arch === 'x64') return 'piper_windows_amd64.zip';
  throw new Error(
    `Piper TTS is not packaged for ${platform}/${arch}. Set PIPER_BIN and PIPER_MODEL_PATH manually.`,
  );
}

function runExtract(archivePath: string, destination: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = archivePath.endsWith('.zip')
      ? ['-xf', archivePath, '-C', destination]
      : ['-xzf', archivePath, '-C', destination];
    execFile('tar', args, { timeout: 120000 }, (error, _stdout, stderr) => {
      if (error) {
        reject(
          new Error(
            `Could not extract the Piper runtime: ${String(stderr || error.message).trim()}`,
          ),
        );
        return;
      }
      resolve();
    });
  });
}

function secureTree(root: string, executableFiles = new Set<string>()): void {
  ensurePrivateDir(root);
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) {
        ensurePrivateDir(target);
        stack.push(target);
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        restrictPrivateFile(target, executableFiles.has(entry.name) ? 0o700 : 0o600);
      }
    }
  }
}

async function downloadFile(
  url: string,
  destination: string,
  options?: { md5?: string; expectedBytes?: number; timeoutMs?: number },
): Promise<void> {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(options?.timeoutMs ?? 180000),
    headers: { 'User-Agent': 'zoedit-studio/tts' },
  });
  if (!response.ok) {
    throw new Error(`Download failed (HTTP ${response.status}) for ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (
    options?.expectedBytes &&
    Number.isFinite(options.expectedBytes) &&
    buffer.length !== options.expectedBytes
  ) {
    throw new Error(
      `Downloaded ${buffer.length} bytes but expected ${options.expectedBytes}.`,
    );
  }
  if (options?.md5) {
    const digest = crypto.createHash('md5').update(buffer).digest('hex');
    if (digest.toLowerCase() !== options.md5.toLowerCase()) {
      throw new Error('Downloaded file failed its MD5 integrity check.');
    }
  }
  writePrivateFile(destination, buffer);
}

async function ensurePiperBinary(): Promise<string> {
  const envBinary = process.env.PIPER_BIN?.trim();
  if (envBinary && fs.existsSync(envBinary)) return envBinary;
  if (piperBinaryPromise) return piperBinaryPromise;

  piperBinaryPromise = (async () => {
    const platform = process.platform;
    const arch = process.arch;
    const exe = platform === 'win32' ? 'piper.exe' : 'piper';
    const expectedBinary = path.join(PIPER_RUNTIME_DIR, 'piper', exe);
    if (fs.existsSync(expectedBinary)) {
      restrictPrivateFile(expectedBinary, 0o700);
      return expectedBinary;
    }

    const archiveName = piperPlatformArchive(platform, arch);
    ensurePrivateDir(TTS_RUNTIME_DIR);
    ensurePrivateDir(PIPER_RUNTIME_DIR);
    const archivePath = path.join(TTS_RUNTIME_DIR, archiveName);
    if (!fs.existsSync(archivePath)) {
      await downloadFile(`${PIPER_RELEASE_BASE}/${archiveName}`, archivePath, {
        timeoutMs: 300000,
      });
    }
    await runExtract(archivePath, PIPER_RUNTIME_DIR);
    if (!fs.existsSync(expectedBinary)) {
      throw new Error('Piper runtime extraction did not produce the piper binary.');
    }
    secureTree(
      path.join(PIPER_RUNTIME_DIR, 'piper'),
      new Set([exe, 'espeak-ng', 'piper_phonemize']),
    );
    restrictPrivateFile(expectedBinary, 0o700);
    try {
      fs.rmSync(archivePath, { force: true });
    } catch {
      // The archive is only a cache.
    }
    return expectedBinary;
  })().catch((error) => {
    piperBinaryPromise = null;
    throw error;
  });

  return piperBinaryPromise;
}

function findPiperVoice(voiceId: string): TtsVoiceRecord {
  const catalog = loadStaticCatalog<TtsVoiceRecord>('piper-voices.json');
  const voice = catalog.find((item) => item.voice_id === voiceId);
  if (!voice) {
    throw new Error(`Unknown Piper voice: ${voiceId}`);
  }
  if (!voice.modelFile || !voice.configFile) {
    throw new Error('Piper voice metadata is incomplete.');
  }
  return voice;
}

async function ensurePiperVoiceModel(voiceId: string): Promise<{
  modelPath: string;
  configPath: string;
  voice: TtsVoiceRecord;
}> {
  const voice = findPiperVoice(voiceId);
  const dir = path.join(VOICES_DIR, voice.voice_id);
  const modelPath = path.join(dir, `${voice.voice_id}.onnx`);
  const configPath = `${modelPath}.json`;
  const existing = piperModelPromises.get(voice.voice_id);
  if (existing) {
    const model = await existing;
    return { modelPath: model, configPath, voice };
  }

  const promise = (async () => {
    ensurePrivateDir(VOICES_DIR);
    ensurePrivateDir(dir);
    const needModel =
      !fs.existsSync(modelPath) ||
      (voice.modelBytes && fs.statSync(modelPath).size !== voice.modelBytes);
    const needConfig = !fs.existsSync(configPath);
    if (needModel) {
      await downloadFile(`${PIPER_VOICE_BASE}/${voice.modelFile}`, modelPath, {
        md5: voice.modelMd5,
        expectedBytes: voice.modelBytes,
        timeoutMs: 300000,
      });
    }
    if (needConfig) {
      await downloadFile(`${PIPER_VOICE_BASE}/${voice.configFile}`, configPath, {
        md5: voice.configMd5,
        timeoutMs: 60000,
      });
    }
    restrictPrivateFile(modelPath);
    restrictPrivateFile(configPath);
    return modelPath;
  })().catch((error) => {
    piperModelPromises.delete(voice.voice_id);
    throw error;
  });

  piperModelPromises.set(voice.voice_id, promise);
  const model = await promise;
  return { modelPath: model, configPath, voice };
}

function wavDurationSeconds(buffer: Buffer): number {
  if (buffer.length < 12) return 0;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') return 0;
  if (buffer.toString('ascii', 8, 12) !== 'WAVE') return 0;
  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  let dataBytes = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === 'fmt ' && body + 16 <= buffer.length) {
      channels = buffer.readUInt16LE(body + 2);
      sampleRate = buffer.readUInt32LE(body + 4);
      bitsPerSample = buffer.readUInt16LE(body + 14);
    } else if (id === 'data') {
      dataBytes = Math.min(size, Math.max(0, buffer.length - body));
      break;
    }
    offset = body + size + (size % 2);
  }
  if (!sampleRate || !channels || !bitsPerSample) {
    return Math.max(0, (buffer.length - 44) / (22050 * 2));
  }
  return dataBytes / (sampleRate * channels * (bitsPerSample / 8));
}

export function estimateWordTimings(
  text: string,
  durationSec: number,
): TtsWordTiming[] {
  const tokens = text.match(/\S+/g) ?? [];
  if (tokens.length === 0 || !Number.isFinite(durationSec) || durationSec <= 0) {
    return [];
  }
  const usable = Math.max(0.2, durationSec - 0.08);
  const weights = tokens.map((token) => {
    const letters = Array.from(token.replace(/[^\p{L}\p{N}]/gu, '')).length;
    const pause = /[.!?؟…]["')\]]*$/.test(token)
      ? 2.4
      : /[,،;:؛]["')\]]*$/.test(token)
        ? 1.5
        : 0.3;
    return 0.45 + letters * 0.55 + pause;
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0) || tokens.length;
  let cursor = 0.04;
  return tokens.map((word, index) => {
    const span = (weights[index] / total) * usable;
    const start = cursor;
    const end = Math.min(durationSec, cursor + span);
    cursor = end;
    return {
      word,
      start: Number(start.toFixed(4)),
      end: Number(Math.max(start + 0.02, end).toFixed(4)),
    };
  });
}

function writeTempFile(buffer: Buffer, extension: string): string {
  ensurePrivateDir(TTS_RUNTIME_DIR);
  const filePath = path.join(
    TTS_RUNTIME_DIR,
    `piper-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${extension}`,
  );
  fs.writeFileSync(filePath, buffer, { mode: 0o600 });
  restrictPrivateFile(filePath);
  return filePath;
}

export async function synthesizePiper(
  text: string,
  options: {
    voiceId: string;
    speed?: number;
    speakerId?: number;
  },
): Promise<TtsSynthesisResult> {
  const binary = await ensurePiperBinary();
  const { modelPath, configPath } = await ensurePiperVoiceModel(
    options.voiceId,
  );
  const piperRoot = path.dirname(binary);
  const outPath = writeTempFile(
    Buffer.alloc(0),
    'wav',
  );
  const speed = sampleRateSpeed(options.speed ?? 1);
  const lengthScale = Number((1 / speed).toFixed(4));
  const speaker = Number.isFinite(options.speakerId)
    ? Math.max(0, Math.trunc(Number(options.speakerId)))
    : 0;
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        binary,
        [
          '--model',
          modelPath,
          '--config',
          configPath,
          '--output_file',
          outPath,
          '--length_scale',
          String(lengthScale),
          '--speaker',
          String(speaker),
          '--quiet',
        ],
        {
          cwd: piperRoot,
          env: {
            ...process.env,
            PATH: `${piperRoot}${path.delimiter}${process.env.PATH || ''}`,
            LD_LIBRARY_PATH: `${piperRoot}${path.delimiter}${process.env.LD_LIBRARY_PATH || ''}`,
            DYLD_LIBRARY_PATH: `${piperRoot}${path.delimiter}${process.env.DYLD_LIBRARY_PATH || ''}`,
          },
          stdio: ['pipe', 'ignore', 'pipe'],
        },
      );
      let stderr = '';
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        if (error) reject(error);
        else resolve();
      };
      const timer = setTimeout(() => {
        try {
          child.kill('SIGKILL');
        } catch {
          // Ignore process kill failures.
        }
        finish(new Error('Piper TTS synthesis timed out.'));
      }, 180000);
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8').slice(-4000);
      });
      child.once('error', (error) => {
        clearTimeout(timer);
        finish(new Error(`Could not start Piper: ${error.message}`));
      });
      child.once('close', (code) => {
        clearTimeout(timer);
        if (code === 0) finish();
        else
          finish(
            new Error(
              `Piper exited with code ${code ?? 1}: ${stderr.trim().slice(-600)}`,
            ),
          );
      });
      child.stdin?.end(text);
    });
    const buffer = fs.readFileSync(outPath);
    if (buffer.length === 0) throw new Error('Piper returned empty audio.');
    const durationSec = wavDurationSeconds(buffer);
    return {
      buffer,
      extension: 'wav',
      wordTimings: estimateWordTimings(text, durationSec),
      billedCharacters: text.length,
    };
  } finally {
    try {
      fs.rmSync(outPath, { force: true });
    } catch {
      // Temp cleanup is best-effort.
    }
  }
}

function wordTimingsFromCharacterAlignment(
  characters: unknown,
  starts: unknown,
  ends: unknown,
): TtsWordTiming[] {
  if (!Array.isArray(characters) || !Array.isArray(starts) || !Array.isArray(ends)) {
    return [];
  }
  const timings: TtsWordTiming[] = [];
  let word = '';
  let wordStart = -1;
  let wordEnd = -1;
  for (let index = 0; index < characters.length; index += 1) {
    const char = typeof characters[index] === 'string' ? characters[index] : '';
    const start = Number(starts[index]);
    const end = Number(ends[index]);
    if (!char) continue;
    if (/\s/.test(char)) {
      if (word) {
        timings.push({
          word,
          start: Number(Math.max(0, wordStart).toFixed(4)),
          end: Number(Math.max(wordStart + 0.02, wordEnd).toFixed(4)),
        });
      }
      word = '';
      wordStart = -1;
      wordEnd = -1;
      continue;
    }
    word += char;
    if (wordStart < 0 && Number.isFinite(start)) wordStart = start;
    if (Number.isFinite(end)) wordEnd = end;
  }
  if (word) {
    timings.push({
      word,
      start: Number(Math.max(0, wordStart).toFixed(4)),
      end: Number(Math.max(wordStart + 0.02, wordEnd).toFixed(4)),
    });
  }
  return timings;
}

export async function synthesizeElevenLabsWithTimestamps(
  text: string,
  options: {
    apiKey: string;
    voiceId: string;
    modelId: string;
    stability: number;
    similarityBoost: number;
    style: number;
    speakerBoost: boolean;
    speed: number;
  },
): Promise<TtsSynthesisResult> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
      options.voiceId,
    )}/with-timestamps`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': options.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: options.modelId,
        voice_settings: {
          stability: options.stability,
          similarity_boost: options.similarityBoost,
          style: options.style,
          use_speaker_boost: options.speakerBoost,
          speed: options.speed,
        },
      }),
      signal: AbortSignal.timeout(60000),
    },
  );
  if (!response.ok) {
    throw new Error(`ElevenLabs timestamps request failed (HTTP ${response.status}).`);
  }
  const payload = (await response.json()) as {
    audio_base64?: unknown;
    alignment?: {
      characters?: unknown;
      character_start_times_seconds?: unknown;
      character_end_times_seconds?: unknown;
    };
    normalized_alignment?: {
      characters?: unknown;
      character_start_times_seconds?: unknown;
      character_end_times_seconds?: unknown;
    };
  };
  const audioBase64 =
    typeof payload.audio_base64 === 'string' ? payload.audio_base64 : '';
  if (!audioBase64) throw new Error('ElevenLabs returned no audio payload.');
  const buffer = Buffer.from(audioBase64, 'base64');
  const alignment = payload.alignment ?? payload.normalized_alignment ?? {};
  return {
    buffer,
    extension: 'mp3',
    wordTimings: wordTimingsFromCharacterAlignment(
      alignment.characters,
      alignment.character_start_times_seconds,
      alignment.character_end_times_seconds,
    ),
    billedCharacters: text.length,
  };
}

export function normalizeVoiceProvider(
  raw: unknown,
  fallback: VoiceProviderId = 'elevenlabs',
): VoiceProviderId {
  if (raw === 'edge' || raw === 'piper' || raw === 'elevenlabs') return raw;
  return fallback;
}

export function clampVoiceSpeed(raw: unknown, fallback = 1): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(1.2, Math.max(0.7, value));
}
