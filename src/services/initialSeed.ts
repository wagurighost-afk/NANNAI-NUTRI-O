import {
  SEED_VERSION,
  buildSeedRecipientGroup,
  buildSeedRecipients,
  buildSeedSectors,
  buildSeedUnit,
  buildSeedUsers,
  nutrisanoQuestionnaire,
} from '../data/seedConfig';
import { useAppStore } from '../stores/appStore';
import { useEmailStore } from '../stores/emailStore';
import { permissionsFor } from '../utils/permissions';

let seedRunning = false;

/**
 * Seed inicial idempotente — executa uma vez na primeira carga
 * e nunca duplica registros existentes (verifica por id/nome/e-mail).
 */
export function ensureInitialSeed(): void {
  if (seedRunning) return;
  seedRunning = true;

  try {
    seedAppData();
    seedEmailData();
  } finally {
    seedRunning = false;
  }
}

function seedAppData(): void {
  const state = useAppStore.getState();
  let units = [...state.units];
  let sectors = [...state.sectors];
  let users = [...state.users];
  let questionnaire = state.questionnaire;
  let changed = false;

  // Unidade NANNAI Muro Alto
  const seedUnit = buildSeedUnit();
  const existingUnit =
    units.find((u) => u.id === seedUnit.id) ??
    units.find(
      (u) => u.name.trim().toLowerCase() === seedUnit.name.toLowerCase(),
    );

  let unitId = existingUnit?.id;
  if (!existingUnit) {
    units = [...units, seedUnit];
    unitId = seedUnit.id;
    changed = true;
  }

  if (!unitId) unitId = seedUnit.id;

  // Setores
  const seedSectors = buildSeedSectors(unitId);
  for (const sector of seedSectors) {
    const exists =
      sectors.some((s) => s.id === sector.id) ||
      sectors.some(
        (s) =>
          s.unitId === unitId &&
          s.name.trim().toLowerCase() === sector.name.toLowerCase(),
      );
    if (!exists) {
      sectors = [...sectors, sector];
      changed = true;
    }
  }

  // Contas iniciais: David e Mauro (admins fundadores) + Renata (nutricionista/admin)
  const seedUsers = buildSeedUsers(unitId);
  const nowIso = new Date().toISOString();

  for (const seedUser of seedUsers) {
    const existing =
      users.find((u) => u.id === seedUser.id || u.uid === seedUser.uid) ??
      users.find(
        (u) => u.email.toLowerCase() === seedUser.email.toLowerCase(),
      );

    if (!existing) {
      users = [seedUser, ...users];
      changed = true;
      continue;
    }

    const unitIds = existing.unitIds.includes(unitId)
      ? existing.unitIds
      : [...existing.unitIds, unitId];
    const needsSync =
      existing.role !== seedUser.role ||
      existing.professionalRole !== seedUser.professionalRole ||
      !(existing.isActive ?? existing.active) ||
      unitIds !== existing.unitIds ||
      existing.email.toLowerCase() !== seedUser.email.toLowerCase();

    if (needsSync) {
      users = users.map((u) =>
        u.id === existing.id || u.uid === existing.uid
          ? {
              ...u,
              name: seedUser.name,
              email: seedUser.email,
              role: seedUser.role,
              professionalRole: seedUser.professionalRole,
              permissions: permissionsFor(
                seedUser.role,
                seedUser.professionalRole,
              ),
              unitIds,
              active: true,
              isActive: true,
              updatedAt: nowIso,
            }
          : u,
      );
      changed = true;
    }
  }

  // Questionário oficial Nutrisano (substitui template genérico na 1ª configuração)
  const isOfficial =
    questionnaire.id === nutrisanoQuestionnaire.id ||
    questionnaire.version === nutrisanoQuestionnaire.version;
  const questionCount = questionnaire.sections.reduce(
    (n, s) => n + s.questions.length,
    0,
  );
  if (!isOfficial || questionCount !== 119) {
    questionnaire = nutrisanoQuestionnaire;
    changed = true;
  }

  const seedCompleted =
    state.seedVersion >= SEED_VERSION && state.initialSeedCompleted;

  if (changed || !seedCompleted) {
    useAppStore.setState({
      units,
      sectors,
      users,
      questionnaire,
      settings: {
        ...state.settings,
        defaultUnitId: unitId,
        companyName: state.settings.companyName || 'NANNAI Nutrição',
      },
      initialSeedCompleted: true,
      seedVersion: SEED_VERSION,
      pendingSyncCount: 0,
    });
  }
}

function seedEmailData(): void {
  const app = useAppStore.getState();
  const unitId = app.units[0]?.id ?? buildSeedUnit().id;
  const email = useEmailStore.getState();
  let recipients = [...email.recipients];
  let groups = [...email.groups];
  let changed = false;

  const seedRecipients = buildSeedRecipients(unitId);
  for (const rcpt of seedRecipients) {
    const existing =
      recipients.find((r) => r.id === rcpt.id) ||
      recipients.find(
        (r) => r.email.toLowerCase() === rcpt.email.toLowerCase(),
      );
    if (!existing) {
      recipients = [...recipients, rcpt];
      changed = true;
    } else if (!existing.isPrimary || existing.groupIds.length === 0) {
      // Garante que destinatários oficiais fiquem ativos/principais no upgrade
      recipients = recipients.map((r) =>
        r.id === existing.id ||
        r.email.toLowerCase() === existing.email.toLowerCase()
          ? {
              ...r,
              active: true,
              isPrimary: true,
              unitIds: r.unitIds.includes(unitId)
                ? r.unitIds
                : [...r.unitIds, unitId],
              groupIds: r.groupIds.includes(rcpt.groupIds[0])
                ? r.groupIds
                : [...r.groupIds, ...rcpt.groupIds],
              updatedAt: new Date().toISOString(),
            }
          : r,
      );
      changed = true;
    }
  }

  const recipientIds = seedRecipients.map((r) => r.id);
  const seedGroup = buildSeedRecipientGroup(unitId, recipientIds);
  const existingGroup =
    groups.find((g) => g.id === seedGroup.id) ||
    groups.find((g) => g.name === seedGroup.name);
  if (!existingGroup) {
    groups = [...groups, seedGroup];
    changed = true;
  } else if (existingGroup.recipientIds.length < recipientIds.length) {
    groups = groups.map((g) =>
      g.id === existingGroup.id
        ? {
            ...g,
            active: true,
            recipientIds: Array.from(
              new Set([...g.recipientIds, ...recipientIds]),
            ),
          }
        : g,
    );
    changed = true;
  }

  if (changed || !email.initialSeedCompleted || email.seedVersion < SEED_VERSION) {
    useEmailStore.setState({
      recipients,
      groups,
      initialSeedCompleted: true,
      seedVersion: SEED_VERSION,
    });
  }
}
