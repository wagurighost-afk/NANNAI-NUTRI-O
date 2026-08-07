export type UserRole = 'admin' | 'gestor' | 'auditor' | 'responsavel';

export type ProfessionalRole =
  | 'Administrador'
  | 'Nutricionista'
  | 'Gestor'
  | 'Auditor'
  | 'Responsável pelo setor';

export type Permission =
  | 'users.manage'
  | 'users.create'
  | 'users.edit'
  | 'users.activate'
  | 'units.manage'
  | 'questionnaires.manage'
  | 'recipients.manage'
  | 'reports.generate'
  | 'reports.send'
  | 'audits.view_all'
  | 'audits.perform'
  | 'audits.finalize'
  | 'audits.sign'
  | 'action_plans.manage'
  | 'action_plans.validate'
  | 'indicators.view'
  | 'settings.manage'
  | 'branding.manage'
  | 'history.view';

export type ConformityStatus =
  | 'conforme'
  | 'parcialmente_conforme'
  | 'nao_conforme'
  | 'nao_se_aplica';

export type AuditStatus = 'rascunho' | 'em_andamento' | 'concluida' | 'cancelada';

export type ActionPlanStatus =
  | 'aberto'
  | 'em_andamento'
  | 'aguardando_validacao'
  | 'concluido'
  | 'atrasado';

export type Priority = 'baixa' | 'media' | 'alta' | 'critica';

export type SyncStatus = 'synced' | 'pending' | 'error' | 'offline';

