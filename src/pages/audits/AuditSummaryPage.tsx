import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { PageHeader, Card, Badge, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAppStore } from '../../stores/appStore';
import {
  computeAuditTotals,
  conformityColors,
  conformityLabels,
  cn,
} from '../../utils';

export function AuditSummaryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const audit = useAppStore((s) => s.audits.find((a) => a.id === id));
  const questionnaire = useAppStore((s) => s.questionnaire);
  const allPlans = useAppStore((s) => s.actionPlans);
  const actionPlans = useMemo(
    () => allPlans.filter((p) => p.auditId === id),
    [allPlans, id],
  );

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'todas' | 'pendentes' | 'nc'>('todas');

  const totals = useMemo(
    () => (audit ? computeAuditTotals(audit.answers, questionnaire) : null),
    [audit, questionnaire],
  );

  const sectionStats = useMemo(() => {
    if (!audit) return [];
    return questionnaire.sections.map((section) => {
      const questions = section.questions.filter((q) => q.active !== false);
      let score = 0;
      let maxScore = 0;
      let pending = 0;
      let nc = 0;
      for (const q of questions) {
        const a = audit.answers[q.id];
        if (!a?.status) {
          pending += 1;
          continue;
        }
        if (a.status === 'nao_se_aplica') continue;
        const qMax = a.maxScore > 0 ? a.maxScore : q.maxScore;
        score += a.score;
        maxScore += qMax;
        if (
          a.status === 'nao_conforme' ||
          a.status === 'parcialmente_conforme'
        ) {
          nc += 1;
        }
      }
      return {
        section,
        questions,
        score,
        maxScore,
        pending,
        nc,
        conformity:
          maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : null,
      };
    });
  }, [audit, questionnaire]);

  if (!audit || !totals) {
    return (
      <Card>
        <p>Auditoria não encontrada.</p>
        <Link to="/app/auditorias" className="mt-2 inline-block text-olive-700 underline">
          Voltar às auditorias
        </Link>
      </Card>
    );
  }

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  return (
    <div>
      <PageHeader
        title="Resumo da auditoria"
        subtitle={audit.code}
        actions={
          <div className="flex gap-2">
            <Link to={`/app/auditorias/${audit.id}/executar`}>
              <Button variant="outline">Continuar respondendo</Button>
            </Link>
            <Button
              onClick={() => navigate(`/app/auditorias/${audit.id}/encerrar`)}
              disabled={totals.pending > 0}
            >
              Encerrar e assinar
            </Button>
          </div>
        }
      />

      {totals.pending > 0 && (
        <p className="mb-4 rounded-xl border border-gold-200 bg-gold-50 px-3 py-2 text-sm text-gold-900">
          Há {totals.pending} pergunta(s) pendente(s). Complete-as antes de
          encerrar a auditoria.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pontuação"
          value={`${totals.score}/${totals.maxScore}`}
          accent="olive"
        />
        <StatCard
          label="Conformidade"
          value={`${totals.conformityPercent}%`}
          accent="gold"
        />
        <StatCard label="Conformes" value={totals.conforme} accent="olive" />
        <StatCard label="Não conformes" value={totals.naoConforme} accent="wine" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Parcialmente conformes" value={totals.parcial} accent="gold" />
        <StatCard label="Não se aplica" value={totals.na} accent="cream" />
        <StatCard label="Pendentes" value={totals.pending} accent="gold" />
        <StatCard label="Planos de ação" value={actionPlans.length} accent="wine" />
      </div>

      <div className="mt-6 mb-3 flex flex-wrap gap-2">
        {(
          [
            ['todas', 'Todas as seções'],
            ['pendentes', 'Com pendências'],
            ['nc', 'Com NCs'],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? 'secondary' : 'outline'}
            onClick={() => setFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {sectionStats
          .filter((s) => {
            if (filter === 'pendentes') return s.pending > 0;
            if (filter === 'nc') return s.nc > 0;
            return true;
          })
          .map(
            ({
              section,
              questions,
              score,
              maxScore,
              pending,
              nc,
              conformity,
            }) => {
              const open = Boolean(openSections[section.id]);
              return (
                <Card key={section.id} padding="sm">
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-cream-50"
                    onClick={() => toggleSection(section.id)}
                    aria-expanded={open}
                  >
                    <span className="mt-1 text-ink-muted">
                      {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-base font-semibold text-wine-700 md:text-lg">
                        {section.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {score}/{maxScore} pts
                        {conformity != null ? ` · ${conformity}%` : ''}
                        {pending > 0 ? ` · ${pending} pendente(s)` : ''}
                        {nc > 0 ? ` · ${nc} NC(s)` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {pending > 0 && (
                        <Badge className="border-gold-200 bg-gold-50 text-gold-900">
                          Pendente
                        </Badge>
                      )}
                      {nc > 0 && (
                        <Badge className="border-wine-200 bg-wine-50 text-wine-700">
                          NC
                        </Badge>
                      )}
                    </div>
                  </button>

                  {open && (
                    <ul className="mt-2 space-y-2 border-t border-cream-200 px-2 pt-3">
                      {questions.map((q) => {
                        const a = audit.answers[q.id];
                        const show =
                          filter === 'todas' ||
                          (filter === 'pendentes' && !a?.status) ||
                          (filter === 'nc' &&
                            (a?.status === 'nao_conforme' ||
                              a?.status === 'parcialmente_conforme'));
                        if (!show) return null;
                        return (
                          <li
                            key={q.id}
                            className="flex flex-col gap-1 border-b border-cream-100 pb-2 last:border-0 sm:flex-row sm:items-start sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="text-sm text-ink">
                                <span className="text-ink-muted">
                                  {section.order}.{q.order}.{' '}
                                </span>
                                {q.text}
                              </p>
                              {a?.status && a.status !== 'nao_se_aplica' && (
                                <p className="text-xs text-ink-muted">
                                  {a.score}/{a.maxScore > 0 ? a.maxScore : q.maxScore}{' '}
                                  pts
                                </p>
                              )}
                            </div>
                            <Badge
                              className={cn(
                                'shrink-0',
                                a?.status
                                  ? conformityColors[a.status]
                                  : 'border-stone-200 bg-stone-50 text-stone-500',
                              )}
                            >
                              {a?.status ? conformityLabels[a.status] : 'Pendente'}
                            </Badge>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>
              );
            },
          )}
      </div>
    </div>
  );
}
