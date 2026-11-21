import { openDB } from 'idb';

export interface OfflinePunch {
  id?: number;
  offline_txn_id: string;
  employee_id: number;
  employee_code: string;
  employee_name: string;
  kiosk_id: number | null;
  punch_type?: number;
  timestamp: string;
  synced: boolean;
}

const DB_NAME = 'SPTechKioskDB';
const DB_VERSION = 1;

export async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('offlinePunches')) {
        const store = db.createObjectStore('offlinePunches', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('by-synced', 'synced');
        store.createIndex('by-txn', 'offline_txn_id', { unique: true });
      }
    },
  });
}

export async function storeOfflinePunch(punch: Omit<OfflinePunch, 'id' | 'synced'>) {
  const db = await getDb();
  return db.add('offlinePunches', {
    ...punch,
    synced: false,
  });
}

export async function getPendingOfflinePunches(): Promise<OfflinePunch[]> {
  const db = await getDb();
  const tx = db.transaction('offlinePunches', 'readonly');
  const index = tx.store.index('by-synced');
  return index.getAll(IDBKeyRange.only(false));
}

export async function markPunchesAsSynced(txnIds: string[]) {
  const db = await getDb();
  const tx = db.transaction('offlinePunches', 'readwrite');
  for (const txnId of txnIds) {
    const item = await tx.store.index('by-txn').get(txnId);
    if (item && item.id) {
      item.synced = true;
      await tx.store.put(item);
    }
  }
  await tx.done;
}

export async function syncOfflinePunchesWithServer(): Promise<{ syncedCount: number; errors: any[] }> {
  const pending = await getPendingOfflinePunches();
  if (pending.length === 0) return { syncedCount: 0, errors: [] };

  try {
    const response = await fetch('/api/attendance/sync-offline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch: pending }),
    });

    const data = await response.json();
    if (data.success && Array.isArray(data.results)) {
      const successfulTxns = data.results
        .filter((r: any) => r.success)
        .map((r: any) => r.offline_txn_id);

      if (successfulTxns.length > 0) {
        await markPunchesAsSynced(successfulTxns);
      }

      return {
        syncedCount: successfulTxns.length,
        errors: data.results.filter((r: any) => !r.success),
      };
    }
    return { syncedCount: 0, errors: [data.message] };
  } catch (err) {
    return { syncedCount: 0, errors: [err] };
  }
}
