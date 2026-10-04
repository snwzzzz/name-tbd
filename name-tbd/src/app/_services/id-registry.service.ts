import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { newTemporaryId } from '../_utils/component-id.utils';

/**
 * Ids of things the editor creates. A new widget, node or connection gets a temporary id right away
 * (`new_…`), so the editor can use it before the backend has saved it; once saved (SaveQueue), it
 * gets its real id, and everyone holding the temporary one swaps it ({@link mapped$}).
 */
@Injectable({ providedIn: 'root' })
export class IdRegistry {
  private readonly saved = new Map<string, number>();

  /** Temporary ids that got their real ids (all at once, after a save). */
  readonly mapped$ = new Subject<ReadonlyMap<string, number>>();

  /** A temporary id for something new. */
  newRef(): string {
    return newTemporaryId();
  }

  /** The real id for a temporary one, if it has one yet; anything else as it is. */
  resolve<T extends string | number>(id: T): T | number {
    return typeof id === 'string' ? (this.saved.get(id) ?? id) : id;
  }

  /** Temporary ids got real ones (the answer to a save). */
  record(ids: Readonly<Record<string, number>>): void {
    const mapped = new Map(Object.entries(ids));
    if (mapped.size === 0) return;
    mapped.forEach((id, ref) => this.saved.set(ref, id));
    this.mapped$.next(mapped);
  }
}
