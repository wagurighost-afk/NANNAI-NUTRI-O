import type {
  EmailRecipientSnapshot,
  EmailSendRecord,
  EmailSendStatus,
} from '../types';
import type { AuditPdfAttachment } from './pdfReport';
import { isValidEmail, MAX_PDF_BYTES } from '../utils/email';
import {
  enqueueEmailSend,
  getQueuedEmails,
  removeQueuedEmail,
} from './offlineDb';

export interface SendReportPayload {
  auditId: string;
  reportId: string;
  auditCode: string;
  subject: string;
  body: string;
  to: EmailRecipientSnapshot[];
  cc: EmailRecipientSnapshot[];
  bcc: EmailRecipientSnapshot[];
  copyToSelf: boolean;
  selfEmail?: string;
  /** PDF já vinculado — o backend também pode carregar por auditId/reportId */
  attachment: AuditPdfAttachment;
  sentByUserId: string;
  sentByName: string;
}

export interface SendValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateSendPayload(
  payload: Omit<SendReportPayload, 'attachment'> & {
    attachment?: AuditPdfAttachment | null;
  },
  options: { online: boolean; canSend: boolean },
): SendValidationResult {
  const errors: string[] = [];

  if (!options.canSend) {
    errors.push('Seu perfil não tem permissão para enviar relatórios.');
  }
  if (!payload.subject.trim()) errors.push('Informe o assunto do e-mail.');
  if (!payload.body.trim()) errors.push('Informe a mensagem do e-mail.');
  if (!payload.auditId) errors.push('Auditoria não identificada.');
  if (!payload.reportId) {
    errors.push('Relatório PDF não está vinculado à auditoria.');
  }

  const all = [...payload.to, ...payload.cc, ...payload.bcc];
  if (payload.copyToSelf && payload.selfEmail) {
    all.push({
      name: payload.sentByName,
      email: payload.selfEmail,
      type: 'cc',
    });
  }

  if (payload.to.length === 0) {
    errors.push('Selecione ao menos um destinatário (Para).');
  }

  for (const r of all) {
    if (!isValidEmail(r.email)) {
      errors.push(`E-mail inválido: ${r.email || '(vazio)'}`);
    }
  }

  if (!payload.attachment) {
    errors.push('O arquivo PDF do relatório não foi gerado.');
  } else {
    if (payload.attachment.mimeType !== 'application/pdf') {
      errors.push('O anexo vinculado não é um PDF válido.');
    }
    if (
      payload.attachment.auditId &&
      payload.attachment.auditId !== payload.auditId
    ) {
      errors.push('O PDF não pertence à auditoria selecionada.');
    }
    if (payload.attachment.sizeBytes <= 0) {
      errors.push('O arquivo PDF está vazio.');
    } else if (payload.attachment.sizeBytes > MAX_PDF_BYTES) {
      errors.push(
        `O anexo excede o limite de ${Math.round(MAX_PDF_BYTES / (1024 * 1024))} MB.`,
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

export interface BackendSendResult {
  status: EmailSendStatus;
  message: string;
  providerMessageId?: string;
  pdfFileName?: string;
  errors: string[];
}

/**
 * POST /api/reports/send-email (via VITE_EMAIL_API_URL)
 *
 * Envia auditId + reportId + destinatários.
 * O backend localiza o PDF vinculado e anexa automaticamente (Microsoft Graph / Resend).
 * contentBase64 só vai como fallback quando o Storage ainda não tem o arquivo.
 */
export async function sendReportViaBackend(
  payload: SendReportPayload,
): Promise<BackendSendResult> {
  const apiUrl = import.meta.env.VITE_EMAIL_API_URL as string | undefined;

  const body = {
    auditId: payload.auditId,
    reportId: payload.reportId,
    auditCode: payload.auditCode,
    subject: payload.subject,
    message: payload.body,
    body: payload.body,
    to: payload.to.map((r) => ({ name: r.name, email: r.email })),
    cc: payload.cc.map((r) => ({ name: r.name, email: r.email })),
    bcc: payload.bcc.map((r) => ({ name: r.name, email: r.email })),
    copyToSelf: payload.copyToSelf,
    selfEmail: payload.selfEmail,
    sentByUserId: payload.sentByUserId,
    sentByName: payload.sentByName,
    // Fallback seguro: bytes do PDF já vinculado (não vem de file picker)
    attachmentFallback: {
      fileName: payload.attachment.fileName,
      mimeType: payload.attachment.mimeType,
      contentBase64: payload.attachment.base64,
      sizeBytes: payload.attachment.sizeBytes,
    },
  };

  if (!apiUrl) {
    return {
      status: 'falha',
      message:
        'Envio automático pelo Microsoft 365 não configurado. Use “Compartilhar PDF” para abrir o Outlook com o anexo.',
      errors: [
        'Configure VITE_EMAIL_API_URL para envio automático com anexo via Microsoft Graph.',
      ],
    };
  }

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as {
      message?: string;
      providerMessageId?: string;
      errors?: string[];
      status?: EmailSendStatus;
      pdfFileName?: string;
    };
    if (!res.ok) {
      return {
        status: 'falha',
        message: data.message ?? `Falha no envio (${res.status})`,
        errors: data.errors ?? [data.message ?? 'Erro desconhecido'],
      };
    }
    return {
      status: data.status ?? 'enviado',
      message: data.message ?? 'Relatório enviado com o PDF anexado.',
      providerMessageId: data.providerMessageId,
      pdfFileName: data.pdfFileName,
      errors: data.errors ?? [],
    };
  } catch (err) {
    return {
      status: 'falha',
      message: 'Falha de conexão com o serviço de e-mail.',
      errors: [err instanceof Error ? err.message : 'Erro de rede'],
    };
  }
}

export async function queueOrSendReport(
  payload: SendReportPayload,
  online: boolean,
): Promise<{
  recordPatch: Partial<EmailSendRecord>;
  userMessage: string;
}> {
  if (!online) {
    await enqueueEmailSend({
      id: `email-q-${Date.now()}`,
      payload: {
        ...payload,
        attachment: {
          fileName: payload.attachment.fileName,
          mimeType: payload.attachment.mimeType,
          base64: payload.attachment.base64,
          sizeBytes: payload.attachment.sizeBytes,
          auditId: payload.auditId,
          reportId: payload.reportId,
        },
      },
      createdAt: new Date().toISOString(),
    });
    return {
      recordPatch: {
        status: 'aguardando_conexao',
        reportId: payload.reportId,
        pdfFileName: payload.attachment.fileName,
        pdfSizeBytes: payload.attachment.sizeBytes,
        queuedOffline: true,
        attempts: 1,
        errors: [],
      },
      userMessage:
        'Relatório aguardando conexão. O PDF permanecerá anexado automaticamente.',
    };
  }

  const result = await sendReportViaBackend(payload);
  return {
    recordPatch: {
      status: result.status,
      reportId: payload.reportId,
      pdfFileName: result.pdfFileName ?? payload.attachment.fileName,
      pdfSizeBytes: payload.attachment.sizeBytes,
      sentAt:
        result.status === 'enviado' || result.status === 'parcialmente_enviado'
          ? new Date().toISOString()
          : undefined,
      queuedOffline: false,
      attempts: 1,
      errors: result.errors,
    },
    userMessage: result.message,
  };
}

export async function flushQueuedEmails(
  onProgress?: (msg: string) => void,
): Promise<{ sent: number; failed: number }> {
  if (!navigator.onLine) return { sent: 0, failed: 0 };
  const queued = await getQueuedEmails();
  let sent = 0;
  let failed = 0;
  for (const item of queued) {
    onProgress?.(`Enviando relatório ${item.payload.auditCode}…`);
    const result = await sendReportViaBackend({
      ...item.payload,
      reportId:
        item.payload.reportId ||
        item.payload.attachment.reportId ||
        `rpt-${item.payload.auditId}`,
      attachment: {
        ...item.payload.attachment,
        blob: new Blob([], { type: 'application/pdf' }),
      },
    });
    if (result.status === 'enviado' || result.status === 'parcialmente_enviado') {
      sent += 1;
      await removeQueuedEmail(item.id);
    } else {
      failed += 1;
    }
  }
  return { sent, failed };
}
