import type {
  ActionPlan,
  Audit,
  AutoRecipientRule,
  Questionnaire,
  RecipientGroup,
  ReportRecipient,
} from '../types';
import { computeAuditTotals } from '../utils';
import { hasCriticalNonConformity } from '../utils/email';

/**
 * Resolve which recipients should be auto-selected based on audit context and rules.
 */
export function resolveAutoRecipients(params: {
  audit: Audit;
  questionnaire: Questionnaire;
  actionPlans: ActionPlan[];
  recipients: ReportRecipient[];
  groups: RecipientGroup[];
  rules: AutoRecipientRule[];
}): {
  selectedIds: Set<string>;
  criticalAlert: boolean;
  matchedRuleNames: string[];
} {
  const {
    audit,
    questionnaire,
    actionPlans,
    recipients,
    groups,
    rules,
  } = params;

  const selected = new Set<string>();
  const matchedRuleNames: string[] = [];
  const critical = hasCriticalNonConformity(audit, questionnaire);
  const totals = computeAuditTotals(audit.answers, questionnaire);
  const relatedPlans = actionPlans.filter((p) => p.auditId === audit.id);
  const hasHighSeverity = relatedPlans.some(
    (p) => p.priority === 'alta' || p.priority === 'critica',
  );

  const addRecipients = (ids: string[], groupIds: string[]) => {
    for (const id of ids) selected.add(id);
    for (const gid of groupIds) {
      const g = groups.find((x) => x.id === gid && x.active);
      if (!g) continue;
      for (const rid of g.recipientIds) selected.add(rid);
    }
  };

  // Destinatários ativos da unidade (ou todos ativos) começam selecionados
  for (const r of recipients.filter((x) => x.active)) {
    const matchesUnit =
      r.unitIds.length === 0 || r.unitIds.includes(audit.unitId);
    if (matchesUnit) selected.add(r.id);
  }

  // Principais sempre entram, mesmo sem vínculo de unidade
  for (const r of recipients.filter((x) => x.active && x.isPrimary)) {
    selected.add(r.id);
  }

  for (const rule of rules.filter((r) => r.active)) {
    let match = false;
    switch (rule.type) {
      case 'unidade':
        match = rule.matchValue === audit.unitId;
        break;
      case 'setor':
        match = rule.matchValue === audit.sectorId;
        break;
      case 'tipo_auditoria':
        match = rule.matchValue === audit.questionnaireId;
        break;
      case 'pontuacao_final':
        match =
          typeof rule.scoreBelow === 'number' &&
          totals.conformityPercent < rule.scoreBelow;
        break;
      case 'gravidade_nc':
        match =
          hasHighSeverity ||
          (rule.matchValue === 'critica' && critical) ||
          (rule.matchValue === 'alta' && hasHighSeverity);
        break;
      case 'nc_critica':
        match = critical;
        break;
      default:
        match = false;
    }

    if (match) {
      matchedRuleNames.push(rule.name);
      addRecipients(rule.recipientIds, rule.groupIds);
      if (rule.forcePrimaryOnCritical || (critical && rule.type === 'nc_critica')) {
        for (const r of recipients.filter((x) => x.active && x.isPrimary)) {
          selected.add(r.id);
        }
      }
    }
  }

  // Remove inactive
  for (const id of [...selected]) {
    const r = recipients.find((x) => x.id === id);
    if (!r || !r.active) selected.delete(id);
  }

  return { selectedIds: selected, criticalAlert: critical, matchedRuleNames };
}