export interface User {
  /** Local id (same as uid when synced with Firebase Auth) */
  id: string;
  /** Firebase Auth UID */
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  professionalRole: ProfessionalRole;
  permissions: Permission[];
  unitIds: string[];
  sectorIds: string[];
  /** Prefer isActive; `active` kept for compatibility */
  active: boolean;
  isActive: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserAdminAction =
  | 'create'
  | 'update'
  | 'activate'
  | 'deactivate'
  | 'delete'
  | 'remove_admin'
  | 'grant_admin'
  | 'change_role'
  | 'change_permissions';

export interface UserAdminHistoryEntry {
  id: string;
  actorUid: string;
  actorName: string;
  actorEmail: string;
  targetUid: string;
  targetName: string;
  targetEmail: string;
  action: UserAdminAction;
  reason: string;
  details?: string;
  createdAt: string;
}

export interface Unit {
  id: string;
  name: string;
  address?: string;
  city?: string;
  active: boolean;
}

export interface Sector {
  id: string;
  unitId: string;
  name: string;
  responsibleId?: string;
  active: boolean;
}

export interface Question {
  id: string;
  sectionId: string;
  order: number;
  text: string;
  guidance?: string;
  /** Mantido para compatibilidade; pontuação Nutrisano usa maxScore/partialScore absolutos */
  weight: number;
  /** Pontos quando Conforme */
  maxScore: number;
  /** Pontos quando Parcial — ausente = opção Parcial não disponível */
  partialScore?: number;
  /** Se false, a opção Parcial não é exibida */
  allowsPartial?: boolean;
  requiresPhoto: boolean;
  critical: boolean;
  active: boolean;
}

export interface QuestionnaireSection {
  id: string;
  questionnaireId: string;
  name: string;
  description?: string;
  order: number;
  questions: Question[];
}

export interface Questionnaire {
  id: string;
  name: string;
  description?: string;
  version: string;
  active: boolean;
  sections: QuestionnaireSection[];
  updatedAt: string;
}

export interface Evidence {
  id: string;
  type: 'photo' | 'document' | 'note';
  url: string;
  localUri?: string;
  caption?: string;
  createdAt: string;
  synced: boolean;
}

export interface AuditAnswer {
  questionId: string;
  status: ConformityStatus | null;
  score: number;
  weight: number;
  /** Pontuação máxima da pergunta (conforme) */
  maxScore: number;
  partialScore?: number;
  comment: string;
  evidences: Evidence[];
  flaggedForReview: boolean;
  responsibleId?: string;
  dueDate?: string;
  actionPlanId?: string;
  answeredAt?: string;
}

export interface Signature {
  name: string;
  role: string;
  signedAt: string;
  dataUrl: string;
}

export type ReportSendStatus =
  | 'aguardando_envio'
  | 'enviado'
  | 'parcialmente_enviado'
  | 'falha';

export interface Audit {
  id: string;
  code: string;
  questionnaireId: string;
  questionnaireName: string;
  unitId: string;
  unitName: string;
  sectorId: string;
  sectorName: string;
  auditorId: string;
  auditorName: string;
  status: AuditStatus;
  startedAt: string;
  completedAt?: string;
  answers: Record<string, AuditAnswer>;
  currentSectionIndex: number;
  currentQuestionIndex: number;
  generalComment?: string;
  auditorSignature?: Signature;
  responsibleSignature?: Signature;
  score: number;
  maxScore: number;
  conformityPercent: number;
  syncStatus: SyncStatus;
  updatedAt: string;
  /** Status do envio do relatório PDF após finalização */
  reportSendStatus?: ReportSendStatus;
  /** ID estável do PDF vinculado (auditId → reportId → pdfFile) */
  reportId?: string;
  pdfFileName?: string;
  pdfSizeBytes?: number;
}

export interface ActionPlan {
  id: string;
  auditId: string;
  auditCode: string;
  questionId: string;
  questionText: string;
  unitId: string;
  unitName: string;
  sectorId: string;
  sectorName: string;
  nonConformityDescription: string;
  correctiveAction: string;
  responsibleId: string;
  responsibleName: string;
  priority: Priority;
  dueDate: string;
  status: ActionPlanStatus;
  photosBefore: Evidence[];
  photosAfter: Evidence[];
  observations: string;
  validatedBy?: string;
  validatedAt?: string;
  validationNotes?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface AuditStats {
  totalAudits: number;
  inProgress: number;
  completed: number;
  averageScore: number;
  conformityPercent: number;
  openNonConformities: number;
  overdueActionPlans: number;
}

export interface ScoreEvolutionPoint {
  period: string;
  score: number;
  conformity: number;
}

export interface SectorResult {
  sectorName: string;
  score: number;
  conformity: number;
  audits: number;
}

export interface TopNonConformity {
  questionText: string;
  sectionName: string;
  count: number;
}

export interface AppSettings {
  autoSaveIntervalMs: number;
  requirePhotoOnNonConformity: boolean;
  defaultUnitId: string;
  companyName: string;
  slogan: string;
  theme: 'light';
  /** Cores da marca (CSS hex) — editáveis pela administradora */
  brandColors: {
    olive: string;
    gold: string;
    wine: string;
    cream: string;
  };
  /** URL/data da logo customizada (opcional; padrão = logo NANNAI) */
  logoDataUrl?: string;
  /** Configurações PWA */
  pwa: {
    offlineEnabled: boolean;
    autoSyncOnReconnect: boolean;
    installPromptEnabled: boolean;
  };
}

export type AppNotificationType =
  | 'auditoria_pendente'
  | 'plano_atrasado'
  | 'plano_vencendo'
  | 'novo_relatorio'
  | 'envio_realizado'
  | 'erro_envio';

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  title: string;
  message: string;
  href?: string;
  createdAt: string;
  read: boolean;
}

export type EmailSendStatus =
  | 'preparando'
  | 'enviado'
  | 'falha'
  | 'parcialmente_enviado'
  | 'aguardando_reenvio'
  | 'aguardando_conexao';

export type RecipientGroupKey =
  | 'diretoria'
  | 'chefia_ab'
  | 'nutricao'
  | 'cozinha'
  | 'confeitaria_padaria'
  | 'gestores_unidade'
  | 'custom';

export interface ReportRecipient {
  id: string;
  name: string;
  email: string;
  roleTitle?: string;
  active: boolean;
  isPrimary: boolean;
  unitIds: string[];
  sectorIds: string[];
  groupIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RecipientGroup {
  id: string;
  name: string;
  key: RecipientGroupKey;
  description?: string;
  recipientIds: string[];
  unitIds: string[];
  active: boolean;
}

export type AutoRecipientRuleType =
  | 'unidade'
  | 'setor'
  | 'tipo_auditoria'
  | 'gravidade_nc'
  | 'pontuacao_final'
  | 'nc_critica';

export interface AutoRecipientRule {
  id: string;
  name: string;
  type: AutoRecipientRuleType;
  active: boolean;
  /** Match values: unitId, sectorId, questionnaireId, priority, score threshold, etc. */
  matchValue?: string;
  /** For score rules: select recipients when conformityPercent < threshold */
  scoreBelow?: number;
  recipientIds: string[];
  groupIds: string[];
  forcePrimaryOnCritical: boolean;
}

export interface EmailRecipientSnapshot {
  name: string;
  email: string;
  type: 'to' | 'cc' | 'bcc';
  recipientId?: string;
}

export interface EmailSendRecord {
  id: string;
  auditId: string;
  auditCode: string;
  /** PDF automaticamente vinculado ao envio */
  reportId?: string;
  unitName: string;
  sectorName: string;
  subject: string;
  body: string;
  recipients: EmailRecipientSnapshot[];
  pdfFileName: string;
  pdfSizeBytes: number;
  status: EmailSendStatus;
  sentByUserId: string;
  sentByName: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  errors: string[];
  copyToSelf: boolean;
  queuedOffline: boolean;
}
