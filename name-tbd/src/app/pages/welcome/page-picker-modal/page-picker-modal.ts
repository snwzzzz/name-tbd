import { Component, computed, inject, signal } from '@angular/core';
import { LucideFile, LucideSearch } from '@lucide/angular';
import { Button } from '../../../components/button/button';
import { MODAL_DATA, MODAL_REF } from '../../../_services/modal/modal.tokens';
import { ModalRef } from '../../../_services/modal/modal-ref';
import { PageDto } from '../../../api/models';

export interface PagePickerData {
  pages: PageDto[];
}

/** Picks one of the project's pages to open (searchable by name or path). Closes with its id. */
@Component({
  selector: 'app-page-picker-modal',
  imports: [Button, LucideFile, LucideSearch],
  template: `
    <div class="picker">
      <h3 class="title">Open a page</h3>
      <label class="search">
        <svg lucideSearch></svg>
        <input
          type="search"
          placeholder="Search by name or path"
          aria-label="Search pages"
          autofocus
          [value]="query()"
          (input)="query.set($any($event.target).value)"
          (keydown.enter)="openFirst()" />
      </label>
      <div class="list">
        @for (page of matches(); track page.id) {
          <button type="button" class="page" (click)="open(page)">
            <svg lucideFile></svg>
            <span class="name">{{ page.name }}</span>
            @if (page.layout) { <span class="badge">Layout</span> }
            <span class="path">{{ page.path }}</span>
          </button>
        } @empty {
          <p class="none">{{ data.pages.length ? 'No pages match.' : 'No pages yet.' }}</p>
        }
      </div>
      <div class="actions">
        <app-button color="neutral" variant="ghost" (click)="close()">Cancel</app-button>
      </div>
    </div>
  `,
  styles: `
    .picker { display: flex; flex-direction: column; gap: 0.75rem; color: var(--color-text-primary); }
    .title { margin: 0; font-size: var(--font-size-lg); font-weight: 600; }
    .search {
      display: flex; align-items: center; gap: 0.5rem; padding: 0 0.75rem; min-height: 2.25rem;
      border: 1px solid transparent; border-radius: 0.375rem; background: var(--color-surface-secondary);
      color: var(--color-text-secondary);
      &:focus-within { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
      input { flex: 1; border: none; outline: none; background: none; color: var(--color-text-primary); font: inherit; }
    }
    svg { width: 1rem; height: 1rem; flex-shrink: 0; }
    .list { max-height: 20rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0.125rem; }
    .page {
      display: flex; align-items: center; gap: 0.625rem; padding: 0.5rem 0.625rem; border: none;
      border-radius: 0.375rem; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer;
      svg { color: #2f89ff; }
      &:hover { background: var(--color-surface-hover); }
    }
    .name { font-weight: 500; }
    .path { margin-left: auto; font-size: var(--font-size-xs); color: var(--color-text-secondary); }
    .badge {
      padding: 0.0625rem 0.375rem; border-radius: 1rem; font-size: var(--font-size-2xs);
      background: var(--color-primary-light); color: var(--color-primary);
    }
    .none { margin: 0; padding: 0.75rem; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
    .actions { display: flex; justify-content: flex-end; }
  `,
})
export class PagePickerModal {
  readonly data = inject<PagePickerData>(MODAL_DATA);
  private readonly modalRef = inject<ModalRef<number>>(MODAL_REF);

  readonly query = signal('');
  readonly matches = computed(() => {
    const query = this.query().trim().toLowerCase();
    if (!query) return this.data.pages;
    return this.data.pages.filter((p) => `${p.name} ${p.path}`.toLowerCase().includes(query));
  });

  open(page: PageDto): void {
    this.modalRef.close(page.id);
  }

  openFirst(): void {
    const first = this.matches()[0];
    if (first) this.open(first);
  }

  close(): void {
    this.modalRef.close();
  }
}
