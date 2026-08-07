import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ActionPlan,
  AppSettings,
  Audit,
  Questionnaire,
  Sector,
  Unit,
  User,
  UserAdminHistoryEntry,
} from '../types';
import {
  defaultAppSettings,
  mockActionPlans,
  mockAudits,
  mockQuestionnaire,
  mockSectors,
  mockUnits,
  mockUsers,
} from '../data/mock';
import { computeAuditTotals, generateAuditCode, scoreForStatus } from '../utils';
import type { ConformityStatus, Priority, ActionPlanStatus } from '../types';
import { permissionsFor } from '../utils/permissions';

interface AppState {
  audits: Audit[];
  actionPlans: ActionPlan[];
  users: User[];
  units: Unit[];
  sectors: Sector[];
  questionnaire: Questionnaire;
  userAdminHistory: UserAdminHistoryEntry[];
  settings: AppSettings;
  initialSeedCompleted: boolean;
  seedVersion: number;
  dismissedNotificationIds: string[];
  online: boolean;
  pendingSyncCount: number;
  setOnline: (v: boolean) => void;
  createAudit: (payload: {
    unitId: string;
    sectorId: string;
    auditorId: string;
    auditorName: string;
  }) => Audit;
  updateAnswer: (
    auditId: string,
    questionId: string,
    patch: Partial<Audit['answers'][string]>,
  ) => void;
  setAuditProgress: (
    auditId: string,
    sectionIndex: number,
    questionIndex: number,
  ) => void;
  completeAudit: (
    auditId: string,
    data: {
      generalComment: string;
      auditorSignature: Audit['auditorSignature'];
      responsibleSignature: Audit['responsibleSignature'];
    },
  ) => void;
  updateAudit: (id: string, patch: Partial<Audit>) => void;
  createActionPlan: (plan: Omit<ActionPlan, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => ActionPlan;
  updateActionPlan: (id: string, patch: Partial<ActionPlan>) => void;
  updateQuestionnaire: (q: Questionnaire) => void;
  updateUser: (id: string, patch: Partial<User>) => void;
  addUser: (
    user: Omit<User, 'id' | 'uid' | 'createdAt' | 'updatedAt' | 'permissions'> & {
      uid?: string;
      permissions?: User['permissions'];
    },
  ) => User;
  removeUser: (id: string) => void;
  addUserAdminHistory: (entry: UserAdminHistoryEntry) => void;
  addUnit: (unit: Omit<Unit, 'id'>) => void;
  updateUnit: (id: string, patch: Partial<Unit>) => void;
  addSector: (sector: Omit<Sector, 'id'>) => void;
  updateSector: (id: string, patch: Partial<Sector>) => void;
  deleteSector: (id: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  dismissNotification: (id: string) => void;
  markSynced: () => void;
  setUsers: (users: User[]) => void;
}

function emptyAnswers(questionnaire: Questionnaire): Audit['answers'] {
  const answers: Audit['answers'] = {};
  for (const section of questionnaire.sections) {
    for (const q of section.questions) {
      if (!q.active) continue;
      answers[q.id] = {
        questionId: q.id,
        status: null,
        score: 0,
        weight: q.weight,
        maxScore: q.maxScore,
        partialScore: q.partialScore,
        comment: '',
        evidences: [],
        flaggedForReview: false,
      };
    }
  }
  return answers;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      audits: mockAudits,
      actionPlans: mockActionPlans,
      users: mockUsers,
      units: mockUnits,
      sectors: mockSectors,
      questionnaire: mockQuestionnaire,
      userAdminHistory: [],
      settings: defaultAppSettings,
      initialSeedCompleted: false,
      seedVersion: 0,
      dismissedNotificationIds: [],
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      pendingSyncCount: 0,

      setOnline: (v) => set({ online: v }),

      createAudit: ({ unitId, sectorId, auditorId, auditorName }) => {
        const { units, sectors, questionnaire, audits } = get();
        const unit = units.find((u) => u.id === unitId)!;
        const sector = sectors.find((s) => s.id === sectorId)!;
        const now = new Date().toISOString();
        const audit: Audit = {
          id: `a-${Date.now()}`,
          code: generateAuditCode(audits),
          questionnaireId: questionnaire.id,
          questionnaireName: questionnaire.name,
          unitId: unit.id,
          unitName: unit.name,
          sectorId: sector.id,
          sectorName: sector.name,
          auditorId,
          auditorName,
          status: 'em_andamento',
          startedAt: now,
          answers: emptyAnswers(questionnaire),
          currentSectionIndex: 0,
          currentQuestionIndex: 0,
          score: 0,
          maxScore: 0,
          conformityPercent: 0,
          syncStatus: 'pending',
          updatedAt: now,
        };
        set((s) => ({
          audits: [audit, ...s.audits],
          pendingSyncCount: s.pendingSyncCount + 1,
        }));
        return audit;
      },

      updateAnswer: (auditId, questionId, patch) => {
        set((s) => {
          const audits = s.audits.map((a) => {
            if (a.id !== auditId) return a;
            const question = s.questionnaire.sections
              .flatMap((sec) => sec.questions)
              .find((q) => q.id === questionId);
            const prev = a.answers[questionId];
            const status = (patch.status ?? prev.status) as ConformityStatus | null;
            const maxScore = question?.maxScore ?? prev.maxScore ?? 10;
            const partialScore = question?.partialScore ?? prev.partialScore;
            const next = {
              ...prev,
              ...patch,
              maxScore,
              partialScore,
              score:
                patch.score ??
                scoreForStatus(status, maxScore, partialScore),
              answeredAt: patch.status ? new Date().toISOString() : prev.answeredAt,
            };
            const answers = { ...a.answers, [questionId]: next };
            const totals = computeAuditTotals(answers, s.questionnaire);
            return {
              ...a,
              answers,
              score: totals.score,
              maxScore: totals.maxScore,
              conformityPercent: totals.conformityPercent,
              syncStatus: 'pending' as const,
              updatedAt: new Date().toISOString(),
            };
          });
          return { audits, pendingSyncCount: s.pendingSyncCount + 1 };
        });
      },

      setAuditProgress: (auditId, sectionIndex, questionIndex) => {
        set((s) => ({
          audits: s.audits.map((a) =>
            a.id === auditId
              ? {
                  ...a,
                  currentSectionIndex: sectionIndex,
                  currentQuestionIndex: questionIndex,
                  updatedAt: new Date().toISOString(),
                }
              : a,
          ),
        }));
      },

      completeAudit: (auditId, data) => {
        set((s) => ({
          audits: s.audits.map((a) =>
            a.id === auditId
              ? {
                  ...a,
                  ...data,
                  status: 'concluida' as const,
                  completedAt: new Date().toISOString(),
                  reportSendStatus: a.reportSendStatus ?? 'aguardando_envio',
                  syncStatus: 'pending' as const,
                  updatedAt: new Date().toISOString(),
                }
              : a,
          ),
          pendingSyncCount: s.pendingSyncCount + 1,
        }));
      },

      updateAudit: (id, patch) => {
        set((s) => ({
          audits: s.audits.map((a) =>
            a.id === id
              ? {
                  ...a,
                  ...patch,
                  updatedAt: new Date().toISOString(),
                }
              : a,
          ),
        }));
      },

      createActionPlan: (plan) => {
        const now = new Date().toISOString();
        const created: ActionPlan = {
          ...plan,
          id: `ap-${Date.now()}`,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending',
        };
        set((s) => ({
          actionPlans: [created, ...s.actionPlans],
          pendingSyncCount: s.pendingSyncCount + 1,
          audits: s.audits.map((a) => {
            if (a.id !== plan.auditId) return a;
            const answer = a.answers[plan.questionId];
            if (!answer) return a;
            return {
              ...a,
              answers: {
                ...a.answers,
                [plan.questionId]: { ...answer, actionPlanId: created.id },
              },
            };
          }),
        }));
        return created;
      },

      updateActionPlan: (id, patch) => {
        set((s) => ({
          actionPlans: s.actionPlans.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...patch,
                  status: (patch.status ?? p.status) as ActionPlanStatus,
                  priority: (patch.priority ?? p.priority) as Priority,
                  updatedAt: new Date().toISOString(),
                  syncStatus: 'pending',
                }
              : p,
          ),
          pendingSyncCount: s.pendingSyncCount + 1,
        }));
      },

