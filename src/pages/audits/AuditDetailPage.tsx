import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { FileDown, Mail, Printer, Share2 } from 'lucide-react';
import { PageHeader, Card, Badge, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAppStore } from '../../stores/appStore';
import { useAuthStore } from '../../stores/authStore';
import {
  actionStatusColors,
  actionStatusLabels,
  computeAuditTotals,
  conformityColors,
  conformityLabels,
  formatDateTime,
} from '../../utils';
import {
  generateAuditPdf,
  generateAuditPdfAttachment,
  type AuditPdfAttachment,
} from '../../services/pdfReport';
import { SendReportModal } from '../../components/email/SendReportModal';
import { canSendReportEmail } from '../../utils/email';

export function AuditDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const audit = useAppStore((s) => s.audits.find((a) => a.id === id));
  const questionnaire = useAppStore((s) => s.questionnaire);
  const allPlans = useAppStore((s) => s.actionPlans);
  const actionPlans = useMemo(
    () => allPlans.filter((p) => p.auditId === id),
    [allPlans, id],
  );
  const user = useAuthStore((s) => s.user);
  const [sendOpen, setSendOpen] = useState(searchParams.get('enviar') === '1');
  const [pdfAttachment, setPdfAttachment] = useState<AuditPdfAttachment | null>(
    null,
  );
  const [pdfBusy, setPdfBusy] = useState(false);
  const [shareMsg, setShareMsg] = useState('');

  if (!audit) return <Card>Auditoria não encontrada.</Card>;

  const totals = computeAuditTotals(audit.answers, questionnaire);
  const canEmail = canSendReportEmail(user?.role) && audit.status === 'concluida';

  const handleGeneratePdf = async () => {
    setPdfBusy(true);
    try {
      const attachment = await generateAuditPdfAttachment(
        audit,
        questionnaire,
        actionPlans,
      );
      setPdfAttachment(attachment);
      await generateAuditPdf(audit, questionnaire, actionPlans);
    } finally {
      setPdfBusy(false);
    }
  };

  const handlePrint = async () => {
    setPdfBusy(true);
    try {
      await generateAuditPdf(audit, questionnaire, actionPlans);
      window.print();
    } finally {
      setPdfBusy(false);
    }
  };

  const handleShare = async () => {
    setPdfBusy(true);
    try {
      const attachment = await generateAuditPdfAttachment(
        audit,
        questionnaire,
        actionPlans,
      );
      setPdfAttachment(attachment);
      if (attachment.blob) {
        const file = new File([attachment.blob], attachment.fileName, {
          type: 'application/pdf',
        });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: `Relatório ${audit.code}`,
            text: `${audit.unitName} · ${audit.sectorName} · ${audit.conformityPercent}%`,
            files: [file],
          });
          setShareMsg('Compartilhamento iniciado.');
          return;
        }
      }
      await generateAuditPdf(audit, questionnaire, actionPlans);
      setShareMsg('PDF baixado. Compartilhe o arquivo pelo dispositivo.');
    } catch {
      setShareMsg('Não foi possível compartilhar neste dispositivo.');
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={audit.code}
        subtitle={`${audit.sectorName} · ${audit.unitName}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {audit.status === 'em_andamento' && (
              <Link to={`/app/auditorias/${audit.id}/executar`}>
                <Button>Continuar</Button>
              </Link>
            )}
            {audit.status === 'concluida' && (
              <>
                <Button
                  variant="secondary"
                  disabled={pdfBusy}
                  onClick={handleGeneratePdf}
                >
                  <FileDown size={16} /> {pdfBusy ? 'Gerando…' : 'PDF'}
                </Button>
                <Button variant="outline" disabled={pdfBusy} onClick={handlePrint}>
                  <Printer size={16} /> Imprimir
                </Button>
                <Button variant="outline" disabled={pdfBusy} onClick={handleShare}>
                  <Share2 size={16} /> Compartilhar
                </Button>
                {canEmail && (
                  <Button onClick={() => setSendOpen(true)}>
                    <Mail size={16} /> Enviar por e-mail
                  </Button>
                )}
              </>
            )}
            {audit.status !== 'concluida' && (
              <Button
                variant="secondary"
                disabled={pdfBusy}
                onClick={handleGeneratePdf}
              >
                <FileDown size={16} /> {pdfBusy ? 'Gerando…' : 'PDF'}
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge
          className={
            audit.status === 'concluida'
              ? 'border-olive-200 bg-olive-50 text-olive-800'
              : 'border-gold-200 bg-gold-50 text-gold-900'
          }
        >
          {audit.status === 'concluida' ? 'Concluída' : 'Em andamento'}
        </Badge>
        {audit.syncStatus === 'pending' && (
          <Badge className="border-gold-300 bg-gold-100 text-gold-800">
            Dados não sincronizados
          </Badge>
        )}
        {pdfAttachment && (
          <Badge className="border-olive-200 bg-olive-50 text-olive-800">
            PDF pronto para envio
          </Badge>
        )}
      </div>

      {shareMsg && (
        <p className="mb-4 rounded-xl border border-olive-200 bg-olive-50 px-3 py-2 text-sm text-olive-800">
          {shareMsg}
        </p>
      )}

      {searchParams.get('finalizada') === '1' && audit.status === 'concluida' && (
        <Card className="mb-4 border-olive-200 bg-olive-50/50">
          <h3 className="font-display text-lg font-semibold text-wine-700">
            Auditoria finalizada
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            Gere o PDF, imprima, compartilhe ou envie o relatório aos destinatários
            cadastrados.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={pdfBusy} onClick={handleGeneratePdf}>
              <FileDown size={16} /> PDF
            </Button>
            <Button size="sm" variant="outline" disabled={pdfBusy} onClick={handlePrint}>
              <Printer size={16} /> Imprimir
            </Button>
            <Button size="sm" variant="outline" disabled={pdfBusy} onClick={handleShare}>
              <Share2 size={16} /> Compartilhar
            </Button>
            {canEmail && (
              <Button size="sm" onClick={() => setSendOpen(true)}>
                <Mail size={16} /> Escolher destinatários e enviar
              </Button>
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pontuação" value={`${totals.score}/${totals.maxScore}`} />
        <StatCard label="Conformidade" value={`${totals.conformityPercent}%`} accent="olive" />
        <StatCard label="Auditor" value={audit.auditorName} accent="wine" />
        <StatCard
          label="Data"
          value={formatDateTime(audit.completedAt ?? audit.startedAt)}
          accent="gold"
        />
      </div>

      {audit.generalComment && (
        <Card className="mt-4">
          <h3 className="font-display text-lg font-semibold text-wine-700">
            Comentário geral
          </h3>
          <p className="mt-2 text-sm text-ink">{audit.generalComment}</p>
        </Card>
      )}

      <Card className="mt-4">
        <h3 className="mb-3 font-display text-lg font-semibold text-wine-700">
          Respostas
        </h3>
        <div className="space-y-4">
          {questionnaire.sections.map((section) => (
            <div key={section.id}>
              <p className="mb-2 text-sm font-semibold text-olive-700">
                {section.name}
              </p>
              {section.questions.map((q) => {
                const a = audit.answers[q.id];
                if (!a?.status) return null;
                return (
                  <div
                    key={q.id}
                    className="mb-3 rounded-xl border border-cream-200 bg-cream-50/50 p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm text-ink">{q.text}</p>
                      <Badge className={conformityColors[a.status]}>
                        {conformityLabels[a.status]}
                      </Badge>
                    </div>
                    {a.comment && (
                      <p className="mt-2 text-xs text-ink-muted">{a.comment}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      {actionPlans.length > 0 && (
        <Card className="mt-4">
          <h3 className="mb-3 font-display text-lg font-semibold text-wine-700">
            Planos de ação
          </h3>
          <ul className="space-y-2">
            {actionPlans.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/app/planos-de-acao/${p.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg p-2 hover:bg-cream-100"
                >
                  <span className="text-sm">{p.nonConformityDescription}</span>
                  <Badge className={actionStatusColors[p.status]}>
                    {actionStatusLabels[p.status]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(audit.auditorSignature || audit.responsibleSignature) && (
        <Card className="mt-4">
          <h3 className="mb-3 font-display text-lg font-semibold text-wine-700">
            Assinaturas
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-ink-muted">Auditor</p>
              <p className="font-medium">{audit.auditorSignature?.name}</p>
              <p className="text-xs text-ink-muted">
                {formatDateTime(audit.auditorSignature?.signedAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Responsável</p>
              <p className="font-medium">{audit.responsibleSignature?.name}</p>
              <p className="text-xs text-ink-muted">
                {formatDateTime(audit.responsibleSignature?.signedAt)}
              </p>
            </div>
          </div>
        </Card>
      )}

      <SendReportModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        audit={audit}
        questionnaire={questionnaire}
        actionPlans={actionPlans}
        user={user}
        attachment={pdfAttachment}
      />
    </div>
  );
}
