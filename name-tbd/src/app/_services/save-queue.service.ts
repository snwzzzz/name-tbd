import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BranchControllerService } from '../api/services/branchController.service';
import { ChangeOperation } from '../api/models';
import { EditorContext } from './editor-context.service';
import { IdRegistry } from './id-registry.service';
import { WORKFLOW_NODE_ID_KINDS } from '../core/catalog/id-references';
import { API_BASE_URL } from '../_constants/api.constants';

/** Sent this long after the last change… */
export const SAVE_IDLE_MS = 1000;
/** …but at the latest this long after the first unsent one, so saving never waits on endless editing. */
export const SAVE_MAX_WAIT_MS = 15000;
/** Waits before trying again while the backend can't be reached. */
export const SAVE_RETRY_MS = [2000, 5000, 10000, 30000];

/**
 * - `saved`: everything is saved
 * - `pending`: changes wait to be sent (shortly)
 * - `saving`: a batch is on its way
 * - `offline`: the backend can't be reached; trying again
 * - `error`: the backend refused changes (they're lost; reloading shows what's saved)
 */
export type SaveState = 'saved' | 'pending' | 'saving' | 'offline' | 'error';

type Kind = 'Widget' | 'Node' | 'Edge';

/**
 * The editor's changes on their way to the backend: collected, and sent together as one batch
 * (POST /api/branches/{id}/changes) a second after the editing pauses, at least every 15 seconds,
 * and right away when the tab goes into the background or Ctrl+S is pressed.
 * <p>
 * Changes to the same thing merge while they wait (ten moves of a widget are sent as its last
 * position). Things created by the editor go by their temporary id until the batch's answer gives
 * their real ids (IdRegistry); changes still waiting are rewritten to those then.
 */
@Injectable({ providedIn: 'root' })
export class SaveQueue {
  private readonly api = inject(BranchControllerService);
  private readonly context = inject(EditorContext);
  private readonly registry = inject(IdRegistry);
  private readonly document = inject(DOCUMENT);

  private pending: ChangeOperation[] = [];
  private inFlight: Promise<void> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;
  private maxWaitTimer: ReturnType<typeof setTimeout> | undefined;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private retries = 0;

  private readonly waiting = signal(0);
  private readonly sending = signal(false);
  readonly state = signal<SaveState>('saved');
  /** Why the last batch was refused (state `error`). */
  readonly error = signal<string | null>(null);
  readonly hasUnsaved = computed(() => this.waiting() > 0 || this.sending());

  constructor() {
    this.document.defaultView?.addEventListener('beforeunload', (event) => {
      if (!this.hasUnsaved()) return;
      this.sendBeforeLeaving();
      event.preventDefault();
      // Older browsers only show the warning with a returnValue
      event.returnValue = '';
    });
    this.document.addEventListener('visibilitychange', () => {
      if (this.document.visibilityState === 'hidden') void this.flush();
    });
  }

  /** A change to send. */
  enqueue(change: ChangeOperation): void {
    const resolved = this.resolveSaved(change);
    if (!this.merge(resolved)) this.pending.push(resolved);
    this.waiting.set(this.pending.length);
    if (this.state() !== 'offline' && this.state() !== 'error') this.state.set('pending');
    this.schedule();
  }

  /** Sends what's waiting now (and waits for it). */
  async flush(): Promise<void> {
    clearTimeout(this.idleTimer);
    clearTimeout(this.maxWaitTimer);
    clearTimeout(this.retryTimer);
    this.idleTimer = this.maxWaitTimer = this.retryTimer = undefined;
    if (this.inFlight) {
      await this.inFlight;
      if (this.pending.length > 0) return this.flush();
      return;
    }
    if (this.pending.length === 0) return;
    this.inFlight = this.send();
    try {
      await this.inFlight;
    } finally {
      this.inFlight = null;
    }
  }

  private async send(): Promise<void> {
    const batch = this.pending;
    this.pending = [];
    this.waiting.set(0);
    this.sending.set(true);
    this.state.set('saving');
    try {
      const result = await firstValueFrom(this.api.applyChanges(this.context.requireBranchId(), { changes: batch }));
      this.retries = 0;
      this.error.set(null);
      const ids = (result.ids ?? {}) as Record<string, number>;
      this.pending = this.pending.map((change) => rewriteRefs(change, ids));
      this.registry.record(ids);
      this.state.set(this.pending.length > 0 ? 'pending' : 'saved');
      if (this.pending.length > 0) this.schedule();
    } catch (err) {
      if (refused(err)) {
        // Something it points at is gone, or the change is invalid: trying again won't help
        this.state.set('error');
        this.error.set(err instanceof HttpErrorResponse ? (err.error?.message ?? err.message) : String(err));
        console.error('The backend refused the changes', err);
      } else {
        // Not reachable (or a hiccup): keep the changes and try again
        this.pending = [...batch, ...this.pending];
        this.state.set('offline');
        const delay = SAVE_RETRY_MS[Math.min(this.retries++, SAVE_RETRY_MS.length - 1)];
        this.retryTimer = setTimeout(() => void this.flush(), delay);
      }
    } finally {
      this.sending.set(false);
      this.waiting.set(this.pending.length);
    }
  }

