import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Card, Badge, EmptyState, StatCard } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { useAppStore } from '../../stores/appStore';
import {
  actionStatusColors,
  actionStatusLabels,
  formatDate,
  priorityColors,
  priorityLabels,
} from '../../utils';
import { daysOverdue, daysUntilDue } from '../../utils/notifications';
import type { ActionPlanStatus, Priority } from '../../types';

export function ActionPlansPage() {
  const plans = useAppStore((s) => s.actionPlans);
  const sectors = useAppStore((s) => s.sectors);
  const users = useAppStore((s) => s.users);

  const [sectorId, setSectorId] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');

  const filtered = useMemo(() => {
    return plans.filter((p) => {
      if (sectorId && p.sectorId !== sectorId) return false;
      if (responsibleId && p.responsibleId !== responsibleId) return false;
      if (priority && p.priority !== priority) return false;
      if (status && p.status !== status) return false;
      if (periodFrom && p.dueDate < periodFrom) return false;
      if (periodTo && p.dueDate > periodTo) return false;
      return true;
    });
  }, [plans, sectorId, responsibleId, priority, status, periodFrom, periodTo]);

  const overdueCount = plans.filter(
    (p) => p.status !== 'concluido' && (p.status === 'atrasado' || daysUntilDue(p.dueDate) < 0),
  ).length;
  const openCount = plans.filter((p) => p.status !== 'concluido').length;
  const doneCount = plans.filter((p) => p.status === 'concluido').length;

  return (
    <div>
      <PageHeader
        title="Planos de ação"
        subtitle="Painel exclusivo de acompanhamento de não conformidades"
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Abertos" value={openCount} accent="gold" />
        <StatCard label="Vencidos" value={overdueCount} accent="wine" />
        <StatCard label="Concluídos" value={doneCount} accent="olive" />
      </div>

      <Card className="mb-4">
        <h3 className="mb-3 text-sm font-semibold text-ink">Filtros</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Select
            label="Setor"
            value={sectorId}
            onChange={(e) => setSectorId(e.target.value)}
            options={[
              { value: '', label: 'Todos' },
              ...sectors.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
          <Select
            label="Responsável"
            value={responsibleId}
            onChange={(e) => setResponsibleId(e.target.value)}
            options={[
              { value: '', label: 'Todos' },
              ...users.map((u) => ({ value: u.id, label: u.name })),
            ]}
          />
          <Select
            label="Prioridade"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            options={[
              { value: '', label: 'Todas' },
              ...(Object.keys(priorityLabels) as Priority[]).map((p) => ({
                value: p,
                label: priorityLabels[p],
              })),
            ]}
          />
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: '', label: 'Todos' },
              ...(Object.keys(actionStatusLabels) as ActionPlanStatus[]).map(
                (s) => ({
                  value: s,
                  label: actionStatusLabels[s],
                }),
              ),
            ]}
          />
          <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1 xl:col-span-1">
            <Input
              label="De"
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
            />
            <Input
              label="Até"
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title={plans.length === 0 ? 'Nenhum plano de ação' : 'Nenhum resultado'}
          description={
            plans.length === 0
              ? 'Planos são gerados a partir de não conformidades nas auditorias.'
              : 'Ajuste os filtros para ver outros planos.'
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-cream-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-cream-200 bg-cream-50 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Responsável</th>
                <th className="px-3 py-3 font-semibold">Setor</th>
                <th className="px-3 py-3 font-semibold">Prazo</th>
                <th className="px-3 py-3 font-semibold">Dias restantes</th>
                <th className="px-3 py-3 font-semibold">Dias em atraso</th>
                <th className="px-3 py-3 font-semibold">Prioridade</th>
                <th className="px-3 py-3 font-semibold">NC</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const remaining = daysUntilDue(p.dueDate);
                const overdue = daysOverdue(p.dueDate);
                return (
                  <tr
                    key={p.id}
                    className="border-b border-cream-100 transition hover:bg-cream-50/80"
                  >
                    <td className="px-3 py-3">
                      <Link to={`/app/planos-de-acao/${p.id}`}>
                        <Badge className={actionStatusColors[p.status]}>
                          {actionStatusLabels[p.status]}
                        </Badge>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-ink">{p.responsibleName}</td>
                    <td className="px-3 py-3 text-ink">{p.sectorName}</td>
                    <td className="px-3 py-3 text-ink">{formatDate(p.dueDate)}</td>
                    <td className="px-3 py-3 text-ink">
                      {p.status === 'concluido'
                        ? '—'
                        : remaining >= 0
                          ? remaining
                          : '0'}
                    </td>
                    <td className="px-3 py-3 font-medium text-wine-700">
                      {p.status === 'concluido' ? '—' : overdue > 0 ? overdue : '0'}
                    </td>
                    <td className={`px-3 py-3 font-semibold ${priorityColors[p.priority]}`}>
                      {priorityLabels[p.priority]}
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-3 text-ink-muted">
                      <Link
                        to={`/app/planos-de-acao/${p.id}`}
                        className="hover:text-olive-700 hover:underline"
                      >
                        {p.nonConformityDescription}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
