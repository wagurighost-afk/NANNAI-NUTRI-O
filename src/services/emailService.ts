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
  auditCode: string;
  subject: string;
  body: string;
  to: EmailRecipientSnapshot[];
  cc: EmailRecipientSnapshot[];
  bcc: EmailRecipientSnapshot[];
  copyToSelf: boolean;
  selfEmail?: string;
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
  } else if (payload.attachment.sizeBytes <= 0) {
    errors.push('O arquivo PDF está vazio.');
  } else if (payload.attachment.sizeBytes > MAX_PDF_BYTES) {
    errors.push(
      `O anexo excede o limite de ${Math.round(MAX_PDF_BYTES / (1024 * 1024))} MB.`,
    );
  }

  if (!options.online) {
    // Offline is allowed — will queue; not a hard error
  }

  return { ok: errors.length === 0, errors };
}

export interface BackendSendResult {
  status: EmailSendStatus;
  message: string;
  providerMessageId?: string;
  errors: string[];
}

/**
 * Calls the secure backend endpoint (Firebase Cloud Function / Resend / SES).
 * Credentials NEVER leave the server — only the callable HTTPS endpoint is used.
 *
 * Env: VITE_EMAIL_API_URL — Cloud Function URL or API gateway.
 * When unset, uses a safe mock that simulates success (dev mode).
 */
export async function sendReportViaBackend(
  payload: SendReportPayload,
): Promise<BackendSendResult> {
  const apiUrl = import.meta.env.VITE_EMAIL_API_URL as string | undefined;

  const body = {
    auditId: payload.auditId,
    auditCode: payload.auditCode,
    subject: payload.subject,
    body: payload.body,
    to: payload.to.map((r) => ({ name: r.name, email: r.email })),
    cc: payload.cc.map((r) => ({ name: r.name, email: r.email })),
    bcc: payload.bcc.map((r) => ({ name: r.name, email: r.email })),
    copyToSelf: payload.copyToSelf,
    selfEmail: payload.selfEmail,
    attachment: {
      fileName: payload.attachment.fileName,
      mimeType: payload.attachment.mimeType,
      contentBase64: payload.attachment.base64,
      sizeBytes: payload.attachment.sizeBytes,
    },
    sentByUserId: payload.sentByUserId,
    sentByName: payload.sentByName,
  };

  if (!apiUrl) {
    // Dev/mock: simulate secure backend without exposing credentials
    await new Promise((r) => setTimeout(r, 900));
    console.info(
      '[NANNAI Email] Modo simulado — configure VITE_EMAIL_API_URL para envio real via Cloud Function.',
    );
    return {
      status: 'enviado',
      message: 'Relatório enviado com sucesso (modo simulado).',
      providerMessageId: `mock-${Date.now()}`,
      errors: [],
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
      message: data.message ?? 'Relatório enviado com sucesso.',
      providerMessageId: data.providerMessageId,
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
        },
      },
      createdAt: new Date().toISOString(),
    });
    return {
      recordPatch: {
        status: 'aguardando_conexao',
        queuedOffline: true,
        attempts: 1,
        errors: [],
      },
      userMessage: 'Relatório aguardando conexão para ser enviado.',
    };
  }

  const result = await sendReportViaBackend(payload);
  return {
    recordPatch: {
      status: result.status,
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
