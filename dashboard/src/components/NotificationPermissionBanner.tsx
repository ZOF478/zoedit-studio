import { Bell, BellOff, X } from 'lucide-react';
import { useI18n } from '../i18n';
import type { NotificationPermissionState } from '../utils/notifications';

interface NotificationPermissionBannerProps {
  permission: NotificationPermissionState;
  onEnable: () => void;
  onDismiss: () => void;
}

export function NotificationPermissionBanner({
  permission,
  onEnable,
  onDismiss,
}: NotificationPermissionBannerProps) {
  const { t } = useI18n();
  if (permission === 'granted' || permission === 'unsupported') return null;

  const blocked = permission === 'denied';

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
        blocked
          ? 'border-amber-500/30 bg-amber-500/10'
          : 'border-sky-500/30 bg-sky-500/10'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {blocked ? (
          <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        ) : (
          <Bell className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
        )}
        <div>
          <p className="text-xs font-semibold text-slate-100">
            {blocked
              ? t('إشعارات سطح المكتب محظورة', 'Desktop notifications are blocked')
              : t('فعّل إشعارات سطح المكتب', 'Enable desktop notifications')}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-300">
            {blocked
              ? t(
                  'اسمح بالإشعارات لهذا الموقع من إعدادات المتصفح لتصلك رسالة عند اكتمال التصيير.',
                  'Allow notifications for this site in your browser settings to be alerted when rendering finishes.'
                )
              : t(
                  'سنرسل لك إشعاراً ونعزف نغمة عند اكتمال التصيير حتى لو كنت في نافذة أخرى.',
                  'We will send a native notification and play a chime when rendering completes, even in another window.'
                )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!blocked && (
          <button
            type="button"
            onClick={onEnable}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 transition-colors cursor-pointer"
          >
            <Bell className="h-3.5 w-3.5" />
            {t('تفعيل الإشعارات', 'Enable notifications')}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('إخفاء', 'Dismiss')}
          className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-slate-100 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
