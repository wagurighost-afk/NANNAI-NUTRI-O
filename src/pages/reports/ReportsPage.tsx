import { useState } from 'react';
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

export function ReportsPage() {
  const audits = useAppStore((s) => s.audits.filter((a) => a.status === 'concluida'));
  const questionnaire = useAppStore((s) => s.questionnaire);
  const actionPlans = useAppStore((s) => s.actionPlans);
  const user = useAuthStore((s) => s.user);
  const [sendAudit, setSendAudit] = useState<Audit | null>(null);
  const canEmail = canSendReportEmail(user?.role);

  const plansFor = (auditId: string) =>
    actionPlans.filter((p) => p.auditId === auditId);

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="PDF, impressão, compartilhamento e envio por e-mail"
      />
      {audits.length === 0 ? (
        <EmptyState
          title="Nenhum relatório ainda"
          description="Finalize uma auditoria para gerar PDF e enviar aos destinatários."
        />
      ) : null}
      <div className="space-y-3">
        {audits.map((audit) => (
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
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {audit.syncStatus === 'pending' && (
                <Badge className="border-gold-300 bg-gold-100 text-gold-800">
                  Pendente sync
                </Badge>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  generateAuditPdf(audit, questionnaire, plansFor(audit.id))
                }
              >
                <FileDown size={16} /> PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await generateAuditPdf(audit, questionnaire, plansFor(audit.id));
                  window.print();
                }}
              >
                <Printer size={16} /> Imprimir
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const attachment = await generateAuditPdfAttachment(
                    audit,
                    questionnaire,
                    plansFor(audit.id),
                  );
                  if (attachment.blob) {
                    const file = new File([attachment.blob], attachment.fileName, {
                      type: 'application/pdf',
                    });
                    if (navigator.share && navigator.canShare?.({ files: [file] })) {
                      await navigator.share({
                        title: `Relatório ${audit.code}`,
                        files: [file],
                      });
                      return;
                    }
                  }
                  await generateAuditPdf(audit, questionnaire, plansFor(audit.id));
                }}
              >
                <Share2 size={16} /> Compartilhar
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
                  <Mail size={16} /> Enviar por e-mail
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {sendAudit && (
        <SendReportModal
          open={Boolean(sendAudit)}
          onClose={() => setSendAudit(null)}
          audit={sendAudit}
          questionnaire={questionnaire}
          actionPlans={actionPlans.filter((p) => p.auditId === sendAudit.id)}
          user={user}
        />
      )}
    </div>
  );
}
