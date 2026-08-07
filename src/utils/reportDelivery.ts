import type { EmailRecipientSnapshot } from '../types';
import type { AuditPdfAttachment } from '../services/pdfReport';

export function isEmailApiConfigured(): boolean {
  return Boolean(import.meta.env.VITE_EMAIL_API_URL);
}

/** Abre o cliente de e-mail do dispositivo com destinatários, assunto e corpo */
export function openMailtoCompose(params: {
  to: EmailRecipientSnapshot[];
  cc?: EmailRecipientSnapshot[];
  bcc?: EmailRecipientSnapshot[];
  subject: string;
  body: string;
}): void {
  const to = params.to.map((r) => r.email.trim()).filter(Boolean);
  const cc = (params.cc ?? []).map((r) => r.email.trim()).filter(Boolean);
  const bcc = (params.bcc ?? []).map((r) => r.email.trim()).filter(Boolean);

  const qs = new URLSearchParams();
  if (params.subject) qs.set('subject', params.subject);
  if (params.body) qs.set('body', params.body.slice(0, 1800));
  if (cc.length) qs.set('cc', cc.join(','));
  if (bcc.length) qs.set('bcc', bcc.join(','));

  const href = `mailto:${encodeURIComponent(to.join(','))}?${qs.toString()}`;
  window.location.href = href;
}

export function downloadPdfAttachment(attachment: AuditPdfAttachment): void {
  const blob =
    attachment.blob ??
    base64ToBlob(attachment.base64, attachment.mimeType || 'application/pdf');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = attachment.fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Abre o PDF vinculado em nova aba (visualizar) */
export function openPdfAttachment(attachment: AuditPdfAttachment): void {
  const blob =
    attachment.blob ??
    base64ToBlob(attachment.base64, attachment.mimeType || 'application/pdf');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export async function sharePdfAttachment(
  attachment: AuditPdfAttachment,
  meta: { title: string; text: string },
): Promise<'shared' | 'downloaded'> {
  const blob =
    attachment.blob ??
    base64ToBlob(attachment.base64, attachment.mimeType || 'application/pdf');
  const file = new File([blob], attachment.fileName, {
    type: 'application/pdf',
  });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: meta.title,
      text: meta.text,
      files: [file],
    });
    return 'shared';
  }

  downloadPdfAttachment({ ...attachment, blob });
  return 'downloaded';
}

export function copyEmailsToClipboard(emails: string[]): Promise<void> {
  return navigator.clipboard.writeText(emails.join('; '));
}
