import type {
  AutoRecipientRule,
  EmailSendRecord,
  RecipientGroup,
  ReportRecipient,
} from '../types';

/** Destinatários, grupos e regras começam vazios — cadastrados pela administradora */
export const mockReportRecipients: ReportRecipient[] = [];
export const mockRecipientGroups: RecipientGroup[] = [];
export const mockAutoRecipientRules: AutoRecipientRule[] = [];
export const mockEmailHistory: EmailSendRecord[] = [];
