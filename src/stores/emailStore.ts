import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AutoRecipientRule,
  EmailSendRecord,
  RecipientGroup,
  ReportRecipient,
} from '../types';
import {
  mockAutoRecipientRules,
  mockEmailHistory,
  mockRecipientGroups,
  mockReportRecipients,
} from '../data/emailRecipients';

interface EmailState {
  recipients: ReportRecipient[];
  groups: RecipientGroup[];
  rules: AutoRecipientRule[];
  history: EmailSendRecord[];
  addRecipient: (
    data: Omit<ReportRecipient, 'id' | 'createdAt' | 'updatedAt'>,
  ) => ReportRecipient;
  updateRecipient: (id: string, patch: Partial<ReportRecipient>) => void;
  deleteRecipient: (id: string) => void;
  addGroup: (data: Omit<RecipientGroup, 'id'>) => RecipientGroup;
  updateGroup: (id: string, patch: Partial<RecipientGroup>) => void;
  deleteGroup: (id: string) => void;
  addRule: (data: Omit<AutoRecipientRule, 'id'>) => AutoRecipientRule;
  updateRule: (id: string, patch: Partial<AutoRecipientRule>) => void;
  deleteRule: (id: string) => void;
  addHistoryRecord: (record: EmailSendRecord) => void;
  updateHistoryRecord: (id: string, patch: Partial<EmailSendRecord>) => void;
}

export const useEmailStore = create<EmailState>()(
  persist(
    (set) => ({
      recipients: mockReportRecipients,
      groups: mockRecipientGroups,
      rules: mockAutoRecipientRules,
      history: mockEmailHistory,

      addRecipient: (data) => {
        const now = new Date().toISOString();
        const created: ReportRecipient = {
          ...data,
          id: `rcpt-${Date.now()}`,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ recipients: [...s.recipients, created] }));
        return created;
      },

      updateRecipient: (id, patch) =>
        set((s) => ({
          recipients: s.recipients.map((r) =>
            r.id === id
              ? { ...r, ...patch, updatedAt: new Date().toISOString() }
              : r,
          ),
        })),

      deleteRecipient: (id) =>
        set((s) => ({
          recipients: s.recipients.filter((r) => r.id !== id),
          groups: s.groups.map((g) => ({
            ...g,
            recipientIds: g.recipientIds.filter((rid) => rid !== id),
          })),
        })),

      addGroup: (data) => {
        const created: RecipientGroup = {
          ...data,
          id: `grp-${Date.now()}`,
        };
        set((s) => ({ groups: [...s.groups, created] }));
        return created;
      },

      updateGroup: (id, patch) =>
        set((s) => ({
          groups: s.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),

      deleteGroup: (id) =>
        set((s) => ({
          groups: s.groups.filter((g) => g.id !== id),
          recipients: s.recipients.map((r) => ({
            ...r,
            groupIds: r.groupIds.filter((gid) => gid !== id),
          })),
        })),

      addRule: (data) => {
        const created: AutoRecipientRule = {
          ...data,
          id: `rule-${Date.now()}`,
        };
        set((s) => ({ rules: [...s.rules, created] }));
        return created;
      },

      updateRule: (id, patch) =>
        set((s) => ({
          rules: s.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),

      deleteRule: (id) =>
        set((s) => ({
          rules: s.rules.filter((r) => r.id !== id),
        })),

      addHistoryRecord: (record) =>
        set((s) => ({ history: [record, ...s.history] })),

      updateHistoryRecord: (id, patch) =>
        set((s) => ({
          history: s.history.map((h) =>
            h.id === id
              ? { ...h, ...patch, updatedAt: new Date().toISOString() }
              : h,
          ),
        })),
    }),
    { name: 'nannai-email-data' },
  ),
);
