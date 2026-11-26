import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type UserAssetRole = 'logo' | 'screenshot';

export interface UserAssetPayload {
  id: string;
  filename: string;
  src: string;
  url: string;
  role: UserAssetRole;
  note: string;
  originalName: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  aspectRatio: number;
  createdAt: number;
}

interface StoredUserAsset extends Omit<UserAssetPayload, 'src' | 'url'> {}

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(MODULE_DIR, '..');
const ZOEDIT_HOME_DIR = path.join(os.homedir(), '.zoedit-studio');
const INDEX_FILE = path.join(ZOEDIT_HOME_DIR, 'user-assets.json');
export const USER_ASSETS_DIR = path.join(PROJECT_ROOT, 'public', 'user-assets');
export const USER_ASSET_MAX_BYTES = 8 * 1024 * 1024;
export const USER_ASSET_MAX_COUNT = 12;

const SAFE_ID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SAFE_FILENAME_PATTERN = /^[a-f0-9-]{36}\.(?:png|jpg|webp|svg)$/i;
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
]);

function ensurePrivateDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  try {
    fs.chmodSync(dir, 0o700);
  } catch {
    // Best effort on non-POSIX filesystems.
  }
}

function restrictPrivateFile(filePath: string): void {
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    // Best effort on non-POSIX filesystems.
  }
}

export function ensureUserAssetsDir(): void {
  ensurePrivateDir(USER_ASSETS_DIR);
}

function readIndex(): Record<string, StoredUserAsset> {
  try {
    const parsed = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const result: Record<string, StoredUserAsset> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const record = value as Record<string, unknown>;
      const id = typeof record.id === 'string' ? record.id : key;
      const filename = typeof record.filename === 'string' ? record.filename : '';
      if (!SAFE_ID_PATTERN.test(id) || !SAFE_FILENAME_PATTERN.test(filename)) continue;
      result[id] = {
        id,
        filename,
        role: record.role === 'logo' ? 'logo' : 'screenshot',
        note: typeof record.note === 'string' ? record.note.slice(0, 160) : '',
        originalName:
          typeof record.originalName === 'string'
            ? record.originalName.slice(0, 160)
            : filename,
        mimeType:
          typeof record.mimeType === 'string' ? record.mimeType.slice(0, 80) : '',
        size: Math.max(0, Number(record.size) || 0),
        width: Math.max(0, Number(record.width) || 0),
        height: Math.max(0, Number(record.height) || 0),
        aspectRatio: Math.max(0, Number(record.aspectRatio) || 0),
        createdAt: Number(record.createdAt) || Date.now(),
      };
    }
    return result;
  } catch {
    return {};
  }
}

function writeIndex(index: Record<string, StoredUserAsset>): void {
  ensurePrivateDir(ZOEDIT_HOME_DIR);
  const tempPath = `${INDEX_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(index, null, 2)}\n`, {
    mode: 0o600,
  });
  restrictPrivateFile(tempPath);
  fs.renameSync(tempPath, INDEX_FILE);
  restrictPrivateFile(INDEX_FILE);
}

function publicAsset(record: StoredUserAsset): UserAssetPayload {
  return {
    ...record,
    src: `user-assets/${record.filename}`,
    url: `/user-assets/${encodeURIComponent(record.filename)}`,
  };
}

function assetFilePath(record: StoredUserAsset): string {
  const target = path.resolve(USER_ASSETS_DIR, record.filename);
  if (!target.startsWith(`${path.resolve(USER_ASSETS_DIR)}${path.sep}`)) {
    throw new Error('Unsafe user-asset path.');
  }
  return target;
}

export function listUserAssets(): UserAssetPayload[] {
  ensureUserAssetsDir();
  const index = readIndex();
  let changed = false;
  const assets: UserAssetPayload[] = [];
  for (const [id, record] of Object.entries(index)) {
    let exists = false;
    try {
      exists = fs.statSync(assetFilePath(record)).isFile();
    } catch {
      exists = false;
    }
    if (!exists) {
      delete index[id];
      changed = true;
      continue;
    }
    assets.push(publicAsset(record));
  }
  if (changed) {
    try {
      writeIndex(index);
    } catch {
      // Listing must never fail because the index could not be compacted.
    }
  }
  return assets.sort((a, b) => a.createdAt - b.createdAt);
}

