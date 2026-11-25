import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

export const PREVIEW_ASPECT_RESOLUTIONS: Record<string, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '1:1': { width: 1080, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
};

export function useContainFrame(aspectRatio: string) {
  const resolution =
    PREVIEW_ASPECT_RESOLUTIONS[aspectRatio] ?? PREVIEW_ASPECT_RESOLUTIONS['9:16'];
  const isPortrait = aspectRatio === '9:16';
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const updateFrameSize = () => {
      const rect = stage.getBoundingClientRect();
      const styles = window.getComputedStyle(stage);
      const padX =
        (Number.parseFloat(styles.paddingLeft) || 0) +
        (Number.parseFloat(styles.paddingRight) || 0);
      const padY =
        (Number.parseFloat(styles.paddingTop) || 0) +
        (Number.parseFloat(styles.paddingBottom) || 0);
      const availableWidth = Math.max(0, rect.width - padX);
      const availableHeight = Math.max(0, rect.height - padY);
      const frameRatio = resolution.width / resolution.height;
      let width = availableWidth;
      let height = width / frameRatio;
      if (height > availableHeight) {
        height = availableHeight;
        width = height * frameRatio;
      }
      const next = {
        width: Math.max(0, Math.floor(width)),
        height: Math.max(0, Math.floor(height)),
      };
      setFrameSize((previous) =>
        previous.width === next.width && previous.height === next.height ? previous : next,
      );
    };

    updateFrameSize();
    window.addEventListener('resize', updateFrameSize);
    if (typeof ResizeObserver === 'undefined') {
      return () => window.removeEventListener('resize', updateFrameSize);
    }
    const observer = new ResizeObserver(updateFrameSize);
    observer.observe(stage);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateFrameSize);
    };
  }, [resolution.width, resolution.height]);

  return { resolution, isPortrait, stageRef, frameSize };
}

interface PreviewStageShellProps {
  title: string;
  icon: ReactNode;
  live?: boolean;
  metadata: ReactNode;
  notice?: string | null;
  noticeTone?: 'info' | 'error';
  actions?: ReactNode;
  children: ReactNode;
  aspectRatio: string;
  frameStyle?: CSSProperties;
  frameClassName?: string;
  embedded?: boolean;
}

export function PreviewStageShell({
  title,
  icon,
  live = false,
  metadata,
  notice = null,
  noticeTone = 'info',
  actions,
  children,
  aspectRatio,
  frameStyle,
  frameClassName = '',
  embedded = false,
}: PreviewStageShellProps) {
  const { resolution, stageRef, frameSize } = useContainFrame(aspectRatio);

  return (
    <section
      className={
        embedded
          ? 'flex h-full min-w-0 w-full max-w-full flex-col overflow-hidden'
          : 'flex h-full min-w-0 w-full max-w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0E121A] shadow-[0_24px_70px_-40px_rgba(56,189,248,0.55)]'
      }
    >
      <header className="flex min-h-[58px] min-w-0 flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="truncate font-display text-sm font-bold text-slate-100">{title}</h2>
            {live ? (
              <span className="hidden items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                LIVE
              </span>
            ) : null}
          </div>
          <div
            className="mt-0.5 truncate font-mono text-[11px] text-slate-400 tabular-nums"
            dir="ltr"
          >
            {metadata}
          </div>
          {notice ? (
            <p
              className={`mt-1 truncate text-[10px] font-medium ${
                noticeTone === 'error' ? 'text-red-300' : 'text-sky-300/80'
              }`}
              title={notice}
            >
              {notice}
            </p>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div>
      </header>

      <div
        ref={stageRef}
        className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden p-2 sm:p-3"
      >
        <div
          className={`relative shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#05070C] ${frameClassName}`}
          style={{
            width: frameSize.width > 0 ? `${frameSize.width}px` : '100%',
            height: frameSize.height > 0 ? `${frameSize.height}px` : '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            ...frameStyle,
          }}
        >
          {children}
        </div>
      </div>

      <span className="sr-only">
        {resolution.width}×{resolution.height}
      </span>
    </section>
  );
}
