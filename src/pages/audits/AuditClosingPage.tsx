import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader, Card, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { Input } from '../../components/ui/Input';
import { useAppStore } from '../../stores/appStore';
import { computeAuditTotals } from '../../utils';
import { saveAuditOffline } from '../../services/offlineDb';
import {
  auditPdfMetaPatch,
  ensureBoundAuditReportPdf,
} from '../../services/auditReportBinding';

export function AuditClosingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const audit = useAppStore((s) => s.audits.find((a) => a.id === id));
  const questionnaire = useAppStore((s) => s.questionnaire);
  const allPlans = useAppStore((s) => s.actionPlans);
  const actionPlans = useMemo(
    () => allPlans.filter((p) => p.auditId === id),
    [allPlans, id],
  );
  const completeAudit = useAppStore((s) => s.completeAudit);
  const updateAudit = useAppStore((s) => s.updateAudit);

  const [comment, setComment] = useState(audit?.generalComment ?? '');
  const [auditorName, setAuditorName] = useState(audit?.auditorName ?? '');
  const [responsibleName, setResponsibleName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const auditorCanvas = useRef<HTMLCanvasElement>(null);
  const responsibleCanvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<{
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
  } | null>(null);

  if (!audit) return <Card>Auditoria não encontrada.</Card>;

  const totals = computeAuditTotals(audit.answers, questionnaire);

  const startDraw = (
    e: React.PointerEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement | null,
  ) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#5c2e35';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    drawing.current = { canvas, ctx };
    canvas.setPointerCapture(e.pointerId);
  };

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const { canvas, ctx } = drawing.current;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const endDraw = () => {
    drawing.current = null;
  };

  const clearCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const finish = async () => {
    setError('');
    if (totals.pending > 0) {
      setError(
        `Há ${totals.pending} pergunta(s) obrigatória(s) sem resposta. Complete o questionário antes de finalizar.`,
      );
      return;
    }
    if (!auditorName.trim()) {
      setError('Informe o nome do auditor.');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      completeAudit(audit.id, {
        generalComment: comment,
        auditorSignature: {
          name: auditorName.trim(),
          role: 'Auditor',
          signedAt: now,
          dataUrl: auditorCanvas.current?.toDataURL() ?? '',
        },
        responsibleSignature: {
          name: responsibleName.trim() || 'Responsável',
          role: 'Responsável pelo setor',
          signedAt: now,
          dataUrl: responsibleCanvas.current?.toDataURL() ?? '',
        },
      });

      const latest = useAppStore.getState().audits.find((a) => a.id === audit.id);
      if (!latest) throw new Error('Auditoria não encontrada após salvar.');

      // Garante totais finais persistidos
      const finalTotals = computeAuditTotals(latest.answers, questionnaire);
      updateAudit(latest.id, {
        score: finalTotals.score,
        maxScore: finalTotals.maxScore,
        conformityPercent: finalTotals.conformityPercent,
        reportSendStatus: 'aguardando_envio',
      });

      const refreshed =
        useAppStore.getState().audits.find((a) => a.id === audit.id) ?? latest;

      const { attachment, reportId } = await ensureBoundAuditReportPdf({
        audit: refreshed,
        questionnaire,
        actionPlans,
        forceRegenerate: true,
      });
      updateAudit(refreshed.id, {
        ...auditPdfMetaPatch(attachment, reportId),
        reportSendStatus: 'aguardando_envio',
      });

      const saved =
        useAppStore.getState().audits.find((a) => a.id === audit.id) ??
        refreshed;
      await saveAuditOffline(saved);

      navigate(`/app/auditorias/${audit.id}/finalizada`, { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Falha ao finalizar e gerar o relatório PDF.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Encerramento e assinaturas" subtitle={audit.code} />

      {totals.pending > 0 && (
        <p className="mb-4 rounded-xl border border-gold-200 bg-gold-50 px-3 py-2 text-sm text-gold-900">
          Ainda há {totals.pending} pergunta(s) pendente(s). Todas as perguntas
          obrigatórias precisam ser respondidas antes de finalizar.
        </p>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pontuação obtida" value={totals.score} accent="olive" />
        <StatCard label="Pontuação máxima" value={totals.maxScore} accent="gold" />
        <StatCard
          label="% Conformidade"
          value={`${totals.conformityPercent}%`}
          accent="wine"
        />
        <StatCard label="Planos gerados" value={actionPlans.length} accent="cream" />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Conformes" value={totals.conforme} />
        <StatCard label="Parciais" value={totals.parcial} accent="gold" />
        <StatCard label="Não conformes" value={totals.naoConforme} accent="wine" />
        <StatCard label="Pendentes" value={totals.pending} accent="gold" />
      </div>

      <Card className="mb-4">
        <Textarea
          label="Comentário geral"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Observações finais da auditoria…"
        />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <Input
            label="Nome do auditor"
            value={auditorName}
            onChange={(e) => setAuditorName(e.target.value)}
          />
          <p className="mb-2 mt-4 text-sm font-medium text-ink">
            Assinatura do auditor
          </p>
          <canvas
            ref={auditorCanvas}
            width={360}
            height={140}
            className="w-full touch-none rounded-xl border border-cream-300 bg-white"
            onPointerDown={(e) => startDraw(e, auditorCanvas.current)}
            onPointerMove={moveDraw}
            onPointerUp={endDraw}
          />
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => clearCanvas(auditorCanvas.current)}
          >
            Limpar
          </Button>
        </Card>

        <Card>
          <Input
            label="Nome do responsável"
            value={responsibleName}
            onChange={(e) => setResponsibleName(e.target.value)}
            placeholder="Responsável pelo setor"
          />
          <p className="mb-2 mt-4 text-sm font-medium text-ink">
            Assinatura do responsável
          </p>
          <canvas
            ref={responsibleCanvas}
            width={360}
            height={140}
            className="w-full touch-none rounded-xl border border-cream-300 bg-white"
            onPointerDown={(e) => startDraw(e, responsibleCanvas.current)}
            onPointerMove={moveDraw}
            onPointerUp={endDraw}
          />
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => clearCanvas(responsibleCanvas.current)}
          >
            Limpar
          </Button>
        </Card>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-wine-50 px-3 py-2 text-sm text-wine-700">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={finish} disabled={saving || totals.pending > 0}>
          {saving
            ? 'Finalizando e gerando PDF…'
            : 'Finalizar auditoria'}
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate(`/app/auditorias/${audit.id}/resumo`)}
        >
          Voltar ao resumo
        </Button>
      </div>
    </div>
  );
}
