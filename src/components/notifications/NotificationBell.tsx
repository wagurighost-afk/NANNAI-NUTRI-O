import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useEmailStore } from '../../stores/emailStore';
import { buildAppNotifications } from '../../utils/notifications';
import { formatDateTime } from '../../utils';
import { cn } from '../../utils';

const typeAccent: Record<string, string> = {
  auditoria_pendente: 'text-gold-800',
  plano_atrasado: 'text-wine-700',
  plano_vencendo: 'text-gold-800',
  novo_relatorio: 'text-olive-800',
  envio_realizado: 'text-olive-800',
  erro_envio: 'text-wine-700',
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const audits = useAppStore((s) => s.audits);
  const actionPlans = useAppStore((s) => s.actionPlans);
  const dismissed = useAppStore((s) => s.dismissedNotificationIds);
  const dismissNotification = useAppStore((s) => s.dismissNotification);
  const emailHistory = useEmailStore((s) => s.history);

  const notifications = useMemo(
    () =>
      buildAppNotifications({
        audits,
        actionPlans,
        emailHistory,
        dismissedIds: dismissed,
      }),
    [audits, actionPlans, emailHistory, dismissed],
  );

  const unread = notifications.length;

  return (
    <div className="relative">
      <button
        type="button"
        className="relative rounded-xl border border-cream-300 bg-white p-2 text-ink transition hover:border-olive-300"
        aria-label="Notificações"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-wine-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Fechar notificações"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-cream-200 px-3 py-2.5">
              <p className="text-sm font-semibold text-ink">Notificações</p>
              <span className="text-xs text-ink-muted">{unread} aberta(s)</span>
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-ink-muted">
                  Nenhuma notificação no momento.
                </li>
              ) : (
                notifications.map((n) => (
                  <li key={n.id} className="border-b border-cream-100 last:border-0">
                    <Link
                      to={n.href ?? '/app'}
                      onClick={() => {
                        dismissNotification(n.id);
                        setOpen(false);
                      }}
                      className="block px-3 py-3 transition hover:bg-cream-50"
                    >
                      <p
                        className={cn(
                          'text-xs font-semibold uppercase tracking-wide',
                          typeAccent[n.type] ?? 'text-ink-muted',
                        )}
                      >
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-sm text-ink">{n.message}</p>
                      <p className="mt-1 text-[11px] text-ink-muted">
                        {formatDateTime(n.createdAt)}
                      </p>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
