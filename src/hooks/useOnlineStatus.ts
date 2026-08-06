import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { useEmailStore } from '../stores/emailStore';
import { syncPendingChanges, getQueuedEmails, removeQueuedEmail } from '../services/offlineDb';
import { sendReportViaBackend } from '../services/emailService';

export function useOnlineStatus() {
  const setOnline = useAppStore((s) => s.setOnline);
  const online = useAppStore((s) => s.online);
  const markSynced = useAppStore((s) => s.markSynced);
  const pendingSyncCount = useAppStore((s) => s.pendingSyncCount);
  const updateHistoryRecord = useEmailStore((s) => s.updateHistoryRecord);
  const history = useEmailStore((s) => s.history);
  const [syncing, setSyncing] = useState(false);
  const [emailFlushMessage, setEmailFlushMessage] = useState('');

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [setOnline]);

  useEffect(() => {
    if (!online || pendingSyncCount === 0) return;
    let cancelled = false;
    const run = async () => {
      setSyncing(true);
      try {
        await syncPendingChanges();
        if (!cancelled) markSynced();
      } finally {
        if (!cancelled) setSyncing(false);
      }
    };
    const t = setTimeout(run, 1200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [online, pendingSyncCount, markSynced]);

  // Flush queued email reports when connection returns
  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    const flush = async () => {
      const queued = await getQueuedEmails();
      if (queued.length === 0) return;
      setEmailFlushMessage('Enviando relatórios que aguardavam conexão…');
      let sent = 0;
      let failed = 0;
      for (const item of queued) {
        const result = await sendReportViaBackend({
          ...item.payload,
          attachment: {
            ...item.payload.attachment,
            blob: new Blob([], { type: 'application/pdf' }),
          },
        });
        const matching = history.find(
          (h) =>
            h.auditId === item.payload.auditId &&
            (h.status === 'aguardando_conexao' ||
              h.status === 'aguardando_reenvio'),
        );
        if (
          result.status === 'enviado' ||
          result.status === 'parcialmente_enviado'
        ) {
          sent += 1;
          await removeQueuedEmail(item.id);
          if (matching) {
            updateHistoryRecord(matching.id, {
              status: result.status,
              sentAt: new Date().toISOString(),
              queuedOffline: false,
              errors: [],
              attempts: matching.attempts + 1,
            });
          }
        } else {
          failed += 1;
          if (matching) {
            updateHistoryRecord(matching.id, {
              status: 'falha',
              errors: result.errors,
              attempts: matching.attempts + 1,
            });
          }
        }
      }
      if (!cancelled) {
        setEmailFlushMessage(
          failed === 0
            ? `${sent} relatório(s) enviado(s) após reconexão.`
            : `${sent} enviado(s), ${failed} com falha.`,
        );
        setTimeout(() => setEmailFlushMessage(''), 5000);
      }
    };
    const t = setTimeout(flush, 1500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [online, history, updateHistoryRecord]);

  return { online, syncing, pendingSyncCount, emailFlushMessage };
}

export function useAutoSave(callback: () => void, intervalMs = 8000) {
  useEffect(() => {
    const id = setInterval(callback, intervalMs);
    return () => clearInterval(id);
  }, [callback, intervalMs]);
}
