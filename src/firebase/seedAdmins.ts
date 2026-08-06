/**
 * Client-side helper to ensure initial admin profiles exist in Firestore
 * after Auth accounts were created by scripts/seed-admins.mjs.
 */
import { INITIAL_ADMINS, buildUserProfile } from '../utils/permissions';
import { isFirebaseEnabled, getFirestoreDb } from './config';
import { listUsersFromFirestore, upsertUserRemote } from '../services/firebaseService';

export async function ensureAdminProfilesLinked() {
  if (!isFirebaseEnabled || !getFirestoreDb()) {
    console.info('[NANNAI] Seed client: Firebase off — admins locais no mock.');
    return { linked: 0, mode: 'mock' as const };
  }

  const users = await listUsersFromFirestore();
  let linked = 0;

  for (const admin of INITIAL_ADMINS) {
    const existing = users.find(
      (u) => u.email.toLowerCase() === admin.email.toLowerCase(),
    );
    if (existing) continue;

    // Profile missing — cannot create Auth from client without password.
    // Create a placeholder doc keyed by email slug for ops visibility.
    console.warn(
      `[NANNAI] Perfil Firestore ausente para ${admin.email}. Execute: node scripts/seed-admins.mjs`,
    );
  }

  for (const u of users) {
    if (u.role === 'admin' && (!u.permissions || u.permissions.length === 0)) {
      const patched = buildUserProfile({
        uid: u.uid,
        name: u.name,
        email: u.email,
        role: 'admin',
        professionalRole: u.professionalRole || 'Administrador',
        unitIds: u.unitIds,
        sectorIds: u.sectorIds,
      });
      await upsertUserRemote({ ...u, ...patched });
      linked += 1;
    }
  }

  return { linked, mode: 'firebase' as const };
}
