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
import {
  addDays,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { Plus } from 'lucide-react';
import { PageHeader, StatCard, Card, Badge } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAppStore } from '../../stores/appStore';
import { useEmailStore } from '../../stores/emailStore';
import {
  buildScoreEvolution,
  buildSectorResults,
  buildTopNonConformities,
} from '../../utils/indicators';
import {
  actionStatusColors,
  actionStatusLabels,
  formatDate,
  formatDateTime,
} from '../../utils';
import { daysUntilDue } from '../../utils/notifications';

export function DashboardPage() {
  const audits = useAppStore((s) => s.audits);
  const actionPlans = useAppStore((s) => s.actionPlans);
  const sectors = useAppStore((s) => s.sectors);
  const questionnaire = useAppStore((s) => s.questionnaire);
  const emailHistory = useEmailStore((s) => s.history);

  const today = startOfDay(new Date());
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const in7 = addDays(today, 7);

  const todayAudits = audits.filter((a) => {
    const ref = a.completedAt ?? a.startedAt;
    return isSameDay(parseISO(ref), today);
  });
  const inProgress = audits.filter((a) => a.status === 'em_andamento');
  const completed = audits.filter((a) => a.status === 'concluida');
  const monthAudits = audits.filter((a) => {
    const ref = parseISO(a.completedAt ?? a.startedAt);
    return isWithinInterval(ref, { start: monthStart, end: monthEnd });
  });

  const avgConformity =
    completed.length > 0
      ? Math.round(
          (completed.reduce((acc, a) => acc + a.conformityPercent, 0) /
            completed.length) *
            10,
        ) / 10
      : 0;

  const openNc = actionPlans.filter((p) => p.status !== 'concluido').length;
  const criticalNc = actionPlans.filter(
    (p) => p.status !== 'concluido' && p.priority === 'critica',
  ).length;
  const overduePlans = actionPlans.filter((p) => {
    if (p.status === 'concluido') return false;
    if (p.status === 'atrasado') return true;
    return daysUntilDue(p.dueDate) < 0;
  }).length;
  const dueIn7 = actionPlans.filter((p) => {
    if (p.status === 'concluido' || p.status === 'atrasado') return false;
    const days = daysUntilDue(p.dueDate);
    return days >= 0 && days <= 7;
  }).length;
  const completedPlans = actionPlans.filter((p) => p.status === 'concluido').length;

  const scoreEvolution = buildScoreEvolution(audits);
  const sectorResults = buildSectorResults(audits);
  const topNcs = buildTopNonConformities(audits, questionnaire.sections);

  const sectorIndicators = sectors
    .filter((s) => s.active)
    .map((s) => {
      const result = sectorResults.find((r) => r.sectorName === s.name);
      return {
        id: s.id,
        name: s.name,
        conformity: result?.conformity ?? null,
        audits: result?.audits ?? 0,
      };
    });

  const recentReports = completed
    .slice()
    .sort(
      (a, b) =>
        new Date(b.completedAt ?? b.updatedAt).getTime() -
        new Date(a.completedAt ?? a.updatedAt).getTime(),
    )
    .slice(0, 5);

  const recentEmails = emailHistory.slice(0, 5);

  const recentActivity = [
    ...audits.map((a) => ({
      id: `a-${a.id}`,
      at: a.updatedAt,
      text: `Auditoria ${a.code} · ${a.status === 'concluida' ? 'concluída' : a.status === 'em_andamento' ? 'em andamento' : a.status}`,
      href: `/app/auditorias/${a.id}`,
    })),
    ...actionPlans.map((p) => ({
      id: `p-${p.id}`,
      at: p.updatedAt,
      text: `Plano · ${p.sectorName} · ${actionStatusLabels[p.status]}`,
      href: `/app/planos-de-acao/${p.id}`,
    })),
    ...emailHistory.map((e) => ({
      id: `e-${e.id}`,
      at: e.updatedAt,
      text: `E-mail · ${e.auditCode} · ${e.status}`,
      href: '/app/historico-emails',
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Visão operacional do NANNAI Muro Alto"
        actions={
          <Link to="/app/auditorias/nova">
            <Button>
              <Plus size={18} />
              Nova auditoria
            </Button>
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Auditorias do dia" value={todayAudits.length} accent="olive" />
        <StatCard label="Em andamento" value={inProgress.length} accent="gold" />
        <StatCard label="Concluídas" value={completed.length} accent="olive" />
        <StatCard label="NCs abertas" value={openNc} accent="wine" />
        <StatCard label="NCs críticas" value={criticalNc} accent="wine" />
        <StatCard label="Planos vencidos" value={overduePlans} accent="wine" />
        <StatCard
          label="Vencendo em 7 dias"
          value={dueIn7}
          hint={`Até ${formatDate(in7.toISOString())}`}
          accent="gold"
        />
        <StatCard
          label="% Conformidade geral"
          value={`${avgConformity}%`}
          hint="Média das concluídas"
          accent="olive"
        />
        <StatCard label="Auditorias do mês" value={monthAudits.length} accent="gold" />
        <StatCard label="Planos concluídos" value={completedPlans} accent="olive" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="font-display text-lg font-semibold text-wine-700">
            Evolução da pontuação
          </h3>
          <p className="mb-4 text-xs text-ink-muted">Com base nas auditorias concluídas</p>
          <div className="h-56">
            {scoreEvolution.length === 0 ? (
              <EmptyChartHint text="Conclua auditorias para ver a evolução da pontuação." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={scoreEvolution}>
                  <defs>
                    <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6b7f3a" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#6b7f3a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ebe3d4" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="#6b5f57" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#6b5f57" />
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
            )}
          </div>
        </Card>

        <Card>
          <h3 className="font-display text-lg font-semibold text-wine-700">
            Indicador por setor
          </h3>
          <p className="mb-4 text-xs text-ink-muted">Conformidade média (%)</p>
          <div className="h-56">
            {sectorResults.length === 0 ? (
              <EmptyChartHint text="Conclua auditorias por setor para ver os indicadores." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorResults} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ebe3d4" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="sectorName"
                    width={110}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="conformity"
                    fill="#b8954a"
                    radius={[0, 6, 6, 0]}
                    name="Conformidade"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <h3 className="mb-3 font-display text-lg font-semibold text-wine-700">
          Setores cadastrados
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {sectorIndicators.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-cream-200 bg-cream-50/60 px-3 py-2"
            >
              <p className="truncate text-sm font-medium text-ink">{s.name}</p>
              <p className="text-xs text-ink-muted">
                {s.conformity == null
                  ? 'Sem auditorias'
                  : `${s.conformity}% · ${s.audits} auditoria(s)`}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-display text-lg font-semibold text-wine-700">
            Principais não conformidades
          </h3>
          {topNcs.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Nenhuma não conformidade registrada ainda.
            </p>
          ) : (
            <ul className="space-y-3">
              {topNcs.map((item) => (
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
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-wine-700">
              Planos de ação recentes
            </h3>
            <Link to="/app/planos-de-acao" className="text-sm text-olive-700 hover:underline">
              Ver painel
            </Link>
          </div>
          {actionPlans.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Nenhum plano de ação cadastrado ainda.
            </p>
          ) : (
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
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <h3 className="mb-3 font-display text-lg font-semibold text-wine-700">
            Últimos relatórios
          </h3>
          {recentReports.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhum relatório gerado ainda.</p>
          ) : (
            <ul className="space-y-2">
              {recentReports.map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/app/auditorias/${a.id}`}
                    className="block rounded-lg p-2 text-sm hover:bg-cream-100"
                  >
                    <span className="font-medium text-ink">{a.code}</span>
                    <span className="block text-xs text-ink-muted">
                      {a.sectorName} · {a.conformityPercent}%
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 font-display text-lg font-semibold text-wine-700">
            Últimos envios de e-mail
          </h3>
          {recentEmails.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhum e-mail enviado ainda.</p>
          ) : (
            <ul className="space-y-2">
              {recentEmails.map((e) => (
                <li key={e.id} className="rounded-lg p-2 text-sm">
                  <p className="font-medium text-ink">{e.auditCode}</p>
                  <p className="text-xs text-ink-muted">
                    {e.status} · {formatDateTime(e.sentAt ?? e.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 font-display text-lg font-semibold text-wine-700">
            Atividades recentes
          </h3>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-ink-muted">
              O sistema está pronto. Inicie a primeira auditoria.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentActivity.map((item) => (
                <li key={item.id}>
                  <Link
                    to={item.href}
                    className="block rounded-lg p-2 text-sm hover:bg-cream-100"
                  >
                    <p className="text-ink">{item.text}</p>
                    <p className="text-xs text-ink-muted">{formatDateTime(item.at)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function EmptyChartHint({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-cream-300 bg-cream-50 px-4 text-center text-sm text-ink-muted">
      {text}
    </div>
  );
}
