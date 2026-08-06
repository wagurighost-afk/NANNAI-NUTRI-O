import { Link } from 'react-router-dom';
import { Eye, Play } from 'lucide-react';
import { PageHeader, Card, Badge, EmptyState } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAppStore } from '../../stores/appStore';
import { formatDateTime, cn } from '../../utils';

export function AuditsListPage() {
  const audits = useAppStore((s) => s.audits);
  const completed = audits.filter((a) => a.status === 'concluida');
  const inProgress = audits.filter((a) => a.status === 'em_andamento');

  return (
    <div>
      <PageHeader
        title="Auditorias"
        subtitle="Concluídas e em andamento"
        actions={
          <Link to="/app/auditorias/nova">
            <Button>Nova auditoria</Button>
          </Link>
        }
      />

      <section className="mb-8">
        <h2 className="mb-3 font-display text-xl font-semibold text-wine-700">
          Em andamento
        </h2>
        {inProgress.length === 0 ? (
          <EmptyState
            title="Nenhuma auditoria em andamento"
            description="Inicie uma nova auditoria para começar."
            action={
              <Link to="/app/auditorias/nova">
                <Button>Nova auditoria</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {inProgress.map((a) => (
              <AuditCard key={a.id} audit={a} mode="continue" />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold text-wine-700">
          Concluídas
        </h2>
        {completed.length === 0 ? (
          <EmptyState title="Nenhuma auditoria concluída ainda" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {completed.map((a) => (
              <AuditCard key={a.id} audit={a} mode="view" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AuditCard({
  audit,
  mode,
}: {
  audit: ReturnType<typeof useAppStore.getState>['audits'][number];
  mode: 'continue' | 'view';
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-ink">{audit.code}</p>
          <p className="text-sm text-ink-muted">
            {audit.sectorName} · {audit.unitName}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
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
              Não sincronizado
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-ink-muted">
        <span>Auditor: {audit.auditorName}</span>
        <span>{formatDateTime(audit.startedAt)}</span>
        <span
          className={cn(
            'font-medium',
            audit.conformityPercent >= 85 ? 'text-olive-700' : 'text-wine-700',
          )}
        >
          {audit.conformityPercent}% conformidade
        </span>
      </div>
      <div className="mt-auto flex gap-2">
        {mode === 'continue' ? (
          <Link to={`/app/auditorias/${audit.id}/executar`}>
            <Button size="sm">
              <Play size={16} /> Continuar
            </Button>
          </Link>
        ) : null}
        <Link to={`/app/auditorias/${audit.id}`}>
          <Button size="sm" variant={mode === 'view' ? 'primary' : 'outline'}>
            <Eye size={16} /> Detalhes
          </Button>
        </Link>
      </div>
    </Card>
  );
}