      updateQuestionnaire: (q) => set({ questionnaire: q, pendingSyncCount: get().pendingSyncCount + 1 }),

      updateUser: (id, patch) =>
        set((s) => ({
          users: s.users.map((u) =>
            u.id === id || u.uid === id
              ? {
                  ...u,
                  ...patch,
                  active: patch.isActive ?? patch.active ?? u.active,
                  isActive: patch.isActive ?? patch.active ?? u.isActive,
                  updatedAt: new Date().toISOString(),
                }
              : u,
          ),
        })),

      addUser: (user) => {
        const now = new Date().toISOString();
        const uid = user.uid ?? `u-${Date.now()}`;
        const created: User = {
          ...user,
          id: uid,
          uid,
          permissions:
            user.permissions ??
            permissionsFor(user.role, user.professionalRole),
          active: user.active ?? true,
          isActive: user.isActive ?? user.active ?? true,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ users: [...s.users, created] }));
        return created;
      },

      removeUser: (id) =>
        set((s) => ({
          users: s.users.filter((u) => u.id !== id && u.uid !== id),
        })),

      addUserAdminHistory: (entry) =>
        set((s) => ({
          userAdminHistory: [entry, ...s.userAdminHistory],
        })),

      setUsers: (users) => set({ users }),

      addUnit: (unit) =>
        set((s) => ({
          units: [...s.units, { ...unit, id: `unit-${Date.now()}` }],
        })),

      updateUnit: (id, patch) =>
        set((s) => ({
          units: s.units.map((u) => (u.id === id ? { ...u, ...patch } : u)),
        })),

      addSector: (sector) =>
        set((s) => ({
          sectors: [...s.sectors, { ...sector, id: `s-${Date.now()}` }],
        })),

      updateSector: (id, patch) =>
        set((s) => ({
          sectors: s.sectors.map((sec) =>
            sec.id === id ? { ...sec, ...patch } : sec,
          ),
        })),

      deleteSector: (id) =>
        set((s) => ({
          sectors: s.sectors.filter((sec) => sec.id !== id),
        })),

      updateSettings: (patch) =>
        set((s) => ({
          settings: {
            ...s.settings,
            ...patch,
            brandColors: {
              ...s.settings.brandColors,
              ...(patch.brandColors ?? {}),
            },
            pwa: {
              ...s.settings.pwa,
              ...(patch.pwa ?? {}),
            },
          },
        })),

      dismissNotification: (id) =>
        set((s) => ({
          dismissedNotificationIds: s.dismissedNotificationIds.includes(id)
            ? s.dismissedNotificationIds
            : [...s.dismissedNotificationIds, id],
        })),

      markSynced: () =>
        set((s) => ({
          pendingSyncCount: 0,
          audits: s.audits.map((a) => ({ ...a, syncStatus: 'synced' as const })),
          actionPlans: s.actionPlans.map((p) => ({
            ...p,
            syncStatus: 'synced' as const,
          })),
        })),
    }),
    { name: 'nannai-app-data-v5' },
  ),
);

