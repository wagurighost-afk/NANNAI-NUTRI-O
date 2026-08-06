import { addDays, differenceInCalendarDays, isBefore, parseISO, startOfDay } from 'date-fns';
import type {
  ActionPlan,
  AppNotification,
  Audit,
  EmailSendRecord,
} from '../types';

function startOfToday() {
  return startOfDay(new Date());
}

export function buildAppNotifications(input: {
  audits: Audit[];
  actionPlans: ActionPlan[];
  emailHistory: EmailSendRecord[];
  dismissedIds?: string[];
}): AppNotification[] {
  const dismissed = new Set(input.dismissedIds ?? []);
  const items: AppNotification[] = [];
  const today = startOfToday();
  const in7 = addDays(today, 7);

  for (const audit of input.audits) {
    if (audit.status === 'em_andamento' || audit.status === 'rascunho') {
      const id = `aud-pend-${audit.id}`;
      if (!dismissed.has(id)) {
        items.push({
          id,
          type: 'auditoria_pendente',
          title: 'Auditoria pendente',
          message: `${audit.code} · ${audit.sectorName}`,
          href: `/app/auditorias/${audit.id}/executar`,
          createdAt: audit.updatedAt,
          read: false,
        });
      }
    }
    if (audit.status === 'concluida' && audit.completedAt) {
      const completed = parseISO(audit.completedAt);
      const ageHours =
        (Date.now() - completed.getTime()) / (1000 * 60 * 60);
      if (ageHours <= 72) {
        const id = `rel-novo-${audit.id}`;
        if (!dismissed.has(id)) {
          items.push({
            id,
            type: 'novo_relatorio',
            title: 'Novo relatório disponível',
            message: `${audit.code} · ${audit.conformityPercent}% conformidade`,
            href: `/app/auditorias/${audit.id}`,
            createdAt: audit.completedAt,
            read: false,
          });
        }
      }
    }
  }

  for (const plan of input.actionPlans) {
    if (plan.status === 'concluido') continue;
    const due = startOfDay(parseISO(plan.dueDate));
    const days = differenceInCalendarDays(due, today);

    if (plan.status === 'atrasado' || isBefore(due, today)) {
      const id = `plano-atr-${plan.id}`;
      if (!dismissed.has(id)) {
        items.push({
          id,
          type: 'plano_atrasado',
          title: 'Plano de ação atrasado',
          message: `${plan.sectorName} · ${Math.abs(Math.min(days, 0))} dia(s) em atraso`,
          href: `/app/planos-de-acao/${plan.id}`,
          createdAt: plan.updatedAt,
          read: false,
        });
      }
    } else if (days >= 0 && !isBefore(in7, due)) {
      const id = `plano-venc-${plan.id}`;
      if (!dismissed.has(id)) {
        items.push({
          id,
          type: 'plano_vencendo',
          title: 'Plano vencendo em breve',
          message: `${plan.sectorName} · ${days} dia(s) restantes`,
          href: `/app/planos-de-acao/${plan.id}`,
          createdAt: plan.updatedAt,
          read: false,
        });
      }
    }
  }

  for (const record of input.emailHistory.slice(0, 20)) {
    if (record.status === 'enviado') {
      const id = `email-ok-${record.id}`;
      if (!dismissed.has(id)) {
        items.push({
          id,
          type: 'envio_realizado',
          title: 'Envio de e-mail realizado',
          message: `${record.auditCode} · ${record.subject}`,
          href: '/app/historico-emails',
          createdAt: record.sentAt ?? record.createdAt,
          read: false,
        });
      }
    }
    if (
      record.status === 'falha' ||
      record.status === 'parcialmente_enviado' ||
      record.status === 'aguardando_reenvio'
    ) {
      const id = `email-err-${record.id}`;
      if (!dismissed.has(id)) {
        items.push({
          id,
          type: 'erro_envio',
          title: 'Erro no envio de e-mail',
          message: `${record.auditCode} · ${record.errors[0] ?? 'Falha no envio'}`,
          href: '/app/historico-emails',
          createdAt: record.updatedAt,
          read: false,
        });
      }
    }
  }

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function daysUntilDue(dueDate: string): number {
  return differenceInCalendarDays(startOfDay(parseISO(dueDate)), startOfToday());
}

export function daysOverdue(dueDate: string): number {
  const days = daysUntilDue(dueDate);
  return days < 0 ? Math.abs(days) : 0;
}
