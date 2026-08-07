import type { Permission, ProfessionalRole, User, UserRole } from '../types';

export const ALL_PERMISSIONS: Permission[] = [
  'users.manage',
  'users.create',
  'users.edit',
  'users.activate',
  'units.manage',
  'questionnaires.manage',
  'recipients.manage',
  'reports.generate',
  'reports.send',
  'audits.view_all',
  'audits.perform',
  'audits.finalize',
  'audits.sign',
  'action_plans.manage',
  'action_plans.validate',
  'indicators.view',
  'settings.manage',
  'branding.manage',
  'history.view',
];

export const NUTRITIONIST_EXTRA_PERMISSIONS: Permission[] = [
  'audits.perform',
  'audits.finalize',
  'audits.sign',
  'action_plans.manage',
  'action_plans.validate',
  'reports.send',
  'reports.generate',
];

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [...ALL_PERMISSIONS],
  gestor: [
    'users.manage',
    'users.create',
    'users.edit',
    'units.manage',
    'questionnaires.manage',
    'recipients.manage',
    'reports.generate',
    'reports.send',
    'audits.view_all',
    'audits.perform',
    'audits.finalize',
    'audits.sign',
    'action_plans.manage',
    'action_plans.validate',
    'indicators.view',
    'history.view',
  ],
  auditor: [
    'audits.perform',
    'audits.finalize',
    'audits.sign',
    'action_plans.manage',
    'reports.generate',
    'indicators.view',
  ],
  responsavel: [
    'action_plans.manage',
    'action_plans.validate',
    'indicators.view',
  ],
};

export const professionalRoleLabels: Record<ProfessionalRole, string> = {
  Administrador: 'Administrador',
  Nutricionista: 'Nutricionista',
  Gestor: 'Gestor',
  Auditor: 'Auditor',
  'Responsável pelo setor': 'Responsável pelo setor',
};

export function permissionsFor(
  role: UserRole,
  professionalRole?: ProfessionalRole,
): Permission[] {
  const base = new Set(ROLE_DEFAULT_PERMISSIONS[role]);
  if (professionalRole === 'Nutricionista') {
    for (const p of NUTRITIONIST_EXTRA_PERMISSIONS) base.add(p);
  }
  if (role === 'admin') {
    for (const p of ALL_PERMISSIONS) base.add(p);
  }
  return [...base];
}

export function hasPermission(user: User | null | undefined, permission: Permission) {
  if (!user || !(user.isActive ?? user.active)) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.includes(permission) ?? false;
}

export function isUserActive(user: User) {
  return user.isActive ?? user.active;
}

export function countActiveAdmins(users: User[]) {
  return users.filter((u) => u.role === 'admin' && isUserActive(u)).length;
}

export function buildUserProfile(input: {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  professionalRole: ProfessionalRole;
  unitIds?: string[];
  sectorIds?: string[];
  permissions?: Permission[];
}): User {
  const now = new Date().toISOString();
  return {
    id: input.uid,
    uid: input.uid,
    name: input.name,
    email: input.email.toLowerCase(),
    role: input.role,
    professionalRole: input.professionalRole,
    permissions:
      input.permissions ??
      permissionsFor(input.role, input.professionalRole),
    unitIds: input.unitIds ?? ['unit1'],
    sectorIds: input.sectorIds ?? [],
    active: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

/** Administradores iniciais (Auth + Firestore) */
export const INITIAL_ADMINS = [
  {
    name: 'David Oliveira',
    email: 'david.oliveira@nannai.com.br',
    professionalRole: 'Administrador' as const,
    role: 'admin' as const,
    seedPasswordEnv: 'SEED_ADMIN_DAVID_PASSWORD',
    defaultSeedPassword: 'Nannai@2026',
  },
  {
    name: 'Mauro José',
    email: 'mauro.jose@nannai.net.br',
    professionalRole: 'Administrador' as const,
    role: 'admin' as const,
    seedPasswordEnv: 'SEED_ADMIN_MAURO_PASSWORD',
    defaultSeedPassword: 'Nannai@2026',
  },
  {
    name: 'Renata Fernanda',
    email: 'renata.fernanda@nannai.com.br',
    professionalRole: 'Nutricionista' as const,
    role: 'admin' as const,
    seedPasswordEnv: 'SEED_ADMIN_RENATA_PASSWORD',
    defaultSeedPassword: 'Nannai@2026',
  },
] as const;

/** @deprecated Use INITIAL_ADMINS — Renata também é administradora */
export const INITIAL_NUTRITIONIST = INITIAL_ADMINS[2];

/** Todas as contas iniciais */
export const INITIAL_SEED_USERS = [...INITIAL_ADMINS] as const;
