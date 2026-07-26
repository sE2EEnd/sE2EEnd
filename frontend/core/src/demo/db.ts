import type { SendResponse } from '@/services/sendApi';

const DB_NAME = 'DemoDB';
const DB_VERSION = 1;

export interface DemoSendRecord extends SendResponse {
  encryptedChunks?: Uint8Array[];
  chunkSize?: number;
  ownerPassword?: string;
}

export interface DemoSetting {
  key: string;
  value: string;
}

export interface DemoMeta {
  key: string;
  value: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

// Clear all object stores instead of deleting the database.
// deleteDatabase() gets "blocked" when another tab still holds a connection,
// causing a rejected promise that crashes boot(). Clearing stores is safe
// regardless of how many tabs are open.
export async function clearDemoDB(): Promise<void> {
  try {
    const db = await openDemoDB();
    await new Promise<void>((resolve, reject) => {
      const names = ['sends', 'settings', 'meta'];
      const t = db.transaction(names, 'readwrite');
      for (const name of names) t.objectStore(name).clear();
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  } catch {
    // DB might not exist yet — nothing to clear
  } finally {
    // Force a fresh connection on next openDemoDB() call
    dbPromise = null;
  }
}

export function openDemoDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('sends')) {
        const s = db.createObjectStore('sends', { keyPath: 'id' });
        s.createIndex('accessId', 'accessId', { unique: true });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
  });
  return dbPromise;
}

export function tx<T>(
  storeName: string | string[],
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDemoDB().then(db => new Promise<T>((resolve, reject) => {
    const names = Array.isArray(storeName) ? storeName : [storeName];
    const transaction = db.transaction(names, mode);
    const store = transaction.objectStore(Array.isArray(storeName) ? storeName[0] : storeName);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  }));
}
