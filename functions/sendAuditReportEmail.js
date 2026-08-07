/**
 * Firebase Cloud Functions — sendAuditReportEmail
 *
 * Equivalente a: POST /api/reports/send-email
 *
 * Body:
 *   { auditId, reportId, to, cc, bcc, subject, message, ... }
 *
 * Fluxo:
 *   1. Valida destinatários e permissões básicas
 *   2. Localiza PDF em Storage: audit-reports/{auditId}/{reportId}.pdf
 *   3. Confirma metadados Firestore (auditReports/{reportId}.auditId)
 *   4. Anexa automaticamente no e-mail (Microsoft Graph ou Resend)
 *   5. Registra histórico com o nome do PDF enviado
 *
 * Env:
 *   EMAIL_PROVIDER=microsoft_graph | resend
 *   EMAIL_FROM=NANNAI Nutrição <relatorios@nannai.com.br>
 *   # Microsoft Graph (app-only ou delegated via mailbox)
 *   MS_GRAPH_TENANT_ID=
 *   MS_GRAPH_CLIENT_ID=
 *   MS_GRAPH_CLIENT_SECRET=
 *   MS_GRAPH_SENDER=relatorios@nannai.com.br
 *   # Resend fallback
 *   RESEND_API_KEY=
 *
 * Frontend: VITE_EMAIL_API_URL=https://REGION-PROJECT.cloudfunctions.net/sendAuditReportEmail
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

if (!admin.apps.length) {
  admin.initializeApp();
}

const MAX_PDF_BYTES = 10 * 1024 * 1024;

exports.sendAuditReportEmail = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ message: 'Method not allowed' });
      return;
    }

    const body = req.body || {};
    const {
      auditId,
      reportId,
      subject,
      message,
      body: bodyText,
      to = [],
      cc = [],
      bcc = [],
      copyToSelf,
      selfEmail,
      attachmentFallback,
      attachment,
      auditCode,
      sentByName,
      sentByUserId,
    } = body;

    const emailBody = message || bodyText;
    const fallback = attachmentFallback || attachment;

    if (!subject || !emailBody || !Array.isArray(to) || to.length === 0) {
      res.status(400).json({
        status: 'falha',
        message: 'Assunto, mensagem e destinatários são obrigatórios.',
      });
      return;
    }

    if (!auditId || !reportId) {
      res.status(400).json({
        status: 'falha',
        message: 'auditId e reportId são obrigatórios para anexar o PDF.',
      });
      return;
    }

    // Segurança: nunca aceitar path interno do cliente
    if (body.storagePath || body.pdfPath || body.filePath) {
      res.status(400).json({
        status: 'falha',
        message: 'Caminho de arquivo não pode ser informado pelo cliente.',
      });
      return;
    }

    try {
      const pdf = await resolveAuditPdf({
        auditId,
        reportId,
        fallback,
      });

      if (!pdf) {
        res.status(404).json({
          status: 'falha',
          message: 'PDF da auditoria não encontrado.',
          errors: ['Arquivo vinculado à auditoria indisponível.'],
        });
        return;
      }

      if (pdf.mimeType !== 'application/pdf') {
        res.status(400).json({
          status: 'falha',
          message: 'O arquivo vinculado não é um PDF.',
        });
        return;
      }

      if (!pdf.sizeBytes || pdf.sizeBytes <= 0) {
        res.status(400).json({ status: 'falha', message: 'PDF vazio.' });
        return;
      }

      if (pdf.sizeBytes > MAX_PDF_BYTES) {
        res.status(400).json({
          status: 'falha',
          message: 'Anexo excede 10 MB.',
        });
        return;
      }

      const finalCc = [...cc];
      if (copyToSelf && selfEmail) {
        finalCc.push({ name: sentByName || 'Remetente', email: selfEmail });
      }

      const provider = process.env.EMAIL_PROVIDER || 'microsoft_graph';
      let providerMessageId = '';

      if (provider === 'microsoft_graph') {
        providerMessageId = await sendViaMicrosoftGraph({
          to,
          cc: finalCc,
          bcc,
          subject,
          body: emailBody,
          pdf,
        });
      } else if (provider === 'resend') {
        providerMessageId = await sendViaResend({
          to,
          cc: finalCc,
          bcc,
          subject,
          body: emailBody,
          pdf,
          auditCode,
        });
      } else {
        throw new Error(`Provider ${provider} não suportado.`);
      }

      await admin.firestore().collection('emailHistory').add({
        auditId,
        reportId,
        auditCode: auditCode || null,
        subject,
        message: emailBody,
        to,
        cc: finalCc,
        bcc,
        pdfFileName: pdf.fileName,
        pdfSizeBytes: pdf.sizeBytes,
        status: 'enviado',
        provider,
        providerMessageId,
        sentByUserId: sentByUserId || null,
        sentByName: sentByName || null,
        sentAt: new Date().toISOString(),
      });

      res.status(200).json({
        status: 'enviado',
        message: 'Relatório enviado com o PDF anexado automaticamente.',
        providerMessageId,
        pdfFileName: pdf.fileName,
        reportId,
        auditId,
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

async function resolveAuditPdf({ auditId, reportId, fallback }) {
  const db = admin.firestore();
  const metaRef = db.collection('auditReports').doc(reportId);
  const metaSnap = await metaRef.get();

  if (metaSnap.exists) {
    const meta = metaSnap.data() || {};
    if (meta.auditId && meta.auditId !== auditId) {
      throw new Error('O PDF não pertence à auditoria selecionada.');
    }
    const storagePath =
      meta.storagePath || `audit-reports/${auditId}/${reportId}.pdf`;
    // Impede path traversal fora do prefixo da auditoria
    if (!storagePath.startsWith(`audit-reports/${auditId}/`)) {
      throw new Error('Caminho de armazenamento inválido para a auditoria.');
    }

    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (exists) {
      const [buffer] = await file.download();
      const fileName =
        meta.fileName || `Relatorio_Auditoria_${reportId}.pdf`;
      return {
        fileName,
        mimeType: 'application/pdf',
        contentBase64: buffer.toString('base64'),
        sizeBytes: buffer.length,
      };
    }
  }

  // Fallback: bytes já vinculados no cliente (nunca file picker do usuário)
  if (fallback?.contentBase64 && fallback?.fileName) {
    if (
      fallback.mimeType &&
      fallback.mimeType !== 'application/pdf'
    ) {
      throw new Error('Fallback de anexo inválido.');
    }
    return {
      fileName: fallback.fileName,
      mimeType: 'application/pdf',
      contentBase64: fallback.contentBase64,
      sizeBytes: fallback.sizeBytes || Buffer.from(fallback.contentBase64, 'base64').length,
    };
  }

  return null;
}

async function getGraphAccessToken() {
  const tenant = process.env.MS_GRAPH_TENANT_ID;
  const clientId = process.env.MS_GRAPH_CLIENT_ID;
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET;
  if (!tenant || !clientId || !clientSecret) {
    throw new Error(
      'Microsoft Graph não configurado (MS_GRAPH_TENANT_ID/CLIENT_ID/CLIENT_SECRET).',
    );
  }
  const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });
  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error_description || 'Falha ao obter token Graph');
  }
  return data.access_token;
}

async function sendViaMicrosoftGraph({ to, cc, bcc, subject, body, pdf }) {
  const sender = process.env.MS_GRAPH_SENDER || process.env.EMAIL_FROM;
  if (!sender) {
    throw new Error('MS_GRAPH_SENDER / EMAIL_FROM não configurado.');
  }
  // Extrai e-mail se vier no formato "Nome <email>"
  const senderEmail = (sender.match(/<([^>]+)>/) || [, sender])[1].trim();

  const token = await getGraphAccessToken();
  const payload = {
    message: {
      subject,
      body: {
        contentType: 'Text',
        content: body,
      },
      toRecipients: to.map((r) => ({
        emailAddress: { address: r.email, name: r.name || r.email },
      })),
      ccRecipients: (cc || []).map((r) => ({
        emailAddress: { address: r.email, name: r.name || r.email },
      })),
      bccRecipients: (bcc || []).map((r) => ({
        emailAddress: { address: r.email, name: r.name || r.email },
      })),
      attachments: [
        {
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: pdf.fileName,
          contentType: 'application/pdf',
          contentBytes: pdf.contentBase64,
        },
      ],
    },
    saveToSentItems: true,
  };

  const resp = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Microsoft Graph: ${errText || resp.status}`);
  }
  return `graph-${Date.now()}`;
}

async function sendViaResend({ to, cc, bcc, subject, body, pdf, auditCode }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY não configurada no backend');
  const from =
    process.env.EMAIL_FROM || 'NANNAI Nutrição <relatorios@nannai.com.br>';

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: to.map((r) => r.email),
      cc: (cc || []).map((r) => r.email),
      bcc: (bcc || []).map((r) => r.email),
      subject,
      text: body,
      attachments: [
        {
          filename: pdf.fileName,
          content: pdf.contentBase64,
        },
      ],
      tags: [{ name: 'audit', value: auditCode || 'n/a' }],
    }),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.message || 'Falha no Resend');
  }
  return data.id;
}
