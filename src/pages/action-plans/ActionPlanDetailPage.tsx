import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader, Card, Badge } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { useAppStore } from '../../stores/appStore';
import { useAuthStore } from '../../stores/authStore';
import {
  actionStatusColors,
  actionStatusLabels,
  formatDate,
  formatDateTime,
  priorityLabels,
} from '../../utils';
import type { ActionPlanStatus, Priority } from '../../types';

export function ActionPlanDetailPage() {
  const { id } = useParams();
  const plan = useAppStore((s) => s.actionPlans.find((p) => p.id === id));
  const updateActionPlan = useAppStore((s) => s.updateActionPlan);
  const users = useAppStore((s) => s.users);
  const currentUser = useAuthStore((s) => s.user);
  const [validationNotes, setValidationNotes] = useState(plan?.validationNotes ?? '');

  if (!plan) {
    return (
      <Card>
        Plano não encontrado.{' '}
        <Link to="/app/planos-de-acao" className="text-olive-700 underline">
          Voltar
        </Link>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="Detalhes do plano de ação"
        subtitle={plan.auditCode}
        actions={
          <Badge className={actionStatusColors[plan.status]}>
            {actionStatusLabels[plan.status]}
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <Field label="Não conformidade" value={plan.nonConformityDescription} />
          <Field label="Ação corretiva" value={plan.correctiveAction} />
          <Field label="Pergunta" value={plan.questionText} />
          <Field label="Unidade / Setor" value={`${plan.unitName} · ${plan.sectorName}`} />
          <Field label="Responsável" value={plan.responsibleName} />
          <Field label="Prazo" value={formatDate(plan.dueDate)} />
          <Field label="Criado em" value={formatDateTime(plan.createdAt)} />
        </Card>

        <Card className="space-y-3">
          <Select
            label="Status"
            options={(Object.keys(actionStatusLabels) as ActionPlanStatus[]).map(
              (s) => ({ value: s, label: actionStatusLabels[s] }),
            )}
            value={plan.status}
            onChange={(e) =>
              updateActionPlan(plan.id, {
                status: e.target.value as ActionPlanStatus,
              })
            }
          />
          <Select
            label="Prioridade"
            options={(Object.keys(priorityLabels) as Priority[]).map((p) => ({
              value: p,
              label: priorityLabels[p],
            }))}
            value={plan.priority}
            onChange={(e) =>
              updateActionPlan(plan.id, {
                priority: e.target.value as Priority,
              })
            }
          />
          <Select
            label="Responsável"
            options={[
              { value: '', label: 'A definir' },
              ...users.map((u) => ({ value: u.id, label: u.name })),
            ]}
            value={plan.responsibleId}
            onChange={(e) => {
              const u = users.find((x) => x.id === e.target.value);
              updateActionPlan(plan.id, {
                responsibleId: e.target.value,
                responsibleName: u?.name ?? 'A definir',
              });
            }}
          />
          <Input
            label="Prazo"
            type="date"
            value={plan.dueDate}
            onChange={(e) => updateActionPlan(plan.id, { dueDate: e.target.value })}
          />
          <Textarea
            label="Observações"
            value={plan.observations}
            onChange={(e) =>
              updateActionPlan(plan.id, { observations: e.target.value })
            }
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                updateActionPlan(plan.id, {
                  photosBefore: [
                    ...plan.photosBefore,
                    {
                      id: `pb-${Date.now()}`,
                      type: 'photo',
                      url: '',
                      caption: 'Foto antes',
                      createdAt: new Date().toISOString(),
                      synced: false,
                    },
                  ],
                })
              }
            >
              Foto antes ({plan.photosBefore.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                updateActionPlan(plan.id, {
                  photosAfter: [
                    ...plan.photosAfter,
                    {
                      id: `pa-${Date.now()}`,
                      type: 'photo',
                      url: '',
                      caption: 'Foto depois',
                      createdAt: new Date().toISOString(),
                      synced: false,
                    },
                  ],
                })
              }
            >
              Foto depois ({plan.photosAfter.length})
            </Button>
          </div>
        </Card>
      </div>

      <Card className="mt-4 space-y-3">
        <h3 className="font-display text-lg font-semibold text-wine-700">
          Validação final
        </h3>
        <Textarea
          label="Notas de validação"
          value={validationNotes}
          onChange={(e) => setValidationNotes(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() =>
              updateActionPlan(plan.id, {
                status: 'aguardando_validacao',
              })
            }
          >
            Enviar para validação
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              updateActionPlan(plan.id, {
                status: 'concluido',
                validatedBy: currentUser?.name ?? 'Administradora',
                validatedAt: new Date().toISOString(),
                validationNotes,
              })
            }
          >
            Validar e concluir
          </Button>
        </div>
        {plan.validatedAt && (
          <p className="text-sm text-olive-700">
            Validado por {plan.validatedBy} em {formatDateTime(plan.validatedAt)}
          </p>
        )}
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-ink">{value}</p>
    </div>
  );
}
