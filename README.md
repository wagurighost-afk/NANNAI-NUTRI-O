# NANNAI Nutrição

<p align="center">
  <img src="src/assets/logo-nannai.png" alt="NANNAI Nutrição" width="280" />
</p>

PWA de auditorias de segurança alimentar, higiene, estrutura, manipulação e boas práticas.

**Slogan:** Alimentar bem, viver melhor  

Na primeira execução o sistema faz um **seed inicial automático** (apenas uma vez,
sem duplicar registros):

- Unidade **NANNAI Muro Alto**
- 20 setores operacionais
- Administradores fundadores **David Oliveira** e **Mauro José**
- **Renata Fernanda** (Nutricionista e Administradora)
- Destinatários dos relatórios (não são usuários do sistema)
- Questionário oficial **Auditoria Nutrisano** (119 perguntas · nota máxima 5540)

Auditorias, planos e indicadores começam vazios — sem dados fictícios. Novos
usuários são cadastrados pelos administradores. A tela de login não exibe
credenciais nem dados administrativos.

**Logo:** [`src/assets/logo-nannai.png`](src/assets/logo-nannai.png) · também em [`public/logo-nannai.png`](public/logo-nannai.png)
## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Firebase Auth / Firestore / Storage / Hosting (stub preparado)
- PWA (vite-plugin-pwa + Service Worker)
- IndexedDB (idb) para offline
- React Hook Form + Zod
- Recharts
- jsPDF para relatórios

## Como rodar

```bash
npm install
npm run dev
```

## Firebase

1. Copie `.env.example` para `.env`
2. Preencha as variáveis `VITE_FIREBASE_*`
3. Defina `VITE_FIREBASE_ENABLED=true`
4. Deploy: `npm run build` e `firebase deploy`

## Estrutura

```
src/
  components/  ui, audit, common
  pages/       auth, dashboard, audits, action-plans, reports...
  layouts/
  services/    offlineDb, pdfReport
  hooks/
  types/
  utils/
  firebase/
  stores/
  assets/
  data/
```

## Envio de relatórios por e-mail

Após finalizar a auditoria, o PDF é gerado, salvo e **vinculado automaticamente**
(`auditId → reportId → pdf`). Na tela de envio o anexo já aparece pronto — a
nutricionista só escolhe destinatários e confirma. Não há file picker.

Nome do arquivo: `Relatorio_Auditoria_[SETOR]_[DD-MM-YYYY].pdf`

- Destinatários em **Destinatários dos Relatórios**
- CC / CCO, cópia para si, temporários e permanentes
- Reenvio reutiliza o mesmo PDF vinculado
- Offline: fila IndexedDB com o PDF anexado

**API (Cloud Function):** `POST` via `VITE_EMAIL_API_URL` com
`{ auditId, reportId, to, cc, bcc, subject, message }`. O backend localiza o PDF
no Storage, valida e anexa no Microsoft Graph (ou Resend).

```bash
# functions/.env
EMAIL_PROVIDER=microsoft_graph
EMAIL_FROM=NANNAI Nutrição <relatorios@nannai.com.br>
MS_GRAPH_TENANT_ID=
MS_GRAPH_CLIENT_ID=
MS_GRAPH_CLIENT_SECRET=
MS_GRAPH_SENDER=relatorios@nannai.com.br
# opcional: EMAIL_PROVIDER=resend + RESEND_API_KEY=

# .env (frontend)
VITE_EMAIL_API_URL=https://REGION-PROJECT.cloudfunctions.net/sendAuditReportEmail
```

Implementação: `functions/sendAuditReportEmail.js`

## Contas iniciais

| Nome | E-mail | Cargo | Perfil |
|------|--------|-------|--------|
| David Oliveira | david.oliveira@nannai.com.br | Administrador | Admin fundador |
| Mauro José | mauro.jose@nannai.net.br | Administrador | Admin fundador |
| Renata Fernanda | renata.fernanda@nannai.com.br | Nutricionista | Administradora |

Demais usuários são cadastrados pelos administradores. Destinatários de relatórios
existem apenas em **Destinatários dos Relatórios** e não são contas do sistema.

Seed no Firebase Auth + Firestore:

```bash
npm install -D firebase-admin
# Defina GOOGLE_APPLICATION_CREDENTIALS e FIREBASE_PROJECT_ID
npm run seed:admins
```

Proteções: não é possível desativar a própria conta; ações sobre outro admin exigem confirmação textual, senha atual, motivo e histórico; sempre permanece ≥ 1 admin ativo.
