import type { BatchAdDraft } from '@shared/types';
import { hasExpiredBatch } from './batchQueue';

const DATABASE_NAME = 'clothing-ad-batches-v1';
const DATABASE_VERSION = 1;
const DRAFT_STORE = 'drafts';
const ASSET_STORE = 'assets';

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise(resolve => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DRAFT_STORE)) database.createObjectStore(DRAFT_STORE, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(ASSET_STORE)) database.createObjectStore(ASSET_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function runTransaction<T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const database = await openDatabase();
  if (!database) return null;
  return new Promise(resolve => {
    const transaction = database.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => database.close();
  });
}

export async function saveBatchDraft(draft: BatchAdDraft) {
  await runTransaction(DRAFT_STORE, 'readwrite', store => store.put(draft));
}

export async function loadBatchDrafts(): Promise<BatchAdDraft[]> {
  return (await runTransaction<BatchAdDraft[]>(DRAFT_STORE, 'readonly', store => store.getAll())) || [];
}

export async function saveBatchAsset(id: string, blob: Blob, batchId: string) {
  await runTransaction(ASSET_STORE, 'readwrite', store => store.put({ id, batchId, blob, updatedAt: Date.now() }));
}

export async function loadBatchAsset(id: string): Promise<Blob | null> {
  const asset = await runTransaction<{ id: string; batchId: string; blob: Blob }>(ASSET_STORE, 'readonly', store => store.get(id));
  return asset?.blob || null;
}

export async function deleteBatchDraft(batchId: string) {
  await runTransaction(DRAFT_STORE, 'readwrite', store => store.delete(batchId));
  const database = await openDatabase();
  if (!database) return;
  const transaction = database.transaction(ASSET_STORE, 'readwrite');
  const store = transaction.objectStore(ASSET_STORE);
  const request = store.getAll();
  request.onsuccess = () => {
    for (const asset of request.result as Array<{ id: string; batchId: string }>) if (asset.batchId === batchId) store.delete(asset.id);
  };
  transaction.oncomplete = () => database.close();
}

export async function cleanExpiredBatchDrafts(now = Date.now()) {
  const drafts = await loadBatchDrafts();
  const expired = drafts.filter(draft => hasExpiredBatch(draft, now));
  await Promise.all(expired.map(draft => deleteBatchDraft(draft.id)));
  return expired.length;
}

export async function getBatchStorageEstimate() {
  if (!navigator.storage?.estimate) return null;
  return navigator.storage.estimate();
}

export async function requestPersistentBatchStorage() {
  if (!navigator.storage?.persist) return false;
  try { return await navigator.storage.persist(); } catch { return false; }
}
