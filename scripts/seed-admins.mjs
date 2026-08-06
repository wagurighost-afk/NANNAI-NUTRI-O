/**
 * Seed Mauro José + Renata Fernanda into Firebase Authentication + Firestore.
 *
 * Usage:
 *   1. Download service account JSON from Firebase Console
 *   2. Set GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
 *   3. Set FIREBASE_PROJECT_ID=your-project-id
 *   4. Optional: SEED_ADMIN_MAURO_PASSWORD / SEED_ADMIN_RENATA_PASSWORD
 *   5. node scripts/seed-admins.mjs
 *
 * Never commit service account keys or production passwords.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const ADMINS = [
  {
    name: 'Mauro José',
    email: 'mauro.jose@nannai.com.br',
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

async function main() {
  let admin;
  try {
    admin = require('firebase-admin');
  } catch {
    console.error(
      'Instale firebase-admin: npm install -D firebase-admin\n' +
        'Depois execute novamente: node scripts/seed-admins.mjs',
    );
    process.exit(1);
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.VITE_FIREBASE_PROJECT_ID;

  if (!admin.apps.length) {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credPath && existsSync(resolve(credPath))) {
      const sa = JSON.parse(readFileSync(resolve(credPath), 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(sa),
        projectId: projectId || sa.project_id,
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId,
      });
    }
  }

  const auth = admin.auth();
  const db = admin.firestore();
  const defaultPassword = 'NannaiAdmin@2026';

  for (const a of ADMINS) {
    const password = process.env[a.passwordEnv] || defaultPassword;
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(a.email);
      console.log(`Auth já existe: ${a.email} (${userRecord.uid})`);
    } catch {
      userRecord = await auth.createUser({
        email: a.email,
        password,
        displayName: a.name,
        emailVerified: true,
        disabled: false,
      });
      console.log(`Auth criado: ${a.email} (${userRecord.uid})`);
    }

    const now = new Date().toISOString();
    const profile = {
      uid: userRecord.uid,
      id: userRecord.uid,
      name: a.name,
      email: a.email,
      role: a.role,
      professionalRole: a.professionalRole,
      permissions: ALL_PERMISSIONS,
      unitIds: ['unit1', 'unit2'],
      sectorIds: a.professionalRole === 'Nutricionista' ? ['s1', 's2', 's3', 's4', 's5'] : [],
      active: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('users').doc(userRecord.uid).set(profile, { merge: true });
    console.log(`Firestore users/${userRecord.uid} atualizado (${a.professionalRole})`);
  }

  console.log('\nSeed concluído. Altere as senhas iniciais após o primeiro acesso.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
