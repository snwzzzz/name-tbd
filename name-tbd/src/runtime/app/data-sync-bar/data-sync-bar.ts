import { Component, computed, inject } from '@angular/core';
import { APP_DATA } from '../../../app/core/ports/app-ports';

/**
 * How a live export's data is doing, at the top of the page: offline (and how many changes wait to be sent),
 * and changes that were saved over someone else's (with what they overwrote). Nothing while all is well, and
 * never in embedded exports (their data has no sync state).
 */
@Component({
  selector: 'app-data-sync-bar',
  template: `
    @if (sync(); as sync) {
      @if (!sync.online) {
        <div class="bar offline" role="status">
          You’re offline.
          @if (sync.pending) {
            {{ sync.pending === 1 ? '1 change' : sync.pending + ' changes' }} will be saved when you’re back online.
          } @else {
            Showing the data as last loaded.
          }
        </div>
      } @else if (sync.pending) {
        <div class="bar" role="status">Saving {{ sync.pending === 1 ? '1 change' : sync.pending + ' changes' }} made offline…</div>
      }
      @if (conflicts().length) {
        <div class="bar conflict" role="alert">
          <span>
            {{ conflicts().length === 1 ? 'A change' : conflicts().length + ' changes' }} you made overwrote someone else’s:
            @for (c of conflicts(); track $index) {
              <span class="item">{{ c.source }} ({{ c.what }})</span>
            }
          </span>
          <button type="button" class="dismiss" (click)="dismiss()">OK</button>
        </div>
      }
    }
  `,
  styles: `
    :host {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1400;
      display: flex;
      flex-direction: column;
      font-family: var(--widget-font);
      font-size: 0.875rem;
    }

    .bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 0.375rem 1rem;
      background: var(--color-surface-raised, #f4f4f5);
      color: var(--color-text-primary, #18181b);
      border-bottom: 1px solid var(--color-border, #e4e4e7);
    }

    .offline {
      background: #fef3c7;
      color: #78350f;
    }

    .conflict {
      background: #ffedd5;
      color: #7c2d12;
    }

    .item + .item::before {
      content: '; ';
    }

    .dismiss {
      border: 1px solid currentColor;
      border-radius: 4px;
      background: transparent;
      color: inherit;
      padding: 0.125rem 0.625rem;
      cursor: pointer;
    }
  `,
})
export class DataSyncBar {
  private readonly data = inject(APP_DATA);

  readonly sync = computed(() => this.data.sync?.() ?? null);
  readonly conflicts = computed(() => {
    const names = new Map(this.data.sources().map((s) => [s.id, s.name]));
    return (this.sync()?.conflicts ?? []).map((c) => ({
      source: names.get(c.dataSourceId) ?? 'data',
      what: Object.entries(c.overwritten).map(([column, value]) => `${column} was “${value}”`).join(', '),
    }));
  });

  dismiss(): void {
    this.data.dismissConflicts?.();
  }
}
