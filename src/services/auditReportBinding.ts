import type { ActionPlan, Audit, Questionnaire } from '../types';
import {
  generateAuditPdfAttachment,
  type AuditPdfAttachment,
} from './pdfReport';
import {
  getAuditReportPdf,
  saveAuditReportPdf,
  type StoredAuditReport,
} from './auditReportStorage';
import { uploadAuditReportPdfRemote } from './firebaseService';

/** Identificador estável do relatório PDF vinculado à auditoria */
export function resolveReportId(auditId: string, existing?: string): string {
  return existing || `rpt-${auditId}`;
}

/**
 * Garante PDF vinculado à auditoria:
 * 1) carrega do IndexedDB se existir e for válido
 * 2) senão gera, salva e faz upload remoto (quando Firebase ativo)
 */
export async function ensureBoundAuditReportPdf(params: {
  audit: Audit;
  questionnaire: Questionnaire;
  actionPlans: ActionPlan[];
  forceRegenerate?: boolean;
}): Promise<{
  attachment: AuditPdfAttachment;
  reportId: string;
  stored: StoredAuditReport;
}> {
  const { audit, questionnaire, actionPlans, forceRegenerate } = params;
  const reportId = resolveReportId(audit.id, audit.reportId);

  if (!forceRegenerate) {
    const existing = await getAuditReportPdf(audit.id);
    if (
      existing &&
      existing.mimeType === 'application/pdf' &&
      existing.sizeBytes > 0 &&
      existing.base64
    ) {
      const stored = await saveAuditReportPdf(audit.id, existing, reportId);
      void uploadAuditReportPdfRemote({
        auditId: audit.id,
        reportId,
        attachment: existing,
      });
      return { attachment: existing, reportId, stored };
    }
  }

  const attachment = await generateAuditPdfAttachment(
    audit,
    questionnaire,
    actionPlans,
  );
  const stored = await saveAuditReportPdf(audit.id, attachment, reportId);
  void uploadAuditReportPdfRemote({
    auditId: audit.id,
    reportId,
    attachment,
  });
  return { attachment, reportId, stored };
}

export function auditPdfMetaPatch(
  attachment: AuditPdfAttachment,
  reportId: string,
): Pick<Audit, 'reportId' | 'pdfFileName' | 'pdfSizeBytes'> {
  return {
    reportId,
    pdfFileName: attachment.fileName,
    pdfSizeBytes: attachment.sizeBytes,
  };
}
