import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AuditPdfAttachment } from './pdfReport';

export interface StoredAuditReport {
  auditId: string;
  reportId: string;
  fileName: string;
  mimeType: 'application/pdf';
  base64: string;
  sizeBytes: number;
  createdAt: string;
}

interface ReportDB extends DBSchema {
  auditReports: {
    key: string;
    value: StoredAuditReport;
  };
}

const DB_NAME = 'nannai-audit-reports';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<ReportDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<ReportDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('auditReports')) {
          db.createObjectStore('auditReports', { keyPath: 'auditId' });
        }
      },
    });
  }
  return dbPromise;
}

function attachmentFromRecord(record: StoredAuditReport): AuditPdfAttachment {
  const binary = atob(record.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return {
    fileName: record.fileName,
    mimeType: 'application/pdf',
    base64: record.base64,
    sizeBytes: record.sizeBytes,
    blob: new Blob([bytes], { type: 'application/pdf' }),
    auditId: record.auditId,
    reportId: record.reportId,
  };
}

/**
 * Salva o PDF vinculado à auditoria.
 * O caminho interno nunca é escolhido pelo usuário — só auditId/reportId.
 */
export async function saveAuditReportPdf(
  auditId: string,
  attachment: AuditPdfAttachment,
  reportId?: string,
): Promise<StoredAuditReport> {
  const resolvedReportId =
    reportId || attachment.reportId || `rpt-${auditId}`;
  if (attachment.auditId && attachment.auditId !== auditId) {
    throw new Error('PDF não pertence à auditoria selecionada.');
  }
  if (!attachment.fileName.toLowerCase().endsWith('.pdf')) {
    throw new Error('O arquivo vinculado deve ser um PDF.');
  }
  if (attachment.mimeType !== 'application/pdf') {
    throw new Error('Tipo de arquivo inválido para o relatório.');
  }

  const record: StoredAuditReport = {
    auditId,
    reportId: resolvedReportId,
    fileName: attachment.fileName,
    mimeType: 'application/pdf',
    base64: attachment.base64,
    sizeBytes: attachment.sizeBytes,
    createdAt: new Date().toISOString(),
  };
  const db = await getDb();
  await db.put('auditReports', record);
  return record;
}

export async function getAuditReportPdf(
  auditId: string,
): Promise<AuditPdfAttachment | null> {
  const db = await getDb();
  const record = await db.get('auditReports', auditId);
  if (!record?.base64) return null;
  if (record.auditId !== auditId) return null;
  if (record.mimeType !== 'application/pdf') return null;
  return attachmentFromRecord({
    ...record,
    reportId: record.reportId || `rpt-${auditId}`,
  });
}

export async function getAuditReportByIds(
  auditId: string,
  reportId: string,
): Promise<AuditPdfAttachment | null> {
  const attachment = await getAuditReportPdf(auditId);
  if (!attachment) return null;
  if (attachment.reportId && attachment.reportId !== reportId) {
    return null;
  }
  return attachment;
}

export async function openAuditReportPdf(auditId: string): Promise<boolean> {
  const attachment = await getAuditReportPdf(auditId);
  if (!attachment?.blob) return false;
  const url = URL.createObjectURL(attachment.blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}
