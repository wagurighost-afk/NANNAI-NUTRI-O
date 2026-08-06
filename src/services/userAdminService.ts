import type {
  ProfessionalRole,
  User,
  UserAdminAction,
  UserAdminHistoryEntry,
  UserRole,
} from '../types';
import {
  countActiveAdmins,
  isUserActive,
  permissionsFor,
} from '../utils/permissions';
import {
  createAuthUserAndProfile,
  fetchUserProfile,
  reauthenticateCurrentUser,
  upsertUserRemote,
  disableAuthUserRemote,
} from '../services/firebaseService';
import { isFirebaseEnabled } from '../firebase/config';

export interface SensitiveAdminChangeInput {
  actor: User;
  target: User;
  action: Extract<
    UserAdminAction,
    'deactivate' | 'delete' | 'remove_admin' | 'change_role'
  >;
  reason: string;
  currentPassword: string;
  explicitConfirm: boolean;
  nextRole?: UserRole;
  nextProfessionalRole?: ProfessionalRole;
  allUsers: User[];
}

export type GuardResult =
  | { ok: true }
  | { ok: false; error: string };

export function guardSelfModification(
  actor: User,
  target: User,
  action: UserAdminAction,
): GuardResult {
  const same =
    actor.uid === target.uid ||
    actor.id === target.id ||
    actor.email.toLowerCase() === target.email.toLowerCase();

  if (!same) return { ok: true };

  if (
    action === 'deactivate' ||
    action === 'delete' ||
    action === 'remove_admin'
  ) {
    return {
      ok: false,
      error:
        'Você não pode desativar, excluir ou remover o acesso administrativo da própria conta.',
    };
  }
  return { ok: true };
}

export function guardLastAdmin(
  users: User[],
  target: User,
  action: UserAdminAction,
): GuardResult {
  if (target.role !== 'admin' || !isUserActive(target)) return { ok: true };

  const wouldLoseAdmin =
    action === 'deactivate' ||
    action === 'delete' ||
    action === 'remove_admin' ||
    (action === 'change_role' && true);

  if (!wouldLoseAdmin) return { ok: true };

  const activeAdmins = countActiveAdmins(users);
  if (activeAdmins <= 1) {
    return {
      ok: false,
      error:
        'É obrigatório manter pelo menos um administrador ativo no sistema.',
    };
  }
  return { ok: true };
}

export function requiresSensitiveConfirmation(
  target: User,
  action: UserAdminAction,
): boolean {
  if (target.role !== 'admin') return false;
  return (
    action === 'deactivate' ||
    action === 'delete' ||
    action === 'remove_admin' ||
    action === 'change_role'
  );
}

export async function executeSensitiveAdminChange(
  input: SensitiveAdminChangeInput,
): Promise<{ ok: boolean; error?: string; history?: UserAdminHistoryEntry }> {
  const {
    actor,
    target,
    action,
    reason,
    currentPassword,
    explicitConfirm,
    nextRole,
    allUsers,
  } = input;

  if (!explicitConfirm) {
    return { ok: false, error: 'Confirmação explícita é obrigatória.' };
  }
  if (!reason.trim() || reason.trim().length < 5) {
    return {
      ok: false,
      error: 'Informe um motivo obrigatório (mínimo 5 caracteres).',
    };
  }
  if (!currentPassword) {
    return { ok: false, error: 'Digite sua senha atual para confirmar.' };
  }

  const selfGuard = guardSelfModification(actor, target, action);
  if (!selfGuard.ok) return selfGuard;

  const lastAdminGuard = guardLastAdmin(allUsers, target, action);
  if (!lastAdminGuard.ok) return lastAdminGuard;

  // Always re-authenticate for destructive/privilege changes
  const authCheck = await reauthenticateCurrentUser(
    actor.email,
    currentPassword,
  );
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  const history: UserAdminHistoryEntry = {
    id: `uah-${Date.now()}`,
    actorUid: actor.uid,
    actorName: actor.name,
    actorEmail: actor.email,
    targetUid: target.uid,
    targetName: target.name,
    targetEmail: target.email,
    action,
    reason: reason.trim(),
    details:
      action === 'change_role' && nextRole
        ? `Novo perfil: ${nextRole}`
        : undefined,
    createdAt: new Date().toISOString(),
  };

  return { ok: true, history };
}

export function applyAdminActionToUser(
  target: User,
  action: UserAdminAction,
  opts?: { nextRole?: UserRole; nextProfessionalRole?: ProfessionalRole },
): Partial<User> {
  const now = new Date().toISOString();
  switch (action) {
    case 'deactivate':
      return { active: false, isActive: false, updatedAt: now };
    case 'activate':
      return { active: true, isActive: true, updatedAt: now };
    case 'remove_admin':
      return {
        role: 'gestor',
        professionalRole: opts?.nextProfessionalRole ?? 'Gestor',
        permissions: permissionsFor(
          'gestor',
          opts?.nextProfessionalRole ?? 'Gestor',
        ),
        updatedAt: now,
      };
    case 'grant_admin':
      return {
        role: 'admin',
        professionalRole: opts?.nextProfessionalRole ?? 'Administrador',
        permissions: permissionsFor(
          'admin',
          opts?.nextProfessionalRole ?? 'Administrador',
        ),
        updatedAt: now,
      };
    case 'change_role':
      return {
        role: opts?.nextRole ?? target.role,
        professionalRole:
          opts?.nextProfessionalRole ?? target.professionalRole,
        permissions: permissionsFor(
          opts?.nextRole ?? target.role,
          opts?.nextProfessionalRole ?? target.professionalRole,
        ),
        updatedAt: now,
      };
    case 'delete':
      return { active: false, isActive: false, updatedAt: now };
    default:
      return { updatedAt: now };
  }
}

export async function syncUserChangeToFirebase(
  user: User,
  action: UserAdminAction,
) {
  if (!isFirebaseEnabled) return;
  if (action === 'delete' || action === 'deactivate') {
    await disableAuthUserRemote(user.uid, !isUserActive(user));
  }
  await upsertUserRemote(user);
}

export async function provisionUserInFirebase(params: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  professionalRole: ProfessionalRole;
  unitIds: string[];
}): Promise<{ ok: boolean; user?: User; error?: string }> {
  if (!isFirebaseEnabled) {
    const uid = `local-${Date.now()}`;
    return {
      ok: true,
      user: {
        id: uid,
        uid,
        name: params.name,
        email: params.email.toLowerCase(),
        role: params.role,
        professionalRole: params.professionalRole,
        permissions: permissionsFor(params.role, params.professionalRole),
        unitIds: params.unitIds,
        sectorIds: [],
        active: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }
  return createAuthUserAndProfile(params);
}

export async function loadRemoteUserProfile(uid: string) {
  return fetchUserProfile(uid);
}
