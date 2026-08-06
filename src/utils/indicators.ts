import type {
  ActionPlan,
  Audit,
  SectorResult,
  ScoreEvolutionPoint,
  TopNonConformity,
} from '../types';

const MONTHS_PT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const;

/** Evolução mensal a partir de auditorias concluídas reais */
export function buildScoreEvolution(audits: Audit[]): ScoreEvolutionPoint[] {
  const completed = audits.filter(
    (a) => a.status === 'concluida' && a.completedAt,
  );
  if (completed.length === 0) return [];

  const byMonth = new Map<
    string,
    { label: string; sum: number; count: number; order: number }
  >();

  for (const a of completed) {
    const d = new Date(a.completedAt!);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const existing = byMonth.get(key);
    if (existing) {
      existing.sum += a.conformityPercent;
      existing.count += 1;
    } else {
      byMonth.set(key, {
        label: MONTHS_PT[d.getMonth()],
        sum: a.conformityPercent,
        count: 1,
        order: d.getFullYear() * 12 + d.getMonth(),
      });
    }
  }

  return [...byMonth.values()]
    .sort((a, b) => a.order - b.order)
    .map((v) => {
      const avg = Math.round((v.sum / v.count) * 10) / 10;
      return { period: v.label, score: avg, conformity: avg };
    });
}

/** Conformidade média por setor a partir de auditorias concluídas */
export function buildSectorResults(audits: Audit[]): SectorResult[] {
  const completed = audits.filter((a) => a.status === 'concluida');
  const bySector = new Map<
    string,
    { sum: number; count: number; name: string }
  >();

  for (const a of completed) {
    const prev = bySector.get(a.sectorId) ?? {
      sum: 0,
      count: 0,
      name: a.sectorName,
    };
    prev.sum += a.conformityPercent;
    prev.count += 1;
    bySector.set(a.sectorId, prev);
  }

  return [...bySector.values()]
    .map((v) => ({
      sectorName: v.name,
      score: Math.round(v.sum / v.count),
      conformity: Math.round(v.sum / v.count),
      audits: v.count,
    }))
    .sort((a, b) => b.conformity - a.conformity);
}

/** Ranking de NCs a partir de respostas reais */
export function buildTopNonConformities(
  audits: Audit[],
  questionnaireSections: {
    id: string;
    name: string;
    questions: { id: string; text: string }[];
  }[],
  limit = 5,
): TopNonConformity[] {
  const questionMeta = new Map<string, { text: string; sectionName: string }>();
  for (const sec of questionnaireSections) {
    for (const q of sec.questions) {
      questionMeta.set(q.id, { text: q.text, sectionName: sec.name });
    }
  }

  const counts = new Map<string, number>();
  for (const audit of audits) {
    for (const answer of Object.values(audit.answers)) {
      if (
        answer.status === 'nao_conforme' ||
        answer.status === 'parcialmente_conforme'
      ) {
        counts.set(answer.questionId, (counts.get(answer.questionId) ?? 0) + 1);
      }
    }
  }

  return [...counts.entries()]
    .map(([questionId, count]) => {
      const meta = questionMeta.get(questionId);
      return {
        questionText: meta?.text ?? questionId,
        sectionName: meta?.sectionName ?? '',
        count,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function hasOperationalData(
  audits: Audit[],
  plans: ActionPlan[],
): boolean {
  return audits.length > 0 || plans.length > 0;
}
