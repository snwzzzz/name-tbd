import { Injectable, signal } from '@angular/core';

/**
 * The parameters a flow opened each page with (the `navigate` action): the page's expressions see
 * them as `params.<name>`. They stay until the page is opened with other ones.
 */
@Injectable({ providedIn: 'root' })
export class PageParamsService {
  private readonly params = signal<Record<string, Record<string, unknown>>>({});

  get(pageId: string): Record<string, unknown> {
    return this.params()[pageId] ?? {};
  }

  set(pageId: string, params: Record<string, unknown>): void {
    this.params.update((all) => ({ ...all, [pageId]: params }));
  }

  reset(): void {
    this.params.set({});
  }
}
