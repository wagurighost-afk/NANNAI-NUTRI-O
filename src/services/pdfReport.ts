import type { ActionPlan, Audit, Questionnaire } from '../types';
import { conformityLabels, computeAuditTotals, formatDate, formatDateTime } from '../utils';
import { BRAND } from '../data/mock';

/**
 * PDF report generation using jsPDF.
 * Logo is loaded from /logo-nannai.png when available.
 */
export async function buildAuditPdfDoc(
  audit: Audit,
  questionnaire: Questionnaire,
  actionPlans: ActionPlan[],
) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  try {
    const img = await loadImageAsDataUrl('/logo-nannai.png');
    if (img) {
      doc.addImage(img, 'JPEG', 14, 10, 42, 14);
    }
  } catch {
    /* logo optional */
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(92, 46, 53);
  doc.text(BRAND.name, pageWidth - 14, 16, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 127, 58);
  doc.text(BRAND.slogan, pageWidth - 14, 22, { align: 'right' });

  y = 34;
  doc.setDrawColor(184, 149, 74);
  doc.setLineWidth(0.4);
  doc.line(14, y, pageWidth - 14, y);
  y += 10;

  doc.setTextColor(44, 36, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Relatório de Auditoria', 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const info = [
    [`Código`, audit.code],
    [`Unidade`, audit.unitName],
    [`Setor`, audit.sectorName],
    [`Auditor`, audit.auditorName],
    [`Início`, formatDateTime(audit.startedAt)],
    [`Conclusão`, formatDateTime(audit.completedAt)],
  ];
  for (const [label, value] of info) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value), 45, y);
    y += 6;
  }

  const totals = computeAuditTotals(audit.answers, questionnaire);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo da pontuação', 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Pontuação: ${totals.score} / ${totals.maxScore}  |  Conformidade: ${totals.conformityPercent}%`,
    14,
    y,
  );
  y += 6;
  doc.text(
    `Conformes: ${totals.conforme}  |  Parciais: ${totals.parcial}  |  Não conformes: ${totals.naoConforme}  |  N/A: ${totals.na}`,
    14,
    y,
  );
  y += 10;

  const sectionRows: (string | number)[][] = [];
  for (const section of questionnaire.sections) {
    let secScore = 0;
    let secMax = 0;
    for (const q of section.questions) {
      const a = audit.answers[q.id];
      if (!a?.status || a.status === 'nao_se_aplica') continue;
      const qMax = a.maxScore > 0 ? a.maxScore : q.maxScore;
      secScore += a.score;
      secMax += qMax;
    }
    const pct = secMax > 0 ? Math.round((secScore / secMax) * 1000) / 10 : 0;
    sectionRows.push([section.name, Math.round(secScore), Math.round(secMax), `${pct}%`]);
  }

  autoTable(doc, {
    startY: y,
    head: [['Seção', 'Pontos', 'Máx.', 'Conformidade']],
    body: sectionRows,
    theme: 'grid',
    headStyles: { fillColor: [92, 46, 53], textColor: 255 },
    styles: { fontSize: 9 },
  });

  // @ts-expect-error lastAutoTable injected by plugin
  y = (doc.lastAutoTable?.finalY ?? y) + 10;

  const answerRows: string[][] = [];
  for (const section of questionnaire.sections) {
    for (const q of section.questions) {
      const a = audit.answers[q.id];
      answerRows.push([
        section.name,
        q.text.slice(0, 80) + (q.text.length > 80 ? '…' : ''),
        a?.status ? conformityLabels[a.status] : '—',
        a?.comment?.slice(0, 60) || '—',
      ]);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Perguntas e respostas', 14, y);
  y += 2;

  autoTable(doc, {
    startY: y + 2,
    head: [['Seção', 'Pergunta', 'Resposta', 'Comentário']],
    body: answerRows,
    theme: 'striped',
    headStyles: { fillColor: [107, 127, 58], textColor: 255 },
    styles: { fontSize: 7, cellPadding: 1.5 },
    columnStyles: { 1: { cellWidth: 70 }, 3: { cellWidth: 40 } },
  });

  // @ts-expect-error lastAutoTable
  y = (doc.lastAutoTable?.finalY ?? y) + 10;

  const related = actionPlans.filter((p) => p.auditId === audit.id);
  if (related.length) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Planos de ação / Não conformidades', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y + 2,
      head: [['Descrição', 'Ação', 'Responsável', 'Prazo', 'Status']],
      body: related.map((p) => [
        p.nonConformityDescription.slice(0, 40),
        p.correctiveAction.slice(0, 40),
        p.responsibleName,
        formatDate(p.dueDate),
        p.status,
      ]),
      headStyles: { fillColor: [184, 149, 74], textColor: 40 },
      styles: { fontSize: 8 },
    });
    // @ts-expect-error lastAutoTable
    y = (doc.lastAutoTable?.finalY ?? y) + 12;
  }

  if (audit.generalComment) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.text('Comentário geral', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(audit.generalComment, pageWidth - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 8;
  }

  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.text('Assinaturas', 14, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.line(14, y, 90, y);
  doc.line(110, y, pageWidth - 14, y);
  y += 5;
  doc.text(
    audit.auditorSignature?.name || audit.auditorName,
    14,
    y,
  );
  doc.text(
    audit.responsibleSignature?.name || 'Responsável',
    110,
    y,
  );
  y += 5;
  doc.setFontSize(8);
  doc.text('Auditor', 14, y);
  doc.text('Responsável pelo setor', 110, y);

  return doc;
}

export async function generateAuditPdf(
  audit: Audit,
  questionnaire: Questionnaire,
  actionPlans: ActionPlan[],
) {
  const doc = await buildAuditPdfDoc(audit, questionnaire, actionPlans);
  doc.save(`Relatorio_${audit.code}.pdf`);
}

export interface AuditPdfAttachment {
  fileName: string;
  mimeType: 'application/pdf';
  base64: string;
  sizeBytes: number;
  blob?: Blob;
}

export async function generateAuditPdfAttachment(
  audit: Audit,
  questionnaire: Questionnaire,
  actionPlans: ActionPlan[],
): Promise<AuditPdfAttachment> {
  const doc = await buildAuditPdfDoc(audit, questionnaire, actionPlans);
  const fileName = `Relatorio_${audit.code}.pdf`;
  const dataUri = doc.output('datauristring') as string;
  const base64 = dataUri.split(',')[1] ?? '';
  const blob = doc.output('blob') as Blob;
  return {
    fileName,
    mimeType: 'application/pdf',
    base64,
    sizeBytes: blob.size,
    blob,
  };
}

function loadImageAsDataUrl(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
