/**
 * Firebase Cloud Function stub — sendAuditReportEmail
 *
 * Deploy this under functions/ with Resend, SendGrid, Amazon SES or SMTP.
 * API keys stay ONLY in Cloud Functions environment config — never in the frontend.
 *
 * Setup (Resend example):
 *   firebase functions:config:set email.provider="resend" email.api_key="re_xxx" email.from="relatorios@nannai.com.br"
 *   OR use .env in functions/: RESEND_API_KEY=...
 *
 * Frontend calls: VITE_EMAIL_API_URL=https://<region>-<project>.cloudfunctions.net/sendAuditReportEmail
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export const cloudFunctionSource = `
const functions = require('firebase-functions');
const cors = require('cors')({ origin: true });

/**
 * Secure email sender for NANNAI Nutrição audit reports.
 * Supports Resend (default), SendGrid, SES or SMTP via EMAIL_PROVIDER.
 */
exports.sendAuditReportEmail = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ message: 'Method not allowed' });
      return;
    }

    const {
      subject,
      body,
      to = [],
      cc = [],
      bcc = [],
      copyToSelf,
      selfEmail,
      attachment,
      auditCode,
      sentByName,
    } = req.body || {};

    if (!subject || !body || !Array.isArray(to) || to.length === 0) {
      res.status(400).json({
        status: 'falha',
        message: 'Assunto, mensagem e destinatários são obrigatórios.',
      });
      return;
    }

    if (!attachment?.contentBase64 || !attachment?.fileName) {
      res.status(400).json({
        status: 'falha',
        message: 'Anexo PDF obrigatório.',
      });
      return;
    }

    const maxBytes = 10 * 1024 * 1024;
    if ((attachment.sizeBytes || 0) > maxBytes) {
      res.status(400).json({
        status: 'falha',
        message: 'Anexo excede 10 MB.',
      });
      return;
    }

    const provider = process.env.EMAIL_PROVIDER || 'resend';
    const from =
      process.env.EMAIL_FROM || 'NANNAI Nutrição <relatorios@nannai.com.br>';

    const finalCc = [...cc];
    if (copyToSelf && selfEmail) {
      finalCc.push({ name: sentByName || 'Remetente', email: selfEmail });
    }

    try {
      let providerMessageId = '';

      if (provider === 'resend') {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) throw new Error('RESEND_API_KEY não configurada no backend');

        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to: to.map((r) => r.email),
            cc: finalCc.map((r) => r.email),
            bcc: bcc.map((r) => r.email),
            subject,
            text: body,
            attachments: [
              {
                filename: attachment.fileName,
                content: attachment.contentBase64,
              },
            ],
            tags: [{ name: 'audit', value: auditCode || 'n/a' }],
          }),
        });

        const data = await resp.json();
        if (!resp.ok) {
          res.status(502).json({
            status: 'falha',
            message: data.message || 'Falha no Resend',
            errors: [JSON.stringify(data)],
          });
          return;
        }
        providerMessageId = data.id;
      } else {
        // Plug SendGrid / SES / SMTP here using server-side SDKs only.
        throw new Error(
          'Provider ' + provider + ' — implemente no backend com SDK oficial.',
        );
      }

      res.status(200).json({
        status: 'enviado',
        message: 'Relatório enviado com sucesso.',
        providerMessageId,
      });
    } catch (err) {
      res.status(500).json({
        status: 'falha',
        message: err.message || 'Erro interno no envio',
        errors: [err.message || 'unknown'],
      });
    }
  });
});
`;

/** Reference export so the stub is tree-shake friendly documentation. */
export function getCloudFunctionStub() {
  return cloudFunctionSource;
}
