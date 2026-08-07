import { useMemo, useState } from 'react';
import { PageHeader, Card, Badge, Modal } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { useAppStore } from '../../stores/appStore';
import { useAuthStore } from '../../stores/authStore';
import { roleLabels, formatDateTime } from '../../utils';
import {
  countActiveAdmins,
  isUserActive,
  permissionsFor,
  professionalRoleLabels,
} from '../../utils/permissions';
import type { ProfessionalRole, User, UserAdminAction, UserRole } from '../../types';
import {
  applyAdminActionToUser,
  executeSensitiveAdminChange,
  guardLastAdmin,
  guardSelfModification,
  provisionUserInFirebase,
  requiresSensitiveConfirmation,
  syncUserChangeToFirebase,
} from '../../services/userAdminService';
import { saveUserAdminHistoryRemote } from '../../services/firebaseService';
import { isFirebaseEnabled } from '../../firebase/config';

type SensitiveAction = Extract<
  UserAdminAction,
  'deactivate' | 'delete' | 'remove_admin' | 'change_role'
>;

export function UsersPage() {
  const users = useAppStore((s) => s.users);
  const units = useAppStore((s) => s.units);
  const history = useAppStore((s) => s.userAdminHistory);
  const addUser = useAppStore((s) => s.addUser);
  const updateUser = useAppStore((s) => s.updateUser);
  const removeUser = useAppStore((s) => s.removeUser);
  const addUserAdminHistory = useAppStore((s) => s.addUserAdminHistory);
  const currentUser = useAuthStore((s) => s.user);

  const [open, setOpen] = useState(false);
  const [sensitiveOpen, setSensitiveOpen] = useState(false);
  const [target, setTarget] = useState<User | null>(null);
  const [pendingAction, setPendingAction] = useState<SensitiveAction | null>(
    null,
  );
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'auditor' as UserRole,
    professionalRole: 'Auditor' as ProfessionalRole,
    unitId: units[0]?.id ?? '',
  });

  const activeAdmins = useMemo(() => countActiveAdmins(users), [users]);

  const openSensitive = (user: User, action: SensitiveAction) => {
    setError('');
    if (!currentUser) {
      setError('Sessão inválida.');
      return;
    }
    const self = guardSelfModification(currentUser, user, action);
    if (!self.ok) {
      setError(self.error);
      return;
    }
    const last = guardLastAdmin(users, user, action);
    if (!last.ok) {
      setError(last.error);
      return;
    }
    setTarget(user);
    setPendingAction(action);
    setPassword('');
    setReason('');
    setConfirmText('');
    setSensitiveOpen(true);
  };

  const toggleActiveSimple = (user: User) => {
    if (!currentUser) return;
    const activating = !isUserActive(user);
    if (activating) {
      updateUser(user.id, { active: true, isActive: true });
      const entry = {
        id: `uah-${Date.now()}`,
        actorUid: currentUser.uid,
        actorName: currentUser.name,
        actorEmail: currentUser.email,
        targetUid: user.uid,
        targetName: user.name,
        targetEmail: user.email,
        action: 'activate' as const,
        reason: 'Reativação de conta',
        createdAt: new Date().toISOString(),
      };
      addUserAdminHistory(entry);
      void saveUserAdminHistoryRemote(entry);
      void syncUserChangeToFirebase(
        { ...user, active: true, isActive: true },
        'activate',
      );
      return;
    }
    openSensitive(user, 'deactivate');
  };

  const confirmSensitive = async () => {
    if (!currentUser || !target || !pendingAction) return;
    setBusy(true);
    setError('');

    const expectedConfirm =
      pendingAction === 'delete'
        ? 'EXCLUIR'
        : pendingAction === 'remove_admin'
          ? 'REMOVER ADMIN'
          : 'CONFIRMAR';

    if (confirmText.trim().toUpperCase() !== expectedConfirm) {
      setBusy(false);
      setError(`Digite exatamente “${expectedConfirm}” para confirmar.`);
      return;
    }

    const result = await executeSensitiveAdminChange({
      actor: currentUser,
      target,
      action: pendingAction,
      reason,
      currentPassword: password,
      explicitConfirm: true,
      nextRole: pendingAction === 'remove_admin' ? 'gestor' : undefined,
      allUsers: users,
    });

    if (!result.ok || !result.history) {
      setBusy(false);
      setError(result.error ?? 'Operação negada.');
      return;
    }

    const patch = applyAdminActionToUser(target, pendingAction, {
      nextRole: pendingAction === 'remove_admin' ? 'gestor' : undefined,
      nextProfessionalRole:
        pendingAction === 'remove_admin' ? 'Gestor' : undefined,
    });

    if (pendingAction === 'delete') {
      removeUser(target.id);
    } else {
      updateUser(target.id, patch);
    }

    addUserAdminHistory(result.history);
    void saveUserAdminHistoryRemote(result.history);

    const updated: User = { ...target, ...patch } as User;
    void syncUserChangeToFirebase(updated, pendingAction);

    setBusy(false);
    setSensitiveOpen(false);
    setTarget(null);
    setPendingAction(null);
  };

  const createUser = async () => {
    if (!form.name || !form.email) {
      setError('Informe nome e e-mail.');
      return;
    }
    setBusy(true);
    setError('');

    let created: User;

    if (isFirebaseEnabled) {
      const provisioned = await provisionUserInFirebase({
        name: form.name,
        email: form.email,
        password: form.password || 'NannaiTemp@2026',
        role: form.role,
        professionalRole: form.professionalRole,
        unitIds: [form.unitId],
      });
      if (!provisioned.ok || !provisioned.user) {
        setBusy(false);
        setError(provisioned.error ?? 'Falha ao criar usuário no Firebase');
        return;
      }
      created = addUser({
        ...provisioned.user,
        uid: provisioned.user.uid,
      });
    } else {
      created = addUser({
        name: form.name,
        email: form.email,
        role: form.role,
        professionalRole: form.professionalRole,
        unitIds: [form.unitId],
        sectorIds: [],
        active: true,
        isActive: true,
        permissions: permissionsFor(form.role, form.professionalRole),
      });
    }

    if (currentUser) {
      const entry = {
        id: `uah-${Date.now()}`,
        actorUid: currentUser.uid,
        actorName: currentUser.name,
        actorEmail: currentUser.email,
        targetUid: created.uid,
        targetName: created.name,
        targetEmail: created.email,
        action: 'create' as const,
        reason: 'Cadastro de novo usuário',
        createdAt: new Date().toISOString(),
      };
      addUserAdminHistory(entry);
      void saveUserAdminHistoryRemote(entry);
    }

    setBusy(false);
    setOpen(false);
    setForm({
      name: '',
      email: '',
      password: '',
      role: 'auditor',
      professionalRole: 'Auditor',
      unitId: units[0]?.id ?? '',
    });
  };

  const actionTitle =
    pendingAction === 'delete'
      ? 'Excluir usuário'
      : pendingAction === 'remove_admin'
        ? 'Remover acesso administrativo'
        : pendingAction === 'deactivate'
          ? 'Desativar conta'
          : 'Alterar perfil administrativo';

  const confirmWord =
    pendingAction === 'delete'
      ? 'EXCLUIR'
      : pendingAction === 'remove_admin'
        ? 'REMOVER ADMIN'
        : 'CONFIRMAR';

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle="Administradores vinculados ao Firebase Authentication e Firestore"
        actions={<Button onClick={() => setOpen(true)}>Novo usuário</Button>}
      />

      <Card className="mb-4">
        <p className="text-sm text-ink-muted">
          Administradores ativos: <strong>{activeAdmins}</strong> (mínimo: 1).
          Contas administrativas iniciais: David Oliveira, Mauro José e Renata
          Fernanda (Nutricionista e Administradora).
        </p>
      </Card>

      {error && !sensitiveOpen && (
        <p className="mb-3 rounded-xl bg-wine-50 px-3 py-2 text-sm text-wine-700">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {users.map((u) => {
          const isSelf =
            currentUser &&
            (currentUser.uid === u.uid || currentUser.email === u.email);
          const active = isUserActive(u);
          return (
            <Card
              key={u.id}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-ink">
                  {u.name}
                  {isSelf && (
                    <Badge className="ml-2 border-gold-300 bg-gold-100 text-gold-900">
                      Você
                    </Badge>
                  )}
                </p>
                <p className="text-sm text-ink-muted">{u.email}</p>
                <p className="text-xs text-ink-muted">
                  UID: {u.uid} · {professionalRoleLabels[u.professionalRole]}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-olive-200 bg-olive-50 text-olive-800">
                  {roleLabels[u.role]}
                </Badge>
                <Badge className="border-cream-300 bg-cream-50 text-ink">
                  {u.professionalRole}
                </Badge>
                <Badge
                  className={
                    active
                      ? 'border-olive-200 bg-olive-50 text-olive-800'
                      : 'border-stone-200 bg-stone-100 text-stone-600'
                  }
                >
                  {active ? 'Ativo' : 'Inativo'}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={Boolean(isSelf && active)}
                  title={
                    isSelf
                      ? 'Não é permitido desativar a própria conta'
                      : undefined
                  }
                  onClick={() => toggleActiveSimple(u)}
                >
                  {active ? 'Desativar' : 'Ativar'}
                </Button>
                {u.role === 'admin' && !isSelf && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openSensitive(u, 'remove_admin')}
                  >
                    Remover admin
                  </Button>
                )}
                {!isSelf && (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => openSensitive(u, 'delete')}
                  >
                    Excluir
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <h3 className="mb-3 font-display text-lg font-semibold text-wine-700">
          Histórico de alterações de usuários
        </h3>
        {history.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhuma alteração registrada.</p>
        ) : (
          <ul className="space-y-2">
            {history.slice(0, 20).map((h) => (
              <li
                key={h.id}
                className="rounded-xl border border-cream-200 bg-cream-50/60 px-3 py-2 text-sm"
              >
                <p className="font-medium text-ink">
                  {h.action} — {h.targetName} ({h.targetEmail})
                </p>
                <p className="text-xs text-ink-muted">
                  Por {h.actorName} · {formatDateTime(h.createdAt)}
                </p>
                <p className="text-xs text-ink-muted">Motivo: {h.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo usuário">
        <div className="space-y-3">
          <Input
            label="Nome"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="E-mail (Firebase Auth)"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            label="Senha inicial"
            type="password"
            value={form.password}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
            hint="Cria a conta no Firebase Authentication"
          />
          <Select
            label="Perfil de acesso"
            options={(Object.keys(roleLabels) as UserRole[]).map((r) => ({
              value: r,
              label: roleLabels[r],
            }))}
            value={form.role}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                role: e.target.value as UserRole,
                professionalRole:
                  e.target.value === 'admin'
                    ? 'Administrador'
                    : e.target.value === 'gestor'
                      ? 'Gestor'
                      : e.target.value === 'auditor'
                        ? 'Auditor'
                        : 'Responsável pelo setor',
              }))
            }
          />
          <Select
            label="Cargo profissional"
            options={(
              Object.keys(professionalRoleLabels) as ProfessionalRole[]
            ).map((r) => ({ value: r, label: professionalRoleLabels[r] }))}
            value={form.professionalRole}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                professionalRole: e.target.value as ProfessionalRole,
              }))
            }
          />
          <Select
            label="Unidade"
            options={units.map((u) => ({ value: u.id, label: u.name }))}
            value={form.unitId}
            onChange={(e) => setForm((f) => ({ ...f, unitId: e.target.value }))}
          />
          {error && <p className="text-sm text-wine-700">{error}</p>}
          <Button fullWidth disabled={busy} onClick={createUser}>
            {busy ? 'Salvando…' : 'Criar usuário'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={sensitiveOpen}
        onClose={() => setSensitiveOpen(false)}
        title={actionTitle}
      >
        <div className="space-y-3">
          {target &&
            pendingAction &&
            requiresSensitiveConfirmation(target, pendingAction) && (
              <p className="rounded-xl bg-wine-50 px-3 py-2 text-sm text-wine-800">
                Esta ação afeta outro <strong>administrador</strong>. Confirme,
                informe o motivo e digite sua senha atual.
              </p>
            )}
          <p className="text-sm text-ink-muted">
            Alvo: <strong>{target?.name}</strong> ({target?.email})
          </p>
          <Textarea
            label="Motivo (obrigatório)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Descreva o motivo da alteração…"
          />
          <Input
            label="Sua senha atual"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Input
            label={`Digite ${confirmWord} para confirmar`}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
          {error && (
            <p className="rounded-lg bg-wine-50 px-3 py-2 text-sm text-wine-700">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button fullWidth disabled={busy} onClick={confirmSensitive}>
              {busy ? 'Processando…' : 'Confirmar alteração'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setSensitiveOpen(false)}
              disabled={busy}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
