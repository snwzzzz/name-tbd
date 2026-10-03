import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApplicationControllerService } from '../api/services/applicationController.service';
import { ApplicationDto } from '../api/models';

/**
 * The application the editor works on (route `/apps/:appId/edit`) and its branch: the pages,
 * workflows and data sources the editor shows are this branch's. `editorAppGuard` loads the
 * application before the editor starts, so the editor's services can rely on it being there.
 *
 * The editor's state services keep what they loaded for the whole session, so they never see two
 * applications: opening another one reloads the editor (see editorAppGuard).
 */
@Injectable({ providedIn: 'root' })
export class EditorContext {
  private readonly api = inject(ApplicationControllerService);

  readonly app = signal<ApplicationDto | null>(null);
  readonly appId = computed(() => this.app()?.id ?? null);
  /** The branch the editor edits (the application's default branch). */
  readonly branchId = computed(() => this.app()?.defaultBranchId ?? null);

  load(appId: number): Observable<ApplicationDto> {
    return this.api.getApplication(appId).pipe(tap((app) => this.app.set(app)));
  }

  /** The branch to read and write; only called inside the editor, where it's always known. */
  requireBranchId(): number {
    const branchId = this.branchId();
    if (branchId === null) throw new Error('The editor has no application open');
    return branchId;
  }

  /** The editor's route for this application, plus `segments` (e.g. a tab id and mode). */
  path(...segments: (string | number)[]): (string | number)[] {
    return ['/apps', this.appId() ?? 0, 'edit', ...segments];
  }

  /** Where saved editor state (tabs, recent pages) lives for this application. */
  storageKey(name: string): string {
    return `${name}:${this.appId() ?? 'none'}`;
  }
}
