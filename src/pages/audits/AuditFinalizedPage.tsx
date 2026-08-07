import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Eye,
  FileDown,
  LayoutDashboard,
  Mail,
} from 'lucide-react';
import { PageHeader, Card, StatCard, Badge, Modal } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAppStore } from '../../stores/appStore';
import { useAuthStore } from '../../stores/authStore';
import {
  computeAuditTotals,
  formatDate,
  formatDateTime,
} from '../../utils';
import { canSendReportEmail, hasCriticalNonConformity } from '../../utils/email';
import {
  generateAuditPdf,
  type AuditPdfAttachment,
} from '../../services/pdfReport';
import { openAuditReportPdf } from '../../services/auditReportStorage';
import {
  auditPdfMetaPatch,
  ensureBoundAuditReportPdf,
} from '../../services/auditReportBinding';
import { downloadPdfAttachment } from '../../utils/reportDelivery';
import { SendReportModal } from '../../components/email/SendReportModal';

export function AuditFinalizedPage() {
  const { id } = useParams();
  const audit = useAppStore((s) => s.audits.find((a) => a.id === id));
  const questionnaire = useAppStore((s) => s.questionnaire);
  const allPlans = useAppStore((s) => s.actionPlans);
  const updateAudit = useAppStore((s) => s.updateAudit);
  const user = useAuthStore((s) => s.user);

  const actionPlans = useMemo(
    () => allPlans.filter((p) => p.auditId === id),
    [allPlans, id],
  );

  const [attachment, setAttachment] = useState<AuditPdfAttachment | null>(null);
  const [busy, setBusy] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [msg, setMsg] = useState('');

  const totals = useMemo(
    () => (audit ? computeAuditTotals(audit.answers, questionnaire) : null),
    [audit, questionnaire],
  );

  const criticalCount = useMemo(() => {
    if (!audit) return 0;
    const criticalIds = new Set(
      questionnaire.sections
        .flatMap((s) => s.questions)
        .filter((q) => q.critical)
        .map((q) => q.id),
    );
    return Object.values(audit.answers).filter(
      (a) =>
        criticalIds.has(a.questionId) &&
        (a.status === 'nao_conforme' || a.status === 'parcialmente_conforme'),
    ).length;
  }, [audit, questionnaire]);

  const canEmail = canSendReportEmail(user?.role);

  useEffect(() => {
    if (!audit || audit.status !== 'concluida') return;
    let cancelled = false;

    (async () => {
      setBusy(true);
      try {
        const { attachment: pdf, reportId } = await ensureBoundAuditReportPdf({
          audit,
          questionnaire,
          actionPlans,
        });
        updateAudit(audit.id, {
          ...auditPdfMetaPatch(pdf, reportId),
          reportSendStatus: audit.reportSendStatus ?? 'aguardando_envio',
        });
        if (!cancelled) {
          setAttachment(pdf);
          if (
            canEmail &&
            (audit.reportSendStatus === 'aguardando_envio' ||
              !audit.reportSendStatus)
          ) {
            setOfferOpen(true);
          }
        }
      } catch {
        if (!cancelled) setMsg('Não foi possível preparar o PDF automaticamente.');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audit?.id]);

  if (!audit || !totals) {
    return (
      <Card>
        <p>Auditoria não encontrada.</p>
        <Link to="/app" className="mt-2 inline-block text-olive-700 underline">
          Voltar ao Dashboard
        </Link>
      </Card>
    );
  }

  if (audit.status !== 'concluida') {
    return <NavigateIncomplete auditId={audit.id} />;
  }

  const ensurePdf = async () => {
    if (attachment) return attachment;
    setBusy(true);
    try {
      const { attachment: pdf, reportId } = await ensureBoundAuditReportPdf({
        audit,
        questionnaire,
        actionPlans,
      });
      updateAudit(audit.id, auditPdfMetaPatch(pdf, reportId));
      setAttachment(pdf);
      return pdf;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Auditoria finalizada com sucesso"
        subtitle={audit.code}
      />

      <Card className="mb-4 border-olive-200 bg-olive-50/60">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 shrink-0 text-olive-600" size={28} />
          <div>
            <p className="font-display text-xl font-semibold text-wine-700">
              Auditoria finalizada com sucesso
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              O relatório em PDF foi gerado e está pronto para visualização ou
              envio por e-mail (Outlook / Microsoft 365).
            </p>
            {hasCriticalNonConformity(audit, questionnaire) && (
              <Badge className="mt-2 border-wine-200 bg-wine-50 text-wine-700">
                Contém não conformidades críticas
              </Badge>
            )}
          </div>
        </div>
      </Card>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="% Conformidade"
          value={`${totals.conformityPercent}%`}
          accent="olive"
        />
        <StatCard
          label="Pontuação obtida"
          value={`${totals.score}/${totals.maxScore}`}
          accent="gold"
        />
        <StatCard label="Conformes" value={totals.conforme} accent="olive" />
        <StatCard
          label="Parcialmente conformes"
          value={totals.parcial}
          accent="gold"
        />
        <StatCard
          label="Não conformidades"
          value={totals.naoConforme}
          accent="wine"
        />
        <StatCard
          label="NCs críticas"
          value={criticalCount}
          accent="wine"
        />
        <StatCard
          label="Planos de ação"
          value={actionPlans.length}
          accent="cream"
        />
        <StatCard
          label="Status do envio"
          value={
            audit.reportSendStatus === 'enviado'
              ? 'Enviado'
              : audit.reportSendStatus === 'falha'
                ? 'Falha'
                : 'Aguardando envio'
          }
          accent="gold"
        />
      </div>

      <Card className="mb-6">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <Row label="Data" value={formatDateTime(audit.completedAt)} />
          <Row label="Unidade" value={audit.unitName} />
          <Row label="Setor" value={audit.sectorName} />
          <Row label="Auditor responsável" value={audit.auditorName} />
          <Row
            label="Anexo PDF"
            value={
              attachment?.fileName ??
              audit.pdfFileName ??
              (busy ? 'Preparando…' : '—')
            }
          />
          <Row label="Código" value={audit.code} />
        </div>
      </Card>

      {msg && (
        <p className="mb-4 rounded-xl border border-gold-200 bg-gold-50 px-3 py-2 text-sm text-gold-900">
          {msg}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={busy}
          onClick={async () => {
            const ok = await openAuditReportPdf(audit.id);
            if (!ok) {
              const pdf = await ensurePdf();
              if (pdf?.blob) {
                const url = URL.createObjectURL(pdf.blob);
                window.open(url, '_blank', 'noopener,noreferrer');
              }
            }
          }}
        >
          <Eye size={16} />
          Visualizar relatório
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={async () => {
            const pdf = await ensurePdf();
            if (pdf) downloadPdfAttachment(pdf);
            else await generateAuditPdf(audit, questionnaire, actionPlans);
          }}
        >
          <FileDown size={16} />
          Baixar PDF
        </Button>
        {canEmail && (
          <Button
            disabled={busy}
            onClick={async () => {
              await ensurePdf();
              setSendOpen(true);
            }}
          >
            <Mail size={16} />
            Enviar relatório por e-mail
          </Button>
        )}
        <Link to="/app">
          <Button variant="outline">
            <LayoutDashboard size={16} />
            Voltar ao Dashboard
          </Button>
        </Link>
      </div>

      <Modal
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
        title="Deseja enviar o relatório agora?"
      >
        <p className="text-sm text-ink-muted">
          A auditoria de <strong>{audit.sectorName}</strong> foi finalizada em{' '}
          {formatDate(audit.completedAt)} com{' '}
          <strong>{totals.conformityPercent}%</strong> de conformidade.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Você pode enviar o PDF agora aos destinatários cadastrados (Outlook /
          Microsoft 365) ou deixar para depois em Relatórios — status{' '}
          <strong>Aguardando envio</strong>.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            onClick={async () => {
              setOfferOpen(false);
              await ensurePdf();
              setSendOpen(true);
            }}
          >
            <Mail size={16} />
            Enviar relatório
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              updateAudit(audit.id, { reportSendStatus: 'aguardando_envio' });
              setOfferOpen(false);
              setMsg(
                'Relatório salvo em Relatórios com status “Aguardando envio”.',
              );
            }}
          >
            Enviar depois
          </Button>
        </div>
      </Modal>

      <SendReportModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        audit={audit}
        questionnaire={questionnaire}
        actionPlans={actionPlans}
        user={user}
        attachment={attachment}
        onSent={() => {
          updateAudit(audit.id, { reportSendStatus: 'enviado' });
          setMsg('Relatório enviado. O status foi atualizado para Enviado.');
        }}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-cream-200 pb-2">
      <span className="text-xs uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

function NavigateIncomplete({ auditId }: { auditId: string }) {
  return (
    <Card>
      <p className="text-sm text-ink-muted">
        Esta auditoria ainda não foi finalizada.
      </p>
      <Link
        to={`/app/auditorias/${auditId}/encerrar`}
        className="mt-3 inline-block text-olive-700 underline"
      >
        Ir para encerramento
      </Link>
    </Card>
  );
}
