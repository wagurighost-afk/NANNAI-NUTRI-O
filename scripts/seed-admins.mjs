/**
 * Seed contas administrativas iniciais no Firebase Authentication + Firestore:
 * - David Oliveira e Mauro José — administradores fundadores
 * - Renata Fernanda — nutricionista e administradora
 *
 * Usage:
 *   1. Download service account JSON from Firebase Console
 *   2. Set GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
 *   3. Set FIREBASE_PROJECT_ID=your-project-id
 *   4. Optional passwords:
 *        SEED_ADMIN_DAVID_PASSWORD
 *        SEED_ADMIN_MAURO_PASSWORD
 *        SEED_ADMIN_RENATA_PASSWORD
 *      (default Nannai@2026)
 *   5. node scripts/seed-admins.mjs
 *
 * Never commit service account keys or production passwords.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const USERS = [
  {
    name: 'David Oliveira',
    email: 'david.oliveira@nannai.com.br',
    professionalRole: 'Administrador',
    role: 'admin',
    passwordEnv: 'SEED_ADMIN_DAVID_PASSWORD',
  },
  {
    name: 'Mauro José',
    email: 'mauro.jose@nannai.net.br',
    professionalRole: 'Administrador',
    role: 'admin',
    passwordEnv: 'SEED_ADMIN_MAURO_PASSWORD',
  },
  {
    name: 'Renata Fernanda',
    email: 'renata.fernanda@nannai.com.br',
    professionalRole: 'Nutricionista',
    role: 'admin',
    passwordEnv: 'SEED_ADMIN_RENATA_PASSWORD',
  },
];

const ALL_PERMISSIONS = [
  'users.manage',
  'users.create',
  'users.edit',
  'users.activate',
  'units.manage',
  'questionnaires.manage',
  'recipients.manage',
  'reports.generate',
  'reports.send',
  'audits.view_all',
  'audits.perform',
  'audits.finalize',
  'audits.sign',
  'action_plans.manage',
  'action_plans.validate',
  'indicators.view',
  'settings.manage',
  'branding.manage',
  'history.view',
];

const DEFAULT_PASSWORD = 'Nannai@2026';

async function main() {
  let admin;
  try {
    admin = require('firebase-admin');
  } catch {
    console.error('Instale firebase-admin: npm install -D firebase-admin');
    process.exit(1);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.error('Defina FIREBASE_PROJECT_ID');
    process.exit(1);
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath || !existsSync(resolve(credPath))) {
    console.error('Defina GOOGLE_APPLICATION_CREDENTIALS apontando para o JSON da service account');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(readFileSync(resolve(credPath), 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId,
  });

  const auth = admin.auth();
  const db = admin.firestore();
  const now = new Date().toISOString();

  for (const a of USERS) {
    const password = process.env[a.passwordEnv] || DEFAULT_PASSWORD;
    const email = a.email.toLowerCase();
    let user;
    try {
      user = await auth.getUserByEmail(email);
      console.log(`Usuário já existe: ${email} (${user.uid})`);
    } catch {
      user = await auth.createUser({
        email,
        password,
        displayName: a.name,
        emailVerified: false,
      });
      console.log(`Criado Auth: ${email} (${user.uid})`);
    }

    const profile = {
      uid: user.uid,
      name: a.name,
      email,
      role: a.role,
      professionalRole: a.professionalRole,
      permissions: [...ALL_PERMISSIONS],
      unitIds: [],
      sectorIds: [],
      active: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('users').doc(user.uid).set(profile, { merge: true });
    console.log(
      `Firestore perfil atualizado: users/${user.uid} (${a.role} / ${a.professionalRole})`,
    );
  }

  console.log('Seed concluído. Altere a senha inicial no primeiro acesso.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
