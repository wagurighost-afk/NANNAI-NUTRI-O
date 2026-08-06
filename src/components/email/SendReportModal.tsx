import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckSquare,
  Mail,
  Paperclip,
  Plus,
  Square,
  Users,
} from 'lucide-react';
import { Modal, Badge } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import type { Audit, ActionPlan, Questionnaire, User } from '../../types';
import { useEmailStore } from '../../stores/emailStore';
import { resolveAutoRecipients } from '../../utils/autoRecipients';
import {
  buildDefaultEmailBody,
  buildDefaultEmailSubject,
  canSendReportEmail,
  isValidEmail,
} from '../../utils/email';
import {
  generateAuditPdfAttachment,
  type AuditPdfAttachment,
} from '../../services/pdfReport';
import {
  queueOrSendReport,
  validateSendPayload,
} from '../../services/emailService';
import { useAppStore } from '../../stores/appStore';

interface SendReportModalProps {
  open: boolean;
  onClose: () => void;
  audit: Audit;
  questionnaire: Questionnaire;
  actionPlans: ActionPlan[];
  user: User | null;
  /** When provided, reuse already-generated PDF */
  attachment?: AuditPdfAttachment | null;
}

export function SendReportModal({
  open,
  onClose,
  audit,
  questionnaire,
  actionPlans,
  user,
  attachment: initialAttachment,
}: SendReportModalProps) {
  const recipients = useEmailStore((s) => s.recipients);
  const groups = useEmailStore((s) => s.groups);
  const rules = useEmailStore((s) => s.rules);
  const addRecipient = useEmailStore((s) => s.addRecipient);
  const addHistoryRecord = useEmailStore((s) => s.addHistoryRecord);
  const updateHistoryRecord = useEmailStore((s) => s.updateHistoryRecord);
  const online = useAppStore((s) => s.online);

  const activeRecipients = useMemo(
    () => recipients.filter((r) => r.active),
    [recipients],
  );

  const auto = useMemo(
    () =>
      resolveAutoRecipients({
        audit,
        questionnaire,
        actionPlans,
        recipients: activeRecipients,
        groups,
        rules,
      }),
    [audit, questionnaire, actionPlans, activeRecipients, groups, rules],
  );

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [ccEmails, setCcEmails] = useState('');
  const [bccEmails, setBccEmails] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  const [tempName, setTempName] = useState('');
  const [tempList, setTempList] = useState<{ name: string; email: string }[]>(
    [],
  );
  const [copyToSelf, setCopyToSelf] = useState(true);
  const [attachment, setAttachment] = useState<AuditPdfAttachment | null>(
    initialAttachment ?? null,
  );
  const [preparingPdf, setPreparingPdf] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [savePermanent, setSavePermanent] = useState(false);
  const [permanentGroupId, setPermanentGroupId] = useState(groups[0]?.id ?? '');

  useEffect(() => {
    if (!open) return;
    setSubject(buildDefaultEmailSubject(audit));
    setBody(buildDefaultEmailBody(audit, actionPlans));
    setSelectedIds(new Set(auto.selectedIds));
    setFeedback('');
    setErrors([]);
    setConfirmOpen(false);
    setTempList([]);
    setTempEmail('');
    setTempName('');

    if (initialAttachment) {
      setAttachment(initialAttachment);
      return;
    }

    let cancelled = false;
    setPreparingPdf(true);
    generateAuditPdfAttachment(audit, questionnaire, actionPlans)
      .then((pdf) => {
        if (!cancelled) setAttachment(pdf);
      })
      .catch(() => {
        if (!cancelled) setErrors(['Falha ao gerar o PDF do relatório.']);
      })
      .finally(() => {
        if (!cancelled) setPreparingPdf(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, audit.id]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () =>
    setSelectedIds(new Set(activeRecipients.map((r) => r.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const addTemporary = () => {
    const email = tempEmail.trim().toLowerCase();
    if (!isValidEmail(email)) {
      setErrors(['Informe um e-mail válido para o destinatário temporário.']);
      return;
    }
    if (savePermanent) {
      const created = addRecipient({
        name: tempName.trim() || email,
        email,
        roleTitle: 'Destinatário cadastrado',
        active: true,
        isPrimary: false,
        unitIds: [audit.unitId],
        sectorIds: audit.sectorId ? [audit.sectorId] : [],
        groupIds: permanentGroupId ? [permanentGroupId] : [],
      });
      setSelectedIds((prev) => new Set(prev).add(created.id));
    } else {
      setTempList((list) => [
        ...list.filter((t) => t.email !== email),
        { name: tempName.trim() || email, email },
      ]);
    }
    setTempEmail('');
    setTempName('');
    setErrors([]);
  };

  const buildPayload = () => {
    const to = [
      ...activeRecipients
        .filter((r) => selectedIds.has(r.id))
        .map((r) => ({
          name: r.name,
          email: r.email,
          type: 'to' as const,
          recipientId: r.id,
        })),
      ...tempList.map((t) => ({
        name: t.name,
        email: t.email,
        type: 'to' as const,
      })),
    ];

    const parseList = (raw: string, type: 'cc' | 'bcc') =>
      raw
        .split(/[,;\s]+/)
        .map((e) => e.trim())
        .filter(Boolean)
        .map((email) => ({ name: email, email, type }));

    return {
      auditId: audit.id,
      auditCode: audit.code,
      subject,
      body,
      to,
      cc: parseList(ccEmails, 'cc'),
      bcc: parseList(bccEmails, 'bcc'),
      copyToSelf,
      selfEmail: user?.email,
      attachment,
      sentByUserId: user?.id ?? '',
      sentByName: user?.name ?? '',
    };
  };

  const requestSend = () => {
    setFeedback('');
    const payload = buildPayload();
    const validation = validateSendPayload(payload, {
      online,
      canSend: canSendReportEmail(user?.role),
    });
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }
    setErrors([]);
    setConfirmOpen(true);
  };

  const confirmSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    setFeedback('');
    const payload = buildPayload();
    const now = new Date().toISOString();
    const recordId = `email-${Date.now()}`;

    addHistoryRecord({
      id: recordId,
      auditId: audit.id,
      auditCode: audit.code,
      unitName: audit.unitName,
      sectorName: audit.sectorName,
      subject: payload.subject,
      body: payload.body,
      recipients: [...payload.to, ...payload.cc, ...payload.bcc],
      pdfFileName: payload.attachment!.fileName,
      pdfSizeBytes: payload.attachment!.sizeBytes,
      status: 'preparando',
      sentByUserId: payload.sentByUserId,
      sentByName: payload.sentByName,
      createdAt: now,
      updatedAt: now,
      attempts: 0,
      errors: [],
      copyToSelf: payload.copyToSelf,
      queuedOffline: false,
    });

    try {
      const result = await queueOrSendReport(
        { ...payload, attachment: payload.attachment! },
        online,
      );
      updateHistoryRecord(recordId, {
        ...result.recordPatch,
        attempts: (result.recordPatch.attempts as number) ?? 1,
      });
      setFeedback(result.userMessage);
      if (
        result.recordPatch.status === 'enviado' ||
        result.recordPatch.status === 'aguardando_conexao'
      ) {
        setTimeout(() => onClose(), 1600);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro no envio';
      updateHistoryRecord(recordId, {
        status: 'falha',
        errors: [msg],
        attempts: 1,
      });
      setErrors([msg]);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  const allowed = canSendReportEmail(user?.role);

  return (
    <>
      <Modal open={open} onClose={onClose} title="Enviar relatório por e-mail">
        {!allowed ? (
          <p className="rounded-xl bg-wine-50 px-3 py-2 text-sm text-wine-700">
            Apenas nutricionista, gestor ou administrador podem enviar
            relatórios.
          </p>
        ) : (
          <div className="space-y-4">
            {auto.criticalAlert && (
              <div className="flex gap-2 rounded-xl border border-wine-300 bg-wine-50 px-3 py-2 text-sm text-wine-800">
                <AlertTriangle className="mt-0.5 shrink-0" size={18} />
                <div>
                  <p className="font-medium">Não conformidade crítica detectada</p>
                  <p className="text-xs">
                    Os destinatários principais foram selecionados automaticamente.
                    Revise a lista antes de enviar.
                  </p>
                </div>
              </div>
            )}

            {auto.matchedRuleNames.length > 0 && (
              <p className="text-xs text-ink-muted">
                Regras aplicadas: {auto.matchedRuleNames.join(' · ')}
              </p>
            )}

            <Input
              label="Assunto"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <Textarea
              label="Mensagem"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-40 font-mono text-xs leading-relaxed"
            />

            <div className="rounded-xl border border-cream-200 bg-cream-50/80 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  <Users size={16} /> Destinatários
                </p>
                <div className="flex flex-wrap gap-1">
                  <Button type="button" size="sm" variant="outline" onClick={selectAll}>
                    <CheckSquare size={14} /> Selecionar todos
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={deselectAll}>
                    <Square size={14} /> Desmarcar todos
                  </Button>
                </div>
              </div>
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {activeRecipients.map((r) => (
                  <li key={r.id}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-white">
                      <input
                        type="checkbox"
                        className="mt-1 accent-olive-600"
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggle(r.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-ink">
                          {r.name}
                          {r.isPrimary && (
                            <Badge className="ml-2 border-gold-300 bg-gold-100 text-gold-900">
                              Principal
                            </Badge>
                          )}
                        </span>
                        <span className="block text-xs text-ink-muted">
                          {r.roleTitle ? `${r.roleTitle} · ` : ''}
                          {r.email}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              {tempList.length > 0 && (
                <div className="mt-2 border-t border-cream-200 pt-2">
                  <p className="mb-1 text-xs font-medium text-ink-muted">
                    Temporários
                  </p>
                  {tempList.map((t) => (
                    <div
                      key={t.email}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>
                        {t.name} — {t.email}
                      </span>
                      <button
                        type="button"
                        className="text-xs text-wine-700"
                        onClick={() =>
                          setTempList((list) =>
                            list.filter((x) => x.email !== t.email),
                          )
                        }
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                label="Nome (opcional)"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="Novo destinatário"
              />
              <Input
                label="Adicionar e-mail"
                type="email"
                value={tempEmail}
                onChange={(e) => setTempEmail(e.target.value)}
                placeholder="email@nannai.com.br"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  className="accent-olive-600"
                  checked={savePermanent}
                  onChange={(e) => setSavePermanent(e.target.checked)}
                />
                Adicionar destinatário permanente
              </label>
              {savePermanent && (
                <Select
                  label=""
                  options={groups.map((g) => ({
                    value: g.id,
                    label: g.name,
                  }))}
                  value={permanentGroupId}
                  onChange={(e) => setPermanentGroupId(e.target.value)}
                  className="w-48"
                />
              )}
              <Button type="button" size="sm" variant="outline" onClick={addTemporary}>
                <Plus size={14} />
                {savePermanent ? 'Cadastrar e selecionar' : 'Adicionar temporário'}
              </Button>
            </div>

            <Input
              label="Cópia — CC (e-mails separados por vírgula)"
              value={ccEmails}
              onChange={(e) => setCcEmails(e.target.value)}
              placeholder="email1@nannai.com.br, email2@nannai.com.br"
            />
            <Input
              label="Cópia oculta — CCO"
              value={bccEmails}
              onChange={(e) => setBccEmails(e.target.value)}
              placeholder="oculto@nannai.com.br"
            />

            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                className="accent-olive-600"
                checked={copyToSelf}
                onChange={(e) => setCopyToSelf(e.target.checked)}
              />
              Enviar uma cópia para mim ({user?.email})
            </label>

            <div className="flex items-center gap-2 rounded-xl border border-olive-200 bg-olive-50 px-3 py-2 text-sm text-olive-900">
              <Paperclip size={16} />
              {preparingPdf
                ? 'Preparando PDF…'
                : attachment
                  ? `Anexo: ${attachment.fileName} (${Math.round(attachment.sizeBytes / 1024)} KB)`
                  : 'PDF não disponível'}
            </div>

            {!online && (
              <p className="rounded-xl bg-gold-100 px-3 py-2 text-sm text-gold-900">
                Você está offline. O envio será enfileirado e disparado quando a
                conexão voltar.
              </p>
            )}

            {errors.length > 0 && (
              <ul className="rounded-xl bg-wine-50 px-3 py-2 text-sm text-wine-700">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}

            {feedback && (
              <p className="rounded-xl bg-olive-50 px-3 py-2 text-sm text-olive-800">
                {feedback}
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                onClick={requestSend}
                disabled={sending || preparingPdf || !attachment}
              >
                <Mail size={16} />
                {sending ? 'Enviando…' : 'Enviar relatório'}
              </Button>
              <Button variant="outline" onClick={onClose} disabled={sending}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmar envio"
      >
        <p className="text-sm text-ink-muted">
          Confirma o envio do relatório <strong>{audit.code}</strong> para{' '}
          <strong>
            {selectedIds.size + tempList.length} destinatário(s)
          </strong>
          {copyToSelf ? ' (com cópia para você)' : ''}?
        </p>
        <p className="mt-2 text-xs text-ink-muted">
          O PDF será anexado automaticamente. O envio ocorre pelo servidor seguro
          do NANNAI (sem expor credenciais no navegador).
        </p>
        <div className="mt-4 flex gap-2">
          <Button onClick={confirmSend} fullWidth>
            Confirmar e enviar
          </Button>
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            Voltar
          </Button>
        </div>
      </Modal>
    </>
  );
}
