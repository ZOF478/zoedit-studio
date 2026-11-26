import { useRef, useState, type DragEvent } from 'react';
import {
  ImagePlus,
  Loader2,
  Tag,
  UploadCloud,
  X,
} from 'lucide-react';
import { useI18n } from '../i18n';
import type { UserAsset, UserAssetRole } from '../types/studio';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_ASSETS = 12;
const ACCEPTED_EXTENSIONS = /\.(png|jpe?g|webp|svg)$/i;
const ACCEPTED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
]);

interface UserAssetComposerProps {
  assets: UserAsset[];
  onChangeAssets: (assets: UserAsset[]) => void;
  apiBaseUrl: string;
  sessionToken: string;
  disabled?: boolean;
}

function guessRole(fileName: string): UserAssetRole {
  return /logo|brand|icon|mark|emblem/i.test(fileName) ? 'logo' : 'screenshot';
}

export function UserAssetComposer({
  assets,
  onChangeAssets,
  apiBaseUrl,
  sessionToken,
  disabled = false,
}: UserAssetComposerProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authHeaders: Record<string, string> = sessionToken
    ? { 'x-zoedit-session': sessionToken }
    : {};

  const updateAssetInState = (id: string, patch: Partial<UserAsset>) => {
    onChangeAssets(
      assets.map((asset) => (asset.id === id ? { ...asset, ...patch } : asset)),
    );
  };

  const patchAsset = async (asset: UserAsset, patch: { role?: UserAssetRole; note?: string }) => {
    updateAssetInState(asset.id, patch);
    try {
      const response = await fetch(
        `${apiBaseUrl}/user-assets/${encodeURIComponent(asset.id)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify(patch),
        },
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(
          data?.error ||
            t('تعذر تحديث بيانات الصورة.', 'Could not update the image metadata.'),
        );
      }
    } catch {
      setError(t('تعذر الاتصال بالخادم لتحديث الصورة.', 'Could not reach the server to update the image.'));
    }
  };

  const uploadFiles = async (files: File[]) => {
    if (disabled || uploading) return;
    const remaining = MAX_ASSETS - assets.length;
    if (remaining <= 0) {
      setError(t(`الحد الأقصى ${MAX_ASSETS} صور.`, `The maximum is ${MAX_ASSETS} images.`));
      return;
    }
    const accepted = files.filter(
      (file) =>
        (ACCEPTED_MIME.has(file.type.toLowerCase()) || ACCEPTED_EXTENSIONS.test(file.name)) &&
        file.size <= MAX_FILE_BYTES,
    );
    if (accepted.length !== files.length) {
      setError(
        t(
          'بعض الملفات غير مدعومة أو تتجاوز 8MB وتم تجاهلها.',
          'Some files were unsupported or larger than 8 MB and were ignored.',
        ),
      );
    }
    const queue = accepted.slice(0, remaining);
    if (queue.length === 0) return;

    setUploading(true);
    setError(null);
    const nextAssets = [...assets];
    for (const file of queue) {
      try {
        const role = guessRole(file.name);
        const query = new URLSearchParams({ role, note: '' });
        const response = await fetch(`${apiBaseUrl}/user-assets?${query.toString()}`, {
          method: 'POST',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'x-zoedit-filename': encodeURIComponent(file.name),
            ...authHeaders,
          },
          body: file,
        });
        const data = (await response.json().catch(() => null)) as
          | { asset?: UserAsset; error?: string }
          | null;
        if (!response.ok || !data?.asset) {
          throw new Error(
            data?.error ||
              t('تعذر رفع الصورة.', 'Could not upload the image.'),
          );
        }
        nextAssets.push(data.asset);
        onChangeAssets([...nextAssets]);
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : t('تعذر رفع الصورة.', 'Could not upload the image.'),
        );
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAsset = async (asset: UserAsset) => {
    if (disabled) return;
    try {
      const response = await fetch(
        `${apiBaseUrl}/user-assets/${encodeURIComponent(asset.id)}`,
        { method: 'DELETE', headers: authHeaders },
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error || t('تعذر حذف الصورة.', 'Could not remove the image.'));
        return;
      }
      onChangeAssets(assets.filter((item) => item.id !== asset.id));
      setError(null);
    } catch {
      setError(t('تعذر الاتصال بالخادم لحذف الصورة.', 'Could not reach the server to remove the image.'));
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (disabled) return;
    void uploadFiles(Array.from(event.dataTransfer.files ?? []));
  };

  return (
    <div className="mt-3 space-y-2.5 rounded-xl border border-violet-400/20 bg-[#0B0E14] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-violet-200">
          <ImagePlus className="h-3.5 w-3.5" />
          {t('صور ولوغو مرفقة', 'Attached images & logo')}
        </span>
        <span className="font-mono text-[9px] text-slate-500 tabular-nums">
          {assets.length}/{MAX_ASSETS}
        </span>
      </div>

      <div
        role="button"
        tabIndex={0}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget === event.target) setDragActive(false);
        }}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled && !uploading) fileInputRef.current?.click();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (!disabled && !uploading) fileInputRef.current?.click();
          }
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-3 py-3 text-center transition-colors ${
          dragActive
            ? 'border-violet-300/80 bg-violet-500/15'
            : 'border-white/12 bg-[#10141D] hover:border-violet-400/40'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
          multiple
          disabled={disabled || uploading}
          onChange={(event) => void uploadFiles(Array.from(event.target.files ?? []))}
          className="hidden"
        />
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin text-violet-200" />
        ) : (
          <UploadCloud className="h-4 w-4 text-violet-200" />
        )}
        <span className="text-[10px] font-bold text-slate-200">
          {uploading
            ? t('جاري رفع الصور…', 'Uploading images…')
            : t('اسحب الصور أو اضغط لإرفاق Logo / Screenshot', 'Drop images or click to attach Logo / Screenshot')}
        </span>
        <span className="text-[9px] text-slate-500">
          {t('PNG · JPG · WEBP · SVG آمن — حتى 8MB', 'PNG · JPG · WEBP · sanitized SVG — up to 8 MB')}
        </span>
      </div>

      {assets.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#10141D]"
            >
              <div
                className="relative flex h-24 items-center justify-center overflow-hidden"
                style={{
                  backgroundImage:
                    'linear-gradient(45deg, rgba(148,163,184,0.14) 25%, transparent 25%), linear-gradient(-45deg, rgba(148,163,184,0.14) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(148,163,184,0.14) 75%), linear-gradient(-45deg, transparent 75%, rgba(148,163,184,0.14) 75%)',
                  backgroundSize: '14px 14px',
                  backgroundPosition: '0 0, 0 7px, 7px -7px, -7px 0',
                }}
              >
                <img
                  src={asset.url}
                  alt={asset.note || asset.originalName || asset.filename}
                  className="max-h-[88px] max-w-[92%] object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]"
                />
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void removeAsset(asset)}
                  title={t('حذف الصورة', 'Remove image')}
                  className="absolute end-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-red-400/40 bg-red-500/25 text-red-100 transition-colors hover:bg-red-500/40 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-1.5 p-1.5">
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void patchAsset(asset, { role: 'logo' })}
                    className={`inline-flex items-center justify-center gap-1 rounded-md border px-1 py-1 text-[9px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer ${
                      asset.role === 'logo'
                        ? 'border-amber-400/50 bg-amber-500/15 text-amber-100'
                        : 'border-white/10 bg-[#0B0E14] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {t('Logo', 'Logo')}
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void patchAsset(asset, { role: 'screenshot' })}
                    className={`inline-flex items-center justify-center gap-1 rounded-md border px-1 py-1 text-[9px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer ${
                      asset.role === 'screenshot'
                        ? 'border-sky-400/50 bg-sky-500/15 text-sky-100'
                        : 'border-white/10 bg-[#0B0E14] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t('Screenshot', 'Screenshot / Visual')}
                  </button>
                </div>
                <input
                  type="text"
                  value={asset.note}
                  disabled={disabled}
                  onChange={(event) => updateAssetInState(asset.id, { note: event.target.value })}
                  onBlur={(event) => void patchAsset(asset, { note: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                  }}
                  placeholder={t('ملاحظة قصيرة — مثال: شاشة اللوحة', 'Short note — e.g. Dashboard screen')}
                  className="w-full rounded-md border border-white/10 bg-[#0B0E14] px-1.5 py-1 text-[9px] text-slate-200 placeholder:text-slate-600 focus:border-violet-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                />
                {asset.width > 0 && asset.height > 0 ? (
                  <div className="truncate font-mono text-[8px] text-slate-600">
                    {asset.width}×{asset.height} · {Math.round(asset.size / 1024)} KB
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-2 py-1 text-[10px] leading-relaxed text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
