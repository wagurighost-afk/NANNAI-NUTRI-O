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

Após gerar o PDF de uma auditoria concluída, gestores/nutricionistas/admins podem
usar **Enviar relatório por e-mail**.

- Destinatários cadastrados pela administradora em **Destinatários dos Relatórios**
- CC / CCO, cópia para si, temporários e permanentes
- Regras automáticas por unidade, setor, pontuação e NC crítica
- Histórico com reenvio
- Offline: fila IndexedDB + mensagem “Relatório aguardando conexão…”

**Segurança:** o navegador NÃO envia e-mail com senhas. Use Cloud Function:

```bash
# functions/.env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxx
EMAIL_FROM=NANNAI Nutrição <relatorios@nannai.com.br>

# .env (frontend)
VITE_EMAIL_API_URL=https://REGION-PROJECT.cloudfunctions.net/sendAuditReportEmail
```

Stub: `functions/sendAuditReportEmail.js`

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
