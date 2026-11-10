import { API_BASE_URL, handleUnauthorized, type ScreeningVisitInput, type ScreeningVisitResponse } from '../api/client';

const DB_NAME = 'sanjeevni_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'pending_visits';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'visit_id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export interface StoredVisitRecord {
  visit_id: string;
  payload: ScreeningVisitInput;
  offlineResult: ScreeningVisitResponse;
  saved_at: string;
}

export const saveVisitToIndexedDB = async (
  payload: ScreeningVisitInput,
  offlineResult: ScreeningVisitResponse
): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const idempotentId = payload.visit_id || offlineResult.visit_id;
    const record: StoredVisitRecord = {
      visit_id: idempotentId,
      payload: { ...payload, visit_id: idempotentId },
      offlineResult: { ...offlineResult, visit_id: idempotentId },
      saved_at: new Date().toISOString()
    };
    store.put(record);
  } catch (err) {
    console.warn('Failed saving to IndexedDB:', err);
  }
};

export const getPendingVisitsFromDB = async (): Promise<StoredVisitRecord[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
};

export const removePendingVisitFromDB = async (visitId: string): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(visitId);
  } catch (err) {
    console.warn('Failed removing from IndexedDB:', err);
  }
};

export const syncAllPendingVisits = async (): Promise<number> => {
  if (!navigator.onLine) return 0;
  const pending = await getPendingVisitsFromDB();
  if (pending.length === 0) return 0;

  const token = localStorage.getItem('authToken');
  let syncedCount = 0;
  for (const record of pending) {
    try {
      const res = await fetch(`${API_BASE_URL}/visit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(record.payload)
      });
      if (res.status === 401) {
        handleUnauthorized();
        break;
      }
      if (res.ok) {
        await removePendingVisitFromDB(record.visit_id);
        syncedCount++;
      }
    } catch {
      // Still offline or transient error; retry later
      break;
    }
  }
  return syncedCount;
};

// Auto-register online sync listener
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Network restored: triggering automatic offline sync...');
    syncAllPendingVisits().then(c => {
      if (c > 0) console.log(`Successfully synced ${c} offline visits to backend.`);
    });
  });
}
