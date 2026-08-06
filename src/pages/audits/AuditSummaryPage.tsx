import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader, Card, Badge, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAppStore } from '../../stores/appStore';
import {
  computeAuditTotals,
  conformityColors,
  conformityLabels,
} from '../../utils';

export function AuditSummaryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const audit = useAppStore((s) => s.audits.find((a) => a.id === id));
  const questionnaire = useAppStore((s) => s.questionnaire);
  const actionPlans = useAppStore((s) =>
    s.actionPlans.filter((p) => p.auditId === id),
  );

  if (!audit) {
    return <Card>Auditoria não encontrada.</Card>;
  }

  const totals = computeAuditTotals(audit.answers);

  return (
    <div>
      <PageHeader
        title="Resumo da auditoria"
        subtitle={audit.code}
        actions={
          <div className="flex gap-2">
            <Link to={`/app/auditorias/${audit.id}/executar`}>
              <Button variant="outline">Continuar respondendo</Button>
            </Link>
            <Button onClick={() => navigate(`/app/auditorias/${audit.id}/encerrar`)}>
              Encerrar e assinar
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pontuação" value={`${totals.score}/${totals.maxScore}`} accent="olive" />
        <StatCard label="Conformidade" value={`${totals.conformityPercent}%`} accent="gold" />
        <StatCard label="Conformes" value={totals.conforme} accent="olive" />
        <StatCard label="Não conformes" value={totals.naoConforme} accent="wine" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Parcialmente conformes" value={totals.parcial} accent="gold" />
        <StatCard label="Não se aplica" value={totals.na} accent="cream" />
        <StatCard label="Planos de ação" value={actionPlans.length} accent="wine" />
      </div>

      <div className="mt-6 space-y-4">
        {questionnaire.sections.map((section) => (
          <Card key={section.id}>
            <h3 className="mb-3 font-display text-lg font-semibold text-wine-700">
              {section.name}
            </h3>
            <ul className="space-y-3">
              {section.questions.map((q) => {
                const a = audit.answers[q.id];
                return (
                  <li
                    key={q.id}
                    className="flex flex-col gap-1 border-b border-cream-200 pb-3 last:border-0 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <p className="text-sm text-ink">{q.text}</p>
                    <Badge
                      className={
                        a?.status
                          ? conformityColors[a.status]
                          : 'border-stone-200 bg-stone-50 text-stone-500'
                      }
                    >
                      {a?.status ? conformityLabels[a.status] : 'Pendente'}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
