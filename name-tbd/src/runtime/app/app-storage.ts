import { TableData } from '../../app/_types/data-source.types';

interface StoredData {
  revision: string;
  tables: Record<number, TableData>;
}

/**
 * Keeps the app's data changes in the browser (localStorage), so they're still there on the next
 * visit. Only for the same exported data (its revision): an export with other data starts from that.
 */
export class AppStorage {
  constructor(
    private readonly key: string,
    private readonly revision: string,
    private readonly storage: Storage | null = safeLocalStorage(),
  ) {}

  /** The data kept from an earlier visit (of this export), if any. */
  load(): Record<number, TableData> {
    try {
      const stored = JSON.parse(this.storage?.getItem(this.key) ?? 'null') as StoredData | null;
      return stored?.revision === this.revision ? stored.tables : {};
    } catch {
      return {};
    }
  }

  save(tables: Record<number, TableData>): void {
    try {
      this.storage?.setItem(this.key, JSON.stringify({ revision: this.revision, tables } satisfies StoredData));
    } catch (err) {
      // Full, or blocked: the app keeps working, changes just aren't kept
      console.warn('[app] Could not keep the data changes in this browser', err);
    }
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