  private schedule(): void {
    if (this.retryTimer) return; // offline: the retry sends everything
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => void this.flush(), SAVE_IDLE_MS);
    this.maxWaitTimer ??= setTimeout(() => void this.flush(), SAVE_MAX_WAIT_MS);
  }

  /**
   * Folds an update into the change waiting for the same thing (its create, or an earlier update),
   * if nothing created after that one could be pointed at by it. A delete makes waiting updates moot.
   */
  private merge(change: ChangeOperation): boolean {
    const op = change.op ?? '';
    const key = targetKey(change);
    if (!key) return false;
    if (op.startsWith('delete')) {
      this.pending = this.pending.filter((c) => !(c.op?.startsWith('update') && targetKey(c) === key));
      return false;
    }
    if (!op.startsWith('update')) return false;
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const earlier = this.pending[i];
      if (targetKey(earlier) === key) {
        if (!earlier.op?.startsWith('create') && !earlier.op?.startsWith('update')) return false;
        this.pending[i] = mergeInto(earlier, change);
        return true;
      }
      if (earlier.op?.startsWith('create')) return false;
    }
    return false;
  }

  /** Temporary ids that already have real ones are sent as those. */
  private resolveSaved(change: ChangeOperation): ChangeOperation {
    const ids: Record<string, number> = {};
    for (const ref of refsIn(change)) {
      const id = this.registry.resolve(ref);
      if (typeof id === 'number') ids[ref] = id;
    }
    return Object.keys(ids).length > 0 ? rewriteRefs(change, ids) : change;
  }

  /** The page is closing: send what's waiting with a request that outlives it. */
  private sendBeforeLeaving(): void {
    if (this.pending.length === 0) return;
    const branchId = this.context.branchId();
    if (branchId == null) return;
    const xsrf = this.document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.slice('XSRF-TOKEN='.length);
    void fetch(`${API_BASE_URL}/api/branches/${branchId}/changes`, {
      method: 'POST',
      keepalive: true,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(xsrf ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrf) } : {}) },
      body: JSON.stringify({ changes: this.pending }),
    }).catch(() => undefined);
  }
}

// ---- Helpers ----

const kindOf = (op: string | undefined): Kind | null => {
  const match = /(Widget|Node|Edge)$/.exec(op ?? '');
  return match ? (match[1] as Kind) : null;
};

/** What a change is about: its kind and the thing's ref or id. */
function targetKey(change: ChangeOperation): string | null {
  const kind = kindOf(change.op);
  const target = change.ref ?? change.id;
  return kind && target != null ? `${kind}:${target}` : null;
}

/** An update's fields over a waiting create or update (props as a whole: they're sent complete). */
function mergeInto(earlier: ChangeOperation, update: ChangeOperation): ChangeOperation {
  const merged: ChangeOperation = { ...earlier };
  for (const [key, value] of Object.entries(update) as [keyof ChangeOperation, unknown][]) {
    if (key === 'op' || key === 'id' || key === 'ref' || value === undefined) continue;
    (merged as Record<string, unknown>)[key] = value;
  }
  // A new parent replaces the old, whichever way it's named
  if (update.parentId !== undefined || update.parentRef !== undefined) {
    merged.parentId = update.parentId;
    merged.parentRef = update.parentRef;
  }
  return merged;
}

/** The temporary ids a change points at (not the one a create names). */
function refsIn(change: ChangeOperation): string[] {
  const refs: string[] = [];
  if (change.ref && !change.op?.startsWith('create')) refs.push(change.ref);
  for (const ref of [change.parentRef, change.sourceRef, change.targetRef]) if (ref) refs.push(ref);
  const visit = (values: Record<string, unknown> | undefined) => {
    for (const [key, value] of Object.entries(values ?? {})) {
      if (typeof value === 'string' && key in WORKFLOW_NODE_ID_KINDS && value.startsWith('new_')) refs.push(value);
    }
  };
  if (kindOf(change.op) === 'Node') {
    const props = change.props as Record<string, unknown> | undefined;
    visit(props);
    visit(props?.['config'] as Record<string, unknown> | undefined);
  }
  return refs;
}

/** The change with these temporary ids replaced by their real ones. */
export function rewriteRefs(change: ChangeOperation, ids: Readonly<Record<string, number>>): ChangeOperation {
  const result: ChangeOperation = { ...change };
  if (result.ref && ids[result.ref] != null && !result.op?.startsWith('create')) {
    result.id = ids[result.ref];
    delete result.ref;
  }
  for (const [refKey, idKey] of [['parentRef', 'parentId'], ['sourceRef', 'sourceId'], ['targetRef', 'targetId']] as const) {
    const ref = result[refKey];
    if (ref && ids[ref] != null) {
      (result as Record<string, unknown>)[idKey] = ids[ref];
      delete result[refKey];
    }
  }
  if (kindOf(result.op) === 'Node' && result.props) {
    const swap = (values: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(values).map(([key, value]) =>
        [key, typeof value === 'string' && key in WORKFLOW_NODE_ID_KINDS && ids[value] != null ? String(ids[value]) : value]));
    const props = swap(result.props as Record<string, unknown>);
    if (props['config'] && typeof props['config'] === 'object') props['config'] = swap(props['config'] as Record<string, unknown>);
    result.props = props as ChangeOperation['props'];
  }
  return result;
}

/** A refusal (4xx other than timeouts, rate limits and a lost session): sending it again won't help. */
function refused(err: unknown): boolean {
  return err instanceof HttpErrorResponse && err.status >= 400 && err.status < 500
    && ![401, 408, 429].includes(err.status);
}
