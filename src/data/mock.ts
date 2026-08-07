import type {
  ActionPlan,
  AppSettings,
  Audit,
  Questionnaire,
  Sector,
  Unit,
  User,
} from '../types';
import {
  buildSeedSectors,
  buildSeedUnit,
  buildSeedUsers,
  nutrisanoQuestionnaire,
  SEED_UNIT_ID,
} from './seedConfig';

export const BRAND = {
  name: 'NANNAI Nutrição',
  slogan: 'Alimentar bem, viver melhor',
  initialUnit: 'NANNAI Muro Alto',
} as const;

export const defaultAppSettings: AppSettings = {
  autoSaveIntervalMs: 10000,
  requirePhotoOnNonConformity: true,
  defaultUnitId: SEED_UNIT_ID,
  companyName: BRAND.name,
  slogan: BRAND.slogan,
  theme: 'light',
  brandColors: {
    olive: '#6b7f3a',
    gold: '#b8954a',
    wine: '#5c2e35',
    cream: '#f7f1e8',
  },
  pwa: {
    offlineEnabled: true,
    autoSyncOnReconnect: true,
    installPromptEnabled: true,
  },
};

/** Contas iniciais: admins fundadores + nutricionista */
export const mockUsers: User[] = buildSeedUsers(SEED_UNIT_ID);

/** Unidade e setores oficiais (também garantidos pelo seed idempotente) */
export const mockUnits: Unit[] = [buildSeedUnit()];
export const mockSectors: Sector[] = buildSeedSectors(SEED_UNIT_ID);

/** Sem auditorias nem planos fictícios — sistema inicia limpo */
export const mockAudits: Audit[] = [];
export const mockActionPlans: ActionPlan[] = [];

/** Questionário oficial Nutrisano */
export const mockQuestionnaire: Questionnaire = nutrisanoQuestionnaire;
