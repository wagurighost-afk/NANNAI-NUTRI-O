import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader, Card, StatCard } from '../../components/ui/Card';
import { useAppStore } from '../../stores/appStore';
import {
  mockScoreEvolution,
  mockSectorResults,
  mockTopNonConformities,
} from '../../data/mock';

export function IndicatorsPage() {
  const audits = useAppStore((s) => s.audits);
  const plans = useAppStore((s) => s.actionPlans);
  const completed = audits.filter((a) => a.status === 'concluida');
  const avg =
    completed.length > 0
      ? Math.round(
          completed.reduce((a, b) => a + b.conformityPercent, 0) / completed.length,
        )
      : 0;

  return (
    <div>
      <PageHeader
        title="Indicadores"
        subtitle="Evolução de conformidade, setores e não conformidades"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Auditorias concluídas" value={completed.length} accent="olive" />
        <StatCard label="Conformidade média" value={`${avg}%`} accent="gold" />
        <StatCard
          label="Planos abertos"
          value={plans.filter((p) => p.status !== 'concluido').length}
          accent="wine"
        />
        <StatCard
          label="Atrasados"
          value={plans.filter((p) => p.status === 'atrasado').length}
          accent="cream"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-display text-lg font-semibold text-wine-700">
            Evolução por período
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockScoreEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ebe3d4" />
                <XAxis dataKey="period" />
                <YAxis domain={[60, 100]} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="score"
                  name="Pontuação"
                  stroke="#5c2e35"
                  fill="#e8d0d3"
                />
                <Area
                  type="monotone"
                  dataKey="conformity"
                  name="Conformidade"
                  stroke="#6b7f3a"
                  fill="#e5ebd6"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 font-display text-lg font-semibold text-wine-700">
            Conformidade por setor
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockSectorResults}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ebe3d4" />
                <XAxis dataKey="sectorName" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="conformity" name="Conformidade %" fill="#b8954a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <h3 className="mb-3 font-display text-lg font-semibold text-wine-700">
          Ranking de não conformidades
        </h3>
        <ol className="space-y-2">
          {mockTopNonConformities.map((item, i) => (
            <li
              key={item.questionText}
              className="flex items-center justify-between rounded-xl bg-cream-50 px-3 py-2"
            >
              <span className="text-sm">
                <span className="mr-2 font-display font-semibold text-wine-700">
                  {i + 1}.
                </span>
                {item.questionText}
                <span className="text-ink-muted"> — {item.sectionName}</span>
              </span>
              <span className="text-sm font-semibold text-olive-700">{item.count}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
