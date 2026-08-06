import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader, Card, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { Input } from '../../components/ui/Input';
import { useAppStore } from '../../stores/appStore';
import { computeAuditTotals } from '../../utils';
import { saveAuditOffline } from '../../services/offlineDb';

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

  const [comment, setComment] = useState(audit?.generalComment ?? '');
  const [auditorName, setAuditorName] = useState(audit?.auditorName ?? '');
  const [responsibleName, setResponsibleName] = useState('');
  const [saving, setSaving] = useState(false);
  const auditorCanvas = useRef<HTMLCanvasElement>(null);
  const responsibleCanvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null>(null);

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
    setSaving(true);
    const now = new Date().toISOString();
    completeAudit(audit.id, {
      generalComment: comment,
      auditorSignature: {
        name: auditorName,
        role: 'Auditor',
        signedAt: now,
        dataUrl: auditorCanvas.current?.toDataURL() ?? '',
      },
      responsibleSignature: {
        name: responsibleName || 'Responsável',
        role: 'Responsável pelo setor',
        signedAt: now,
        dataUrl: responsibleCanvas.current?.toDataURL() ?? '',
      },
    });
    const latest = useAppStore.getState().audits.find((a) => a.id === audit.id);
    if (latest) await saveAuditOffline(latest);
    setSaving(false);
    navigate(`/app/auditorias/${audit.id}?finalizada=1`);
  };

  return (
    <div>
      <PageHeader
        title="Encerramento e assinaturas"
        subtitle={audit.code}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pontuação obtida" value={totals.score} accent="olive" />
        <StatCard label="Pontuação máxima" value={totals.maxScore} accent="gold" />
        <StatCard label="% Conformidade" value={`${totals.conformityPercent}%`} accent="wine" />
        <StatCard label="Planos gerados" value={actionPlans.length} accent="cream" />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Conformes" value={totals.conforme} />
        <StatCard label="Parciais" value={totals.parcial} accent="gold" />
        <StatCard label="Não conformes" value={totals.naoConforme} accent="wine" />
        <StatCard label="N/A" value={totals.na} />
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
          <p className="mb-2 mt-4 text-sm font-medium text-ink">Assinatura do auditor</p>
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

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={finish} disabled={saving}>
          {saving ? 'Finalizando…' : 'Finalizar auditoria'}
        </Button>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </div>
    </div>
  );
}
