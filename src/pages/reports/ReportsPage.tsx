import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileDown, Mail, Printer, Share2 } from 'lucide-react';
import { PageHeader, Card, Badge, EmptyState } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAppStore } from '../../stores/appStore';
import { useAuthStore } from '../../stores/authStore';
import { formatDateTime } from '../../utils';
import {
  generateAuditPdf,
  generateAuditPdfAttachment,
} from '../../services/pdfReport';
import { SendReportModal } from '../../components/email/SendReportModal';
import { canSendReportEmail } from '../../utils/email';
import type { Audit } from '../../types';
import {
  getAuditReportPdf,
  openAuditReportPdf,
} from '../../services/auditReportStorage';

export function ReportsPage() {
  const allAudits = useAppStore((s) => s.audits);
  const updateAudit = useAppStore((s) => s.updateAudit);
  const audits = useMemo(
    () =>
      allAudits
        .filter((a) => a.status === 'concluida')
        .slice()
        .sort(
          (a, b) =>
            new Date(b.completedAt ?? b.updatedAt).getTime() -
            new Date(a.completedAt ?? a.updatedAt).getTime(),
        ),
    [allAudits],
  );
  const questionnaire = useAppStore((s) => s.questionnaire);
  const actionPlans = useAppStore((s) => s.actionPlans);
  const user = useAuthStore((s) => s.user);
  const [sendAudit, setSendAudit] = useState<Audit | null>(null);
  const canEmail = canSendReportEmail(user?.role);

  const plansFor = (auditId: string) =>
    actionPlans.filter((p) => p.auditId === auditId);

  const sendStatusLabel = (audit: Audit) => {
    switch (audit.reportSendStatus) {
      case 'enviado':
        return { text: 'Enviado', className: 'border-olive-200 bg-olive-50 text-olive-800' };
      case 'falha':
        return { text: 'Falha no envio', className: 'border-wine-200 bg-wine-50 text-wine-700' };
      case 'parcialmente_enviado':
        return {
          text: 'Parcialmente enviado',
          className: 'border-gold-300 bg-gold-100 text-gold-900',
        };
      case 'aguardando_envio':
      default:
        return {
          text: 'Aguardando envio',
          className: 'border-gold-300 bg-gold-100 text-gold-900',
        };
    }
  };

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Relatórios em PDF — baixe, visualize ou envie por e-mail (Outlook / Microsoft 365)"
      />
      {audits.length === 0 ? (
        <EmptyState
          title="Nenhum relatório ainda"
          description="Finalize uma auditoria para gerar o PDF e enviar aos destinatários."
        />
      ) : null}
      <div className="space-y-3">
        {audits.map((audit) => {
          const status = sendStatusLabel(audit);
          return (
            <Card
              key={audit.id}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-ink">{audit.code}</p>
                <p className="text-sm text-ink-muted">
                  {audit.sectorName} · {formatDateTime(audit.completedAt)} ·{' '}
                  {audit.conformityPercent}%
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge className={status.className}>{status.text}</Badge>
                  {audit.pdfFileName && (
                    <Badge className="border-cream-300 bg-cream-50 text-ink-muted">
                      {audit.pdfFileName}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/app/auditorias/${audit.id}/finalizada`}>
                  <Button size="sm" variant="outline">
                    Abrir
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    const stored = await getAuditReportPdf(audit.id);
                    if (stored) {
                      const { downloadPdfAttachment } = await import(
                        '../../utils/reportDelivery'
                      );
                      downloadPdfAttachment(stored);
                      return;
                    }
                    await generateAuditPdf(
                      audit,
                      questionnaire,
                      plansFor(audit.id),
                    );
                  }}
                >
                  <FileDown size={16} /> Baixar PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const ok = await openAuditReportPdf(audit.id);
                    if (!ok) {
                      await generateAuditPdf(
                        audit,
                        questionnaire,
                        plansFor(audit.id),
                      );
                    }
                  }}
                >
                  Visualizar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await generateAuditPdf(
                      audit,
                      questionnaire,
                      plansFor(audit.id),
                    );
                    window.print();
                  }}
                >
                  <Printer size={16} /> Imprimir
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const attachment =
                      (await getAuditReportPdf(audit.id)) ??
                      (await generateAuditPdfAttachment(
                        audit,
                        questionnaire,
                        plansFor(audit.id),
                      ));
                    if (attachment.blob) {
                      const file = new File(
                        [attachment.blob],
                        attachment.fileName,
                        { type: 'application/pdf' },
                      );
                      if (
                        navigator.share &&
                        navigator.canShare?.({ files: [file] })
                      ) {
                        await navigator.share({
                          title: `Relatório ${audit.code}`,
                          files: [file],
                        });
                        return;
                      }
                    }
                    await generateAuditPdf(
                      audit,
                      questionnaire,
                      plansFor(audit.id),
                    );
                  }}
                >
                  <Share2 size={16} /> Compartilhar PDF
                </Button>
                {canEmail && (
                  <Button
                    size="sm"
                    onClick={async () => {
                      await generateAuditPdfAttachment(
                        audit,
                        questionnaire,
                        plansFor(audit.id),
                      );
                      setSendAudit(audit);
                    }}
                  >
                    <Mail size={16} /> Enviar relatório em PDF
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {sendAudit && (
        <SendReportModal
          open={Boolean(sendAudit)}
          onClose={() => setSendAudit(null)}
          audit={sendAudit}
          questionnaire={questionnaire}
          actionPlans={actionPlans.filter((p) => p.auditId === sendAudit.id)}
          user={user}
          onSent={() => {
            updateAudit(sendAudit.id, { reportSendStatus: 'enviado' });
          }}
        />
      )}
    </div>
  );
}
