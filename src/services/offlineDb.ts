import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ActionPlan, Audit, Evidence } from '../types';

/** Stored offline email job — payload shape matches SendReportPayload */
export interface QueuedEmail {
  id: string;
  payload: {
    auditId: string;
    reportId: string;
    auditCode: string;
    subject: string;
    body: string;
    to: { name: string; email: string; type: 'to' | 'cc' | 'bcc'; recipientId?: string }[];
    cc: { name: string; email: string; type: 'to' | 'cc' | 'bcc'; recipientId?: string }[];
    bcc: { name: string; email: string; type: 'to' | 'cc' | 'bcc'; recipientId?: string }[];
    copyToSelf: boolean;
    selfEmail?: string;
    attachment: {
      fileName: string;
      mimeType: 'application/pdf';
      base64: string;
      sizeBytes: number;
      auditId?: string;
      reportId?: string;
    };
    sentByUserId: string;
    sentByName: string;
  };
  createdAt: string;
}

interface NannaiDB extends DBSchema {
  audits: {
    key: string;
    value: Audit;
    indexes: { 'by-sync': string };
  };
  actionPlans: {
    key: string;
    value: ActionPlan;
    indexes: { 'by-sync': string };
  };
  evidences: {
    key: string;
    value: Evidence & { auditId: string; questionId: string; blob?: Blob };
  };
  syncQueue: {
    key: number;
    value: {
      id?: number;
      entity: 'audit' | 'actionPlan' | 'evidence' | 'email';
      entityId: string;
      payload: unknown;
      createdAt: string;
    };
    indexes: { 'by-entity': string };
  };
  emailQueue: {
    key: string;
    value: QueuedEmail;
  };
}

const DB_NAME = 'nannai-nutricao-offline';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<NannaiDB>> | null = null;

export function getOfflineDb() {
  if (!dbPromise) {
    dbPromise = openDB<NannaiDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('audits')) {
          const audits = db.createObjectStore('audits', { keyPath: 'id' });
          audits.createIndex('by-sync', 'syncStatus');
        }
        if (!db.objectStoreNames.contains('actionPlans')) {
          const plans = db.createObjectStore('actionPlans', { keyPath: 'id' });
          plans.createIndex('by-sync', 'syncStatus');
        }
        if (!db.objectStoreNames.contains('evidences')) {
          db.createObjectStore('evidences', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          const queue = db.createObjectStore('syncQueue', {
            keyPath: 'id',
            autoIncrement: true,
          });
          queue.createIndex('by-entity', 'entity');
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains('emailQueue')) {
          db.createObjectStore('emailQueue', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveAuditOffline(audit: Audit) {
  const db = await getOfflineDb();
  await db.put('audits', audit);
  await db.add('syncQueue', {
    entity: 'audit',
    entityId: audit.id,
    payload: audit,
    createdAt: new Date().toISOString(),
  });
}

export async function saveActionPlanOffline(plan: ActionPlan) {
  const db = await getOfflineDb();
  await db.put('actionPlans', plan);
  await db.add('syncQueue', {
    entity: 'actionPlan',
    entityId: plan.id,
    payload: plan,
    createdAt: new Date().toISOString(),
  });
}

export async function getPendingSyncCount() {
  const db = await getOfflineDb();
  return db.count('syncQueue');
}

export async function clearSyncQueue() {
  const db = await getOfflineDb();
  const tx = db.transaction('syncQueue', 'readwrite');
  await tx.store.clear();
  await tx.done;
}

export async function syncPendingChanges(): Promise<{ synced: number }> {
  const db = await getOfflineDb();
  const items = await db.getAll('syncQueue');
  await new Promise((r) => setTimeout(r, 800));
  await clearSyncQueue();
  return { synced: items.length };
}

export async function enqueueEmailSend(item: QueuedEmail) {
  const db = await getOfflineDb();
  await db.put('emailQueue', item);
}

export async function getQueuedEmails(): Promise<QueuedEmail[]> {
  const db = await getOfflineDb();
  return db.getAll('emailQueue');
}

export async function removeQueuedEmail(id: string) {
  const db = await getOfflineDb();
  await db.delete('emailQueue', id);
}

export async function getQueuedEmailCount() {
  const db = await getOfflineDb();
  return db.count('emailQueue');
}
