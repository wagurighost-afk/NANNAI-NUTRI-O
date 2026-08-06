import { useMemo, useState } from 'react';
import { PageHeader, Card, Badge, Modal } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { useEmailStore } from '../../stores/emailStore';
import { useAppStore } from '../../stores/appStore';
import { isValidEmail } from '../../utils/email';
import type {
  AutoRecipientRuleType,
  RecipientGroupKey,
  ReportRecipient,
} from '../../types';

const ruleTypeLabels: Record<AutoRecipientRuleType, string> = {
  unidade: 'Unidade auditada',
  setor: 'Setor auditado',
  tipo_auditoria: 'Tipo de auditoria',
  gravidade_nc: 'Gravidade das NCs',
  pontuacao_final: 'Pontuação final',
  nc_critica: 'Não conformidade crítica',
};

export function ReportRecipientsPage() {
  const recipients = useEmailStore((s) => s.recipients);
  const groups = useEmailStore((s) => s.groups);
  const rules = useEmailStore((s) => s.rules);
  const addRecipient = useEmailStore((s) => s.addRecipient);
  const updateRecipient = useEmailStore((s) => s.updateRecipient);
  const deleteRecipient = useEmailStore((s) => s.deleteRecipient);
  const addGroup = useEmailStore((s) => s.addGroup);
  const updateGroup = useEmailStore((s) => s.updateGroup);
  const deleteGroup = useEmailStore((s) => s.deleteGroup);
  const addRule = useEmailStore((s) => s.addRule);
  const updateRule = useEmailStore((s) => s.updateRule);
  const deleteRule = useEmailStore((s) => s.deleteRule);
  const units = useAppStore((s) => s.units);
  const sectors = useAppStore((s) => s.sectors);

  const [tab, setTab] = useState<'destinatarios' | 'grupos' | 'regras'>(
    'destinatarios',
  );
  const [editOpen, setEditOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [editing, setEditing] = useState<ReportRecipient | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    roleTitle: '',
    isPrimary: false,
    unitId: units[0]?.id ?? '',
    groupId: groups[0]?.id ?? '',
  });
  const [groupForm, setGroupForm] = useState({
    name: '',
    key: 'custom' as RecipientGroupKey,
    description: '',
  });
  const [ruleForm, setRuleForm] = useState({
    name: '',
    type: 'unidade' as AutoRecipientRuleType,
    matchValue: '',
    scoreBelow: 80,
    forcePrimaryOnCritical: false,
  });
  const [error, setError] = useState('');

  const groupName = useMemo(() => {
    const map = new Map(groups.map((g) => [g.id, g.name]));
    return (id: string) => map.get(id) ?? id;
  }, [groups]);

  const openNew = () => {
    setEditing(null);
    setForm({
      name: '',
      email: '',
      roleTitle: '',
      isPrimary: false,
      unitId: units[0]?.id ?? '',
      groupId: groups[0]?.id ?? '',
    });
    setError('');
    setEditOpen(true);
  };

  const openEdit = (r: ReportRecipient) => {
    setEditing(r);
    setForm({
      name: r.name,
      email: r.email,
      roleTitle: r.roleTitle ?? '',
      isPrimary: r.isPrimary,
      unitId: r.unitIds[0] ?? units[0]?.id ?? '',
      groupId: r.groupIds[0] ?? groups[0]?.id ?? '',
    });
    setError('');
    setEditOpen(true);
  };

  const saveRecipient = () => {
    if (!form.name.trim() || !isValidEmail(form.email)) {
      setError('Informe nome e e-mail válido.');
      return;
    }
    if (editing) {
      updateRecipient(editing.id, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        roleTitle: form.roleTitle.trim() || undefined,
        isPrimary: form.isPrimary,
        unitIds: form.unitId ? [form.unitId] : [],
        groupIds: form.groupId ? [form.groupId] : [],
      });
    } else {
      addRecipient({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        roleTitle: form.roleTitle.trim() || undefined,
        active: true,
        isPrimary: form.isPrimary,
        unitIds: form.unitId ? [form.unitId] : [],
        sectorIds: [],
        groupIds: form.groupId ? [form.groupId] : [],
      });
    }
    setEditOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Destinatários dos relatórios"
        subtitle="Cadastro, grupos e regras automáticas de envio"
        actions={
          tab === 'destinatarios' ? (
            <Button onClick={openNew}>Novo destinatário</Button>
          ) : tab === 'grupos' ? (
            <Button onClick={() => setGroupOpen(true)}>Novo grupo</Button>
          ) : (
            <Button onClick={() => setRuleOpen(true)}>Nova regra</Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['destinatarios', 'Destinatários'],
            ['grupos', 'Grupos'],
            ['regras', 'Regras automáticas'],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={tab === key ? 'secondary' : 'outline'}
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === 'destinatarios' && (
        <div className="space-y-3">
          {recipients.map((r) => (
            <Card
              key={r.id}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-ink">
                  {r.name}{' '}
                  {r.isPrimary && (
                    <Badge className="border-gold-300 bg-gold-100 text-gold-900">
                      Principal
                    </Badge>
                  )}
                </p>
                <p className="text-sm text-ink-muted">
                  {r.roleTitle ? `${r.roleTitle} · ` : ''}
                  {r.email}
                </p>
                <p className="text-xs text-ink-muted">
                  Grupos:{' '}
                  {r.groupIds.map(groupName).join(', ') || '—'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge
                  className={
                    r.active
                      ? 'border-olive-200 bg-olive-50 text-olive-800'
                      : 'border-stone-200 bg-stone-100 text-stone-600'
                  }
                >
                  {r.active ? 'Ativo' : 'Inativo'}
                </Badge>
                <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateRecipient(r.id, { active: !r.active })}
                >
                  {r.active ? 'Desativar' : 'Ativar'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    updateRecipient(r.id, { isPrimary: !r.isPrimary })
                  }
                >
                  {r.isPrimary ? 'Remover principal' : 'Tornar principal'}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    if (confirm(`Excluir ${r.name}?`)) deleteRecipient(r.id);
                  }}
                >
                  Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'grupos' && (
        <div className="space-y-3">
          {groups.map((g) => (
            <Card key={g.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg font-semibold text-wine-700">
                    {g.name}
                  </h3>
                  <p className="text-sm text-ink-muted">{g.description}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {g.recipientIds.length} destinatário(s)
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateGroup(g.id, { active: !g.active })}
                  >
                    {g.active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (confirm(`Excluir grupo ${g.name}?`)) deleteGroup(g.id);
                    }}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
              <ul className="mt-3 divide-y divide-cream-200 text-sm">
                {g.recipientIds.map((rid) => {
                  const r = recipients.find((x) => x.id === rid);
                  return (
                    <li key={rid} className="py-1.5">
                      {r ? `${r.name} — ${r.email}` : rid}
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {tab === 'regras' && (
        <div className="space-y-3">
          <Card className="bg-cream-50">
            <p className="text-sm text-ink-muted">
              Regras definem destinatários automáticos conforme unidade, setor,
              tipo de auditoria, gravidade, pontuação e NC crítica.
            </p>
          </Card>
          {rules.map((rule) => (
            <Card
              key={rule.id}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-ink">{rule.name}</p>
                <p className="text-sm text-ink-muted">
                  {ruleTypeLabels[rule.type]}
                  {rule.matchValue ? ` · ${rule.matchValue}` : ''}
                  {rule.scoreBelow != null ? ` · < ${rule.scoreBelow}%` : ''}
                  {rule.forcePrimaryOnCritical
                    ? ' · força principais em NC crítica'
                    : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge
                  className={
                    rule.active
                      ? 'border-olive-200 bg-olive-50 text-olive-800'
                      : 'border-stone-200 bg-stone-100'
                  }
                >
                  {rule.active ? 'Ativa' : 'Inativa'}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateRule(rule.id, { active: !rule.active })}
                >
                  {rule.active ? 'Desativar' : 'Ativar'}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => deleteRule(rule.id)}
                >
                  Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={editing ? 'Editar destinatário' : 'Novo destinatário'}
      >
        <div className="space-y-3">
          <Input
            label="Nome"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Cargo"
            value={form.roleTitle}
            onChange={(e) =>
              setForm((f) => ({ ...f, roleTitle: e.target.value }))
            }
          />
          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Select
            label="Unidade"
            options={units.map((u) => ({ value: u.id, label: u.name }))}
            value={form.unitId}
            onChange={(e) => setForm((f) => ({ ...f, unitId: e.target.value }))}
          />
          <Select
            label="Grupo"
            options={groups.map((g) => ({ value: g.id, label: g.name }))}
            value={form.groupId}
            onChange={(e) =>
              setForm((f) => ({ ...f, groupId: e.target.value }))
            }
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-olive-600"
              checked={form.isPrimary}
              onChange={(e) =>
                setForm((f) => ({ ...f, isPrimary: e.target.checked }))
              }
            />
            Destinatário principal
          </label>
          {error && <p className="text-sm text-wine-700">{error}</p>}
          <Button fullWidth onClick={saveRecipient}>
            Salvar
          </Button>
        </div>
      </Modal>

      <Modal open={groupOpen} onClose={() => setGroupOpen(false)} title="Novo grupo">
        <div className="space-y-3">
          <Input
            label="Nome do grupo"
            value={groupForm.name}
            onChange={(e) =>
              setGroupForm((f) => ({ ...f, name: e.target.value }))
            }
          />
          <Textarea
            label="Descrição"
            value={groupForm.description}
            onChange={(e) =>
              setGroupForm((f) => ({ ...f, description: e.target.value }))
            }
          />
          <Button
            fullWidth
            onClick={() => {
              if (!groupForm.name.trim()) return;
              addGroup({
                name: groupForm.name.trim(),
                key: 'custom',
                description: groupForm.description,
                recipientIds: [],
                unitIds: units.map((u) => u.id),
                active: true,
              });
              setGroupOpen(false);
              setGroupForm({ name: '', key: 'custom', description: '' });
            }}
          >
            Salvar grupo
          </Button>
        </div>
      </Modal>

      <Modal open={ruleOpen} onClose={() => setRuleOpen(false)} title="Nova regra">
        <div className="space-y-3">
          <Input
            label="Nome"
            value={ruleForm.name}
            onChange={(e) =>
              setRuleForm((f) => ({ ...f, name: e.target.value }))
            }
          />
          <Select
            label="Tipo"
            options={(Object.keys(ruleTypeLabels) as AutoRecipientRuleType[]).map(
              (t) => ({ value: t, label: ruleTypeLabels[t] }),
            )}
            value={ruleForm.type}
            onChange={(e) =>
              setRuleForm((f) => ({
                ...f,
                type: e.target.value as AutoRecipientRuleType,
              }))
            }
          />
          {(ruleForm.type === 'unidade' ||
            ruleForm.type === 'setor' ||
            ruleForm.type === 'tipo_auditoria' ||
            ruleForm.type === 'gravidade_nc') && (
            <Select
              label="Valor de correspondência"
              options={
                ruleForm.type === 'unidade'
                  ? units.map((u) => ({ value: u.id, label: u.name }))
                  : ruleForm.type === 'setor'
                    ? sectors.map((s) => ({ value: s.id, label: s.name }))
                    : ruleForm.type === 'gravidade_nc'
                      ? [
                          { value: 'alta', label: 'Alta' },
                          { value: 'critica', label: 'Crítica' },
                        ]
                      : [{ value: 'q1', label: 'Checklist Boas Práticas' }]
              }
              value={ruleForm.matchValue}
              onChange={(e) =>
                setRuleForm((f) => ({ ...f, matchValue: e.target.value }))
              }
            />
          )}
          {ruleForm.type === 'pontuacao_final' && (
            <Input
              label="Conformidade abaixo de (%)"
              type="number"
              value={ruleForm.scoreBelow}
              onChange={(e) =>
                setRuleForm((f) => ({
                  ...f,
                  scoreBelow: Number(e.target.value) || 80,
                }))
              }
            />
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-olive-600"
              checked={ruleForm.forcePrimaryOnCritical}
              onChange={(e) =>
                setRuleForm((f) => ({
                  ...f,
                  forcePrimaryOnCritical: e.target.checked,
                }))
              }
            />
            Forçar destinatários principais em NC crítica
          </label>
          <Button
            fullWidth
            onClick={() => {
              if (!ruleForm.name.trim()) return;
              addRule({
                name: ruleForm.name.trim(),
                type: ruleForm.type,
                active: true,
                matchValue: ruleForm.matchValue || undefined,
                scoreBelow:
                  ruleForm.type === 'pontuacao_final'
                    ? ruleForm.scoreBelow
                    : undefined,
                recipientIds: recipients
                  .filter((r) => r.isPrimary)
                  .map((r) => r.id),
                groupIds: [],
                forcePrimaryOnCritical: ruleForm.forcePrimaryOnCritical,
              });
              setRuleOpen(false);
            }}
          >
            Salvar regra
          </Button>
        </div>
      </Modal>
    </div>
  );
}
