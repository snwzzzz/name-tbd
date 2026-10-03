import { Injectable, computed, inject, signal } from '@angular/core';
import { PageControllerService } from '../api/services/pageController.service';
import { PageDto } from '../api/models';
import { EDITOR_BRANCH_ID } from '../_constants/api.constants';

/** The branch's pages (loaded once, refreshed when pages are created), and its layout page. */
@Injectable({ providedIn: 'root' })
export class PagesStateService {
  private readonly api = inject(PageControllerService);

  readonly pages = signal<PageDto[]>([]);
  readonly loaded = signal(false);
  private requested = false;

  /** The page whose widgets show on every other page (navbar, sidebar, ...), if there is one. */
  readonly layoutPage = computed(() => this.pages().find((page) => page.layout) ?? null);
  /** The pages links can go to (all but the layout page). */
  readonly contentPages = computed(() => this.pages().filter((page) => !page.layout));

  ensureLoaded(): void {
    if (!this.requested) this.refresh();
  }

  refresh(): void {
    this.requested = true;
    this.api.getPages(EDITOR_BRANCH_ID).subscribe({
      next: (pages) => {
        this.pages.set(pages ?? []);
        this.loaded.set(true);
      },
      error: (err) => {
        this.requested = false;
        console.error('Failed to load pages', err);
      },
    });
  }

  page(id: number): PageDto | undefined {
    return this.pages().find((page) => page.id === id);
  }
}
