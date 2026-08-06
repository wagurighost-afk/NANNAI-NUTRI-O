import { Link } from 'react-router-dom';
import { PageHeader, Card, Badge, EmptyState } from '../../components/ui/Card';
import { useAppStore } from '../../stores/appStore';
import {
  actionStatusColors,
  actionStatusLabels,
  formatDate,
  priorityColors,
  priorityLabels,
} from '../../utils';

export function ActionPlansPage() {
  const plans = useAppStore((s) => s.actionPlans);

  return (
    <div>
      <PageHeader
        title="Planos de ação"
        subtitle="Acompanhamento de não conformidades e ações corretivas"
      />
      {plans.length === 0 ? (
        <EmptyState title="Nenhum plano de ação" />
      ) : (
        <div className="space-y-3">
          {plans.map((p) => (
            <Link key={p.id} to={`/app/planos-de-acao/${p.id}`}>
              <Card className="mb-3 transition hover:border-olive-300">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{p.nonConformityDescription}</p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {p.sectorName} · {p.auditCode} · Prazo {formatDate(p.dueDate)}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      Resp.: {p.responsibleName}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={actionStatusColors[p.status]}>
                      {actionStatusLabels[p.status]}
                    </Badge>
                    <span className={`text-xs font-semibold ${priorityColors[p.priority]}`}>
                      {priorityLabels[p.priority]}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
