import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Plus } from 'lucide-react';
import { PageHeader, StatCard, Card, Badge } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAppStore } from '../../stores/appStore';
import {
  mockScoreEvolution,
  mockSectorResults,
  mockTopNonConformities,
} from '../../data/mock';
import {
  actionStatusColors,
  actionStatusLabels,
  formatDate,
} from '../../utils';

export function DashboardPage() {
  const audits = useAppStore((s) => s.audits);
  const actionPlans = useAppStore((s) => s.actionPlans);

  const completed = audits.filter((a) => a.status === 'concluida');
  const inProgress = audits.filter((a) => a.status === 'em_andamento');
  const avgScore =
    completed.length > 0
      ? Math.round(
          (completed.reduce((acc, a) => acc + a.conformityPercent, 0) /
            completed.length) *
            10,
        ) / 10
      : 0;
  const openNc = actionPlans.filter(
    (p) => p.status !== 'concluido',
  ).length;
  const overdue = actionPlans.filter((p) => p.status === 'atrasado').length;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral das auditorias e planos de ação"
        actions={
          <Link to="/app/auditorias/nova">
            <Button>
              <Plus size={18} />
              Nova auditoria
            </Button>
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Auditorias realizadas" value={completed.length} accent="olive" />
        <StatCard label="Em andamento" value={inProgress.length} accent="gold" />
        <StatCard label="Pontuação média" value={`${avgScore}%`} accent="wine" />
        <StatCard
          label="% Conformidade"
          value={`${avgScore}%`}
          hint="Média das concluídas"
          accent="olive"
        />
        <StatCard label="NCs abertas" value={openNc} accent="wine" />
        <StatCard label="Planos atrasados" value={overdue} accent="gold" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="font-display text-lg font-semibold text-wine-700">
            Evolução da pontuação
          </h3>
          <p className="mb-4 text-xs text-ink-muted">Últimos 6 meses</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockScoreEvolution}>
                <defs>
                  <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6b7f3a" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6b7f3a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ebe3d4" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="#6b5f57" />
                <YAxis domain={[60, 100]} tick={{ fontSize: 12 }} stroke="#6b5f57" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#6b7f3a"
                  fill="url(#scoreFill)"
                  strokeWidth={2}
                  name="Pontuação"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="font-display text-lg font-semibold text-wine-700">
            Resultado por setor
          </h3>
          <p className="mb-4 text-xs text-ink-muted">Conformidade média (%)</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockSectorResults} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ebe3d4" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="sectorName"
                  width={110}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar dataKey="conformity" fill="#b8954a" radius={[0, 6, 6, 0]} name="Conformidade" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-display text-lg font-semibold text-wine-700">
            Principais não conformidades
          </h3>
          <ul className="space-y-3">
            {mockTopNonConformities.map((item) => (
              <li
                key={item.questionText}
                className="flex items-start justify-between gap-3 border-b border-cream-200 pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{item.questionText}</p>
                  <p className="text-xs text-ink-muted">{item.sectionName}</p>
                </div>
                <Badge className="border-wine-200 bg-wine-50 text-wine-700">
                  {item.count}x
                </Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-wine-700">
              Planos de ação recentes
            </h3>
            <Link to="/app/planos-de-acao" className="text-sm text-olive-700 hover:underline">
              Ver todos
            </Link>
          </div>
          <ul className="space-y-3">
            {actionPlans.slice(0, 5).map((p) => (
              <li key={p.id}>
                <Link
                  to={`/app/planos-de-acao/${p.id}`}
                  className="flex items-start justify-between gap-3 rounded-xl p-2 transition hover:bg-cream-100"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {p.nonConformityDescription}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {p.sectorName} · Prazo {formatDate(p.dueDate)}
                    </p>
                  </div>
                  <Badge className={actionStatusColors[p.status]}>
                    {actionStatusLabels[p.status]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
