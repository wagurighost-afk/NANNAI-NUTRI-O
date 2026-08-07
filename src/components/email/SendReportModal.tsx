import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckSquare,
  Copy,
  Eye,
  FileText,
  Mail,
  Plus,
  Share2,
  Square,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
import type { AuditPdfAttachment } from '../../services/pdfReport';
import {
  queueOrSendReport,
  validateSendPayload,
} from '../../services/emailService';
import {
  auditPdfMetaPatch,
  ensureBoundAuditReportPdf,
  resolveReportId,
} from '../../services/auditReportBinding';
import { useAppStore } from '../../stores/appStore';
import {
  copyEmailsToClipboard,
  isEmailApiConfigured,
  openPdfAttachment,
  sharePdfAttachment,
} from '../../utils/reportDelivery';
import { formatDate } from '../../utils';

type RecipientLane = 'to' | 'cc' | 'bcc';

interface SendReportModalProps {
  open: boolean;
  onClose: () => void;
  audit: Audit;
  questionnaire: Questionnaire;
  actionPlans: ActionPlan[];
  user: User | null;
  attachment?: AuditPdfAttachment | null;
  onSent?: () => void;
}

export function SendReportModal({
  open,
  onClose,
  audit,
  questionnaire,
  actionPlans,
  user,
  attachment: initialAttachment,
  onSent,
}: SendReportModalProps) {
  const recipients = useEmailStore((s) => s.recipients);
  const groups = useEmailStore((s) => s.groups);
  const rules = useEmailStore((s) => s.rules);
  const addRecipient = useEmailStore((s) => s.addRecipient);
  const addHistoryRecord = useEmailStore((s) => s.addHistoryRecord);
  const updateHistoryRecord = useEmailStore((s) => s.updateHistoryRecord);
  const online = useAppStore((s) => s.online);
  const updateAudit = useAppStore((s) => s.updateAudit);
  const serverEmailReady = isEmailApiConfigured();
  const [reportId, setReportId] = useState(
    resolveReportId(audit.id, audit.reportId),
  );

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
  /** id -> lane for cadastrados */
  const [lanes, setLanes] = useState<Record<string, RecipientLane>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tempName, setTempName] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  const [tempList, setTempList] = useState<
    { name: string; email: string; lane: RecipientLane }[]
  >([]);
  const [askSaveOpen, setAskSaveOpen] = useState(false);
  const [pendingTemp, setPendingTemp] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const [copyToSelf, setCopyToSelf] = useState(true);
  const [attachment, setAttachment] = useState<AuditPdfAttachment | null>(
    initialAttachment ?? null,
  );
  const [preparingPdf, setPreparingPdf] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setSubject(buildDefaultEmailSubject(audit));
    setBody(buildDefaultEmailBody(audit, actionPlans));
    const initialSelected = new Set(auto.selectedIds);
    // Se auto não trouxe ninguém, seleciona todos ativos como PARA
    if (initialSelected.size === 0) {
      for (const r of activeRecipients) initialSelected.add(r.id);
    }
    setSelectedIds(initialSelected);
    const nextLanes: Record<string, RecipientLane> = {};
    for (const id of initialSelected) nextLanes[id] = 'to';
    setLanes(nextLanes);
    setFeedback('');
    setErrors([]);
    setTempList([]);
    setTempEmail('');
    setTempName('');
    setAskSaveOpen(false);
    setPendingTemp(null);

    let cancelled = false;
    (async () => {
      setPreparingPdf(true);
      try {
        const bound = await ensureBoundAuditReportPdf({
          audit,
          questionnaire,
          actionPlans,
          forceRegenerate: false,
        });
        if (cancelled) return;
        // Se o caller passou um anexo já vinculado à mesma auditoria, prioriza
        const next =
          initialAttachment &&
          (!initialAttachment.auditId ||
            initialAttachment.auditId === audit.id)
            ? {
                ...initialAttachment,
                auditId: audit.id,
                reportId: bound.reportId,
              }
            : bound.attachment;
        setAttachment(next);
        setReportId(bound.reportId);
        updateAudit(audit.id, {
          ...auditPdfMetaPatch(next, bound.reportId),
          reportSendStatus: audit.reportSendStatus ?? 'aguardando_envio',
        });
      } catch {
        if (!cancelled) setErrors(['Falha ao vincular o PDF do relatório.']);
      } finally {
        if (!cancelled) setPreparingPdf(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, audit.id]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setLanes((l) => {
          const copy = { ...l };
          delete copy[id];
          return copy;
        });
      } else {
        next.add(id);
        setLanes((l) => ({ ...l, [id]: 'to' }));
      }
      return next;
    });
  };

  const selectAll = () => {
    const ids = activeRecipients.map((r) => r.id);
    setSelectedIds(new Set(ids));
    const next: Record<string, RecipientLane> = {};
    for (const id of ids) next[id] = lanes[id] ?? 'to';
    setLanes(next);
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
    setLanes({});
  };

  const requestAddTemporary = () => {
    const email = tempEmail.trim().toLowerCase();
    if (!isValidEmail(email)) {
      setErrors(['Informe um e-mail válido para o novo destinatário.']);
      return;
    }
    setPendingTemp({ name: tempName.trim() || email, email });
    setAskSaveOpen(true);
    setErrors([]);
  };

  const confirmAddTemporary = (savePermanent: boolean) => {
    if (!pendingTemp) return;
    if (savePermanent) {
      const created = addRecipient({
        name: pendingTemp.name,
        email: pendingTemp.email,
        roleTitle: 'Destinatário cadastrado',
        active: true,
        isPrimary: false,
        unitIds: [audit.unitId],
        sectorIds: audit.sectorId ? [audit.sectorId] : [],
        groupIds: groups[0]?.id ? [groups[0].id] : [],
      });
      setSelectedIds((prev) => new Set(prev).add(created.id));
      setLanes((l) => ({ ...l, [created.id]: 'to' }));
    } else {
      setTempList((list) => [
        ...list.filter((t) => t.email !== pendingTemp.email),
        { ...pendingTemp, lane: 'to' },
      ]);
    }
    setTempEmail('');
    setTempName('');
    setPendingTemp(null);
    setAskSaveOpen(false);
  };

  const buildPayload = () => {
    const to: {
      name: string;
      email: string;
      type: RecipientLane;
      recipientId?: string;
    }[] = [];
    const cc: typeof to = [];
    const bcc: typeof to = [];

    const push = (
      item: {
        name: string;
        email: string;
        type: RecipientLane;
        recipientId?: string;
      },
    ) => {
      if (item.type === 'cc') cc.push(item);
      else if (item.type === 'bcc') bcc.push(item);
      else to.push(item);
    };

    for (const r of activeRecipients) {
      if (!selectedIds.has(r.id)) continue;
      push({
        name: r.name,
        email: r.email,
        type: lanes[r.id] ?? 'to',
        recipientId: r.id,
      });
    }
    for (const t of tempList) {
      push({ name: t.name, email: t.email, type: t.lane });
    }

    const linkedReportId = resolveReportId(
      audit.id,
      reportId || attachment?.reportId || audit.reportId,
    );
    return {
      auditId: audit.id,
      reportId: linkedReportId,
      auditCode: audit.code,
      subject,
      body,
      to,
      cc,
      bcc,
      copyToSelf,
      selfEmail: user?.email,
      attachment: attachment
        ? {
            ...attachment,
            auditId: audit.id,
            reportId: linkedReportId,
          }
        : null,
      sentByUserId: user?.id ?? '',
      sentByName: user?.name ?? '',
    };
  };

  const requireReadyPayload = () => {
    const payload = buildPayload();
    const validation = validateSendPayload(payload, {
      online,
      canSend: canSendReportEmail(user?.role),
    });
    if (!validation.ok) {
      setErrors(validation.errors);
      return null;
    }
    setErrors([]);
    return payload;
  };

  const logDelivery = (
    payload: NonNullable<ReturnType<typeof buildPayload>>,
    status: 'enviado' | 'falha' | 'aguardando_conexao',
    message: string,
    extraErrors: string[] = [],
  ) => {
    const now = new Date().toISOString();
    const recordId = `email-${Date.now()}`;
    addHistoryRecord({
      id: recordId,
      auditId: audit.id,
      reportId: payload.reportId,
      auditCode: audit.code,
      unitName: audit.unitName,
      sectorName: audit.sectorName,
      subject: payload.subject,
      body: payload.body,
      recipients: [...payload.to, ...payload.cc, ...payload.bcc],
      pdfFileName: payload.attachment!.fileName,
      pdfSizeBytes: payload.attachment!.sizeBytes,
      status,
      sentByUserId: payload.sentByUserId,
      sentByName: payload.sentByName,
      sentAt: status === 'enviado' ? now : undefined,
      createdAt: now,
      updatedAt: now,
      attempts: 1,
      errors: extraErrors,
      copyToSelf: payload.copyToSelf,
      queuedOffline: status === 'aguardando_conexao',
    });
    setFeedback(message);
    if (status === 'enviado' || status === 'aguardando_conexao') {
      updateAudit(audit.id, { reportSendStatus: 'enviado' });
      onSent?.();
    }
  };

  /** Envia com o PDF já anexado (Web Share / Outlook app) — sem file picker */
  const sendViaShare = async () => {
    const payload = requireReadyPayload();
    if (!payload?.attachment) return;
    setSending(true);
    try {
      const result = await sharePdfAttachment(payload.attachment, {
        title: `Relatório ${audit.code}`,
        text: `${payload.subject}\n\n${payload.body}`,
      });
      logDelivery(
        payload,
        'enviado',
        result === 'shared'
          ? `PDF anexado automaticamente. Escolha o Outlook / Microsoft 365 para enviar a ${payload.to.length} destinatário(s).`
          : `PDF pronto (${payload.attachment.fileName}). Abra o Outlook e o arquivo já está disponível para envio.`,
      );
    } catch (err) {
      setErrors([
        err instanceof Error
          ? err.message
          : 'Não foi possível abrir o envio com o PDF anexado.',
      ]);
    } finally {
      setSending(false);
    }
  };

  const copySelectedEmails = async () => {
    const payload = buildPayload();
    const emails = [...payload.to, ...payload.cc, ...payload.bcc].map(
      (r) => r.email,
    );
    if (emails.length === 0) {
      setErrors(['Selecione ao menos um destinatário.']);
      return;
    }
    await copyEmailsToClipboard(emails);
    setFeedback('E-mails copiados. Cole no Outlook / Microsoft 365.');
    setErrors([]);
  };

  const sendViaServer = async () => {
    const payload = requireReadyPayload();
    if (!payload?.attachment) return;
    if (!serverEmailReady) {
      setErrors([
        'Envio pelo servidor não configurado. Use “Enviar PDF por e-mail” (Outlook).',
      ]);
      return;
    }
    setSending(true);
    setFeedback('');
    const now = new Date().toISOString();
    const recordId = `email-${Date.now()}`;
    addHistoryRecord({
      id: recordId,
      auditId: audit.id,
      reportId: payload.reportId,
      auditCode: audit.code,
      unitName: audit.unitName,
      sectorName: audit.sectorName,
      subject: payload.subject,
      body: payload.body,
      recipients: [...payload.to, ...payload.cc, ...payload.bcc],
      pdfFileName: payload.attachment.fileName,
      pdfSizeBytes: payload.attachment.sizeBytes,
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
        { ...payload, attachment: payload.attachment },
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
        updateAudit(audit.id, {
          reportSendStatus:
            result.recordPatch.status === 'enviado'
              ? 'enviado'
              : 'aguardando_envio',
          reportId: payload.reportId,
          pdfFileName: payload.attachment.fileName,
          pdfSizeBytes: payload.attachment.sizeBytes,
        });
        onSent?.();
        setTimeout(() => onClose(), 1400);
      } else if (result.recordPatch.errors?.length) {
        setErrors(result.recordPatch.errors);
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
  const selectedCount = selectedIds.size + tempList.length;
  const toCount =
    [...selectedIds].filter((id) => (lanes[id] ?? 'to') === 'to').length +
    tempList.filter((t) => t.lane === 'to').length;

  return (
    <>
      <Modal open={open} onClose={onClose} title="Enviar relatório da auditoria">
        {!allowed ? (
          <p className="rounded-xl bg-wine-50 px-3 py-2 text-sm text-wine-700">
            Apenas nutricionista, gestor ou administrador podem enviar
            relatórios.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-cream-200 bg-cream-50 p-3 text-sm">
              <p className="font-medium text-ink">
                Relatório: Auditoria — {audit.sectorName}
              </p>
              <p className="mt-1 text-ink-muted">Unidade: {audit.unitName}</p>
              <p className="text-ink-muted">
                Data: {formatDate(audit.completedAt ?? audit.startedAt)}
              </p>
              <p className="text-ink-muted">
                Resultado: {audit.conformityPercent}% de conformidade
              </p>
            </div>

            <div className="rounded-xl border border-olive-200 bg-olive-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-olive-800">
                Anexo
              </p>
              <div className="mt-2 flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-olive-700 shadow-sm">
                  <FileText size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">
                    Relatório da Auditoria
                  </p>
                  <p className="mt-0.5 break-all font-mono text-xs text-ink-muted">
                    {preparingPdf
                      ? 'Vinculando PDF automaticamente…'
                      : attachment?.fileName ??
                        audit.pdfFileName ??
                        'PDF indisponível'}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Tamanho:{' '}
                    {preparingPdf
                      ? '—'
                      : attachment
                        ? `${Math.max(1, Math.round(attachment.sizeBytes / 1024))} KB`
                        : '—'}
                  </p>
                  <p className="mt-1 text-xs text-olive-800">
                    PDF anexado automaticamente a este envio. Não é necessário
                    procurar ou selecionar o arquivo.
                  </p>
                </div>
              </div>
              {attachment && !preparingPdf && (
                <div className="mt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openPdfAttachment(attachment)}
                  >
                    <Eye size={14} /> Visualizar
                  </Button>
                </div>
              )}
            </div>

            {auto.criticalAlert && (
              <div className="flex gap-2 rounded-xl border border-wine-300 bg-wine-50 px-3 py-2 text-sm text-wine-800">
                <AlertTriangle className="mt-0.5 shrink-0" size={18} />
                <p>
                  Não conformidade crítica detectada. Revise os destinatários
                  antes de enviar.
                </p>
              </div>
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
              className="min-h-28 font-mono text-xs leading-relaxed"
            />

            <div className="rounded-xl border border-cream-200 bg-cream-50/80 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  <Users size={16} /> Destinatários ({selectedCount}) · PARA:{' '}
                  {toCount}
                </p>
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={selectAll}
                  >
                    <CheckSquare size={14} /> Selecionar todos
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={deselectAll}
                  >
                    <Square size={14} /> Desmarcar todos
                  </Button>
                </div>
              </div>

              {activeRecipients.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  Nenhum destinatário cadastrado.{' '}
                  <Link
                    to="/app/destinatarios-relatorios"
                    className="text-olive-700 underline"
                    onClick={onClose}
                  >
                    Cadastrar
                  </Link>
                </p>
              ) : (
                <ul className="max-h-56 space-y-2 overflow-y-auto">
                  {activeRecipients.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-col gap-2 rounded-lg bg-white/80 px-2 py-2 sm:flex-row sm:items-center"
                    >
                      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-1 accent-olive-600"
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggle(r.id)}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-ink">
                            {r.name}
                            {r.isPrimary && (
                              <Badge className="ml-2 border-gold-300 bg-gold-100 text-gold-900">
                                Principal
                              </Badge>
                            )}
                          </span>
                          <span className="block text-xs text-ink-muted">
                            {r.email}
                          </span>
                        </span>
                      </label>
                      {selectedIds.has(r.id) && (
                        <Select
                          label=""
                          className="w-28"
                          value={lanes[r.id] ?? 'to'}
                          onChange={(e) =>
                            setLanes((l) => ({
                              ...l,
                              [r.id]: e.target.value as RecipientLane,
                            }))
                          }
                          options={[
                            { value: 'to', label: 'PARA' },
                            { value: 'cc', label: 'CC' },
                            { value: 'bcc', label: 'CCO' },
                          ]}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {tempList.length > 0 && (
                <div className="mt-3 border-t border-cream-200 pt-2">
                  <p className="mb-1 text-xs font-medium text-ink-muted">
                    Destinatários temporários
                  </p>
                  {tempList.map((t) => (
                    <div
                      key={t.email}
                      className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center"
                    >
                      <span className="flex-1 text-sm">
                        {t.name} — {t.email}
                      </span>
                      <Select
                        label=""
                        className="w-28"
                        value={t.lane}
                        onChange={(e) =>
                          setTempList((list) =>
                            list.map((x) =>
                              x.email === t.email
                                ? {
                                    ...x,
                                    lane: e.target.value as RecipientLane,
                                  }
                                : x,
                            ),
                          )
                        }
                        options={[
                          { value: 'to', label: 'PARA' },
                          { value: 'cc', label: 'CC' },
                          { value: 'bcc', label: 'CCO' },
                        ]}
                      />
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
                label="Nome"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="Novo destinatário"
              />
              <Input
                label="E-mail"
                type="email"
                value={tempEmail}
                onChange={(e) => setTempEmail(e.target.value)}
                placeholder="email@nannai.com.br"
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={requestAddTemporary}
            >
              <Plus size={14} /> Adicionar outro destinatário
            </Button>

            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                className="accent-olive-600"
                checked={copyToSelf}
                onChange={(e) => setCopyToSelf(e.target.checked)}
              />
              Enviar cópia para mim ({user?.email})
            </label>

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

            <p className="text-sm font-medium text-ink">
              Enviar relatório por e-mail
            </p>
            <div className="grid gap-2">
              <Button
                onClick={serverEmailReady ? sendViaServer : sendViaShare}
                disabled={sending || preparingPdf || !attachment}
                size="lg"
              >
                <Mail size={16} />
                {sending
                  ? 'Enviando…'
                  : serverEmailReady
                    ? 'Confirmar envio (PDF anexado)'
                    : 'Enviar com Outlook (PDF anexado)'}
              </Button>
              {serverEmailReady && (
                <Button
                  variant="secondary"
                  onClick={sendViaShare}
                  disabled={sending || preparingPdf || !attachment}
                >
                  <Share2 size={16} />
                  Abrir no Outlook com anexo
                </Button>
              )}
              <Button
                variant="outline"
                onClick={copySelectedEmails}
                disabled={sending}
              >
                <Copy size={16} />
                Copiar e-mails
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={onClose}
              disabled={sending}
              fullWidth
            >
              Fechar
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        open={askSaveOpen}
        onClose={() => {
          setAskSaveOpen(false);
          setPendingTemp(null);
        }}
        title="Salvar destinatário?"
      >
        <p className="text-sm text-ink-muted">
          Deseja salvar <strong>{pendingTemp?.name}</strong> (
          {pendingTemp?.email}) para os próximos relatórios?
        </p>
        <p className="mt-2 text-xs text-ink-muted">
          Destinatários de relatório não são usuários do aplicativo.
        </p>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => confirmAddTemporary(true)} fullWidth>
            Sim
          </Button>
          <Button
            variant="outline"
            onClick={() => confirmAddTemporary(false)}
            fullWidth
          >
            Não
          </Button>
        </div>
      </Modal>
    </>
  );
}
