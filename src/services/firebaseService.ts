/**
 * Firebase service layer.
 * Auth + Firestore user profiles. Credentials never leave configured backends.
 */
import {
  getFirebaseAuth,
  getFirestoreDb,
  getFirebaseStorage,
  isFirebaseEnabled,
} from '../firebase/config';
import type {
  ActionPlan,
  Audit,
  ProfessionalRole,
  User,
  UserAdminHistoryEntry,
  UserRole,
} from '../types';
import { buildUserProfile, permissionsFor } from '../utils/permissions';
import { mockUsers } from '../data/mock';

export async function signInWithEmail(email: string, password: string) {
  if (!isFirebaseEnabled) {
    throw new Error('Firebase desabilitado — use o login simulado.');
  }
  const { signInWithEmailAndPassword } = await import('firebase/auth');
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Auth não inicializado');
  return signInWithEmailAndPassword(auth, email, password);
}

export async function sendPasswordReset(email: string) {
  if (!isFirebaseEnabled) return;
  const { sendPasswordResetEmail } = await import('firebase/auth');
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Auth não inicializado');
  return sendPasswordResetEmail(auth, email);
}

/**
 * Re-authenticate current user with password (required for sensitive admin actions).
 * In mock mode, validates against known demo passwords (length >= 4).
 */
export async function reauthenticateCurrentUser(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!password || password.length < 4) {
    return { ok: false, error: 'Senha atual inválida.' };
  }

  if (!isFirebaseEnabled) {
    // Demo: accept the same password rule used by mock login
    return { ok: true };
  }

  try {
    const {
      EmailAuthProvider,
      reauthenticateWithCredential,
    } = await import('firebase/auth');
    const auth = getFirebaseAuth();
    if (!auth?.currentUser) {
      return { ok: false, error: 'Sessão expirada. Faça login novamente.' };
    }
    const credential = EmailAuthProvider.credential(email, password);
    await reauthenticateWithCredential(auth.currentUser, credential);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Senha atual incorreta.' };
  }
}

export async function fetchUserProfile(uid: string): Promise<User | null> {
  if (!isFirebaseEnabled) {
    return mockUsers.find((u) => u.uid === uid || u.id === uid) ?? null;
  }
  const { doc, getDoc } = await import('firebase/firestore');
  const db = getFirestoreDb();
  if (!db) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data() as User;
}

export async function upsertAuditRemote(audit: Audit) {
  if (!isFirebaseEnabled) return;
  const { doc, setDoc } = await import('firebase/firestore');
  const db = getFirestoreDb();
  if (!db) return;
  await setDoc(doc(db, 'audits', audit.id), audit, { merge: true });
}

export async function upsertActionPlanRemote(plan: ActionPlan) {
  if (!isFirebaseEnabled) return;
  const { doc, setDoc } = await import('firebase/firestore');
  const db = getFirestoreDb();
  if (!db) return;
  await setDoc(doc(db, 'actionPlans', plan.id), plan, { merge: true });
}

export async function upsertUserRemote(user: User) {
  if (!isFirebaseEnabled) return;
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const db = getFirestoreDb();
  if (!db) return;
  await setDoc(
    doc(db, 'users', user.uid),
    {
      ...user,
      id: user.uid,
      isActive: user.isActive ?? user.active,
      active: user.isActive ?? user.active,
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function saveUserAdminHistoryRemote(
  entry: UserAdminHistoryEntry,
) {
  if (!isFirebaseEnabled) return;
  const { doc, setDoc } = await import('firebase/firestore');
  const db = getFirestoreDb();
  if (!db) return;
  await setDoc(doc(db, 'userAdminHistory', entry.id), entry, { merge: true });
}

/**
 * Client SDK cannot disable other Auth users — call Cloud Function.
 * Stub logs intent when Firebase is on without function URL.
 */
export async function disableAuthUserRemote(uid: string, disabled: boolean) {
  const url = import.meta.env.VITE_ADMIN_USER_API_URL as string | undefined;
  if (!url) {
    console.info(
      `[NANNAI] disableAuthUserRemote(${uid}, ${disabled}) — configure VITE_ADMIN_USER_API_URL`,
    );
    return;
  }
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, disabled }),
  });
}

/**
 * Creates Auth user + Firestore profile.
 * Prefer Admin SDK seed script in production; client createUser works for bootstrap
 * when using a privileged session or before Auth restrictions.
 */
export async function createAuthUserAndProfile(params: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  professionalRole: ProfessionalRole;
  unitIds: string[];
}): Promise<{ ok: boolean; user?: User; error?: string }> {
  if (!isFirebaseEnabled) {
    return { ok: false, error: 'Firebase desabilitado' };
  }

  try {
    const { createUserWithEmailAndPassword, updateProfile } = await import(
      'firebase/auth'
    );
    const auth = getFirebaseAuth();
    if (!auth) return { ok: false, error: 'Auth não inicializado' };

    const cred = await createUserWithEmailAndPassword(
      auth,
      params.email,
      params.password,
    );
    await updateProfile(cred.user, { displayName: params.name });

    const user = buildUserProfile({
      uid: cred.user.uid,
      name: params.name,
      email: params.email,
      role: params.role,
      professionalRole: params.professionalRole,
      unitIds: params.unitIds,
      permissions: permissionsFor(params.role, params.professionalRole),
    });

    await upsertUserRemote(user);
    return { ok: true, user };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Falha ao criar usuário',
    };
  }
}

export async function uploadEvidenceBlob(
  path: string,
  blob: Blob,
): Promise<string | null> {
  if (!isFirebaseEnabled) return null;
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const storage = getFirebaseStorage();
  if (!storage) return null;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

/**
 * Publica o PDF da auditoria no Storage + metadados no Firestore.
 * Caminho interno fixo: audit-reports/{auditId}/{reportId}.pdf
 * O cliente nunca envia um path escolhido pelo usuário.
 */
export async function uploadAuditReportPdfRemote(params: {
  auditId: string;
  reportId: string;
  attachment: {
    fileName: string;
    mimeType: string;
    base64: string;
    sizeBytes: number;
    blob?: Blob;
  };
}): Promise<{ storagePath: string } | null> {
  if (!isFirebaseEnabled) return null;
  const { auditId, reportId, attachment } = params;
  if (!auditId || !reportId) return null;
  if (attachment.mimeType !== 'application/pdf') return null;

  const storage = getFirebaseStorage();
  const db = getFirestoreDb();
  if (!storage || !db) return null;

  const storagePath = `audit-reports/${auditId}/${reportId}.pdf`;
  const blob =
    attachment.blob ??
    (() => {
      const binary = atob(attachment.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new Blob([bytes], { type: 'application/pdf' });
    })();

  const { ref, uploadBytes } = await import('firebase/storage');
  const { doc, setDoc } = await import('firebase/firestore');
  await uploadBytes(ref(storage, storagePath), blob, {
    contentType: 'application/pdf',
  });
  await setDoc(
    doc(db, 'auditReports', reportId),
    {
      reportId,
      auditId,
      fileName: attachment.fileName,
      mimeType: 'application/pdf',
      sizeBytes: attachment.sizeBytes,
      storagePath,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
  return { storagePath };
}

export async function listUsersFromFirestore(): Promise<User[]> {
  if (!isFirebaseEnabled) return mockUsers;
  const { collection, getDocs } = await import('firebase/firestore');
  const db = getFirestoreDb();
  if (!db) return [];
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => d.data() as User);
}
