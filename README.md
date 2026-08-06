# NANNAI Nutrição

<p align="center">
  <img src="src/assets/logo-nannai.png" alt="NANNAI Nutrição" width="280" />
</p>

PWA de auditorias de segurança alimentar, higiene, estrutura, manipulação e boas práticas.

**Slogan:** Alimentar bem, viver melhor  
**Unidade inicial:** NANNAI Muro Alto

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

Login demo: `roberto.silva@nannai.com.br` / `1234`

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

- Destinatários principais pré-cadastrados (Fernando, Ariela, Renata, Jhonny, Neto, David)
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

## Administradores iniciais

| Nome | E-mail | Cargo | Perfil |
|------|--------|-------|--------|
| Mauro José | mauro.jose@nannai.com.br | Administrador | `admin` |
| Renata Fernanda | renata.fernanda@nannai.com.br | Nutricionista | `admin` + auditorias |

Seed no Firebase Auth + Firestore:

```bash
npm install -D firebase-admin
# Defina GOOGLE_APPLICATION_CREDENTIALS e FIREBASE_PROJECT_ID
npm run seed:admins
```

Proteções: não é possível desativar a própria conta; ações sobre outro admin exigem confirmação textual, senha atual, motivo e histórico; sempre permanece ≥ 1 admin ativo.
