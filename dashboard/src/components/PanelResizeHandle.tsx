import type { PointerEvent as ReactPointerEvent } from 'react';
import { useI18n } from '../i18n';

type ResizeOrientation = 'vertical' | 'horizontal';

interface PanelResizeHandleProps {
  orientation: ResizeOrientation;
  active?: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  label?: string;
}

export function PanelResizeHandle({
  orientation,
  active = false,
  onPointerDown,
  label,
}: PanelResizeHandleProps) {
  const { t } = useI18n();
  const vertical = orientation === 'vertical';

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-label={label || (vertical ? t('تغيير عرض اللوحة', 'Resize panel width') : t('تغيير ارتفاع الخط الزمني', 'Resize timeline height'))}
      onPointerDown={onPointerDown}
      className={`group relative z-20 flex touch-none select-none items-center justify-center ${
        vertical
          ? 'hidden w-1.5 cursor-col-resize lg:flex'
          : 'h-1.5 w-full cursor-row-resize'
      }`}
    >
      <span
        className={`rounded-full transition-colors ${
          vertical ? 'h-10 w-0.5' : 'h-0.5 w-10'
        } ${active ? 'bg-sky-400' : 'bg-white/10 group-hover:bg-sky-400/70'}`}
      />
      <span
        className={`pointer-events-none absolute inset-0 rounded-full transition-colors ${
          active ? 'bg-sky-400/10' : 'bg-transparent group-hover:bg-sky-400/5'
        }`}
      />
    </div>
  );
}
