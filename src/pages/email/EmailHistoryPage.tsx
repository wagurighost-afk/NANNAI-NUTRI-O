import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageHeader, Card, Badge, EmptyState } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useEmailStore } from '../../stores/emailStore';
import { useAppStore } from '../../stores/appStore';
import { useAuthStore } from '../../stores/authStore';
import { formatDateTime } from '../../utils';
import { canSendReportEmail } from '../../utils/email';
import {
  queueOrSendReport,
  type SendReportPayload,
} from '../../services/emailService';
import { generateAuditPdfAttachment } from '../../services/pdfReport';
import type { EmailSendStatus } from '../../types';

const statusLabels: Record<EmailSendStatus, string> = {
  preparando: 'Preparando',
  enviado: 'Enviado',
  falha: 'Falha no envio',
  parcialmente_enviado: 'Parcialmente enviado',
  aguardando_reenvio: 'Aguardando reenvio',
  aguardando_conexao: 'Aguardando conexão',
};

const statusColors: Record<EmailSendStatus, string> = {
  preparando: 'border-stone-200 bg-stone-100 text-stone-700',
  enviado: 'border-olive-200 bg-olive-50 text-olive-800',
  falha: 'border-wine-200 bg-wine-50 text-wine-800',
  parcialmente_enviado: 'border-gold-300 bg-gold-100 text-gold-900',
  aguardando_reenvio: 'border-gold-300 bg-gold-100 text-gold-900',
  aguardando_conexao: 'border-gold-300 bg-gold-100 text-gold-900',
};

export function EmailHistoryPage() {
  const history = useEmailStore((s) => s.history);
  const updateHistoryRecord = useEmailStore((s) => s.updateHistoryRecord);
  const audits = useAppStore((s) => s.audits);
  const questionnaire = useAppStore((s) => s.questionnaire);
  const actionPlans = useAppStore((s) => s.actionPlans);
  const online = useAppStore((s) => s.online);
  const user = useAuthStore((s) => s.user);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const allowed = canSendReportEmail(user?.role);

  const resend = async (recordId: string) => {
    if (!allowed || !user) return;
    const record = history.find((h) => h.id === recordId);
    if (!record) return;
    const audit = audits.find((a) => a.id === record.auditId);
    if (!audit) {
      setMessage('Auditoria vinculada não encontrada.');
      return;
    }

    setBusyId(recordId);
    setMessage('');
    updateHistoryRecord(recordId, { status: 'preparando' });

    try {
      const attachment = await generateAuditPdfAttachment(
        audit,
        questionnaire,
        actionPlans.filter((p) => p.auditId === audit.id),
      );

      const to = record.recipients.filter((r) => r.type === 'to');
      const cc = record.recipients.filter((r) => r.type === 'cc');
      const bcc = record.recipients.filter((r) => r.type === 'bcc');

      const payload: SendReportPayload = {
        auditId: audit.id,
        auditCode: audit.code,
        subject: record.subject,
        body: record.body,
        to,
        cc,
        bcc,
        copyToSelf: record.copyToSelf,
        selfEmail: user.email,
        attachment,
        sentByUserId: user.id,
        sentByName: user.name,
      };

      const result = await queueOrSendReport(payload, online);
      updateHistoryRecord(recordId, {
        ...result.recordPatch,
        attempts: record.attempts + 1,
        status:
          result.recordPatch.status === 'aguardando_conexao'
            ? 'aguardando_conexao'
            : result.recordPatch.status === 'enviado'
              ? 'enviado'
              : 'falha',
      });
      setMessage(result.userMessage);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha no reenvio';
      updateHistoryRecord(recordId, {
        status: 'aguardando_reenvio',
        errors: [msg],
        attempts: record.attempts + 1,
      });
      setMessage(msg);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Histórico de envios"
        subtitle="Registros de e-mails de relatórios de auditoria"
      />

      {message && (
        <p className="mb-4 rounded-xl bg-olive-50 px-3 py-2 text-sm text-olive-800">
          {message}
        </p>
      )}

      {history.length === 0 ? (
        <EmptyState
          title="Nenhum envio registrado"
          description="Os envios de relatórios por e-mail aparecerão aqui."
        />
      ) : (
        <div className="space-y-3">
          {history.map((h) => (
            <Card key={h.id} className="space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{h.subject}</p>
                  <p className="text-sm text-ink-muted">
                    {h.auditCode} · {h.unitName} · {h.sectorName}
                  </p>
                </div>
                <Badge className={statusColors[h.status]}>
                  {statusLabels[h.status]}
                </Badge>
              </div>
              <div className="grid gap-1 text-xs text-ink-muted sm:grid-cols-2">
                <p>Enviado por: {h.sentByName}</p>
                <p>Criado: {formatDateTime(h.createdAt)}</p>
                <p>Envio: {formatDateTime(h.sentAt)}</p>
                <p>
                  Anexo: {h.pdfFileName} ({Math.round(h.pdfSizeBytes / 1024)} KB)
                </p>
                <p>Tentativas: {h.attempts}</p>
                <p>
                  Destinatários:{' '}
                  {h.recipients.map((r) => r.email).join(', ')}
                </p>
              </div>
              {h.errors.length > 0 && (
                <p className="text-xs text-wine-700">
                  Erros: {h.errors.join(' · ')}
                </p>
              )}
              {allowed &&
                (h.status === 'falha' ||
                  h.status === 'aguardando_reenvio' ||
                  h.status === 'parcialmente_enviado' ||
                  h.status === 'aguardando_conexao') && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === h.id}
                    onClick={() => resend(h.id)}
                  >
                    <RefreshCw size={14} />
                    {busyId === h.id ? 'Reenviando…' : 'Reenviar relatório'}
                  </Button>
                )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
