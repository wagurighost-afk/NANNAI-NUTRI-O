import type {
  AutoRecipientRule,
  EmailSendRecord,
  RecipientGroup,
  ReportRecipient,
} from '../types';
import {
  buildSeedRecipientGroup,
  buildSeedRecipients,
  SEED_UNIT_ID,
} from './seedConfig';

/** Destinatários oficiais do seed (não são usuários do sistema) */
export const mockReportRecipients: ReportRecipient[] =
  buildSeedRecipients(SEED_UNIT_ID);

export const mockRecipientGroups: RecipientGroup[] = [
  buildSeedRecipientGroup(
    SEED_UNIT_ID,
    mockReportRecipients.map((r) => r.id),
  ),
];

export const mockAutoRecipientRules: AutoRecipientRule[] = [];
export const mockEmailHistory: EmailSendRecord[] = [];
