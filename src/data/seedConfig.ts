import type {
  RecipientGroup,
  ReportRecipient,
  Sector,
  Unit,
  User,
} from '../types';
import { permissionsFor } from '../utils/permissions';
import { nutrisanoQuestionnaire } from './nutrisanoQuestionnaire';

export const SEED_VERSION = 2;
export const SEED_GROUP_ID = 'grp-gestao-nutricao';

export const SEED_UNIT_ID = 'unit-nannai-muro-alto';
export const SEED_ADMIN_ID = 'uid-renata-fernanda';

export const SECTOR_NAMES = [
  'Cozinha Principal',
  'Confeitaria',
  'Padaria',
  'Garde Manger',
  'Açougue',
  'Câmara Fria',
  'Estoque Seco',
  'Almoxarifado',
  'Recebimento de Mercadorias',
  'Lavagem de Utensílios',
  'Higienização de Hortifrúti',
  'Restaurante',
  'Room Service',
  'Bar',
  'Copa',
  'Nutrição',
  'Refeitório de Colaboradores',
  'Depósito de Produtos Químicos',
  'Área de Resíduos',
  'Expedição',
] as const;

export const SEED_RECIPIENTS: Array<{
  id: string;
  name: string;
  email: string;
}> = [
  {
    id: 'rcpt-fernando-pavan',
    name: 'Fernando Pavan',
    email: 'fernando.pavan@nannai.com.br',
  },
  {
    id: 'rcpt-ariela-thompson',
    name: 'Ariela Thompson',
    email: 'ariela.thompson@nannai.com.br',
  },
  {
    id: 'rcpt-renata-fernanda',
    name: 'Renata Fernanda',
    email: 'renata.fernanda@nannai.com.br',
  },
  {
    id: 'rcpt-jhonny-silva',
    name: 'Jhonny Silva',
    email: 'jhonny.silva@nannai.com.br',
  },
  {
    id: 'rcpt-neto-vargas',
    name: 'Neto Vargas',
    email: 'neto.vargas@nannai.com.br',
  },
  {
    id: 'rcpt-david-oliveira',
    name: 'David Oliveira',
    email: 'david.oliveira@nannai.com.br',
  },
];

export function buildSeedUnit(): Unit {
  return {
    id: SEED_UNIT_ID,
    name: 'NANNAI Muro Alto',
    address: 'Muro Alto',
    city: 'Ipojuca',
    active: true,
  };
}

export function buildSeedSectors(unitId: string): Sector[] {
  return SECTOR_NAMES.map((name, index) => ({
    id: `sector-${String(index + 1).padStart(2, '0')}`,
    unitId,
    name,
    active: true,
  }));
}

export function buildSeedAdmin(unitId: string): User {
  return {
    id: SEED_ADMIN_ID,
    uid: SEED_ADMIN_ID,
    name: 'Renata Fernanda',
    email: 'renata.fernanda@nannai.com.br',
    role: 'admin',
    professionalRole: 'Nutricionista',
    permissions: permissionsFor('admin', 'Nutricionista'),
    unitIds: [unitId],
    sectorIds: [],
    active: true,
    isActive: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
  };
}

export function buildSeedRecipients(unitId: string): ReportRecipient[] {
  const now = '2026-01-01T10:00:00Z';
  return SEED_RECIPIENTS.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    roleTitle: undefined,
    active: true,
    /** Todos os destinatários oficiais recebem por padrão */
    isPrimary: true,
    unitIds: [unitId],
    sectorIds: [],
    groupIds: [SEED_GROUP_ID],
    createdAt: now,
    updatedAt: now,
  }));
}

export function buildSeedRecipientGroup(
  unitId: string,
  recipientIds: string[],
): RecipientGroup {
  return {
    id: SEED_GROUP_ID,
    name: 'Gestão e Nutrição',
    key: 'nutricao',
    description: 'Destinatários automáticos dos relatórios do NANNAI Muro Alto',
    recipientIds,
    unitIds: [unitId],
    active: true,
  };
}

export { nutrisanoQuestionnaire };
