/**
 * Firebase configuration stub.
 * Replace the placeholders with your Firebase project credentials
 * and set VITE_FIREBASE_ENABLED=true when ready to connect.
 */

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'YOUR_API_KEY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'YOUR_PROJECT.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'YOUR_PROJECT_ID',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'YOUR_PROJECT.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? 'YOUR_SENDER_ID',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? 'YOUR_APP_ID',
};

export const isFirebaseEnabled =
  import.meta.env.VITE_FIREBASE_ENABLED === 'true' &&
  Boolean(import.meta.env.VITE_FIREBASE_API_KEY);

let app: import('firebase/app').FirebaseApp | null = null;
let auth: import('firebase/auth').Auth | null = null;
let db: import('firebase/firestore').Firestore | null = null;
let storage: import('firebase/storage').FirebaseStorage | null = null;

export async function initFirebase() {
  if (!isFirebaseEnabled) {
    console.info('[NANNAI] Firebase desabilitado — usando dados simulados.');
    return null;
  }
  const { initializeApp } = await import('firebase/app');
  const { getAuth } = await import('firebase/auth');
  const { getFirestore } = await import('firebase/firestore');
  const { getStorage } = await import('firebase/storage');

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  return { app, auth, db, storage };
}

export function getFirebaseAuth() {
  return auth;
}

export function getFirestoreDb() {
  return db;
}

export function getFirebaseStorage() {
  return storage;
}
