import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

/** Which tab each tabs widget (by its component id) shows: in the running app, and on the canvas while editing. */
@Injectable({ providedIn: 'root' })
export class ActiveTabsService {
  private readonly tabs = signal<Record<string, number>>({});
  /** A tabs widget switched to another tab (its id): the canvas then shows that tab's widgets. */
  readonly changed$ = new Subject<string>();

  active(tabsId: string): number {
    return this.tabs()[tabsId] ?? 0;
  }

  select(tabsId: string, index: number): void {
    if (this.active(tabsId) === index) return;
    this.tabs.update((all) => ({ ...all, [tabsId]: index }));
    this.changed$.next(tabsId);
  }

  reset(): void {
    this.tabs.set({});
  }
}
