import { TableData } from '../../../app/_types/data-source.types';

// Where a live export keeps the rows it last read and the changes it couldn't send yet, so it keeps
// working offline: IndexedDB where the browser allows it (also for a file opened from disk in Chrome and
// Firefox), else localStorage, else memory only (lost on reload).

/** A change waiting to be sent, by column name; `base`: the values it was made on (to spot conflicts). */
export type QueuedChange =
  | { op: 'add'; dataSourceId: number; tempId: string; values: Record<string, string> }
  | { op: 'update'; dataSourceId: number; rowId: string; values: Record<string, string>; base: Record<string, string> }
  | { op: 'delete'; dataSourceId: number; rowIds: string[] };

export interface OfflineState {
  tables: Record<number, TableData>;
  queue: QueuedChange[];
}

export interface OfflineStore {
  load(): Promise<OfflineState | null>;
  save(state: OfflineState): Promise<void>;
}

/** Keeps nothing past the page (no storage in this browser). */
export class MemoryOfflineStore implements OfflineStore {
  private state: OfflineState | null = null;

  async load(): Promise<OfflineState | null> {
    return this.state ? structuredClone(this.state) : null;
  }

  async save(state: OfflineState): Promise<void> {
    this.state = structuredClone(state);
  }
}

class LocalStorageStore implements OfflineStore {
  constructor(private readonly key: string, private readonly storage: Storage) {}

  async load(): Promise<OfflineState | null> {
    try {
      return JSON.parse(this.storage.getItem(this.key) ?? 'null');
    } catch {
      return null;
    }
  }

  async save(state: OfflineState): Promise<void> {
    try {
      this.storage.setItem(this.key, JSON.stringify(state));
    } catch (err) {
      console.warn('[app] Could not keep the data in this browser', err);
    }
  }
}

class IndexedDbStore implements OfflineStore {
  private static readonly STORE = 'state';

  constructor(private readonly db: IDBDatabase) {}

  static open(name: string): Promise<IndexedDbStore> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(IndexedDbStore.STORE);
      request.onsuccess = () => resolve(new IndexedDbStore(request.result));
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('blocked'));
    });
  }

  load(): Promise<OfflineState | null> {
    return new Promise((resolve) => {
      try {
        const request = this.db.transaction(IndexedDbStore.STORE).objectStore(IndexedDbStore.STORE).get('state');
        request.onsuccess = () => resolve((request.result as OfflineState | undefined) ?? null);
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  save(state: OfflineState): Promise<void> {
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(IndexedDbStore.STORE, 'readwrite');
        tx.objectStore(IndexedDbStore.STORE).put(state, 'state');
        tx.oncomplete = () => resolve();
        tx.onerror = () => {
          console.warn('[app] Could not keep the data in this browser', tx.error);
          resolve();
        };
      } catch (err) {
        console.warn('[app] Could not keep the data in this browser', err);
        resolve();
      }
    });
  }
}

/** The best store this browser has, under `name`. */
export async function openOfflineStore(name: string): Promise<OfflineStore> {
  try {
    if (typeof indexedDB !== 'undefined') return await IndexedDbStore.open(name);
  } catch {
    // Blocked (private windows, some file:// setups): try the next one
  }
  try {
    const storage = window.localStorage;
    storage.getItem(name);
    return new LocalStorageStore(name, storage);
  } catch {
    return new MemoryOfflineStore();
  }
}
