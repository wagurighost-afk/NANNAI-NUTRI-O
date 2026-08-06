import { useState } from 'react';
import { FileDown, Mail } from 'lucide-react';
import { PageHeader, Card, Badge } from '../../components/ui/Card';
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

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Gere PDF e envie por e-mail com logo NANNAI, pontuação e planos de ação"
      />
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
                  generateAuditPdf(
                    audit,
                    questionnaire,
                    actionPlans.filter((p) => p.auditId === audit.id),
                  )
                }
              >
                <FileDown size={16} /> Gerar PDF
              </Button>
              {canEmail && (
                <Button
                  size="sm"
                  onClick={async () => {
                    await generateAuditPdfAttachment(
                      audit,
                      questionnaire,
                      actionPlans.filter((p) => p.auditId === audit.id),
                    );
                    setSendAudit(audit);
                  }}
                >
                  <Mail size={16} /> Enviar relatório por e-mail
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
