import type {
  AutoRecipientRule,
  EmailSendRecord,
  RecipientGroup,
  ReportRecipient,
} from '../types';
import { buildSeedRecipients, SEED_UNIT_ID } from './seedConfig';

/** Destinatários oficiais do seed (não são usuários do sistema) */
export const mockReportRecipients: ReportRecipient[] =
  buildSeedRecipients(SEED_UNIT_ID);

/** Grupos e regras começam vazios — criados pela administradora */
export const mockRecipientGroups: RecipientGroup[] = [];
export const mockAutoRecipientRules: AutoRecipientRule[] = [];
export const mockEmailHistory: EmailSendRecord[] = [];