export function normalizeUserAssets(raw: unknown): UserAssetPayload[] {
  if (!Array.isArray(raw)) return [];
  const index = readIndex();
  const seen = new Set<string>();
  const result: UserAssetPayload[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id.trim() : '';
    const filename = typeof record.filename === 'string' ? record.filename.trim() : '';
    const match =
      (id && index[id]) ||
      Object.values(index).find((entry) => entry.filename === filename);
    if (!match || seen.has(match.id)) continue;
    seen.add(match.id);
    result.push(publicAsset(match));
    if (result.length >= USER_ASSET_MAX_COUNT) break;
  }
  return result;
}

function normalizeMime(raw: string): string {
  return raw.split(';')[0].trim().toLowerCase();
}

function isPng(buffer: Buffer): boolean {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

function isJpeg(buffer: Buffer): boolean {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function isWebp(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  );
}

function isSvgText(text: string): boolean {
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  return /^<\?xml[\s\S]*?\?>\s*<svg[\s>]/i.test(trimmed) || /^<svg[\s>]/i.test(trimmed);
}

function sanitizeSvgText(input: string): { ok: boolean; text: string; error?: string } {
  const original = input.replace(/^\uFEFF/, '');
  if (!isSvgText(original)) {
    return { ok: false, text: '', error: 'SVG root element is missing.' };
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(original)) {
    return { ok: false, text: '', error: 'SVG doctype and entities are not allowed.' };
  }
  let text = original.slice(0, 2 * 1024 * 1024);
  text = text.replace(/<\?[\s\S]*?\?>/g, '');
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  text = text.replace(/<script\b[\s\S]*?<\/script\s*>/gi, '');
  text = text.replace(/<style\b[\s\S]*?<\/style\s*>/gi, '');
  text = text.replace(/<foreignObject\b[\s\S]*?<\/foreignObject\s*>/gi, '');
  text = text.replace(/<(?:iframe|object|embed|audio|video|source|track)\b[^>]*\/?>/gi, '');
  text = text.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  text = text.replace(
    /\s+(?:href|xlink:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    (match, doubleQuoted, singleQuoted, bare) => {
      const value = String(doubleQuoted ?? singleQuoted ?? bare ?? '').trim();
      return value.startsWith('#') ? match : '';
    },
  );
  text = text.replace(
    /url\(\s*(['"]?)(.*?)\1\s*\)/gi,
    (match, _quote, value) => (String(value).trim().startsWith('#') ? match : 'none'),
  );
  const external = /(?:https?:)?\/\/[^\s"'`)>]+/gi;
  text = text.replace(
    /\s+(?:xmlns(?::[a-z]+)?|focusable|target|rel)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
    (match) => {
      if (/xmlns(?::[a-z]+)?\s*=\s*["']https?:\/\/www\.w3\.org\//i.test(match)) {
        return match;
      }
      return '';
    },
  );
  const externalWithoutNamespaces = text.replace(
    /https?:\/\/www\.w3\.org\/[^\s"'`)>]+/gi,
    '',
  );
  if (external.test(externalWithoutNamespaces)) {
    return { ok: false, text: '', error: 'External URLs are not allowed in SVG.' };
  }
  if (/\bdata:(?:text\/html|image\/svg)/i.test(text)) {
    return { ok: false, text: '', error: 'Embedded documents are not allowed in SVG.' };
  }
  return { ok: true, text: `${text.trim()}\n` };
}

function detectPngSize(buffer: Buffer): { width: number; height: number } {
  if (buffer.length >= 24 && buffer.toString('ascii', 12, 16) === 'IHDR') {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }
  return { width: 0, height: 0 };
}

function detectJpegSize(buffer: Buffer): { width: number; height: number } {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    let marker = buffer[offset + 1];
    while (marker === 0xff && offset + 2 < buffer.length) {
      offset += 1;
      marker = buffer[offset + 1];
    }
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    if (marker === 0xda) break;
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) break;
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return { width: 0, height: 0 };
}

function detectWebpSize(buffer: Buffer): { width: number; height: number } {
  if (buffer.length < 30) return { width: 0, height: 0 };
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8X') {
    const width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
    const height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));
    return { width, height };
  }
  if (chunk === 'VP8 ') {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return {
      width: 1 + (bits & 0x3fff),
      height: 1 + ((bits >> 14) & 0x3fff),
    };
  }
  return { width: 0, height: 0 };
}

function detectSvgSize(text: string): { width: number; height: number } {
  const svgMatch = text.match(/<svg\b[^>]*>/i);
  if (!svgMatch) return { width: 0, height: 0 };
  const tag = svgMatch[0];
  const widthMatch = tag.match(/\bwidth\s*=\s*["']?\s*([\d.]+)/i);
  const heightMatch = tag.match(/\bheight\s*=\s*["']?\s*([\d.]+)/i);
  const viewBoxMatch = tag.match(/\bviewBox\s*=\s*["']\s*([\d.+-]+)[\s,]+([\d.+-]+)[\s,]+([\d.+-]+)[\s,]+([\d.+-]+)/i);
  const width = widthMatch ? Number(widthMatch[1]) : viewBoxMatch ? Number(viewBoxMatch[3]) : 0;
  const height = heightMatch ? Number(heightMatch[1]) : viewBoxMatch ? Number(viewBoxMatch[4]) : 0;
  return {
    width: Number.isFinite(width) && width > 0 ? Math.round(width) : 0,
    height: Number.isFinite(height) && height > 0 ? Math.round(height) : 0,
  };
}

function sanitizeOriginalName(raw: string): string {
  const decoded = (() => {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  })();
  const base = path.basename(decoded).replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return (base || 'image').slice(0, 140);
}

function sanitizeNote(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
}

function normalizeRole(raw: unknown): UserAssetRole {
  return raw === 'logo' ? 'logo' : 'screenshot';
}

export function saveUserAssetUpload(options: {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  role?: unknown;
  note?: unknown;
}): { ok: true; asset: UserAssetPayload } | { ok: false; error: string; status: number } {
  const mimeType = normalizeMime(options.mimeType);
  if (!ALLOWED_MIME.has(mimeType)) {
    return { ok: false, status: 415, error: 'Unsupported image type.' };
  }
  if (options.buffer.length === 0) {
    return { ok: false, status: 400, error: 'The uploaded file is empty.' };
  }
  if (options.buffer.length > USER_ASSET_MAX_BYTES) {
    return { ok: false, status: 413, error: 'Image exceeds the 8 MB limit.' };
  }

  let extension = '';
  let storedBuffer = options.buffer;
  let width = 0;
  let height = 0;
  let storedMime = mimeType;

  if (mimeType === 'image/png') {
    if (!isPng(options.buffer)) return { ok: false, status: 415, error: 'Invalid PNG signature.' };
    extension = 'png';
    ({ width, height } = detectPngSize(options.buffer));
  } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    if (!isJpeg(options.buffer)) return { ok: false, status: 415, error: 'Invalid JPEG signature.' };
    extension = 'jpg';
    storedMime = 'image/jpeg';
    ({ width, height } = detectJpegSize(options.buffer));
  } else if (mimeType === 'image/webp') {
    if (!isWebp(options.buffer)) return { ok: false, status: 415, error: 'Invalid WEBP signature.' };
    extension = 'webp';
    ({ width, height } = detectWebpSize(options.buffer));
  } else {
    const text = options.buffer.toString('utf8');
    const sanitized = sanitizeSvgText(text);
    if (!sanitized.ok) {
      return { ok: false, status: 415, error: sanitized.error || 'Invalid SVG file.' };
    }
    extension = 'svg';
    storedBuffer = Buffer.from(sanitized.text, 'utf8');
    ({ width, height } = detectSvgSize(sanitized.text));
  }

  const existingIndex = readIndex();
  if (Object.keys(existingIndex).length >= USER_ASSET_MAX_COUNT) {
    return {
      ok: false,
      status: 400,
      error: `The maximum of ${USER_ASSET_MAX_COUNT} image assets was reached.`,
    };
  }

  const id = crypto.randomUUID();
  const filename = `${id}.${extension}`;
  if (!SAFE_ID_PATTERN.test(id) || !SAFE_FILENAME_PATTERN.test(filename)) {
    return { ok: false, status: 500, error: 'Could not allocate a safe file name.' };
  }
  ensureUserAssetsDir();
  const target = path.resolve(USER_ASSETS_DIR, filename);
  if (!target.startsWith(`${path.resolve(USER_ASSETS_DIR)}${path.sep}`)) {
    return { ok: false, status: 400, error: 'Unsafe file name.' };
  }
  const tempPath = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, storedBuffer, { mode: 0o600 });
  restrictPrivateFile(tempPath);
  fs.renameSync(tempPath, target);
  restrictPrivateFile(target);

  const record: StoredUserAsset = {
    id,
    filename,
    role: normalizeRole(options.role),
    note: sanitizeNote(options.note),
    originalName: sanitizeOriginalName(options.originalName),
    mimeType: storedMime,
    size: storedBuffer.length,
    width,
    height,
    aspectRatio: width > 0 && height > 0 ? Number((width / height).toFixed(4)) : 0,
    createdAt: Date.now(),
  };
  existingIndex[id] = record;
  try {
    writeIndex(existingIndex);
  } catch (error) {
    try {
      fs.rmSync(target, { force: true });
    } catch {
      // Best effort cleanup.
    }
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Could not save the asset index.',
    };
  }
  return { ok: true, asset: publicAsset(record) };
}

export function updateUserAssetMeta(
  id: string,
  patch: { role?: unknown; note?: unknown },
): UserAssetPayload | null {
  if (!SAFE_ID_PATTERN.test(id)) return null;
  const index = readIndex();
  const record = index[id];
  if (!record) return null;
  if (patch.role !== undefined) record.role = normalizeRole(patch.role);
  if (patch.note !== undefined) record.note = sanitizeNote(patch.note);
  writeIndex(index);
  return publicAsset(record);
}

export function deleteUserAsset(id: string): boolean {
  if (!SAFE_ID_PATTERN.test(id)) return false;
  const index = readIndex();
  const record = index[id];
  if (!record) return false;
  try {
    const target = assetFilePath(record);
    fs.rmSync(target, { force: true });
  } catch {
    // Removing the manifest entry is still useful.
  }
  delete index[id];
  writeIndex(index);
  return true;
}

export function buildUserAssetPromptLines(assets: UserAssetPayload[]): string[] {
  if (assets.length === 0) return [];
  const lines = [
    '## USER-PROVIDED IMAGES (mandatory, local project assets)',
    '- These images were uploaded by the user for this video. They are PRIMARY visual content, not decoration. Every uploaded image MUST appear at least once across the generated scene set.',
    '- Render them with Remotion only: `import { Img, staticFile } from "remotion";` and `<Img src={staticFile("user-assets/<exact-file>")} />`. Use the exact file paths below. Never use external URLs, remote images, data URIs, or another asset path.',
    '- NEVER strip these user assets in Clean B-Roll mode. Clean B-Roll only removes decorative text overlays; uploaded logos and screenshots stay fully visible.',
  ];
  for (const asset of assets) {
    const ratio =
      asset.width > 0 && asset.height > 0
        ? `${asset.width}x${asset.height} (${asset.aspectRatio.toFixed(3)}:1)`
        : 'unknown dimensions';
    lines.push(
      `- ${asset.role.toUpperCase()} | file: user-assets/${asset.filename} | source size: ${ratio} | note: ${asset.note || 'none'}`,
    );
  }
  lines.push(
    '### Screenshot direction (high production value)',
    '- Wrap screenshots in a sleek glassmorphic browser window or device bezel with chrome dots, rounded corners, a soft layered drop shadow, and a subtle 2.5D perspective tilt.',
    '- Use a spring entrance, then a continuous Ken Burns motion (slow scale + translate) across the scene, with a gentle exit ease. Preserve the screenshot aspect ratio and use objectFit contain/cover intentionally.',
  );
  lines.push(
    '### Logo direction (hero reveal)',
    '- Preserve PNG/SVG/WEBP transparency cleanly: no opaque rectangle behind the mark. Stage a dedicated hero entrance or outro with a spring scale/rotate, soft brand-colored radial glow, and a subtle pulsing halo.',
    '- Keep logos crisp with objectFit contain; never stretch, crop, tint, or redraw them. Pair the reveal with the brand accent palette from props.',
  );
  return lines;
}
