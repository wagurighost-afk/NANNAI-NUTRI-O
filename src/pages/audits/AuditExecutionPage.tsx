import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Flag,
  Save,
  ClipboardPlus,
} from 'lucide-react';
import { PageHeader, Card, Badge, Modal } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useAppStore } from '../../stores/appStore';
import {
  computeAuditTotals,
  conformityLabels,
  cn,
  needsActionPlan,
  priorityLabels,
} from '../../utils';
import type { ConformityStatus, Priority } from '../../types';
import { saveAuditOffline } from '../../services/offlineDb';
import { useAutoSave } from '../../hooks/useOnlineStatus';

const statusOptions: ConformityStatus[] = [
  'nao_conforme',
  'parcialmente_conforme',
  'conforme',
  'nao_se_aplica',
];

export function AuditExecutionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const audit = useAppStore((s) => s.audits.find((a) => a.id === id));
  const questionnaire = useAppStore((s) => s.questionnaire);
  const users = useAppStore((s) => s.users);
  const updateAnswer = useAppStore((s) => s.updateAnswer);
  const setAuditProgress = useAppStore((s) => s.setAuditProgress);
  const createActionPlan = useAppStore((s) => s.createActionPlan);

  const [sectionIndex, setSectionIndex] = useState(audit?.currentSectionIndex ?? 0);
  const [questionIndex, setQuestionIndex] = useState(audit?.currentQuestionIndex ?? 0);
  const [savedFlash, setSavedFlash] = useState(false);
  const [actionModal, setActionModal] = useState(false);
  const [actionForm, setActionForm] = useState({
    nonConformityDescription: '',
    correctiveAction: '',
    responsibleId: '',
    priority: 'media' as Priority,
    dueDate: '',
    observations: '',
  });

  useEffect(() => {
    if (audit) {
      setSectionIndex(audit.currentSectionIndex);
      setQuestionIndex(audit.currentQuestionIndex);
    }
  }, [audit?.id]);

  const sections = questionnaire.sections;
  const section = sections[sectionIndex];
  const question = section?.questions[questionIndex];
  const answer = audit && question ? audit.answers[question.id] : undefined;

  const totals = useMemo(
    () => (audit ? computeAuditTotals(audit.answers) : null),
    [audit],
  );

  const flatIndex = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < sectionIndex; i++) idx += sections[i].questions.length;
    return idx + questionIndex + 1;
  }, [sectionIndex, questionIndex, sections]);

  const totalQuestions = sections.reduce((n, s) => n + s.questions.length, 0);

  const persist = useCallback(async () => {
    if (!audit) return;
    setAuditProgress(audit.id, sectionIndex, questionIndex);
    const latest = useAppStore.getState().audits.find((a) => a.id === audit.id);
    if (latest) await saveAuditOffline(latest);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  }, [audit, sectionIndex, questionIndex, setAuditProgress]);

  useAutoSave(persist, 10000);

  if (!audit || !section || !question || !answer || !totals) {
    return (
      <Card>
        <p>Auditoria não encontrada.</p>
        <Link to="/app/auditorias" className="text-olive-700 underline">
          Voltar
        </Link>
      </Card>
    );
  }

  const go = (sIdx: number, qIdx: number) => {
    setSectionIndex(sIdx);
    setQuestionIndex(qIdx);
    setAuditProgress(audit.id, sIdx, qIdx);
  };

  const prev = () => {
    if (questionIndex > 0) go(sectionIndex, questionIndex - 1);
    else if (sectionIndex > 0) {
      const prevSec = sections[sectionIndex - 1];
      go(sectionIndex - 1, prevSec.questions.length - 1);
    }
  };

  const next = () => {
    if (questionIndex < section.questions.length - 1) {
      go(sectionIndex, questionIndex + 1);
    } else if (sectionIndex < sections.length - 1) {
      go(sectionIndex + 1, 0);
    } else {
      navigate(`/app/auditorias/${audit.id}/resumo`);
    }
  };

  const setStatus = (status: ConformityStatus) => {
    updateAnswer(audit.id, question.id, { status });
    if (needsActionPlan(status) && !answer.actionPlanId) {
      setActionForm({
        nonConformityDescription: '',
        correctiveAction: '',
        responsibleId: users.find((u) => u.role === 'responsavel')?.id ?? '',
        priority: status === 'nao_conforme' ? 'alta' : 'media',
        dueDate: '',
        observations: '',
      });
      setActionModal(true);
    }
  };

  const submitActionPlan = () => {
    const responsible = users.find((u) => u.id === actionForm.responsibleId);
    createActionPlan({
      auditId: audit.id,
      auditCode: audit.code,
      questionId: question.id,
      questionText: question.text,
      unitId: audit.unitId,
      unitName: audit.unitName,
      sectorId: audit.sectorId,
      sectorName: audit.sectorName,
      nonConformityDescription:
        actionForm.nonConformityDescription || question.text,
      correctiveAction: actionForm.correctiveAction || 'Definir ação corretiva',
      responsibleId: actionForm.responsibleId || 'u4',
      responsibleName: responsible?.name ?? 'A definir',
      priority: actionForm.priority,
      dueDate: actionForm.dueDate || new Date().toISOString().slice(0, 10),
      status: 'aberto',
      photosBefore: [],
      photosAfter: [],
      observations: actionForm.observations,
    });
    setActionModal(false);
  };

  return (
    <div className="pb-28">
      <PageHeader
        title={audit.code}
        subtitle={`${audit.sectorName} · ${audit.unitName}`}
        actions={
          <Button variant="outline" size="sm" onClick={persist}>
            <Save size={16} />
            {savedFlash ? 'Salvo!' : 'Salvar e continuar depois'}
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat label="Progresso" value={`${flatIndex}/${totalQuestions}`} />
        <MiniStat label="Pontuação" value={`${totals.score}/${totals.maxScore}`} />
        <MiniStat label="Respondidas" value={String(totals.answered)} />
        <MiniStat label="Pendentes" value={String(totals.pending)} />
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-cream-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-olive-500 to-gold-500 transition-all duration-500"
          style={{ width: `${(totals.answered / totalQuestions) * 100}%` }}
        />
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge className="border-olive-200 bg-olive-50 text-olive-800">
            {section.name}
          </Badge>
          <span className="text-xs text-ink-muted">
            Pergunta {questionIndex + 1} de {section.questions.length}
          </span>
          {question.critical && (
            <Badge className="border-wine-200 bg-wine-50 text-wine-700">
              Crítica
            </Badge>
          )}
          {answer.flaggedForReview && (
            <Badge className="border-gold-300 bg-gold-100 text-gold-900">
              Revisão
            </Badge>
          )}
        </div>

        <h2 className="font-display text-xl font-semibold leading-snug text-ink md:text-2xl">
          {question.text}
        </h2>
        {question.guidance && (
          <p className="mt-2 text-sm text-ink-muted">{question.guidance}</p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          {statusOptions.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatus(status)}
              className={cn(
                'rounded-xl border px-3 py-3 text-left text-sm font-medium transition active:scale-[0.98]',
                answer.status === status
                  ? status === 'conforme'
                    ? 'border-olive-500 bg-olive-100 text-olive-900'
                    : status === 'parcialmente_conforme'
                      ? 'border-gold-500 bg-gold-100 text-gold-900'
                      : status === 'nao_conforme'
                        ? 'border-wine-600 bg-wine-100 text-wine-900'
                        : 'border-stone-400 bg-stone-100 text-stone-700'
                  : 'border-cream-300 bg-white hover:border-olive-300',
              )}
            >
              {conformityLabels[status]}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-2 text-sm">
            <span className="text-ink-muted">Pontuação: </span>
            <strong>
              {answer.score} / {question.maxScore}
            </strong>
          </div>
          <div className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-2 text-sm">
            <span className="text-ink-muted">Peso: </span>
            <strong>{question.weight}</strong>
          </div>
        </div>

        <div className="mt-4">
          <Textarea
            label="Comentário / evidência textual"
            value={answer.comment}
            onChange={(e) =>
              updateAnswer(audit.id, question.id, { comment: e.target.value })
            }
            placeholder="Descreva observações, evidências ou contexto…"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const idEv = `ev-${Date.now()}`;
              updateAnswer(audit.id, question.id, {
                evidences: [
                  ...answer.evidences,
                  {
                    id: idEv,
                    type: 'photo',
                    url: '',
                    caption: 'Foto anexada (local)',
                    createdAt: new Date().toISOString(),
                    synced: false,
                  },
                ],
              });
            }}
          >
            <Camera size={16} /> Upload de foto
            {answer.evidences.length > 0 && ` (${answer.evidences.length})`}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              updateAnswer(audit.id, question.id, {
                flaggedForReview: !answer.flaggedForReview,
              })
            }
          >
            <Flag size={16} />
            {answer.flaggedForReview ? 'Remover revisão' : 'Marcar para revisão'}
          </Button>
          {needsActionPlan(answer.status) && (
            <Button
              type="button"
              variant="gold"
              size="sm"
              onClick={() => setActionModal(true)}
            >
              <ClipboardPlus size={16} />
              {answer.actionPlanId ? 'Ver / editar plano' : 'Criar plano de ação'}
            </Button>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Select
            label="Responsável (pergunta)"
            options={[
              { value: '', label: 'Não definido' },
              ...users
                .filter((u) => u.role === 'responsavel' || u.role === 'gestor')
                .map((u) => ({ value: u.id, label: u.name })),
            ]}
            value={answer.responsibleId ?? ''}
            onChange={(e) =>
              updateAnswer(audit.id, question.id, {
                responsibleId: e.target.value || undefined,
              })
            }
          />
          <Input
            label="Prazo"
            type="date"
            value={answer.dueDate ?? ''}
            onChange={(e) =>
              updateAnswer(audit.id, question.id, {
                dueDate: e.target.value || undefined,
              })
            }
          />
        </div>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-cream-200 bg-cream-50/95 p-3 backdrop-blur-md lg:left-72">
        <div className="mx-auto flex max-w-6xl gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={sectionIndex === 0 && questionIndex === 0}
            onClick={prev}
          >
            <ChevronLeft size={18} /> Anterior
          </Button>
          <Button className="flex-1" onClick={next}>
            {sectionIndex === sections.length - 1 &&
            questionIndex === section.questions.length - 1
              ? 'Ir ao resumo'
              : 'Próximo'}
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>

      <Modal
        open={actionModal}
        onClose={() => setActionModal(false)}
        title="Plano de ação"
      >
        <p className="mb-4 text-sm text-ink-muted">
          Não conformidade detectada. Registre a ação corretiva.
        </p>
        <div className="space-y-3">
          <Textarea
            label="Descrição da não conformidade"
            value={actionForm.nonConformityDescription}
            onChange={(e) =>
              setActionForm((f) => ({
                ...f,
                nonConformityDescription: e.target.value,
              }))
            }
          />
          <Textarea
            label="Ação corretiva"
            value={actionForm.correctiveAction}
            onChange={(e) =>
              setActionForm((f) => ({ ...f, correctiveAction: e.target.value }))
            }
          />
          <Select
            label="Responsável"
            options={users
              .filter((u) => u.role === 'responsavel' || u.role === 'gestor')
              .map((u) => ({ value: u.id, label: u.name }))}
            value={actionForm.responsibleId}
            onChange={(e) =>
              setActionForm((f) => ({ ...f, responsibleId: e.target.value }))
            }
          />
          <Select
            label="Prioridade"
            options={(Object.keys(priorityLabels) as Priority[]).map((p) => ({
              value: p,
              label: priorityLabels[p],
            }))}
            value={actionForm.priority}
            onChange={(e) =>
              setActionForm((f) => ({
                ...f,
                priority: e.target.value as Priority,
              }))
            }
          />
          <Input
            label="Prazo"
            type="date"
            value={actionForm.dueDate}
            onChange={(e) =>
              setActionForm((f) => ({ ...f, dueDate: e.target.value }))
            }
          />
          <Textarea
            label="Observações"
            value={actionForm.observations}
            onChange={(e) =>
              setActionForm((f) => ({ ...f, observations: e.target.value }))
            }
          />
          <div className="flex gap-2 pt-2">
            <Button onClick={submitActionPlan} fullWidth>
              Salvar plano
            </Button>
            <Button variant="outline" onClick={() => setActionModal(false)}>
              Agora não
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-cream-200 bg-white/80 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </p>
      <p className="font-display text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}
