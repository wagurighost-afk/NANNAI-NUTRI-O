import { clsx, type ClassValue } from 'clsx';
import type {
  ActionPlanStatus,
  Audit,
  AuditAnswer,
  ConformityStatus,
  Priority,
  UserRole,
} from '../types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  gestor: 'Gestor / Nutricionista',
  auditor: 'Auditor',
  responsavel: 'Responsável pelo setor',
};

export const conformityLabels: Record<ConformityStatus, string> = {
  conforme: 'Conforme',
  parcialmente_conforme: 'Parcialmente conforme',
  nao_conforme: 'Não conforme',
  nao_se_aplica: 'Não se aplica',
};

export const conformityColors: Record<ConformityStatus, string> = {
  conforme: 'bg-olive-100 text-olive-800 border-olive-300',
  parcialmente_conforme: 'bg-gold-100 text-gold-900 border-gold-300',
  nao_conforme: 'bg-wine-100 text-wine-800 border-wine-300',
  nao_se_aplica: 'bg-stone-100 text-stone-600 border-stone-300',
};

export const actionStatusLabels: Record<ActionPlanStatus, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  aguardando_validacao: 'Aguardando validação',
  concluido: 'Concluído',
  atrasado: 'Atrasado',
};

export const actionStatusColors: Record<ActionPlanStatus, string> = {
  aberto: 'bg-stone-100 text-stone-700',
  em_andamento: 'bg-gold-100 text-gold-900',
  aguardando_validacao: 'bg-olive-100 text-olive-800',
  concluido: 'bg-emerald-100 text-emerald-800',
  atrasado: 'bg-wine-100 text-wine-800',
};

export const priorityLabels: Record<Priority, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
};

export const priorityColors: Record<Priority, string> = {
  baixa: 'text-stone-600',
  media: 'text-gold-700',
  alta: 'text-orange-700',
  critica: 'text-wine-700',
};

export function scoreForStatus(
  status: ConformityStatus | null,
  maxScore: number,
  partialScore?: number,
): number {
  switch (status) {
    case 'conforme':
      return maxScore;
    case 'parcialmente_conforme':
      return partialScore ?? Math.round(maxScore * 0.5);
    case 'nao_conforme':
      return 0;
    case 'nao_se_aplica':
      return 0;
    default:
      return 0;
  }
}

export function computeAuditTotals(
  answers: Record<string, AuditAnswer>,
  questionnaire?: {
    sections: { questions: { id: string; maxScore: number }[] }[];
  },
) {
  const maxByQuestion = new Map<string, number>();
  if (questionnaire) {
    for (const section of questionnaire.sections) {
      for (const q of section.questions) {
        maxByQuestion.set(q.id, q.maxScore);
      }
    }
  }

  const list = Object.values(answers);
  const applicable = list.filter((a) => a.status && a.status !== 'nao_se_aplica');
  const answered = list.filter((a) => a.status !== null);
  const pending = list.filter((a) => a.status === null);

  const conforme = list.filter((a) => a.status === 'conforme').length;
  const parcial = list.filter((a) => a.status === 'parcialmente_conforme').length;
  const naoConforme = list.filter((a) => a.status === 'nao_conforme').length;
  const na = list.filter((a) => a.status === 'nao_se_aplica').length;

  let score = 0;
  let maxScore = 0;
  for (const a of applicable) {
    // Pontuação absoluta Nutrisano; fallback para questionário ou peso legado
    const questionMax =
      a.maxScore > 0
        ? a.maxScore
        : (maxByQuestion.get(a.questionId) ?? 10 * (a.weight || 1));
    score += a.score;
    maxScore += questionMax;
  }

  const conformityPercent = maxScore > 0 ? (score / maxScore) * 100 : 0;

  return {
    score: Math.round(score),
    maxScore: Math.round(maxScore),
    conformityPercent: Math.round(conformityPercent * 10) / 10,
    conforme,
    parcial,
    naoConforme,
    na,
    answered: answered.length,
    pending: pending.length,
    total: list.length,
  };
}

export function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function formatDateTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateAuditCode(existing: Audit[]) {
  const year = new Date().getFullYear();
  const seq = existing.length + 1;
  return `AUD-${year}-${String(seq).padStart(4, '0')}`;
}

export function needsActionPlan(status: ConformityStatus | null) {
  return status === 'nao_conforme' || status === 'parcialmente_conforme';
}
