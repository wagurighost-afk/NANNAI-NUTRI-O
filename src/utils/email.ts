import type { ActionPlan, Audit, Question, Questionnaire } from '../types';
import { BRAND } from '../data/mock';
import { computeAuditTotals, formatDate } from '../utils';

export function buildDefaultEmailSubject(audit: Audit): string {
  const date = formatDate(audit.completedAt ?? audit.startedAt);
  return `Relatório de Auditoria — ${BRAND.name} — ${audit.unitName} — ${date}`;
}

export function buildDefaultEmailBody(
  audit: Audit,
  actionPlans: ActionPlan[],
): string {
  const totals = computeAuditTotals(audit.answers);
  const openPlans = actionPlans.filter(
    (p) => p.auditId === audit.id && p.status !== 'concluido',
  ).length;
  const date = formatDate(audit.completedAt ?? audit.startedAt);

  return `Olá,

Segue em anexo o relatório da auditoria realizada na unidade ${audit.unitName}, no setor ${audit.sectorName}, em ${date}.

Resultado geral: ${totals.conformityPercent}%
Pontuação: ${totals.score} de ${totals.maxScore}
Não conformidades identificadas: ${totals.naoConforme + totals.parcial}
Planos de ação abertos: ${openPlans}
Responsável pela auditoria: ${audit.auditorName}

Atenciosamente,
${BRAND.name}
${BRAND.slogan}`;
}

export function hasCriticalNonConformity(
  audit: Audit,
  questionnaire: Questionnaire,
): boolean {
  const criticalIds = new Set(
    questionnaire.sections
      .flatMap((s) => s.questions)
      .filter((q: Question) => q.critical)
      .map((q) => q.id),
  );
  return Object.values(audit.answers).some(
    (a) =>
      criticalIds.has(a.questionId) &&
      (a.status === 'nao_conforme' || a.status === 'parcialmente_conforme'),
  );
}

export function countNonConformities(audit: Audit) {
  const totals = computeAuditTotals(audit.answers);
  return totals.naoConforme + totals.parcial;
}

export const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

/** Max PDF attachment size: 10 MB */
export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export function canSendReportEmail(role: string | undefined): boolean {
  return role === 'admin' || role === 'gestor';
}
